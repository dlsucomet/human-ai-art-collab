import { uploadImage as storeUploadImage } from '../services/storageService.js';
import { createImage } from '../services/imageService.js';
import { addArrangementToImage, addKeywordsToImage } from '../services/keywordService.js';
import { sendBufferImageToSAM } from '../utils/imageSegmentation.js';
import { getCaption } from '../utils/imageCaptioning.js';
import { extractKeywords } from '../utils/llm.js';
import { generateCode } from '../utils/helpers.js';
import { isValidObjectId } from '../utils/objectId.js';
import { errorResponse, logError } from '../utils/error.js';
import { EXPECTED_IMAGE_COUNT } from '../constants/index.js';

/**
 * Zod is used for input validation (schema-based).
 * This requires `npm i zod` and ES2023+ Node.
 */
import { z } from 'zod';

/**
 * Allowed image mime-types.
 * @type {Set<string>}
 */
const SAFE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/bmp", "image/avif", "image/svg+xml"
]);

/**
 * Validates and sanitizes upload request using Zod.
 * @param {import('express').Request} req
 * @param {Map<string, object>} usersMap
 * @returns {null|string} Error message string, or null if valid.
 */
function validateUploadRequest(req, usersMap) {
  // 1. Schema for expected headers
  const schema = z.object({
    files: z.array(
      z.object({
        mimetype: z.string().refine(mimetype => SAFE_IMAGE_MIME_TYPES.has(mimetype), {
          message: "Invalid or unsupported image type"
        }),
        buffer: z.instanceof(Buffer),
        originalname: z.string(),
      })
    ).length(EXPECTED_IMAGE_COUNT),
    headers: z.object({
      'board-id': z.string().trim().min(1),
      'socket-id': z.string().trim().min(1),
    })
  });
  const safeParsing = schema.safeParse(req);
  if (!safeParsing.success) {
    return safeParsing.error.errors[0]?.message || 'Invalid upload input';
  }

  const boardId = String(req.headers['board-id'] ?? '').trim();
  const socketId = String(req.headers['socket-id'] ?? '').trim();

  if (!isValidObjectId(boardId)) return 'Invalid board-id';
  if (!usersMap.has(socketId)) return 'Invalid or expired socket-id';

  // Protect against prototype pollution (prevent "__proto__" and "constructor" as keys)
  if (['__proto__', 'constructor'].some(key => usersMap.has(key))) {
    return 'Malicious user object detected';
  }
  return null;
}

/**
 * Sanitizes and validates numeric fields (x, y, width, height).
 * @param {object} body
 * @returns {{x:number, y:number, width:number, height:number}|null} Validated & parsed object, null if invalid
 */
function safeParseSpatialFields(body) {
  const spatialSchema = z.object({
    x: z.preprocess(val => Number(val), z.number().min(0)),
    y: z.preprocess(val => Number(val), z.number().min(0)),
    width: z.preprocess(val => Number(val), z.number().min(1)),
    height: z.preprocess(val => Number(val), z.number().min(1)),
  });
  const result = spatialSchema.safeParse(body);
  if (!result.success) return null;
  return result.data;
}

/**
 * Main Express middleware: handles validated upload, storage, DB save, ML tasks, emits events.
 * Modular and fully async: fail-fast on any error.
 * @param {Map<string, object>} users - Active user Map (socketId → user)
 * @param {import('socket.io').Server} io - Socket.IO server
 * @returns {import('express').RequestHandler}
 */
export const uploadImage = (users, io) => async (req, res) => {
  try {
    // Wrap users into a Map if not yet
    const usersMap = (users instanceof Map) ? users : new Map(Object.entries(users));
    const validationError = validateUploadRequest(req, usersMap);
    if (validationError) return errorResponse(res, 400, validationError);

    const spatialFields = safeParseSpatialFields(req.body);
    if (!spatialFields)
      return errorResponse(res, 400, "Image spatial fields required (x, y, width, height, all ≥ 0)");

    const [fullImage, ...segments] = req.files;
    const boardId = String(req.headers['board-id'] ?? '').trim();
    const socketId = String(req.headers['socket-id'] ?? '').trim();
    const user = usersMap.get(socketId);
    const uploadId = generateCode(7);
    const progressCounter = createUploadProgressCounter(io, socketId, uploadId, fullImage.originalname);

    // Storage upload + DB create (fail fast, errors handled)
    const uploadResult = await safeUpload(fullImage, res);
    if (!uploadResult) return; // error sent in safeUpload

    console.log('upload.controller uploadResult:', { url: uploadResult.url });

    progressCounter.add(12.5);
    const imageDoc = await safeCreateImage({
      boardId,
      url: uploadResult.url,
      filename: fullImage.originalname,
      dimensions: spatialFields,
      author: user.username,
      res
    });
    if (!imageDoc) return;

    progressCounter.add(2.5);

    emitNewImageToRoom(io, user, imageDoc);

    // ML tasks: run in background, use Promise.all to "swallow" exceptions
    Promise.allSettled([
      handleSegmentation(fullImage, io, imageDoc._id, user.roomId, progressCounter),
      handleKeywordGeneration(io, progressCounter, imageDoc._id, user.roomId, req.files)
    ]).catch(err => logError('uploadImage/MLAsync', err));

    // Respond to HTTP POST
    return res.status(201).json({
      message: 'Image uploaded',
      url: uploadResult.url,
      image: imageDoc,
    });
  } catch (error) {
    logError('uploadImage', error);
    return errorResponse(res, 500, 'Image upload failed unexpectedly');
  }
};

