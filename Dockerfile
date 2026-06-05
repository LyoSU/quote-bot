FROM node:22-bookworm

WORKDIR /app

# No build toolchain needed: the only native dep (sharp) ships prebuilt binaries.
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Single long-polling process (the runner handles concurrency internally).
CMD ["node", "dist/index.js"]
