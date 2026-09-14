const mongoose = require('mongoose');

const EmailMetaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    emailId: {
      type: String,
      required: true,
      index: true,
    },
    threadId: {
      type: String,
    },
    summary: {
      type: String,
    },
    priority: {
      score: {
        type: Number,
        min: 1,
        max: 5,
        default: 3,
      },
      reason: String,
    },
    category: {
      type: String,
      enum: ['Work', 'Personal', 'Promotions', 'Spam', 'Updates', 'Finance', 'Other'],
      default: 'Work',
    },
    phishingAnalysis: {
      isSuspicious: {
        type: Boolean,
        default: false,
      },
      riskScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      warnings: [String],
    },
    actionItems: [
      {
        task: String,
        assignee: String,
        deadline: String,
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    deadlines: [
      {
        date: String,
        description: String,
        context: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

EmailMetaSchema.index({ userId: 1, emailId: 1 }, { unique: true });

module.exports = mongoose.model('EmailMeta', EmailMetaSchema);
