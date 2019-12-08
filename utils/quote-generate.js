const fs = require('fs')
const { createCanvas, registerFont } = require('canvas')
const loadImageFromUrl = require('./image-load-url')
const EmojiDbLib = require('emoji-db')
const loadCanvasImage = require('./canvas-image-load')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })

const fontsDir = 'assets/fonts/'
const emojiDataDir = 'assets/emojis/'

fs.readdir(fontsDir, (_err, files) => {
  files.forEach((file) => {
    try {
      registerFont(`${fontsDir}${file}`, { family: file })
    } catch (error) {
      console.error(`${fontsDir}${file} not font file`)
    }
  })
})

async function downloadEmoji () {
  const dbData = emojiDb.dbData

  Object.keys(dbData).map(async (key) => {
    const emoji = dbData[key]

    if (emoji.image) {
      const fileName = `${emoji.code}.png`
      if (!fs.existsSync(`${emojiDataDir}${fileName}`)) {
        const fileUrl = `https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/apple/232/${emoji.image.file_name}`

        const img = await loadImageFromUrl(fileUrl)

        fs.writeFile(`${emojiDataDir}${fileName}`, img, (err) => {
          if (err) return console.log(err)
        })
      }
    }
  })
}

downloadEmoji()

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

function drawMultilineText (text, entities, fontSize, fontColor, textX, textY, maxWidth, maxHeight) {
  return new Promise(async (resolve, reject) => {
    const canvas = createCanvas(maxWidth + fontSize, maxHeight + fontSize)
    const canvasСtx = canvas.getContext('2d')

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
        if (['pre', 'code'].includes(entity.type)) {
          style.push('monospace')
        }
        if (['mention', 'text_mention', 'hashtag', 'email', 'phone_number', 'bot_command', 'url', 'text_link'].includes(entity.type)) style.push('mention')

        for (let charIndex = entity.offset; charIndex < entity.offset + entity.length; charIndex++) {
          styledChar[charIndex].style = style
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
    const spaceMatch = /\s/

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
        const emojiPng = `${emojiDataDir}${styledWord.emoji.code}.png`

        try {
          emojiImage = await loadCanvasImage(emojiPng)
        } catch (error) {
        }
      }

      if (styledWord.style.includes('bold')) {
        canvasСtx.font = `bold ${fontSize}px OpenSans`
        canvasСtx.fillStyle = fontColor
      } else if (styledWord.style.includes('italic')) {
        canvasСtx.font = `italic ${fontSize}px OpenSans`
        canvasСtx.fillStyle = fontColor
      } else if (styledWord.style.includes('monospace')) {
        canvasСtx.font = `${fontSize}px monospace`
        canvasСtx.fillStyle = '#5887a7'
      } else if (styledWord.style.includes('mention')) {
        canvasСtx.font = `${fontSize}px mention`
        canvasСtx.fillStyle = '#6ab7ec'
      } else {
        canvasСtx.font = `${fontSize}px OpenSans`
        canvasСtx.fillStyle = fontColor
      }

      if (canvasСtx.measureText(styledWord.word).width > maxWidth - fontSize) {
        while (canvasСtx.measureText(styledWord.word).width > maxWidth - fontSize * 2) {
          styledWord.word = styledWord.word.substr(0, styledWord.word.length - 1)
          if (styledWord.word.length <= 0) break
        }
        styledWord.word += '…'
      }

      let lineWidth
      let wordlWidth = canvasСtx.measureText(styledWord.word).width

      if (styledWord.emoji) lineWidth = lineX + fontSize + (fontSize * 0.15)
      else lineWidth = lineX + wordlWidth

      if (styledWord.word.match(breakMatch) || (lineWidth > maxWidth - fontSize * 2 && wordlWidth < maxWidth)) {
        if (styledWord.word.match(spaceMatch)) styledWord.word = ''
        if (!styledWord.word.match(breakMatch) && lineY + lineHeight > maxHeight) {
          while (lineWidth > maxWidth - fontSize * 2) {
            styledWord.word = styledWord.word.substr(0, styledWord.word.length - 1)
            lineWidth = lineX + canvasСtx.measureText(styledWord.word).width
            if (styledWord.word.length <= 0) break
          }

          styledWord.word += '…'
          breakWrite = true
        } else {
          if (styledWord.emoji) lineWidth = textX + fontSize + (fontSize * 0.15)
          else lineWidth = textX + canvasСtx.measureText(styledWord.word).width
          lineX = textX
          lineY += lineHeight
        }
      }

      if (lineWidth > textWidth) textWidth = lineWidth
      if (textWidth > maxWidth) textWidth = maxWidth

      if (emojiImage) {
        canvasСtx.drawImage(emojiImage, lineX, lineY - fontSize + (fontSize * 0.15), fontSize, fontSize)
      } else {
        canvasСtx.fillText(styledWord.word, lineX, lineY)
      }

      lineX = lineWidth

      if (breakWrite) break
    }

    const canvasResize = createCanvas(textWidth, lineY + fontSize)
    const canvasResizeСtx = canvasResize.getContext('2d')

    canvasResizeСtx.drawImage(canvas, 0, 0)

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

function drawAvatar (avatar) {
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

async function drawQuote (backgroundColor, avatar, nick, text, maxWidth, maxHeight) {
  const blockPosX = 75
  const blockPosY = 0

  const indent = 15

  const avatarPosX = 0
  const avatarPosY = 0
  const avatarSize = 65

  let width = 0
  if (nick) width = nick.width
  if (width < text.width) width = text.width

  let height = text.height + indent
  if (nick) height = nick.height + text.height

  width += blockPosX + (indent * 2)
  height += blockPosY

  const rectWidth = width - blockPosX
  const rectHeight = height
  const rectPosX = blockPosX
  const rectPosY = blockPosY
  const rectRoundRadius = 25

  const nickPosX = blockPosX + indent
  const nickPosY = indent

  const textPosX = blockPosX + indent
  let textPosY = indent
  if (nick) textPosY = nick.height

  const canvas = createCanvas(width, height)
  const canvasCtx = canvas.getContext('2d')

  const rect = drawRoundRect(backgroundColor, rectWidth, rectHeight, rectRoundRadius, '#fff', false)

  if (avatar) canvasCtx.drawImage(avatar, avatarPosX, avatarPosY, avatarSize, avatarSize)
  if (rect) canvasCtx.drawImage(rect, rectPosX, rectPosY)
  if (nick) canvasCtx.drawImage(nick, nickPosX, nickPosY)
  if (text) canvasCtx.drawImage(text, textPosX, textPosY)

  return canvas
}

module.exports = (avatar, backgroundColor, userId, nick, text, entities) => {
  return new Promise(async (resolve, reject) => {
    const canvas = createCanvas(0, 0)
    const canvasCtx = canvas.getContext('2d')

    canvasCtx.fillStyle = backgroundColor
    backgroundColor = canvasCtx.fillStyle

    // check background style color black/light
    const backStyle = lightOrDark(canvasCtx.fillStyle)

    const width = 512
    const height = 512

    // defsult color from tdesktop
    // https://github.com/telegramdesktop/tdesktop/blob/67d08c2d4064e04bec37454b5b32c5c6e606420a/Telegram/SourceFiles/data/data_peer.cpp#L43
    // const nickColor = [
    //   '#c03d33',
    //   '#4fad2d',
    //   '#d09306',
    //   '#168acd',
    //   '#8544d6',
    //   '#cd4073',
    //   '#2996ad',
    //   '#ce671b'
    // ]

    // nick light style color
    const nickColorLight = [
      '#862a23',
      '#37791f',
      '#916604',
      '#0f608f',
      '#5d2f95',
      '#8f2c50',
      '#1c6979',
      '#904812'
    ]

    // nick black style color
    const nickColorBlack = [
      '#fb6169',
      '#85de85',
      '#f3bc5c',
      '#65bdf3',
      '#b48bf2',
      '#ff5694',
      '#62d4e3',
      '#faa357'
    ]

    // user nick  color
    // https://github.com/telegramdesktop/tdesktop/blob/67d08c2d4064e04bec37454b5b32c5c6e606420a/Telegram/SourceFiles/data/data_peer.cpp#L43
    const nickIndex = Math.abs(userId) % 7
    const nickMap = [0, 7, 4, 1, 6, 3, 5]

    let nickColor = nickColorBlack[nickMap[nickIndex]]
    if (backStyle === 'light') nickColor = nickColorLight[nickMap[nickIndex]]

    const nickSize = 22

    let nickCanvas
    if (nick) nickCanvas = await drawMultilineText(nick, 'bold', nickSize, nickColor, 0, nickSize, width, nickSize)

    // const minFontSize = 18
    // const maxFontSize = 28

    // let fontSize = 25 / ((text.length / 10) * 0.2)

    // if (fontSize < minFontSize) fontSize = minFontSize
    // if (fontSize > maxFontSize) fontSize = maxFontSize

    const fontSize = 24

    let textColor = '#fff'
    if (backStyle === 'light') textColor = '#000'

    const drawTextCanvas = drawMultilineText(text, entities, fontSize, textColor, 0, fontSize, width, height - fontSize)

    let avatarCanvas
    if (avatar) avatarCanvas = drawAvatar(avatar)

    const quote = drawQuote(
      backgroundColor,
      avatarCanvas,
      nickCanvas, await drawTextCanvas,
      width, height
    )

    resolve(quote)
  })
}
