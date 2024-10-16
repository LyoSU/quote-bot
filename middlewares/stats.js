const { db } = require('../database');

const stats = {
  rpsAvrg: 0,
  responseTimeAvrg: 0,
  responseTime95p: 0,
  times: new Map(),
};

const noEmptyStats = {
  rpsAvrg: 0,
  responseTimeAvrg: 0,
  responseTime95p: 0,
  times: new Map(),
};

function calculatePercentile(arr, percentile) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

function updateStats(statsObj) {
  const now = Math.floor(Date.now() / 1000);
  const cutoffTime = now - 60; // Keep data for the last minute

  let totalRequests = 0;
  let totalResponseTime = 0;
  let allResponseTimes = [];

  for (const [time, requests] of statsObj.times.entries()) {
    if (time < cutoffTime) {
      statsObj.times.delete(time);
    } else {
      totalRequests += requests.length;
      totalResponseTime += requests.reduce((sum, duration) => sum + duration, 0);
      allResponseTimes = allResponseTimes.concat(requests);
    }
  }

  const timeRange = Math.min(60, now - Math.min(...statsObj.times.keys()));
  statsObj.rpsAvrg = totalRequests / timeRange;
  statsObj.responseTimeAvrg = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
  statsObj.responseTime95p = allResponseTimes.length > 0 ? calculatePercentile(allResponseTimes, 95) : 0;

  console.log(`${statsObj === noEmptyStats ? '📩' : '🔄'} RPS (avg last minute):`, statsObj.rpsAvrg.toFixed(2));
  console.log(`${statsObj === noEmptyStats ? '📩' : '🔄'} Average response time:`, statsObj.responseTimeAvrg.toFixed(2));
  console.log(`${statsObj === noEmptyStats ? '📩' : '🔄'} 95th percentile response time:`, statsObj.responseTime95p.toFixed(2));

  if (statsObj === stats) {
    db.Stats.create({
      rps: statsObj.rpsAvrg,
      responseTime: statsObj.responseTimeAvrg,
      responseTime95p: statsObj.responseTime95p,
      date: new Date()
    }).catch(err => console.error('Error saving stats:', err));
  }
}

setInterval(() => {
  updateStats(noEmptyStats);
  updateStats(stats);
}, 5000); // Update every 5 seconds

module.exports = async (ctx, next) => {
  const startMs = Date.now();

  ctx.stats = {
    rps: stats.rpsAvrg,
    rta: stats.responseTimeAvrg,
    rt95p: stats.responseTime95p,
    mps: noEmptyStats.rpsAvrg,
    mrs: noEmptyStats.responseTimeAvrg,
    mr95p: noEmptyStats.responseTime95p
  };

  await next();

  const now = Math.floor(Date.now() / 1000);
  const duration = Date.now() - startMs;

  if (!ctx.state.emptyRequest) {
    if (!noEmptyStats.times.has(now)) noEmptyStats.times.set(now, []);
    noEmptyStats.times.get(now).push(duration);
  }

  if (!stats.times.has(now)) stats.times.set(now, []);
  stats.times.get(now).push(duration);
};
