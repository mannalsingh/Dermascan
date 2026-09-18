const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (_) {}

    const conn = await mongoose.connect(process.env.MONGODB_URI);
  } catch (error) {
  }
};

module.exports = connectDB;
