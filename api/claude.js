export const config = {
  api: { bodyParser: true },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyAuth(request) {
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch { return null; }
}

async function callClaude({ prompt, mode, documentBase64, documentMediaType }) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  const maxTokens = mode === 'document' ? 8000 : 2000;

  // Build message content. If a PDF was attached, send it as a document
  // block alongside the text prompt so Claude reads it directly.
  let content;
  if (documentBase64 && documentMediaType) {
    content = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: documentMediaType,
          data: documentBase64,
        },
      },
      { type: 'text', text: prompt },
    ];
  } else {
    content = prompt;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      if (text) return { text, error: null };
      return { text: null, error: 'Empty response', status: 0 };
    }

    const body = await res.text();
    console.error(`Claude API error ${res.status}:`, body.substring(0, 200));
    return { text: null, error: res.status, status: res.status };
  } catch (err) {
    console.error('Claude fetch error:', err.message);
    return { text: null, error: err.message, status: 0 };
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return response.status(500).json({ error: 'API key not configured' });
  }

  const user = await verifyAuth(request);
  if (!user) {
    return response.status(401).json({ error: 'Unauthorised. Please log in.' });
  }

  try {
    let body = request.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { prompt, mode, documentBase64, documentMediaType } = body || {};
    if (!prompt) {
      return response.status(400).json({ error: 'No prompt provided' });
    }

    const result = await callClaude({ prompt, mode, documentBase64, documentMediaType });
    if (!result.text) {
      console.error('Claude failed. Error:', result.error);
      return response.status(503).json({ error: 'AI is currently unavailable. Please try again in a moment.' });
    }

    return response.status(200).json({ result: result.text });
  } catch (err) {
    console.error('Handler error:', err);
    return response.status(500).json({ error: err.message });
  }
}
