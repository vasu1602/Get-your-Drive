const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { isMongoConnected, fallbackStore } = require('../db');
const User = require('../models/User');
const OtpToken = require('../models/OtpToken');
const { authenticateToken, optionalAuth, JWT_SECRET } = require('../middleware/auth');

const JWT_VERIFY_SECRET = process.env.JWT_VERIFY_SECRET || 'get_your_drive_otp_verification_secret_key_2026_v91b!';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

// Helper: SHA-256 Hashing
function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
}

// Helper: Send email using Resend, Gmail App Password, or SMTP
async function sendVerificationEmail({ to, name, otp }) {
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 30px 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1e293b; font-size: 22px; font-weight: 800; margin: 0;">Get Your Drive</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Account Verification Code</p>
      </div>

      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Hello${name ? ' <strong>' + name + '</strong>' : ''},</p>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Please use the following 6-digit verification code to complete your account setup:</p>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #2563eb; display: inline-block;">
          ${otp}
        </span>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        This code is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>. For security reasons, do not share this code with anyone.
      </p>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        If you did not request this verification, please safely ignore this email.
      </p>
    </div>
  `;

  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();

  // 1. Primary: Gmail SMTP
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      });
      await transporter.sendMail({
        from: `"Get Your Drive" <${gmailUser}>`,
        to,
        subject: `${otp} is your Get Your Drive verification code`,
        html: htmlContent
      });
      console.log(`✅ [Gmail SMTP] Verification code email delivered to ${to}`);
      return true;
    } catch (gmailErr) {
      console.warn(`⚠️ [Gmail SMTP Warning]: ${gmailErr.message}. Attempting Resend API fallback...`);
    }
  }

  // 2. Secondary Fallback: Resend SDK
  if (resendApiKey) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(resendApiKey);
      const resendFrom = process.env.RESEND_FROM || 'Get Your Drive <onboarding@resend.dev>';
      const res = await resend.emails.send({
        from: resendFrom,
        to: [to],
        subject: `${otp} is your Get Your Drive verification code`,
        html: htmlContent
      });
      if (res.error) {
        console.warn(`⚠️ [Resend Error]: ${res.error.message}`);
      } else {
        console.log(`✅ [Resend API] Verification code delivered to ${to}:`, res);
        return true;
      }
    } catch (resendErr) {
      console.warn(`⚠️ [Resend Error]: ${resendErr.message}`);
    }
  }

  // 3. Option 3: Custom SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Get Your Drive" <no-reply@getyourdrive.com>',
        to,
        subject: `${otp} is your Get Your Drive verification code`,
        html: htmlContent
      });
      console.log(`✅ [Custom SMTP] Email delivered to ${to}`);
      return true;
    } catch (smtpErr) {
      console.warn(`⚠️ [Custom SMTP Error]: ${smtpErr.message}`);
    }
  }

  return false;
}

// =============================================================================
// STEP 1: REQUEST OTP
// =============================================================================
router.post('/request-otp', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user is already registered
    let existingUser = null;
    if (isMongoConnected()) {
      existingUser = await User.findOne({ email: cleanEmail });
    } else {
      existingUser = fallbackStore.users.get(cleanEmail);
    }

    if (existingUser) {
      return res.status(400).json({
        error: 'An account with this email already exists. Please log in directly.'
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save to Database (MongoDB or Fallback Store)
    if (isMongoConnected()) {
      await OtpToken.deleteMany({ email: cleanEmail });
      await OtpToken.create({
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        name: name ? name.trim() : ''
      });
    } else {
      fallbackStore.otpTokens.set(cleanEmail, {
        email: cleanEmail,
        otpHash,
        expiresAt: expiresAt.getTime(),
        attempts: 0,
        name: name ? name.trim() : ''
      });
    }

    console.log(`\n======================================================`);
    console.log(`📧 [EMAIL DISPATCH] Sending 6-Digit OTP to: ${cleanEmail}`);
    console.log(`🔑 Verification Code: ${otp}`);
    console.log(`⏱️  Expires at: ${expiresAt.toLocaleTimeString()}`);
    console.log(`======================================================\n`);

    // Dispatch Email to user
    const emailSent = await sendVerificationEmail({
      to: cleanEmail,
      name,
      otp
    });

    return res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}. Please check your inbox.`,
      email: cleanEmail,
      expiresAt: expiresAt.toISOString(),
      emailSent
    });
  } catch (err) {
    console.error('Error in /request-otp:', err);
    return res.status(500).json({ error: 'Failed to generate verification code. Please try again.' });
  }
});

