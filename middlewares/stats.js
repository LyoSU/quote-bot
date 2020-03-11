const stats = {
  rpsAvrg: 0,
  responseTimeAvrg: 0,
  times: {}
}

setInterval(() => {
  if (Object.keys(stats.times).length > 0) {
    Object.keys(stats.times).forEach(time => {
      const rps = stats.times[time].length
      stats.rpsAvrg = (stats.rpsAvrg + rps) / 2

      const sumResponseTime = stats.times[time].reduce((a, b) => a + b, 0)
      const lastResponseTimeAvrg = (sumResponseTime / stats.times[time].length) || 0
      stats.responseTimeAvrg = (stats.responseTimeAvrg + lastResponseTimeAvrg) / 2

      console.log('rps last:', rps)
      console.log('rps avrg:', stats.rpsAvrg)
      console.log('response time avrg last:', lastResponseTimeAvrg)
      console.log('response time avrg total:', stats.responseTimeAvrg)
      delete stats.times[time]
    })
  }
}, 1000)

module.exports = (ctx, next) => {
  const startMs = new Date()

  return next().then(async () => {
    const now = Math.floor(new Date() / 1000)
    if (!stats.times[now]) stats.times[now] = []
    stats.times[now].push(new Date() - startMs)
  })
}
