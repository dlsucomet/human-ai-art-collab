import fetch from 'node-fetch';
import { Client } from '@gradio/client';
import { uploadImageGen } from '../services/storageService.js';
import dotenv from 'dotenv';
dotenv.config();

const EXTERNAL_AI_BASE_URL = (process.env.EXTERNAL_AI_BASE_URL || process.env.EXTERNAL_AI_GATEWAY_URL || 'http://localhost:8080').replace(/\/$/, '');
const EXTERNAL_AI_API_KEY = process.env.EXTERNAL_AI_API_KEY;
const REQUEST_TIMEOUT_MS = Number(process.env.EXTERNAL_AI_TIMEOUT_MS) || 180000; // 3 minutes

export async function generateImage(data) {
  const headers = { 'Content-Type': 'application/json' };
  if (EXTERNAL_AI_API_KEY) headers['Authorization'] = `Bearer ${EXTERNAL_AI_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${EXTERNAL_AI_BASE_URL}/instance-diffusion/generate`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data), signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Instance-diffusion API error ${res.status}: ${txt}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = uniqueFilename();
    const file = {
      originalname: `${filename}_color.png`,
      buffer,
      mimetype: 'image/png',
    };

    // Upload the generated image to local storage
    const uploadResult = await uploadImageGen(file);

    // Generate sketch via Gradio client (keeps previous behavior)
    const base64Image = buffer.toString('base64');
    const client = await Client.connect('awacke1/Image-to-Line-Drawings');

    const [_, sketchResult] = await Promise.all([
      Promise.resolve(uploadResult),
      client.predict('/predict', {
        input_img: base64ToBlob(base64Image),
        ver: 'Complex Lines',
      }),
    ]);

    if (!sketchResult) throw new Error('No sketch result from Gradio client');

    const sketchfile = {
      originalname: `${filename}.jpg`,
      buffer: Buffer.from(await fetchImageAsBase64(sketchResult.data[0].url), 'base64'),
      mimetype: 'image/jpeg',
    };

    return await uploadImageGen(sketchfile);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Image-generation request timed out');
    console.error('External image generation failed:', err);
    throw err;
  }
}

function base64ToBlob(base64, contentType = 'image/png') {
  return new Blob([Buffer.from(base64, 'base64')], { type: contentType });
}

async function fetchImageAsBase64(imageUrl) {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

const uniqueFilename = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1e6).toString(36).padStart(4, '0');
  return `${timestamp}-${random}`;
};
