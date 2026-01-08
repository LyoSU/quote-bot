const { OpenAI } = require('openai')

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://quotlybot.t.me/',
    'X-Title': 'Quotly Bot'
  }
})

const hashCode = (s) => {
  const l = s.length
  let h = 0
  let i = 0
  if (l > 0) {
    while (i < l) {
      h = (h << 5) - h + s.charCodeAt(i++) | 0
    }
  }
  return h
}

const handleImageToQuoteError = async (ctx, error) => {
  console.error('Image to quote error:', error)

  if (error.response && error.response.status === 429) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.errors.rate_limit', {
      seconds: 30
    }))
  }

  if (error.message && error.message.includes('file too large')) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.file_too_large'))
  }

  if (error.message && error.message.includes('unsupported format')) {
    return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.unsupported_format'))
  }

  return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.api_error'))
}

module.exports = async (ctx, next) => {
  ctx.replyWithChatAction('typing')

  try {
    let fileId

    // Handle photo
    if (ctx.message.photo) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1] // Get highest resolution
      fileId = photo.file_id
    } else if (ctx.message.document) {
      const doc = ctx.message.document
      if (!doc.mime_type || !doc.mime_type.startsWith('image/')) {
        return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.no_image'))
      }
      if (doc.file_size > 20 * 1024 * 1024) { // 20MB limit
        return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.file_too_large'))
      }
      fileId = doc.file_id
    }

    // Get file info and download
    const fileInfo = await ctx.telegram.getFile(fileId)
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`

    // Create vision prompt
    const visionPrompt = `
You are an expert text recognition system specialized in extracting structured conversation data from messenger screenshots. Your task is to analyze the provided image and convert the visible conversation into a structured JSON format for quote generation.

EXTRACTION REQUIREMENTS:
- Identify each individual message in chronological order
- Extract clean usernames WITHOUT any status indicators, roles, badges, or timestamps
- Preserve message text content including emojis and formatting context
- Detect reply relationships: when a message is replying to a previous message
- Ignore all metadata: timestamps, online status, user roles (admin/mod), activity indicators ("last seen", "typing", etc.)
- Handle multi-language content appropriately
- Maintain conversation flow and message threading

REPLY MESSAGE CLARIFICATION:
- "text": Always contains the current user's message content
- "replyMessage": Contains the ORIGINAL message that the current message is replying TO
- If you see a reply structure (quoted text above a message), the quoted part goes in "replyMessage" and the user's response goes in "text"

OUTPUT FORMAT:
Return a valid JSON object with this exact structure:

{
  "messages": [
    {
      "from": {
        "id": unique_numeric_identifier,
        "name": "clean_username_only"
      },
      "text": "current_user_message_content",
      "replyMessage": {
        "name": "original_message_author",
        "text": "original_message_being_replied_to"
      }
    }
  ]
}

IMPORTANT RULES:
- "text" field: ALWAYS the current message author's text
- "replyMessage.text": ALWAYS the original message text that is being replied to
- Only include "replyMessage" field if the message is actually replying to another message
- Generate consistent numeric IDs for the same user across messages
- Strip ALL status indicators from usernames (online/offline, roles, timestamps, badges)
- Preserve exact message text including emojis and special characters
- Handle various messenger interfaces (Telegram, WhatsApp, Discord, etc.)
- If image quality is poor or no conversation is detected, return: {"error": "Unable to extract conversation data"}

