FROM node:22-bookworm

WORKDIR /app

# Build toolchain for native addons (tdl / prebuilt-tdlib).
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Single long-polling process (the runner handles concurrency internally).
CMD ["node", "dist/index.js"]
