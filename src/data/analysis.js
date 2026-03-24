// src/data/analysis.js

export function analyze(mode, answers) {
  return mode === 'hackathon' ? analyzeHackathon(answers) : analyzeStartup(answers);
}

const len = (val) => (val || '').trim().length;
const has = (val) => len(val) > 20;
const contains = (val, ...words) => words.some(w => (val || '').toLowerCase().includes(w.toLowerCase()));

function scoreColor(score) {
  if (score >= 75) return '#15803D';
  if (score >= 55) return '#2563EB';
  if (score >= 35) return '#D97706';
  return '#DC2626';
}

function verdict(score) {
  if (score >= 75) return 'Strong foundation';
  if (score >= 55) return 'Good with key gaps to address';
  if (score >= 35) return 'Needs work before proceeding';
  return 'Significant risks. Reconsider scope.';
}

function analyzeHackathon(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  if (a.hack_theme) score += 5;

  const teamScore = { solo_tech: 15, team_balanced: 20, team_all_tech: 12, solo_notech: 8, team_no_tech: 6 };
  score += (teamScore[a.hack_team] || 10);

  if (a.hack_team === 'solo_notech' || a.hack_team === 'team_no_tech') {
    challenges.push({ level: 'high', text: 'Limited or no technical skills on the team.', response: 'You need to use no-code tools to build your demo. Do not try to hire or learn to code during a hackathon. Use Bubble, Glide, or Tally to build something working today.' });
    nextSteps.push('Use Bubble, Glide, or Typeform to build your demo without writing code. These tools can produce a working demo in hours.');
  } else if (a.hack_team === 'team_all_tech') {
    challenges.push({ level: 'medium', text: 'All technical team. Who is handling the pitch and the story?', response: 'Assign one person to own the pitch and presentation now. Technical excellence wins builds but communication skills win competitions.' });
  } else if (a.hack_team === 'team_balanced') {
    insights.push({ type: 'strength', text: 'Balanced team with technical and business skills. This is the strongest setup for a hackathon. Use every skill deliberately.' });
  }

  if (a.hack_timeline === '24h') {
    challenges.push({ level: 'high', text: 'Under 24 hours is extremely tight.', response: 'You have time to build exactly one thing. Do not add features. Build the single interaction that proves your concept and build it well.' });
    nextSteps.push('Spend the first 2 hours agreeing on the ONE interaction your demo must show. Do not start building until everyone agrees.');
  } else if (a.hack_timeline === 'week') {
    insights.push({ type: 'strength', text: 'A full week gives you time to test with real users before submitting. Use that time. Get your product in front of 5 real people before the deadline.' });
    nextSteps.push('Test your product with 5 real people from your target audience before the final submission.');
  }

  if (has(a.hack_q1)) {
    score += 20;
    if (contains(a.hack_q1, 'app', 'platform', 'system', 'solution', 'tool', 'we will', 'we are building')) {
      challenges.push({ level: 'high', text: 'Your problem statement describes a solution, not a problem.', response: 'Rewrite it with no mention of what you are building. Describe only the pain. Who feels it, when do they feel it, and what does it cost them?' });
      score -= 10;
    } else if (len(a.hack_q1) > 150) {
      insights.push({ type: 'strength', text: 'Detailed and specific problem statement. You understand this problem. Use this exact language in your pitch opening.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have identified a problem. Push it further. Add the specific cost to the person experiencing it.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Problem statement is too vague or missing.', response: 'Name one specific person, their exact situation, and what it costs them in time or money. One clear paragraph.' });
  }

  if (has(a.hack_q2)) {
    score += 15;
    insights.push({ type: 'strength', text: 'You have a real example of the problem. Open your pitch with this story. Real examples are 10 times more convincing than statistics.' });
    nextSteps.push('Start your pitch with the real example you described. Name the person, the situation, the cost. Make judges feel the problem before you show the solution.');
  } else {
    challenges.push({ level: 'high', text: 'No real example of the problem.', response: 'Before your demo, find one real person who has this problem and ask them to describe it in their own words. Use their words in your pitch.' });
  }

  if (has(a.hack_q3)) {
    score += 10;
    if (contains(a.hack_q3, 'million', 'billion', 'everyone', 'all', 'global')) {
      challenges.push({ level: 'medium', text: 'Your impact claim may be too broad to be credible.', response: 'Scale back to a specific believable number. Judges trust a claim about 50,000 farmers in Kano State more than a claim about all farmers in Africa.' });
    } else {
      insights.push({ type: 'strength', text: 'You have articulated why this matters. Use this in your closing statement to land the emotional impact of your pitch.' });
    }
  }

  if (has(a.hack_q4)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You understand how people currently cope with this problem. This is your competitive context. Use it to show why your approach is better.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not described how people deal with this problem today.', response: 'Understanding the current workaround is critical. If people pay for a bad solution, you have a market. If they do nothing, you need to create the behaviour.' });
  }

  if (has(a.hack_q5)) {
    score += 10;
    if (contains(a.hack_q5, 'better', 'faster', 'cheaper', 'easier', 'simpler')) {
      challenges.push({ level: 'medium', text: 'Your differentiation is comparative but not structural.', response: 'Better, faster, and cheaper are not strong differentiators. What does your approach do that the current workaround fundamentally cannot do? That is the answer judges want.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural difference. Make sure this is the centre of your pitch.' });
    }
  }

  if (has(a.hack_q6)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have thought about whether this idea can grow beyond the hackathon. Mention this briefly in your pitch to show you are thinking long term.' });
  } else {
    challenges.push({ level: 'low', text: 'You have not addressed whether this idea can grow over time.', response: 'Spend 5 minutes thinking about this before your pitch. Can this work for more people over time or is it a one-time solution? Judges will ask.' });
  }

  if (has(a.hack_q7)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have mapped the user journey. Use this as your demo script. Walk judges through exactly these steps during your live demonstration.' });
    nextSteps.push('Practice your demo using the exact user flow you described. Time it. Make sure you reach the value moment in under 60 seconds.');
  } else {
    challenges.push({ level: 'high', text: 'You have not defined how a user actually experiences your product.', response: 'Map the complete journey right now. From how they discover it to the moment they get value. This becomes your demo script.' });
    nextSteps.push('Write down every step a user takes from discovering your product to getting value. This is your demo script.');
  }

  if (has(a.hack_q8)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have defined a success metric. Share this in your pitch closing. It shows judges you are thinking beyond the hackathon demo.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not defined how you will know if this works after the hackathon.', response: 'Pick one number that, if it is growing, means your solution is creating real value. Not downloads. Something that shows people are actually benefiting.' });
  }

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : defaultHackNextSteps(),
    pitchFramework: buildPitchFramework(a),
    toolRecommendations: hackathonTools(a),
    sprintPlan: buildSprintPlan(a.hack_timeline),
    proofPoints: hackathonProofs(a.hack_theme),
  };
}

