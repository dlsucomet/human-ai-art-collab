// --- Imports ---
// Use explicit file extensions (.js) for local imports for Node ESM compatibility

import Image from '../models/image.model.js';
import Keyword from '../models/keyword.model.js';
import Board from '../models/board.model.js';
import Thread from '../models/thread.model.js';
import { deleteImage } from './storageService.js';

// --- Main Service Functions ---

/**
 * Create a new image and associate it with a board
 * @param {Object} data - Image data
 * @returns {Promise<Object>} The created image
 */
export async function createImage(data) {
  const image = await Image.create(data);
  await Board.findByIdAndUpdate(image.boardId, {
    $push: { images: image._id },
  });
  return image; // Do not populate keywords yet
}

/**
 * Update an image with an arbitrary set of changes.
 * @param {Object} update - Object containing id and changes.
 * @returns {Promise<Object|null>} The updated image document.
 */
export async function updateImageWithChanges(update) {
  const updatedImage = await Image.findByIdAndUpdate(
    update.id, // MongoDB `_id`
    { $set: update.changes }, // Fields to update
    { new: true } // Return the updated document
  );
  return updatedImage;
}

/**
 * Deletes an image and its associated keywords and threads.
 * @param {string} imageId - The image's ObjectId.
 * @returns {Promise<Object|null>} The deleted image document or null if not found.
 */
export async function deleteImageById(imageId) {
  // Find and delete the image in one step
  const image = await Image.findByIdAndDelete(imageId);
  if (!image) return null;

  // Delete related keywords and threads in parallel
  await Promise.all([
    Keyword.deleteMany({ imageId }),
    Thread.deleteMany({ imageId }),
    image.boardId
      ? Board.findByIdAndUpdate(image.boardId, { $pull: { images: imageId } })
      : null,
    image.url ? deleteImage(image.url) : null,
  ]);

  return image;
}
