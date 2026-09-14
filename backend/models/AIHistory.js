const mongoose = require('mongoose');

const AIHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    emailId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: ['summary', 'reply', 'classification', 'phishing', 'action_items', 'smart_search'],
      required: true,
    },
    tone: {
      type: String,
    },
    language: {
      type: String,
      default: 'English',
    },
    promptSnippet: {
      type: String,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    modelUsed: {
      type: String,
      default: 'gemini-1.5-flash',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AIHistory', AIHistorySchema);
