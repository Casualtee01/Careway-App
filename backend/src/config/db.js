const dns = require('node:dns');
const mongoose = require('mongoose');
const safeErrorMessage = require('../utils/safeErrorMessage');

mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', safeErrorMessage(error));
});

async function connectDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }

  if (process.platform === 'win32' && process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('Connected to MongoDB');
  return mongoose.connection;
}

module.exports = connectDatabase;