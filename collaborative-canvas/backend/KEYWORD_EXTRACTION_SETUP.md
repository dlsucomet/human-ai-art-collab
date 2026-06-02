# Keyword Extraction with Llama 3.1:8b

This guide explains how to use Llama 3.1:8b with the keyword extraction system to extract structured elements from image captions.

## Overview

The keyword extraction system takes image captions and extracts three key elements:
- **Subject matter**: Specific, visually identifiable nouns and noun phrases
- **Action & pose**: Clearly implied actions or poses
- **Theme & mood**: Overall emotion, setting, purpose, or cultural context

All inference runs locally using Ollama and Llama 3.1:8b.

## Prerequisites

- Ollama installed and running
- Llama 3.1:8b model downloaded
- Backend environment configured

## Setup

### 1. Ensure Ollama is Running

```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`

### 2. Pull the Llama 3.1:8b Model

```bash
ollama pull llama3.1:8b
```

This downloads the model (~4-5GB). The model is smaller than vision models, so inference is faster.

### 3. Verify the Model Works

```bash
ollama run llama3.1:8b "Hello, can you help extract keywords from captions?"
```

You should see a response from the model.

### 4. Configure Environment Variables

Add to your `.env` file in the backend directory:

```env
# Local AI Provider
LOCAL_AI_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://localhost:11434

# Keyword Extraction Configuration
LOCAL_AI_KEYWORD_EXTRACTION_MODEL=llama3.1:8b
LOCAL_AI_EXTRACTION_TIMEOUT=300000
```

## Usage

### Test Script

Run the test script to verify everything is working:

```bash
cd collaborative-canvas/backend
node scripts/testKeywordExtraction.js
```

### With Custom Caption

```bash
node scripts/testKeywordExtraction.js "Your caption text here"
```

### In Your Code

#### Single Caption

```javascript
import { extractKeywords } from "../services/keywordExtraction/index.js";

const caption = "A red and orange background with colorful objects.";
const result = await extractKeywords(caption);

console.log(result);
// Output:
// {
//   "Subject matter": ["red and orange background", "colorful objects"],
//   "Action & pose": [],
//   "Theme & mood": ["vibrant", "colorful"]
// }
```

#### Batch Processing

```javascript
import { extractKeywordsBatch } from "../services/keywordExtraction/index.js";

const captions = [
    "An old man is reading a book at a kitchen table.",
    "Mountains are covered in snow under a cloudy sky.",
    "A dog is lying casually beside a fireplace."
];

const results = await extractKeywordsBatch(captions);

results.forEach((result, index) => {
    console.log(`Caption ${index + 1}:`, result);
});
```

#### Health Check

```javascript
import { healthCheck, getKeywordExtractionProviderInfo } from "../services/keywordExtraction/index.js";

const isHealthy = await healthCheck();
console.log("Provider healthy:", isHealthy);

const info = getKeywordExtractionProviderInfo();
console.log("Provider info:", info);
// Output: { provider: "ollama", baseUrl: "http://localhost:11434", model: "llama3.1:8b" }
```

## Architecture

### File Structure

```
backend/src/services/keywordExtraction/
├── index.js                      # Main API entry point
└── keywordExtractionProvider.js   # Provider implementation

backend/src/services/ai/
├── config.js                     # Configuration management
└── baseProvider.js               # Abstract base class

backend/scripts/
└── testKeywordExtraction.js       # Test/demo script
```

### Data Flow

```
Caption
  ↓
extractKeywords()
  ↓
KeywordExtractionProvider.extractKeywords()
  ↓
makeRequest()
  ↓
Llama 3.1:8b (via Ollama)
  ↓
JSON Response
  ↓
validateExtractionResult()
  ↓
{Subject matter: [], Action & pose: [], Theme & mood: []}
```

### Key Features

✅ **Sequential Processing** — Queue-safe batch processing to avoid GPU overload  
✅ **Error Handling** — Graceful fallback for failed extractions  
✅ **Structured Logging** — Timestamps, performance metrics, error tracking  
✅ **Health Checks** — Verify Ollama availability before processing  
✅ **Configuration** — Environment-based configuration for easy switching  
✅ **Validation** — Result schema validation to ensure correct output format  

## Configuration Options

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCAL_AI_PROVIDER` | `ollama` | AI provider type |
| `LOCAL_AI_BASE_URL` | `http://localhost:11434` | Ollama server endpoint |
| `LOCAL_AI_KEYWORD_EXTRACTION_MODEL` | `llama3.1:8b` | Llama model for keyword extraction |
| `LOCAL_AI_EXTRACTION_TIMEOUT` | `300000` | Request timeout in milliseconds (5 min) |

