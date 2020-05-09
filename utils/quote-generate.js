const fs = require('fs')
const { createCanvas, registerFont } = require('canvas')
const EmojiDbLib = require('emoji-db')
const loadCanvasImage = require('./canvas-image-load')
const runes = require('runes')
const { Telegram } = require('telegraf')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })

function loadFont () {
  console.log('font load start')
  const fontsDir = 'assets/fonts/'

  fs.readdir(fontsDir, (_err, files) => {
    files.forEach((file) => {
      try {
        registerFont(`${fontsDir}${file}`, { family: file })
      } catch (error) {
        console.error(`${fontsDir}${file} not font file`)
      }
    })
  })

  console.log('font load end')
}

loadFont()

const { emojiImageJson } = require('../helpers/')

const LRU = require('lru-cache')

const telegram = new Telegram(process.env.BOT_TOKEN)
const avatarCache = new LRU({
  max: 20,
  maxAge: 1000 * 60 * 5
})

const avatarImageLatters = async (letters, color) => {
  const size = 500
  const canvas = createCanvas(size, size)
  const context = canvas.getContext('2d')

  color = color || '#' + (Math.random() * 0xFFFFFF << 0).toString(16)

  context.fillStyle = color
  context.fillRect(0, 0, canvas.width, canvas.height)
  const drawLetters = await drawMultilineText(letters, null, size / 2, '#FFF', 0, size, size * 5, size * 5)
  context.drawImage(drawLetters, (canvas.width - drawLetters.width) / 2, (canvas.height - drawLetters.height) / 1.5)

  return canvas.toBuffer()
}

const downloadAvatarImage = async (user) => {
  let avatarImage

  const nameLatters = runes(user.first_name || user.name)[0] + (user.last_name ? runes(user.last_name || '')[0] : '')

  const cacheKey = user.id

  const avatarImageCache = avatarCache.get(cacheKey)

  const avatarColorArray = [
    '#c03d33',
    '#4fad2d',
    '#d09306',
    '#168acd',
    '#8544d6',
    '#cd4073',
    '#2996ad',
    '#ce671b'
  ]

  const colorMapId = [0, 7, 4, 1, 6, 3, 5]
  const nameIndex = Math.abs(user.id) % 7

  const avatarColor = avatarColorArray[colorMapId[nameIndex]]

  if (avatarImageCache) {
    avatarImage = avatarImageCache
  } else {
    try {
      let userPhoto
      let userPhotoUrl = await avatarImageLatters(nameLatters, avatarColor)

      const getChat = await telegram.getChat(user.id).catch(() => {})
      if (getChat && getChat.photo && getChat.photo.small_file_id) userPhoto = getChat.photo.small_file_id

      if (userPhoto) userPhotoUrl = await telegram.getFileLink(userPhoto)
      else if (user.username) userPhotoUrl = `https://telega.one/i/userpic/320/${user.username}.jpg`

      avatarImage = await loadCanvasImage(userPhotoUrl)

      avatarCache.set(cacheKey, avatarImage)
    } catch (error) {
      avatarImage = await loadCanvasImage(await avatarImageLatters(nameLatters, avatarColor))
    }
  }

  return avatarImage
}

// https://codepen.io/andreaswik/pen/YjJqpK
function lightOrDark (color) {
  let r, g, b

  // Check the format of the color, HEX or RGB?
  if (color.match(/^rgb/)) {
    // If HEX --> store the red, green, blue values in separate variables
    color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/)

    r = color[1]
    g = color[2]
    b = color[3]
  } else {
    // If RGB --> Convert it to HEX: http://gist.github.com/983661
    color = +('0x' + color.slice(1).replace(
      color.length < 5 && /./g, '$&$&'
    )
    )

    r = color >> 16
    g = color >> 8 & 255
    b = color & 255
  }

  // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
  const hsp = Math.sqrt(
    0.299 * (r * r) +
    0.587 * (g * g) +
    0.114 * (b * b)
  )

  // Using the HSP value, determine whether the color is light or dark
  if (hsp > 127.5) {
    return 'light'
  } else {
    return 'dark'
  }
}