function defaultHackNextSteps() {
  return [
    'Write your one-sentence problem statement with no mention of your solution.',
    'Find one real person with this problem and use their exact words in your pitch.',
    'Map the complete user journey from discovery to value. This is your demo script.',
    'Practice your demo until you reach the value moment in under 60 seconds.',
    'Prepare a backup Loom video recording of your demo in case the live demo fails.',
  ];
}

function buildPitchFramework(a) {
  const problem = has(a.hack_q1) ? a.hack_q1.slice(0, 120) + (a.hack_q1.length > 120 ? '...' : '') : 'Describe the exact problem and who experiences it.';
  const example = has(a.hack_q2) ? a.hack_q2.slice(0, 120) + (a.hack_q2.length > 120 ? '...' : '') : 'Give one real life example of this problem happening.';
  const diff = has(a.hack_q5) ? a.hack_q5.slice(0, 120) + (a.hack_q5.length > 120 ? '...' : '') : 'Explain what makes your approach structurally different.';
  const metric = has(a.hack_q8) ? a.hack_q8.slice(0, 100) + (a.hack_q8.length > 100 ? '...' : '') : 'Name the one metric that proves this is working.';

  return [
    { step: '1. Open with the problem', duration: '30 seconds', content: problem, tip: 'Do not open with your solution. Open with the pain. Make judges feel it before you show the fix.' },
    { step: '2. Make it real with one story', duration: '20 seconds', content: example, tip: 'One specific story is worth more than ten statistics. Use the real example you described.' },
    { step: '3. Show your solution live', duration: '60 seconds', content: 'Demonstrate the core interaction working in real time. Do not explain. Show.', tip: 'Design your demo to reach the value moment in under 60 seconds. Everything else is detail.' },
    { step: '4. Explain why yours wins', duration: '20 seconds', content: diff, tip: 'This is where you explain why existing workarounds fail and why yours succeeds.' },
    { step: '5. Close with impact and ask', duration: '20 seconds', content: metric, tip: 'End with what success looks like and what you need to get there. Be specific not vague.' },
  ];
}

