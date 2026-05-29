import sharp from "sharp";
import axios from "axios";
import { BaseAIProvider } from "../ai/baseProvider.js";
import { LOCAL_AI_CONFIG, getEndpoint } from "../ai/config.js";

/**
 * Ollama Provider for Local AI
 * 
 * This provider implements the BaseAIProvider interface for Ollama,
 * enabling local vision model inference for image captioning.
 * 
 * Alignment with NURA Architecture:
 * - Transport layer isolated in makeRequest()
 * - Model configuration from centralized config
 * - Request schema standardized via base class
 * - Vendor lock-in reduced via abstract interface
 * - Prepared for future vLLM migration
 */
export class OllamaProvider extends BaseAIProvider {
    constructor(config) {
        super(config);
        this.endpoint = getEndpoint(this.provider, "generate");
        this.prompt = config.captionPrompt || "Describe this image briefly.";
    }
    
    /**
     * Generate a caption for a single image
     * 
     * @param {Buffer} imageBuffer - The image buffer
     * @param {Object} options - Additional options
     * @returns {Promise<string>} - The generated caption
     */
    async generateCaption(imageBuffer, options = {}) {
        const startTime = Date.now();
        this.log("info", "caption_request_started", {
            imageSize: imageBuffer.length,
            model: this.config.captionModel,
        });
        
        try {
            // Preprocess image
            const optimizedBuffer = await this.preprocessImage(imageBuffer);
            
            // Make request to Ollama
            const caption = await this.makeRequest(optimizedBuffer);
            
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log("info", "caption_request_completed", {
                caption,
                duration: `${elapsedSeconds}s`,
            });
            
            return caption;
        } catch (error) {
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log("error", "caption_request_failed", {
                error: error.message,
                duration: `${elapsedSeconds}s`,
            });
            throw error;
        }
    }
    
    /**
     * Generate captions for multiple images (batched)
     * 
     * For queue-safe operation, this processes images sequentially
     * rather than in parallel to avoid GPU overload.
     * 
     * @param {Buffer[]} imageBuffers - Array of image buffers
     * @param {Object} options - Additional options
     * @returns {Promise<string[]>} - Array of generated captions
     */
    async generateCaptions(imageBuffers, options = {}) {
        const startTime = Date.now();
        this.log("info", "batch_caption_request_started", {
            batchSize: imageBuffers.length,
            model: this.config.captionModel,
        });
        
        const captions = [];
        
        // Process sequentially to avoid GPU overload
        // Future: This can be optimized with proper queue management
        for (let i = 0; i < imageBuffers.length; i++) {
            const imageBuffer = imageBuffers[i];
            this.log("info", "processing_batch_item", {
                index: i,
                total: imageBuffers.length,
            });
            
            try {
                const caption = await this.generateCaption(imageBuffer, options);
                captions.push(caption);
            } catch (error) {
                this.log("error", "batch_item_failed", {
                    index: i,
                    error: error.message,
                });
                // Continue processing other images even if one fails
                captions.push(null);
            }
        }
        
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        this.log("info", "batch_caption_request_completed", {
            batchSize: imageBuffers.length,
            successfulCount: captions.filter(c => c !== null).length,
            duration: `${elapsedSeconds}s`,
        });
        
        return captions;
    }
    
    /**
     * Health check for the provider
     * 
     * @returns {Promise<boolean>} - Whether the provider is healthy
     */
    async healthCheck() {
        try {
            const tagsEndpoint = getEndpoint(this.provider, "tags");
            const response = await axios.get(tagsEndpoint, {
                timeout: 5000,
            });
            
            const isHealthy = response.status === 200;
            this.log("info", "health_check_completed", { isHealthy });
            
            return isHealthy;
        } catch (error) {
            this.log("error", "health_check_failed", { error: error.message });
            return false;
        }
    }
    
