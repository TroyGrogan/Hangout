#!/bin/bash

# Build script for SPA deployment
echo "Starting build process for SPA deployment..."

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the application
echo "Building application..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
  echo "Error: Build failed - dist directory not found"
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "Error: Build failed - index.html not found in dist"
  exit 1
fi

echo "Build completed successfully!"
echo "Contents of dist directory:"
ls -la dist/

# Copy additional configuration files to dist if needed
if [ -f "nginx.conf" ]; then
  cp nginx.conf dist/
  echo "Copied nginx.conf to dist/"
fi

echo "Build process completed. Ready for deployment!" 