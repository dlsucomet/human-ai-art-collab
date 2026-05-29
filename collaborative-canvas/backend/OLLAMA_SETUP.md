# Ollama Setup Instructions for Local Image Captioning

This guide explains how to set up Ollama with the qwen2.5vl:7b model for local image captioning.

## Prerequisites

- macOS, Linux, or Windows with WSL2
- At least 8GB RAM (16GB recommended for qwen2.5vl:7b)
- Approximately 5GB disk space for the model

## Installation

### 1. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download and run the installer

### 2. Start Ollama

**macOS/Linux:**
```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`

**Windows:**
Ollama starts automatically as a service after installation.

### 3. Pull the qwen2.5vl:7b Model

```bash
ollama pull qwen2.5vl:7b
```

This downloads the vision-capable model (~4-5GB).

### 4. Verify the Model Works

Test the model with a simple prompt:

```bash
ollama run qwen2.5vl:7b "Hello, can you see this?"
```

You should see a response from the model.

### 5. Test Vision Capabilities

To test vision capabilities, you can use the Ollama API directly:

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5vl:7b",
  "prompt": "What is in this image?",
  "images": ["<base64-encoded-image>"],
  "stream": false
}'
```

## Configure the Backend

### 1. Set Environment Variable

Add to your `.env` file in the backend directory:

```env
LOCAL_MODE=true
```

### 2. Verify Ollama is Running

Make sure Ollama is running before starting your backend:

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags
```

You should see a JSON response with available models.

## Running the Captioning Test

### Using npm script:

```bash
cd collaborative-canvas/backend
npm run test-caption path/to/image.png
```

### Using node directly:

```bash
cd collaborative-canvas/backend
node scripts/testCaption.js path/to/image.png
```

### Example:

```bash
npm run test-caption ../test-images/sample.jpg
```

## Troubleshooting

### Ollama not responding

- Check if Ollama is running: `curl http://localhost:11434/api/tags`
- Restart Ollama: Stop the process and run `ollama serve` again
- Check firewall settings (port 11434)

### Model not found

- Verify the model is installed: `ollama list`
- Re-pull the model: `ollama pull qwen2.5vl:7b`

### Out of memory errors

- qwen2.5vl:7b requires significant RAM
- Try a smaller model if needed: `ollama pull qwen2.5vl:3b`
- Update the model name in `qwenProvider.js`

### Slow response times

- Vision models are slower than text-only models
- First run may be slower due to model loading
- Consider using GPU acceleration if available

## Switching Back to Gemini

To switch back to Google Gemini API:

1. Set in `.env`:
```env
LOCAL_MODE=false
```

Or simply remove the `LOCAL_MODE` variable.

2. Ensure `GEMINI_GEN_CAP_API_KEY` and `GEMINI_GEN_CAP_MODEL` are set in your `.env` file.
