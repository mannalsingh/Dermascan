

const mongoose = require('mongoose');

const PdfReportSchema = new mongoose.Schema({
  screening_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: true },
  report_url: String, 
}, { timestamps: { createdAt: 'generated_at' } });

module.exports = mongoose.model('PdfReport', PdfReportSchema);
