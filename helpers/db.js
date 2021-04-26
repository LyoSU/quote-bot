const got = require('got')

const extend = got.extend({
  baseUrl: process.env.DB_API_URI,
  json: true,
  headers: {
    'Content-type': 'application/json'
  },
  timeout: 1000,
  throwHttpErrors: false
})

const sendMethod = (method, parm) => {
  return new Promise((resolve) => {
    extend.post(`/${method}`, {
      body: parm
    }).then((postResult) => {
      resolve(postResult.body)
    }).catch(() => {
      resolve({
        ok: false,
        error_code: 503,
        description: 'server_down'
      })
    })
  })
}

const updateUser = (user) => {
  const parm = {}

  if (user.id) parm.telegram_id = user.id
  if (user.telegram_id) parm.telegram_id = user.telegram_id
  if (user.username) parm.username = user.username
  if (user.first_name) parm.first_name = user.first_name
  if (user.last_name) parm.last_name = user.last_name

  return sendMethod('updateUser', parm)
}

const saveAudio = (audio) => {
  return sendMethod('saveAudio', audio)
}

const getAudio = (audio) => {
  return sendMethod('getAudio', audio)
}

module.exports = {
  sendMethod,
  updateUser,
  saveAudio,
  getAudio
}