async function drawMultilineText (text, entities, fontSize, fontColor, textX, textY, maxWidth, maxHeight) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const canvas = createCanvas(maxWidth + fontSize, maxHeight + fontSize)
    const canvasCtx = canvas.getContext('2d')

    text = text.slice(0, 4096)
    text = text.replace(/і/g, 'i')
    const chars = text.split('')

    const lineHeight = 4 * (fontSize * 0.3)

    const styledChar = []

    const emojis = emojiDb.searchFromText({ input: text, fixCodePoints: true })

    for (let charIndex = 0; charIndex < chars.length; charIndex++) {
      const char = chars[charIndex]

      styledChar[charIndex] = {
        char,
        style: []
      }

      if (entities && typeof entities === 'string') styledChar[charIndex].style.push(entities)
    }

    if (entities && typeof entities === 'object') {
      for (let entityIndex = 0; entityIndex < entities.length; entityIndex++) {
        const entity = entities[entityIndex]
        const style = []

        if (entity.type === 'bold') style.push('bold')
        if (entity.type === 'italic') style.push('italic')
        if (entity.type === 'strikethrough') style.push('strikethrough')
        if (entity.type === 'underline') style.push('underline')
        if (['pre', 'code'].includes(entity.type)) {
          style.push('monospace')
        }
        if (['mention', 'text_mention', 'hashtag', 'email', 'phone_number', 'bot_command', 'url', 'text_link'].includes(entity.type)) style.push('mention')

        for (let charIndex = entity.offset; charIndex < entity.offset + entity.length; charIndex++) {
          styledChar[charIndex].style = styledChar[charIndex].style.concat(style)
        }
      }
    }

    for (let emojiIndex = 0; emojiIndex < emojis.length; emojiIndex++) {
      const emoji = emojis[emojiIndex]

      for (let charIndex = emoji.offset; charIndex < emoji.offset + emoji.length; charIndex++) {
        styledChar[charIndex].emoji = {
          index: emojiIndex,
          code: emoji.found
        }
      }
    }

    const styledWords = []

    let stringNum = 0

    const breakMatch = /<br>|\n|\r/
    const spaceMatch = /[\f\n\r\t\v\u0020\u1680\u2000-\u200a\u2028\u2029\u205f\u3000]/

    for (let index = 0; index < styledChar.length; index++) {
      const charStyle = styledChar[index]
      const lastChar = styledChar[index - 1]

      if (
        lastChar && (
          (
            (charStyle.emoji && !lastChar.emoji) ||
              (!charStyle.emoji && lastChar.emoji) ||
              (charStyle.emoji && lastChar.emoji && charStyle.emoji.index !== lastChar.emoji.index)
          ) ||
            (
              (charStyle.char.match(breakMatch)) ||
              (charStyle.char.match(spaceMatch) && !lastChar.char.match(spaceMatch)) ||
              (lastChar.char.match(spaceMatch) && !charStyle.char.match(spaceMatch)) ||
              (charStyle.style && lastChar.style && charStyle.style.toString() !== lastChar.style.toString())
            )
        )
      ) {
        stringNum++
      }

      if (!styledWords[stringNum]) {
        styledWords[stringNum] = {
          word: charStyle.char
        }

        if (charStyle.style) styledWords[stringNum].style = charStyle.style
        if (charStyle.emoji) styledWords[stringNum].emoji = charStyle.emoji
      } else styledWords[stringNum].word += charStyle.char
    }

    let lineX = textX
    let lineY = textY

    let textWidth = 0

    let breakWrite = false
    for (let index = 0; index < styledWords.length; index++) {
      const styledWord = styledWords[index]

      let emojiImage

      if (styledWord.emoji) {
        if (emojiImageJson && emojiImageJson[styledWord.emoji.code]) {
          emojiImage = await loadCanvasImage(Buffer.from(emojiImageJson[styledWord.emoji.code], 'base64'))
        } else {
          const emojiDataDir = 'assets/emojis/'
          const emojiPng = `${emojiDataDir}${styledWord.emoji.code}.png`

          try {
            emojiImage = await loadCanvasImage(emojiPng)
          } catch (error) {
          }
        }
      }

      let fontType = ''
      let fontName = 'NotoSansDisplay, NotoSans'
      let fillStyle = fontColor

      if (styledWord.style.includes('bold')) {
        fontType += 'bold '
      }
      if (styledWord.style.includes('italic')) {
        fontType += 'italic '
      }
      if (styledWord.style.includes('monospace')) {
        fontName = 'NotoSansMono, NotoSans'
        fillStyle = '#5887a7'
      }
      if (styledWord.style.includes('mention')) {
        fillStyle = '#6ab7ec'
      }
      // else {
      //   canvasCtx.font = `${fontSize}px OpenSans`
      //   canvasCtx.fillStyle = fontColor
      // }

      canvasCtx.font = `${fontType} ${fontSize}px ${fontName}`
      canvasCtx.fillStyle = fillStyle

      if (canvasCtx.measureText(styledWord.word).width > maxWidth - fontSize * 3) {
        while (canvasCtx.measureText(styledWord.word).width > maxWidth - fontSize * 3) {
          styledWord.word = styledWord.word.substr(0, styledWord.word.length - 1)
          if (styledWord.word.length <= 0) break
        }
        styledWord.word += '…'
      }

      let lineWidth
      const wordlWidth = canvasCtx.measureText(styledWord.word).width

      if (styledWord.emoji) lineWidth = lineX + fontSize
      else lineWidth = lineX + wordlWidth

      if (styledWord.word.match(breakMatch) || (lineWidth > maxWidth - fontSize * 2 && wordlWidth < maxWidth)) {
        if (styledWord.word.match(spaceMatch) && !styledWord.word.match(breakMatch)) styledWord.word = ''
        if ((styledWord.word.match(spaceMatch) || !styledWord.word.match(breakMatch)) && lineY + lineHeight > maxHeight) {
          while (lineWidth > maxWidth - fontSize * 2) {
            styledWord.word = styledWord.word.substr(0, styledWord.word.length - 1)
            lineWidth = lineX + canvasCtx.measureText(styledWord.word).width
            if (styledWord.word.length <= 0) break
          }

          styledWord.word += '…'
          lineWidth = lineX + canvasCtx.measureText(styledWord.word).width
          breakWrite = true
        } else {
          if (styledWord.emoji) lineWidth = textX + fontSize + (fontSize * 0.15)
          else lineWidth = textX + canvasCtx.measureText(styledWord.word).width

          lineX = textX
          lineY += lineHeight
        }
      }

      if (lineWidth > textWidth) textWidth = lineWidth
      if (textWidth > maxWidth) textWidth = maxWidth

      if (emojiImage) {
        canvasCtx.drawImage(emojiImage, lineX, lineY - fontSize + (fontSize * 0.15), fontSize, fontSize)
      } else {
        canvasCtx.fillText(styledWord.word, lineX, lineY)

        if (styledWord.style.includes('strikethrough')) canvasCtx.fillRect(lineX, lineY - fontSize / 2.8, canvasCtx.measureText(styledWord.word).width, fontSize * 0.1)
        if (styledWord.style.includes('underline')) canvasCtx.fillRect(lineX, lineY + 2, canvasCtx.measureText(styledWord.word).width, fontSize * 0.1)
      }

      lineX = lineWidth

      if (breakWrite) break
    }

    const canvasResize = createCanvas(textWidth, lineY + fontSize)
    const canvasResizeCtx = canvasResize.getContext('2d')

    canvasResizeCtx.drawImage(canvas, 0, 0)

    resolve(canvasResize)
  })
}