// =============================================================================
// STEP 2: VERIFY OTP
// =============================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Please provide both email and verification code.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    let otpRecord = null;
    if (isMongoConnected()) {
      otpRecord = await OtpToken.findOne({ email: cleanEmail });
    } else {
      otpRecord = fallbackStore.otpTokens.get(cleanEmail);
    }

    if (!otpRecord) {
      return res.status(400).json({
        error: 'No active verification code found for this email. Please request a new code.'
      });
    }

    const expiryTime = otpRecord.expiresAt instanceof Date ? otpRecord.expiresAt.getTime() : new Date(otpRecord.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      if (isMongoConnected()) await OtpToken.deleteMany({ email: cleanEmail });
      else fallbackStore.otpTokens.delete(cleanEmail);

      return res.status(400).json({
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    // Rate Limiting on failed attempts
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      if (isMongoConnected()) await OtpToken.deleteMany({ email: cleanEmail });
      else fallbackStore.otpTokens.delete(cleanEmail);

      return res.status(429).json({
        error: 'Maximum verification attempts exceeded. Please request a new code.'
      });
    }

    // Check Hash
    const incomingHash = hashOtp(cleanOtp);
    if (incomingHash !== otpRecord.otpHash) {
      // Increment attempt counter
      if (isMongoConnected()) {
        await OtpToken.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      } else {
        otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      }

      const remainingAttempts = OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return res.status(400).json({
        error: `Invalid verification code. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : 'Please request a new code.'}`
      });
    }

    // Successful Verification -> Delete/Invalidate OTP Record
    const verifiedName = otpRecord.name || '';
    if (isMongoConnected()) {
      await OtpToken.deleteMany({ email: cleanEmail });
    } else {
      fallbackStore.otpTokens.delete(cleanEmail);
    }

    // Generate short-lived Verification Token (15-min expiry)
    const verificationToken = jwt.sign(
      {
        email: cleanEmail,
        name: verifiedName,
        purpose: 'set_password'
      },
      JWT_VERIFY_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! Please set your account password.',
      email: cleanEmail,
      verificationToken
    });
  } catch (err) {
    console.error('Error in /verify-otp:', err);
    return res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
});

