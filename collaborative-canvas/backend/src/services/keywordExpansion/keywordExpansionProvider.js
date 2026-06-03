import axios from "axios";
import { BaseAIProvider } from "../ai/baseProvider.js";
import { KEYWORD_EXPANSION_CONFIG, getEndpoint } from "../ai/config.js";

/**
 * Keyword Expansion Provider for Local AI
 * 
 * This provider implements the BaseAIProvider interface for Llama models,
 * enabling local keyword expansion based on vote-weighted keywords and design briefs.
 * 
 * Alignment with NURA Architecture:
 * - Transport layer isolated in makeRequest()
 * - Model configuration from centralized config
 * - Request schema standardized via base class
 * - Vendor lock-in reduced via abstract interface
 * - Prepared for future model migration
 */
export class KeywordExpansionProvider extends BaseAIProvider {
    constructor(config) {
        super(config);
        this.endpoint = getEndpoint(this.provider, "generate");
        this.systemPrompt = this.buildSystemPrompt();
    }
    
    /**
     * Build the system prompt for keyword expansion
     * 
     * @returns {string} - The system prompt
     */
    buildSystemPrompt() {
        return `Generate creative expansions for illustration concepts based on given vote-weighted keywords and a design brief.

## Input Requirements

You will be provided with:
1. **Three vote-weighted keyword lists** (each item = \`{ term: integer }\`):
   - **Subject matter**: Specific nouns or noun phrases, including compound objects and descriptive pairings.
   - **Action & pose**: Clearly implied actions or poses using the base form or descriptive phrases.
   - **Theme & mood**: Adjectives or abstract nouns capturing emotion, setting, or cultural context.
2. **Design Brief (string)**: A free-form text description of the overall illustration intent, use-case, or style.

## Steps

### 1. Understand the Input
Thoroughly analyze the design brief and keyword lists to grasp the creative direction and intent.

### 2. Expand the Keywords Creatively
* **Prioritize**: Emphasize high-vote-weight terms for expansion.
* **Broader Expansions**: Generate terms that are more general, conceptual, or open-ended to inspire wide exploration.
* **More Specific Expansions**: Create rich, vivid, or unexpected ideas that refine and sharpen the visual concept.
* **Avoid**: Steer clear of simple rewordings, synonyms, plurals, or style descriptors like "cartoon" or "vector".
* **Grounding**: Ensure that each expansion is imaginative, meaningfully distinct, concise, and grounded in or inspired by at least one **Subject matter** keyword (whenever applicable).
* **Constraints**: 
  - For each top-level category (*Broader* and *More Specific*), generate a **total of at most 10 expanded keywords combined** across all three subcategories (Subject matter, Action & pose, Theme & mood).
  - Distribute these items naturally across the three subcategories based on what fits the creative flow best (e.g., you might use a 4/3/3 split for Broader, and a 2/5/3 split for More Specific). Avoid rigidly forcing equal counts.

## Output Format

Organize your output into a structured JSON object with two top-level keys: \`"Broader"\` and \`"More Specific"\`. Each key must contain three subcategories: \`"Subject matter"\`, \`"Action & pose"\`, and \`"Theme & mood"\`.

## Examples

### Example 1

**User Input:**
\`\`\`json
{
  "Subject matter": {
    "oak tree": 4,
    "fox": 3,
    "mushroom": 2
  },
  "Theme & mood": {
    "whimsical": 5,
    "quiet": 3,
    "eerie": 1
  },
  "Action & pose": {
    "peering": 4,
    "growing": 3,
    "lurking": 1
  },
  "Brief": "Illustration for a fairy-tale children's book page set in an enchanted forest."
}
\`\`\`

**Assistant Output:**

\`\`\`json
{
  "Broader": {
    "Subject matter": [
      "enchanted woodland",
      "woodland creatures"
    ],
    "Action & pose": [
      "exploring hidden realms",
      "awaiting discovery"
    ],
    "Theme & mood": [
      "magical stillness",
      "mysterious tranquility"
    ]
  },
  "More Specific": {
    "Subject matter": [
      "fox curled atop ancient oak roots",
      "mushrooms forming a glowing fairy ring"
    ],
    "Action & pose": [
      "fox peering through tangled undergrowth",
      "oak tree gently cradling tiny woodland animals"
    ],
    "Theme & mood": [
      "playfully secretive atmosphere",
      "subtle sense of wonder"
    ]
  }
}
\`\`\`

### Example 2

**User Input:**

\`\`\`json
{
  "Subject matter": {
    "lantern": 3,
    "owl": 0
  },
  "Theme & mood": {
    "calm": 2,
    "tense": 1
  },
  "Action & pose": {},
  "Brief": "A night-time forest scene for a meditation app splash screen."
}
\`\`\`

**Assistant Output:**

\`\`\`json
{
  "Broader": {
    "Subject matter": [
      "illuminated object",
      "nocturnal forest life",
      "source of gentle light"
    ],
    "Action & pose": [
      "casting soft glow",
      "enhancing stillness"
    ],
    "Theme & mood": [
      "soothing atmosphere",
      "tranquil energies",
      "ethereal calm"
    ]
  },
  "More Specific": {
    "Subject matter": [
      "lantern nestled in fern fronds",
      "forest animals gazing at the light"
    ],
    "Action & pose": [
      "radiating rippling halos",
      "silent owl perched",
      "weaving through mist"
    ],
    "Theme & mood": [
      "hushed midnight calm",
      "anticipation",
      "misty veil of peace"
    ]
  }
}
\`\`\`

### Example 3

**User Input:**

\`\`\`json
{
  "Subject matter": {
    "star": 0,
    "moon": 0,
    "planet": 0
  },
  "Theme & mood": {
    "serene": 0
  },
  "Action & pose": {
    "glowing": 0,
    "orbiting": 0,
    "drifting": 0
  },
  "Brief": "Scene illustrating a quiet night sky composition."
}
\`\`\`

**Assistant Output:**

\`\`\`json
{
  "Broader": {
    "Subject matter": [
      "celestial bodies",
      "cosmic landscape",
      "nighttime expanse"
    ],
    "Action & pose": [
      "gentle movement",
      "celestial harmony"
    ],
    "Theme & mood": [
      "tranquility",
      "dreamlike stillness",
      "universal calm"
    ]
  },
  "More Specific": {
    "Subject matter": [
      "silver crescent moon",
      "distant glowing planet"
    ],
    "Action & pose": [
      "stars softly pulsing",
      "planet slowly turning",
      "moonlight subtly diffusing"
    ],
    "Theme & mood": [
      "whispering silence",
      "quiet cosmic serenity"
    ]
  }
}
\`\`\`

## Notes

* The keyword expansions should be highly creative, distinct, and concise to fuel unique illustration concepts.
* Emphasize boldness and novelty over similarity.
* Ensure all keywords are derived from or inspired by the original input without introducing completely unrelated external concepts.`;
    }
    
