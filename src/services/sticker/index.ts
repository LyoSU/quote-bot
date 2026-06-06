import { readFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleepMs } from 'node:timers/promises'
import { InputFile, GrammyError, type Api } from 'grammy'
import type { Sticker } from 'grammy/types'
import { logger } from '../../core/logger'

const log = logger.child({ module: 'sticker' })

/** Debounce window for pack trimming — coalesces a burst of stages into one trim. */
const TRIM_DEBOUNCE_MS = 5_000

/**
 * Backoff between `getStickerSet` visibility polls: the Bot API (notably a
 * self-hosted server) may serve a cached set for a moment after
 * `addStickerToSet`, so the fresh sticker is not always visible right away.
 */
const STAGE_POLL_DELAYS_MS = [0, 250, 750, 1_500]

/**
 * Marker emoji of the pack icon (the bot-branded placeholder sticker that
 * fronts every staging pack). `resolveStickerEmojis` never produces it on its
 * own, so `stickers[0].emoji === PACK_ICON_EMOJI` identifies the icon without
 * any DB state. Single codepoint on purpose — no variation-selector pitfalls.
 */
export const PACK_ICON_EMOJI = '📌'

/** Telegram's short-name suffix is per-bot; packs are named `<base><botUsername>`. */
export function packName(base: string, botUsername: string): string {
  return `${base}${botUsername}`
}

function isStickerSetMissing(err: unknown): boolean {
  return err instanceof GrammyError && /STICKERSET_INVALID/i.test(err.description)
}

/** The 512×512 die-cut pack icon; regenerate via scripts/render-pack-icon.mjs. */
let packIconBytes: Buffer | undefined
function packIcon(): Buffer {
  packIconBytes ??= readFileSync(path.join(__dirname, 'assets', 'pack-icon.png'))
  return packIconBytes
}

export interface StageStickerParams {
  ownerId: number
  name: string
  title: string
  /** Rendered static webp bytes from quote-api. */
  webp: Buffer
  emojis: string[]
}

export interface StickerServiceOptions {
  /** Injected for tests; defaults to a real timer sleep. */
  sleep?: (ms: number) => Promise<void>
}

/**
 * Owns sticker-pack mutations. The pack is a transient staging area: guest
 * answers need an existing `sticker_file_id`, so the quote passes through the
 * pack and is discarded right after sending (privacy — the pack is publicly
 * viewable). The branded icon stays as the only permanent sticker: it keeps
 * the pack alive (Telegram drops a set once its last sticker is removed) and
 * gives it a proper cover.
 */
export class StickerService {
  private readonly trimTimers = new Map<string, NodeJS.Timeout>()
  private readonly trimming = new Set<string>()
  private readonly sleep: (ms: number) => Promise<void>

  constructor(options: StickerServiceOptions = {}) {
    this.sleep = options.sleep ?? (async (ms) => void (await sleepMs(ms)))
  }

  /**
   * Stages a quote sticker into the pack and returns it once visible.
   * Creates the pack (icon first) on first use. Every stage also re-arms the
   * debounced safety trim, so a trim can never fire within the debounce
   * window of a freshly staged quote.
   */
  async stageSticker(api: Api, params: StageStickerParams): Promise<Sticker> {
    const sticker = {
      sticker: new InputFile(params.webp, 'sticker.webp'),
      format: 'static' as const,
      emoji_list: params.emojis,
    }
    try {
      await api.addStickerToSet(params.ownerId, params.name, sticker)
    } catch (err) {
      if (!isStickerSetMissing(err)) throw err
      const icon = {
        sticker: new InputFile(packIcon(), 'icon.png'),
        format: 'static' as const,
        emoji_list: [PACK_ICON_EMOJI],
      }
      await api.createNewStickerSet(params.ownerId, params.name, params.title, [icon, sticker])
    }
    try {
      return await this.resolveStagedSticker(api, params.name)
    } finally {
      this.scheduleTrim(api, params.name)
    }
  }

  /**
   * Polls the set until the freshly staged sticker shows up (Bot API caching)
   * and returns it. "Shows up" is positional, not emoji-based: stickers append
   * at the end, the icon sits at index 0, and quotes never survive past a trim
   * — so a last sticker that isn't the lone icon is the one just staged.
   */
  private async resolveStagedSticker(api: Api, name: string): Promise<Sticker> {
    for (const delay of STAGE_POLL_DELAYS_MS) {
      if (delay > 0) await this.sleep(delay)
      const set = await api.getStickerSet(name)
      const last = set.stickers[set.stickers.length - 1]
      if (last && !(set.stickers.length === 1 && last.emoji === PACK_ICON_EMOJI)) return last
    }
    throw new Error(`staged sticker not visible in ${name} after ${STAGE_POLL_DELAYS_MS.length} polls`)
  }

  /**
   * Fire-and-forget removal of a staged sticker right after it was sent — the
   * pack must not accumulate quotes (privacy). Failures are fine: the safety
   * trim sweeps leftovers.
   */
  discardSticker(api: Api, name: string, fileId: string): void {
    void api
      .deleteStickerFromSet(fileId)
      .catch((err: unknown) => log.debug({ err, name }, 'discardSticker failed; trim will catch up'))
  }

  /** Schedules a debounced trim of the pack down to just the icon. */
  scheduleTrim(api: Api, name: string): void {
    clearTimeout(this.trimTimers.get(name))
    const timer = setTimeout(() => {
      this.trimTimers.delete(name)
      void this.trimPack(api, name)
    }, TRIM_DEBOUNCE_MS)
    timer.unref?.()
    this.trimTimers.set(name, timer)
  }

  /**
   * Safety net behind the targeted post-send discard: removes every staged
   * quote the hot path failed to clean up (e.g. a crash between stage and
   * discard). A pack not fronted by the marker icon predates the icon scheme —
   * wipe it entirely; the set dies with its last sticker and the next quote
   * recreates it icon-first. Self-heal without migrations.
   */
  async trimPack(api: Api, name: string): Promise<void> {
    if (this.trimming.has(name)) return
    this.trimming.add(name)
    try {
      const set = await api.getStickerSet(name)
      const [first, ...rest] = set.stickers
      if (!first) return
      const excess = first.emoji === PACK_ICON_EMOJI ? rest : set.stickers
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
