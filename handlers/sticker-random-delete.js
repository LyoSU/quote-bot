module.exports = async ctx => {
  let result

  if (ctx.message.reply_to_message) {
    const replyMessage = ctx.message.reply_to_message
    const group = await ctx.db.Group.findOne({ group_id: ctx.chat.id })

    const fileId = replyMessage?.sticker?.file_unique_id

    if (replyMessage.sticker) {
      const quote = await ctx.db.Quote.findOne({ group: group, file_unique_id: fileId })

      if (quote) {
        const deleteResult = await ctx.db.Quote.deleteOne({ _id: quote._id }).catch(err => {
          console.error('Error deleting sticker:', err)
        })

        if (deleteResult && deleteResult.deletedCount === 1) {
          result = ctx.i18n.t('sticker.delete_random.suc')
        } else {
          result = ctx.i18n.t('sticker.delete_random.error', {
            error: 'delete operation failed'
          })
        }
      } else {
        result = ctx.i18n.t('sticker.delete_random.error', {
          error: 'quote not found'
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