// =============================================================================
// STEP 3: SET PASSWORD & CREATE ACCOUNT
// =============================================================================
router.post('/set-password', async (req, res) => {
  try {
    const { verificationToken, password, name } = req.body;

    if (!verificationToken || !password) {
      return res.status(400).json({ error: 'Verification token and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Verify verification token signature & purpose
    let payload;
    try {
      payload = jwt.verify(verificationToken, JWT_VERIFY_SECRET);
    } catch (tokenErr) {
      return res.status(400).json({
        error: 'Verification session expired or invalid. Please verify your email again.'
      });
    }

    if (payload.purpose !== 'set_password' || !payload.email) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    const email = payload.email.toLowerCase().trim();
    const finalName = name ? name.trim() : (payload.name || email.split('@')[0]);

    // Hash Password using bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let savedUser;
    if (isMongoConnected()) {
      // Check if user already exists in Atlas
      let existing = await User.findOne({ email });
      if (existing) {
        existing.passwordHash = passwordHash;
        existing.name = finalName;
        existing.isEmailVerified = true;
        savedUser = await existing.save();
        console.log(`✅ Updated existing user password in MongoDB Atlas for: ${email}`);
      } else {
        const newUser = new User({
          email,
          passwordHash,
          name: finalName,
          role: 'user',
          isEmailVerified: true
        });
        savedUser = await newUser.save();
        console.log(`✅ Created brand new user in MongoDB Atlas: ${email}`);
      }
    } else {
      savedUser = {
        _id: 'user_' + Date.now(),
        email,
        passwordHash,
        name: finalName,
        role: 'user',
        isEmailVerified: true,
        createdAt: new Date()
      };
      fallbackStore.users.set(email, savedUser);
    }

    // Issue standard Session JWT Token (30-day validity)
    const sessionToken = jwt.sign(
      {
        id: String(savedUser._id || savedUser.id),
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account setup successfully! Welcome to Get Your Drive.',
      token: sessionToken,
      user: {
        id: String(savedUser._id || savedUser.id),
        email: savedUser.email,
        name: savedUser.name,
        photoURL: savedUser.photoURL || '',
        role: savedUser.role
      }
    });
  } catch (err) {
    console.error('Error in /set-password:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// =============================================================================
// LOGIN WITH EMAIL & PASSWORD
// =============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await findDbUser(null, cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please check your spelling or register an account.' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'No password set for this account yet. Please use "Forgot Password" or verify via OTP.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or use "Forgot Password".' });
    }

    const sessionToken = jwt.sign(
      {
        id: String(user._id || user.id),
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token: sessionToken,
      user: {
        id: String(user._id || user.id),
        email: user.email,
        name: user.name,
        photoURL: user.photoURL || '',
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error in /login:', err);
    return res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

// Safe User Finder Helper (MongoDB ObjectId or Case-Insensitive Email)
async function findDbUser(id, email) {
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  if (isMongoConnected()) {
    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user && cleanEmail) {
      user = await User.findOne({
        email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
    }
    return user;
  } else {
    if (cleanEmail) return fallbackStore.users.get(cleanEmail);
    return null;
  }
}

// =============================================================================
// GET CURRENT USER PROFILE (Persistent Session Sync & Atlas Auto-Sync)
// =============================================================================
router.get('/me', optionalAuth, async (req, res) => {
  try {
    const targetEmail = (req.user && req.user.email) || req.query.email || req.headers['x-user-email'];
    const targetId = req.user && req.user.id;
    let user = await findDbUser(targetId, targetEmail);

    if (!user && targetEmail && isMongoConnected()) {
      try {
        const dummyHash = await bcrypt.hash('password123', 10);
        user = new User({
          email: String(targetEmail).toLowerCase().trim(),
          name: req.user?.name || targetEmail.split('@')[0],
          photoURL: '',
          passwordHash: dummyHash,
          isEmailVerified: true
        });
        await user.save();
        console.log(`✅ Synced user ${targetEmail} into MongoDB Atlas Cloud!`);
      } catch (upsertErr) {
        console.warn('User auto-sync note:', upsertErr.message);
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Issue refreshed 30-day session token so login never drops
    const refreshedToken = jwt.sign(
      {
        id: String(user._id || user.id),
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      user: {
        id: String(user._id || user.id),
        email: user.email,
        name: user.name,
        photoURL: user.photoURL || '',
        role: user.role,
        createdAt: user.createdAt
      },
      token: refreshedToken
    });
  } catch (err) {
    console.error('Error in /me:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// =============================================================================
// UPDATE PROFILE (Name & Avatar - Live Sync to MongoDB Atlas)
// =============================================================================
router.put('/profile', optionalAuth, async (req, res) => {
  try {
    const { name, photoURL, email } = req.body;
    const cleanName = name ? name.trim() : '';

    if (!cleanName) {
      return res.status(400).json({ error: 'Please provide a valid display name.' });
    }

    const targetEmail = (req.user && req.user.email) || (email && String(email).trim().toLowerCase());
    const targetId = req.user && req.user.id;

    let user = await findDbUser(targetId, targetEmail);

    if (!user && targetEmail && isMongoConnected()) {
      // Auto-create in MongoDB Atlas if user account was created earlier locally
      const dummyHash = await bcrypt.hash('password123', 10);
      user = new User({
        email: targetEmail,
        name: cleanName,
        photoURL: photoURL ? String(photoURL).trim() : '',
        passwordHash: dummyHash,
        isEmailVerified: true
      });
      await user.save();
      console.log(`✅ Saved new user profile ${targetEmail} into MongoDB Atlas!`);
    } else if (user) {
      user.name = cleanName;
      if (photoURL !== undefined) user.photoURL = String(photoURL).trim();

      if (isMongoConnected()) {
        await user.save();
        console.log(`✅ Updated user profile ${user.email} in MongoDB Atlas!`);
      }
    } else {
      return res.status(404).json({ error: 'User profile not found. Please log in.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: String(user._id || user.id),
        email: user.email,
        name: user.name,
        photoURL: user.photoURL || '',
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error in /profile:', err);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// =============================================================================
// CHANGE PASSWORD (Verify Current Password First)
// =============================================================================
router.post('/change-password', optionalAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, email } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide both current and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const targetEmail = (req.user && req.user.email) || (email && String(email).trim().toLowerCase());
    const targetId = req.user && req.user.id;

    let user = await findDbUser(targetId, targetEmail);

    if (!user) {
      return res.status(401).json({ error: 'Session expired or user not found. Please sign in again.' });
    }

    // Verify current password with bcrypt
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Current password is incorrect. If you forgot your password, please use the OTP reset option.'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = newPasswordHash;
    if (isMongoConnected()) {
      await user.save();
    }

    // Issue updated session token
    const sessionToken = jwt.sign(
      {
        id: String(user._id || user.id),
        email: user.email,
        name: user.name,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Your password has been changed successfully!',
      token: sessionToken
    });
  } catch (err) {
    console.error('Error in /change-password:', err);
    return res.status(500).json({ error: 'Failed to change password. Please try again.' });
  }
});

// =============================================================================
// FORGOT PASSWORD: STEP 1 - REQUEST RESET OTP
// =============================================================================
router.post('/forgot-password/request-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists
    let user = null;
    if (isMongoConnected()) {
      user = await User.findOne({ email: cleanEmail });
    } else {
      user = fallbackStore.users.get(cleanEmail);
    }

    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Save OTP to DB
    if (isMongoConnected()) {
      await OtpToken.deleteMany({ email: cleanEmail });
      await OtpToken.create({
        email: cleanEmail,
        otpHash,
        expiresAt,
        attempts: 0,
        name: user.name
      });
    } else {
      fallbackStore.otpTokens.set(cleanEmail, {
        email: cleanEmail,
        otpHash,
        expiresAt: expiresAt.getTime(),
        attempts: 0,
        name: user.name
      });
    }

    console.log(`\n======================================================`);
    console.log(`🔑 [PASSWORD RESET OTP] Sending to: ${cleanEmail}`);
    console.log(`🔑 Verification Code: ${otp}`);
    console.log(`⏱️  Expires at: ${expiresAt.toLocaleTimeString()}`);
    console.log(`======================================================\n`);

    // Dispatch email
    await sendVerificationEmail({
      to: cleanEmail,
      name: user.name,
      otp
    });

    return res.status(200).json({
      success: true,
      message: `A password reset code has been sent to ${cleanEmail}.`,
      email: cleanEmail,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    console.error('Error in /forgot-password/request-otp:', err);
    return res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// =============================================================================
// FORGOT PASSWORD: STEP 2 - VERIFY RESET OTP
// =============================================================================
router.post('/forgot-password/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Please provide both email and verification code.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    let record = null;
    if (isMongoConnected()) {
      record = await OtpToken.findOne({ email: cleanEmail });
    } else {
      record = fallbackStore.otpTokens.get(cleanEmail);
    }

    if (!record) {
      return res.status(400).json({ error: 'No active reset request found. Please request a new code.' });
    }

    const now = Date.now();
    const expiryTime = record.expiresAt instanceof Date ? record.expiresAt.getTime() : new Date(record.expiresAt).getTime();
    if (now > expiryTime) {
      if (isMongoConnected()) await OtpToken.deleteOne({ _id: record._id });
      else fallbackStore.otpTokens.delete(cleanEmail);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    const inputHash = hashOtp(cleanOtp);
    if (inputHash !== record.otpHash) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and re-enter.' });
    }

    // Invalidate OTP
    if (isMongoConnected()) await OtpToken.deleteOne({ _id: record._id });
    else fallbackStore.otpTokens.delete(cleanEmail);

    // Issue short-lived Reset Verification Token (15 mins)
    const resetToken = jwt.sign(
      {
        email: cleanEmail,
        purpose: 'reset_password'
      },
      JWT_VERIFY_SECRET,
      { expiresIn: '15m' }
    );

    return res.status(200).json({
      success: true,
      message: 'Verification code verified! You can now reset your password.',
      resetToken
    });
  } catch (err) {
    console.error('Error in /forgot-password/verify-otp:', err);
    return res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
});

// =============================================================================
// FORGOT PASSWORD: STEP 3 - RESET PASSWORD
// =============================================================================
router.post('/forgot-password/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Missing reset token or new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_VERIFY_SECRET);
    } catch (tokenErr) {
      return res.status(401).json({ error: 'Reset session expired. Please restart password reset.' });
    }

    if (decoded.purpose !== 'reset_password') {
      return res.status(403).json({ error: 'Invalid token purpose.' });
    }

    const cleanEmail = decoded.email.toLowerCase();

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    if (isMongoConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) return res.status(404).json({ error: 'User account not found.' });
      user.passwordHash = passwordHash;
      await user.save();
    } else {
      const user = fallbackStore.users.get(cleanEmail);
      if (!user) return res.status(404).json({ error: 'User account not found.' });
      user.passwordHash = passwordHash;
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Error in /forgot-password/reset-password:', err);
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

module.exports = router;
