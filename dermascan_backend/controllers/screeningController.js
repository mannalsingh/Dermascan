const Screening = require('../models/Screening');
const ScreeningResult = require('../models/ScreeningResult');
const ScanHistory = require('../models/ScanHistory');
const PdfReport = require('../models/PdfReport');
const UserProfile = require('../models/UserProfile');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const PDFDocument = require('pdfkit');


const reportsDir = path.join(__dirname, '..', 'uploads', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

exports.uploadScreening = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const filePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;
    const mongoose = require('mongoose');

    // Normalize AI service URL and log safely
    const rawAiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    let cleanAiUrl = rawAiUrl.trim();
    if (!/^https?:\/\//i.test(cleanAiUrl)) {
      cleanAiUrl = cleanAiUrl.includes('.onrender.com') ? `https://${cleanAiUrl}` : `http://${cleanAiUrl}`;
    }
    const aiPredictUrl = `${cleanAiUrl.replace(/\/+$/, '')}/predict`;
    console.log(`[AI Service] Sending screening image to endpoint: ${aiPredictUrl}`);

    if (mongoose.connection.readyState !== 1) {
      let aiResponseData;
      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), req.file.originalname);
        const aiResponse = await axios.post(aiPredictUrl, formData, {
          headers: formData.getHeaders(),
          timeout: 30000
        });
        aiResponseData = aiResponse.data;
      } catch (aiError) {
        console.error(`[AI Service Error] AI request to ${aiPredictUrl} failed:`, aiError.message);
        return res.status(503).json({
          success: false,
          message: 'AI screening service is currently unavailable. Please verify that the AI service is online and accessible.',
          error: aiError.message,
          aiEndpoint: aiPredictUrl
        });
      }

      const getRiskLevel = (prediction, confidence) => {
        if (prediction === 'malignant') return confidence > 0.8 ? 'high' : 'medium';
        return confidence > 0.7 ? 'low' : 'medium';
      };

      const riskLevel = getRiskLevel(aiResponseData.prediction, aiResponseData.confidence_score);
      const mockResultId = 'res_mock_' + Math.random().toString(36).substr(2, 9);
      const mockScreeningId = 'scr_mock_' + Math.random().toString(36).substr(2, 9);
      const aiServicePublicUrl = process.env.AI_SERVICE_PUBLIC_URL || cleanAiUrl.replace(/\/+$/, '');
      const finalHeatmapUrl = aiResponseData.heatmap_url
        ? aiResponseData.heatmap_url
            .replace('http://127.0.0.1:8000', aiServicePublicUrl)
            .replace('http://localhost:8000', aiServicePublicUrl)
            .replace('http://10.50.204.176:8000', aiServicePublicUrl)
        : '';

      return res.status(201).json({
        success: true,
        result: {
          resultId: mockResultId,
          screeningId: mockScreeningId,
          prediction: aiResponseData.prediction,
          confidenceScore: aiResponseData.confidence_score,
          riskLevel,
          heatmapUrl: finalHeatmapUrl,
          createdAt: new Date().toISOString()
        }
      });
    }

    const screening = await Screening.create({
      user_id: req.user.id,
      image_url: imageUrl,
      status: 'pending'
    });

    let aiResponseData;
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath), req.file.originalname);
      const aiResponse = await axios.post(aiPredictUrl, formData, {
        headers: formData.getHeaders(),
        timeout: 30000
      });
      aiResponseData = aiResponse.data;
    } catch (aiError) {
      console.error(`[AI Service Error] AI request to ${aiPredictUrl} failed:`, aiError.message);
      if (screening) {
        screening.status = 'failed';
        await screening.save().catch(() => {});
      }
      return res.status(503).json({
        success: false,
        message: 'AI screening service is currently unavailable. Please verify that the AI service is online and accessible.',
        error: aiError.message,
        aiEndpoint: aiPredictUrl
      });
    }

    const getRiskLevel = (prediction, confidence) => {
      if (prediction === 'malignant') return confidence > 0.8 ? 'high' : 'medium';
      return confidence > 0.7 ? 'low' : 'medium';
    };

    const riskLevel = getRiskLevel(aiResponseData.prediction, aiResponseData.confidence_score);

    const screeningResult = await ScreeningResult.create({
      screening_id: screening._id,
      prediction: aiResponseData.prediction,
      confidence_score: aiResponseData.confidence_score,
      risk_level: riskLevel,
      heatmap_url: aiResponseData.heatmap_url || '',
      ai_service_response: aiResponseData
    });

    screening.status = 'completed';
    await screening.save();

    await ScanHistory.create({
      screening_id: screening._id,
      previous_prediction: aiResponseData.prediction,
      previous_confidence: aiResponseData.confidence_score
    });

    const aiServicePublicUrl = process.env.AI_SERVICE_PUBLIC_URL || cleanAiUrl.replace(/\/+$/, '');
    res.status(201).json({
      success: true,
      result: {
        resultId: screeningResult._id,
        screeningId: screeningResult.screening_id,
        prediction: screeningResult.prediction,
        confidenceScore: screeningResult.confidence_score,
        riskLevel: screeningResult.risk_level,
        heatmapUrl: screeningResult.heatmap_url
          ? screeningResult.heatmap_url
              .replace('http://127.0.0.1:8000', aiServicePublicUrl)
              .replace('http://localhost:8000', aiServicePublicUrl)
              .replace('http://10.50.204.176:8000', aiServicePublicUrl)
          : '',
        createdAt: screeningResult.created_at || new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      // DB unavailable — return empty history for this user rather than shared mock records
      return res.status(200).json({ success: true, count: 0, history: [] });
    }

    let userId = req.user._id;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userId = new mongoose.Types.ObjectId(userId);
    }

    const screenings = await Screening.aggregate([
      { $match: { user_id: userId } },
      { $sort: { uploaded_at: -1 } },
      {
        $lookup: {
          from: 'screeningresults',
          localField: '_id',
          foreignField: 'screening_id',
          as: 'result'
        }
      },
      { $unwind: { path: '$result', preserveNullAndEmptyArrays: true } }
    ]);

    const formattedHistory = screenings.map(s => {
      const resVal = s.result || {};
      return {
        screeningId: s._id,
        imageUrl: s.image_url,
        prediction: resVal.prediction || 'benign',
        confidenceScore: resVal.confidence_score || 0.0,
        riskLevel: resVal.risk_level || 'low',
        uploadedAt: s.uploaded_at || new Date().toISOString()
      };
    });

    res.status(200).json({ success: true, count: formattedHistory.length, history: formattedHistory });
  } catch (error) {
    res.status(200).json({ success: true, count: 0, history: [] });
  }
};

