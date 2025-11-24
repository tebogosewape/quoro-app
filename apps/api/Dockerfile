# syntax=docker/dockerfile:1
FROM node:20-alpine

# Install Chromium and dependencies for Puppeteer/WhatsApp Web
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    xvfb

# Tell Puppeteer to skip downloading Chromium and use the installed one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./

# Copy API-specific package files
COPY apps/api/package*.json ./apps/api/

# Install dependencies with workspace support
ENV CHOKIDAR_USEPOLLING=true \
    CHOKIDAR_INTERVAL=100

RUN npm install -g @nestjs/cli && \
    npm install --legacy-peer-deps

# Copy source code
COPY . .

EXPOSE 2200

# Set working directory to API for command execution
WORKDIR /app/apps/api

# Run the API start:dev script
CMD ["npm", "run", "start:dev"]
