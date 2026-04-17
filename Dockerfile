FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies for native modules and prebuilt-tdlib
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libvips-dev \
    python3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (prebuilt-tdlib will download TDLib binary automatically)
RUN npm install --omit=dev

# Verify TDLib binary is present
RUN ls -la node_modules/prebuilt-tdlib/

# Copy source code
COPY . .

# Create non-root user for security
RUN groupadd -r quotly && useradd -r -g quotly quotly \
    && chown -R quotly:quotly /app
USER quotly

# Default command (overridden in docker-compose)
CMD ["node", "updates-collector.js"]
