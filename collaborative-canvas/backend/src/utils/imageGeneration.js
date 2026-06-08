import fetch from 'node-fetch';
import FormData from 'form-data';
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
    const genUrl = `${EXTERNAL_AI_BASE_URL}/instance-diffusion/generate`;
    const genRes = await fetch(genUrl, { 
      method: 'POST', 
      headers, 
      body: JSON.stringify(data), 
      signal: controller.signal 
    });

    if (!genRes.ok) {
      const txt = await genRes.text().catch(() => '');
      throw new Error(`Instance-diffusion API error ${genRes.status}: ${txt}`);
    }

    const colorBuffer = Buffer.from(await genRes.arrayBuffer());
    const filename = uniqueFilename();

    const colorUpload = await uploadImageGen({
      originalname: `${filename}_color.png`,
      buffer: colorBuffer,
      mimetype: 'image/png',
    });

    const form = new FormData();
    form.append('image', colorBuffer, { 
      filename: 'input.png', 
      contentType: 'image/png' 
    });

    const styleHeaders = { ...form.getHeaders() };
    if (EXTERNAL_AI_API_KEY) styleHeaders['Authorization'] = `Bearer ${EXTERNAL_AI_API_KEY}`;

    const styleUrl = `${EXTERNAL_AI_BASE_URL}/style-transfer/convert`;
    const styleRes = await fetch(styleUrl, {
      method: 'POST',
      headers: styleHeaders,
      body: form,
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!styleRes.ok) {
      const txt = await styleRes.text().catch(() => '');
      throw new Error(`Style-transfer API error ${styleRes.status}: ${txt}`);
    }

    const sketchBuffer = Buffer.from(await styleRes.arrayBuffer());

    return await uploadImageGen({
      originalname: `${filename}.png`,
      buffer: sketchBuffer,
      mimetype: 'image/png',
    });

  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Image-generation pipeline timed out');
    console.error('Image generation pipeline failed:', err);
    throw err;
  }
}

const uniqueFilename = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.floor(Math.random() * 1e6).toString(36).padStart(4, '0');
  return `${timestamp}-${random}`;
};