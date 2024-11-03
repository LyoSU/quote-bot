require('dotenv').config({ path: './.env' })
const { Bot } = require('grammy')
const { db } = require('./database')

const bot = new Bot(process.env.BOT_TOKEN)

const checkGroup = async (group) => {
  const result = await bot.api.sendChatAction(group.group_id, 'typing').catch(error => {
    return error.response
  })
  if (result) {
    if (result.ok !== false) group.available.active = true
    else group.available.active = false
    group.available.check = true
    await group.save()
  }
  return { group_id: group.group_id, result }
}

const checkGroups = async () => {
  const groups = await db.Group.find({ 'available.check': { $ne: true } }).limit(100)
  const checkArray = groups.map(checkGroup)
  console.log(await Promise.all(checkArray))
  await checkGroups()
}

checkGroups()
