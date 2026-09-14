const { generateWithFallback, isGeminiConfigured } = require('./geminiClient');

async function translateNaturalLanguageToGmailQuery(naturalQuery) {
  if (!naturalQuery || !naturalQuery.trim()) {
    return '';
  }

  if (!isGeminiConfigured()) {
    return naturalQuery.trim();
  }

  try {
    const prompt = `Convert the following natural language email search request into a precise Gmail search query syntax.
Use standard Gmail operators where appropriate:
- from:user@example.com
- to:user@example.com
- subject:"keywords"
- label:unread, is:unread, is:starred, is:important
- has:attachment
- after:YYYY/MM/DD, before:YYYY/MM/DD, newer_than:7d

Current Date context: ${new Date().toISOString().split('T')[0]}

User Natural Search: "${naturalQuery}"

Return ONLY the converted Gmail search string on a single line with no markdown or quotes.`;

    const res = await generateWithFallback(prompt);
    const converted = res.text.trim().replace(/^["']|["']$/g, '');
    return converted || naturalQuery;
  } catch (err) {
    console.error('[Gemini Smart Search Error]:', err.message);
    return naturalQuery;
  }
}

module.exports = {
  translateNaturalLanguageToGmailQuery,
};
