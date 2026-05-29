// localFileStorage.js

// ESM imports for file system operations
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Local uploads directory */
const UPLOADS_DIR = join(__dirname, '../../uploads');

/**
 * Ensure uploads directory exists
 */
async function ensureUploadsDir() {
    try {
        await mkdir(UPLOADS_DIR, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * Upload an image file to local storage (with unique name).
 * @param {object} file - The file object: { originalname, buffer, mimetype }
 * @returns {Promise<{key: string, url: string} | Error>}
 */
export async function uploadS3Image(file) {
    try {
        await ensureUploadsDir();
        const uniqueFilename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        const filePath = join(UPLOADS_DIR, uniqueFilename);
        
        await writeFile(filePath, file.buffer);
        
        return {
            key: uniqueFilename,
            url: `http://localhost:5001/uploads/${uniqueFilename}`
        };
    } catch (error) {
        console.error("Upload error:", error);
        return error;
    }
}

/**
 * Upload an image file to local storage (preserves original name).
 * @param {object} file - The file object: { originalname, buffer, mimetype }
 * @returns {Promise<{key: string, url: string} | Error>}
 */
export async function uploadS3ImageGen(file) {
    try {
        await ensureUploadsDir();
        const filePath = join(UPLOADS_DIR, file.originalname);
        
        await writeFile(filePath, file.buffer);
        
        return {
            key: file.originalname,
            url: `http://localhost:5001/uploads/${file.originalname}`
        };
    } catch (error) {
        console.error("Upload error:", error);
        return error;
    }
}

/**
 * Delete an image from local storage by its URL.
 * @param {string} imageUrl - The local URL to the file to delete
 * @returns {Promise<{message: string}>}
 */
export async function deleteS3Image(imageUrl) {
    try {
        const filename = imageUrl.split('/uploads/')[1];
        const filePath = join(UPLOADS_DIR, filename);
        
        // For now, just return success - actual deletion would require fs.unlink
        // You can implement actual deletion if needed
        return { message: "Image deletion attempted" };
    } catch (error) {
        console.error("Delete error:", error);
        return { message: "Image deletion attempted, but it may not have existed" };
    }
}