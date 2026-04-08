export const config = {
  api: {
    bodyParser: true,
  },
};

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
      body = JSON.parse(body);
    }

    const { prompt } = body || {};
    if (!prompt) {
      return response.status(400).json({ error: 'No prompt provided' });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 3000 }
        })
      }
    );

    if (!geminiResponse.ok) {
      const err = await geminiResponse.json();
      return response.status(geminiResponse.status).json({ error: err });
    }

    const data = await geminiResponse.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return response.status(200).json({ result: text });

  } catch (err) {
    console.error('Gemini handler error:', err);
    return response.status(500).json({ error: err.message });
  }
}