/**
 * Strict image mimetype check.
 * @param {string} mimetype
 * @returns {boolean}
 */
export function isSafeImageMime(mimetype) {
  return SAFE_IMAGE_MIME_TYPES.has(mimetype);
}

/**
 * Notifies socket client of new upload, manages upload progress per user/uploadId.
 * @param {import('socket.io').Server} io
 * @param {string} socketId
 * @param {string} uploadId
 * @param {string} fileName
 * @returns {{ add: (n?: number) => void }}
 */
export function createUploadProgressCounter(io, socketId, uploadId, fileName) {
  let count = 0;
  io.to(socketId).emit('addUploadProgress', { uploadId, fileName });
  return {
    /**
     * Increment progress and notify socket client.
     * @param {number} [step=1]
     */
    add(step = 1) {
      count += step;
      io.to(socketId).emit('updateUploadProgress', { uploadId, progress: count });
    },
  };
}

/**
 * Emits 'newImage' event to room (Socket.IO).
 * Only emits non-sensitive user info.
 * @param {import('socket.io').Server} io
 * @param {object} user
 * @param {object} imageDoc
 */
export function emitNewImageToRoom(io, user, imageDoc) {
  io.to(user.roomId).emit('newImage', {
    image: imageDoc, // structuredClone for Node.js 17+, shallow clone ok here
    user: { id: user.userId, name: user.username },
  });
}

/**
 * Uploads file to local storage in a fail-safe wrapper, sends error on failure.
 * @param {object} file
 * @param {import('express').Response} res
 * @returns {Promise<{url:string}|null>}
 */
export async function safeUpload(file, res) {
  try {
    return await storeUploadImage(file);
  } catch (error) {
    logError('safeUpload', error);
    errorResponse(res, 502, 'Image storage failed');
    return null;
  }
}

/**
 * Creates an image DB record in a fail-safe wrapper, sends error on failure.
 * @param {object} opts
 * @param {string} opts.boardId
 * @param {string} opts.url
 * @param {string} opts.filename
 * @param {{x:number, y:number, width:number, height:number}} opts.dimensions
 * @param {import('express').Response} opts.res
 * @returns {Promise<object|null>}
 */
export async function safeCreateImage({ boardId, url, filename, dimensions, author, res }) {
  try {
    const { x, y, width, height } = dimensions;
    return await createImage({ boardId, url, filename, x, y, width, height, author });
  } catch (error) {
    logError('safeCreateImage', error);
    errorResponse(res, 500, 'Saving image failed');
    return null;
  }
}

/**
 * Handles segmentation ML + emits "newKeyword".
 * @param {object} fullImage
 * @param {import('socket.io').Server} io
 * @param {string} imageId
 * @param {string} roomId
 * @param {object} progressCounter
 */
export async function handleSegmentation(fullImage, io, imageId, roomId, progressCounter) {
  try {
    const result = await sendBufferImageToSAM(fullImage.buffer, fullImage.originalname, fullImage.mimetype);
    const arrangementKW = await addArrangementToImage(imageId, result);
    io.to(roomId).emit('newKeyword', { keyword: arrangementKW });
  } catch (err) {
    logError('handleSegmentation', err);
  } finally {
    progressCounter.add(15);
  }
}

/**
 * Captioning, keyword extraction, database save, and emit -- all async, fail gracefully.
 * @param {import('socket.io').Server} io
 * @param {{add: (n?: number) => void}} progressCounter
 * @param {string} imageId
 * @param {string} roomId
 * @param {Array<object>} files (all 10 files: 1 full, 9 segments)
 */
export async function handleKeywordGeneration(io, progressCounter, imageId, roomId, files) {
  try {
    // Run captioning in parallel for all segments
    const captions = await Promise.all(
      files.map(async (segment, idx) => {
        try {
          // Strict mimetype check for segment images
          if (!isSafeImageMime(segment.mimetype)) return null;
          return await getCaption(segment.buffer);
        } catch (err) {
          logError(`caption[${idx}]`, err);
          return null;
        } finally {
          progressCounter.add(5.2);
        }
      })
    );
    const validCaptions = captions.filter(Boolean);

    let keywords = {};
    if (validCaptions.length > 0) {
      try {
        keywords = await extractKeywords(
          JSON.stringify({ Caption: validCaptions }, null, 2)
        );
      } catch (err) {
        logError('keywordExtract', err);
      }
    }
    progressCounter.add(10);

    if (keywords && typeof keywords === 'object') {
      let newKeywords = [];
      try {
        newKeywords = await addKeywordsToImage(imageId, keywords);
      } catch (err) {
        logError('[keywords] DB error', err);
      }
      progressCounter.add(3);

      if (Array.isArray(newKeywords)) {
        // Only emit non-sensitive, pure keyword data
        for (const keyword of newKeywords) {
          io.to(roomId).emit('newKeyword', { keyword });
        }
      }
    }
    progressCounter.add(5);
  } catch (err) {
    logError('handleKeywordGeneration', err);
  }
}
