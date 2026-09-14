const { getGeminiModel, generateWithFallback, isGeminiConfigured } = require('./geminiClient');

async function classifyEmail({ subject, sender, bodyText }) {
  if (!isGeminiConfigured()) {
    return getFallbackClassification(subject, sender, bodyText);
  }

  try {
    const prompt = `Analyze the following email and categorize it, and score its priority from 1 (lowest) to 5 (urgent/critical).
Categories must be strictly one of: ["Work", "Personal", "Promotions", "Spam", "Updates", "Finance", "Other"].

Email details:
- Subject: ${subject || '(No Subject)'}
- From: ${sender || 'Unknown'}
- Body:
${(bodyText || '').substring(0, 3000)}

Return ONLY valid JSON matching this schema:
{
  "priority": {
    "score": 1 to 5,
    "reason": "Brief explanation for the score"
  },
  "category": "One of the allowed categories"
}`;

    const res = await generateWithFallback(prompt, { responseMimeType: 'application/json' });
    const cleanText = res.text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return {
      priority: {
        score: Math.min(5, Math.max(1, Number(parsed.priority?.score) || 3)),
        reason: parsed.priority?.reason || 'Standard priority',
      },
      category: parsed.category || 'Work',
    };
  } catch (err) {
    console.error('[Gemini Classify Error]:', err.message);
    return getFallbackClassification(subject, sender, bodyText);
  }
}

function getFallbackClassification(subject, sender, bodyText) {
  const text = `${subject} ${bodyText} ${sender}`.toLowerCase();

  let category = 'Work';
  if (/unsubscribe|sale|discount|deal|shop|coupon|promo|offer/i.test(text)) {
    category = 'Promotions';
  } else if (/invoice|receipt|payment|bill|bank|statement|payroll/i.test(text)) {
    category = 'Finance';
  } else if (/mom|dad|family|dinner|weekend|party|friend/i.test(text)) {
    category = 'Personal';
  } else if (/newsletter|digest|terms update|security alert|notification/i.test(text)) {
    category = 'Updates';
  }

  let score = 3;
  let reason = 'Normal business communication';
  if (/urgent|asap|immediately|critical|emergency|deadline today|action required/i.test(text)) {
    score = 5;
    reason = 'Contains high-urgency keywords and immediate deadline indicators';
  } else if (/important|review required|attention|decision needed/i.test(text)) {
    score = 4;
    reason = 'Action or timely review requested';
  } else if (category === 'Promotions' || category === 'Updates') {
    score = 1;
    reason = 'Promotional or informational notification';
  }

  return {
    priority: { score, reason },
    category,
  };
}

module.exports = {
  classifyEmail,
};
