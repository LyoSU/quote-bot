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
  // Check if message has photo
  if (!ctx.message.photo && !ctx.message.document) {
    return next()
  }

  // Check if this is a command to process image
  const isImageCommand = ctx.message.caption && ctx.message.caption.match(/\/qi|\/quote_image/)

  if (!isImageCommand) {
    return next()
  }

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
Розпізнай текст з цього скріншоту переписки в месенджері і переформатуй його в JSON схему для генерації цитат.

ВАЖЛИВО:
- Визначи кожне окреме повідомлення
- Збережи імена користувачів
- Збережи структуру діалогу
- Якщо є емодзі, збережи їх
- Якщо є часові мітки, можеш їх проігнорувати

Поверни результат у форматі JSON:
{
  "messages": [
    {
      "from": {
        "id": генеруй_унікальний_числовий_id,
        "name": "Ім'я користувача"
      },
      "text": "Текст повідомлення"
    }
  ]
}

Якщо не можеш розпізнати текст або це не схоже на переписку, поверни: {"error": "Не вдалося розпізнати переписку"}
`

    // Call OpenAI Vision API
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash-lite-preview-06-17',
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
      return ctx.replyWithHTML(`❌ ${parsedResponse.error}`)
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

      return {
        from: {
          id: userId,
          name: (msg.from && msg.from.name) || `Користувач ${index + 1}`
        },
        text: msg.text || '',
        avatar: showAvatar
      }
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
    const got = require('got')
    const quoteApiUri = process.env.QUOTE_API_URI

    const generate = await got.post(
      `${quoteApiUri}/generate.webp?botToken=${process.env.BOT_TOKEN}`,
      {
        json: {
          type: 'quote',
          format: 'webp',
          backgroundColor,
          width,
          height,
          scale,
          messages: quoteMessages,
          emojiBrand
        },
        responseType: 'buffer',
        timeout: {
          request: 30 * 1000
        },
        retry: {
          limit: 2,
          methods: ['POST'],
          statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524]
        }
      }
    ).catch((error) => handleImageToQuoteError(ctx, error))

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

      // Send info message
      await ctx.replyWithHTML(
        `✅ Цитату створено з ${parsedResponse.messages.length} повідомлень!\n\n` +
        '💡 <b>Підказка:</b> Надішліть скріншот переписки з підписом <code>/qi</code> або <code>/quote_image</code> щоб створити цитату',
        {
          reply_to_message_id: ctx.message.message_id,
          allow_sending_without_reply: true
        }
      )
    }
  } catch (error) {
    console.error('Image to quote processing error:', error)
    return handleImageToQuoteError(ctx, error)
  }
}
