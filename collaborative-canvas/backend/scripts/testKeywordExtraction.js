#!/usr/bin/env node

import { extractKeywords, extractKeywordsBatch, healthCheck, getKeywordExtractionProviderInfo } from "../services/keywordExtraction/index.js";

/**
 * Example script for testing keyword extraction with Llama 3.1:8b
 * 
 * Usage:
 *   node scripts/testKeywordExtraction.js
 *   node scripts/testKeywordExtraction.js "Your custom caption here"
 */

async function runDemo() {
    try {
        console.log("=== Keyword Extraction Health Check ===\n");
        
        const isHealthy = await healthCheck();
        if (!isHealthy) {
            console.error("❌ Provider is not healthy. Make sure Ollama is running on http://localhost:11434");
            process.exit(1);
        }
        console.log("✅ Provider is healthy\n");
        
        const providerInfo = getKeywordExtractionProviderInfo();
        console.log("Provider Info:", providerInfo);
        console.log("\n=== Single Caption Extraction ===\n");
        
        // Test with provided caption or use examples
        const customCaption = process.argv[2];
        
        if (customCaption) {
            console.log(`Caption: "${customCaption}"\n`);
            const result = await extractKeywords(customCaption);
            console.log("Extracted Keywords:");
            console.log(JSON.stringify(result, null, 2));
        } else {
            // Run example extractions
            const examples = [
                "An old man is reading a book at a kitchen table. Mountains are covered in snow under a cloudy sky. A dog is lying casually beside a fireplace.",
                "A firefighter sprays water on a burning house. A crowd watches a parade from the sidewalk. A boy rides a bicycle through the rain.",
            ];
            
            for (const caption of examples) {
                console.log(`Caption: "${caption.substring(0, 80)}..."\n`);
                const result = await extractKeywords(caption);
                console.log("Extracted Keywords:");
                console.log(JSON.stringify(result, null, 2));
                console.log("\n---\n");
            }
        }
        
        console.log("\n=== Batch Caption Extraction ===\n");
        
        const batchExamples = [
            "A painting of a stone cottage surrounded by lavender fields.",
            "An image of a lighthouse on a cliff overlooking the sea.",
            "A sketch of a bridge crossing a quiet river in autumn.",
        ];
        
        console.log(`Processing ${batchExamples.length} captions...\n`);
        const batchResults = await extractKeywordsBatch(batchExamples);
        
        batchResults.forEach((result, index) => {
            console.log(`Result ${index + 1}:`);
            console.log(JSON.stringify(result, null, 2));
            console.log();
        });
        
        console.log("✅ Extraction completed successfully!");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

runDemo();
