const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  summarize,
  reply,
  replyStream,
  analyze,
  smartSearch,
  getHistory,
} = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

// Rate limiting for AI endpoints to avoid abuse/cost blowouts
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { success: false, message: 'AI rate limit exceeded. Please wait a moment before trying again.' },
});

router.use(authMiddleware);
router.use(aiLimiter);

router.post('/summarize', summarize);
router.post('/reply', reply);
router.post('/reply/stream', replyStream);
router.post('/analyze/:id', analyze);
router.post('/smart-search', smartSearch);
router.get('/history', getHistory);

module.exports = router;
