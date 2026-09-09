

const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  phone: String,
  date_of_birth: String,
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  address: String,
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
