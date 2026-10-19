const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { getJwtSecret } = require('../middleware/auth');

const generateToken = (user) => {
  const secret = getJwtSecret();
  return jwt.sign(
    {
      userid: user._id,
      email: user.email,
      username: user.username,
      role: user.role || 'user'
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// Send cookie with token
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    path: '/'
  };

  const isPostifyOwner = user.username && user.username.toLowerCase() === 'postify';
  const isVerifiedUser = isPostifyOwner || Boolean(user.isVerified);

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        role: user.role || 'user',
        Profilepic: user.Profilepic,
        profilePic: user.Profilepic || 'Profilepic.jpg',
        Bannerpic: user.Bannerpic || '',
        bannerPic: user.Bannerpic || '',
        isVerified: isVerifiedUser,
        posts: user.posts
      }
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, name, email, password, age } = req.body;

    if (!email || !password || !username || typeof email !== 'string' || typeof password !== 'string' || typeof username !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password must be valid strings.'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email is already registered.'
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // If an avatar was uploaded during registration
    let profilePicFilename = 'Profilepic.jpg';
    if (req.file) {
      profilePicFilename = req.file.filename;
    }

    const user = await User.create({
      username: username.trim(),
      name: name ? name.trim() : username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      age: age ? Number(age) : undefined,
      Profilepic: profilePicFilename,
      posts: []
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password as valid strings.'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended for violating community guidelines.'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'posts',
      options: { sort: { date: -1 } },
      populate: {
        path: 'user',
        select: 'username name Profilepic Bannerpic isVerified'
      }
    });

    const isPostifyOwner = user.username && user.username.toLowerCase() === 'postify';
    const isVerifiedUser = isPostifyOwner || Boolean(user.isVerified);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        age: user.age,
        Profilepic: user.Profilepic,
        profilePic: user.Profilepic || 'Profilepic.jpg',
        Bannerpic: user.Bannerpic || '',
        bannerPic: user.Bannerpic || '',
        isVerified: isVerifiedUser,
        posts: user.posts
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Log out user & clear cookie
// @route   POST /api/auth/logout
// @access  Public / Private
exports.logout = (req, res) => {
  res.cookie('token', '', {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    path: '/'
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully.'
  });
};
