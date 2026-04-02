import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_KEY);

export async function deepAnalyze(mode, answers) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const questionLabels = mode === 'hackathon' ? {
    hack_theme: 'Thematic area',
    hack_team: 'Team composition',
    hack_timeline: 'Timeline',
    hack_q1: 'Problem statement',
    hack_q2: 'Real person experiencing this problem',
    hack_q3: 'Why this matters now',
    hack_q4: 'How people currently deal with this',
    hack_q5: 'What makes their approach different',
    hack_q6: 'Real world viability beyond the hackathon',
    hack_q7: 'User flow description',
    hack_q8: 'How they will know it is working in 90 days',
  } : {
    startup_q1: 'Problem and current solutions',
    startup_q2: 'Target customer',
    startup_q3: 'Customer conversations',
    startup_q4: 'Why someone would switch',
    startup_q5: 'How first 10 users will find them',
    startup_q6: 'Real competitive advantage',
    startup_q7: 'Revenue model',
    startup_team: 'Team composition',
    startup_timeline: 'Timeline to first user',
    startup_q8: 'Biggest assumption that could make this fail',
    startup_q9: 'Will people still need this in 6 months',
    startup_q10: 'Most likely reason this startup will fail',
  };

  const formattedAnswers = Object.entries(answers)
    .filter(([key, val]) => val && val.toString().trim().length > 0)
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
- No generic advice like talk to customers unless their answers show they have not done this.
- Be direct and honest. Do not sugarcoat real problems.
- Keep each insight and challenge to 2 sentences maximum.
- The founderMessage should feel personal, not like a template.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Gemini error:', err);
    return null;
  }
}
