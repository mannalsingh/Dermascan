const Screening = require('../models/Screening');
const ScreeningResult = require('../models/ScreeningResult');

exports.getSummary = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      // DB unavailable — return an empty summary for this user rather than shared mock data
      return res.status(200).json({
        success: true,
        summary: {
          totalScreenings: 0,
          benignCount: 0,
          malignantCount: 0,
          riskDistribution: { low: 0, medium: 0, high: 0 },
          trendData: []
        }
      });
    }

    let userId = req.user._id;
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userId = new mongoose.Types.ObjectId(userId);
    }

    const total = await Screening.countDocuments({ user_id: userId });

    const results = await Screening.aggregate([
      { $match: { user_id: userId } },
      {
        $lookup: {
          from: 'screeningresults',
          localField: '_id',
          foreignField: 'screening_id',
          as: 'resultData'
        }
      },
      { $unwind: '$resultData' },
      {
        $group: {
          _id: null,
          benign: { $sum: { $cond: [{ $eq: ['$resultData.prediction', 'benign'] }, 1, 0] } },
          malignant: { $sum: { $cond: [{ $eq: ['$resultData.prediction', 'malignant'] }, 1, 0] } },
          lowRisk: { $sum: { $cond: [{ $eq: ['$resultData.risk_level', 'low'] }, 1, 0] } },
          mediumRisk: { $sum: { $cond: [{ $eq: ['$resultData.risk_level', 'medium'] }, 1, 0] } },
          highRisk: { $sum: { $cond: [{ $eq: ['$resultData.risk_level', 'high'] }, 1, 0] } },
        }
      }
    ]);

    const stats = results.length > 0 ? results[0] : { benign: 0, malignant: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0 };

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendData = await Screening.aggregate([
      { $match: { user_id: userId, uploaded_at: { $gte: thirtyDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$uploaded_at' } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedTrendData = trendData.map(item => ({
      date: item._id,
      count: item.count
    }));

    res.status(200).json({
      success: true,
      summary: {
        totalScreenings: total,
        benignCount: stats.benign || 0,
        malignantCount: stats.malignant || 0,
        riskDistribution: {
          low: stats.lowRisk || 0,
          medium: stats.mediumRisk || 0,
          high: stats.highRisk || 0
        },
        trendData: formattedTrendData
      }
    });
  } catch (error) {
    next(error);
  }
};
