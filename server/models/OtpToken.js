const mongoose = require('mongoose');

const OtpTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otpHash: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: '10m' } // TTL index automatically cleans up expired OTPs
  },
  attempts: {
    type: Number,
    default: 0
  },
  name: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.OtpToken || mongoose.model('OtpToken', OtpTokenSchema);
