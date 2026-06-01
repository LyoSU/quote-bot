import { InputFile, GrammyError, type Api } from 'grammy'
import { config } from '../../config/env'
import { logger } from '../../core/logger'

const log = logger.child({ module: 'sticker' })

/** Debounce window for pack trimming — coalesces a burst of adds into one trim. */
const TRIM_DEBOUNCE_MS = 5_000

/** Telegram's short-name suffix is per-bot; packs are named `<base><botUsername>`. */
export function packName(base: string, botUsername: string): string {
  return `${base}${botUsername}`
}

function isStickerSetMissing(err: unknown): boolean {
  return err instanceof GrammyError && /STICKERSET_INVALID/i.test(err.description)
}

export interface AddStickerParams {
  ownerId: number
  name: string
  title: string
  /** Rendered static webp bytes from quote-api. */
  webp: Buffer
  emojis: string[]
}

/**
 * Owns sticker-pack mutations. Replaces the old global `setInterval` cleanup
 * (with its `Promise.race` timeouts and `isRunning` semaphore): trimming is now
 * scheduled per pack and debounced, and Telegram rate limits are handled by the
 * outgoing throttler + auto-retry rather than hand-rolled timeouts.
 */
export class StickerService {
  private readonly trimTimers = new Map<string, NodeJS.Timeout>()
  private readonly trimming = new Set<string>()

  constructor(private readonly keepCount: number = config.STICKER_KEEP_COUNT) {}

  /** Adds a sticker to the pack, creating the pack on first use. */
  async addSticker(api: Api, params: AddStickerParams): Promise<void> {
    const sticker = {
      sticker: new InputFile(params.webp, 'sticker.webp'),
      format: 'static' as const,
      emoji_list: params.emojis,
    }
    try {
      await api.addStickerToSet(params.ownerId, params.name, sticker)
    } catch (err) {
      if (!isStickerSetMissing(err)) throw err
      await api.createNewStickerSet(params.ownerId, params.name, params.title, [sticker])
    }
  }

  /** Schedules a debounced trim of the pack down to `keepCount` stickers. */
  scheduleTrim(api: Api, name: string): void {
    clearTimeout(this.trimTimers.get(name))
    const timer = setTimeout(() => {
      this.trimTimers.delete(name)
      void this.trimPack(api, name)
    }, TRIM_DEBOUNCE_MS)
    timer.unref?.()
    this.trimTimers.set(name, timer)
  }

  /** Deletes stickers beyond `keepCount` (oldest first — Telegram keeps insertion order). */
  async trimPack(api: Api, name: string): Promise<void> {
    if (this.trimming.has(name)) return
    this.trimming.add(name)
    try {
      const set = await api.getStickerSet(name)
      const excess = set.stickers.slice(this.keepCount)
      for (const sticker of excess) {
        await api
          .deleteStickerFromSet(sticker.file_id)
          .catch((err: unknown) => log.warn({ err, name }, 'deleteStickerFromSet failed'))
      }
    } catch (err) {
      log.warn({ err, name }, 'trimPack failed')
    } finally {
      this.trimming.delete(name)
    }
  }
}

export const stickerService = new StickerService()
