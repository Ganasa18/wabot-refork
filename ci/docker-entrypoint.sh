#!/bin/sh
set -e

# Verify FFmpeg is installed
echo "Checking FFmpeg installation..."
ffmpeg -version || { echo "FFmpeg is not installed properly"; exit 1; }

# Run the main application
echo "Running npm start..."
npm start