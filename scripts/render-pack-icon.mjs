// Regenerates the guest-pack icon PNG from its SVG source.
// Usage: node scripts/render-pack-icon.mjs
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const svg = fileURLToPath(new URL('../src/services/sticker/assets/pack-icon.svg', import.meta.url))
const png = fileURLToPath(new URL('../src/services/sticker/assets/pack-icon.png', import.meta.url))

const { width, height, size } = await sharp(svg)
  .resize(512, 512)
  .png()
  .toFile(png)

console.log(`pack-icon.png: ${width}x${height}, ${size} bytes`)
