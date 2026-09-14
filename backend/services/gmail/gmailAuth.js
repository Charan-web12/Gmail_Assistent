const crypto = require('crypto');
const { google } = require('googleapis');
const GmailToken = require('../../models/GmailToken');

// Normalize encryption key to 32 bytes
function getEncryptionKey() {
  const keyString = process.env.TOKEN_ENCRYPTION_KEY || 'default_dev_token_encryption_key_32bytes!';
  if (keyString.length === 64 && /^[0-9a-fA-F]+$/.test(keyString)) {
    return Buffer.from(keyString, 'hex');
  }
  return crypto.createHash('sha256').update(keyString).digest();
}

/**
 * Encrypt plain text using AES-256-GCM
 */
function encrypt(text) {
  if (!text) return { encrypted: null, iv: null, authTag: null };
  const iv = crypto.randomBytes(12); // Recommended 12 bytes for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
function decrypt(encrypted, ivHex, authTagHex) {
  if (!encrypted || !ivHex || !authTagHex) return null;
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[Decryption Error]:', err.message);
    return null;
  }
}

/**
 * Creates and returns configured Google OAuth2 client
 */
function createOAuth2Client() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/gmail/oauth/callback').trim();

  if (!clientId || !clientSecret) {
    const error = new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment.');
    error.code = 'GOOGLE_OAUTH_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }

  try {
    const parsedRedirectUri = new URL(redirectUri);
    if (!['http:', 'https:'].includes(parsedRedirectUri.protocol)) {
      throw new Error('GOOGLE_REDIRECT_URI must use http or https.');
    }
  } catch (err) {
    const error = new Error(`Invalid GOOGLE_REDIRECT_URI: ${err.message}`);
    error.code = 'GOOGLE_REDIRECT_URI_INVALID';
    error.statusCode = 500;
    throw error;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generates the Google OAuth authorization URL
 */
function getAuthUrl(userId) {
  const oauth2Client = createOAuth2Client();

  // Combine configured and essential scopes
  const scopesSet = new Set([
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email',
  ]);

  if (process.env.GMAIL_SCOPES) {
    process.env.GMAIL_SCOPES.split(',').forEach((s) => {
      const trimmed = s.trim();
      if (trimmed) scopesSet.add(trimmed);
    });
  }

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Critical for receiving refresh_token
    prompt: 'consent',     // Forces consent screen so refresh_token is always returned
    scope: Array.from(scopesSet),
    state: userId.toString(),
  });
}

/**
 * Exchanges auth code for tokens and saves encrypted tokens in MongoDB
 */
async function handleOAuthCallback(code, userId) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  // Fetch connected email address using Gmail API getProfile or userinfo
  let emailAddress = '';
  try {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    emailAddress = profile.data.emailAddress || '';
  } catch (profileErr) {
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      emailAddress = userInfo.data.email || '';
    } catch (err) {
      console.warn('Could not fetch email address:', err.message);
    }
  }

  // Encrypt tokens with distinct IV and AuthTag for each token
  const accessEnc = encrypt(tokens.access_token);
  const refreshEnc = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

  const existingTokenDoc = await GmailToken.findOne({ userId });

  let encryptedRefreshToken = refreshEnc ? refreshEnc.encrypted : undefined;
  let refreshIv = refreshEnc ? refreshEnc.iv : undefined;
  let refreshAuthTag = refreshEnc ? refreshEnc.authTag : undefined;

  // Preserve existing refresh token if Google didn't return a new one on re-auth
  if (!encryptedRefreshToken && existingTokenDoc) {
    encryptedRefreshToken = existingTokenDoc.encryptedRefreshToken;
    refreshIv = existingTokenDoc.refreshIv;
    refreshAuthTag = existingTokenDoc.refreshAuthTag;
  }

  const tokenData = {
    userId,
    emailAddress: emailAddress || existingTokenDoc?.emailAddress || 'Connected Account',
    encryptedAccessToken: accessEnc.encrypted,
    iv: accessEnc.iv,
    authTag: accessEnc.authTag,
    encryptedRefreshToken,
    refreshIv,
    refreshAuthTag,
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
    tokenType: tokens.token_type || 'Bearer',
    connectedAt: new Date(),
  };

  const savedToken = await GmailToken.findOneAndUpdate(
    { userId },
    tokenData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`[GmailAuth] Successfully saved encrypted OAuth tokens for user: ${userId} (${savedToken.emailAddress})`);

  return {
    success: true,
    emailAddress: savedToken.emailAddress,
    connectedAt: savedToken.connectedAt,
  };
}

module.exports = {
  encrypt,
  decrypt,
  createOAuth2Client,
  getAuthUrl,
  handleOAuthCallback,
};
