const User = require('../models/User');
const UserProfile = require('../models/UserProfile');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profile = await UserProfile.findOne({ user_id: req.user.id });
    if (!profile) {
      profile = await UserProfile.create({ user_id: req.user.id });
    }

    res.status(200).json({
      success: true,
      data: { user, profile }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, date_of_birth, gender, address } = req.body;

    if (name && name.trim()) {
      await User.findByIdAndUpdate(req.user.id, { name: name.trim() });
    }

    const profile = await UserProfile.findOneAndUpdate(
      { user_id: req.user.id },
      { phone, date_of_birth, gender, address },
      { new: true, runValidators: true, upsert: true }
    );

    const updatedUser = await User.findById(req.user.id).select('-password');

    res.status(200).json({
      success: true,
      data: { profile, user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};
