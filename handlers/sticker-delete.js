module.exports = async ctx => {
  const stickerLinkPrefix = 'https://t.me/addstickers/'
  let result

  if (ctx.message.reply_to_message) {
    const replyMessage = ctx.message.reply_to_message

    if (replyMessage.sticker) {
      // Check if sticker is from group's sticker set
      if (ctx.group.info.stickerSet.name === replyMessage.sticker.set_name) {
        // Delete from sticker set
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
        // Delete from quotes database
        const group = await ctx.db.Group.findOne({ group_id: ctx.chat.id })
        const quote = await ctx.db.Quote.findOne({
          group: group,
          file_unique_id: replyMessage.sticker.file_unique_id
        })

        if (quote) {
          const deleteResult = await ctx.db.Quote.deleteOne({ _id: quote._id }).catch(err => {
            console.error('Error deleting sticker:', err)
            result = ctx.i18n.t('sticker.delete_random.error', {
              error: err.message
            })
          })

          if (deleteResult && deleteResult.deletedCount === 1) {
            result = ctx.i18n.t('sticker.delete_random.suc')
          }
        } else {
          result = ctx.i18n.t('sticker.delete_random.error', {
            error: 'quote not found'
          })
        }
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
