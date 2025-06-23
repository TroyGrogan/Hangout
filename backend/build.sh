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

# Install Python dependencies. Since this script is run from the `backend` directory,
# the path 'requirements.txt' is correct.
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create the directory for the AI model.
# The path is now correctly relative to the `backend` directory where this script runs.
echo "Creating AI model directory..."
mkdir -p ai_model

# Download the AI model file from Hugging Face into the correct `ai_model` directory.
# We are switching to the Q8_0 version of TinyLlama as requested.
echo "Downloading TinyLlama 1.1B (Q8_0) model... this may take a few minutes."
curl -L -o ai_model/tinyllama-1.1b-chat-v1.0.Q8_0.gguf "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q8_0.gguf?download=true"
echo "Model download complete."

# Remove unnecessary directories to reduce slug size.
echo "Removing unnecessary directories..."
rm -rf tests
rm -rf database_rls_things

# Run Django management commands for deployment.
# These are run from the `backend` directory where manage.py is located.
echo "Running Django management commands..."
python manage.py collectstatic --no-input
python manage.py migrate --no-input 