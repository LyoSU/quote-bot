module.exports = async ctx => {
  const stickerLinkPrefix = 'https://t.me/addstickers/'

  let result

  if (ctx.message.reply_to_message && ctx.group.info.stickerSet.name === ctx.message.reply_to_message.sticker.set_name) {
    const replyMessage = ctx.message.reply_to_message

    if (replyMessage.sticker) {
      const deleteStickerFromSet = await ctx.telegram.deleteStickerFromSet(replyMessage.sticker.file_id).catch((error) => {
        result = ctx.i18n.t('sticker.delete.error.telegram', {
          error
        })
      })

      if (deleteStickerFromSet) {
        result = ctx.i18n.t('sticker.delete.suc', {
          link: `${stickerLinkPrefix}${ctx.group.info.stickerSet.name}`
        })
      }
    } else {
      result = ctx.i18n.t('sticker.empty_forward')
    }
  } else {
    result = ctx.i18n.t('sticker.empty_forward')
  }

  if (result) {
    await ctx.replyWithHTML(result, {
      reply_to_message_id: ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }
}
