const { google } = require('googleapis');
const GmailToken = require('../../models/GmailToken');
const { createOAuth2Client, decrypt, encrypt } = require('./gmailAuth');

/**
 * Returns an authenticated Gmail API client instance for the specified user
 */
async function getAuthenticatedGmailClient(userId) {
  const tokenDoc = await GmailToken.findOne({ userId });
  if (!tokenDoc) {
    const error = new Error('Gmail account not connected. Please connect your Gmail account.');
    error.statusCode = 401;
    error.code = 'GMAIL_NOT_CONNECTED';
    throw error;
  }

  // Decrypt access token
  const accessToken = decrypt(tokenDoc.encryptedAccessToken, tokenDoc.iv, tokenDoc.authTag);

  // Decrypt refresh token using its dedicated IV and AuthTag (or fallback to doc.iv if legacy)
  let refreshToken = null;
  if (tokenDoc.encryptedRefreshToken) {
    const refIv = tokenDoc.refreshIv || tokenDoc.iv;
    const refTag = tokenDoc.refreshAuthTag || tokenDoc.authTag;
    refreshToken = decrypt(tokenDoc.encryptedRefreshToken, refIv, refTag);
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: tokenDoc.expiryDate,
    token_type: tokenDoc.tokenType || 'Bearer',
  });

  // Listen for automatic token refresh event
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      console.log(`[GmailClient] Refreshed tokens for user ${userId}`);
      const accessEnc = encrypt(newTokens.access_token);
      const updateData = {
        encryptedAccessToken: accessEnc.encrypted,
        iv: accessEnc.iv,
        authTag: accessEnc.authTag,
        expiryDate: newTokens.expiry_date,
      };

      if (newTokens.refresh_token) {
        const refreshEnc = encrypt(newTokens.refresh_token);
        updateData.encryptedRefreshToken = refreshEnc.encrypted;
        updateData.refreshIv = refreshEnc.iv;
        updateData.refreshAuthTag = refreshEnc.authTag;
      }

      await GmailToken.updateOne({ userId }, updateData);
    } catch (err) {
      console.error('[GmailClient] Error updating refreshed token:', err);
    }
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  return { gmail, oauth2Client, emailAddress: tokenDoc.emailAddress };
}

module.exports = {
  getAuthenticatedGmailClient,
};
