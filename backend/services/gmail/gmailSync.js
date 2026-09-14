const { getAuthenticatedGmailClient } = require('./gmailClient');
const EmailMeta = require('../../models/EmailMeta');

/**
 * Decode Base64url encoded string from Gmail API
 */
function decodeBase64Url(data) {
  if (!data) return '';
  const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return buff.toString('utf-8');
}

/**
 * Extract headers safely from Gmail payload
 */
function getHeader(headers, name) {
  if (!headers || !Array.isArray(headers)) return '';
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

/**
 * Recursively parse message parts to extract text/plain and text/html
 */
function parseMessageParts(payload) {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  if (payload.body && payload.body.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === 'text/html') {
      html += decoded;
    } else {
      text += decoded;
    }
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        text += decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
        html += decodeBase64Url(part.body.data);
      } else if (part.parts) {
        const nested = parseMessageParts(part);
        text += nested.text;
        html += nested.html;
      }
    }
  }

  return { text: text.trim(), html: html.trim() };
}

/**
 * Format raw message into user-friendly JSON
 */
function formatGmailMessage(msg, metadata = null) {
  const headers = msg.payload?.headers || [];
  const { text, html } = parseMessageParts(msg.payload);

  const subject = getHeader(headers, 'Subject') || '(No Subject)';
  const from = getHeader(headers, 'From');
  const to = getHeader(headers, 'To');
  const cc = getHeader(headers, 'Cc');
  const dateStr = getHeader(headers, 'Date');
  const labels = msg.labelIds || [];

  return {
    id: msg.id,
    threadId: msg.threadId,
    subject,
    from,
    to,
    cc,
    date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
    snippet: msg.snippet || text.substring(0, 150) || '',
    bodyText: text,
    bodyHtml: html || text,
    labels,
    isUnread: labels.includes('UNREAD'),
    isStarred: labels.includes('STARRED'),
    isInbox: labels.includes('INBOX'),
    isSent: labels.includes('SENT'),
    isTrash: labels.includes('TRASH'),
    priority: metadata?.priority || null,
    category: metadata?.category || null,
    summary: metadata?.summary || null,
    phishingAnalysis: metadata?.phishingAnalysis || null,
    actionItems: metadata?.actionItems || [],
    deadlines: metadata?.deadlines || [],
  };
}

/**
 * Fetch list of emails
 */
async function listEmails({ userId, q = '', labelIds = ['INBOX'], maxResults = 25, pageToken }) {
  const { gmail } = await getAuthenticatedGmailClient(userId);

  const params = {
    userId: 'me',
    maxResults: Math.min(maxResults, 50),
    pageToken,
  };

  if (q) params.q = q;
  if (labelIds && labelIds.length > 0) params.labelIds = labelIds;

  const res = await gmail.users.messages.list(params);
  const messagesList = res.data.messages || [];

  if (messagesList.length === 0) {
    return {
      messages: [],
      nextPageToken: null,
      resultSizeEstimate: res.data.resultSizeEstimate || 0,
    };
  }

  // Fetch details for each message in parallel
  const detailsPromises = messagesList.map((m) =>
    gmail.users.messages
      .get({ userId: 'me', id: m.id, format: 'full' })
      .then((r) => r.data)
      .catch((err) => {
        console.warn(`Failed to fetch message ${m.id}:`, err.message);
        return null;
      })
  );

  const rawMessages = (await Promise.all(detailsPromises)).filter(Boolean);

  // Fetch local metadata for these emails
  const messageIds = rawMessages.map((m) => m.id);
  const metadataDocs = await EmailMeta.find({ userId, emailId: { $in: messageIds } }).lean();
  const metaMap = new Map(metadataDocs.map((doc) => [doc.emailId, doc]));

  const formattedMessages = rawMessages.map((msg) =>
    formatGmailMessage(msg, metaMap.get(msg.id))
  );

  return {
    messages: formattedMessages,
    nextPageToken: res.data.nextPageToken || null,
    resultSizeEstimate: res.data.resultSizeEstimate || formattedMessages.length,
  };
}

/**
 * Fetch a single email by ID
 */
async function getEmailById({ userId, messageId }) {
  const { gmail } = await getAuthenticatedGmailClient(userId);

  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const metadata = await EmailMeta.findOne({ userId, emailId: messageId }).lean();
  return formatGmailMessage(res.data, metadata);
}

/**
 * Modify message labels (read/unread, star/unstar, archive, etc.)
 */
async function modifyMessageLabels({ userId, messageId, addLabelIds = [], removeLabelIds = [] }) {
  const { gmail } = await getAuthenticatedGmailClient(userId);

  const res = await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: {
      addLabelIds,
      removeLabelIds,
    },
  });

  return res.data;
}

/**
 * Trash a message
 */
async function trashMessage({ userId, messageId }) {
  const { gmail } = await getAuthenticatedGmailClient(userId);
  const res = await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
  return res.data;
}

/**
 * Construct RFC 2822 raw email string
 */
function makeRawEmail({ to, cc, bcc, subject, body, inReplyTo, references, threadId }) {
  const lines = [];
  lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  if (bcc) lines.push(`Bcc: ${bcc}`);
  lines.push(`Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`);
  lines.push('MIME-Version: 1.0');
  lines.push('Content-Type: text/html; charset=utf-8');
  lines.push('Content-Transfer-Encoding: 7bit');
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`);
  if (references) lines.push(`References: ${references}`);
  lines.push('');
  lines.push(body);

  const email = lines.join('\r\n');
  return Buffer.from(email)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Send an email via Gmail API
 */
async function sendEmail({ userId, to, cc, bcc, subject, body, inReplyTo, references, threadId }) {
  const { gmail } = await getAuthenticatedGmailClient(userId);

  const raw = makeRawEmail({ to, cc, bcc, subject, body, inReplyTo, references, threadId });

  const requestBody = { raw };
  if (threadId) {
    requestBody.threadId = threadId;
  }

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody,
  });

  return res.data;
}

module.exports = {
  listEmails,
  getEmailById,
  modifyMessageLabels,
  trashMessage,
  sendEmail,
  formatGmailMessage,
};
