const Screening = require('../models/Screening');
const ScreeningResult = require('../models/ScreeningResult');

exports.getSummary = async (req, res, next) => {
  try {
    const mongoose = require('mongoose');

    if (mongoose.connection.readyState !== 1) {
      console.error(`[Analytics Error] Database not connected (readyState: ${mongoose.connection.readyState})`);
      return res.status(503).json({
        success: false,
        message: 'Database is currently unavailable. Please verify MongoDB Atlas connection.'
      });
    }

    const rawUserId = req.user?._id || req.user?.id;
    if (!rawUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(rawUserId)
      ? new mongoose.Types.ObjectId(rawUserId)
      : rawUserId;

    const userMatch = {
      $or: [
        { user_id: userObjectId },
        { user_id: rawUserId.toString() }
      ]
    };

    const total = await Screening.countDocuments(userMatch);

    const results = await Screening.aggregate([
      { $match: userMatch },
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
      {
        $match: {
          ...userMatch,
          uploaded_at: { $gte: thirtyDaysAgo }
        }
      },
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

    console.log(`[Analytics] Computed summary for user ${rawUserId}: total=${total}, benign=${stats.benign || 0}, malignant=${stats.malignant || 0}`);

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
    console.error('[Analytics Error]', error.message);
    next(error);
  }
};

