require('dotenv').config({ path: './.env' })
const {
  db
} = require('./database')
const Telegram = require('telegraf/telegram')

const telegram = new Telegram(process.env.BOT_TOKEN)

const checkGroup = async (group) => {
  const result = await telegram.sendChatAction(group.group_id, 'typing').catch(error => {
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

let checkRunning = false
const MAX_ITERATIONS = 1000 // Prevent infinite loops
let iterationCount = 0

const checkGroups = async () => {
  if (checkRunning) return
  checkRunning = true

  try {
    const groups = await db.Group.find({ 'available.check': { $ne: true } }).limit(100)

    if (groups.length === 0) {
      console.log('All groups checked, exiting...')
      checkRunning = false
      process.exit(0)
      return
    }

    iterationCount++
    if (iterationCount >= MAX_ITERATIONS) {
      console.log('Max iterations reached, exiting...')
      checkRunning = false
      process.exit(0)
      return
    }

    const checkArray = groups.map(checkGroup)
    console.log(await Promise.all(checkArray))

    checkRunning = false

    // Add delay to prevent overwhelming the system
    setTimeout(() => {
      checkGroups()
    }, 1000)
  } catch (error) {
    console.error('Error in checkGroups:', error)
    checkRunning = false
    process.exit(1)
  }
}

checkGroups()
