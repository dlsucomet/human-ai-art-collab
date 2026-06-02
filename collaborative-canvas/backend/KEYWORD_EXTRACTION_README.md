# Caption Keyword Extraction System

Complete JavaScript implementation for extracting structured keywords from image captions using **Llama 3.1:8b** via Ollama.

## 📋 Quick Summary

Created a production-ready keyword extraction system that:
- ✅ Extracts **Subject matter**, **Action & pose**, and **Theme & mood** from captions
- ✅ Uses **Llama 3.1:8b** model for local, private inference
- ✅ Follows the same architecture as existing Ollama integration
- ✅ Queue-safe sequential processing to prevent GPU overload
- ✅ Comprehensive error handling and validation
- ✅ Structured logging with performance metrics
- ✅ Ready for immediate integration

## 📦 Files Created

| File | Purpose | Size |
|------|---------|------|
| `backend/src/services/keywordExtraction/keywordExtractionProvider.js` | Core provider implementation | 13.2 KB |
| `backend/src/services/keywordExtraction/index.js` | Public API entry point | 2.4 KB |
| `backend/src/services/ai/config.js` | Configuration (updated) | +90 lines |
| `backend/scripts/testKeywordExtraction.js` | Test/demo script | 3.1 KB |
| `backend/src/examples/keywordExtractionExamples.js` | Integration examples | 10.8 KB |
| `backend/KEYWORD_EXTRACTION_SETUP.md` | Setup documentation | 9.7 KB |

## 🚀 Quick Start

### 1. Install & Configure

```bash
# Install Ollama from https://ollama.com

# Start Ollama
ollama serve

# In another terminal, pull the model
ollama pull llama3.1:8b

# Configure backend/.env
echo "LOCAL_AI_KEYWORD_EXTRACTION_MODEL=llama3.1:8b" >> .env
```

### 2. Test It

```bash
cd collaborative-canvas/backend
node scripts/testKeywordExtraction.js
```

### 3. Use It

```javascript
import { extractKeywords } from "./services/keywordExtraction/index.js";

const result = await extractKeywords("An old man reading a book at a kitchen table.");
// Returns:
// {
//   "Subject matter": ["old man", "book", "kitchen table"],
//   "Action & pose": ["reading a book"],
//   "Theme & mood": ["cozy"]
// }
```

## 📖 Usage Examples

### Single Extraction
```javascript
import { extractKeywords } from "./services/keywordExtraction/index.js";

const keywords = await extractKeywords("A dog is lying on a beach.");
```

### Batch Processing
```javascript
import { extractKeywordsBatch } from "./services/keywordExtraction/index.js";

const captions = ["Caption 1", "Caption 2", "Caption 3"];
const results = await extractKeywordsBatch(captions);
```

### API Endpoint
```javascript
import keywordRoutes from "./routes/keywords.js";
app.use("/api/keywords", keywordRoutes);

// POST /api/keywords/extract
// { "caption": "Your caption here" }
```

### With Image Processing
```javascript
import { getCaption } from "./services/captioning/index.js";
import { extractKeywords } from "./services/keywordExtraction/index.js";

const caption = await getCaption(imageBuffer);
const keywords = await extractKeywords(caption);
```

## 🎯 Extraction Categories

### Subject Matter
Specific, visually identifiable nouns/phrases
- Examples: "old man", "book", "kitchen table", "red and orange background"
- Never empty

### Action & Pose
Clearly implied actions or poses
- Examples: "reading a book", "lying casually", "riding a bicycle"
- Can be empty

### Theme & Mood
Overall emotion, setting, or cultural context
- Examples: "cozy", "serene", "urgent", "lively"
- Never empty

## ⚙️ Configuration

### Environment Variables

```env
LOCAL_AI_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://localhost:11434
LOCAL_AI_KEYWORD_EXTRACTION_MODEL=llama3.1:8b
LOCAL_AI_EXTRACTION_TIMEOUT=300000
```

### Settings

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCAL_AI_PROVIDER` | `ollama` | AI provider type |
| `LOCAL_AI_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `LOCAL_AI_KEYWORD_EXTRACTION_MODEL` | `llama3.1:8b` | Model for extraction |
| `LOCAL_AI_EXTRACTION_TIMEOUT` | `300000` (5 min) | Request timeout |

## 🏗️ Architecture

```
API Request
    ↓
keywordExtraction/index.js (Public API)
    ↓
KeywordExtractionProvider (extends BaseAIProvider)
    ↓
config.js (Centralized configuration)
    ↓
Ollama HTTP API
    ↓
Llama 3.1:8b Model
    ↓
JSON Response → Validation → Return
```