    /**
     * Expand keywords based on vote-weighted keywords and design brief
     * 
     * @param {Object} data - Object containing Subject matter, Action & pose, Theme & mood, and Brief
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Expanded keywords with structure {Broader: {...}, More Specific: {...}}
     */
    async expandKeywords(data, options = {}) {
        const startTime = Date.now();
        this.log("info", "keyword_expansion_started", {
            dataKeys: Object.keys(data),
            model: this.config.keywordExpansionModel,
        });
        
        try {
            const result = await this.makeRequest(data);
            
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log("info", "keyword_expansion_completed", {
                duration: `${elapsedSeconds}s`,
                broaderCount: this.countKeywords(result.Broader),
                specificCount: this.countKeywords(result["More Specific"]),
            });
            
            return result;
        } catch (error) {
            const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
            this.log("error", "keyword_expansion_failed", {
                error: error.message,
                duration: `${elapsedSeconds}s`,
            });
            throw error;
        }
    }
    
    /**
     * Count total keywords across all subcategories
     * 
     * @param {Object} category - Category object with subcategories
     * @returns {number} - Total count
     */
    countKeywords(category) {
        if (!category) return 0;
        return (
            (category["Subject matter"]?.length || 0) +
            (category["Action & pose"]?.length || 0) +
            (category["Theme & mood"]?.length || 0)
        );
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
     * Make request to Ollama API for keyword expansion
     * 
     * @param {Object} data - The input data with keywords and brief
     * @returns {Promise<Object>} - Expanded keywords
     */
    async makeRequest(data) {
        const requestStartTime = Date.now();
        
        const userPrompt = `Expand these keywords based on the design brief:\n\n${JSON.stringify(data, null, 2)}\n\nRespond with ONLY valid JSON, no additional text or markdown formatting.`;
        
        this.log("info", "expansion_request_prepared", {
            dataKeys: Object.keys(data),
            endpoint: this.endpoint,
        });
        
        // Prepare payload
        const payload = {
            model: this.config.keywordExpansionModel,
            prompt: userPrompt,
            system: this.systemPrompt,
            stream: false,
            temperature: 0.8, // Higher temperature for more creative expansion
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
            this.log("info", "expansion_response_received", {
                status: response.status,
                duration: `${requestDuration}s`,
            });
            
            const responseData = response.data;
            const responseText = responseData.response || responseData.text || "";
            
            if (!responseText) {
                this.log("error", "empty_response", { responseData });
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
            this.validateExpansionResult(result);
            
            return result;
        } catch (error) {
            const requestDuration = ((Date.now() - requestStartTime) / 1000).toFixed(2);
            this.log("error", "expansion_request_failed", {
                duration: `${requestDuration}s`,
                error: error.message,
            });
            
            if (error.code === 'ECONNABORTED') {
                throw new Error("Expansion request timed out. The model may be overloaded.");
            }
            
            if (error.response) {
                this.log("error", "llm_api_error", {
                    status: error.response.status,
                    statusText: error.response.statusText,
                });
                throw new Error(`LLM API error: ${error.response.status} ${error.response.statusText}`);
            }
            
            throw new Error(`Failed to expand keywords: ${error.message}`);
        }
    }
    
    /**
     * Validate the expansion result structure
     * 
     * @param {Object} result - The result to validate
     * @throws {Error} If structure is invalid
     */
    validateExpansionResult(result) {
        const requiredTopLevelKeys = ["Broader", "More Specific"];
        
        for (const key of requiredTopLevelKeys) {
            if (!result.hasOwnProperty(key)) {
                throw new Error(`Missing required top-level key: "${key}"`);
            }
            
            if (!result[key] || typeof result[key] !== 'object') {
                throw new Error(`"${key}" must be an object, got ${typeof result[key]}`);
            }
            
            const requiredSubKeys = ["Subject matter", "Action & pose", "Theme & mood"];
            for (const subKey of requiredSubKeys) {
                if (!result[key].hasOwnProperty(subKey)) {
                    throw new Error(`Missing required sub-key: "${subKey}" in "${key}"`);
                }
                
                if (!Array.isArray(result[key][subKey])) {
                    throw new Error(`"${key}.${subKey}" must be an array, got ${typeof result[key][subKey]}`);
                }
            }
        }
    }
}

/**
 * Backward compatibility: Export a function that creates an instance and calls expandKeywords
 * This maintains compatibility with existing imports
 */
const providerInstance = new KeywordExpansionProvider(KEYWORD_EXPANSION_CONFIG);

export async function expandKeywordsFromData(data) {
    return await providerInstance.expandKeywords(data);
}
