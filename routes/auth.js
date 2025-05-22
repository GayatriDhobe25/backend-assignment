const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const sendMail = require('../utils/sendMail');
const rateLimit = require('express-rate-limit');

let tokenStore = {}; // Temporary in-memory store for registration tokens
let resetTokens = {}; // Temporary in-memory store for password reset tokens

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: '⚠️ Too many attempts. Try again after 15 minutes.',
});

// 1️⃣ Register - Send verification token via email
router.post('/register', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Generate token with email
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Store token temporarily (optional)
  tokenStore[email] = token;

  try {
    await sendMail(email, 'Verify your email', `Your verification token: ${token}`);
    res.json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error('Error sending mail:', err);
    res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

// 2️⃣ Verify Registration - Accept token + password, create user
router.post('/verify-registration', authLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  try {
    // Verify token and extract email
    const { email } = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already registered.' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save user with verified true
    const newUser = new User({ email, password: hashedPassword, verified: true });
    await newUser.save();

    res.json({ message: 'User verified and registered.' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid or expired token.' });
  }
});

// 3️⃣ Login - Verify credentials and return JWT
const activeTokens = {};
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.verified) {
      return res.status(400).json({ error: 'User not found or not verified' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// 4️⃣ Protected route - example
router.get('/protected', (req, res) => {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1]; // Expect Bearer <token>
  if (!token) return res.status(401).json({ error: 'Malformed token' });

  try {
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (activeTokens[decoded.id] !== token) {
      return res.status(401).json({ error: 'Token expired or user logged in elsewhere' });
    }
    res.json({ message: 'Protected route accessed.', userId: decoded.id });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// 5️⃣ Request password reset - sends email with reset link/token
router.post('/request-reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Generate reset token (valid 15 minutes)
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Store token in-memory (optional: use DB or Redis for production)
    resetTokens[resetToken] = user._id;

    // Create reset link (adjust FRONTEND_URL for your environment)
    const resetLink = `${process.env.BASE_URL}/reset-password/${resetToken}`;

    // Send reset email
    await sendMail(
      user.email,
      'Password Reset Request',
      `Click the link below to reset your password (valid for 15 minutes):\n\n${resetLink}`
    );

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while requesting password reset' });
  }
});

// 6️⃣ Reset password with token
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'New password is required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token validity in store
    if (!resetTokens[token]) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Find user by ID
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Hash and update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    // Remove token from store to prevent reuse
    delete resetTokens[token];

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;