## Troubleshooting

### Ollama not responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
# macOS/Linux: Stop and run `ollama serve` again
# Windows: Restart Ollama service
```

### Model not found

```bash
# Verify the model is installed
ollama list

# Re-pull the model
ollama pull llama3.1:8b
```

### Extraction taking too long

- Llama 3.1:8b inference is slower than GPT
- First run may be slower due to model loading
- Consider using a smaller model if needed: `ollama pull llama3.1:3.2b` (not recommended for extraction tasks)

### Memory issues

- Llama 3.1:8b requires ~8GB RAM
- If you're running other processes, ensure sufficient memory is available
- Check system resource usage during extraction

### JSON parsing errors

- The model might include extra text besides JSON
- The extraction logic attempts to extract JSON from the response
- If still failing, check the model's response format

## Output Format

All keyword extraction returns a standardized JSON object:

```json
{
  "Subject matter": ["item1", "item2", "phrase3"],
  "Action & pose": ["action1", "action2"],
  "Theme & mood": ["mood1", "mood2"]
}
```

### Validation Rules

- **Subject matter**: Never empty (must have at least one item)
- **Action & pose**: Can be empty if no actions detected
- **Theme & mood**: Never empty (must have at least one item)

## Performance Tips

1. **Batch Processing**: Use `extractKeywordsBatch()` for multiple captions — sequential processing is queue-safe and prevents GPU overload
2. **Timeouts**: Adjust `LOCAL_AI_EXTRACTION_TIMEOUT` if you have long captions
3. **Model Selection**: Llama 3.1:8b is recommended; smaller models may not extract as accurately

## Switching Models

To use a different Llama model:

1. Pull the model:
   ```bash
   ollama pull llama3.1:70b
   ```

2. Update `.env`:
   ```env
   LOCAL_AI_KEYWORD_EXTRACTION_MODEL=llama3.1:70b
   ```

3. Restart your backend

## API Reference

### `extractKeywords(caption: string): Promise<Object>`

Extract keywords from a single caption.

**Parameters:**
- `caption` (string): The caption text to extract keywords from

**Returns:** Promise that resolves to extracted keywords object

**Throws:** Error if extraction fails

---

### `extractKeywordsBatch(captions: string[], options?: Object): Promise<Object[]>`

Extract keywords from multiple captions with queue-safe sequential processing.

**Parameters:**
- `captions` (string[]): Array of caption strings
- `options` (Object, optional): Additional options

**Returns:** Promise that resolves to array of extracted keywords objects

**Throws:** Error if batch processing fails (individual items won't throw)

---

### `healthCheck(): Promise<boolean>`

Verify the keyword extraction provider is available and healthy.

**Returns:** Promise that resolves to boolean indicating health status

---

### `getKeywordExtractionProviderInfo(): Object`

Get information about the current keyword extraction provider.

**Returns:** Object with `{ provider, baseUrl, model }`

## Examples

### Example 1: Extract from single caption

```javascript
import { extractKeywords } from "../services/keywordExtraction/index.js";

const caption = "An old man is reading a book at a kitchen table.";
const keywords = await extractKeywords(caption);

console.log(keywords);
/*
{
  "Subject matter": ["old man", "book", "kitchen table"],
  "Action & pose": ["reading a book"],
  "Theme & mood": ["cozy"]
}
*/
```

### Example 2: Extract from multiple captions

```javascript
import { extractKeywordsBatch } from "../services/keywordExtraction/index.js";

const captions = [
    "A stone cottage surrounded by lavender fields.",
    "A lighthouse on a cliff overlooking the sea."
];

const allKeywords = await extractKeywordsBatch(captions);

allKeywords.forEach((keywords, idx) => {
    console.log(`Caption ${idx + 1}:`, keywords);
});
```

### Example 3: Integrate with image upload flow

```javascript
import { extractKeywords } from "../services/keywordExtraction/index.js";
import { getCaption } from "../services/captioning/index.js";

async function processImage(imageBuffer) {
    // First, generate caption
    const caption = await getCaption(imageBuffer);
    
    // Then extract keywords from caption
    const keywords = await extractKeywords(caption);
    
    // Store both caption and keywords
    return {
        caption,
        keywords
    };
}
```

## Notes

- The keyword extraction system uses the system prompt extensively for accurate extraction
- Temperature is set to 0.3 (low randomness) for consistent results
- All responses are validated against the expected schema before returning
- Error handling allows batch operations to continue even if individual items fail
