

const mongoose = require('mongoose');

const ScanHistorySchema = new mongoose.Schema({
  screening_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: true },
  previous_prediction: String,
  previous_confidence: Number,
  scan_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ScanHistory', ScanHistorySchema);
