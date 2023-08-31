const got = require('got')
const crypto = require('crypto')
const qs = require('querystring')

class LiqPay {
  constructor (publicKey, privateKey, config = {}) {
    const configDefault = {
      host: 'https://www.liqpay.ua/api/',
      language: 'en'
    }

    this.publicKey = publicKey
    this.privateKey = privateKey
    this.config = Object.assign(config, configDefault)
  }

  async api (path, params) {
    params.public_key = this.publicKey
    const data = Buffer.from(JSON.stringify(params)).toString('base64')
    const signature = this.strToSign(this.privateKey + data + this.privateKey)

    const body = {
      data,
      signature
    }

    const response = await got.post(this.config.host + path, {
      body: qs.stringify(body)
    })

    return JSON.parse(response.body)
  }

  // eslint-disable-next-line class-methods-use-this
  strToSign (str) {
    const sha1 = crypto.createHash('sha1')

    sha1.update(str)
    return sha1.digest('base64')
  }

  formattingParams (params) {
    params.public_key = this.publicKey

    if (!params.version) throw new Error('version is null')
    if (!params.amount) throw new Error('amount is null')
    if (!params.currency) throw new Error('currency is null')
    if (!params.description) throw new Error('description is null')

    return params
  }

  formattingData (params) {
    const data = Buffer.from(JSON.stringify(params)).toString('base64')
    const signature = this.strToSign(this.privateKey + data + this.privateKey)

    return {
      data,
      signature
    }
  }

  // eslint-disable-next-line class-methods-use-this
  formattingLink (params) {
    params = this.formattingParams(params)
    const formattingData = this.formattingData(params)

    return `${this.config.host}${params.version}/checkout?data=${formattingData.data}&signature=${formattingData.signature}`
  }

  async formattingRequest (params) {
    const formattingData = this.formattingData(params)
    const response = await this.api('request', {
      data: formattingData.data,
      signature: formattingData.signature
    })

    console.log(response.body)
    return response.body
  }
}

module.exports = LiqPay