exports.getScreeningById = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database temporarily unavailable. Please try again shortly.' });
    }

    const screening = await Screening.findById(req.params.id);
    if (!screening) {
      return res.status(404).json({ success: false, message: 'Screening not found' });
    }

    if (screening.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to access this screening' });
    }

    const result = await ScreeningResult.findOne({ screening_id: screening._id });

    const formattedResult = result ? {
      resultId: result._id,
      screeningId: result.screening_id,
      prediction: result.prediction,
      confidenceScore: result.confidence_score,
      riskLevel: result.risk_level,
      heatmapUrl: result.heatmap_url,
      createdAt: result.created_at || new Date().toISOString()
    } : null;

    res.status(200).json({
      success: true,
      screening: {
        screeningId: screening._id,
        imageUrl: screening.image_url,
        uploadedAt: screening.uploaded_at,
        status: screening.status,
        result: formattedResult
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRecommendations = (prediction, riskLevel) => {
  if (prediction === 'malignant' && riskLevel === 'high') {
    return [
      'URGENT: Consult a dermatologist or oncologist immediately.',
      'Do not expose the lesion to direct sunlight. Use SPF 50+ sunscreen.',
      'Avoid picking, scratching, or applying any product to the lesion.',
      'Take photographs of the lesion daily to monitor any changes.',
      'Request a formal dermoscopy and biopsy evaluation from a specialist.',
      'Inform your family physician and request an urgent referral.'
    ];
  } else if (prediction === 'malignant' && riskLevel === 'medium') {
    return [
      'Schedule an appointment with a dermatologist within 1-2 weeks.',
      'Apply broad-spectrum SPF 50+ sunscreen daily on the lesion area.',
      'Monitor the lesion for changes in size, shape, color, or bleeding.',
      'Avoid prolonged sun exposure between 10 AM and 4 PM.',
      'Do not attempt self-treatment or apply any topical medication.',
      'Consider a professional dermoscopic evaluation for confirmation.'
    ];
  } else if (riskLevel === 'medium') {
    return [
      'Schedule a routine dermatology check-up within the next month.',
      'Continue monitoring the lesion for any changes (ABCDE criteria).',
      'Use daily sunscreen (SPF 30+) on the affected area.',
      'Maintain a photographic log of the lesion every 2 weeks.',
      'Avoid trauma or irritation to the lesion area.'
    ];
  } else {
    return [
      'Continue routine annual skin examinations with a dermatologist.',
      'Apply daily sunscreen (SPF 30+) as preventive skincare.',
      'Perform monthly self-skin examinations to detect any changes early.',
      'Maintain a healthy lifestyle: balanced diet and adequate hydration.',
      'Re-scan if the lesion changes in size, color, or texture.'
    ];
  }
};

const generateClinicalPDF = (doc, patient, profile, result, screening, reportId) => {
  const PRIMARY = '#1d4ed8';
  const DARK    = '#1e293b';
  const GRAY    = '#64748b';
  const RED     = '#dc2626';
  const GREEN   = '#16a34a';
  const YELLOW  = '#ca8a04';
  const WHITE   = '#ffffff';
  const LIGHT   = '#f8fafc';
  const PAGE_W  = doc.page.width;
  const MARGIN  = 50;

  const riskColor = result.risk_level === 'high' ? RED :
                    result.risk_level === 'medium' ? YELLOW : GREEN;

  doc.rect(0, 0, PAGE_W, 110).fill(PRIMARY);

  doc.fontSize(22).fillColor(WHITE).font('Helvetica-Bold')
     .text('DermaScan AI', MARGIN, 28, { continued: true });
  doc.fontSize(11).font('Helvetica')
     .text('  Clinical Diagnostics', { continued: false });

  doc.fontSize(9).fillColor('#bfdbfe')
     .text('AI-Powered Skin Lesion Screening Report', MARGIN, 54);
  doc.text('Computer Vision & Machine Learning Based Analysis', MARGIN, 66);

  doc.fillColor(WHITE).fontSize(8)
     .text(`Report ID: ${reportId}`, PAGE_W - 200, 28, { width: 150, align: 'right' })
     .text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, PAGE_W - 200, 40, { width: 150, align: 'right' })
     .text('DermaScan v1.0.0-ONNX', PAGE_W - 200, 52, { width: 150, align: 'right' });




  let y = 128;

  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 1).fill('#e2e8f0');
  y += 10;

  doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold')
     .text('PATIENT INFORMATION', MARGIN, y);
  y += 18;

  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 90).fill(LIGHT).stroke('#e2e8f0');

  const col1x = MARGIN + 14;
  const col2x = PAGE_W / 2 + 10;

  const leftFields = [
    ['Full Name',     patient.name  || 'N/A'],
    ['Email Address', patient.email || 'N/A'],
    ['Phone Number',  profile?.phone || 'Not provided'],
  ];
  const rightFields = [
    ['Gender',       profile?.gender ? profile.gender.replace(/_/g, ' ') : 'Not specified'],
    ['Date of Birth', profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : 'Not provided'],
    ['Address',      profile?.address ? profile.address.substring(0, 35) : 'Not provided'],
  ];

  let py = y + 12;
  leftFields.forEach(([label, value]) => {
    doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(label + ':', col1x, py);
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(value, col1x + 90, py);
    py += 20;
  });

  py = y + 12;
  rightFields.forEach(([label, value]) => {
    doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(label + ':', col2x, py);
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(value, col2x + 90, py);
    py += 20;
  });

  y += 105;

  doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold')
     .text('AI DIAGNOSTIC RESULTS', MARGIN, y);
  y += 18;

  const resultBoxColor = result.prediction === 'malignant' ? '#fef2f2' : '#f0fdf4';
  const resultBorder   = result.prediction === 'malignant' ? '#fecaca' : '#bbf7d0';
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 85).fill(resultBoxColor).stroke(resultBorder);

  const predColor = result.prediction === 'malignant' ? RED : GREEN;
  doc.fontSize(13).fillColor(predColor).font('Helvetica-Bold')
     .text(result.prediction.toUpperCase(), MARGIN + 14, y + 12);
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text('AI Prediction', MARGIN + 14, y + 29);

  const confPct = (result.confidence_score * 100).toFixed(1) + '%';
  doc.fontSize(22).fillColor(DARK).font('Helvetica-Bold')
     .text(confPct, PAGE_W / 2 - 30, y + 10);
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text('Model Confidence', PAGE_W / 2 - 30, y + 38);

  doc.rect(PAGE_W - 160, y + 8, 95, 30).fill(riskColor);
  doc.fontSize(11).fillColor(WHITE).font('Helvetica-Bold')
     .text(result.risk_level.toUpperCase() + ' RISK', PAGE_W - 155, y + 16, { width: 85, align: 'center' });

  const scanDate = new Date(screening.uploaded_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text(`Scan Date: ${scanDate}`, MARGIN + 14, y + 52)
     .text('Model: EfficientNet-B0 ONNX v1.0.0', MARGIN + 14, y + 63)
     .text(`Screening ID: ${screening._id}`, PAGE_W / 2, y + 52);

  y += 100;

  doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold')
     .text('CLINICAL RECOMMENDATIONS', MARGIN, y);
  y += 16;

  const recommendations = getRecommendations(result.prediction, result.risk_level);
  const recBoxH = recommendations.length * 22 + 20;
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, recBoxH).fill(LIGHT).stroke('#e2e8f0');

  let ry = y + 12;
  const bullet = result.risk_level === 'high' ? '!' : 'v';
  const bColor = result.risk_level === 'high' ? RED : PRIMARY;
  recommendations.forEach(rec => {
    doc.fontSize(8).fillColor(bColor).font('Helvetica-Bold').text(bullet, col1x, ry);
    doc.fontSize(8).fillColor(DARK).font('Helvetica').text(rec, col1x + 14, ry, { width: PAGE_W - MARGIN * 2 - 28 });
    ry += 22;
  });

  y += recBoxH + 14;

  doc.fontSize(10).fillColor(PRIMARY).font('Helvetica-Bold')
     .text('SKIN ANALYSIS PARAMETERS', MARGIN, y);
  y += 16;

  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 55).fill(LIGHT).stroke('#e2e8f0');

  const params = [
    ['Analysis Method', 'Computer Vision + ONNX Neural Network', MARGIN + 14, y + 10],
    ['Image Processing', 'HSV Color Space, Contrast & Saliency Analysis', MARGIN + 14, y + 32],
    ['Heatmap Type', 'Custom Grad-CAM Saliency Map', PAGE_W / 2, y + 10],
    ['Classification', 'Binary: Benign / Malignant', PAGE_W / 2, y + 32]
  ];
  params.forEach(([label, value, cx, cy]) => {
    doc.fontSize(7).fillColor(GRAY).font('Helvetica').text(label + ':', cx, cy);
    doc.fontSize(7).fillColor(DARK).font('Helvetica-Bold').text(value, cx, cy + 9);
  });

  y += 70;

  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 55).fill('#fff7ed').stroke('#fed7aa');
  doc.fontSize(9).fillColor('#92400e').font('Helvetica-Bold')
     .text('MEDICAL DISCLAIMER', MARGIN + 14, y + 10);
  doc.fontSize(7.5).fillColor('#78350f').font('Helvetica')
     .text(
       'This report has been generated by DermaScan AI, an automated skin lesion screening system. It is intended solely for preliminary screening purposes and does NOT constitute a formal medical diagnosis. The AI model may produce false positives or false negatives. All findings must be interpreted and validated by a qualified and licensed dermatologist or medical professional.',
       MARGIN + 14, y + 24,
       { width: PAGE_W - MARGIN * 2 - 28 }
     );

  y += 70;

  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 1).fill('#e2e8f0');
  y += 10;

  const sigBoxW = (PAGE_W - MARGIN * 2 - 30) / 2;
  doc.rect(MARGIN, y, sigBoxW, 55).stroke('#e2e8f0');
  doc.rect(MARGIN + sigBoxW + 30, y, sigBoxW, 55).stroke('#e2e8f0');

  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text('Attending Dermatologist', MARGIN + 10, y + 38)
     .text('Signature & Stamp', MARGIN + 10, y + 48);
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text('Patient / Guardian Signature', MARGIN + sigBoxW + 40, y + 38)
     .text('Date: ___________________', MARGIN + sigBoxW + 40, y + 48);

  doc.rect(0, doc.page.height - 28, PAGE_W, 28).fill(PRIMARY);
  doc.fontSize(7).fillColor(WHITE).font('Helvetica')
     .text(
       'DermaScan AI Clinical Diagnostics  |  AI-Powered Skin Screening  |  For Medical Professional Review Only',
       MARGIN, doc.page.height - 18,
       { width: PAGE_W - MARGIN * 2, align: 'center' }
     );
};

