#!/bin/bash

# Build Docker image with build arguments
docker build \
  --file ci/Dockerfile \
  -t hito18/wa-simple-bot . 2>&1 | tee build-log.txt