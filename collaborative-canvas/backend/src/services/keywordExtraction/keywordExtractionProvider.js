import axios from "axios";
import { BaseAIProvider } from "../ai/baseProvider.js";
import { KEYWORD_EXTRACTION_CONFIG, getEndpoint } from "../ai/config.js";

/**
 * Keyword Extraction Provider for Local AI
 * 
 * This provider implements the BaseAIProvider interface for Llama models,
 * enabling local caption analysis and keyword extraction.
 * 
 * Alignment with NURA Architecture:
 * - Transport layer isolated in makeRequest()
 * - Model configuration from centralized config
 * - Request schema standardized via base class
 * - Vendor lock-in reduced via abstract interface
 * - Prepared for future model migration
 */
export class KeywordExtractionProvider extends BaseAIProvider {
    constructor(config) {
        super(config);
        this.endpoint = getEndpoint(this.provider, "generate");
        this.systemPrompt = this.buildSystemPrompt();
    }
    
    /**
     * Build the system prompt for keyword extraction
     * 
     * @returns {string} - The system prompt
     */
    buildSystemPrompt() {
        return `Extract key elements from descriptive sentences of illustrations for categorization into three areas: "Subject matter," "Action & pose," and "Theme & mood."

- **Subject matter**: Extract specific, visually identifiable nouns or noun phrases, including compound objects and descriptive pairings (e.g., "colorful objects," "red and orange background"). Favor phrases over single-word nouns when appropriate. Avoid reducing meaningful descriptors to general nouns. List should NOT be empty.

- **Action & pose**: Identify any clearly implied actions or poses performed by subjects. Use the base form (e.g., "reading," "riding") or descriptive phrases. If no actions are present, the list should be empty.

- **Theme & mood**: Use adjectives, abstract nouns, or adverbs that capture the overall emotion, setting, purpose, or cultural context. Favor concise, meaningful words and omit style terms. List should NOT be empty.

*Note: Exclude variations like plurals and style descriptors (e.g., cartoon, illustration). Use root forms of words only.*

## Steps

1. Review the provided sentences or descriptions.
2. Extract nouns for "Subject matter."
3. Determine actions or poses for "Action & pose."
4. Choose relevant adjectives or adverbs for "Theme & mood."
5. Eliminate style descriptors and apply root forms where necessary.

## Output Format

Structure the output as a JSON object with distinct keys for each category: "Subject matter", "Action & pose", and "Theme & mood".

## Examples

### Example 1
**Input:** ["An old man is reading a book at a kitchen table.", "Mountains are covered in snow under a cloudy sky.", "A dog is lying casually beside a fireplace."]
**Output:** {"Subject matter": ["old man", "book", "kitchen table", "mountains", "snow", "cloudy sky", "dog", "fireplace"], "Action & pose": ["reading a book", "lying casually"], "Theme & mood": ["cozy", "serene"]}

### Example 2
**Input:** ["A firefighter sprays water on a burning house.", "A crowd watches a parade from the sidewalk.", "A boy rides a bicycle through the rain."]
**Output:** {"Subject matter": ["firefighter", "water", "burning house", "crowd", "parade", "sidewalk", "boy", "bicycle", "rain"], "Action & pose": ["spraying water", "watching a parade", "riding a bicycle"], "Theme & mood": ["urgent", "lively", "adventurous"]}

### Example 3
**Input:** ["A painting of a stone cottage surrounded by lavender fields.", "An image of a lighthouse on a cliff overlooking the sea.", "A sketch of a bridge crossing a quiet river in autumn.", "A photo of a barn with haystacks nearby under a cloudy sky."]
**Output:** {"Subject matter": ["stone cottage", "lavender fields", "lighthouse", "cliff", "sea", "bridge", "river", "autumn", "barn", "haystacks", "sky"], "Action & pose": [], "Theme & mood": ["serene", "rural", "natural"]}

Focus on visible elements and actions, especially in sentences with abstract descriptors that may not directly map to visible objects or actions.`;
    }
    
    /**
     * Extract keywords from a single caption
     * 
     * @param {string} caption - The caption text
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Extracted keywords with structure {Subject matter: [], Action & pose: [], Theme & mood: []}
     */
    async extractKeywords(caption, options = {}) {
        const startTime = Date.now();
        this.log("info", "keyword_extraction_started", {
            captionLength: caption.length,
            model: this.config.keywordExtractionModel,
        });
        
        try {
            const result = await this.makeRequest(caption);
            
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log("info", "keyword_extraction_completed", {
                duration: `${elapsedSeconds}s`,
                subjectCount: result["Subject matter"]?.length || 0,
                actionCount: result["Action & pose"]?.length || 0,
                moodCount: result["Theme & mood"]?.length || 0,
            });
            
            return result;
        } catch (error) {
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log("error", "keyword_extraction_failed", {
                error: error.message,
                duration: `${elapsedSeconds}s`,
            });
            throw error;
        }
    }
    