function hackathonTools(a) {
  const tools = [];

  if (a.hack_team === 'solo_notech' || a.hack_team === 'team_no_tech') {
    tools.push({
      category: 'Build without code',
      items: [
        { name: 'Bubble', use: 'Full web applications with logic and database', link: 'bubble.io', free: true },
        { name: 'Glide', use: 'Mobile apps built from a spreadsheet in hours', link: 'glideapps.com', free: true },
        { name: 'Tally', use: 'Beautiful forms and data collection without code', link: 'tally.so', free: true },
        { name: 'Carrd', use: 'Simple one-page website or landing page in minutes', link: 'carrd.co', free: true },
      ],
    });
  }

  if (a.hack_theme === 'fintech') {
    tools.push({
      category: 'Payments and financial tools',
      items: [
        { name: 'Paystack', use: 'Accept payments in Nigeria without complex setup', link: 'paystack.com', free: true },
        { name: 'Flutterwave', use: 'Multi-currency payments across Africa', link: 'flutterwave.com', free: true },
        { name: 'Mono', use: 'Connect to Nigerian bank accounts for data', link: 'mono.co', free: true },
      ],
    });
  }

  if (a.hack_theme === 'health') {
    tools.push({
      category: 'Health tech tools',
      items: [
        { name: 'Typeform', use: 'Patient intake forms and health surveys', link: 'typeform.com', free: true },
        { name: 'Airtable', use: 'Track patient data and appointments', link: 'airtable.com', free: true },
        { name: 'Twilio', use: 'SMS and WhatsApp messaging for patients', link: 'twilio.com', free: false },
      ],
    });
  }

  if (a.hack_theme === 'agriculture') {
    tools.push({
      category: 'Agriculture and data tools',
      items: [
        { name: 'Twilio', use: 'WhatsApp and SMS for farmers without smartphones', link: 'twilio.com', free: false },
        { name: 'Google Sheets', use: 'Simple database for market prices and farm data', link: 'sheets.google.com', free: true },
        { name: 'Glide', use: 'Turn your spreadsheet into a mobile app for farmers', link: 'glideapps.com', free: true },
      ],
    });
  }

  if (a.hack_theme === 'education') {
    tools.push({
      category: 'Education and learning tools',
      items: [
        { name: 'Teachable', use: 'Create and sell online courses without building a platform', link: 'teachable.com', free: true },
        { name: 'Notion', use: 'Build a structured knowledge base or curriculum', link: 'notion.so', free: true },
        { name: 'Loom', use: 'Record video lessons quickly without editing', link: 'loom.com', free: true },
      ],
    });
  }

  tools.push({
    category: 'Demo and presentation',
    items: [
      { name: 'Canva', use: 'Build your pitch deck quickly with professional templates', link: 'canva.com', free: true },
      { name: 'Loom', use: 'Record a demo video backup in case live demo fails', link: 'loom.com', free: true },
      { name: 'Figma', use: 'Create a clickable prototype if your build is not ready', link: 'figma.com', free: true },
    ],
  });

  tools.push({
    category: 'Team collaboration',
    items: [
      { name: 'Notion', use: 'Shared notes, task list, and pitch outline for the team', link: 'notion.so', free: true },
      { name: 'Slack', use: 'Keep your team aligned and moving during the hackathon', link: 'slack.com', free: true },
      { name: 'GitHub', use: 'Version control if your team is writing code', link: 'github.com', free: true },
    ],
  });

  return tools;
}

