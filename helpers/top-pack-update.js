const Telegram = require('telegraf/telegram')
const https = require('https')
const Stream = require('stream').Transform
const sharp = require('sharp')

const telegram = new Telegram(process.env.BOT_TOKEN)

const arrayMove = (arr, oldIndex, newIndex) => {
  if (oldIndex >= arr.length) {
    let k = newIndex - arr.length + 1
    while (k--) {
      arr.push(undefined)
    }
  }
  arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0])
  return arr // for testing
}

const downloadFileByUrl = (fileUrl) => new Promise((resolve, reject) => {
  const data = new Stream()

  https.get(fileUrl, (response) => {
    response.on('data', (chunk) => {
      data.push(chunk)
    })

    response.on('end', () => {
      resolve(data)
    })
  }).on('error', reject)
})

module.exports = async (db, group) => {
  if (group.topSet && group.topSet.lastUpdate && (Date.now() - group.topSet.lastUpdate.getTime()) < 60 * 60) return

  group.topSet.lastUpdate = new Date()
  await group.save()

  const topQuote = await db.Quote.find({
    group,
    'rate.score': { $gt: 0 }
  }).sort({
    'rate.score': -1
  }).limit(50)

  for (const sticker of group.topSet.stickers) {
    const quote = await topQuote.find((quote) => quote.id.toString() === sticker.quote.id.toString())
    if (!quote) {
      telegram.deleteStickerFromSet(sticker.fileId)
      group.topSet.stickers.pull(sticker)
    }
  }

  if (!group.topSet.stickers) group.topSet.stickers = []

  for (const index in topQuote) {
    const quote = topQuote[index]
    if (!group.topSet.stickers[index] || quote.id !== group.topSet.stickers[index].quote.toString()) {
      const quoteIndex = await group.topSet.stickers.findIndex((s) => s.quote.id.toString() === quote.id.toString())

      if (quoteIndex < 0) {
        const fileUrl = await telegram.getFileLink(quote.file_id)
        const data = await downloadFileByUrl(fileUrl)
        const imageSharp = sharp(data.read())

        const stickerPNG = await imageSharp.webp({ quality: 100 }).png({ compressionLevel: 9, force: false }).toBuffer()

        let stickerAdd = false
        const emojis = '🌟'

        const chatAdministrators = await telegram.getChatAdministrators(group.group_id)
        let chatAdministrator

        chatAdministrators.forEach((administrator) => {
          if (administrator.status === 'creator') chatAdministrator = administrator.user
        })

        if (!group.topSet.name) {
          const getMe = await telegram.getMe()

          const packName = `tq${Math.random().toString(36).substring(5)}_${Math.abs(group.group_id)}_by_${getMe.username}`
          const packTitle = `${group.title.substring(0, 30)} top quote by @${getMe.username}`

          stickerAdd = await telegram.createNewStickerSet(chatAdministrator.id, packName, packTitle, {
            png_sticker: { source: stickerPNG },
            emojis
          }).catch((error) => {
            console.error(error)
          })

          if (stickerAdd) {
            group.topSet.name = packName
            group.topSet.create = true
          }
        } else {
          stickerAdd = await telegram.addStickerToSet(chatAdministrator.id, group.topSet.name, {
            png_sticker: { source: stickerPNG },
            emojis
          }).catch((error) => {
            console.error(error)
            if (error.description === 'Bad Request: STICKERSET_INVALID') {
              group.topSet = undefined
              delete group.topSet
            }
          })
        }

        if (stickerAdd) {
          const getStickerSet = await telegram.getStickerSet(group.topSet.name)
          const stickerInfo = getStickerSet.stickers.slice(-1)[0]

          group.topSet.stickers.push({
            quote,
            fileId: stickerInfo.file_id,
            fileUniqueId: stickerInfo.file_unique_id
          })
        }
      } else {
        arrayMove(group.topSet.stickers, quoteIndex, index)
        telegram.setStickerPositionInSet(group.topSet.stickers[index].fileId, index)
      }
    }
  }

  await group.save()
}
