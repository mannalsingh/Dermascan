

const mongoose = require('mongoose');

const ScreeningResultSchema = new mongoose.Schema({
  screening_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: true, unique: true },
  prediction: { type: String, enum: ['benign', 'malignant'], required: true },
  confidence_score: { type: Number, required: true, min: 0, max: 1 },
  risk_level: { type: String, enum: ['low', 'medium', 'high'], required: true },
  heatmap_url: String,
  ai_service_response: mongoose.Schema.Types.Mixed, 
}, { timestamps: { createdAt: 'created_at' } });

module.exports = mongoose.model('ScreeningResult', ScreeningResultSchema);
