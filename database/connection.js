const mongoose = require('mongoose')

const connectWithRetry = async () => {
  const connectOptions = {
    maxPoolSize: 100,
    minPoolSize: 10,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    w: 'majority'
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, connectOptions)
    console.log('Successfully connected to MongoDB')
  } catch (error) {
    console.error('MongoDB connection error:', error)
    setTimeout(connectWithRetry, 5000)
  }
}

connectWithRetry()

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error)
  if (error.name === 'MongoNetworkError') {
    console.log('Network error detected. Attempting to reconnect...')
    connectWithRetry()
  }
})

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...')
  connectWithRetry()
})

process.on('SIGINT', async () => {
  await mongoose.connection.close()
  console.log('MongoDB connection closed through app termination')
  process.exit(0)
})

module.exports = mongoose.connection
