import { getCaption as getQwenCaption, OllamaProvider } from "./ollamaProvider.js";
import { LOCAL_AI_CONFIG } from "../ai/config.js";

/**
 * Image captioning using local Ollama.
 * 
 * This module provides a single entry point for image captioning using
 * local Ollama models (moondream, qwen2.5vl:7b, minicpm-v, etc.).
 * 
 * Alignment with NURA Architecture:
 * - Provides a single entry point for captioning
 * - Uses local Ollama for all captioning
 * - Supports both single and batched operations
 * - Queue-safe sequential processing for local inference
 * 
 * @param {Buffer} imageBlob - The image buffer.
 * @returns {Promise<string>} - The generated caption.
 */
export async function getCaption(imageBlob) {
    console.log("Using local Ollama for captioning");
    return await getQwenCaption(imageBlob);
}

/**
 * Generate captions for multiple images (batched)
 * 
 * This function provides batched captioning support with queue-safe
 * sequential processing to avoid GPU overload.
 * 
 * Alignment with NURA Architecture:
 * - Replaces unsafe Promise.all with controlled batching
 * - Prevents GPU overload from parallel local inference
 * - Prepared for BullMQ queue integration
 * 
 * @param {Buffer[]} imageBlobs - Array of image buffers.
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} - Array of generated captions.
 */
export async function getCaptions(imageBlobs, options = {}) {
    console.log(`Using local Ollama for batched captioning (${imageBlobs.length} images)`);
    return await getLocalCaptions(imageBlobs, options);
}

/**
 * Generate captions using local provider (queue-safe sequential processing)
 * 
 * This function processes images sequentially to avoid GPU overload,
 * which is a key requirement from the NURA architecture document.
 * 
 * @param {Buffer[]} imageBlobs - Array of image buffers.
 * @param {Object} options - Additional options
 * @returns {Promise<string[]>} - Array of generated captions.
 */
async function getLocalCaptions(imageBlobs, options = {}) {
    const startTime = Date.now();
    console.log(`[captioning] Local batch processing started: ${imageBlobs.length} images`);
    
    // Use the OllamaProvider's batched method for queue-safe processing
    const provider = new OllamaProvider(LOCAL_AI_CONFIG);
    const captions = await provider.generateCaptions(imageBlobs, options);
    
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[captioning] Local batch processing completed in ${elapsedSeconds}s`);
    
    return captions;
}

/**
 * Get provider information
 * 
 * @returns {Object} - Provider metadata
 */
export function getCaptionProviderInfo() {
    const provider = new OllamaProvider(LOCAL_AI_CONFIG);
    return provider.getProviderInfo();
}

/**
 * Health check for the captioning provider
 * 
 * @returns {Promise<boolean>} - Whether the provider is healthy
 */
export async function healthCheck() {
    const provider = new OllamaProvider(LOCAL_AI_CONFIG);
    return await provider.healthCheck();
}
