# Go to the service's Settings page on the Render dashboard.
# Find the Build Command setting.
# Change it to: bash build.sh
# Find the Start Command setting. 
#It should already be set to what's in your Procfile: 
#gunicorn --workers 1 --timeout 1200 --max-requests 1000 --max-requests-jitter 50 backend.wsgi:application
# Click Save Changes and trigger a new deployment.

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