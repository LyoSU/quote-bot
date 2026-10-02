import type { PhotoSize } from 'grammy/types'
import type { QuoteAlbumItem } from '../../services/quote-api/types'
import type { ApiMessage } from '../../services/bot-api'
import type { RawMessage } from './assemble'

/** Telegram caps an album at 10 items; adjacent ids → a ±9 window always covers it. */
export const ALBUM_MAX = 10
const ALBUM_WINDOW = ALBUM_MAX - 1

/** Album members the renderer can tile: photos and videos (documents/audio stay separate). */
function isTile(m: RawMessage): boolean {
  return Boolean(m.photo?.length || m.video || m.animation)
}

function bestPhoto(sizes: PhotoSize[]): PhotoSize | undefined {
  let best: PhotoSize | undefined
  for (const p of sizes) {
    if (!best || (p.width ?? 0) * (p.height ?? 0) > (best.width ?? 0) * (best.height ?? 0)) best = p
  }
  return best
}

/** One renderer tile for an album member (null when it has no usable file). */
export function albumItem(m: RawMessage): QuoteAlbumItem | null {
  if (m.photo?.length) {
    const p = bestPhoto(m.photo)
    if (!p?.file_id) return null
    return { file_id: p.file_id, width: p.width, height: p.height, type: 'photo' }
  }
  const v = m.video ?? m.animation
  if (!v) return null
  // A video is drawn from its thumbnail; without one the renderer can still
  // pull a frame from the file itself.
  const id = v.thumbnail?.file_id ?? v.file_id
  if (!id) return null
  const item: QuoteAlbumItem = {
    file_id: id,
    width: v.thumbnail?.width ?? v.width,
    height: v.thumbnail?.height ?? v.height,
    type: m.video ? 'video' : 'animation',
  }
  if (typeof v.duration === 'number') item.duration = v.duration
  return item
}

/**
 * Collapses album members (same `media_group_id`) into ONE source message:
 * the caption holder is the base (text, entities, reply, sender), the media of
 * every member goes into `album`. The merged message sits where the first
 * member was, so the others never render as separate bubbles. A group with a
 * single usable item is left untouched (plain media path).
 */
export function mergeAlbums(sources: RawMessage[]): RawMessage[] {
  const groups = new Map<string, RawMessage[]>()
  for (const m of sources) {
    if (m.media_group_id && isTile(m)) {
      const list = groups.get(m.media_group_id) ?? []
      list.push(m)
      groups.set(m.media_group_id, list)
    }
  }

  const out: RawMessage[] = []
  const done = new Set<string>()
  for (const m of sources) {
    const gid = m.media_group_id
    const members = gid && isTile(m) ? groups.get(gid) : undefined
    if (!gid || !members) {
      out.push(m)
      continue
    }
    if (done.has(gid)) continue
    done.add(gid)

    const sorted = [...members].sort((a, b) => (a.message_id ?? 0) - (b.message_id ?? 0))
    const items: QuoteAlbumItem[] = []
    for (const part of sorted) {
      const it = albumItem(part)
      if (it && items.length < ALBUM_MAX) items.push(it)
    }
    if (items.length < 2) {
      out.push(...members)
      continue
    }

    const base = sorted.find((p) => p.caption || p.text) ?? sorted[0]!
    const selection = sorted.find((p) => p.selection)?.selection
    const merged: RawMessage = { ...base, message_id: sorted[0]!.message_id, album: items }
    delete merged.photo
    delete merged.video
    delete merged.animation
    if (selection) merged.selection = selection
    out.push(merged)
  }
  return out
}

interface AlbumFetcher {
  getMessages(chatId: number, messageIds: number[]): Promise<ApiMessage[]>
}

/**
 * Pulls the rest of every album the selection touches: members have adjacent
 * ids, so one small window per group is enough. Natives win over fetched copies
 * (richer entities); the result is deduped and in chronological order within
 * each group. Best-effort — a failed fetch keeps whatever we already have.
 */
export async function expandAlbums(
  messages: RawMessage[],
  chatId: number,
  fetcher: AlbumFetcher,
): Promise<RawMessage[]> {
  const gids = new Set<string>()
  for (const m of messages) if (m.media_group_id && isTile(m)) gids.add(m.media_group_id)
  if (gids.size === 0) return messages

  const have = new Set(messages.map((m) => m.message_id))
  const extra = new Map<string, RawMessage[]>()
  for (const gid of gids) {
    const anchor = messages.find((m) => m.media_group_id === gid)?.message_id
    if (anchor === undefined) continue
    const ids: number[] = []
    for (let id = anchor - ALBUM_WINDOW; id <= anchor + ALBUM_WINDOW; id++) {
      if (id > 0 && !have.has(id)) ids.push(id)
    }
    const fetched = await fetcher.getMessages(chatId, ids).catch(() => [] as ApiMessage[])
    extra.set(
      gid,
      fetched.filter((f) => f.media_group_id === gid && isTile(f as RawMessage)) as RawMessage[],
    )
  }

  // Insert the fetched members next to the first native one, ordered by id.
  const out: RawMessage[] = []
  const placed = new Set<string>()
  for (const m of messages) {
    const gid = m.media_group_id
    if (!gid || !isTile(m) || !extra.has(gid)) {
      out.push(m)
      continue
    }
    if (placed.has(gid)) continue
    placed.add(gid)
    const natives = messages.filter((x) => x.media_group_id === gid)
    const all = [...natives, ...extra.get(gid)!]
    all.sort((a, b) => (a.message_id ?? 0) - (b.message_id ?? 0))
    out.push(...all.slice(0, ALBUM_MAX + natives.length))
  }
  return out
}
