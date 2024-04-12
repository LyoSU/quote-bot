module.exports = async ctx => {
  let result

  if (ctx.message.reply_to_message) {
    const replyMessage = ctx.message.reply_to_message
    const groupId = ctx.message.chatId

    if (replyMessage.sticker) {
      ctx.Quote.deleteOne({ group: groupId, file_id: fileId }, (error) => {
        if (error) {
          result = ctx.i18n.t('sticker.delete_random.error', {
            error
          })
        } else {
          result = ctx.i18n.t('sticker.delete_random.suc')
        }
      })
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
