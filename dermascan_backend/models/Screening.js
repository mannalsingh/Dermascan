

const mongoose = require('mongoose');

const ScreeningSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image_url: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
}, { timestamps: { createdAt: 'uploaded_at' } });

module.exports = mongoose.model('Screening', ScreeningSchema);
