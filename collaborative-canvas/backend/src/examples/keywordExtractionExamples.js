/**
 * Integration Examples for Keyword Extraction
 * 
 * This file shows various ways to integrate the keyword extraction system
 * into your application.
 */

// ============================================
// Example 1: Simple API Endpoint
// ============================================

import express from "express";
import { extractKeywords, extractKeywordsBatch, healthCheck } from "../services/keywordExtraction/index.js";

const router = express.Router();

/**
 * POST /api/keywords/extract
 * Extract keywords from a single caption
 */
router.post("/extract", async (req, res) => {
    try {
        const { caption } = req.body;
        
        if (!caption || typeof caption !== "string") {
            return res.status(400).json({ 
                error: "Caption must be a non-empty string" 
            });
        }
        
        const keywords = await extractKeywords(caption);
        res.json(keywords);
    } catch (error) {
        res.status(500).json({ 
            error: error.message 
        });
    }
});

/**
 * POST /api/keywords/extract-batch
 * Extract keywords from multiple captions
 */
router.post("/extract-batch", async (req, res) => {
    try {
        const { captions } = req.body;
        
        if (!Array.isArray(captions) || captions.length === 0) {
            return res.status(400).json({ 
                error: "Captions must be a non-empty array" 
            });
        }
        
        const results = await extractKeywordsBatch(captions);
        res.json(results);
    } catch (error) {
        res.status(500).json({ 
            error: error.message 
        });
    }
});

/**
 * GET /api/keywords/health
 * Check if keyword extraction service is available
 */
router.get("/health", async (req, res) => {
    try {
        const isHealthy = await healthCheck();
        res.json({ 
            healthy: isHealthy,
            message: isHealthy ? "Service is available" : "Service is unavailable"
        });
    } catch (error) {
        res.status(500).json({ 
            healthy: false,
            error: error.message 
        });
    }
});

export default router;

// ============================================
// Example 2: Image Upload with Keyword Extraction
// ============================================

import { getCaption } from "../services/captioning/index.js";

/**
 * Process image: Generate caption and extract keywords
 */
