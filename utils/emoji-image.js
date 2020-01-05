const path = require('path')
const fs = require('fs')
const loadImageFromUrl = require('./image-load-url')
const EmojiDbLib = require('emoji-db')

const emojiDb = new EmojiDbLib({ useDefaultDb: true })

const emojiJsonFile = path.resolve(__dirname, '../assets/emoji-image.json')

let emojiImageJson = {}

try {
  if (fs.existsSync(emojiJsonFile)) emojiImageJson = require(emojiJsonFile)
} catch (error) {
}

async function downloadEmoji () {
  console.log('emoji image load start')

  const dbData = emojiDb.dbData
  const dbArray = Object.keys(dbData)
  const emojiPromiseArray = []

  dbArray.map((key) => {
    const emoji = dbData[key]

    if (!emoji.qualified && !emojiImageJson[key]) {
      emojiPromiseArray.push(new Promise((resolve, reject) => {
        const fileUrl = `${process.env.EMOJI_DOMAIN}/thumbs/60/${emoji.image.brand}/${emoji.image.folder_id}/${emoji.image.file_name}`

        loadImageFromUrl(fileUrl).then((img) => {
          const result = {
            key,
            base64: img.toString('base64')
          }

          resolve(result)
        })
      }))
    }
  })

  await Promise.all(emojiPromiseArray).then(values => {
    values.map((emojiData) => {
      emojiImageJson[emojiData.key] = emojiData.base64
    })
  })

  if (Object.keys(emojiImageJson).length > 0) {
    const emojiJson = JSON.stringify(emojiImageJson, null, 2)

    fs.writeFile(emojiJsonFile, emojiJson, (err) => {
      if (err) return console.log(err)
    })
  }

  console.log('emoji image load end')

  // const emojiDataDir = 'assets/emojis/'

  // Object.keys(dbData).map(async (key) => {
  //   const emoji = dbData[key]

  //   if (emoji.image) {
  //     const fileName = `${emoji.code}.png`
  //     if (!fs.existsSync(`${emojiDataDir}${fileName}`)) {
  //       const fileUrl = `${process.env.EMOJI_DOMAIN}/thumbs/60/${emoji.image.brand}/${emoji.image.folder_id}/${emoji.image.file_name}`

  //       const img = await loadImageFromUrl(fileUrl)

  //       fs.writeFile(`${emojiDataDir}${fileName}`, img, (err) => {
  //         if (err) return console.log(err)
  //       })
  //     }
  //   }
  // })
}

downloadEmoji()

module.exports = emojiImageJson
