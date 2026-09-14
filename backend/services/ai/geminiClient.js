const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (apiKey && apiKey !== 'your_gemini_api_key_here') {
      genAI = new GoogleGenerativeAI(apiKey);
    }
  }
  return genAI;
}

const PREFERRED_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash',
];

function getGeminiModel(modelName = 'gemini-3.6-flash', generationConfig = {}) {
  const client = getGenAI();
  if (!client) {
    return null;
  }
  return client.getGenerativeModel({
    model: modelName,
    generationConfig,
  });
}

/**
 * Robust text generation with automatic model fallback
 */
async function generateWithFallback(prompt, generationConfig = {}) {
  const client = getGenAI();
  if (!client) {
    throw new Error('Gemini API key not configured.');
  }

  let lastError = null;
  for (const modelName of PREFERRED_MODELS) {
    try {
      const model = client.getGenerativeModel({ model: modelName, generationConfig });
      const result = await model.generateContent(prompt);
      return {
        text: result.response.text(),
        modelUsed: modelName,
      };
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini Fallback] Model ${modelName} failed: ${err.message}. Trying next candidate...`);
    }
  }

  throw lastError || new Error('All Gemini model candidates failed.');
}

function isGeminiConfigured() {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  return Boolean(apiKey && apiKey !== 'your_gemini_api_key_here' && apiKey.length > 10);
}

module.exports = {
  getGenAI,
  getGeminiModel,
  generateWithFallback,
  isGeminiConfigured,
  PREFERRED_MODELS,
};
