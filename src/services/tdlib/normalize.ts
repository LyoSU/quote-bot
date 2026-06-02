import type * as Td from 'tdlib-types'
import type { MessageEntity, PhotoSize } from 'grammy/types'
import type { TdChatType, TdMediaFile, TdMessage, TdSticker, TdVoice } from './types'

/**
 * TDLib message ids are `server_message_id << 20` (the low 20 bits encode
 * client-side ordering). The Bot API exposes the bare `server_message_id`, so
 * we shift by 2^20 to convert between the two id spaces.
 */
export const TDLIB_MESSAGE_ID_SHIFT = 2 ** 20

export const toBotApiMessageId = (tdId: number): number => tdId / TDLIB_MESSAGE_ID_SHIFT
export const toTdlibMessageId = (botId: number): number => botId * TDLIB_MESSAGE_ID_SHIFT

/** TDLib chat-type discriminator → Bot API chat type. */
const CHAT_TYPE: Record<Td.ChatType['_'], TdChatType> = {
  chatTypePrivate: 'private',
  chatTypeBasicGroup: 'group',
  chatTypeSupergroup: 'supergroup',
  chatTypeSecret: 'secret',
}

export function mapChatType(type: Td.ChatType): TdChatType {
  if (type._ === 'chatTypeSupergroup' && type.is_channel) return 'channel'
  return CHAT_TYPE[type._]
}

/** TDLib entity-type discriminator → Bot API MessageEntity type. */
const ENTITY_TYPE: Partial<Record<Td.TextEntityType['_'], MessageEntity['type']>> = {
  textEntityTypeMention: 'mention',
  textEntityTypeHashtag: 'hashtag',
  textEntityTypeCashtag: 'cashtag',
  textEntityTypeBotCommand: 'bot_command',
  textEntityTypeUrl: 'url',
  textEntityTypeEmailAddress: 'email',
  textEntityTypeBold: 'bold',
  textEntityTypeItalic: 'italic',
  textEntityTypeUnderline: 'underline',
  textEntityTypeStrikethrough: 'strikethrough',
  textEntityTypeCode: 'code',
  textEntityTypePre: 'pre',
  textEntityTypePreCode: 'pre',
  textEntityTypeTextUrl: 'text_link',
  textEntityTypeMentionName: 'text_mention',
  textEntityTypePhoneNumber: 'phone_number',
  textEntityTypeSpoiler: 'spoiler',
  textEntityTypeCustomEmoji: 'custom_emoji',
}

export function mapEntities(entities: readonly Td.textEntity[]): MessageEntity[] {
  const result: MessageEntity[] = []
  for (const e of entities) {
    const type = ENTITY_TYPE[e.type._]
    if (!type) continue
    const base = { type, offset: e.offset, length: e.length }
    if (e.type._ === 'textEntityTypeTextUrl') {
      result.push({ ...base, type: 'text_link', url: e.type.url } as MessageEntity)
    } else if (e.type._ === 'textEntityTypeMentionName') {
      // Bot API exposes a full User; TDLib only gives the id. Downstream code
      // reads `.user.id`, so wrap it minimally.
      result.push({ ...base, type: 'text_mention', user: { id: e.type.user_id } } as MessageEntity)
    } else if (e.type._ === 'textEntityTypeCustomEmoji') {
      result.push({ ...base, type: 'custom_emoji', custom_emoji_id: e.type.custom_emoji_id } as MessageEntity)
    } else {
      result.push(base as MessageEntity)
    }
  }
  return result
}

/** Decode TDLib's 5-bit packed voice waveform into 0–31 amplitude values. */
export function decodeWaveform(wf: Buffer): number[] {
  const bitsCount = wf.length * 8
  const valuesCount = Math.floor(bitsCount / 5)
  if (!valuesCount) return []

  const lastIdx = valuesCount - 1
  const result: number[] = []
  for (let i = 0, j = 0; i < lastIdx; i++, j += 5) {
    const byteIdx = Math.floor(j / 8)
    const bitShift = j % 8
    result[i] = (wf.readUInt16LE(byteIdx) >> bitShift) & 0b11111
  }

  const lastByteIdx = Math.floor((lastIdx * 5) / 8)
  const lastBitShift = (lastIdx * 5) % 8
  const lastValue = lastByteIdx === wf.length - 1 ? wf[lastByteIdx]! : wf.readUInt16LE(lastByteIdx)
  result[lastIdx] = (lastValue >> lastBitShift) & 0b11111
  return result
}

