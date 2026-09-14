const { generateWithFallback, isGeminiConfigured } = require('./geminiClient');

async function detectPhishing({ subject, sender, bodyText }) {
  if (!isGeminiConfigured()) {
    return getFallbackPhishingScan(subject, sender, bodyText);
  }

  try {
    const prompt = `You are a cybersecurity expert specializing in email fraud and phishing detection.
Analyze this email for security threats, phishing patterns, credential harvesting, domain spoofing, urgency traps, or wire fraud.

Email Information:
- Sender: ${sender || 'Unknown'}
- Subject: ${subject || '(No Subject)'}
- Content:
${(bodyText || '').substring(0, 3000)}

Return ONLY valid JSON matching this schema:
{
  "isSuspicious": boolean,
  "riskScore": number between 0 and 100,
  "warnings": ["Specific warning 1", "Specific warning 2"]
}`;

    const res = await generateWithFallback(prompt, { responseMimeType: 'application/json' });
    const cleanText = res.text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return {
      isSuspicious: Boolean(parsed.isSuspicious),
      riskScore: Math.min(100, Math.max(0, Number(parsed.riskScore) || 0)),
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    };
  } catch (err) {
    console.error('[Gemini Phishing Error]:', err.message);
    return getFallbackPhishingScan(subject, sender, bodyText);
  }
}

function getFallbackPhishingScan(subject, sender, bodyText) {
  const warnings = [];
  let riskScore = 5;
  const lowerBody = (bodyText || '').toLowerCase();
  const lowerSubject = (subject || '').toLowerCase();

  if (/verify your account|password expired|login immediately|suspended account|update your payment method/i.test(lowerBody + lowerSubject)) {
    warnings.push('Urgent language demanding account verification or password renewal detected.');
    riskScore += 45;
  }

  if (/wire transfer|gift card|crypto|bitcoin|western union/i.test(lowerBody)) {
    warnings.push('Requests payment via untraceable methods or wire transfer.');
    riskScore += 35;
  }

  if (/click here to login|download the attachment to view your invoice/i.test(lowerBody)) {
    warnings.push('Suspicious call-to-action urging quick unverified link clicks.');
    riskScore += 20;
  }

  const isSuspicious = riskScore >= 40 || warnings.length > 0;
  return {
    isSuspicious,
    riskScore: Math.min(100, riskScore),
    warnings,
  };
}

module.exports = {
  detectPhishing,
};
