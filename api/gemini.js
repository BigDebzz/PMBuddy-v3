export const config = {
  api: { bodyParser: true },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verify the request has a valid Supabase session token
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
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens }
      })
    }
  );
  if (geminiResponse.ok) {
    const data = await geminiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) return { text, error: null };
    return { text: null, error: 'Empty response' };
  }
  const body = await geminiResponse.text();
  console.error(`Model ${model} error ${geminiResponse.status}:`, body);
  return { text: null, error: geminiResponse.status, status: geminiResponse.status };
}

async function callModelWithFile(model, prompt, fileUri, mimeType) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const maxTokens = 8000;
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
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens }
      })
    }
  );
  if (geminiResponse.ok) {
    const data = await geminiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text) return { text, error: null };
    return { text: null, error: 'Empty response' };
  }
  const body = await geminiResponse.text();
  console.error(`Model ${model} file error ${geminiResponse.status}:`, body);
  return { text: null, error: geminiResponse.status, status: geminiResponse.status };
}

async function callGemini(prompt, mode) {
  const MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];
  for (const model of MODELS) {
    console.log(`Trying model: ${model}`);
    const result = await callModel(model, prompt, mode);
    if (result.text) return result;
    console.log(`Model ${model} failed with status ${result.status}`);
    if (result.status !== 503 && result.status !== 429) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  return { text: null, error: 'AI is currently busy. Please try again in a moment.' };
}

async function callGeminiWithFile(prompt, fileUri, mimeType) {
  const MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
  ];
  for (const model of MODELS) {
    console.log(`Trying model with file: ${model}`);
    const result = await callModelWithFile(model, prompt, fileUri, mimeType);
    if (result.text) return result;
    console.log(`Model ${model} failed with status ${result.status}`);
    if (result.status !== 503 && result.status !== 429) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  return { text: null, error: 'AI is currently busy. Please try again in a moment.' };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return response.status(500).json({ error: 'API key not configured' });
  }

  // Auth check — only logged in users can call this
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
      // File-based generation (Document Import uploads)
      result = await callGeminiWithFile(prompt, fileUri, mimeType);
    } else {
      // Plain text generation (everything else)
      result = await callGemini(prompt, mode);
    }

    if (result.error) {
      return response.status(503).json({ error: result.error });
    }

    if (mode === 'document' || (fileUri && mimeType)) {
      return response.status(200).json({ result: result.text });
    }

    const clean = result.text.replace(/```json|```/g, '').trim();
    const lastBrace = clean.lastIndexOf('}');
    const fixed = lastBrace !== -1 ? clean.substring(0, lastBrace + 1) : clean;
    return response.status(200).json({ result: fixed });
  } catch (err) {
    console.error('Gemini handler error:', err);
    return response.status(500).json({ error: err.message });
  }
}
