const { getGeminiModel, generateWithFallback, isGeminiConfigured, PREFERRED_MODELS } = require('./geminiClient');
const AIHistory = require('../../models/AIHistory');

/**
 * Builds the system prompt for reply generation
 */
function buildReplyPrompt({ subject, sender, bodyText, tone = 'Professional', language = 'English', instructions = '' }) {
  return `You are an intelligent email drafting assistant. Draft a high quality email reply based on the context below.

CONTEXT:
- Original Subject: ${subject || '(No Subject)'}
- From: ${sender || 'Unknown Sender'}
- Original Message:
${(bodyText || '').substring(0, 3500)}

REQUIREMENTS:
- Desired Tone: ${tone} (e.g., Professional: courteous & polished; Friendly: warm & approachable; Short: concise, direct, under 3-4 sentences; Casual: relaxed & conversational).
- Target Language: ${language} (Draft the reply entirely in this language).
${instructions ? `- Specific Instructions: ${instructions}` : ''}
- Do NOT output placeholder brackets like "[Your Name]" if you can avoid it; end politely with a natural sign-off.
- Output ONLY the email reply text. Do not include markdown preamble, explanations, or commentary.

REPLY:`;
}

/**
 * Generate email reply synchronously
 */
async function generateReply({ userId, emailId, subject, sender, bodyText, tone = 'Professional', language = 'English', instructions = '' }) {
  let replyText = '';
  let modelUsed = 'gemini-3.6-flash';

  if (isGeminiConfigured()) {
    try {
      const prompt = buildReplyPrompt({ subject, sender, bodyText, tone, language, instructions });
      const result = await generateWithFallback(prompt);
      replyText = result.text.trim();
      modelUsed = result.modelUsed;
    } catch (err) {
      console.error('[Gemini Reply Error]:', err.message);
      replyText = getFallbackReply(sender, tone, language);
      modelUsed = 'rule-based-fallback';
    }
  } else {
    replyText = getFallbackReply(sender, tone, language);
    modelUsed = 'rule-based-fallback';
  }

  // Log to AIHistory
  if (userId) {
    await AIHistory.create({
      userId,
      emailId,
      type: 'reply',
      tone,
      language,
      promptSnippet: `Instructions: ${instructions || 'None'} | Subject: ${subject}`,
      result: replyText,
      modelUsed,
    }).catch((e) => console.warn('Failed to log AIHistory:', e.message));
  }

  return { reply: replyText, tone, language, modelUsed };
}

/**
 * Stream email reply using Server-Sent Events or chunk callback
 */
async function generateReplyStream({ userId, emailId, subject, sender, bodyText, tone = 'Professional', language = 'English', instructions = '', onChunk, onDone, onError }) {
  if (!isGeminiConfigured()) {
    const fallback = getFallbackReply(sender, tone, language);
    // Simulate streaming for development / fallback
    const words = fallback.split(' ');
    let current = '';
    for (let i = 0; i < words.length; i++) {
      const chunk = words[i] + ' ';
      current += chunk;
      onChunk(chunk);
      await new Promise((r) => setTimeout(r, 40));
    }
    if (userId) {
      AIHistory.create({
        userId,
        emailId,
        type: 'reply',
        tone,
        language,
        promptSnippet: instructions || subject,
        result: current,
        modelUsed: 'mock-stream',
      }).catch(() => {});
    }
    onDone(current);
    return;
  }

  const prompt = buildReplyPrompt({ subject, sender, bodyText, tone, language, instructions });

  // Try stream with preferred model list
  let streamed = false;
  for (const modelName of PREFERRED_MODELS) {
    try {
      const model = getGeminiModel(modelName);
      if (!model) continue;

      const resultStream = await model.generateContentStream(prompt);
      let fullText = '';
      for await (const chunk of resultStream.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        onChunk(chunkText);
      }

      if (userId) {
        AIHistory.create({
          userId,
          emailId,
          type: 'reply',
          tone,
          language,
          promptSnippet: instructions || subject,
          result: fullText,
          modelUsed: modelName,
        }).catch(() => {});
      }

      onDone(fullText);
      streamed = true;
      break;
    } catch (err) {
      console.warn(`[Gemini Stream] ${modelName} streaming error: ${err.message}. Trying next model...`);
    }
  }

  if (!streamed) {
    // Fallback if all streams fail
    const fallback = getFallbackReply(sender, tone, language);
    onChunk(fallback);
    onDone(fallback);
  }
}

function getFallbackReply(sender, tone, language) {
  const name = sender ? sender.split('<')[0].replace(/"/g, '').trim() : 'there';
  if (tone === 'Short') {
    return `Hi ${name},\n\nThank you for the update. Received and confirmed. I will follow up shortly.\n\nBest regards,`;
  }
  if (tone === 'Friendly') {
    return `Hi ${name}!\n\nThanks so much for reaching out. I really appreciate the detailed note. Everything looks great from my end, and I'd love to chat more about this soon.\n\nWarmly,`;
  }
  return `Dear ${name},\n\nThank you for your email. I have reviewed the details provided and agree with the proposed direction. Please let me know if any further information is needed from my side.\n\nBest regards,`;
}

module.exports = {
  generateReply,
  generateReplyStream,
};
