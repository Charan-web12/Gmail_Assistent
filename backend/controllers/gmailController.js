const { getAuthUrl, handleOAuthCallback } = require('../services/gmail/gmailAuth');
const GmailToken = require('../models/GmailToken');

/**
 * @desc    Generate Google OAuth2 URL
 * @route   GET /api/gmail/oauth/url
 */
const getOAuthUrl = async (req, res, next) => {
  try {
    const url = getAuthUrl(req.user._id);
    res.status(200).json({ success: true, url });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle Google OAuth callback
 * @route   GET /api/gmail/oauth/callback
 */
const oauthCallback = async (req, res, next) => {
  try {
    const { code, state: userId, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (error) {
      console.warn('OAuth callback error from Google:', error);
      return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent(error)}`);
    }

    if (!code || !userId) {
      return res.redirect(`${frontendUrl}/settings?error=missing_code_or_state`);
    }

    await handleOAuthCallback(code, userId);

    return res.redirect(`${frontendUrl}/inbox?gmail_connected=true`);
  } catch (error) {
    console.error('Error during Gmail OAuth callback:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const errorMessage = error.response?.data?.error_description || error.message || 'oauth_failed';
    return res.redirect(
      `${frontendUrl}/settings?error=${encodeURIComponent(errorMessage)}`
    );
  }
};

/**
 * @desc    Get status of Gmail account connection
 * @route   GET /api/gmail/status
 */
const getStatus = async (req, res, next) => {
  try {
    const tokenDoc = await GmailToken.findOne({ userId: req.user._id });
    if (!tokenDoc) {
      return res.status(200).json({
        success: true,
        connected: false,
        emailAddress: null,
      });
    }

    res.status(200).json({
      success: true,
      connected: true,
      emailAddress: tokenDoc.emailAddress || 'Connected Account',
      connectedAt: tokenDoc.connectedAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Disconnect Gmail account
 * @route   POST /api/gmail/disconnect
 */
const disconnectGmail = async (req, res, next) => {
  try {
    await GmailToken.findOneAndDelete({ userId: req.user._id });
    res.status(200).json({
      success: true,
      message: 'Gmail account disconnected successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOAuthUrl,
  oauthCallback,
  getStatus,
  disconnectGmail,
};
