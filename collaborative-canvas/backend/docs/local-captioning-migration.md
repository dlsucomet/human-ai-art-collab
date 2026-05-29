# Local Image Captioning Migration Notes

## Overview

This document describes the refactoring of the local image captioning system to align with the NURA Local AI Architecture. The migration focuses on improving provider abstraction, preparing for vLLM migration, adding batched captioning support, and implementing queue-safe inference.

## Architecture Overview

### Old Architecture

```
backend/src/utils/imageCaptioning.js
    ↓
backend/src/services/captioning/
    ├── geminiProvider.js (Google Gemini)
    ├── qwenProvider.js (Ollama - hardcoded)
    └── index.js (provider selector)
```

**Issues:**
- Provider-specific logic scattered across files
- Hardcoded configuration
- No abstraction for provider switching
- No batched operations support
- No concurrency control
- Vendor lock-in to Ollama

### New Architecture

```
backend/src/utils/imageCaptioning.js
    ↓
backend/src/services/captioning/
    ├── geminiProvider.js (Google Gemini)
    ├── qwenProvider.js (Ollama - extends BaseAIProvider)
    └── index.js (provider selector + batched operations)
        ↓
backend/src/services/ai/
    ├── config.js (centralized configuration)
    ├── baseProvider.js (abstract base class)
    ├── aiProvider.js (provider factory)
    └── concurrency.js (concurrency control)
```

**Improvements:**
- Centralized configuration in `config.js`
- Abstract base class defines provider interface
- Provider factory enables easy switching
- Batched operations support
- Concurrency control for queue-safe inference
- Prepared for vLLM migration

## Provider Architecture

### BaseAIProvider

Abstract base class that defines the interface all providers must implement:

```javascript
class BaseAIProvider {
    constructor(config)
    async generateCaption(imageBuffer, options)
    async generateCaptions(imageBuffers, options)
    async healthCheck()
    getProviderInfo()
    log(level, event, data)
    measureDuration(operation, fn)
}
```

**Benefits:**
- Standardizes provider interface
- Enables provider swapping without changing business logic
- Provides structured logging hooks
- Enables easy testing and mocking

### OllamaProvider

Implements BaseAIProvider for Ollama:

```javascript
class OllamaProvider extends BaseAIProvider {
    constructor(config)
    async generateCaption(imageBuffer, options)
    async generateCaptions(imageBuffers, options) // Sequential processing
    async healthCheck()
    async preprocessImage(imageBuffer)
    async makeRequest(imageBuffer)
}
```

**Key Features:**
- Transport layer isolated in `makeRequest()`
- Image preprocessing centralized in `preprocessImage()`
- Sequential batch processing (queue-safe)
- Structured logging via base class

### Provider Factory

`aiProvider.js` provides a factory for creating provider instances:

```javascript
getAIProvider()           // Get current provider
getProviderByName(name)   // Get specific provider
registerProvider(name, ProviderClass)  // Register custom provider
validateAIConfiguration() // Validate config
getProviderInfo()         // Get provider metadata
```

**Benefits:**
- Centralized provider instantiation
- Configuration-driven provider selection
- Singleton pattern for instance reuse
- Dynamic provider registration

## Ollama Integration

### Configuration

Environment variables (in `config.js`):

```env
LOCAL_AI_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://localhost:11434
OLLAMA_CAPTION_MODEL=qwen2.5vl:7b
LOCAL_AI_TIMEOUT=600000
LOCAL_AI_MAX_IMAGE_DIMENSION=1024
LOCAL_AI_JPEG_QUALITY=80
LOCAL_AI_MAX_CONCURRENT=1
LOCAL_AI_ENABLE_BATCHING=false
LOCAL_AI_BATCH_SIZE=4
```

### Request Flow

1. **Image Preprocessing**
   - Read image metadata
   - Resize if > 1024px
   - Preserve aspect ratio
   - Compress to JPEG (quality 80)
   - Fallback to original if fails

2. **Base64 Encoding**
   - Convert optimized buffer to base64
   - Log encoding size

3. **Ollama Request**
   - POST to `/api/generate`
   - Payload: `{ model, prompt, images: [base64], stream: false }`
   - Timeout: 10 minutes
   - Axios with unlimited body/content length

4. **Response Parsing**
   - Extract caption from `data.response` or `data.text`
   - Trim whitespace
   - Validate non-empty

### Endpoint Configuration

Provider-specific endpoints defined in `config.js`:

```javascript
const PROVIDER_ENDPOINTS = {
    ollama: {
        generate: "/api/generate",
        chat: "/api/chat",
        tags: "/api/tags",
    },
    vllm: {
        chatCompletions: "/v1/chat/completions",
        completions: "/v1/completions",
        models: "/v1/models",
    },
};
```