    /**
     * Extract keywords from multiple captions (batched)
     * 
     * For queue-safe operation, this processes captions sequentially
     * rather than in parallel to avoid GPU overload.
     * 
     * @param {string[]} captions - Array of caption strings
     * @param {Object} options - Additional options
     * @returns {Promise<Object[]>} - Array of extracted keyword objects
     */
    async extractKeywordsBatch(captions, options = {}) {
        const startTime = Date.now();
        this.log("info", "batch_keyword_extraction_started", {
            batchSize: captions.length,
            model: this.config.keywordExtractionModel,
        });
        
        const results = [];
        
        // Process sequentially to avoid GPU overload
        for (let i = 0; i < captions.length; i++) {
            const caption = captions[i];
            this.log("info", "processing_batch_item", {
                index: i,
                total: captions.length,
            });
            
            try {
                const result = await this.extractKeywords(caption, options);
                results.push(result);
            } catch (error) {
                this.log("error", "batch_item_failed", {
                    index: i,
                    error: error.message,
                });
                // Continue processing other captions even if one fails
                results.push({
                    "Subject matter": [],
                    "Action & pose": [],
                    "Theme & mood": [],
                    error: error.message,
                });
            }
        }
        
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        this.log("info", "batch_keyword_extraction_completed", {
            batchSize: captions.length,
            successfulCount: results.filter(r => !r.error).length,
            duration: `${elapsedSeconds}s`,
        });
        
        return results;
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
     * Make request to Ollama API for keyword extraction
     * 
     * @param {string} caption - The caption text
     * @returns {Promise<Object>} - Extracted keywords
     */
    async makeRequest(caption) {
        const requestStartTime = Date.now();
        
        const userPrompt = `Extract keywords from these captions:\n\n${caption}\n\nRespond with ONLY valid JSON, no additional text or markdown formatting.`;
        
        this.log("info", "extraction_request_prepared", {
            captionLength: caption.length,
            endpoint: this.endpoint,
        });
        
        // Prepare payload
        const payload = {
            model: this.config.keywordExtractionModel,
            prompt: userPrompt,
            system: this.systemPrompt,
            stream: false,
            temperature: 0.3, // Lower temperature for more consistent extraction
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
            this.log("info", "extraction_response_received", {
                status: response.status,
                duration: `${requestDuration}s`,
            });
            
            const data = response.data;
            const responseText = data.response || data.text || "";
            
            if (!responseText) {
                this.log("error", "empty_response", { data });
                throw new Error("Ollama returned an empty response");
            }
            
            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                this.log("error", "json_extraction_failed", {
                    responseText: responseText.substring(0, 200),
                });
                throw new Error("Could not extract JSON from response");
            }
            
            const jsonStr = jsonMatch[0];
            const result = JSON.parse(jsonStr);
            
            // Validate structure
            this.validateExtractionResult(result);
            
            return result;
        } catch (error) {
            const requestDuration = ((Date.now() - requestStartTime) / 1000).toFixed(2);
            this.log("error", "extraction_request_failed", {
                duration: `${requestDuration}s`,
                error: error.message,
            });
            
            if (error.code === 'ECONNABORTED') {
                throw new Error("Extraction request timed out. The model may be overloaded.");
            }
            
            if (error.response) {
                this.log("error", "llm_api_error", {
                    status: error.response.status,
                    statusText: error.response.statusText,
                });
                throw new Error(`LLM API error: ${error.response.status} ${error.response.statusText}`);
            }
            
            throw new Error(`Failed to extract keywords: ${error.message}`);
        }
    }
    
    /**
     * Validate the extraction result structure
     * 
     * @param {Object} result - The result to validate
     * @throws {Error} If structure is invalid
     */
    validateExtractionResult(result) {
        const requiredKeys = ["Subject matter", "Action & pose", "Theme & mood"];
        
        for (const key of requiredKeys) {
            if (!result.hasOwnProperty(key)) {
                throw new Error(`Missing required key: "${key}"`);
            }
            
            if (!Array.isArray(result[key])) {
                throw new Error(`"${key}" must be an array, got ${typeof result[key]}`);
            }
        }
        
        // Validate that non-empty lists exist
        if (result["Subject matter"].length === 0) {
            this.log("warn", "empty_subject_matter", {});
        }
        
        if (result["Theme & mood"].length === 0) {
            this.log("warn", "empty_theme_mood", {});
        }
    }
}

/**
 * Backward compatibility: Export a function that creates an instance and calls extractKeywords
 * This maintains compatibility with existing imports
 */
const providerInstance = new KeywordExtractionProvider(KEYWORD_EXTRACTION_CONFIG);

export async function extractKeywordsFromCaption(caption) {
    return await providerInstance.extractKeywords(caption);
}

export async function extractKeywordsFromCaptions(captions) {
    return await providerInstance.extractKeywordsBatch(captions);
}
