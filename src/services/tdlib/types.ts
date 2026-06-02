import type { MessageEntity, PhotoSize } from 'grammy/types'

/**
 * Bot-API-shaped output of the TDLib service.
 *
 * The whole point of this module is that downstream code (the quote builder)
 * treats a TDLib-fetched message exactly like a native Bot API `Message`. So
 * every field here mirrors the Bot API field name and shape as closely as the
 * TDLib data allows. Where the Bot API and grammY types match exactly
 * (entities, photo sizes) we reuse grammY's types directly.
 */

export interface TdUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  /** custom_emoji_id of the user's emoji status, if any. */
  emoji_status?: string
}

export type TdChatType = 'private' | 'group' | 'supergroup' | 'channel' | 'secret'

export interface TdChatPhoto {
  small_file_id: string
  small_file_unique_id: string
  big_file_id: string
  big_file_unique_id: string
}

export interface TdChat {
  id: number
  title?: string
  username?: string
  type?: TdChatType
  /** Present when the "chat" is actually a user (private chats are merged). */
  first_name?: string
  last_name?: string
  emoji_status?: string
  photo?: TdChatPhoto
}

export interface TdSticker {
  file_id: string
  is_animated: boolean
  is_video: boolean
  thumb?: { file_id: string }
  thumbnail?: PhotoSize
}

export interface TdVoice {
  file_id: string
  waveform: number[]
  duration: number
}

export interface TdMediaFile {
  file_id?: string
  file_unique_id?: string
  file_size?: number
  width?: number
  height?: number
  duration?: number
  length?: number
  file_name?: string
  mime_type?: string
  thumbnail?: PhotoSize
}

/** A message normalized into Bot API shape. Only populated fields are present. */
export interface TdMessage {
  message_id: number
  date: number
  text?: string
  caption?: string
  entities?: MessageEntity[]
  caption_entities?: MessageEntity[]

  from?: TdChat
  chat?: TdChat
  reply_to_message?: TdMessage

  forward_from?: TdChat
  forward_from_chat?: TdChat
  forward_sender_name?: string
  forward_origin?: TdForwardOrigin
  author_signature?: string
  sender_tag?: string

  photo?: PhotoSize[]
  sticker?: TdSticker
  voice?: TdVoice
  video?: TdMediaFile
  animation?: TdMediaFile
  document?: TdMediaFile
  audio?: TdMediaFile
  video_note?: TdMediaFile

  /** "Tap to reveal" media spoiler flag. */
  has_media_spoiler?: boolean

  /** Set when the content type has no Bot-API mapping. */
  unsupportedMessage?: boolean
}

export type TdForwardOriginType = 'user' | 'chat' | 'channel' | 'hidden_user' | 'message_import' | 'unknown'

export interface TdForwardOrigin {
  type: TdForwardOriginType
  date: number
  sender_user?: TdChat
  sender_chat?: TdChat
  chat?: TdChat
  sender_user_name?: string
  author_signature?: string
}
