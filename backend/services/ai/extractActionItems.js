const { generateWithFallback, isGeminiConfigured } = require('./geminiClient');

async function extractActionItems({ subject, sender, bodyText }) {
  if (!isGeminiConfigured()) {
    return getFallbackActionItems(subject, bodyText);
  }

  try {
    const prompt = `Extract actionable tasks/to-dos and any specific deadlines/dates mentioned in this email.

Subject: ${subject || '(No Subject)'}
From: ${sender || 'Unknown'}
Content:
${(bodyText || '').substring(0, 3000)}

Return ONLY valid JSON matching this schema:
{
  "actionItems": [
    {
      "task": "Specific actionable task",
      "assignee": "Name or role responsible (or 'Recipient'/'Sender')",
      "deadline": "Deadline if specified, or 'None'"
    }
  ],
  "deadlines": [
    {
      "date": "Date or time expression (e.g. Friday 5 PM, Oct 15)",
      "description": "What is due or happening",
      "context": "Short sentence context"
    }
  ]
}`;

    const res = await generateWithFallback(prompt, { responseMimeType: 'application/json' });
    const cleanText = res.text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return {
      actionItems: Array.isArray(parsed.actionItems)
        ? parsed.actionItems.map((item) => ({
            task: item.task || 'Unspecified task',
            assignee: item.assignee || 'Recipient',
            deadline: item.deadline || 'None',
            completed: false,
          }))
        : [],
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
    };
  } catch (err) {
    console.error('[Gemini Action Items Error]:', err.message);
    return getFallbackActionItems(subject, bodyText);
  }
}

function getFallbackActionItems(subject, bodyText) {
  const actionItems = [];
  const deadlines = [];
  const lines = (bodyText || '').split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (/please|could you|kindly|need you to|action required|to-do|reminder:/i.test(line) && line.length < 160) {
      actionItems.push({
        task: line.replace(/^(please|kindly|could you)\s*/i, '').trim(),
        assignee: 'Recipient',
        deadline: 'Pending confirmation',
        completed: false,
      });
    }

    const dateMatch = line.match(/\b(today|tomorrow|by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:th|st|nd|rd)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i);
    if (dateMatch && line.length < 180) {
      deadlines.push({
        date: dateMatch[0],
        description: line.substring(0, 80),
        context: line,
      });
    }
  }

  return {
    actionItems: actionItems.slice(0, 5),
    deadlines: deadlines.slice(0, 5),
  };
}

module.exports = {
  extractActionItems,
};
