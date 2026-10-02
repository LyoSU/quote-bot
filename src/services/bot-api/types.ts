import type { MessageEntity, PhotoSize } from 'grammy/types'

/**
 * Bot-API-shaped output of the custom server methods.
 *
 * The server returns true Bot API JSON, so these are structural views of the
 * fields the quote pipeline reads — downstream code treats a fetched message
 * exactly like a native update. Where grammY's types match exactly (entities,
 * photo sizes) we reuse them directly.
 */

export interface ApiUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

/** getUserInfo result — Bot API User plus the fork's emoji-status extension. */
export interface ApiUserInfo extends ApiUser {
  /** custom_emoji_id of the user's premium emoji status, if any. */
  emoji_status_custom_emoji_id?: string
}

export type ApiChatType = 'private' | 'group' | 'supergroup' | 'channel'

export interface ApiChatPhoto {
  small_file_id: string
  small_file_unique_id: string
  big_file_id: string
  big_file_unique_id: string
}

export interface ApiChat {
  id: number
  title?: string
  username?: string
  type?: ApiChatType
  first_name?: string
  last_name?: string
  photo?: ApiChatPhoto
}

export interface ApiSticker {
  file_id: string
  is_animated: boolean
  is_video: boolean
  thumbnail?: PhotoSize
}

export interface ApiVoice {
  file_id: string
  waveform?: number[]
  duration: number
}

export interface ApiMediaFile {
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

/** A fetched message. Only populated fields are present. */
export interface ApiMessage {
  message_id: number
  date: number
  text?: string
  caption?: string
  entities?: MessageEntity[]
  caption_entities?: MessageEntity[]

  from?: ApiUser & { is_bot?: boolean }
  sender_chat?: ApiChat
  chat?: ApiChat
  reply_to_message?: ApiMessage
  /** Reply-with-quote: the fragment of the replied message this one quoted. */
  quote?: { text: string; entities?: MessageEntity[] }

  forward_from?: ApiUser & { is_bot?: boolean }
  forward_from_chat?: ApiChat
  forward_sender_name?: string
  forward_origin?: ApiForwardOrigin
  /** Tag/custom title of this message's sender in a supergroup (not the forward origin). */
  sender_tag?: string
  author_signature?: string
  via_bot?: { username?: string }

  /** Shared by the messages of one album. */
  media_group_id?: string
  photo?: PhotoSize[]
  sticker?: ApiSticker
  voice?: ApiVoice
  video?: ApiMediaFile
  animation?: ApiMediaFile
  document?: ApiMediaFile
  audio?: ApiMediaFile
  video_note?: ApiMediaFile

  poll?: { question: string; options?: { text: string }[] }
  dice?: { emoji: string; value?: number }
  location?: { latitude: number; longitude: number }
  venue?: { title?: string; address?: string }
  contact?: { first_name?: string; last_name?: string; phone_number?: string }

  /** "Tap to reveal" media spoiler flag. */
  has_media_spoiler?: boolean
}

export type ApiForwardOriginType = 'user' | 'chat' | 'channel' | 'hidden_user'

export interface ApiForwardOrigin {
  type: ApiForwardOriginType
  date: number
  sender_user?: ApiUser
  sender_chat?: ApiChat
  chat?: ApiChat
  sender_user_name?: string
  author_signature?: string
}
