import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, university, degreeProgram, academicYear } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = Math.random().toString(36).substring(2, 15);

    const user = await User.create({
      fullName,
      email,
      password,
      university,
      degreeProgram,
      academicYear,
      verificationToken,
      isVerified: true // Set to true by default for local simulation/ease of use
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        degreeProgram: user.degreeProgram,
        academicYear: user.academicYear,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        degreeProgram: user.degreeProgram,
        academicYear: user.academicYear,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      fullName: req.body.fullName,
      university: req.body.university,
      degreeProgram: req.body.degreeProgram,
      academicYear: req.body.academicYear,
      skills: req.body.skills,
      profilePicture: req.body.profilePicture,
      bio: req.body.bio
    };

    // Filter out undefined properties
    Object.keys(fieldsToUpdate).forEach(
      (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google login callback / mock
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res, next) => {
  try {
    const { googleId, email, fullName, profilePicture } = req.body;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
        fullName,
        email,
        googleId,
        profilePicture,
        isVerified: true
      });
    } else if (!user.googleId) {
      // Link Google Account
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        university: user.university,
        degreeProgram: user.degreeProgram,
        academicYear: user.academicYear,
        skills: user.skills,
        profilePicture: user.profilePicture,
        bio: user.bio
      }
    });
  } catch (error) {
    next(error);
  }
};
