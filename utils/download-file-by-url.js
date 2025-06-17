const https = require('https')
const Stream = require('stream').Transform

const downloadFileByUrl = (fileUrl, options = {}) => new Promise((resolve, reject) => {
  const timeout = options.timeout || 10000 // 10 seconds default
  const maxSize = options.maxSize || 50 * 1024 * 1024 // 50MB default
  
  const data = new Stream()
  let totalSize = 0
  let timeoutId
  
  // Set up timeout
  timeoutId = setTimeout(() => {
    reject(new Error(`Download timeout after ${timeout}ms for URL: ${fileUrl}`))
  }, timeout)
  
  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const request = https.get(fileUrl, {
    timeout: timeout / 2, // Connection timeout
  }, (response) => {
    // Check response status
    if (response.statusCode !== 200) {
      cleanup()
      reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
      return
    }
    
    // Check content length
    const contentLength = parseInt(response.headers['content-length'], 10)
    if (contentLength && contentLength > maxSize) {
      cleanup()
      reject(new Error(`File too large: ${contentLength} bytes (max: ${maxSize})`))
      return
    }

    response.on('data', (chunk) => {
      totalSize += chunk.length
      
      // Check total size during download
      if (totalSize > maxSize) {
        cleanup()
        request.destroy()
        reject(new Error(`Download exceeded size limit: ${totalSize} bytes (max: ${maxSize})`))
        return
      }
      
      data.push(chunk)
    })

    response.on('end', () => {
      cleanup()
      resolve(data)
    })
    
    response.on('error', (error) => {
      cleanup()
      reject(error)
    })
  })
  
  request.on('error', (error) => {
    cleanup()
    reject(error)
  })
  
  request.on('timeout', () => {
    cleanup()
    request.destroy()
    reject(new Error(`Request timeout after ${timeout}ms for URL: ${fileUrl}`))
  })
})

module.exports = downloadFileByUrl
