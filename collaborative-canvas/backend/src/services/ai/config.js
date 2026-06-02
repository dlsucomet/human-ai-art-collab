/**
 * Centralized configuration for local AI providers.
 * 
 * This module centralizes all local AI configuration, making it easier to:
 * - Switch between providers (Ollama, vLLM, etc.)
 * - Manage model configurations
 * - Support future OpenAI-compatible endpoints
 * - Enable environment-based configuration
 * 
 * Alignment with NURA Architecture:
 * - Provides a single source of truth for local AI configuration
 * - Decouples provider-specific settings from business logic
 * - Enables easy migration between runtime backends
 * - Supports future multi-provider scenarios
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Local AI Configuration
 * 
 * Environment Variables:
 * - LOCAL_AI_PROVIDER: Provider type (ollama, vllm, openai-compatible)
 * - LOCAL_AI_BASE_URL: Base URL for the local AI endpoint
 * - OLLAMA_CAPTION_MODEL: Model name for captioning (default: qwen2.5vl:7b)
 * - OLLAMA_CAPTION_PROMPT: Prompt for caption generation (default: "Describe this image briefly.")
 * - LOCAL_AI_TIMEOUT: Request timeout in milliseconds (default: 10 minutes)
 */
export const LOCAL_AI_CONFIG = {
    // Provider selection
    provider: process.env.LOCAL_AI_PROVIDER || "ollama",
    
    // Endpoint configuration
    baseUrl: process.env.LOCAL_AI_BASE_URL || "http://localhost:11434",
    
    // Model configuration
    captionModel: process.env.OLLAMA_CAPTION_MODEL || "qwen2.5vl:7b",
    
    // Prompt configuration
    captionPrompt: process.env.OLLAMA_CAPTION_PROMPT || "Describe the main subject and setting briefly.",
    
    // Request configuration
    timeout: parseInt(process.env.LOCAL_AI_TIMEOUT || "600000", 10), // 10 minutes default
    
    // Image preprocessing configuration
    image: {
        maxDimension: parseInt(process.env.LOCAL_AI_MAX_IMAGE_DIMENSION || "1024", 10),
        jpegQuality: parseInt(process.env.LOCAL_AI_JPEG_QUALITY || "80", 10),
    },
};

/**
 * Provider-specific endpoint configurations
 */
export const PROVIDER_ENDPOINTS = {
    ollama: {
        generate: "/api/generate",
        chat: "/api/chat",
        tags: "/api/tags",
    },
    vllm: {
        // vLLM uses OpenAI-compatible endpoints
        chatCompletions: "/v1/chat/completions",
        completions: "/v1/completions",
        models: "/v1/models",
    },
    "openai-compatible": {
        chatCompletions: "/v1/chat/completions",
        completions: "/v1/completions",
        models: "/v1/models",
    },
};

/**
 * Get the full endpoint URL for a specific provider and operation
 */
export function getEndpoint(provider, operation) {
    const endpoints = PROVIDER_ENDPOINTS[provider];
    if (!endpoints) {
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    const endpoint = endpoints[operation];
    if (!endpoint) {
        throw new Error(`Unknown operation ${operation} for provider ${provider}`);
    }
    
    return `${LOCAL_AI_CONFIG.baseUrl}${endpoint}`;
}

/**
 * Keyword Extraction Configuration
 * 
 * Environment Variables:
 * - LOCAL_AI_KEYWORD_EXTRACTION_MODEL: Model for keyword extraction (default: llama3.1:8b)
 * - LOCAL_AI_EXTRACTION_TIMEOUT: Request timeout for extraction (default: 5 minutes)
 */
export const KEYWORD_EXTRACTION_CONFIG = {
    // Provider selection
    provider: process.env.LOCAL_AI_PROVIDER || "ollama",
    
    // Endpoint configuration
    baseUrl: process.env.LOCAL_AI_BASE_URL || "http://localhost:11434",
    
    // Model configuration for keyword extraction
    keywordExtractionModel: process.env.LOCAL_AI_KEYWORD_EXTRACTION_MODEL || "llama3.1:8b",
    
    // Request configuration
    timeout: parseInt(process.env.LOCAL_AI_EXTRACTION_TIMEOUT || "300000", 10), // 5 minutes default
};

/**
 * Validate the current configuration
 */
export function validateConfig() {
    const { provider, baseUrl, captionModel } = LOCAL_AI_CONFIG;
    
    if (!provider) {
        throw new Error("LOCAL_AI_PROVIDER is not configured");
    }
    
    if (!baseUrl) {
        throw new Error("LOCAL_AI_BASE_URL is not configured");
    }
    
    if (!captionModel) {
        throw new Error("OLLAMA_CAPTION_MODEL is not configured");
    }
    
    return true;
}

/**
 * Validate keyword extraction configuration
 */
export function validateKeywordExtractionConfig() {
    const { provider, baseUrl, keywordExtractionModel } = KEYWORD_EXTRACTION_CONFIG;
    
    if (!provider) {
        throw new Error("LOCAL_AI_PROVIDER is not configured for keyword extraction");
    }
    
    if (!baseUrl) {
        throw new Error("LOCAL_AI_BASE_URL is not configured for keyword extraction");
    }
    
    if (!keywordExtractionModel) {
        throw new Error("LOCAL_AI_KEYWORD_EXTRACTION_MODEL is not configured");
    }
    
    return true;
}