export async function processImageWithKeywords(imageBuffer) {
    try {
        // Step 1: Generate caption from image
        console.log("Generating caption...");
        const caption = await getCaption(imageBuffer);
        
        // Step 2: Extract keywords from caption
        console.log("Extracting keywords...");
        const keywords = await extractKeywords(caption);
        
        return {
            success: true,
            caption,
            keywords,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ============================================
// Example 3: Batch Processing with Progress
// ============================================

/**
 * Process multiple captions with progress tracking
 */
export async function processCaptionsWithProgress(captions, onProgress) {
    console.log(`Starting batch processing of ${captions.length} captions...`);
    
    const results = [];
    const totalBatches = Math.ceil(captions.length / 5);
    
    for (let i = 0; i < captions.length; i += 5) {
        const batch = captions.slice(i, i + 5);
        const batchResults = await extractKeywordsBatch(batch);
        results.push(...batchResults);
        
        const currentBatch = Math.ceil((i + batch.length) / 5);
        const progress = (currentBatch / totalBatches) * 100;
        
        if (onProgress) {
            onProgress({
                processed: i + batch.length,
                total: captions.length,
                percentage: progress.toFixed(0)
            });
        }
    }
    
    return results;
}

// ============================================
// Example 4: Error Handling and Retry Logic
// ============================================

/**
 * Extract keywords with automatic retry on failure
 */
export async function extractKeywordsWithRetry(caption, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Extraction attempt ${attempt}/${maxRetries}`);
            const result = await extractKeywords(caption);
            return result;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw new Error(`Failed to extract keywords after ${maxRetries} attempts: ${error.message}`);
            }
            
            const delayMs = Math.pow(2, attempt) * 1000;
            console.log(`Retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}

// ============================================
// Example 5: Response Formatting
// ============================================

/**
 * Format extraction results for API response
 */
export function formatKeywordResponse(keywords) {
    return {
        categories: {
            subjects: {
                label: "Subject Matter",
                items: keywords["Subject matter"],
                description: "Specific, visually identifiable elements"
            },
            actions: {
                label: "Actions & Poses",
                items: keywords["Action & pose"],
                description: "Movement or positioning of subjects",
                isEmpty: keywords["Action & pose"].length === 0
            },
            moods: {
                label: "Themes & Moods",
                items: keywords["Theme & mood"],
                description: "Overall emotion and atmosphere"
            }
        },
        summary: {
            totalKeywords: 
                keywords["Subject matter"].length +
                keywords["Action & pose"].length +
                keywords["Theme & mood"].length,
            hasActions: keywords["Action & pose"].length > 0
        }
    };
}

// ============================================
// Example 6: Validation
// ============================================

/**
 * Validate keywords before storage/return
 */
export function validateKeywords(keywords) {
    const errors = [];
    
    if (!keywords["Subject matter"]) {
        errors.push("Missing 'Subject matter'");
    }
    if (!keywords["Action & pose"]) {
        errors.push("Missing 'Action & pose'");
    }
    if (!keywords["Theme & mood"]) {
        errors.push("Missing 'Theme & mood'");
    }
    
    if (Array.isArray(keywords["Subject matter"]) && keywords["Subject matter"].length === 0) {
        errors.push("Subject matter cannot be empty");
    }
    
    if (Array.isArray(keywords["Theme & mood"]) && keywords["Theme & mood"].length === 0) {
        errors.push("Theme & mood cannot be empty");
    }
    
    for (const [category, items] of Object.entries(keywords)) {
        if (Array.isArray(items)) {
            items.forEach((item, idx) => {
                if (typeof item !== "string") {
                    errors.push(`${category}[${idx}] is not a string`);
                }
            });
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// ============================================
// Example 7: Complete Workflow
// ============================================

/**
 * Complete workflow: Image -> Caption -> Keywords -> Validation
 */
export async function completeImageProcessingWorkflow(imageBuffer) {
    const startTime = Date.now();
    
    try {
        console.log("Step 1: Generating caption...");
        const caption = await getCaption(imageBuffer);
        
        console.log("Step 2: Extracting keywords...");
        const keywords = await extractKeywords(caption);
        
        console.log("Step 3: Validating keywords...");
        const validation = validateKeywords(keywords);
        if (!validation.isValid) {
            throw new Error(`Invalid keywords: ${validation.errors.join(", ")}`);
        }
        
        console.log("Step 4: Formatting response...");
        const formattedResponse = formatKeywordResponse(keywords);
        
        const duration = Date.now() - startTime;
        return {
            success: true,
            caption,
            keywords: formattedResponse,
            duration: `${(duration / 1000).toFixed(2)}s`,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error("Workflow failed:", error);
        return {
            success: false,
            error: error.message,
            duration: `${(duration / 1000).toFixed(2)}s`,
            timestamp: new Date().toISOString()
        };
    }
}

// ============================================
// Example 8: Testing Keywords Locally
// ============================================

/**
 * Local testing function (for Node.js scripts)
 */
export async function testKeywordExtraction() {
    const testCaptions = [
        "An old man is reading a book at a kitchen table.",
        "A firefighter sprays water on a burning house.",
        "A painting of a stone cottage surrounded by lavender fields."
    ];
    
    console.log("=== Keyword Extraction Test ===\n");
    
    for (const caption of testCaptions) {
        console.log(`Caption: "${caption}"`);
        try {
            const keywords = await extractKeywords(caption);
            console.log("Keywords:", JSON.stringify(keywords, null, 2));
            console.log("\n---\n");
        } catch (error) {
            console.error("Error:", error.message);
            console.log("\n---\n");
        }
    }
}

// ============================================
// Example Usage in main.js or server.js
// ============================================

/*
import keywordRoutes from "./routes/keywords.js";

app.use("/api/keywords", keywordRoutes);

// Test endpoint
app.post("/api/test-processing", async (req, res) => {
    const { imageBuffer } = req.body;
    const result = await completeImageProcessingWorkflow(imageBuffer);
    res.json(result);
});
*/