/** TDLib thumbnail → Bot-API PhotoSize. */
export function buildThumb(thumb: Td.thumbnail | undefined): PhotoSize | undefined {
  if (!thumb?.file) return undefined
  return {
    file_id: thumb.file.remote.id,
    file_unique_id: thumb.file.remote.unique_id,
    file_size: thumb.file.size,
    width: thumb.width,
    height: thumb.height,
  }
}

function normalizePhoto(photo: Td.photo): PhotoSize[] {
  return photo.sizes.map((size) => ({
    file_id: size.photo.remote.id,
    file_unique_id: size.photo.remote.unique_id,
    file_size: size.photo.size,
    width: size.width,
    height: size.height,
  }))
}

function normalizeSticker(sticker: Td.sticker): TdSticker {
  const thumbnail = buildThumb(sticker.thumbnail)
  return {
    file_id: sticker.sticker.remote.id,
    is_animated: sticker.format._ === 'stickerFormatTgs',
    is_video: sticker.format._ === 'stickerFormatWebm',
    thumb: thumbnail ? { file_id: thumbnail.file_id } : undefined,
    thumbnail,
  }
}

function fileToMedia(
  file: Td.file,
  extra: Partial<TdMediaFile>,
  thumb?: Td.thumbnail,
): TdMediaFile {
  return {
    file_id: file.remote.id,
    file_unique_id: file.remote.unique_id,
    file_size: file.size,
    thumbnail: buildThumb(thumb),
    ...extra,
  }
}

function applyCaption(out: Partial<TdMessage>, caption: Td.formattedText | undefined): void {
  if (!caption?.text) return
  out.caption = caption.text
  const entities = mapEntities(caption.entities)
  if (entities.length) out.caption_entities = entities
}

/**
 * Normalizes a TDLib message content union into the Bot-API-shaped fields of a
 * message. Pure: no network, no caching — easy to unit test.
 */
export function normalizeContent(content: Td.MessageContent): Partial<TdMessage> {
  const out: Partial<TdMessage> = {}

  switch (content._) {
    case 'messageText':
      out.text = content.text.text
      if (content.text.entities.length) out.entities = mapEntities(content.text.entities)
      break
    case 'messagePhoto':
      out.photo = normalizePhoto(content.photo)
      applyCaption(out, content.caption)
      if (content.has_spoiler) out.has_media_spoiler = true
      break
    case 'messageSticker':
      out.sticker = normalizeSticker(content.sticker)
      break
    case 'messageVoiceNote':
      out.voice = {
        file_id: content.voice_note.voice.remote.id,
        waveform: decodeWaveform(Buffer.from(content.voice_note.waveform, 'base64')),
        duration: content.voice_note.duration,
      } satisfies TdVoice
      applyCaption(out, content.caption)
      break
    case 'messageVideo':
      out.video = fileToMedia(
        content.video.video,
        {
          width: content.video.width,
          height: content.video.height,
          duration: content.video.duration,
          mime_type: content.video.mime_type,
        },
        content.video.thumbnail,
      )
      applyCaption(out, content.caption)
      if (content.has_spoiler) out.has_media_spoiler = true
      break
    case 'messageAnimation':
      out.animation = fileToMedia(
        content.animation.animation,
        {
          width: content.animation.width,
          height: content.animation.height,
          duration: content.animation.duration,
          mime_type: content.animation.mime_type,
        },
        content.animation.thumbnail,
      )
      applyCaption(out, content.caption)
      if (content.has_spoiler) out.has_media_spoiler = true
      break
    case 'messageDocument':
      out.document = fileToMedia(
        content.document.document,
        { file_name: content.document.file_name, mime_type: content.document.mime_type },
        content.document.thumbnail,
      )
      applyCaption(out, content.caption)
      break
    case 'messageAudio':
      out.audio = fileToMedia(
        content.audio.audio,
        { duration: content.audio.duration, file_name: content.audio.file_name, mime_type: content.audio.mime_type },
        content.audio.album_cover_thumbnail,
      )
      applyCaption(out, content.caption)
      break
    case 'messageVideoNote':
      out.video_note = fileToMedia(
        content.video_note.video,
        { duration: content.video_note.duration, length: content.video_note.length },
        content.video_note.thumbnail,
      )
      break
    default:
      out.unsupportedMessage = true
  }

  return out
}
