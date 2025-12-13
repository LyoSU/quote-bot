const Markup = require('telegraf/markup')

const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  WAITING_MESSAGE: 'waiting',
  COMPLETE: 'complete'
}

async function startOnboarding (ctx) {
  if (ctx.session && ctx.session.userInfo) {
    ctx.session.userInfo.onboardingStep = ONBOARDING_STEPS.WELCOME
  }

  await ctx.replyWithHTML(ctx.i18n.t('onboarding.welcome.title'), {
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard([
      [Markup.callbackButton(ctx.i18n.t('onboarding.welcome.btn.start'), 'onboarding:start')],
      [Markup.callbackButton(ctx.i18n.t('onboarding.welcome.btn.skip'), 'onboarding:skip')]
    ])
  })
}

async function handleOnboardingCallback (ctx) {
  const action = ctx.match[1]
  const getMe = await ctx.telegram.getMe()

  switch (action) {
    case 'start':
      if (ctx.session && ctx.session.userInfo) {
        ctx.session.userInfo.onboardingStep = ONBOARDING_STEPS.WAITING_MESSAGE
      }

      await ctx.editMessageText(ctx.i18n.t('onboarding.step1.title'), {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: Markup.inlineKeyboard([
          [Markup.callbackButton(ctx.i18n.t('onboarding.welcome.btn.skip'), 'onboarding:skip')]
        ])
      })
      break

    case 'skip':
      await completeOnboarding(ctx, getMe)
      break

    case 'menu':
      await completeOnboarding(ctx, getMe)
      break

    case 'complete':
      await completeOnboarding(ctx, getMe)
      break
  }

  ctx.state.answerCbQuery = []
}

async function completeOnboarding (ctx, getMe) {
  if (ctx.session && ctx.session.userInfo) {
    ctx.session.userInfo.onboardingComplete = true
    ctx.session.userInfo.onboardingStep = ONBOARDING_STEPS.COMPLETE
  }

  const { showMainMenu } = require('./menu')
  await showMainMenu(ctx, getMe, true)
}

async function showOnboardingStep2 (ctx) {
  const getMe = await ctx.telegram.getMe()

  await ctx.replyWithHTML(ctx.i18n.t('onboarding.step2.title'), {
    disable_web_page_preview: true,
    reply_markup: Markup.inlineKeyboard([
      [Markup.callbackButton(ctx.i18n.t('onboarding.step2.btn.menu'), 'onboarding:menu')],
      [Markup.urlButton(
        ctx.i18n.t('onboarding.step2.btn.add_group'),
        `https://t.me/${getMe.username}?startgroup=add`
      )]
    ])
  })
}

function isInOnboarding (ctx) {
  return ctx.session &&
    ctx.session.userInfo &&
    ctx.session.userInfo.onboardingStep === ONBOARDING_STEPS.WAITING_MESSAGE &&
    !ctx.session.userInfo.onboardingComplete
}

function isNewUser (ctx) {
  return !(ctx.session && ctx.session.userInfo && ctx.session.userInfo.onboardingComplete)
}

module.exports = {
  startOnboarding,
  handleOnboardingCallback,
  showOnboardingStep2,
  isInOnboarding,
  isNewUser,
  ONBOARDING_STEPS
}
