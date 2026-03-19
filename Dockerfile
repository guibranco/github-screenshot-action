FROM node:20-slim

# Install Chromium + deps
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libxss1 \
    libasound2 \
    libgtk-3-0 \
    libgbm-dev \
    xdg-utils \
    git \
    && rm -rf /var/lib/apt/lists/*

# Puppeteer env
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

ENTRYPOINT ["/app/entrypoint.sh"]
