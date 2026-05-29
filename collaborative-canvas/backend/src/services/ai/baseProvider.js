/**
 * Base Provider Class for Local AI
 * 
 * This abstract base class defines the interface that all local AI providers must implement.
 * 
 * Alignment with NURA Architecture:
 * - Provides a contract for provider implementations
 * - Enables provider swapping without changing business logic
 * - Standardizes request/response handling
 * - Prepares for future multi-provider support
 * - Enables easy testing and mocking
 * 
 * Design Principles:
 * - Transport layer isolation: HTTP logic is encapsulated
 * - Model configuration centralization: Settings come from config.js
 * - Request schema standardization: Consistent input/output formats
 * - Error handling: Standardized error types
 * - Observability: Structured logging hooks
 */

import { LOCAL_AI_CONFIG } from "./config.js";

/**
 * Base class for AI providers
 */
export class BaseAIProvider {
    constructor(config) {
        this.config = config || LOCAL_AI_CONFIG;
        this.provider = this.config.provider;
    }
    
    /**
     * Generate a caption for a single image
     * 
     * @param {Buffer} imageBuffer - The image buffer
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - The generated caption
     */
    async generateCaption(imageBuffer, options = {}) {
        throw new Error("generateCaption must be implemented by subclass");
    }
    
    /**
     * Generate captions for multiple images (batched)
     * 
     * @param {Buffer[]} imageBuffers - Array of image buffers
     * @param {Object} options - Additional options
     * @returns {Promise<string[]>} - Array of generated captions
     */
    async generateCaptions(imageBuffers, options = {}) {
        throw new Error("generateCaptions must be implemented by subclass");
    }
    
    /**
     * Health check for the provider
     * 
     * @returns {Promise<boolean>} - Whether the provider is healthy
     */
    async healthCheck() {
        throw new Error("healthCheck must be implemented by subclass");
    }
    
    /**
     * Get provider information
     * 
     * @returns {Object} - Provider metadata
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            baseUrl: this.config.baseUrl,
            model: this.config.captionModel,
        };
    }
    
    /**
     * Log structured information for observability
     * 
     * @param {string} level - Log level (info, warn, error)
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    log(level, event, data = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            provider: this.provider,
            event,
            ...data,
        };
        
        const message = `[${this.provider}] ${event}`;
        
        switch (level) {
            case "error":
                console.error(message, logEntry);
                break;
            case "warn":
                console.warn(message, logEntry);
                break;
            default:
                console.log(message, logEntry);
        }
    }
    
    /**
     * Measure and log duration of an operation
     * 
     * @param {string} operation - Operation name
     * @param {Function} fn - Function to measure
     * @returns {Promise<any>} - Result of the function
     */
    async measureDuration(operation, fn) {
        const startTime = Date.now();
        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.log("info", `${operation} completed`, { duration: `${duration}ms` });
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.log("error", `${operation} failed`, { duration: `${duration}ms`, error: error.message });
            throw error;
        }
    }
}
