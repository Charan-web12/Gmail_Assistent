const { generateWithFallback, isGeminiConfigured } = require('./geminiClient');
const AIHistory = require('../../models/AIHistory');
const EmailMeta = require('../../models/EmailMeta');

async function summarizeEmail({ userId, emailId, subject, sender, bodyText }) {
  // Check if we already have a cached summary in EmailMeta
  const existingMeta = await EmailMeta.findOne({ userId, emailId });
  if (existingMeta && existingMeta.summary) {
    return {
      summary: existingMeta.summary,
      cached: true,
    };
  }

  let summary = '';
  let modelUsed = 'gemini-3.6-flash';

  if (isGeminiConfigured()) {
    try {
      const prompt = `You are an executive email assistant. Summarize the following email in 2 to 4 clear, impactful sentences. Highlight the sender's core intent, key details, and any requested response.

Subject: ${subject || '(No Subject)'}
From: ${sender || 'Unknown'}
Email Body:
${bodyText.substring(0, 4000)}

Summary:`;

      const result = await generateWithFallback(prompt);
      summary = result.text.trim();
      modelUsed = result.modelUsed;
    } catch (err) {
      console.error('[Gemini Summarize Error]:', err.message);
      summary = generateFallbackSummary(subject, bodyText);
      modelUsed = 'rule-based-fallback';
    }
  } else {
    summary = generateFallbackSummary(subject, bodyText);
    modelUsed = 'rule-based-fallback';
  }

  // Cache in EmailMeta
  await EmailMeta.findOneAndUpdate(
    { userId, emailId },
    { $set: { summary } },
    { upsert: true, new: true }
  );

  // Log to AIHistory
  await AIHistory.create({
    userId,
    emailId,
    type: 'summary',
    promptSnippet: subject,
    result: summary,
    modelUsed,
  });

  return {
    summary,
    cached: false,
  };
}

function generateFallbackSummary(subject, bodyText) {
  const cleanBody = (bodyText || '').replace(/\s+/g, ' ').trim();
  if (!cleanBody) {
    return `Email regarding "${subject || 'this topic'}". No detailed text content provided.`;
  }
  const sentences = cleanBody.split(/(?<=[.?!])\s+/).filter(Boolean);
  if (sentences.length <= 3) {
    return sentences.join(' ');
  }
  return `${sentences.slice(0, 2).join(' ')} In summary, this message addresses ${subject || 'the specified matters'}.`;
}

module.exports = {
  summarizeEmail,
};
