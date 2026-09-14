const mongoose = require('mongoose');

const GmailTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    emailAddress: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // AES-256-GCM encrypted payload for access token
    encryptedAccessToken: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    // AES-256-GCM encrypted payload for refresh token with dedicated IV & AuthTag
    encryptedRefreshToken: {
      type: String,
    },
    refreshIv: {
      type: String,
    },
    refreshAuthTag: {
      type: String,
    },
    expiryDate: {
      type: Number, // Unix timestamp in ms
    },
    scope: {
      type: String,
    },
    tokenType: {
      type: String,
      default: 'Bearer',
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GmailToken', GmailTokenSchema);
