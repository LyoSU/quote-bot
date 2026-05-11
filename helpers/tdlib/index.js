const path = require('path')
const tdl = require('tdl')
const tdDirectory = path.resolve(__dirname, 'data')

try {
  const { getTdjson } = require('prebuilt-tdlib')
  const tdjsonPath = getTdjson()
  console.log('Using prebuilt-tdlib from:', tdjsonPath)
  tdl.configure({ tdjson: tdjsonPath, verbosityLevel: 0 })
} catch (err) {
  console.error('prebuilt-tdlib error:', err.message)
  console.log('Falling back to local libtdjson.so at:', tdDirectory)
  tdl.configure({ libdir: tdDirectory, verbosityLevel: 0 })
}

let client = null
let isConnecting = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 5000

const createClient = () => {
  return tdl.createClient({
    apiId: process.env.TELEGRAM_API_ID,
    apiHash: process.env.TELEGRAM_API_HASH,
    databaseDirectory: path.join(tdDirectory, 'db'),
    filesDirectory: tdDirectory,
    tdlibParameters: {
      use_message_database: false,
      use_chat_info_database: false,
      use_file_database: false
    }
  })
}

const connectClient = async () => {
  if (isConnecting) {
    // Wait for ongoing connection with timeout to prevent deadlock
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)

      // Add timeout to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkInterval)
        isConnecting = false // Reset flag to prevent deadlock
        console.warn('TDLib connection flag timeout, resetting flag')
        resolve()
      }, 20000) // 20 seconds timeout
    })
    return
  }

  isConnecting = true

  try {
    if (client) {
      try {
        await client.close()
      } catch (e) {
        // Ignore close errors
      }
    }

    client = createClient()

    client.on('error', (error) => {
      console.error('TDLib client error:', error)
      reconnectClient()
    })

    client.on('destroy', () => {
      console.log('TDLib client destroyed, attempting reconnect...')
      reconnectClient()
    })

    await client.loginAsBot(process.env.BOT_TOKEN)
    console.log('TDLib client connected successfully')
    reconnectAttempts = 0
    isConnecting = false
  } catch (error) {
    console.error('Failed to connect TDLib client:', error)
    isConnecting = false
    reconnectClient()
  }
}

