import sharp from 'sharp'
import type { Api } from 'grammy'
import { config } from '../../config/env'

/** Source image dimension cap (mirrors the legacy guard). */
const MAX_SOURCE_DIM = 2048
/** Telegram static-sticker side length. */
const STICKER_SIDE = 512
const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 15_000

export class StickerTooLargeError extends Error {
  constructor() {
    super('source image exceeds 2048px')
    this.name = 'StickerTooLargeError'
  }
}

/** Downloads a Telegram file by id into memory (bounded + timed out). */
export async function downloadTelegramFile(api: Api, fileId: string): Promise<Buffer> {
  const file = await api.getFile(fileId)
  if (!file.file_path) throw new Error('file has no path')

  const url = `${config.BOT_API_ROOT}/file/bot${config.BOT_TOKEN}/${file.file_path}`
  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_DOWNLOAD_BYTES) throw new Error('file too large')
  return buf
}

/**
 * Normalizes an arbitrary image into a Telegram static-sticker WebP: longest
 * side scaled to 512px. Throws {@link StickerTooLargeError} for oversized
 * sources. Replaces the legacy inline sharp pipeline (with explicit setImmediate
 * yields — unnecessary here since this runs off the hot path).
 */
export async function toStickerWebp(input: Buffer): Promise<Buffer> {
  const img = sharp(input)
  const meta = await img.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (width > MAX_SOURCE_DIM || height > MAX_SOURCE_DIM) throw new StickerTooLargeError()

  return img
    .resize(height >= width ? { height: STICKER_SIDE } : { width: STICKER_SIDE })
    .webp({ quality: 100 })
    .toBuffer()
}
