const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const mongoose = require('mongoose');

exports.getProfile = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database offline. Returning mock profile.');
      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            name: req.user.name || 'Demo User',
            email: req.user.email || 'demo@example.com',
            role: req.user.role || 'user'
          },
          profile: {
            user_id: req.user.id,
            phone: '123-456-7890',
            address: '123 Health Ave, Medical Center',
            gender: 'prefer_not_to_say',
            date_of_birth: '1995-01-01'
          }
        }
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    const profile = await UserProfile.findOne({ user_id: req.user.id });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { phone, date_of_birth, gender, address } = req.body;

    if (mongoose.connection.readyState !== 1) {
      console.warn('⚠️ Database offline. Returning simulated updated profile.');
      return res.status(200).json({
        success: true,
        data: {
          user_id: req.user.id,
          phone,
          date_of_birth,
          gender,
          address
        }
      });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { user_id: req.user.id },
      { phone, date_of_birth, gender, address },
      { new: true, runValidators: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
};
