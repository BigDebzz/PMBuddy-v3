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

Provide a deep personalised analysis. Read every answer carefully and respond directly to what this specific founder said. Do not give generic advice.

Respond in this exact JSON format with no markdown no code blocks just raw JSON:

{
  "deepInsights": [
    {
      "type": "strength",
      "text": "specific insight referencing their exact answer in 1 sentence"
    }
  ],
  "deepChallenges": [
    {
      "level": "high",
      "text": "specific challenge title in 5 words or less",
      "response": "specific actionable advice in 1 to 2 sentences"
    }
  ],
  "topPriority": "The single most important thing this founder needs to do right now in 1 sentence",
  "founderMessage": "A 2 sentence honest message to this founder referencing what they actually said"
}

Rules:
- Maximum 3 insights and 3 challenges
- Each insight and challenge must be 1 to 2 sentences maximum
- Reference their actual answers directly
- Do not use dashes anywhere. Use full sentences only
- Keep the entire response under 800 tokens`;

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Gemini API error:', err);
      return null;
    }

    const data = await response.json();
    if (!data.result) return null;

    return JSON.parse(data.result);
  } catch (err) {
    console.error('Gemini fetch error:', err);
    return null;
  }
}
