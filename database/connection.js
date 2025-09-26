const mongoose = require('mongoose')

let retryCount = 0
const MAX_RETRY_ATTEMPTS = 10
const RETRY_DELAY = 5000
let isConnecting = false

const connectWithRetry = async () => {
  if (isConnecting) {
    // Wait for ongoing connection with timeout to prevent deadlock
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)

      // Add timeout to prevent infinite waiting
      setTimeout(() => {
        clearInterval(checkInterval)
        isConnecting = false // Reset flag to prevent deadlock
        console.warn('Connection flag timeout, resetting flag')
        resolve()
      }, 15000) // 15 seconds timeout
    })
    return
  }

  isConnecting = true

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
      retryWrites: true
    })
    console.log('Successfully connected to MongoDB')
    retryCount = 0 // Reset on successful connection
    isConnecting = false
  } catch (error) {
    isConnecting = false
    retryCount++
    console.error(`MongoDB connection error (attempt ${retryCount}/${MAX_RETRY_ATTEMPTS}):`, error)

    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error('Max retry attempts reached. Exiting...')
      process.exit(1)
    }

    setTimeout(connectWithRetry, RETRY_DELAY * retryCount) // Exponential backoff
  }
}

connectWithRetry()

mongoose.connection.on('error', async (error) => {
  console.error('MongoDB connection error:', error)
  if (error.name === 'MongoNetworkError' && retryCount < MAX_RETRY_ATTEMPTS) {
    console.log('Network error detected. Attempting to reconnect...')
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
    connectWithRetry()
  }
})

mongoose.connection.on('disconnected', async () => {
  if (retryCount < MAX_RETRY_ATTEMPTS) {
    console.log('MongoDB disconnected. Attempting to reconnect...')
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY))
    connectWithRetry()
  }
})

process.on('SIGINT', async () => {
  await mongoose.connection.close()
  console.log('MongoDB connection closed through app termination')
  process.exit(0)
})

module.exports = mongoose.connection
