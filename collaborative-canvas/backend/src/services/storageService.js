// Local storage utility for images 

import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'local_storage', 'images');
const LOCAL_STORAGE_URL_PREFIX = process.env.LOCAL_STORAGE_URL_PREFIX || '/local_images';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function makeUniqueFilename(originalname) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000).toString(36);
  return `${timestamp}-${random}-${sanitizeFilename(originalname)}`;
}

async function ensureLocalDir() {
  await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
}

/**
 * Upload an image file to local storage.
 */
export async function uploadImage(file) {
  try {
    await ensureLocalDir();
    const uniqueFilename = makeUniqueFilename(file.originalname);
    const dest = path.join(LOCAL_STORAGE_PATH, uniqueFilename);
    await fs.writeFile(dest, file.buffer);
    const url = `${BACKEND_BASE_URL}${LOCAL_STORAGE_URL_PREFIX}/${uniqueFilename}`;
    console.log('storageService.uploadImage saved:', { dest, url });
    return {
      key: uniqueFilename,
      url,
    };
  } catch (err) {
    console.error('Local upload error:', err);
    throw err;
  }
}

/**
 * Upload a generated image to local storage.
 */
export async function uploadImageGen(file) {
  try {
    await ensureLocalDir();
    const uniqueFilename = makeUniqueFilename(file.originalname);
    const dest = path.join(LOCAL_STORAGE_PATH, uniqueFilename);
    await fs.writeFile(dest, file.buffer);
    const url = `${BACKEND_BASE_URL}${LOCAL_STORAGE_URL_PREFIX}/${uniqueFilename}`;
    console.log('storageService.uploadImageGen saved:', { dest, url });
    return {
      key: uniqueFilename,
      url,
    };
  } catch (err) {
    console.error('Local uploadGen error:', err);
    throw err;
  }
}

/**
 * Delete an image by URL from local storage.
 */
export async function deleteImage(imageUrl) {
  try {
    // Extract filename (last path segment)
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const dest = path.join(LOCAL_STORAGE_PATH, filename);
    await fs.unlink(dest);
    console.log('storageService.deleteImage removed:', dest);
    return { message: 'Image deleted successfully' };
  } catch (err) {
    console.error('Local delete error:', err);
    return { message: 'Image deletion attempted, but it may not have existed' };
  }
}
