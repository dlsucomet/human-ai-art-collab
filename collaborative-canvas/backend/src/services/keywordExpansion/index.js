import { expandKeywordsFromData, KeywordExpansionProvider } from "./keywordExpansionProvider.js";
import { KEYWORD_EXPANSION_CONFIG } from "../ai/config.js";

/**
 * Keyword Expansion using Local Llama
 * 
 * This module provides a single entry point for expanding keywords
 * using local Llama models (Llama 3.1:8b or compatible).
 * 
 * Alignment with NURA Architecture:
 * - Provides a single entry point for keyword expansion
 * - Uses local Llama for all expansions
 * - Supports both broader and more specific expansions
 * - Queue-safe processing for local inference
 * 
 * @param {Object} data - Object containing Subject matter, Action & pose, Theme & mood, and Brief
 * @returns {Promise<Object>} - Expanded keywords with structure {Broader: {...}, More Specific: {...}}
 */
export async function expandKeywords(data) {
    console.log("Using local Llama for keyword expansion");
    return await expandKeywordsFromData(data);
}

/**
 * Get provider information
 * 
 * @returns {Object} - Provider metadata
 */
export function getKeywordExpansionProviderInfo() {
    const provider = new KeywordExpansionProvider(KEYWORD_EXPANSION_CONFIG);
    return provider.getProviderInfo();
}

/**
 * Health check for the keyword expansion provider
 * 
 * @returns {Promise<boolean>} - Whether the provider is healthy
 */
export async function healthCheck() {
    const provider = new KeywordExpansionProvider(KEYWORD_EXPANSION_CONFIG);
    return await provider.healthCheck();
}

export { KeywordExpansionProvider };
