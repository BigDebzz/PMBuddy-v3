export const config = {
  api: { bodyParser: true },
};

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

async function callGemini(prompt, mode) {
  const MODELS = [
    'gemini-3-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
  ];

  for (const model of MODELS) {
    console.log(`Trying model: ${model}`);
    const result = await callModel(model, prompt, mode);
    if (result.text) return result;
    console.log(`Model ${model} failed with status ${result.status}`);
    if (result.status !== 503 && result.status !== 429) break; // Don't try others for non-overload errors
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

  try {
    let body = request.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { prompt, mode } = body || {};
    if (!prompt) {
      return response.status(400).json({ error: 'No prompt provided' });
    }

    const { text, error } = await callGemini(prompt, mode);

    if (error) {
      return response.status(503).json({ error });
    }

    if (mode === 'document') {
      return response.status(200).json({ result: text });
    }

    const clean = text.replace(/```json|```/g, '').trim();
    const lastBrace = clean.lastIndexOf('}');
    const fixed = lastBrace !== -1 ? clean.substring(0, lastBrace + 1) : clean;
    return response.status(200).json({ result: fixed });

  } catch (err) {
    console.error('Gemini handler error:', err);
    return response.status(500).json({ error: err.message });
  }
}
