import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { getCaption, getCaptions, getCaptionProviderInfo, healthCheck } from "../src/services/captioning/index.js";
import { LOCAL_AI_CONFIG } from "../src/services/ai/config.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test script for image captioning.
 * Usage: node scripts/testCaption.js <path-to-image> [path-to-image-2] ...
 * 
 * This script:
 * 1. Loads images from the provided paths
 * 2. Sends them through the local captioning pipeline (uses getCaption/getCaptions from backend)
 * 3. Prints the caption results in the terminal
 * 4. Bypasses the frontend entirely
 * 5. Only tests image captioning
 * 6. Supports both single and batched testing
 * 7. Supports multiple Ollama models (qwen2.5vl:7b, moondream, etc.)
 */
async function testCaptioning(imagePaths) {
    const startTime = Date.now();
    
    try {
        console.log("=================================================");
        console.log("Image Captioning Test");
        console.log("=================================================");
        console.log(`Image paths: ${imagePaths.length} image(s)`);
        console.log(`LOCAL_MODE: ${process.env.LOCAL_MODE || "false"}`);
        
        // Get provider info
        const providerInfo = getCaptionProviderInfo();
        console.log(`Provider: ${providerInfo.provider}`);
        console.log(`Model: ${providerInfo.model}`);
        console.log(`Prompt: ${LOCAL_AI_CONFIG.captionPrompt}`);
        console.log(`Base URL: ${providerInfo.baseUrl || "N/A"}`);
        console.log("=================================================\n");

        // Resolve image paths and load buffers
        const imageBuffers = [];
        for (const imagePath of imagePaths) {
            const resolvedPath = path.resolve(process.cwd(), imagePath);
            
            if (!fs.existsSync(resolvedPath)) {
                console.error(`Error: Image file not found at ${resolvedPath}`);
                process.exit(1);
            }

            const imageBuffer = fs.readFileSync(resolvedPath);
            const imageSizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
            
            // Get image dimensions
            const metadata = await sharp(imageBuffer).metadata();
            const dimensions = `${metadata.width}x${metadata.height}`;
            
            console.log(`Loaded: ${imagePath} (${imageSizeMB} MB, ${dimensions})`);
            imageBuffers.push(imageBuffer);
        }
        
        console.log(`\nTotal image size: ${(imageBuffers.reduce((sum, buf) => sum + buf.length, 0) / (1024 * 1024)).toFixed(2)} MB\n`);

        // Health check
        console.log("Running health check...");
        const isHealthy = await healthCheck();
        console.log(`Health check: ${isHealthy ? "PASSED" : "FAILED"}\n`);

        // Get captions
        if (imageBuffers.length === 1) {
            console.log("Generating single caption...");
            const caption = await getCaption(imageBuffers[0]);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            console.log("\n=================================================");
            console.log("RESULT");
            console.log("=================================================");
            console.log(`Provider: ${providerInfo.provider}`);
            console.log(`Model: ${providerInfo.model}`);
            console.log(`Prompt: ${LOCAL_AI_CONFIG.captionPrompt}`);
            console.log(`Caption: ${caption}`);
            console.log(`Total time: ${duration}s`);
            console.log("=================================================\n");
            console.log("Benchmarking Metrics:");
            console.log(`- Inference duration: ${duration}s`);
            console.log(`- Image size: ${(imageBuffers[0].length / (1024 * 1024)).toFixed(2)} MB`);
            console.log("=================================================\n");
        } else {
            console.log(`Generating batched captions (${imageBuffers.length} images)...`);
            const captions = await getCaptions(imageBuffers);
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const successfulCount = captions.filter(c => c !== null).length;

            console.log("\n=================================================");
            console.log("BATCH RESULT");
            console.log("=================================================");
            console.log(`Provider: ${providerInfo.provider}`);
            console.log(`Model: ${providerInfo.model}`);
            console.log(`Prompt: ${LOCAL_AI_CONFIG.captionPrompt}`);
            console.log(`Batch size: ${imageBuffers.length}`);
            console.log(`Successful: ${successfulCount}/${imageBuffers.length}`);
            console.log(`Total time: ${duration}s`);
            console.log(`Avg time per image: ${(duration / imageBuffers.length).toFixed(2)}s`);
            console.log("-------------------------------------------------");
            
            captions.forEach((caption, index) => {
                console.log(`Image ${index + 1}: ${caption || "FAILED"}`);
            });
            
            console.log("=================================================\n");
        }

        process.exit(0);
    } catch (error) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error("\n=================================================");
        console.error("ERROR");
        console.error("=================================================");
        console.error(`Error: ${error.message}`);
        console.error(`Time elapsed: ${duration}s`);
        console.error("=================================================\n");
        process.exit(1);
    }
}

// Get image paths from command line arguments
const imagePaths = process.argv.slice(2);

if (imagePaths.length === 0) {
    console.error("Usage: node scripts/testCaption.js <path-to-image> [path-to-image-2] ...");
    console.error("Example (single): node scripts/testCaption.js test-image.png");
    console.error("Example (batch): node scripts/testCaption.js image1.png image2.png image3.png");
    process.exit(1);
}

testCaptioning(imagePaths);
