const io = require('@pm2/io')
const {
  db
} = require('../database')

const stats = {
  rpsAvrg: 0,
  responseTimeAvrg: 0,
  times: {}
}

const noEmptyStats = {
  rpsAvrg: 0,
  responseTimeAvrg: 0,
  times: {}
}

const rtOP = io.metric({
  name: 'response time',
  unit: 'ms'
})

setInterval(() => {
  if (Object.keys(noEmptyStats.times).length > 1) {
    const time = Object.keys(noEmptyStats.times).shift()

    const rps = noEmptyStats.times[time].length
    if (noEmptyStats.rpsAvrg > 0) noEmptyStats.rpsAvrg = (noEmptyStats.rpsAvrg + rps) / 2
    else noEmptyStats.rpsAvrg = rps

    const sumResponseTime = noEmptyStats.times[time].reduce((a, b) => a + b, 0)
    const lastResponseTimeAvrg = (sumResponseTime / noEmptyStats.times[time].length) || 0
    if (noEmptyStats.responseTimeAvrg > 0) noEmptyStats.responseTimeAvrg = (noEmptyStats.responseTimeAvrg + lastResponseTimeAvrg) / 2
    else noEmptyStats.responseTimeAvrg = lastResponseTimeAvrg

    console.log('📩 rps last:', rps)
    console.log('📩 rps avrg:', noEmptyStats.rpsAvrg)
    console.log('📩 response time avrg last:', lastResponseTimeAvrg)
    console.log('📩 response time avrg total:', noEmptyStats.responseTimeAvrg)

    delete noEmptyStats.times[time]
  }
}, 1000)

setInterval(() => {
  if (Object.keys(stats.times).length > 1) {
    const time = Object.keys(stats.times).shift()

    const rps = stats.times[time].length
    if (stats.rpsAvrg > 0) stats.rpsAvrg = (stats.rpsAvrg + rps) / 2
    else stats.rpsAvrg = rps

    const sumResponseTime = stats.times[time].reduce((a, b) => a + b, 0)
    const lastResponseTimeAvrg = (sumResponseTime / stats.times[time].length) || 0
    if (stats.responseTimeAvrg > 0) stats.responseTimeAvrg = (stats.responseTimeAvrg + lastResponseTimeAvrg) / 2
    else stats.responseTimeAvrg = lastResponseTimeAvrg

    console.log('🔄 rps last:', rps)
    console.log('🔄 rps avrg:', stats.rpsAvrg)
    console.log('🔄 response time avrg last:', lastResponseTimeAvrg)
    console.log('🔄 response time avrg total:', stats.responseTimeAvrg)

    rtOP.set(stats.responseTimeAvrg)

    db.Stats.create({
      rps,
      responseTime: lastResponseTimeAvrg,
      date: new Date()
    })

    delete stats.times[time]
  }
}, 1000)

// setInterval(async () => {
//   const usersCount = await db.User.count({
//     updatedAt: {
//       $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
//     }
//   })

//   const groupsCount = await db.Group.count({
//     updatedAt: {
//       $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
//     }
//   })
// }, 60 * 1000 * 5)

module.exports = async (ctx, next) => {
  const startMs = new Date()

  ctx.stats = {
    rps: stats.rpsAvrg,
    rta: stats.responseTimeAvrg,
    mps: noEmptyStats.rpsAvrg,
    mrs: noEmptyStats.responseTimeAvrg
  }

  return next().then(() => {
    const now = Math.floor(new Date() / 1000)

    if (ctx.state.emptyRequest === false) {
      if (!noEmptyStats.times[now]) noEmptyStats.times[now] = []
      noEmptyStats.times[now].push(new Date() - startMs)
    }

    if (!stats.times[now]) stats.times[now] = []
    stats.times[now].push(new Date() - startMs)
  })
}
