const express = require('express');
const router = express.Router();
const {
  getEmails,
  getEmail,
  modifyEmail,
  deleteEmail,
  sendEmail,
  getAnalytics,
} = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');

// All email routes require authentication
router.use(authMiddleware);

router.get('/', getEmails);
router.get('/analytics', getAnalytics);
router.get('/:id', getEmail);
router.patch('/:id/modify', modifyEmail);
router.delete('/:id', deleteEmail);
router.post('/send', sendEmail);

module.exports = router;
