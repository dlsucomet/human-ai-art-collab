import { extractKeywordsFromCaption, extractKeywordsFromCaptions, KeywordExtractionProvider } from "./keywordExtractionProvider.js";
import { KEYWORD_EXTRACTION_CONFIG } from "../ai/config.js";

/**
 * Caption Keyword Extraction using Local Llama
 * 
 * This module provides a single entry point for extracting keywords from captions
 * using local Llama models (Llama 3.1:8b or compatible).
 * 
 * Alignment with NURA Architecture:
 * - Provides a single entry point for keyword extraction
 * - Uses local Llama for all extractions
 * - Supports both single and batched operations
 * - Queue-safe sequential processing for local inference
 * 
 * @param {string} caption - The caption string
 * @returns {Promise<Object>} - Extracted keywords with structure {Subject matter: [], Action & pose: [], Theme & mood: []}
 */
export async function extractKeywords(caption) {
    console.log("Using local Llama for keyword extraction");
    return await extractKeywordsFromCaption(caption);
}

/**
 * Extract keywords from multiple captions (batched)
 * 
 * This function provides batched keyword extraction with queue-safe
 * sequential processing to avoid GPU overload.
 * 
 * Alignment with NURA Architecture:
 * - Replaces unsafe Promise.all with controlled batching
 * - Prevents GPU overload from parallel local inference
 * - Prepared for BullMQ queue integration
 * 
 * @param {string[]} captions - Array of caption strings
 * @param {Object} options - Additional options
 * @returns {Promise<Object[]>} - Array of extracted keyword objects
 */
export async function extractKeywordsBatch(captions, options = {}) {
    console.log(`Using local Llama for batched keyword extraction (${captions.length} captions)`);
    return await extractKeywordsFromCaptions(captions, options);
}

/**
 * Get provider information
 * 
 * @returns {Object} - Provider metadata
 */
export function getKeywordExtractionProviderInfo() {
    const provider = new KeywordExtractionProvider(KEYWORD_EXTRACTION_CONFIG);
    return provider.getProviderInfo();
}

/**
 * Health check for the keyword extraction provider
 * 
 * @returns {Promise<boolean>} - Whether the provider is healthy
 */
export async function healthCheck() {
    const provider = new KeywordExtractionProvider(KEYWORD_EXTRACTION_CONFIG);
    return await provider.healthCheck();
}

export { KeywordExtractionProvider };