### Design Highlights

- **Extensible**: Easy to swap Ollama ↔ vLLM ↔ OpenAI
- **Queue-safe**: Sequential processing prevents GPU overload
- **Validated**: JSON schema validation ensures correct output
- **Observable**: Structured logging with timestamps and metrics
- **Error-resilient**: Graceful fallbacks for batch operations

## 📊 Performance

| Metric | Value |
|--------|-------|
| Single extraction | ~5-15 seconds |
| Model size | ~8GB RAM |
| Download size | ~5GB |
| Temperature (for consistency) | 0.3 |

## 📚 Documentation

Comprehensive guides included:

1. **KEYWORD_EXTRACTION_SETUP.md** — Complete setup instructions
2. **keywordExtractionExamples.js** — 8 integration examples
3. **Inline code comments** — Detailed JSDoc documentation
4. **Test script** — Runnable examples

## ✅ Testing

```bash
# Quick test with examples
node scripts/testKeywordExtraction.js

# Test with custom caption
node scripts/testKeywordExtraction.js "Your caption here"

# Expected output
{
  "Subject matter": [...],
  "Action & pose": [...],
  "Theme & mood": [...]
}
```

## 🔗 Integration Points

### With Existing Captioning System

```javascript
// Current: Image → Caption
// New: Image → Caption → Keywords → Store

import { getCaption } from "./services/captioning/index.js";
import { extractKeywords } from "./services/keywordExtraction/index.js";

const caption = await getCaption(imageBuffer);
const keywords = await extractKeywords(caption);

db.saveImage({ caption, keywords });
```

### As Express Routes

```javascript
import keywordRoutes from "./src/examples/keywordExtractionExamples.js";
app.use("/api/keywords", keywordRoutes);

// POST /api/keywords/extract
// POST /api/keywords/extract-batch
// GET /api/keywords/health
```

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Ollama not responding | Check `curl http://localhost:11434/api/tags` |
| Model not installed | Run `ollama pull llama3.1:8b` |
| Slow extraction | First run is slower; subsequent runs cache |
| Memory errors | Ensure 8GB+ RAM available |
| JSON parsing fails | Model included extra text; extraction handles this |

## 📝 Key Files Reference

### `keywordExtractionProvider.js`
Core implementation with:
- `KeywordExtractionProvider` class
- `extractKeywords()` — Single extraction
- `extractKeywordsBatch()` — Batch extraction
- `healthCheck()` — Service verification
- `makeRequest()` — Ollama API communication

### `index.js`
Public API with:
- `extractKeywords()` wrapper
- `extractKeywordsBatch()` wrapper
- `healthCheck()` function
- `getKeywordExtractionProviderInfo()` function

### `testKeywordExtraction.js`
Executable test script with:
- Health check
- Single extraction demo
- Batch extraction demo
- Custom caption support

### `keywordExtractionExamples.js`
8 integration examples:
1. Simple API endpoint
2. Image upload with keywords
3. Batch processing with progress
4. Retry logic
5. Response formatting
6. Validation
7. Complete workflow
8. Local testing

## 🌟 Features

✅ **Local Processing** — All inference runs on-device  
✅ **Privacy** — No cloud APIs or external services  
✅ **Fast** — Llama 3.1:8b is optimized for text extraction  
✅ **Accurate** — Model specifically good at categorization  
✅ **Queue-Safe** — Sequential processing prevents GPU overload  
✅ **Validated** — JSON schema validation ensures correctness  
✅ **Observable** — Structured logging for debugging  
✅ **Extensible** — Easy to add other models/providers  

## 📋 Prompt Specification

The system prompt includes:
- Clear category definitions
- Processing steps
- Output format specification
- 3 detailed examples
- Validation rules

All based on your exact specification.

## 🎓 Next Steps

1. **Install**: Follow quick start section
2. **Test**: Run `testKeywordExtraction.js`
3. **Integrate**: Use examples from `keywordExtractionExamples.js`
4. **Monitor**: Check logs for performance/errors
5. **Extend**: Add custom logic as needed

## 📞 Support

For issues:
1. Check **KEYWORD_EXTRACTION_SETUP.md** troubleshooting section
2. Verify Ollama is running and model is installed
3. Check `.env` configuration
4. Review logs for error details
5. Run test script to verify setup

---

**Status**: ✅ Complete and ready to use

**Version**: 1.0.0

**Last Updated**: 2026-06-02
