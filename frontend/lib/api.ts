const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

interface RequestOptions extends RequestInit {
  data?: any;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers = {}, ...customConfig } = options;

  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Sends httpOnly auth cookie automatically
    ...customConfig,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMessage = 'An error occurred during the request.';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    const err = new Error(errorMessage) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// Authentication API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    request<{ success: boolean; user: any; token?: string }>('/auth/register', { data }),

  login: (data: { email: string; password: string }) =>
    request<{ success: boolean; user: any; token?: string }>('/auth/login', { data }),

  logout: () =>
    request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' }),

  getMe: () =>
    request<{ success: boolean; user: any }>('/auth/me'),

  updatePreferences: (preferences: any) =>
    request<{ success: boolean; preferences: any }>('/auth/preferences', {
      method: 'PUT',
      data: preferences,
    }),
};

// Gmail OAuth & Integration API
export const gmailAPI = {
  getOAuthUrl: () =>
    request<{ success: boolean; url: string }>('/gmail/oauth/url'),

  getStatus: () =>
    request<{ success: boolean; connected: boolean; emailAddress: string | null; connectedAt?: string }>(
      '/gmail/status'
    ),

  disconnect: () =>
    request<{ success: boolean; message: string }>('/gmail/disconnect', { method: 'POST' }),
};

// Emails Management API
export const emailAPI = {
  getEmails: (params: { q?: string; label?: string; maxResults?: number; pageToken?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.label) query.set('label', params.label);
    if (params.maxResults) query.set('maxResults', String(params.maxResults));
    if (params.pageToken) query.set('pageToken', params.pageToken);

    return request<{
      success: boolean;
      isDemo: boolean;
      messages: any[];
      nextPageToken: string | null;
      resultSizeEstimate: number;
    }>(`/emails?${query.toString()}`);
  },

  getEmail: (id: string) =>
    request<{ success: boolean; email: any; isDemo: boolean }>(`/emails/${id}`),

  modifyEmail: (id: string, action: { addLabels?: string[]; removeLabels?: string[] }) =>
    request<{ success: boolean; message?: string }>(`/emails/${id}/modify`, {
      method: 'PATCH',
      data: action,
    }),

  deleteEmail: (id: string) =>
    request<{ success: boolean; message?: string }>(`/emails/${id}`, {
      method: 'DELETE',
    }),

  sendEmail: (data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    threadId?: string;
  }) =>
    request<{ success: boolean; message: string; id?: string }>('/emails/send', {
      data,
    }),

  getAnalytics: () =>
    request<{
      success: boolean;
      isGmailConnected: boolean;
      connectedEmail: string | null;
      stats: {
        totalEmails: number;
        unreadCount: number;
        highPriorityCount: number;
        phishingAlerts: number;
        categories: Record<string, number>;
      };
    }>('/emails/analytics'),
};

// Gemini AI API
export const aiAPI = {
  summarize: (data: { emailId: string; subject?: string; sender?: string; bodyText: string }) =>
    request<{ success: boolean; summary: string; cached: boolean }>('/ai/summarize', { data }),

  generateReply: (data: {
    emailId?: string;
    subject?: string;
    sender?: string;
    bodyText?: string;
    tone?: string;
    language?: string;
    instructions?: string;
  }) =>
    request<{ success: boolean; reply: string; tone: string; language: string }>('/ai/reply', { data }),

  analyzeEmail: (id: string, data: { subject?: string; sender?: string; bodyText?: string }) =>
    request<{
      success: boolean;
      emailId: string;
      summary: string;
      priority: { score: number; reason: string };
      category: string;
      phishingAnalysis: { isSuspicious: boolean; riskScore: number; warnings: string[] };
      actionItems: { task: string; assignee: string; deadline: string; completed: boolean }[];
      deadlines: { date: string; description: string; context: string }[];
    }>(`/ai/analyze/${id}`, { data }),

  smartSearch: (query: string) =>
    request<{ success: boolean; originalQuery: string; gmailQuery: string }>('/ai/smart-search', {
      data: { query },
    }),

  getHistory: (limit = 30) =>
    request<{ success: boolean; count: number; history: any[] }>(`/ai/history?limit=${limit}`),

  // Streaming reply using fetch and ReadableStream
  streamReply: async (
    data: {
      emailId?: string;
      subject?: string;
      sender?: string;
      bodyText?: string;
      tone?: string;
      language?: string;
      instructions?: string;
    },
    onChunk: (text: string) => void,
    onDone: (fullText: string) => void,
    onError: (err: any) => void
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/ai/reply/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start streaming reply.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.chunk) {
                fullText += parsed.chunk;
                onChunk(parsed.chunk);
              }
              if (parsed.done) {
                onDone(parsed.fullText || fullText);
              }
              if (parsed.error) {
                onError(new Error(parsed.error));
              }
            } catch {
              // Ignore partial JSON parse errors
            }
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  },
};
