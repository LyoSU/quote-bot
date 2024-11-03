const isGroup = (ctx) => ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup'
const groupFilter = (fn) => (ctx, next) => isGroup(ctx) ? fn(ctx, next) : next()
const privateFilter = (fn) => (ctx, next) => ctx.chat?.type === 'private' ? fn(ctx, next) : next()

module.exports = { isGroup, groupFilter, privateFilter }
