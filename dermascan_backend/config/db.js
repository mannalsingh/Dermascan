const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (_) {}

    if (!process.env.MONGODB_URI) {
      console.error('[MongoDB Error] MONGODB_URI environment variable is not defined.');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} on ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error] Failed to connect to MongoDB Atlas:`, error.message);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Runtime Error]', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Connection re-established');
});

module.exports = connectDB;

