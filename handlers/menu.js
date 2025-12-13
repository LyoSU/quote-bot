const Markup = require('telegraf/markup')

async function showMainMenu (ctx, getMe, isEdit = false) {
  if (!getMe) {
    getMe = await ctx.telegram.getMe()
  }

  const keyboard = Markup.inlineKeyboard([
    [
      Markup.callbackButton(ctx.i18n.t('menu.btn.features'), 'menu:features'),
      Markup.callbackButton(ctx.i18n.t('menu.btn.settings'), 'menu:settings')
    ],
    [
      Markup.callbackButton(ctx.i18n.t('menu.btn.help'), 'menu:help'),
      Markup.callbackButton(ctx.i18n.t('menu.btn.language'), 'menu:language')
    ],
    [
      Markup.urlButton(
        ctx.i18n.t('menu.btn.add_group'),
        `https://t.me/${getMe.username}?startgroup=add`
      )
    ]
  ])

  const options = {
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard
  }

  if (isEdit && ctx.callbackQuery) {
    await ctx.editMessageText(ctx.i18n.t('menu.title'), options).catch(() => {})
  } else {
    await ctx.replyWithHTML(ctx.i18n.t('menu.title'), {
      ...options,
      reply_to_message_id: ctx.message && ctx.message.message_id,
      allow_sending_without_reply: true
    })
  }
}

async function handleMenuCallback (ctx) {
  const action = ctx.match[1]
  const getMe = await ctx.telegram.getMe()

  switch (action) {
    case 'main':
      await showMainMenu(ctx, getMe, true)
      break

    // Features menu
    case 'features':
      await ctx.editMessageText(ctx.i18n.t('menu.features.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.callbackButton(ctx.i18n.t('menu.features.btn.basics'), 'menu:f_basics'),
            Markup.callbackButton(ctx.i18n.t('menu.features.btn.colors'), 'menu:f_colors')
          ],
          [
            Markup.callbackButton(ctx.i18n.t('menu.features.btn.media'), 'menu:f_media'),
            Markup.callbackButton(ctx.i18n.t('menu.features.btn.group'), 'menu:f_group')
          ],
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:main')]
        ])
      }).catch(() => {})
      break

    case 'f_basics':
      await ctx.editMessageText(ctx.i18n.t('menu.features.basics.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:features')]
        ])
      }).catch(() => {})
      break

    case 'f_colors':
      await ctx.editMessageText(ctx.i18n.t('menu.features.colors.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:features')]
        ])
      }).catch(() => {})
      break

    case 'f_media':
      await ctx.editMessageText(ctx.i18n.t('menu.features.media.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:features')]
        ])
      }).catch(() => {})
      break

    case 'f_group':
      await ctx.editMessageText(ctx.i18n.t('menu.features.group.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:features')]
        ])
      }).catch(() => {})
      break

    // Settings menu
    case 'settings':
      await ctx.editMessageText(ctx.i18n.t('menu.settings.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.callbackButton(ctx.i18n.t('menu.settings.btn.color'), 'menu:set_color'),
            Markup.callbackButton(ctx.i18n.t('menu.settings.btn.emoji_style'), 'menu:set_emoji')
          ],
          [
            Markup.callbackButton(ctx.i18n.t('menu.settings.btn.privacy'), 'menu:set_privacy')
          ],
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:main')]
        ])
      }).catch(() => {})
      break

    case 'help':
      await ctx.editMessageText(ctx.i18n.t('help'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:main')]
        ])
      }).catch(() => {})
      break

    case 'language': {
      const handleLanguage = require('./language')
      await handleLanguage(ctx)
      return
    }

    case 'set_color':
      await ctx.editMessageText(
        `<b>🎨 ${ctx.i18n.t('menu.settings.btn.color')}</b>\n\n` +
        `${ctx.i18n.locale() === 'uk'
          ? 'Використовуйте команду <code>/qcolor [колір]</code> щоб встановити колір за замовчуванням.\n\nНаприклад: <code>/qcolor blue</code> або <code>/qcolor #ff5733</code>'
          : 'Use <code>/qcolor [color]</code> command to set default color.\n\nExample: <code>/qcolor blue</code> or <code>/qcolor #ff5733</code>'
        }`,
        {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: Markup.inlineKeyboard([
            [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:settings')]
          ])
        }
      ).catch(() => {})
      break

    case 'set_emoji':
      await ctx.editMessageText(ctx.i18n.t('emoji.info'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('menu.btn.back'), 'menu:settings')]
        ])
      }).catch(() => {})
      break

    case 'set_privacy': {
      const handlePrivacy = require('./privacy-settings')
      await handlePrivacy(ctx)
      await showMainMenu(ctx, getMe, false)
      return
    }
  }

  ctx.state.answerCbQuery = []
}

module.exports = {
  showMainMenu,
  handleMenuCallback
}
