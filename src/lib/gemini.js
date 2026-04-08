const API_KEY = process.env.REACT_APP_GEMINI_KEY;

export async function deepAnalyze(mode, answers) {
  const questionLabels = mode === 'hackathon' ? {
    hack_theme: 'Area of focus',
    hack_q1: 'Problem and who has it',
    hack_q2: 'What they are building and how it solves the problem',
    hack_q3: 'How much time they have',
    hack_q4: 'Team composition',
    hack_q5: 'Real world viability beyond the hackathon',
  } : {
    startup_q1: 'Problem and who has it',
    startup_q2: 'Customer conversations and what they learned',
    startup_q3: 'What they are building and how they will make money',
    startup_team: 'Team composition',
    startup_q4: 'Biggest risk or assumption that could make this fail',
  };

  const formattedAnswers = Object.entries(answers)
    .filter(([, val]) => val && val.toString().trim().length > 0)
    .map(([key, val]) => `${questionLabels[key] || key}: ${val}`)
    .join('\n\n');

  const prompt = `You are a senior product manager and startup advisor with deep experience in African markets, specifically Nigeria. You are reviewing a ${mode === 'hackathon' ? 'hackathon project' : 'startup idea'} validation submission.

Here are the founder's answers:

${formattedAnswers}

Provide a deep, personalised analysis. Read every answer carefully and respond directly to what this specific founder said. Do not give generic startup advice.

Respond in this exact JSON format with no markdown, no code blocks, just raw JSON:

{
  "deepInsights": [
    {
      "type": "strength",
      "text": "specific insight referencing their exact answer"
    }
  ],
  "deepChallenges": [
    {
      "level": "high",
      "text": "specific challenge title",
      "response": "specific actionable advice referencing their exact situation"
    }
  ],
  "topPriority": "The single most important thing this founder needs to do right now, written directly to them",
  "founderMessage": "A 2 to 3 sentence honest message to this specific founder about their idea. Reference what they actually said. Be encouraging but honest."
}

Rules:
- Reference their actual answers directly. Use their words back to them.
- If they mentioned a specific market, person, or problem, address it specifically.
- Do not use dashes anywhere in your response. Use full sentences.
- No generic advice unless their answers show they have not done this.
- Be direct and honest. Do not sugarcoat real problems.
- Keep each insight and challenge to 2 sentences maximum.
- The founderMessage should feel personal, not like a template.`;

  try {
    const response = await fetch(
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error('Gemini API error:', err);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return null;
  }
}