// https://stackoverflow.com/a/3368118
function drawRoundRect (color, width, height, radius, fill, stroke) {
  const x = 0
  const y = 0

  const canvas = createCanvas(width, height)
  const canvasCtx = canvas.getContext('2d')

  canvasCtx.fillStyle = color

  if (typeof stroke === 'undefined') {
    stroke = true
  }
  if (typeof radius === 'undefined') {
    radius = 5
  }
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius }
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 }

    for (const side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side]
    }
  }
  canvasCtx.beginPath()
  canvasCtx.moveTo(x + radius.tl, y)
  canvasCtx.lineTo(x + width - radius.tr, y)
  canvasCtx.quadraticCurveTo(x + width, y, x + width, y + radius.tr)
  canvasCtx.lineTo(x + width, y + height - radius.br)
  canvasCtx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height)
  canvasCtx.lineTo(x + radius.bl, y + height)
  canvasCtx.quadraticCurveTo(x, y + height, x, y + height - radius.bl)
  canvasCtx.lineTo(x, y + radius.tl)
  canvasCtx.quadraticCurveTo(x, y, x + radius.tl, y)
  canvasCtx.closePath()
  if (fill) {
    canvasCtx.fill()
  }
  if (stroke) {
    canvasCtx.stroke()
  }

  return canvas
}