function buildSprintPlan(timeline) {
  const plans = {
    '24h': [
      { phase: 'Hours 1 to 2', title: 'Align and decide', tasks: ['Write your problem statement in one sentence', 'Agree on the single core interaction your demo must show', 'Assign roles clearly: who builds, who designs, who pitches'] },
      { phase: 'Hours 3 to 16', title: 'Build the core only', tasks: ['Build only the one essential interaction. Nothing else.', 'Use no-code tools if you have limited technical skills', 'No design polish until the core works reliably'] },
      { phase: 'Hours 17 to 21', title: 'Test and fix', tasks: ['Show it to one person outside your team and watch them use it', 'Fix the top 2 issues only. Do not add features.', 'Record a Loom video of it working as your backup'] },
      { phase: 'Hours 22 to 24', title: 'Pitch ready', tasks: ['Write your 3 minute pitch using the framework in this report', 'Practice the demo twice out loud with someone watching', 'Prepare 3 answers to questions judges are most likely to ask'] },
    ],
    '48h': [
      { phase: 'Hours 1 to 4', title: 'Foundation', tasks: ['Agree on problem, solution, and the one demo moment', 'Set up your tools and development environment', 'Assign clear roles with no overlap between team members'] },
      { phase: 'Hours 5 to 28', title: 'Core build', tasks: ['Build the single most important feature first', 'Use existing APIs and services wherever possible', 'Brief team check-in every 6 hours: 10 minutes maximum'] },
      { phase: 'Hours 29 to 40', title: 'Test and polish', tasks: ['Test with 3 real people from your target audience', 'Fix the top 3 issues before adding anything new', 'Basic visual polish that looks intentional and clean'] },
      { phase: 'Hours 41 to 48', title: 'Pitch and submit', tasks: ['Build your pitch deck using the 5 step framework in this report', 'Practice the demo 3 times with someone watching and timing you', 'Submit before the deadline with 30 minutes to spare'] },
    ],
    '72h': [
      { phase: 'Day 1', title: 'Validate and build core', tasks: ['Talk to 3 real potential users before building anything', 'Set up tools and build the core feature end to end', 'Test it yourself multiple times before going to sleep'] },
      { phase: 'Day 2', title: 'Iterate and expand', tasks: ['Test with 5 real people. Watch them use it without helping.', 'Fix top issues. Add one additional feature only if core works perfectly.', 'Record a demo video backup using Loom'] },
      { phase: 'Day 3', title: 'Polish and pitch', tasks: ['Final fixes and visual polish based on all feedback received', 'Build pitch deck and practice 3 times with a live audience', 'Submit on time with buffer. Late submissions lose credibility.'] },
    ],
    'week': [
      { phase: 'Days 1 to 2', title: 'Validate before building', tasks: ['Talk to 10 potential users. Listen only. Do not pitch.', 'Define your MVP scope based entirely on what you hear', 'Set up tools and assign responsibilities with clear ownership'] },
      { phase: 'Days 3 to 5', title: 'Build and test daily', tasks: ['Build the core feature and test with real users every day', 'Iterate based on feedback after each test session', 'Document what you learn. Patterns matter more than single opinions.'] },
      { phase: 'Days 6 to 7', title: 'Launch and pitch', tasks: ['Final testing and polish based on all feedback collected', 'Prepare pitch and demo. Practice 5 times minimum.', 'Submit and share with target users for early real world usage'] },
    ],
  };
  return plans[timeline] || plans['48h'];
}

