const express = require('express');
const router = express.Router();
const {
  getOAuthUrl,
  oauthCallback,
  getStatus,
  disconnectGmail,
} = require('../controllers/gmailController');
const authMiddleware = require('../middleware/authMiddleware');

// OAuth URL generation requires local auth
router.get('/oauth/url', authMiddleware, getOAuthUrl);

// OAuth callback from Google (public redirect from Google consent)
router.get('/oauth/callback', oauthCallback);

// Gmail connection status and disconnect
router.get('/status', authMiddleware, getStatus);
router.post('/disconnect', authMiddleware, disconnectGmail);

module.exports = router;