function deawReplyLine (lineWidth, height, color) {
  const canvas = createCanvas(20, height)
  const context = canvas.getContext('2d')
  context.beginPath()
  context.moveTo(10, 0)
  context.lineTo(10, height)
  context.lineWidth = lineWidth
  context.strokeStyle = color
  context.stroke()

  return canvas
}

async function drawAvatar (user) {
  const avatar = await downloadAvatarImage(user)

  const avatarSize = avatar.naturalHeight

  const canvas = createCanvas(avatarSize, avatarSize)
  const canvasCtx = canvas.getContext('2d')

  const avatarX = 0
  const avatarY = 0

  canvasCtx.beginPath()
  canvasCtx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true)
  canvasCtx.clip()
  canvasCtx.closePath()
  canvasCtx.restore()
  canvasCtx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)

  return canvas
}

async function drawQuote (scale = 1, backgroundColor, avatar, replyName, replyText, name, text) {
  const blockPosX = 55 * scale
  const blockPosY = 0

  const indent = 15 * scale

  const avatarPosX = 0
  const avatarPosY = 15
  const avatarSize = 50 * scale

  let width = 0
  if (name) width = name.width
  if (width < text.width) width = text.width + indent
  if (replyName) {
    if (width < replyName.width) width = replyName.width + indent
    if (width < replyText.width) width = replyText.width + indent
  }

  let height = text.height + indent
  if (name) height = name.height + text.height

  width += blockPosX + (indent * 2)
  height += blockPosY

  let namePosX = blockPosX + indent
  let namePosY = indent

  if (!name) {
    namePosX = 0
    namePosY = -indent
  }

  const textPosX = blockPosX + indent
  let textPosY = indent
  if (name) textPosY = name.height

  let replyPosX = 0
  let replyNamePosY = 0
  let replyTextPosY = 0

  if (replyName) {
    replyPosX = textPosX + 15 * scale

    const replyNameHeight = replyName.height * 1.2
    const replyTextHeight = replyText.height * 0.5

    replyNamePosY = namePosY + replyNameHeight
    replyTextPosY = replyNamePosY + replyTextHeight

    textPosY += replyNameHeight + replyTextHeight
    height += replyNameHeight + replyTextHeight
  }

  const canvas = createCanvas(width, height)
  const canvasCtx = canvas.getContext('2d')

  const rectWidth = width - blockPosX
  const rectHeight = height
  const rectPosX = blockPosX
  const rectPosY = blockPosY
  const rectRoundRadius = 25 * scale

  const rect = drawRoundRect(backgroundColor, rectWidth, rectHeight, rectRoundRadius, '#fff', false)

  if (avatar) canvasCtx.drawImage(avatar, avatarPosX, avatarPosY, avatarSize, avatarSize)
  if (rect) canvasCtx.drawImage(rect, rectPosX, rectPosY)
  if (name) canvasCtx.drawImage(name, namePosX, namePosY)
  if (text) canvasCtx.drawImage(text, textPosX, textPosY)

  if (replyName) {
    const backStyle = lightOrDark(backgroundColor)
    let lineColor = '#fff'
    if (backStyle === 'light') lineColor = '#000'
    canvasCtx.drawImage(deawReplyLine(3 * scale, replyName.height + replyText.height * 0.4, lineColor), textPosX, replyNamePosY)

    canvasCtx.drawImage(replyName, replyPosX, replyNamePosY)
    canvasCtx.drawImage(replyText, replyPosX, replyTextPosY)
  }

  return canvas
}

