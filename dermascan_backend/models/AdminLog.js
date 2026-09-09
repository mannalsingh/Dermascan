

const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  module: String,
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('AdminLog', AdminLogSchema);
