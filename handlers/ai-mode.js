const { Composer } = require('telegraf')
const rateLimit = require('telegraf-ratelimit')
const aiModes = require('../config/aiModes')

const composer = new Composer()

composer.command('qai', rateLimit(3, 60), async (ctx) => {
  if (ctx.message.chat.type === 'private') {
    return ctx.replyWithHTML(ctx.i18n.t('sticker.group_only'))
  }

  const isAdmin = await ctx.getChatAdministrators().then(admins =>
    admins.some(admin => admin.user.id === ctx.from.id)
  ).catch(() => false)

  if (!isAdmin) {
    return ctx.replyWithHTML(ctx.i18n.t('only_admin'))
  }

  const args = ctx.message.text.split(' ').slice(1)

  if (args.length === 0) {
    const currentMode = (ctx.group && ctx.group.info && ctx.group.info.settings && ctx.group.info.settings.aiMode) || 'sarcastic'
    const currentModeInfo = aiModes[currentMode]

    let message = '🤖 <b>AI Modes</b>\n\n'
    message += `Current mode: ${currentModeInfo.displayName}\n\n`
    message += '<b>Available modes:</b>\n'

    Object.keys(aiModes).forEach(modeName => {
      const modeInfo = aiModes[modeName]
      const isActive = modeName === currentMode ? '✅ ' : ''
      message += `${isActive}<code>/qai ${modeName}</code> - ${modeInfo.displayName}\n`
      message += `<i>${modeInfo.description}</i>\n\n`
    })

    return ctx.replyWithHTML(message)
  }

  const selectedMode = args[0].toLowerCase()

  if (!aiModes[selectedMode]) {
    return ctx.replyWithHTML(
      `❌ Unknown mode: <code>${selectedMode}</code>\n\n` +
      `Available: ${Object.keys(aiModes).map(name => `<code>${name}</code>`).join(', ')}`
    )
  }

  try {
    await ctx.group.info.updateOne({
      $set: { 'settings.aiMode': selectedMode }
    })

    const modeInfo = aiModes[selectedMode]
    return ctx.replyWithHTML(
      `✅ AI mode changed to: ${modeInfo.displayName}\n` +
      `<i>${modeInfo.description}</i>`
    )
  } catch (error) {
    console.error('Error updating AI mode:', error)
    return ctx.replyWithHTML('❌ Error saving settings')
  }
})

module.exports = composer
