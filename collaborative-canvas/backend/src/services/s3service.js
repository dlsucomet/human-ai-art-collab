// awsS3Utils.js - adds a local-storage fallback for development

// ESM imports for AWS SDK v3 packages (kept for production)
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { promises as fs } from 'fs';
import path from 'path';
import dotenv from "dotenv";
dotenv.config();

/** Config: AWS and local storage */
const REGION = process.env.AWS_REGION;
const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const ROLE_ARN = process.env.AWS_ROLE_ARN;

const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH; // e.g. ./local_storage/images
const LOCAL_STORAGE_URL_PREFIX = process.env.LOCAL_STORAGE_URL_PREFIX || '/local_images';
const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

/** Reusable STS client for temporary credentials */
const stsClient = new STSClient({ region: REGION });

/**
 * Generate a temporary S3 client with assumed role credentials.
 * @returns {Promise<S3Client>}
 */
export async function getTemporaryCredentials() {
    const command = new AssumeRoleCommand({
        RoleArn: ROLE_ARN,
        RoleSessionName: "CollabArtSession",
        DurationSeconds: 3600,
    });
    const { Credentials } = await stsClient.send(command);

    return new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
        },
    });
}

function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

/**
 * Upload an image file (development: local filesystem; production: S3).
 * @param {object} file - The file object: { originalname, buffer, mimetype }
 * @returns {Promise<{key: string, url: string} | Error>}
 */
export async function uploadS3Image(file) {
    if (LOCAL_STORAGE_PATH) {
        try {
            await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
            const uniqueFilename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${sanitizeFilename(file.originalname)}`;
            const dest = path.join(LOCAL_STORAGE_PATH, uniqueFilename);
            await fs.writeFile(dest, file.buffer);
            return {
                key: uniqueFilename,
                url: `${BACKEND_BASE_URL}${LOCAL_STORAGE_URL_PREFIX}/${uniqueFilename}`
            };
        } catch (err) {
            console.error('Local upload error:', err);
            return err;
        }
    }

    // Production: upload to S3 using temporary credentials
    try {
        const s3 = await getTemporaryCredentials();
        const uniqueFilename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${sanitizeFilename(file.originalname)}`;
        const params = {
            Bucket: BUCKET_NAME,
            Key: uniqueFilename,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));
        return {
            key: uniqueFilename,
            url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${uniqueFilename}`
        };
    } catch (error) {
        console.error("Upload error:", error);
        return error;
    }
}

/**
 * Upload a generated image (keeps original-ish naming). Falls back to local filesystem in development.
 */
export async function uploadS3ImageGen(file) {
    if (LOCAL_STORAGE_PATH) {
        try {
            await fs.mkdir(LOCAL_STORAGE_PATH, { recursive: true });
            const uniqueFilename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${sanitizeFilename(file.originalname)}`;
            const dest = path.join(LOCAL_STORAGE_PATH, uniqueFilename);
            await fs.writeFile(dest, file.buffer);
            return {
                key: uniqueFilename,
                url: `${BACKEND_BASE_URL}${LOCAL_STORAGE_URL_PREFIX}/${uniqueFilename}`
            };
        } catch (err) {
            console.error('Local uploadGen error:', err);
            return err;
        }
    }

    try {
        const s3 = await getTemporaryCredentials();
        const params = {
            Bucket: BUCKET_NAME,
            Key: file.originalname,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));
        return {
            key: file.originalname,
            url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${file.originalname}`
        };
    } catch (error) {
        console.error("Upload error:", error);
        return error;
    }
}

/**
 * Delete an image (local or S3) by URL.
 */
export async function deleteS3Image(imageUrl) {
    if (LOCAL_STORAGE_PATH) {
        try {
            // Extract filename from URL
            const parts = imageUrl.split('/');
            const filename = parts[parts.length - 1];
            const dest = path.join(LOCAL_STORAGE_PATH, filename);
            await fs.unlink(dest);
            return { message: "Image deleted successfully" };
        } catch (err) {
            console.error('Local delete error:', err);
            return { message: "Image deletion attempted, but it may not have existed" };
        }
    }

    try {
        const key = imageUrl.split(`${BUCKET_NAME}.s3.${REGION}.amazonaws.com/`)[1];
        const s3 = await getTemporaryCredentials();
        const params = { Bucket: BUCKET_NAME, Key: key };
        await s3.send(new DeleteObjectCommand(params));
        return { message: "Image deleted successfully" };
    } catch (error) {
        console.error("Delete error:", error);
        return { message: "Image deletion attempted, but it may not have existed" };
    }
}