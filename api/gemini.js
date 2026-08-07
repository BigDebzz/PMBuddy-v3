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

async function callModel(model, prompt, mode) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const maxTokens = mode === 'document' ? 8000 : 2000;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
      }
    );

    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) return { text, error: null };
      return { text: null, error: 'Empty response', status: 0 };
    }

    const body = await geminiResponse.text();
    console.error(`Model ${model} error ${geminiResponse.status}:`, body.substring(0, 200));
    return { text: null, error: geminiResponse.status, status: geminiResponse.status };
  } catch (err) {
    console.error(`Model ${model} fetch error:`, err.message);
    return { text: null, error: err.message, status: 0 };
  }
}

async function callModelWithFile(model, prompt, fileUri, mimeType) {
  const API_KEY = process.env.GEMINI_API_KEY;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { file_data: { mime_type: mimeType, file_uri: fileUri } },
              { text: prompt },
            ],
          }],
          generationConfig: { maxOutputTokens: 8000 },
        }),
      }
    );

    if (geminiResponse.ok) {
      const data = await geminiResponse.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) return { text, error: null };
      return { text: null, error: 'Empty response', status: 0 };
    }

    const body = await geminiResponse.text();
    console.error(`Model ${model} file error ${geminiResponse.status}:`, body.substring(0, 200));
    return { text: null, error: geminiResponse.status, status: geminiResponse.status };
  } catch (err) {
    console.error(`Model ${model} file fetch error:`, err.message);
    return { text: null, error: err.message, status: 0 };
  }
}

// Try all models — don't break early on non-rate-limit errors
async function callGemini(prompt, mode) {
  const MODELS = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
  ];

  let lastError = 'AI is currently unavailable. Please try again in a moment.';

  for (const model of MODELS) {
    console.log(`Trying model: ${model}`);
    const result = await callModel(model, prompt, mode);
    if (result.text) {
      console.log(`Success with model: ${model}`);
      return result;
    }
    lastError = result.error;
    console.log(`Model ${model} failed:`, result.error);
    // Small delay between attempts
    await new Promise(r => setTimeout(r, 500));
  }

  return { text: null, error: lastError };
}

async function callGeminiWithFile(prompt, fileUri, mimeType) {
  const MODELS = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
  ];

  let lastError = 'AI is currently unavailable. Please try again in a moment.';

  for (const model of MODELS) {
    console.log(`Trying model with file: ${model}`);
    const result = await callModelWithFile(model, prompt, fileUri, mimeType);
    if (result.text) {
      console.log(`File success with model: ${model}`);
      return result;
    }
    lastError = result.error;
    console.log(`Model ${model} file failed:`, result.error);
    await new Promise(r => setTimeout(r, 500));
  }

  return { text: null, error: lastError };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
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

    const { prompt, mode, fileUri, mimeType } = body || {};

    if (!prompt) {
      return response.status(400).json({ error: 'No prompt provided' });
    }

    let result;

    if (fileUri && mimeType) {
      result = await callGeminiWithFile(prompt, fileUri, mimeType);
    } else {
      result = await callGemini(prompt, mode);
    }

    if (!result.text) {
      console.error('All models failed. Last error:', result.error);
      return response.status(503).json({ error: 'AI is currently unavailable. Please try again in a moment.' });
    }

    return response.status(200).json({ result: result.text });

  } catch (err) {
    console.error('Gemini handler error:', err);
    return response.status(500).json({ error: err.message });
  }
}
