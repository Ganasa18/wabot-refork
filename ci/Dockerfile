# Stage 1: Build the application
FROM node:20 AS builder
WORKDIR /app

# Install build dependencies based on available package manager
RUN if command -v apt-get >/dev/null 2>&1; then \
  apt-get update && apt-get install -y python3 make g++ git; \
  elif command -v apk >/dev/null 2>&1; then \
  apk add --no-cache python3 make g++ git; \
  elif command -v yum >/dev/null 2>&1; then \
  yum install -y python3 make gcc-c++ git; \
  fi

# Install dependencies only for building the app
COPY package.json ./

# Verbose installation with multiple fallback methods
RUN echo "Attempting npm installation..." && \
  # Try with standard install first
  npm install --verbose || \
  # Fall back to legacy peer deps
  npm install --legacy-peer-deps --verbose || \
  # Try with package-lock ignore as last resort
  npm install --no-package-lock --verbose

# Copy source code and build the application
COPY . .
# If you have a build step, uncomment the next line
# RUN npm run build

# Stage 2: Create a minimal production image
FROM node:20 AS production
WORKDIR /app

# Install FFmpeg and other required dependencies based on available package manager
RUN if command -v apt-get >/dev/null 2>&1; then \
  apt-get update && apt-get install -y ffmpeg bash; \
  elif command -v apk >/dev/null 2>&1; then \
  apk add --no-cache ffmpeg bash; \
  elif command -v yum >/dev/null 2>&1; then \
  yum install -y ffmpeg bash; \
  fi

# Copy only necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json


# Copy application code
# If you have a build directory, adjust this accordingly
COPY . .

# Make the entrypoint script executable
COPY ci/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production



# Use the custom entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]