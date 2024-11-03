const { rateLimit } = require('./rateLimit')
const { isGroup, groupFilter, privateFilter } = require('./filters')
const { onlyGroup, onlyAdmin } = require('./permissions')

module.exports = {
  rateLimit,
  isGroup,
  groupFilter,
  privateFilter,
  stats: require('./stats'),
  onlyPm: require('./only-pm'),
  onlyGroup,
  scenes: require('./scenes'),
  onlyAdmin
}