exports.downloadReport = async (req, res, next) => {
  try {
    const screening = await Screening.findById(req.params.id);
    if (!screening) return res.status(404).json({ success: false, message: 'Screening not found' });

    if (screening.user_id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const result = await ScreeningResult.findOne({ screening_id: screening._id });
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });

    const patient = await User.findById(req.user.id).select('-password');
    const profile = await UserProfile.findOne({ user_id: req.user.id });

    const reportFilename = `report-${screening._id}.pdf`;
    const reportPath = path.join(__dirname, '..', 'uploads', 'reports', reportFilename);

    if (fs.existsSync(reportPath)) {
      fs.unlinkSync(reportPath);
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const stream = fs.createWriteStream(reportPath);
    doc.pipe(stream);

    const reportData = {
      prediction: result.prediction,
      confidence_score: result.confidence_score,
      risk_level: result.risk_level
    };

    const reportId = String(screening._id).slice(-8).toUpperCase();
    await generateClinicalPDF(doc, patient, profile, reportData, screening, reportId);

    doc.end();

    stream.on('finish', async () => {
      let pdfReport = await PdfReport.findOne({ screening_id: screening._id });
      if (!pdfReport) {
        await PdfReport.create({ screening_id: screening._id, report_url: reportPath });
      } else {
        pdfReport.report_url = reportPath;
        await pdfReport.save();
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=DermaScan-Report-${reportId}.pdf`);
      fs.createReadStream(reportPath).pipe(res);
    });

    stream.on('error', next);

  } catch (error) {
    next(error);
  }
};