    /**
     * Preprocess image for inference
     * - Resize if larger than max dimension
     * - Preserve aspect ratio
     * - Compress to JPEG
     * 
     * @param {Buffer} imageBuffer - The image buffer
     * @returns {Promise<Buffer>} - The optimized image buffer
     */
    async preprocessImage(imageBuffer) {
        const startTime = Date.now();
        
        try {
            const metadata = await sharp(imageBuffer).metadata();
            const { width, height } = metadata;
            
            this.log("info", "image_preprocessing_started", {
                originalSize: imageBuffer.length,
                dimensions: `${width}x${height}`,
            });
            
            const { maxDimension, jpegQuality } = this.config.image;
            
            // Check if resizing is needed
            if (width <= maxDimension && height <= maxDimension) {
                this.log("info", "image_within_limits", {
                    maxDimension,
                    currentDimensions: `${width}x${height}`,
                });
                
                // Still convert to JPEG for consistency
                const optimized = await sharp(imageBuffer)
                    .jpeg({ quality: jpegQuality })
                    .toBuffer();
                
                const elapsed = Date.now() - startTime;
                this.log("info", "image_preprocessing_completed", {
                    optimizedSize: optimized.length,
                    duration: `${elapsed}ms`,
                });
                
                return optimized;
            }
            
            // Calculate new dimensions preserving aspect ratio
            let newWidth, newHeight;
            if (width > height) {
                newWidth = maxDimension;
                newHeight = Math.round((height * maxDimension) / width);
            } else {
                newHeight = maxDimension;
                newWidth = Math.round((width * maxDimension) / height);
            }
            
            this.log("info", "image_resizing", {
                from: `${width}x${height}`,
                to: `${newWidth}x${newHeight}`,
            });
            
            const optimized = await sharp(imageBuffer)
                .resize(newWidth, newHeight, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .jpeg({ quality: jpegQuality })
                .toBuffer();
            
            const elapsed = Date.now() - startTime;
            this.log("info", "image_preprocessing_completed", {
                optimizedSize: optimized.length,
                duration: `${elapsed}ms`,
            });
            
            return optimized;
        } catch (error) {
            this.log("error", "image_preprocessing_failed", { error: error.message });
            // Fallback to original image if optimization fails
            this.log("warn", "using_original_image_fallback");
            return imageBuffer;
        }
    }
    
    /**
     * Make request to Ollama API
     * 
     * @param {Buffer} imageBuffer - The optimized image buffer
     * @returns {Promise<string>} - The generated caption
     */
    async makeRequest(imageBuffer) {
        const requestStartTime = Date.now();
        
        // Convert buffer to base64
        const base64Image = imageBuffer.toString("base64");
        
        this.log("info", "ollama_request_prepared", {
            base64Size: base64Image.length,
            endpoint: this.endpoint,
        });
        
        // Prepare payload
        const payload = {
            model: this.config.captionModel,
            prompt: this.prompt,
            images: [base64Image],
            stream: false,
        };
        
        try {
            const response = await axios.post(this.endpoint, payload, {
                timeout: this.config.timeout,
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                headers: {
                    "Content-Type": "application/json",
                },
            });
            
            const requestDuration = ((Date.now() - requestStartTime) / 1000).toFixed(2);
            this.log("info", "ollama_response_received", {
                status: response.status,
                duration: `${requestDuration}s`,
                headerCount: Object.keys(response.headers).length,
            });
            
            const data = response.data;
            this.log("info", "response_parsing", {
                dataSize: JSON.stringify(data).length,
            });
            
            // Extract caption from response
            let caption = data.response || data.text || "";
            
            if (!caption) {
                this.log("error", "empty_response", { data });
                throw new Error("Ollama returned an empty response");
            }
            
            caption = caption.trim();
            
            return caption;
        } catch (error) {
            const requestDuration = ((Date.now() - requestStartTime) / 1000).toFixed(2);
            this.log("error", "ollama_request_failed", {
                duration: `${requestDuration}s`,
                error: error.message,
            });
            
            if (error.code === 'ECONNABORTED') {
                throw new Error("Ollama request timed out. The model may be overloaded or the image too large.");
            }
            
            if (error.response) {
                this.log("error", "ollama_api_error", {
                    status: error.response.status,
                    statusText: error.response.statusText,
                });
                throw new Error(`Ollama API error: ${error.response.status} ${error.response.statusText}`);
            }
            
            throw new Error(`Failed to generate caption with Ollama: ${error.message}`);
        }
    }
}

/**
 * Backward compatibility: Export a function that creates an instance and calls generateCaption
 * This maintains compatibility with existing imports
 */
const providerInstance = new OllamaProvider(LOCAL_AI_CONFIG);

export async function getCaption(imageBlob) {
    return await providerInstance.generateCaption(imageBlob);
}