function hackathonProofs(theme) {
  const proofs = {
    ai_ml: [{ name: 'Hugging Face', result: 'Now valued at 4.5 billion dollars', stage: 'success', lesson: 'Started as a simple AI chatbot demo built in a weekend. Did one thing well. Everything else came after that foundation.' }],
    fintech: [
      { name: 'Paystack', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Started with one problem: Nigerian developers could not accept online payments. Built only that. Expanded after dominating that niche.' },
      { name: 'Flutterwave', result: '3 billion dollar valuation', stage: 'success', lesson: 'Founded by people who worked inside the banks they were disrupting. Insider knowledge and relationships were the real unfair advantage.' },
    ],
    health: [{ name: 'Helium Health', result: 'Largest health tech company in Nigeria', stage: 'success', lesson: 'Started with hospital management only. Did not try to solve all of healthcare at once. Mastered one thing first then expanded.' }],
    agriculture: [
      { name: 'Twiga Foods', result: 'Series C funded operating across Kenya', stage: 'success', lesson: 'Started with one supply chain problem in Nairobi. Bananas only. Did not try to fix all of agriculture before proving the model.' },
      { name: 'Farmcrowdy', result: 'Raised over 1 million dollars in seed funding', stage: 'success', lesson: 'Connected farmers with investors. Simple concept. Real pain point. Started small and focused before expanding.' },
    ],
    education: [{ name: 'uLesson', result: 'Raised over 20 million dollars', stage: 'success', lesson: 'Started with secondary school students in Nigeria only. Focused on one audience before expanding to other markets and subjects.' }],
    default: [
      { name: 'GroupMe', result: 'Sold to Skype for 85 million dollars', stage: 'success', lesson: 'Built at TechCrunch Hackathon in 36 hours. Did one thing: group SMS. Nothing else. Won because the demo worked perfectly every time.' },
      { name: 'Carrd', result: 'Bootstrapped to over 1 million dollars in annual revenue', stage: 'success', lesson: 'Started as a weekend project. One simple thing done extremely well. Still does just that years later and people love it for exactly that reason.' },
    ],
  };
  return proofs[theme] || proofs.default;
}

function analyzeStartup(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  const teamScores = { solo_tech: 12, team_balanced: 20, team_all_tech: 14, solo_notech: 7, team_no_tech: 8 };
  score += (teamScores[a.startup_team] || 10);

  if (a.startup_team === 'solo_notech') {
    challenges.push({ level: 'high', text: 'No technical skills. This limits what you can build without external help.', response: 'Use no-code tools to build your first version. Bubble, Glide, and Webflow can take you further than you think. Validate your idea before investing in a developer.' });
  } else if (a.startup_team === 'team_balanced') {
    insights.push({ type: 'strength', text: 'Balanced team covering technical and business skills. This is the strongest early stage setup. Make sure roles are clearly defined and ownership is explicit from day one.' });
  } else if (a.startup_team === 'solo_tech') {
    challenges.push({ level: 'medium', text: 'Solo technical founder. Strong on building but who handles sales and customer conversations?', response: 'Spend 20 percent of your time talking to customers, not building. The biggest solo founder mistake is disappearing into the product and ignoring the market entirely.' });
  }

  if (a.startup_timeline === '2weeks') {
    insights.push({ type: 'neutral', text: 'Very aggressive 2 week timeline. Only achievable with a no-code approach and very narrow scope. Your only goal in 2 weeks is to prove one assumption true, not to build a product.' });
    nextSteps.push('With 2 weeks, your only goal is to prove one critical assumption. What is the cheapest way to test your most important assumption right now?');
  } else if (a.startup_timeline === '3months') {
    insights.push({ type: 'strength', text: '1 to 3 month timeline is realistic for a focused MVP. Use the first 2 weeks entirely for customer conversations before writing any code.' });
  } else if (a.startup_timeline === '6months' || a.startup_timeline === 'longer') {
    challenges.push({ level: 'medium', text: 'Timeline of 3 months or more before first user feedback is risky.', response: 'The longer you go without real user feedback, the more you invest in assumptions that might be wrong. Can you get something in front of a real user in the next 4 weeks, even manually?' });
  }

  if (has(a.startup_q1)) {
    score += 12;
    if (len(a.startup_q1) > 200) {
      insights.push({ type: 'strength', text: 'Detailed and specific problem statement. This depth will make your pitch, your product decisions, and your customer conversations all sharper.' });
    } else {
      insights.push({ type: 'neutral', text: 'Problem described but there is room to go deeper. Add the specific monthly cost to the customer. Numbers make the pain concrete and memorable.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Problem statement is too vague.', response: 'Rewrite it. Name one specific person, their exact situation, what it costs them every month, and what they currently do about it. One paragraph with real numbers.' });
    nextSteps.push('Rewrite your problem statement with a specific person, situation, and measurable monthly cost before anything else.');
  }

  if (has(a.startup_q2)) {
    score += 10;
    if (contains(a.startup_q2, 'sme', 'everyone', 'anyone', 'all businesses', 'people who', 'nigerians')) {
      challenges.push({ level: 'medium', text: 'Target customer is still too broad.', response: 'SMEs and Nigerians are categories, not customers. Name one specific type of person with specific characteristics, a specific budget range, and a specific reason they need this right now.' });
    } else {
      insights.push({ type: 'strength', text: 'Specific target customer identified. This focus will make your product decisions, sales conversations, and marketing all significantly more effective.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No specific first customer defined.', response: 'Without a specific first customer you cannot make product decisions, pricing decisions, or distribution decisions. Define one specific type of person before moving forward.' });
    nextSteps.push('Define your first customer in one paragraph. Name their type, situation, budget range, and why they would talk to you this week.');
  }

  if (has(a.startup_q3)) {
    score += 15;
    if (contains(a.startup_q3, 'no', 'not yet', 'have not', "haven't", 'plan to', 'will do', 'have not spoken')) {
      challenges.push({ level: 'high', text: 'You have not spoken to any potential customers yet.', response: 'This is the single most important action before anything else. Not a survey. A real 20 minute conversation. Ask 5 people how they currently solve this problem. Do this before writing any code.' });
      score -= 10;
      nextSteps.push('Have 5 real customer conversations this week. Ask how they currently solve this problem. Listen. Do not pitch.');
    } else if (contains(a.startup_q3, 'spoke', 'talked', 'interviewed', 'conversation', 'asked', 'people')) {
      insights.push({ type: 'strength', text: 'You have had real conversations with potential customers. Every product decision from here should be filtered through what you heard in those conversations.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Customer research not mentioned.', response: 'You cannot build something people will pay for without understanding how they currently live without it. 5 real conversations this week before anything else.' });
    nextSteps.push('Talk to 5 potential customers this week. Real conversations, not surveys.');
  }

  if (has(a.startup_q4)) {
    score += 8;
    if (contains(a.startup_q4, 'better', 'easier', 'cheaper', 'faster')) {
      insights.push({ type: 'neutral', text: 'You have a switching reason but it is comparative. Identify the specific trigger moment that pushes someone from their current solution to yours. That moment is what you design your onboarding around.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a specific switching trigger. Design your onboarding and your first sales conversation around creating that trigger moment as early as possible.' });
    }
  } else {
    challenges.push({ level: 'medium', text: 'No clear switching trigger identified.', response: 'What is the specific moment of pain that pushes someone to change? Until you can name it precisely, your sales and marketing will be unfocused and inefficient.' });
  }

  if (has(a.startup_q5)) {
    score += 10;
    if (contains(a.startup_q5, 'social media', 'instagram', 'twitter', 'facebook', 'ads', 'marketing', 'seo', 'google')) {
      challenges.push({ level: 'high', text: 'Your plan to reach first users relies on channels that almost never work at early stage.', response: 'Social media and paid ads will not get you your first 10 paying customers. They come from personal relationships and direct outreach. Who do you know personally who has this problem right now?' });
      score -= 5;
      nextSteps.push('List 10 people you know personally who have this problem. Contact each one directly this week. Do not wait for them to find you.');
    } else {
      insights.push({ type: 'strength', text: 'Your plan to reach first users is grounded and realistic. Personal relationships and direct outreach are the most reliable path to first revenue. Stay focused here until it stops working.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No clear plan for reaching first users.', response: 'Your first 10 users will not find you. You need to find them. Who do you know personally who has this problem? Start there today.' });
    nextSteps.push('List 10 people you know personally who have this problem. Contact each one this week.');
  }

  if (has(a.startup_q6)) {
    score += 10;
    if (contains(a.startup_q6, 'design', 'ui', 'ux', 'interface', 'look', 'beautiful', 'easy to use', 'user friendly')) {
      challenges.push({ level: 'high', text: 'Your competitive advantage is design or user experience. That is not a sustainable moat.', response: 'Any competitor can hire a designer and copy your interface in 2 weeks. What do you have that takes years to build? Relationships, data, distribution access, domain expertise, or network effects.' });
      score -= 5;
    } else if (contains(a.startup_q6, 'cheaper', 'price', 'affordable', 'low cost', 'free')) {
      challenges.push({ level: 'high', text: 'Your competitive advantage is price. A well funded competitor can always undercut you.', response: 'Price competition destroys margins and attracts the wrong customers. What advantage do you have that cannot be bought or copied? Relationships, proprietary data, exclusive access, or deep expertise?' });
      score -= 5;
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural competitive advantage. Make sure you can explain this in one sentence and that it genuinely gets harder to copy over time, not easier.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No real competitive advantage identified.', response: 'Without a clear answer here you are building something anyone with more money can replicate. What do you know, who do you know, or what can you access that a competitor cannot get quickly?' });
  }

  if (has(a.startup_q7)) {
    score += 10;
    if (contains(a.startup_q7, 'not sure', 'unsure', 'figure out', 'later', 'tbd')) {
      challenges.push({ level: 'high', text: 'Revenue model not yet defined.', response: 'Talk to 5 potential customers this week and ask what they currently pay to solve this problem. That conversation gives you your pricing anchor. Do not build further without an answer here.' });
      score -= 8;
    } else if (contains(a.startup_q7, 'ads', 'advertising', 'sponsored')) {
      challenges.push({ level: 'high', text: 'Advertising as a primary revenue model almost never works at early stage.', response: 'Ad models require millions of users to generate meaningful revenue. At early stage you need direct revenue from customers. Who has a specific reason to pay you and what would they pay?' });
      score -= 8;
    } else if (contains(a.startup_q7, 'naira', 'dollar', '$', 'per month', 'subscription', 'fee', 'commission', 'percent', '%')) {
      insights.push({ type: 'strength', text: 'Specific revenue model with real numbers. Make sure those numbers are grounded in real customer conversations, not assumptions.' });
      score += 5;
    } else {
      insights.push({ type: 'neutral', text: 'You have a revenue direction. Now make it specific. Name the exact price, who pays it, and why they would pay based on the value you create.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Revenue model missing.', response: 'Without a revenue model you are building a project, not a business. Ask 5 potential customers what they currently pay to solve this problem. Start there.' });
    nextSteps.push('Define your revenue model this week. Ask 5 potential customers what they currently pay to solve this problem.');
  }

  if (has(a.startup_q8)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have named your biggest assumption. Now design a test for it. What is the cheapest, fastest way to find out if this assumption is true in the next 2 weeks?' });
    nextSteps.push('Design a 2 week experiment to test your biggest assumption before investing more time building on it.');
  } else {
    challenges.push({ level: 'high', text: 'Biggest assumption not identified.', response: 'Every startup is built on assumptions. The unexamined ones cause failure. What is the one thing you are counting on being true that you have not yet confirmed?' });
  }

  if (has(a.startup_q9)) {
    score += 8;
    if (contains(a.startup_q9, 'yes', 'still', 'persistent', 'structural', 'always', 'definitely')) {
      insights.push({ type: 'strength', text: 'The problem you are solving is persistent. This means you are building on a durable foundation. Persistent problems support durable businesses.' });
    } else {
      challenges.push({ level: 'medium', text: 'Uncertainty about whether this problem will persist.', response: 'If the problem could change significantly in 6 months, you need to build very fast or reconsider your timing. What makes this problem structural rather than temporary?' });
    }
  }

  if (has(a.startup_q10)) {
    score += 7;
    insights.push({ type: 'strength', text: 'You have named your most likely failure mode. Now build an early warning system. What metric or signal will tell you this failure is beginning before it becomes irreversible?' });
    nextSteps.push('Define the early warning signal for your failure mode. What number tells you things are going wrong before it is too late?');
  } else {
    challenges.push({ level: 'medium', text: 'Most likely failure mode not identified.', response: 'Founders who cannot name their failure mode are the most likely to be surprised by it. What is the specific scenario in which this does not work?' });
  }

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : defaultStartupNextSteps(),
    roadmap: buildRoadmap(),
    toolRecommendations: startupTools(a),
    methodology: recommendMethodology(a),
    proofPoints: startupProofs(),
  };
}

function defaultStartupNextSteps() {
  return [
    'Talk to 5 potential customers this week before building anything.',
    'Define your revenue model with a specific price and a specific type of customer.',
    'Identify your biggest unvalidated assumption and design a 2 week test for it.',
    'List 10 people you know personally who have this problem. Contact them directly.',
  ];
}

function startupTools(a) {
  const tools = [];

  if (a.startup_team === 'solo_notech' || a.startup_team === 'team_no_tech') {
    tools.push({
      category: 'Build without code',
      items: [
        { name: 'Bubble', use: 'Full web applications with logic, database, and user accounts', link: 'bubble.io', free: true },
        { name: 'Glide', use: 'Mobile apps built from Google Sheets in hours', link: 'glideapps.com', free: true },
        { name: 'Webflow', use: 'Professional websites and landing pages without code', link: 'webflow.com', free: true },
        { name: 'Softr', use: 'Client portals and internal tools from Airtable data', link: 'softr.io', free: true },
      ],
    });
  }

  tools.push({
    category: 'Backend and database',
    items: [
      { name: 'Supabase', use: 'Database, authentication, and APIs without backend expertise', link: 'supabase.com', free: true },
      { name: 'Firebase', use: 'Real time database and user authentication from Google', link: 'firebase.google.com', free: true },
      { name: 'Airtable', use: 'Spreadsheet-style database that works like a proper database', link: 'airtable.com', free: true },
    ],
  });

  tools.push({
    category: 'Payments for Nigeria and Africa',
    items: [
      { name: 'Paystack', use: 'Accept card, bank transfer, and USSD payments in Nigeria', link: 'paystack.com', free: true },
      { name: 'Flutterwave', use: 'Multi-currency payments across multiple African countries', link: 'flutterwave.com', free: true },
      { name: 'Lemonsqueezy', use: 'Global subscription and digital product payments', link: 'lemonsqueezy.com', free: true },
    ],
  });

  tools.push({
    category: 'Customer research and feedback',
    items: [
      { name: 'Tally', use: 'Beautiful forms for customer surveys and feedback', link: 'tally.so', free: true },
      { name: 'Typeform', use: 'Conversational forms that feel like real interviews', link: 'typeform.com', free: true },
      { name: 'Notion', use: 'Document and organise all your customer research findings', link: 'notion.so', free: true },
    ],
  });

  tools.push({
    category: 'Project management',
    items: [
      { name: 'Trello', use: 'Simple kanban board for small teams', link: 'trello.com', free: true },
      { name: 'Notion', use: 'All-in-one workspace for tasks, documents, and databases', link: 'notion.so', free: true },
      { name: 'Linear', use: 'Fast and focused project management for product teams', link: 'linear.app', free: true },
    ],
  });

  tools.push({
    category: 'Marketing and growth',
    items: [
      { name: 'Mailchimp', use: 'Email marketing for your first 500 subscribers free', link: 'mailchimp.com', free: true },
      { name: 'Canva', use: 'Social media graphics and marketing materials without a designer', link: 'canva.com', free: true },
      { name: 'Buffer', use: 'Schedule social media posts across multiple platforms', link: 'buffer.com', free: true },
    ],
  });

  return tools;
}

function recommendMethodology(a) {
  const methods = {
    scrum: {
      name: 'Scrum',
      color: '#2563EB',
      why: 'Your team size and timeline are well suited to 2-week sprints. Scrum keeps everyone aligned and delivers working results on a regular cadence without losing momentum.',
      howTo: 'Plan in 2-week sprints. At the start of each sprint pick the 5 to 8 most important tasks. At the end review what was completed with a real user. Repeat until launch.',
      tools: ['Jira free tier', 'Linear', 'ClickUp', 'Notion with sprint template'],
    },
    kanban: {
      name: 'Kanban',
      color: '#15803D',
      why: 'For your current stage and team size a visual board works better than rigid sprints. Kanban keeps you moving without unnecessary process overhead.',
      howTo: 'Set up a board with 4 columns: Backlog, This Week, In Progress, Done. Move tasks as you complete them. Review every Friday and reprioritise based on what you have learned.',
      tools: ['Trello free', 'Notion', 'Linear', 'Physical sticky notes on a wall'],
    },
    agile: {
      name: 'Agile',
      color: '#7C3AED',
      why: 'Your requirements are still evolving based on customer feedback. Agile means build a small piece, show it to real users, learn, adjust, and repeat every 1 to 2 weeks.',
      howTo: 'Build the smallest thing that tests your riskiest assumption. Show it to users. Learn. Adjust. Repeat every 1 to 2 weeks without exception until you have product-market fit.',
      tools: ['Trello', 'Notion', 'Basecamp', 'WhatsApp for team communication'],
    },
  };

  if (a.startup_team === 'team_balanced' && (a.startup_timeline === '3months' || a.startup_timeline === '6months')) {
    return methods.scrum;
  }
  if (a.startup_timeline === '2weeks' || a.startup_timeline === '1month') {
    return methods.kanban;
  }
  return methods.agile;
}

function buildRoadmap() {
  return [
    { week: 'Week 1 to 2', title: 'Validate before you build', color: '#2563EB', tasks: ['Talk to 10 potential customers. Listen only. Do not pitch your idea at all.', 'Ask: how do you currently solve this? What would you pay for something better?', 'Document every insight. Look for the pattern that keeps repeating across conversations.', 'Decide: does the evidence support moving forward or do you need to adjust direction?'] },
    { week: 'Week 3 to 6', title: 'Build the minimum viable product', color: '#7C3AED', tasks: ['Build only the single most important feature. Resist all pressure to add more.', 'Get 3 people from your target audience to use it while you watch them silently.', 'Fix the top 3 issues before expanding to more users.', 'Charge something from the very first user. Even a small amount validates real demand.'] },
    { week: 'Week 7 to 10', title: 'Get to first paying customers', color: '#15803D', tasks: ['Launch to 10 to 20 handpicked first customers from your personal network.', 'Track your one most important metric every single week without exception.', 'Get your first real testimonial or case study from a paying customer.', 'Fix the single biggest complaint your first customers share most frequently.'] },
    { week: 'Week 11 to 13', title: 'Iterate and decide', color: '#D97706', tasks: ['Expand to 50 to 100 users through your chosen growth channel.', 'Add only the most requested feature, not the most interesting one to build.', 'Review your unit economics honestly. Are you making money per customer or losing it?', 'Decide based on data not emotion: double down, adjust direction, or stop completely.'] },
  ];
}

function startupProofs() {
  return [
    { name: 'Paystack', country: 'Nigeria', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one precise problem for one specific group. Started focused and expanded only after dominating the initial niche completely.' },
    { name: 'Piggyvest', country: 'Nigeria', result: '4 million users, profitable before taking VC funding', stage: 'success', lesson: 'Started with a WhatsApp savings group before building any technology. Proved the behaviour existed first. Then automated what was already working.' },
    { name: 'Andela', country: 'Africa', result: '1.5 billion dollar valuation', stage: 'success', lesson: 'Founders had personally lived the problem of African developers being overlooked globally. That personal connection to the mission sustained them through the hardest years.' },
    { name: 'Gokada', country: 'Nigeria', result: 'Forced to pivot after Lagos bike ban', stage: 'struggle', lesson: 'Great product but regulatory risk was not managed carefully. A single government decision changed everything overnight. Always know your full regulatory exposure before scaling.' },
  ];
}
