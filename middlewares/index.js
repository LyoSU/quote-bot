const stats = require('./stats')
const onlyGroup = require('./only-group')
const onlyAdmin = require('./only-admin')
const scenes = require('./scenes')

module.exports = {
  stats,
  onlyPm: require('./only-pm'),
  onlyGroup,
  onlyAdmin,
  scenes
}
