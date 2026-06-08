import sharp from 'sharp';
import fetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

const EXTERNAL_AI_BASE_URL = (process.env.EXTERNAL_AI_BASE_URL || process.env.EXTERNAL_AI_GATEWAY_URL || 'http://localhost:8080').replace(/\/$/, '');
const EXTERNAL_AI_API_KEY = process.env.EXTERNAL_AI_API_KEY;

const REQUEST_TIMEOUT_MS = Number(process.env.EXTERNAL_AI_TIMEOUT_MS) || 120000; // 2 minutes

export async function sendBufferImageToSAM(imageBuffer, filename, mimetype) {
  const { width, height } = await sharp(imageBuffer).metadata();

  const form = new FormData();
  form.append('image', imageBuffer, { filename, contentType: mimetype });

  const headers = {
    ...form.getHeaders(),
  };
  if (EXTERNAL_AI_API_KEY) headers['Authorization'] = `Bearer ${EXTERNAL_AI_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${EXTERNAL_AI_BASE_URL}/image-segmentation/segment`;
    const res = await fetch(url, { method: 'POST', headers, body: form, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Segmentation API error ${res.status}: ${txt}`);
    }

    const result = await res.json();

    const boundingBoxes = result?.bounding_boxes || result?.boundingBoxes || null;
    const imageSize = result?.image_size || result?.imageSize || null;

    if (!boundingBoxes) throw new Error('No bounding_boxes returned from segmentation API');

    const w = imageSize?.width || width;
    const h = imageSize?.height || height;

    return normalizeBboxes(boundingBoxes, w, h);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Segmentation request timed out');
    console.error('Segmentation request failed:', err);
    throw err;
  }
}

function normalizeBboxes(bboxes, imageWidth, imageHeight) {
  return bboxes.map(bbox => {
    const [xMin, yMin, xMax, yMax] = bbox;
    return [
      xMin / imageWidth,
      yMin / imageHeight,
      xMax / imageWidth,
      yMax / imageHeight,
    ];
  });
}