Focus on accuracy and clean data extraction. Prioritize message content and user identification over metadata.
`

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash-preview-09-2025',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: visionPrompt
            },
            {
              type: 'image_url',
              image_url: {
                url: fileUrl,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    })

    if (!completion || !completion.choices || !completion.choices.length) {
      throw new Error('No response from OpenAI Vision API')
    }

    const responseText = completion.choices[0].message && completion.choices[0].message.content
    if (!responseText) {
      throw new Error('Empty response from OpenAI Vision API')
    }

    // Parse JSON response
    let parsedResponse
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.parse_error'))
    }

    // Check for error response
    if (parsedResponse.error) {
      return next()
    }

    // Validate response structure
    if (!parsedResponse.messages || !Array.isArray(parsedResponse.messages) || parsedResponse.messages.length === 0) {
      return ctx.replyWithHTML(ctx.i18n.t('quote.image_to_quote.errors.no_text_found'))
    }

    // Process messages and generate quote
    const quoteMessages = parsedResponse.messages.map((msg, index) => {
      // Ensure we have a valid user ID (number)
      let userId = msg.from && msg.from.id
      if (!userId || typeof userId !== 'number') {
        userId = hashCode((msg.from && msg.from.name) || `user_${index}`)
      }

      // Determine if should show avatar
      let showAvatar = true
      if (index > 0) {
        // Get previous message user ID
        const prevMsg = parsedResponse.messages[index - 1]
        let prevUserId = prevMsg.from && prevMsg.from.id
        if (!prevUserId || typeof prevUserId !== 'number') {
          prevUserId = hashCode((prevMsg.from && prevMsg.from.name) || `user_${index - 1}`)
        }

        // If same user as previous message, don't show avatar
        if (userId === prevUserId) {
          showAvatar = false
        }
      }

      const messageData = {
        from: {
          id: userId
        },
        text: msg.text || '',
        avatar: showAvatar
      }

      // Only add name if showing avatar
      if (showAvatar) {
        messageData.from.name = (msg.from && msg.from.name) || `user_${index}`
      }

      // Add reply message if present
      if (msg.replyMessage && msg.replyMessage.text) {
        messageData.replyMessage = {
          name: msg.replyMessage.name || 'unknown',
          text: msg.replyMessage.text,
          entities: msg.replyMessage.entities || [],
          chatId: hashCode(msg.replyMessage.name || 'unknown')
        }
      }

      return messageData
    })

    // Set default background
    let backgroundColor = '//#292232'

    // Check for custom background from group/user settings
    if (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.quote && ctx.group.info.settings.quote.backgroundColor) {
      backgroundColor = ctx.group.info.settings.quote.backgroundColor
    } else if (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings && ctx.session.userInfo.settings.quote && ctx.session.userInfo.settings.quote.backgroundColor) {
      backgroundColor = ctx.session.userInfo.settings.quote.backgroundColor
    }

    // Set emoji brand
    let emojiBrand = 'apple'
    if (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.quote && ctx.group.info.settings.quote.emojiBrand) {
      emojiBrand = ctx.group.info.settings.quote.emojiBrand
    } else if (ctx.session && ctx.session.userInfo && ctx.session.userInfo.settings && ctx.session.userInfo.settings.quote && ctx.session.userInfo.settings.quote.emojiBrand) {
      emojiBrand = ctx.session.userInfo.settings.quote.emojiBrand
    }

    // Quote dimensions
    const width = 512
    const height = 512 * 1.5
    const scale = 2

    // Generate quote using existing API
    const quoteApiUri = process.env.QUOTE_API_URI

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30 * 1000)

    const generate = await fetch(
      `${quoteApiUri}/generate.webp?botToken=${process.env.BOT_TOKEN}`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'quote',
          format: 'webp',
          backgroundColor,
          width,
          height,
          scale,
          messages: quoteMessages,
          emojiBrand
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      }
    ).then(async (res) => {
      clearTimeout(timeoutId)
      if (!res.ok) {
        const error = new Error(`HTTP ${res.status}`)
        error.response = { body: await res.text() }
        throw error
      }
      return { body: Buffer.from(await res.arrayBuffer()) }
    }).catch((error) => handleImageToQuoteError(ctx, error))

    if (generate.error) {
      throw generate.error
    }

    if (generate.body) {
      const image = generate.body

      // Send as sticker (like original quote functionality)
      const emojis = '📱💬'

      await ctx.replyWithSticker({
        source: image,
        filename: 'quote_from_image.webp'
      }, {
        emoji: emojis,
        reply_to_message_id: ctx.message.message_id,
        allow_sending_without_reply: true
      })
    }
  } catch (error) {
    console.error('Image to quote processing error:', error)
    return handleImageToQuoteError(ctx, error)
  }
}