## Preprocessing Pipeline

### Image Optimization

```javascript
async preprocessImage(imageBuffer) {
    // Get metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Check if resize needed
    if (width <= 1024 && height <= 1024) {
        // Just compress to JPEG
        return sharp(imageBuffer).jpeg({ quality: 80 }).toBuffer();
    }
    
    // Calculate new dimensions (preserve aspect ratio)
    // Resize to max 1024px
    // Compress to JPEG (quality 80)
}
```

**Benefits:**
- Reduces payload size
- Faster inference
- Lower memory usage
- Consistent format

### Logging

Structured logs at each stage:

```javascript
[captioning] Image preprocessing started: { originalSize, dimensions }
[captioning] Image resizing: { from, to }
[captioning] Image preprocessing completed: { optimizedSize, duration }
[captioning] Ollama request prepared: { base64Size, endpoint }
[captioning] Ollama response received: { status, duration }
[captioning] Response parsing: { dataSize }
[captioning] Caption request completed: { caption, duration }
```

## Batching Preparation

### Single Image Captioning

```javascript
export async function getCaption(imageBlob) {
    const localMode = process.env.LOCAL_MODE === "true";
    
    if (localMode) {
        return await getQwenCaption(imageBlob);
    } else {
        return await getGeminiCaption(imageBlob);
    }
}
```

### Batched Image Captioning

```javascript
export async function getCaptions(imageBlobs, options = {}) {
    const localMode = process.env.LOCAL_MODE === "true";
    
    if (localMode) {
        return await getLocalCaptions(imageBlobs, options); // Sequential
    } else {
        return await getCloudCaptions(imageBlobs, options); // Parallel
    }
}
```

**Local Processing (Queue-Safe):**
- Sequential processing via `OllamaProvider.generateCaptions()`
- Prevents GPU overload
- Prevents OOM failures
- Prepared for BullMQ integration

**Cloud Processing (Parallel):**
- Parallel processing via `Promise.all()`
- Safe due to cloud rate limiting
- Better performance

## Queue-Safe Preparation

### Concurrency Control

`concurrency.js` provides:

```javascript
class ConcurrencyController {
    async execute(fn, options)           // Execute with concurrency limit
    async executeSequential(fn, options) // Queue-safe sequential
    async executeBatch(fns, options)      // Batched execution
    getStats()                           // Concurrency statistics
}
```

**Features:**
- Semaphore pattern for concurrency limiting
- Request queue for sequential processing
- Optional batching with configurable batch size
- Request lifecycle tracking
- Structured logging

**Configuration:**
```env
LOCAL_AI_MAX_CONCURRENT=1          # Default: sequential
LOCAL_AI_ENABLE_BATCHING=false     # Disable batching
LOCAL_AI_BATCH_SIZE=4              # Batch size if enabled
```

### Request Lifecycle

```
Request Queued → Waiting for Slot → Request Started → Request Completed
                        ↓
                  Slot Released
```

**Logging:**
```
[concurrency] request_queued: { requestId }
[concurrency] request_started: { requestId }
[concurrency] request_completed: { requestId }
[concurrency] request_failed: { requestId, error }
```

## Future vLLM Migration Path

### Current State

- Ollama provider implemented
- Configuration centralized
- Provider abstraction in place
- Endpoint configuration flexible

### Migration Steps

1. **Create VLLMProvider class**
   ```javascript
   class VLLMProvider extends BaseAIProvider {
       constructor(config)
       async generateCaption(imageBuffer, options)
       async generateCaptions(imageBuffers, options)
       async healthCheck()
       async preprocessImage(imageBuffer) // Reuse from OllamaProvider
       async makeRequest(imageBuffer)     // Implement for vLLM
   }
   ```

2. **Register VLLMProvider**
   ```javascript
   import { VLLMProvider } from "./vllmProvider.js";
   registerProvider("vllm", VLLMProvider);
   ```

3. **Update configuration**
   ```env
   LOCAL_AI_PROVIDER=vllm
   LOCAL_AI_BASE_URL=http://localhost:8000
   OLLAMA_CAPTION_MODEL=qwen2.5-vl-7b
   ```

4. **Test and validate**

**Benefits of this approach:**
- Minimal code changes
- No business logic changes
- Easy rollback to Ollama
- Both providers can coexist

### vLLM Request Format

vLLM uses OpenAI-compatible API:

```javascript
POST /v1/chat/completions
{
    model: "qwen2.5-vl-7b",
    messages: [
        {
            role: "user",
            content: [
                { type: "text", text: "Describe this image..." },
                { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
            ]
        }
    ],
    max_tokens: 100
}
```