const normalizeColor = (color) => {
  const canvas = createCanvas(0, 0)
  const canvasCtx = canvas.getContext('2d')

  canvasCtx.fillStyle = color
  color = canvasCtx.fillStyle

  return color
}

module.exports = async (backgroundColor, message, replyMessage, entities, width = 512, height = 512, scale = 2) => {
  width *= scale
  height *= scale

  backgroundColor = normalizeColor(backgroundColor)

  // check background style color black/light
  const backStyle = lightOrDark(backgroundColor)

  // defsult color from tdesktop
  // https://github.com/telegramdesktop/tdesktop/blob/67d08c2d4064e04bec37454b5b32c5c6e606420a/Telegram/SourceFiles/data/data_peer.cpp#L43
  // const nameColor = [
  //   '#c03d33',
  //   '#4fad2d',
  //   '#d09306',
  //   '#168acd',
  //   '#8544d6',
  //   '#cd4073',
  //   '#2996ad',
  //   '#ce671b'
  // ]

  // name light style color
  const nameColorLight = [
    '#862a23',
    '#37791f',
    '#916604',
    '#0f608f',
    '#5d2f95',
    '#8f2c50',
    '#1c6979',
    '#904812'
  ]

  // name dark style color
  const nameColorDark = [
    '#fb6169',
    '#85de85',
    '#f3bc5c',
    '#65bdf3',
    '#b48bf2',
    '#ff5694',
    '#62d4e3',
    '#faa357'
  ]

  // user name  color
  // https://github.com/telegramdesktop/tdesktop/blob/67d08c2d4064e04bec37454b5b32c5c6e606420a/Telegram/SourceFiles/data/data_peer.cpp#L43
  const nameMap = [0, 7, 4, 1, 6, 3, 5]

  const nameIndex = Math.abs(message.chatId) % 7

  const nameColorIndex = nameMap[nameIndex]
  const nameColorPalette = backStyle === 'light' ? nameColorLight : nameColorDark

  const nameColor = nameColorPalette[nameColorIndex]

  const nameSize = 22 * scale

  let nameCanvas
  if (message.name) nameCanvas = await drawMultilineText(message.name, 'bold', nameSize, nameColor, 0, nameSize, width, nameSize)

  // const minFontSize = 18
  // const maxFontSize = 28

  // let fontSize = 25 / ((text.length / 10) * 0.2)

  // if (fontSize < minFontSize) fontSize = minFontSize
  // if (fontSize > maxFontSize) fontSize = maxFontSize

  const fontSize = 24 * scale

  let textColor = '#fff'
  if (backStyle === 'light') textColor = '#000'

  const drawTextCanvas = await drawMultilineText(message.text, entities, fontSize, textColor, 0, fontSize, width, height - fontSize)

  let avatarCanvas
  if (message.avatar) avatarCanvas = await drawAvatar(message.from)

  let replyName, replyText
  if (replyMessage.name && replyMessage.text) {
    const replyNameIndex = Math.abs(replyMessage.chatId) % 7
    let replyNameColor = nameColorDark[nameMap[replyNameIndex]]
    if (backStyle === 'light') replyNameColor = nameColorLight[nameMap[replyNameIndex]]

    const replyNameFontSize = 16 * scale
    if (replyMessage.name) replyName = await drawMultilineText(replyMessage.name, 'bold', replyNameFontSize, replyNameColor, 0, replyNameFontSize, width * 0.9, replyNameFontSize)

    let textColor = '#fff'
    if (backStyle === 'light') textColor = '#000'

    const replyTextFontSize = 21 * scale
    replyText = await drawMultilineText(replyMessage.text, null, replyTextFontSize, textColor, 0, replyTextFontSize, width * 0.9, replyTextFontSize)
  }

  const quote = drawQuote(
    scale,
    backgroundColor,
    avatarCanvas,
    replyName, replyText,
    nameCanvas, drawTextCanvas
  )

  return quote
}
