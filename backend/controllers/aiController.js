const { summarizeEmail } = require('../services/ai/summarize');
const { generateReply, generateReplyStream } = require('../services/ai/generateReply');
const { classifyEmail } = require('../services/ai/classify');
const { detectPhishing } = require('../services/ai/detectPhishing');
const { extractActionItems } = require('../services/ai/extractActionItems');
const { translateNaturalLanguageToGmailQuery } = require('../services/ai/smartSearch');
const AIHistory = require('../models/AIHistory');
const EmailMeta = require('../models/EmailMeta');

/**
 * @desc    Generate email summary
 * @route   POST /api/ai/summarize
 */
const summarize = async (req, res, next) => {
  try {
    const { emailId, subject, sender, bodyText } = req.body;

    if (!bodyText && !subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject or bodyText is required for summarization.',
      });
    }

    const result = await summarizeEmail({
      userId: req.user._id,
      emailId: emailId || `custom-${Date.now()}`,
      subject,
      sender,
      bodyText,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate email reply (standard JSON response)
 * @route   POST /api/ai/reply
 */
const reply = async (req, res, next) => {
  try {
    const { emailId, subject, sender, bodyText, tone, language, instructions } = req.body;

    const result = await generateReply({
      userId: req.user._id,
      emailId,
      subject,
      sender,
      bodyText,
      tone: tone || req.user.preferences?.defaultTone || 'Professional',
      language: language || req.user.preferences?.defaultLanguage || 'English',
      instructions,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stream email reply (Server-Sent Events)
 * @route   POST /api/ai/reply/stream
 */
const replyStream = async (req, res) => {
  const { emailId, subject, sender, bodyText, tone, language, instructions } = req.body;

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const onChunk = (chunk) => {
    res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
  };

  const onDone = (fullText) => {
    res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
    res.end();
  };

  const onError = (err) => {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  };

  await generateReplyStream({
    userId: req.user._id,
    emailId,
    subject,
    sender,
    bodyText,
    tone: tone || req.user.preferences?.defaultTone || 'Professional',
    language: language || req.user.preferences?.defaultLanguage || 'English',
    instructions,
    onChunk,
    onDone,
    onError,
  });
};

/**
 * @desc    Comprehensive AI analysis (classification, priority, phishing, actions, deadlines)
 * @route   POST /api/ai/analyze/:id
 */
const analyze = async (req, res, next) => {
  try {
    const { id: emailId } = req.params;
    const { subject, sender, bodyText } = req.body;

    // Check if we have existing complete metadata
    let meta = await EmailMeta.findOne({ userId: req.user._id, emailId });

    const [classifyRes, phishingRes, actionRes, summaryRes] = await Promise.all([
      classifyEmail({ subject, sender, bodyText }),
      detectPhishing({ subject, sender, bodyText }),
      extractActionItems({ subject, sender, bodyText }),
      summarizeEmail({ userId: req.user._id, emailId, subject, sender, bodyText }),
    ]);

    meta = await EmailMeta.findOneAndUpdate(
      { userId: req.user._id, emailId },
      {
        $set: {
          summary: summaryRes.summary,
          priority: classifyRes.priority,
          category: classifyRes.category,
          phishingAnalysis: phishingRes,
          actionItems: actionRes.actionItems,
          deadlines: actionRes.deadlines,
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      emailId,
      summary: meta.summary,
      priority: meta.priority,
      category: meta.category,
      phishingAnalysis: meta.phishingAnalysis,
      actionItems: meta.actionItems,
      deadlines: meta.deadlines,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Convert natural language search query to Gmail syntax
 * @route   POST /api/ai/smart-search
 */
const smartSearch = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const translatedQuery = await translateNaturalLanguageToGmailQuery(query);

    // Log smart search to history
    await AIHistory.create({
      userId: req.user._id,
      type: 'smart_search',
      promptSnippet: query,
      result: translatedQuery,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      originalQuery: query,
      gmailQuery: translatedQuery,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user's AI activity history
 * @route   GET /api/ai/history
 */
const getHistory = async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const history = await AIHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  summarize,
  reply,
  replyStream,
  analyze,
  smartSearch,
  getHistory,
};