## Current Limitations

### Functionality

1. **No actual BullMQ integration**
   - Concurrency control is in-memory
   - No persistent queue
   - No retry logic
   - No dead letter queue

2. **Limited concurrency features**
   - No priority queue
   - No request cancellation
   - No timeout enforcement
   - No request prioritization

3. **Batch processing limitations**
   - Sequential only for local providers
   - No progress reporting
   - No partial failure handling
   - No retry for failed items

### Scalability

1. **Single-instance concurrency control**
   - In-memory queue lost on restart
   - No distributed coordination
   - No horizontal scaling support

2. **No request pooling**
   - New provider instance per request
   - No connection reuse
   - Higher overhead

### Observability

1. **Basic logging only**
   - No metrics collection
   - No distributed tracing
   - No alerting
   - No dashboard

## Recommended Next Steps

### Short Term

1. **Add metrics collection**
   - Request latency
   - Success/failure rates
   - Queue depth
   - GPU utilization

2. **Improve error handling**
   - Retry logic with exponential backoff
   - Circuit breaker pattern
   - Graceful degradation

3. **Add request pooling**
   - Reuse provider instances
   - Connection pooling
   - Reduce overhead

### Medium Term

1. **Implement BullMQ integration**
   - Persistent queue
   - Retry logic
   - Dead letter queue
   - Job priorities

2. **Add distributed coordination**
   - Redis for shared state
   - Distributed locking
   - Horizontal scaling

3. **Improve observability**
   - Prometheus metrics
   - Grafana dashboard
   - Alerting rules

### Long Term

1. **Complete vLLM migration**
   - Implement VLLMProvider
   - Benchmark performance
   - Migrate production workloads

2. **Multi-provider support**
   - A/B testing
   - Automatic failover
   - Load balancing

3. **Advanced features**
   - Model versioning
   - A/B testing
   - Feature flags

## Environment Variables Reference

### Local AI Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCAL_AI_PROVIDER` | `ollama` | Provider type (ollama, vllm, openai-compatible) |
| `LOCAL_AI_BASE_URL` | `http://localhost:11434` | Base URL for local AI endpoint |
| `OLLAMA_CAPTION_MODEL` | `qwen2.5vl:7b` | Model name for captioning |
| `LOCAL_AI_TIMEOUT` | `600000` | Request timeout in milliseconds (10 minutes) |
| `LOCAL_AI_MAX_IMAGE_DIMENSION` | `1024` | Max image dimension for resizing |
| `LOCAL_AI_JPEG_QUALITY` | `80` | JPEG compression quality (0-100) |

### Concurrency Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCAL_AI_MAX_CONCURRENT` | `1` | Max concurrent requests (1 = sequential) |
| `LOCAL_AI_ENABLE_BATCHING` | `false` | Enable batched processing |
| `LOCAL_AI_BATCH_SIZE` | `4` | Batch size if batching enabled |

### Legacy Configuration

| Variable | Description |
|----------|-------------|
| `LOCAL_MODE` | Enable local AI (true) vs Gemini (false) |
| `GEMINI_GEN_CAP_API_KEY` | Gemini API key |
| `GEMINI_GEN_CAP_MODEL` | Gemini model name |

## Testing

### Single Image Testing

```bash
cd collaborative-canvas/backend
LOCAL_MODE=true npm run test-caption path/to/image.png
```

### Batched Testing (Future)

```bash
# Test with multiple images
LOCAL_MODE=true npm run test-caption-batch image1.png image2.png image3.png
```

### Health Check

```bash
# Check Ollama health
curl http://localhost:11434/api/tags
```

## Backward Compatibility

### Preserved APIs

- `getCaption(imageBlob)` - Single image captioning (unchanged)
- `getCaptions(imageBlobs)` - Batched captioning (new)
- `getCaptionProviderInfo()` - Provider info (new)
- `healthCheck()` - Health check (new)

### Breaking Changes

None. All existing APIs are preserved.

### Migration Path

Existing code using `getCaption()` requires no changes:

```javascript
// Old code (still works)
import { getCaption } from "../services/captioning/index.js";
const caption = await getCaption(imageBuffer);

// New code (batched)
import { getCaptions } from "../services/captioning/index.js";
const captions = await getCaptions([imageBuffer1, imageBuffer2]);
```

## Summary

The refactoring successfully:

1. ✅ Created shared AI provider layer
2. ✅ Prepared for vLLM migration
3. ✅ Added batched captioning support
4. ✅ Implemented queue-safe preparation
5. ✅ Improved observability with structured logging
6. ✅ Maintained backward compatibility

The architecture is now aligned with the NURA Local AI Architecture document and ready for future enhancements.
