const mongoose = require('mongoose')

let retryCount = 0
const MAX_RETRY_ATTEMPTS = 10
const RETRY_DELAY = 5000
let isConnecting = false

const connectWithRetry = async () => {
  if (isConnecting) return
  isConnecting = true

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10s timeout for server selection
      connectTimeoutMS: 10000, // 10s timeout for connection
      socketTimeoutMS: 30000, // 30s timeout for socket operations
      maxPoolSize: 10 // Maintain up to 10 socket connections
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
