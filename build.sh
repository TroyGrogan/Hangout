#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Create the directory for the AI model if it doesn't exist
# mkdir -p backend/ai_model

# Download the AI model file from Hugging Face
# This uses curl to download the file and places it in the correct directory
echo "Downloading Gemma 3 1B model... this may take a few minutes."
curl -L -o backend/ai_model/gemma-3-1b-it-Q8_0.gguf "https://huggingface.co/ggml-org/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q8_0.gguf?download=true"
echo "Model download complete." 