const reconnectClient = () => {
  if (isConnecting || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return

  reconnectAttempts++
  console.log(`TDLib reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms`)

  setTimeout(() => {
    connectClient()
  }, RECONNECT_DELAY * reconnectAttempts) // Exponential backoff
}

// TDLib logs in with the same BOT_TOKEN as Telegraf polling. Telegram only
// allows ONE active getUpdates/MTProto session per bot token at a time — when
// both clients run together, updates get split between them and some (e.g.
// guest_message) never reach Telegraf. Set DISABLE_TDLIB=1 to skip the
// connection while we work on a longer-term split (TDLib should run as a
// user account in a dedicated process, not the bot token, so it can read
// history without contending for bot updates).
if (process.env.DISABLE_TDLIB === '1') {
  console.warn('[tdlib] DISABLE_TDLIB=1 — skipping client login. handleQuote will fall back to single-message mode for groups.')
} else {
  connectClient()
}

function sendMethod (method, parm) {
  return new Promise((resolve, reject) => {
    if (!client) {
      reject(new Error('TDLib client not available'))
      return
    }

    try {
      client.invoke(Object.assign({ _: method }, parm)).then(resolve).catch((error) => {
        // Trigger reconnection on critical errors
        if (error && (error.code === 'NETWORK_ERROR' || error.message?.includes('Connection'))) {
          reconnectClient()
        }
        resolve(error) // Don't reject, return error as result
      })
    } catch (error) {
      reject(error)
    }
  })
}

function getUser (userID) {
  return new Promise((resolve, reject) => {
    sendMethod('getUser', {
      user_id: userID
    }).then((response) => {
      if (response._ === 'error') reject(new Error(`[TDLib][${response.code}] ${response.message}`))
      const user = {
        id: response.id,
        first_name: response.first_name,
        last_name: response.last_name,
        username: response.username,
        language_code: response.language_code,
        emoji_status: response?.emoji_status?.custom_emoji_id
      }

      return resolve(user)
    }).catch((console.error))
  })
}

function getSupergroup (supergroupID) {
  return new Promise((resolve, reject) => {
    sendMethod('getSupergroup', {
      supergroup_id: supergroupID
    }).then((response) => {
      if (response._ === 'error') reject(new Error(`[TDLib][${response.code}] ${response.message}`))
      const supergroup = {
        username: response.username
      }

      resolve(supergroup)
    })
  })
}

// In-memory cache of resolved chat/user info. getMessages issues 2-3 getChat
// per message (sender, chat, forwarder); for a 50-message forward batch from
// the same user that's ~150 identical TDLib round-trips. With a 60s TTL the
// batch collapses to 1-3 real calls + cached hits.
const chatCache = new Map()
const CHAT_CACHE_TTL_MS = 60_000

setInterval(() => {
  const cutoff = Date.now() - CHAT_CACHE_TTL_MS
  for (const [k, v] of chatCache) if (v.ts < cutoff) chatCache.delete(k)
}, 5 * 60_000).unref()

function getChat (chatID) {
  const cached = chatCache.get(chatID)
  if (cached && (Date.now() - cached.ts) < CHAT_CACHE_TTL_MS) {
    return Promise.resolve(cached.value)
  }
  return getChatRaw(chatID).then((value) => {
    chatCache.set(chatID, { value, ts: Date.now() })
    return value
  })
}

function getChatRaw (chatID) {
  return new Promise((resolve, reject) => {
    sendMethod('getChat', {
      chat_id: chatID
    }).then((response) => {
      if (response._ === 'error') reject(new Error(`[TDLib][${response.code}] ${response.message}`))

      const chat = {
        id: response.id,
        title: response.title
      }

      if (response.photo) {
        chat.photo = {
          small_file_id: response.photo.small.remote.id,
          small_file_unique_id: response.photo.small.remote.unique_id,
          big_file_id: response.photo.big.remote.id,
          big_file_unique_id: response.photo.big.remote.unique_id
        }
      }

      const chatTypeMap = {
        chatTypePrivate: 'private',
        chatTypeBasicGroup: 'group',
        chatTypeSupergroup: 'supergroup',
        chatTypeSecret: 'secret'
      }

      chat.type = chatTypeMap[response.type._]

      if (['private', 'secret'].includes(chat.type)) {
        getUser(chat.id).then((user) => {
          resolve(Object.assign(user, chat))
        })
      } else {
        chat.title = response.title

        if (response.type.is_channel && response.type.is_channel === true) chat.type = 'channel'

        if (response.type.supergroup_id) {
          getSupergroup(response.type.supergroup_id).then((supergroup) => {
            resolve(Object.assign(supergroup, chat))
          })
        } else {
          resolve(chat)
        }
      }
    })
  })
}

function decodeWaveform (wf) {
  const bitsCount = wf.length * 8
  const valuesCount = ~~(bitsCount / 5)

  if (!valuesCount) return []

  const lastIdx = valuesCount - 1

  const result = []
  for (let i = 0, j = 0; i < lastIdx; i++, j += 5) {
    const byteIdx = ~~(j / 8)
    const bitShift = j % 8
    result[i] = (wf.readUInt16LE(byteIdx) >> bitShift) & 0b11111
  }

  const lastByteIdx = ~~((lastIdx * 5) / 8)
  const lastBitShift = (lastIdx * 5) % 8
  const lastValue =
      lastByteIdx === wf.length - 1
        ? wf[lastByteIdx]
        : wf.readUInt16LE(lastByteIdx)
  result[lastIdx] = (lastValue >> lastBitShift) & 0b11111

  return result
}

function getMessages (chatID, messageIds) {
  const tdlibMessageIds = messageIds.map((id) => id * Math.pow(2, 20))

  return new Promise((resolve, reject) => {
    sendMethod('getMessages', {
      chat_id: chatID,
      message_ids: tdlibMessageIds
    }).then((response) => {
      if (response._ === 'error') return resolve([])

      if (!response.messages) return resolve([])

      const messages = response.messages.map((messageInfo) => {
        if (!messageInfo) return {}
        return new Promise((resolve, reject) => {
          const message = {
            message_id: messageInfo.id / Math.pow(2, 20),
            date: messageInfo.date
          }
          const messagePromise = []
          const replyToMessageID = messageInfo?.reply_to?.message_id / Math.pow(2, 20)

          if (messageInfo?.reply_to?.message_id) messagePromise.push(getMessages(chatID, [replyToMessageID]))
          Promise.allSettled(messagePromise).then((replyResults) => {
            const replyMessage = replyResults
              .filter(result => result.status === 'fulfilled' && result.value)
              .map(result => result.value)

            if (replyMessage && replyMessage[0] && replyMessage[0][0] && Object.keys(replyMessage[0][0]).length !== 0) message.reply_to_message = replyMessage[0][0]

            const chatIds = [
              messageInfo.chat_id
            ]

            if (messageInfo.sender_id.user_id) chatIds.push(messageInfo.sender_id.user_id)
            if (messageInfo.sender_id.chat_id) chatIds.push(messageInfo.sender_id.chat_id)

            let forwarderId

            if (messageInfo.forward_info && messageInfo.forward_info.origin.sender_user_id) forwarderId = messageInfo.forward_info.origin.sender_user_id
            if (messageInfo.forward_info && messageInfo.forward_info.origin.sender_chat_id) forwarderId = messageInfo.forward_info.origin.sender_chat_id
            if (messageInfo.forward_info && messageInfo.forward_info.origin.user_id) forwarderId = messageInfo.forward_info.origin.user_id
            if (messageInfo.forward_info && messageInfo.forward_info.origin.chat_id) forwarderId = messageInfo.forward_info.origin.chat_id

            if (forwarderId) chatIds.push(forwarderId)

            const chatInfoPromise = chatIds.map(getChat)

            Promise.allSettled(chatInfoPromise).then((chatResults) => {
              const chats = chatResults
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value)

              const chatInfo = {}
              chats.map((chat) => {
                if (chat && chat.id) {
                  chatInfo[chat.id] = chat
                }
              })

              message.chat = chatInfo[messageInfo.chat_id]
              if (messageInfo.sender_id.user_id) message.from = chatInfo[messageInfo.sender_id.user_id]
              else if (messageInfo.sender_id.chat_id) message.from = chatInfo[messageInfo.sender_id.chat_id]

              if (messageInfo.forward_info) {
                if (chatInfo[forwarderId]) {
                  if (!chatInfo[forwarderId].type) {
                    message.forward_from = chatInfo[forwarderId]
                  } else {
                    message.forward_from_chat = chatInfo[forwarderId]
                  }
                }
                if (messageInfo.forward_info.origin.sender_name) message.forward_sender_name = messageInfo.forward_info.origin.sender_name

                // forward_origin for Bot API compatibility
                const origin = messageInfo.forward_info.origin
                if (origin) {
                  const originMap = {
                    messageSenderUser: 'user',
                    messageForwardOriginUser: 'user',
                    messageSenderChat: 'chat',
                    messageForwardOriginChat: 'chat',
                    messageForwardOriginChannel: 'channel',
                    messageForwardOriginHiddenUser: 'hidden_user',
                    messageForwardOriginMessageImport: 'message_import'
                  }
                  message.forward_origin = {
                    type: originMap[origin._] || 'unknown',
                    date: messageInfo.forward_info.date
                  }
                  if (chatInfo[forwarderId]) {
                    if (message.forward_origin.type === 'user') message.forward_origin.sender_user = chatInfo[forwarderId]
                    else if (message.forward_origin.type === 'channel') message.forward_origin.chat = chatInfo[forwarderId]
                    else message.forward_origin.sender_chat = chatInfo[forwarderId]
                  }
                  if (origin.sender_name) message.forward_origin.sender_user_name = origin.sender_name
                  if (origin.author_signature) message.forward_origin.author_signature = origin.author_signature
                }
              }

              // sender_tag / author_signature — user role or channel signature
              // TDLib may expose sender_tag in newer versions; author_signature is the standard field
              if (messageInfo.sender_tag) message.sender_tag = messageInfo.sender_tag
              else if (messageInfo.author_signature) message.sender_tag = messageInfo.author_signature
              if (messageInfo.author_signature) message.author_signature = messageInfo.author_signature

              let entities

              if (messageInfo.content.text) {
                message.text = messageInfo.content.text.text
                entities = messageInfo.content.text.entities
              } else if (messageInfo.content) {
                // Maps TDLib content discriminators to Bot-API-compatible field
                // names. Handlers downstream read messages in Bot API shape, so
                // we normalize here. Extending this map to new types requires
                // a matching branch below to build the per-type `media` payload.
                const mediaType = {
                  messageText: 'text',
                  messagePhoto: 'photo',
                  messageSticker: 'sticker',
                  messageVoiceNote: 'voice',
                  messageVideo: 'video',
                  messageAnimation: 'animation',
                  messageDocument: 'document',
                  messageAudio: 'audio',
                  messageVideoNote: 'video_note'
                }

                const type = mediaType[messageInfo.content._]

                // Normalize a TDLib Thumbnail into the PhotoSize-shaped field
                // the Bot API exposes. Returns undefined if no thumbnail is set.
                const buildThumb = (thumb) => {
                  if (!thumb || !thumb.file) return undefined
                  return {
                    file_id: thumb.file.remote.id,
                    file_unique_id: thumb.file.remote.unique_id,
                    file_size: thumb.file.size
                  }
                }

                if (type) {
                  let media

                  if (type === 'text') {
                    message.text = messageInfo.content.text.text
                    entities = messageInfo.content.text.entities
                  } else if (type === 'voice') {
                    const { voice_note } = messageInfo.content
                    const waveform = decodeWaveform(Buffer.from(voice_note.waveform, 'base64'))

                    media = {
                      file_id: voice_note.voice.remote.id,
                      waveform,
                      duration: voice_note.duration
                    }
                  } else if (type === 'photo' && messageInfo.content.photo.sizes) {
                    media = messageInfo.content.photo.sizes.map((size) => ({
                      file_id: size.photo.remote.id,
                      file_unique_id: size.photo.remote.unique_id,
                      file_size: size.photo.size,
                      height: size.height,
                      width: size.width
                    }))
                  } else if (type === 'sticker') {
                    const sticker = messageInfo.content.sticker
                    media = {
                      file_id: sticker.sticker.remote.id,
                      is_animated: sticker.format._ === 'stickerFormatTgs',
                      is_video: sticker.format._ === 'stickerFormatWebm',
                      // Keep `thumb` for existing downstream code; also expose
                      // `thumbnail` for Bot API 6.4+ parity.
                      thumb: sticker.thumbnail ? { file_id: sticker.thumbnail.file.remote.id } : undefined,
                      thumbnail: buildThumb(sticker.thumbnail)
                    }
                  } else if (type === 'video' || type === 'animation') {
                    const obj = messageInfo.content[type]
                    const inner = obj[type]
                    media = {
                      thumbnail: buildThumb(obj.thumbnail)
                    }
                    if (inner?.remote) {
                      media.file_id = inner.remote.id
                      media.file_unique_id = inner.remote.unique_id
                      media.file_size = inner.size
                    }
                    if (typeof obj.width === 'number') media.width = obj.width
                    if (typeof obj.height === 'number') media.height = obj.height
                    if (typeof obj.duration === 'number') media.duration = obj.duration
                  } else if (type === 'document' || type === 'audio' || type === 'video_note') {
                    const obj = messageInfo.content[type]
                    media = {
                      thumbnail: buildThumb(obj.thumbnail)
                    }
                    // Inner file field name differs: document.document, audio.audio,
                    // video_note.video — all remote.id.
                    const innerKey = type === 'video_note' ? 'video' : type
                    const inner = obj[innerKey]
                    if (inner?.remote) {
                      media.file_id = inner.remote.id
                      media.file_unique_id = inner.remote.unique_id
                      media.file_size = inner.size
                    }
                    if (typeof obj.duration === 'number') media.duration = obj.duration
                    if (typeof obj.length === 'number') media.length = obj.length
                    if (obj.file_name) media.file_name = obj.file_name
                    if (obj.mime_type) media.mime_type = obj.mime_type
                  } else {
                    // Fallback: old generic path, kept so unknown-but-mapped
                    // types don't silently become unsupportedMessage.
                    const obj = messageInfo.content[type]
                    media = {
                      file_id: obj[type]?.remote?.id,
                      file_unique_id: obj[type]?.remote?.unique_id,
                      file_size: obj[type]?.size,
                      height: obj.height,
                      width: obj.width
                    }
                  }

                  message[type] = media
                } else {
                  message.unsupportedMessage = true
                }

                if (messageInfo.content.caption) {
                  message.caption = messageInfo.content.caption.text
                  if (messageInfo.content.caption.entities) entities = messageInfo.content.caption.entities
                }
              }

              if (entities) {
                const entitiesFormat = entities.map((entityInfo) => {
                  const typeMap = {
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
                    textEntityTypePreCode: 'pre_code',
                    textEntityTypeTextUrl: 'text_link',
                    textEntityTypeMentionName: 'text_mention',
                    textEntityTypePhoneNumber: 'phone_number',
                    textEntityTypeSpoiler: 'spoiler',
                    textEntityTypeCustomEmoji: 'custom_emoji'
                  }

                  const entity = {
                    length: entityInfo.length,
                    offset: entityInfo.offset,
                    type: typeMap[entityInfo.type._]
                  }

                  if (entity.type === 'text_link') entity.url = entityInfo.type.url
                  // Bot API text_mention exposes user as `{ id, first_name, ... }`;
                  // TDLib gives just the user_id. Wrap it so downstream (webapp
                  // entity-text) can read `e.user?.id` uniformly.
                  if (entity.type === 'text_mention') entity.user = { id: entityInfo.type.user_id }
                  if (entity.type === 'custom_emoji') entity.custom_emoji_id = entityInfo.type.custom_emoji_id

                  return entity
                })

                if (message.caption) {
                  message.caption_entities = entitiesFormat
                } else {
                  message.entities = entitiesFormat
                }
              }

              resolve(message)
            })
          })
        })
      })

      Promise.allSettled(messages).then((messageResults) => {
        const successfulMessages = messageResults
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => result.value)

        resolve(successfulMessages)
      })
    }).catch((error) => {
      console.error(error)
      reject(error)
    })
  })
}

module.exports = {
  getMessages,
  getUser,
  reconnect: () => {
    console.log('Manual TDLib reconnect triggered')
    reconnectAttempts = 0 // Reset attempts counter
    reconnectClient()
  },
  isHealthy: () => {
    return client !== null && !isConnecting && reconnectAttempts < MAX_RECONNECT_ATTEMPTS
  }
}
