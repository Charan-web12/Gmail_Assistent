const { encrypt, decrypt } = require('./services/gmail/gmailAuth');
const jwt = require('jsonwebtoken');

console.log('--- Testing Backend Security & Services ---');

// 1. Test AES-256-GCM round trip
const sampleToken = 'ya29.a0AfH6SMAexample_google_oauth2_refresh_token_123456789';
const encrypted = encrypt(sampleToken);
console.log('Encrypted token payload:', {
  encryptedLen: encrypted.encrypted.length,
  ivLen: encrypted.iv.length,
  authTagLen: encrypted.authTag.length,
});

const decrypted = decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag);
if (decrypted === sampleToken) {
  console.log('✅ AES-256-GCM Token Encryption & Decryption passed!');
} else {
  console.error('❌ AES-256-GCM Mismatch! Decrypted:', decrypted);
  process.exit(1);
}

// 2. Test JWT sign & verify
const testPayload = { id: 'user_12345', email: 'test@example.com' };
const secret = 'test_secret_key_32_characters_long_min!';
const token = jwt.sign(testPayload, secret, { expiresIn: '1h' });
const verified = jwt.verify(token, secret);
if (verified.id === testPayload.id && verified.email === testPayload.email) {
  console.log('✅ JWT sign & verify passed!');
} else {
  console.error('❌ JWT verify failed!');
  process.exit(1);
}

console.log('All backend core unit tests passed successfully.');
process.exit(0);
