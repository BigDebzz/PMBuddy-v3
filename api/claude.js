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

// Heavy jobs (documents, reports, file import) use the stronger model.
// Small jobs (chat, goal rewrites, health checks) use the cheaper one.
const HEAVY_MODEL = 'claude-sonnet-5-5';
const LIGHT_MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = 'You write for PM Buddy, a project management tool for people who are not project managers. Use plain English. Never use emoji, emoticons or decorative symbols. Do not start lines with check marks, arrows or other symbol characters.';

const DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || '20', 10);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function supabaseHeaders() {
  return {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

// Returns how many AI requests this user has made today, or null if the
// usage table is unavailable (limits then fail open so the app keeps working).
async function getUsageToday(userId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${userId}&day=eq.${today()}&select=count`,
      { headers: supabaseHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0]?.count || 0;
  } catch { return null; }
}

async function recordUsage(userId, previousCount) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_usage`, {
      method: 'POST',
      headers: { ...supabaseHeaders(), 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id: userId, day: today(), count: previousCount + 1 }),
    });
  } catch (err) {
    console.error('Usage record error:', err.message);
  }
}

async function callClaude({ prompt, mode, documentBase64, documentMediaType }) {
  const API_KEY = process.env.ANTHROPIC_API_KEY;
  const isHeavy = mode === 'document' || !!documentBase64;
  const maxTokens = isHeavy ? 8000 : 2000;
  const model = isHeavy ? HEAVY_MODEL : LIGHT_MODEL;

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
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = (data.content || [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
      if (text) return { text, error: null };
      console.error('Empty Claude response. stop_reason:', data.stop_reason, 'blocks:', (data.content || []).map((b) => b.type).join(','));
      return { text: null, error: 'Empty response', status: 0, detail: `stop_reason ${data.stop_reason}` };
    }

    const body = await res.text();
    console.error(`Claude API error ${res.status}:`, body.substring(0, 200));
    let detail = body.substring(0, 300);
    try { detail = JSON.parse(body).error?.message || detail; } catch (e) {}
    return { text: null, error: res.status, status: res.status, detail };
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

    const usedToday = await getUsageToday(user.id);
    if (usedToday !== null && usedToday >= DAILY_LIMIT) {
      return response.status(429).json({ error: `You have reached today's AI limit (${DAILY_LIMIT} requests). It resets at midnight UTC.` });
    }

    const result = await callClaude({ prompt, mode, documentBase64, documentMediaType });
    if (result.text && usedToday !== null) {
      await recordUsage(user.id, usedToday);
    }
    if (!result.text) {
      console.error('Claude failed. Error:', result.error);
      return response.status(503).json({ error: 'AI is currently unavailable. Please try again in a moment.', debug: `Claude returned ${result.status || ''} ${result.detail || result.error}`.trim() });
    }

    return response.status(200).json({ result: result.text });
  } catch (err) {
    console.error('Handler error:', err);
    return response.status(500).json({ error: err.message });
  }
}
