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

// ─── HACKATHON ────────────────────────────────────────────────
function analyzeHackathon(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  // Theme
  if (a.hack_theme) score += 5;

  // Team assessment
  const teamInsights = getTeamInsights(a.hack_team);
  if (teamInsights.score > 0) { score += teamInsights.score; insights.push(...teamInsights.insights); }
  if (teamInsights.challenges.length > 0) challenges.push(...teamInsights.challenges);

  // Timeline
  const timelineInsights = getHackathonTimelineInsights(a.hack_timeline);
  score += timelineInsights.score;
  if (timelineInsights.insight) insights.push(timelineInsights.insight);
  if (timelineInsights.challenge) challenges.push(timelineInsights.challenge);

  // Problem
  if (has(a.hack_q1)) {
    score += 15;
    if (len(a.hack_q1) > 150) {
      insights.push({ type: 'strength', text: 'Your problem statement is specific and detailed. This gives your entire project a clear direction and will make your pitch more compelling.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have identified a problem but push for more specificity. Name a real person, a real situation, and a real cost. The more concrete, the stronger your pitch.' });
    }
  } else {
    score -= 5;
    challenges.push({ level: 'high', text: 'Your problem statement is too vague.', response: 'Rewrite it with a specific person, their exact situation, and what it costs them. Judges need to feel the pain before they can appreciate your solution.' });
  }

  // Real example
  if (has(a.hack_q2)) {
    score += 12;
    insights.push({ type: 'strength', text: 'You have a real example of the problem. Use this exact story to open your pitch. Real examples are far more compelling than statistics or general descriptions.' });
  } else {
    challenges.push({ level: 'high', text: 'You have no real example of the problem.', response: 'Find one specific person who has experienced this problem and describe their situation in detail. If you cannot find one real example, that is a signal the problem may not be as widespread as you think.' });
  }

  // Why now
  if (has(a.hack_q3)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have articulated why this problem matters now. Make sure this urgency comes through clearly in your pitch opening.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not clearly explained why this problem matters right now.', response: 'Judges want to know why now is the right time. What has changed recently that makes this problem more urgent or more solvable?' });
  }

  // Current solution
  if (has(a.hack_q4)) {
    score += 8;
    insights.push({ type: 'strength', text: 'You understand how people currently cope with this problem. This knowledge will help you explain clearly why your approach is better.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not described how people currently deal with this problem.', response: 'Understanding the current workaround is critical. It tells you what you are competing with and why people would switch. Research this before your demo.' });
  }

  // Differentiation
  if (has(a.hack_q5)) {
    score += 12;
    if (contains(a.hack_q5, 'better', 'easier', 'cheaper', 'faster', 'nicer')) {
      challenges.push({ level: 'medium', text: 'Your differentiation sounds like a surface level improvement.', response: 'Better, cheaper, and easier are not strong differentiators. Any competitor can match these. What does your approach do that the current workaround fundamentally cannot do? Find that answer.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural difference between your approach and the current workaround. Lead with this in your pitch.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not explained what makes your approach different.', response: 'This is one of the most important things judges will evaluate. Why would someone choose your solution over what they do today? Answer this clearly before your demo.' });
  }

  // Scalability
  if (has(a.hack_q6)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have thought about whether this idea has staying power beyond the hackathon. Mentioning this in your pitch shows strategic thinking.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not addressed whether this idea can work beyond the hackathon.', response: 'Judges will ask whether this is just a demo or a real idea. Be ready to explain why this solves a persistent real world problem.' });
  }

  // User flow
  if (has(a.hack_q7)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have mapped the user flow. Structure your demo to follow this exact journey so judges can see the product working from a real user perspective.' });
  } else {
    challenges.push({ level: 'high', text: 'You have not mapped how a user would actually experience your product.', response: 'Walk through the user journey right now. Every step from discovery to value. The weakest step is where you lose users and where judges will push back.' });
    nextSteps.push('Map the complete user journey step by step before your demo. Identify the weakest step and strengthen it.');
  }

  // Success metric
  if (has(a.hack_q8)) {
    score += 8;
    insights.push({ type: 'strength', text: 'You have a clear success metric. Mention this in your pitch to show judges you are thinking beyond the demo.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not defined how you will know if this is working.', response: 'Define one specific measurable signal of real value. Not downloads or signups. A behaviour that shows people genuinely find this useful.' });
  }

  score = Math.min(Math.max(score, 0), 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : getHackathonNextSteps(a),
    pitchStructure: getPitchStructure(a),
    tools: formatTools(getHackathonTools(a)),
    proofPoints: hackathonProofs(a.hack_theme),
  };
}

function getTeamInsights(team) {
  const result = { score: 0, insights: [], challenges: [] };
  if (!team) return result;

  if (team === 'team_balanced') {
    result.score = 15;
    result.insights.push({ type: 'strength', text: 'Balanced team with technical and business skills. This is the strongest setup for a hackathon. Assign clear roles immediately: who builds, who designs, who pitches.' });
  } else if (team === 'solo_tech') {
    result.score = 10;
    result.insights.push({ type: 'neutral', text: 'Solo technical builder. You can move fast but be careful about spending all your time building and not enough time on the pitch and user experience.' });
    result.challenges.push({ level: 'medium', text: 'Solo builder risk: spending too much time coding and not enough on pitch preparation.', response: 'Stop building 3 hours before the demo. Use that time to practice your pitch and test your demo with fresh eyes. A polished pitch for a simple product beats a complex product with a weak pitch.' });
  } else if (team === 'solo_notech') {
    result.score = 5;
    result.challenges.push({ level: 'high', text: 'No technical skills on the team.', response: 'Use no-code tools to build your demo. Bubble, Glide, Typeform, or even a WhatsApp bot via Twilio can get you to a working demo without writing code. Focus on proving the concept, not building infrastructure.' });
  } else if (team === 'team_all_tech') {
    result.score = 10;
    result.challenges.push({ level: 'medium', text: 'All technical team with limited business and pitch experience.', response: 'Assign one person to own the pitch completely. They should stop coding 4 hours before the demo and focus only on the presentation. Technical demos without compelling storytelling rarely win.' });
  } else if (team === 'team_no_tech') {
    result.score = 5;
    result.challenges.push({ level: 'high', text: 'Team with limited technical skills.', response: 'Focus entirely on no-code tools: Bubble for web apps, Glide for mobile apps, Typeform for data collection, Canva for design. Your demo does not need to be technically impressive. It needs to be clearly useful.' });
  }
  return result;
}

function getHackathonTimelineInsights(timeline) {
  const result = { score: 0, insight: null, challenge: null };
  if (!timeline) return result;

  if (timeline === '24h') {
    result.score = 5;
    result.challenge = { level: 'high', text: 'Under 24 hours is extremely tight.', response: 'Build only the single core interaction. Nothing else. Your demo must prove one thing works perfectly. Cut everything else. Use no-code tools wherever possible to save time.' };
  } else if (timeline === '48h') {
    result.score = 10;
    result.insight = { type: 'neutral', text: '48 hours is the most common hackathon format. Spend the first 4 hours planning and scoping. Build the core feature in the middle. Use the last 4 hours only for pitch preparation and testing.' };
  } else if (timeline === '72h') {
    result.score = 12;
    result.insight = { type: 'strength', text: '72 hours gives you enough time to build something solid. Use day 1 for planning and core build, day 2 for testing and iteration, day 3 for polish and pitch preparation.' };
  } else if (timeline === 'week') {
    result.score = 15;
    result.insight = { type: 'strength', text: 'A full week means you can actually test with real users before presenting. Plan at least 2 user testing sessions in the middle of the week. Their feedback will make your final demo much stronger.' };
  }
  return result;
}

function getHackathonNextSteps(a) {
  const steps = [];
  const timeline = a.hack_timeline;

  if (timeline === '24h') {
    steps.push('Right now: Write your problem in one sentence and your solution in one sentence. Agree on both before writing a single line of code.');
    steps.push('Hours 1 to 4: Build only the core interaction. One screen. One action. One result.');
    steps.push('Hours 5 to 18: Test the core interaction with 3 people. Fix the top 2 issues only.');
    steps.push('Hours 19 to 24: Practice the pitch. Record a demo video backup in case live demo fails.');
  } else if (timeline === '48h') {
    steps.push('Hours 1 to 4: Define the problem, the solution, and the one core interaction your demo must show. Assign roles.');
    steps.push('Hours 5 to 20: Build only the core feature. Use existing APIs, no-code tools, and templates.');
    steps.push('Hours 21 to 36: Test with real people. Fix the top 3 issues. Add the second most important feature only if core is solid.');
    steps.push('Hours 37 to 48: Polish the pitch. Practice the demo 5 times. Record a backup video.');
  } else {
    steps.push('Day 1: Define scope, assign roles, set up tools and environment. Build the core feature only.');
    steps.push('Day 2 to 3: Complete core feature. Test with at least 3 real users. Document feedback.');
    steps.push('Day 4 to 5: Fix top issues from testing. Build pitch deck. Practice pitch.');
    steps.push('Day 6 to 7: Final polish. Practice demo 5 times with someone outside the team. Record backup video.');
  }
  return steps;
}

function getPitchStructure(a) {
  return [
    {
      step: '1. Open with the person, not the problem',
      duration: '30 seconds',
      content: a.hack_q2 ? a.hack_q2.slice(0, 120) + (a.hack_q2.length > 120 ? '...' : '') : 'Describe one real person experiencing this problem. Make them feel real to the audience.',
      tip: 'Start with a specific person in a specific situation. This immediately makes the problem feel real. Do not start with statistics.',
    },
    {
      step: '2. State the problem clearly',
      duration: '20 seconds',
      content: a.hack_q1 ? a.hack_q1.slice(0, 120) + (a.hack_q1.length > 120 ? '...' : '') : 'State the exact problem in one or two sentences.',
      tip: 'After introducing the person, state the problem in one sentence. Then pause. Let it land.',
    },
    {
      step: '3. Show your solution live',
      duration: '60 seconds',
      content: 'Show the product working in real time. Do not explain. Demonstrate.',
      tip: 'The demo is the pitch. Show the core interaction working. If it fails, use your backup video. Never skip the live demo.',
    },
    {
      step: '4. Show the impact',
      duration: '20 seconds',
      content: a.hack_q8 ? a.hack_q8.slice(0, 120) + (a.hack_q8.length > 120 ? '...' : '') : 'Show what changes for your user when your solution works.',
      tip: 'Connect back to the person you opened with. What is different for them now? Make it specific and measurable.',
    },
    {
      step: '5. Close with your ask',
      duration: '10 seconds',
      content: 'Tell judges what winning means to you and what your next step is.',
      tip: 'Be specific. Not we want to help people. Tell them exactly what you will do next if you win.',
    },
  ];
}

function getHackathonTools(a) {
  const team = a.hack_team;
  const timeline = a.hack_timeline;
  const theme = a.hack_theme;

  const tools = {
    build: [],
    design: [],
    demo: [],
    pitch: [],
    themeSpecific: [],
  };

  // Build tools based on team
  if (team === 'solo_notech' || team === 'team_no_tech') {
    tools.build = [
      { name: 'Bubble', use: 'Build a full web app without code. Drag and drop interface builder with logic and database.', link: 'bubble.io', free: true },
      { name: 'Glide', use: 'Build a mobile app from a Google Sheet in minutes. Perfect for data-driven demos.', link: 'glideapps.com', free: true },
      { name: 'Typeform', use: 'Create beautiful forms and surveys that feel like conversations. Good for user intake flows.', link: 'typeform.com', free: true },
      { name: 'Tally', use: 'Free alternative to Typeform. Unlimited forms with no branding on free plan.', link: 'tally.so', free: true },
    ];
  } else {
    tools.build = [
      { name: 'Next.js', use: 'React framework for building fast web applications. Great for hackathon projects with good defaults.', link: 'nextjs.org', free: true },
      { name: 'Supabase', use: 'Open source Firebase alternative. Database, authentication, and storage in minutes.', link: 'supabase.com', free: true },
      { name: 'Vercel', use: 'Deploy your web app in seconds. Free tier is generous and includes custom domains.', link: 'vercel.com', free: true },
      { name: 'Tailwind CSS', use: 'Utility-first CSS framework. Build good-looking interfaces without writing custom CSS.', link: 'tailwindcss.com', free: true },
    ];
  }

  // Design tools
  tools.design = [
    { name: 'Figma', use: 'Design your screens before building. Free for up to 3 projects. Faster than building then redesigning.', link: 'figma.com', free: true },
    { name: 'Canva', use: 'Create pitch deck slides, logos, and social graphics quickly. Easier than PowerPoint.', link: 'canva.com', free: true },
    { name: 'v0 by Vercel', use: 'Generate React UI components from text descriptions. Saves hours of frontend work.', link: 'v0.dev', free: true },
  ];

  // Demo tools
  tools.demo = [
    { name: 'Loom', use: 'Record your demo as a backup video. If your live demo fails, play this. Always have a backup.', link: 'loom.com', free: true },
    { name: 'OBS Studio', use: 'Free screen recording and streaming. Use for high quality demo videos.', link: 'obsproject.com', free: true },
  ];

  // Pitch tools
  tools.pitch = [
    { name: 'Canva Presentations', use: 'Build your pitch deck. Use their startup pitch template as a starting point.', link: 'canva.com', free: true },
    { name: 'Beautiful.ai', use: 'AI-powered pitch deck builder. Automatically formats slides as you add content.', link: 'beautiful.ai', free: false },
    { name: 'ChatGPT or Claude', use: 'Use AI to help refine your problem statement, pitch script, and slide content.', link: 'claude.ai', free: true },
  ];

  // Theme specific tools
  if (theme === 'fintech') {
    tools.themeSpecific = [
      { name: 'Paystack', use: 'Accept payments in Nigeria. Integrate in minutes with a simple API. Free to start.', link: 'paystack.com', free: true },
      { name: 'Flutterwave', use: 'Pan-African payment processing. Good for demos involving money movement.', link: 'flutterwave.com', free: true },
    ];
  } else if (theme === 'health') {
    tools.themeSpecific = [
      { name: 'Twilio', use: 'Send SMS and WhatsApp messages programmatically. Good for health reminders and alerts.', link: 'twilio.com', free: true },
      { name: 'Africa\'s Talking', use: 'African telecoms API. SMS, USSD, voice, and airtime. Works across African networks.', link: 'africastalking.com', free: true },
    ];
  } else if (theme === 'agriculture') {
    tools.themeSpecific = [
      { name: 'Twilio WhatsApp API', use: 'Build WhatsApp chatbots for farmers who already use WhatsApp daily.', link: 'twilio.com', free: true },
      { name: 'Africa\'s Talking', use: 'USSD and SMS APIs that work even on feature phones with no internet.', link: 'africastalking.com', free: true },
    ];
  } else if (theme === 'education') {
    tools.themeSpecific = [
      { name: 'Teachable', use: 'Host and deliver educational content quickly. Good for demos of learning platforms.', link: 'teachable.com', free: true },
      { name: 'Notion', use: 'Build a knowledge base or curriculum structure rapidly. Great for education prototypes.', link: 'notion.so', free: true },
    ];
  } else if (theme === 'ai_ml') {
    tools.themeSpecific = [
      { name: 'OpenAI API', use: 'Access GPT models for AI-powered features. Free credits for new accounts.', link: 'openai.com', free: true },
      { name: 'Hugging Face', use: 'Free open source AI models. Good for demos involving text, image, or audio AI.', link: 'huggingface.co', free: true },
      { name: 'Replicate', use: 'Run AI models via API. Pay per use with no setup required.', link: 'replicate.com', free: true },
    ];
  }

  return tools;
}

function formatTools(toolsObj) {
  const labelMap = {
    build: 'Build tools',
    design: 'Design tools',
    demo: 'Demo tools',
    pitch: 'Pitch tools',
    themeSpecific: 'Theme-specific tools',
    payments: 'Payment tools',
    analytics: 'Analytics tools',
    customer: 'Customer tools',
    operations: 'Operations tools',
  };
  return Object.entries(toolsObj)
    .filter(([, items]) => items && items.length > 0)
    .map(([key, items]) => ({ category: labelMap[key] || key, items }));
}

function hackathonProofs(theme) {
  const all = {
    ai_ml: [
      { name: 'Hugging Face', result: 'Now valued at 4.5 billion dollars', stage: 'success', lesson: 'Started as a small AI chatbot built over a weekend. Built one thing that worked. Everything else came after.' },
      { name: 'Lensa AI', result: 'Over 5 million downloads in first week of viral feature', stage: 'success', lesson: 'One AI feature done extremely well beat dozens of mediocre ones.' },
    ],
    fintech: [
      { name: 'Paystack', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one problem for one group. Started focused and expanded only after dominating that niche.' },
      { name: 'Piggyvest', result: '4 million users, profitable', stage: 'success', lesson: 'Started as a simple WhatsApp savings group before any technology was built.' },
    ],
    health: [
      { name: 'Helium Health', result: 'Largest health tech company in Nigeria', stage: 'success', lesson: 'Started with one hospital management feature. Did not try to solve all of healthcare at once.' },
      { name: 'mPharma', result: 'Operating in 8 African countries', stage: 'success', lesson: 'Started with one pharmacy in Ghana. Solved one problem completely before expanding.' },
    ],
    agriculture: [
      { name: 'Twiga Foods', result: 'Series C funded across Kenya', stage: 'success', lesson: 'Started with one supply chain problem in Nairobi. Did not try to fix all of agriculture.' },
      { name: 'Farmcrowdy', result: 'Raised 1 million dollar seed round', stage: 'success', lesson: 'Connected farmers with investors. Simple concept applied to a real pain point.' },
    ],
    education: [
      { name: 'uLesson', result: 'Raised over 20 million dollars', stage: 'success', lesson: 'Started with secondary school students in Nigeria only. Focused before expanding.' },
      { name: 'Andela', result: '1.5 billion dollar valuation', stage: 'success', lesson: 'Founders had lived the problem. African developers being overlooked globally. Personal connection sustained them.' },
    ],
    default: [
      { name: 'GroupMe', result: 'Sold to Skype for 85 million dollars', stage: 'success', lesson: 'Built at TechCrunch Hackathon in 36 hours. Did one thing: group SMS. Nothing else.' },
      { name: 'Carrd', result: 'Bootstrapped to over 1 million dollars annual revenue', stage: 'success', lesson: 'Started as a weekend project. One simple thing done extremely well.' },
    ],
  };
  return all[theme] || all.default;
}

// ─── STARTUP ──────────────────────────────────────────────────
function analyzeStartup(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  // Problem
  if (has(a.startup_q1)) {
    score += 12;
    if (len(a.startup_q1) > 200) {
      insights.push({ type: 'strength', text: 'Detailed problem statement. You understand this problem well. The depth here will make your pitch and your product decisions sharper.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have described the problem. Push deeper. Can you quantify the cost to the customer? A number makes the pain concrete and the opportunity clear.' });
    }
  } else {
    score -= 5;
    challenges.push({ level: 'high', text: 'Problem statement is too vague.', response: 'Rewrite it: one specific person, their exact situation, and what it costs them every month. One paragraph minimum. Investors and customers both need to feel this before they believe in your solution.' });
    nextSteps.push('Rewrite your problem statement with a specific person, a specific situation, and a measurable cost.');
  }

  // Target customer
  if (has(a.startup_q2)) {
    score += 10;
    if (contains(a.startup_q2, 'sme', 'everyone', 'anyone', 'all businesses', 'people who', 'nigerians', 'africans')) {
      challenges.push({ level: 'medium', text: 'Target customer is still too broad.', response: 'Everyone and SMEs are not customers. Name one specific type of person with specific characteristics: their role, their revenue range, their location, their current behaviour. The more specific, the easier it is to find them, sell to them, and build for them.' });
      score -= 3;
    } else {
      insights.push({ type: 'strength', text: 'Specific target customer identified. This focus will help you build the right product and find your first users faster than founders who try to serve everyone.' });
    }
  } else {
    score -= 5;
    challenges.push({ level: 'high', text: 'No specific first customer defined.', response: 'Without a specific first customer, you cannot make product decisions, sales decisions, or distribution decisions. Define one specific type of person with specific characteristics before moving forward.' });
    nextSteps.push('Define your first customer in one paragraph: type of person, situation, budget, and why they would talk to you.');
  }

  // Customer conversations
  if (has(a.startup_q3)) {
    score += 15;
    if (contains(a.startup_q3, 'no', 'not yet', 'have not', 'haven\'t', 'plan to', 'will do', 'going to')) {
      score -= 10;
      challenges.push({ level: 'high', text: 'You have not spoken to any potential customers yet.', response: 'This is the single most important thing you need to do before anything else. Not a survey. A real conversation. Talk to 5 people who have this problem this week. Ask how they currently solve it. Listen more than you talk. What they say will change what you build.' });
      nextSteps.push('Talk to 5 potential customers this week before building anything. Ask how they currently solve this problem, not whether they would use yours.');
    } else if (contains(a.startup_q3, 'spoke', 'talked', 'interviewed', 'conversation', 'asked', 'met')) {
      insights.push({ type: 'strength', text: 'You have had real conversations with potential customers. This is one of the most valuable things a founder can do. Every product decision you make should be traceable back to something you heard in those conversations.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No customer research mentioned.', response: 'You cannot build a product people will pay for without understanding how they currently live without it. Talk to 5 real people before writing any more code.' });
    nextSteps.push('Have 5 real customer conversations before your next build sprint. Listen more than you talk.');
  }

  // Switching reason
  if (has(a.startup_q4)) {
    score += 8;
    insights.push({ type: 'strength', text: 'You have identified the switching trigger. Use this insight to design your onboarding and your sales pitch around the exact moment people are most likely to switch.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not identified why someone would switch to your product.', response: 'Switching has a real cost. People are used to their current solution even if it is bad. What is the specific frustration or event that pushes someone to change? Name that moment precisely.' });
  }

  // First 10 users
  if (has(a.startup_q5)) {
    score += 10;
    if (contains(a.startup_q5, 'social media', 'instagram', 'twitter', 'tiktok', 'ads', 'marketing', 'seo', 'google')) {
      score -= 5;
      challenges.push({ level: 'high', text: 'Your plan for first 10 users relies on channels that almost never work at this stage.', response: 'Social media and paid ads rarely produce the first 10 paying customers. Your first 10 users will come from personal relationships, direct outreach, or communities you are already part of. Who do you know personally who has this problem? Start there. Make a list of 10 names right now.' });
      nextSteps.push('List 10 people you know personally who have this problem. Contact each one directly this week. Do not use social media or ads for your first 10 users.');
    } else {
      insights.push({ type: 'strength', text: 'Your plan to reach first users is grounded in direct relationships and outreach. This is the right approach. Most successful startups find their first 10 to 20 customers through personal relationships, not marketing.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No clear plan for reaching first 10 users.', response: 'Your first 10 users will not find you. You need to find them. Who do you know personally who has this problem? Start there. Make a list of 10 names right now and contact each one this week.' });
    nextSteps.push('List 10 people you know personally who have this problem and contact each one directly this week.');
  }

  // Competitive advantage
  if (has(a.startup_q6)) {
    score += 10;
    if (contains(a.startup_q6, 'design', 'ui', 'ux', 'interface', 'look', 'beautiful', 'easy to use', 'user friendly')) {
      score -= 5;
      challenges.push({ level: 'high', text: 'Design is not a competitive advantage.', response: 'Any competitor can hire a designer and match your interface in 2 weeks. What do you have that takes years to build? Think about trusted relationships, proprietary data, exclusive distribution, or domain expertise that only comes from lived experience. What is your structural advantage?' });
    } else if (contains(a.startup_q6, 'cheaper', 'price', 'affordable', 'low cost', 'free')) {
      score -= 5;
      challenges.push({ level: 'high', text: 'Price is not a sustainable competitive advantage.', response: 'A well funded competitor can always undercut your price. Price competition destroys margins and attracts customers who will leave the moment someone offers a lower price. What structural advantage do you have that cannot be bought or copied quickly?' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural competitive advantage. This is what will protect you when well-funded competitors enter your market. Make sure you can explain it in one sentence.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No clear competitive advantage defined.', response: 'Without a structural advantage, you are building something anyone with more money can replicate. What do you know, who do you know, or what can you access that a competitor cannot easily get? Your advantage must be something that gets harder to copy over time.' });
  }

  // Revenue
  if (has(a.startup_q7)) {
    score += 10;
    if (contains(a.startup_q7, 'not sure', 'unsure', 'figure out', 'later', 'ads', 'advertising', 'sponsorship')) {
      score -= 8;
      if (contains(a.startup_q7, 'ads', 'advertising', 'sponsorship')) {
        challenges.push({ level: 'high', text: 'Advertising revenue requires millions of users to be meaningful.', response: 'Ad models almost never work at early stage in African markets where CPMs are low. You need millions of active users to generate significant ad revenue. What is the direct path to someone paying you for the value you create? Who benefits most and would pay most?' });
      } else {
        challenges.push({ level: 'high', text: 'Revenue model is unclear.', response: 'Not knowing how you make money is a serious risk at this stage. Talk to 5 potential customers this week and ask: what do you currently pay to solve this problem? That conversation will give you your pricing anchor.' });
      }
      nextSteps.push('Define your revenue model this week. Ask 5 potential customers what they currently pay to solve this problem. Use that as your pricing anchor.');
    } else if (contains(a.startup_q7, 'naira', 'dollar', 'per month', 'subscription', 'fee', 'commission', '%', 'percent')) {
      insights.push({ type: 'strength', text: 'You have a specific revenue model with real numbers grounded in customer conversations. This specificity separates serious founders from people with ideas. Now validate those numbers by asking your first 5 customers to actually pay.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have a revenue direction. Make it more specific. Name the exact price, who pays it, and why they would pay that amount based on the value you create for them. Then ask your first potential customer to pay it.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No revenue model defined.', response: 'This is a fundamental gap. Without a revenue model you are building a project, not a business. Ask 5 potential customers what they currently pay to solve this problem. Start there.' });
    nextSteps.push('Define your revenue model: who pays, how much, and why. Validate it by asking real customers.');
  }

  // Team
  const startupTeamInsights = getStartupTeamInsights(a.startup_team);
  score += startupTeamInsights.score;
  if (startupTeamInsights.insight) insights.push(startupTeamInsights.insight);
  if (startupTeamInsights.challenge) challenges.push(startupTeamInsights.challenge);

  // Timeline
  const startupTimelineInsights = getStartupTimelineInsights(a.startup_timeline);
  score += startupTimelineInsights.score;
  if (startupTimelineInsights.insight) insights.push(startupTimelineInsights.insight);
  if (startupTimelineInsights.challenge) challenges.push(startupTimelineInsights.challenge);

  // Biggest assumption
  if (has(a.startup_q8)) {
    score += 8;
    insights.push({ type: 'strength', text: 'You have named your biggest assumption. Now design a test for it. What is the cheapest fastest way to find out if this assumption is true before you invest more time building on it?' });
    nextSteps.push('Test your biggest assumption within 2 weeks. Design the cheapest experiment that gives you a clear answer.');
  } else {
    challenges.push({ level: 'high', text: 'Biggest assumption not identified.', response: 'Every startup has one or two assumptions that hold everything together. The ones that go unexamined cause failure. What is the one thing you are counting on being true that you have not yet confirmed?' });
  }

  // Persistence
  if (has(a.startup_q9)) {
    score += 6;
    if (contains(a.startup_q9, 'yes', 'still', 'persist', 'structural', 'always', 'remain')) {
      insights.push({ type: 'strength', text: 'The problem you are solving is persistent. You are building on a durable foundation. Persistent problems support durable businesses.' });
    } else {
      challenges.push({ level: 'medium', text: 'You are uncertain whether this problem will persist.', response: 'If the problem could disappear or change significantly in 6 months, you need to build very fast or reconsider the timing. What makes this problem structural and not temporary?' });
    }
  }

  // Failure mode
  if (has(a.startup_q10)) {
    score += 6;
    insights.push({ type: 'strength', text: 'You have named your most likely failure mode. That self-awareness is more valuable than most founder skills. Now build an early warning system. What metric will tell you this failure is beginning before it becomes irreversible?' });
    nextSteps.push('Define one early warning metric that tells you your failure mode is starting. Review this metric every week.');
  } else {
    challenges.push({ level: 'medium', text: 'Failure mode not identified.', response: 'Founders who cannot name why they might fail are most likely to be surprised by it. Be honest with yourself. What specific scenario makes this idea not work?' });
  }

  score = Math.min(Math.max(score, 0), 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : getStartupNextSteps(),
    roadmap: buildRoadmap(a),
    tools: formatTools(getStartupTools(a)),
    methodology: recommendMethodology(a),
    proofPoints: startupProofs(),
  };
}

function getStartupTeamInsights(team) {
  const result = { score: 0, insight: null, challenge: null };
  if (!team) return result;

  if (team === 'team_balanced') {
    result.score = 10;
    result.insight = { type: 'strength', text: 'Balanced team covering technology and business. Assign clear ownership: one person owns product, one owns customers, one owns operations. Ambiguous ownership kills startups.' };
  } else if (team === 'solo_tech') {
    result.score = 6;
    result.insight = { type: 'neutral', text: 'Solo technical founder. You can move fast but you will eventually need someone to own sales and customer relationships. Start looking for a co-founder or early hire who is strong in business development.' };
  } else if (team === 'solo_notech') {
    result.score = 4;
    result.challenge = { level: 'high', text: 'Non-technical solo founder building a software product.', response: 'You need a technical co-founder or a reliable development partner. Using no-code tools like Bubble or hiring a freelancer can work for an MVP but you will need real technical capability to scale. Start finding a technical co-founder now, not after you have traction.' };
  } else if (team === 'team_all_tech') {
    result.score = 6;
    result.challenge = { level: 'medium', text: 'Technical team without clear business and sales ownership.', response: 'Who on your team owns talking to customers every day? Who owns revenue? If nobody has a clear answer, you have a gap. Assign a commercial owner immediately. Technical products without commercial owners rarely find product-market fit.' };
  } else if (team === 'team_no_tech') {
    result.score = 4;
    result.challenge = { level: 'high', text: 'Business team without technical capability.', response: 'You need a technical co-founder or you need to use no-code tools to build your MVP. Agencies and freelancers can get you to MVP but create dependency. Finding a technical co-founder who shares your vision is the stronger long term path.' };
  }
  return result;
}

function getStartupTimelineInsights(timeline) {
  const result = { score: 0, insight: null, challenge: null };
  if (!timeline) return result;

  if (timeline === '2weeks') {
    result.score = 8;
    result.insight = { type: 'neutral', text: 'Under 2 weeks to first user means you need to build a manual or no-code MVP. That is fine. A manual MVP that tests your core assumption is worth more than a polished product nobody wants.' };
  } else if (timeline === '1month') {
    result.score = 10;
    result.insight = { type: 'strength', text: '2 to 4 weeks to first user is ambitious but healthy. It forces you to build only what is essential. Define the absolute minimum that tests your core assumption and build only that.' };
  } else if (timeline === '3months') {
    result.score = 10;
    result.insight = { type: 'strength', text: '1 to 3 months is a realistic pace for a focused MVP. Use week 1 and 2 for customer research before writing any code. Use weeks 3 to 8 to build. Use weeks 9 to 12 to test with real users and iterate.' };
  } else if (timeline === '6months') {
    result.score = 6;
    result.challenge = { level: 'medium', text: '3 to 6 months before real user testing is a long time to build on assumptions.', response: 'Consider whether you can shorten this timeline by building a manual or no-code version first. Every month you build without real user feedback is a month you might be building the wrong thing.' };
  } else if (timeline === 'longer') {
    result.score = 3;
    result.challenge = { level: 'high', text: 'More than 6 months before real user testing is high risk.', response: 'This is too long. Break your product into smaller pieces. What is the smallest version that lets a real user experience the core value? Build that first. Get feedback. Then build the next piece. Never go more than 4 weeks without putting something in front of a real user.' };
  }
  return result;
}

function getStartupNextSteps() {
  return [
    'Talk to 5 potential customers this week before building anything.',
    'Define your revenue model: who pays, how much, and why. Validate with real conversations.',
    'Identify your biggest unvalidated assumption and design a 2 week test for it.',
    'List 10 people you know personally who have this problem and contact each one directly.',
  ];
}

function buildRoadmap(a) {
  const timeline = a.startup_timeline;
  const isUrgent = timeline === '2weeks' || timeline === '1month';

  if (isUrgent) {
    return [
      { phase: 'Phase 1', duration: 'Week 1', title: 'Validate the pain', color: '#2563EB', tasks: ['Talk to 10 potential customers. Listen. Do not pitch.', 'Ask: how do you currently solve this? What would you pay for something better?', 'Document patterns. Look for the recurring frustration that every person mentions.', 'Decide: does the evidence support building this?'] },
      { phase: 'Phase 2', duration: 'Week 2', title: 'Build the manual MVP', color: '#7C3AED', tasks: ['Serve your first customers manually before building any technology.', 'Use WhatsApp, Google Forms, and spreadsheets to deliver the service.', 'Document every manual step. These become your future features.', 'Charge something. Even a small amount proves real demand.'] },
      { phase: 'Phase 3', duration: 'Week 3 to 4', title: 'First paying customers', color: '#15803D', tasks: ['Get 5 to 10 paying customers using the manual version.', 'Use the revenue and feedback to decide what to automate first.', 'Only start building technology after you have paying customers.', 'Track your one key metric every week.'] },
      { phase: 'Phase 4', duration: 'Week 5 to 8', title: 'Build and iterate', color: '#D97706', tasks: ['Build only the feature your customers ask for most.', 'Get each customer to test every new feature before releasing it.', 'Decide based on data: double down, adjust, or stop.'] },
    ];
  }

  return [
    { phase: 'Phase 1', duration: 'Week 1 to 2', title: 'Validate before building', color: '#2563EB', tasks: ['Talk to 10 potential customers. Listen. Do not pitch.', 'Ask how they currently solve this and what they would pay for something better.', 'Document patterns and surprises. What did you assume that was wrong?', 'Decide: does the evidence support moving forward?'] },
    { phase: 'Phase 2', duration: 'Week 3 to 6', title: 'Build the minimum viable product', color: '#7C3AED', tasks: ['Build only the single most important feature. Resist adding more.', 'Use existing services for everything that is not your core value.', 'Get 3 people from your target audience to test while you watch.', 'Charge from the first user. Even a small amount proves real demand.'] },
    { phase: 'Phase 3', duration: 'Week 7 to 10', title: 'First paying customers', color: '#15803D', tasks: ['Launch to 10 to 20 handpicked first customers from your personal network.', 'Track your one key metric every week without exception.', 'Get your first testimonial or case study from a real user.', 'Fix the top issue your first customers complain about.'] },
    { phase: 'Phase 4', duration: 'Week 11 to 13', title: 'Iterate and decide', color: '#D97706', tasks: ['Expand to 50 to 100 users through your chosen channel.', 'Add only the most requested feature, not the most interesting one.', 'Review your unit economics. Are you making or losing money per customer?', 'Decide based on data: double down, adjust, or change direction.'] },
  ];
}

function recommendMethodology(a) {
  const timeline = a.startup_timeline;
  const team = a.startup_team;

  if (timeline === '2weeks' || timeline === '1month') {
    return {
      name: 'Kanban',
      color: '#15803D',
      why: 'Your tight timeline needs maximum flexibility. Kanban keeps you moving without rigid sprint ceremonies that slow you down.',
      howTo: 'Set up a simple board with 4 columns: To Do, In Progress, Review, Done. Move cards daily. Review and reprioritise every morning. Cut anything that is not essential to the core demo.',
      tools: ['Trello free tier', 'Notion kanban template', 'Physical sticky notes on a wall'],
    };
  } else if (team === 'team_balanced' || team === 'team_all_tech') {
    return {
      name: 'Scrum with 2-week sprints',
      color: '#2563EB',
      why: 'Your team size and timeline are ideal for structured sprints. Scrum keeps everyone aligned and delivers working results every 2 weeks for real user feedback.',
      howTo: 'Plan in 2 week sprints. Each sprint: pick the most important tasks, build them, review with a real user at the end. Retrospective: what worked, what did not. Repeat.',
      tools: ['Jira free tier', 'Linear', 'ClickUp free tier', 'Notion sprint template'],
    };
  } else {
    return {
      name: 'Agile with weekly check-ins',
      color: '#7C3AED',
      why: 'Your requirements are still evolving. Agile means build a small piece, get user feedback, adjust, and repeat. Do not plan more than 2 weeks ahead.',
      howTo: 'Every week: pick the most important thing to build. Build it. Show it to a real user. Learn. Adjust next week\'s plan based on what you learned.',
      tools: ['Trello', 'Notion', 'WhatsApp group for team communication', 'Google Sheets for tracking'],
    };
  }
}

function getStartupTools(a) {
  const team = a.startup_team;
  const timeline = a.startup_timeline;

  const tools = {
    build: [],
    payments: [],
    analytics: [],
    customer: [],
    operations: [],
  };

  if (team === 'solo_notech' || team === 'team_no_tech') {
    tools.build = [
      { name: 'Bubble', use: 'Build a full web application without code. Has a free tier. Used by many Nigerian startups for their MVPs.', link: 'bubble.io', free: true },
      { name: 'Glide', use: 'Build a mobile app from a Google Sheet. Fastest path to a working mobile product without code.', link: 'glideapps.com', free: true },
      { name: 'Webflow', use: 'Build professional websites and landing pages without code. Better than Squarespace for custom designs.', link: 'webflow.com', free: true },
    ];
  } else {
    tools.build = [
      { name: 'Next.js and Supabase', use: 'The fastest way for a developer to build a web app with authentication, database, and storage all included.', link: 'supabase.com', free: true },
      { name: 'Flutter', use: 'Build iOS and Android apps from one codebase. Good for startups that need mobile first products.', link: 'flutter.dev', free: true },
      { name: 'Vercel', use: 'Deploy web apps in seconds. The free tier is generous enough for most early stage startups.', link: 'vercel.com', free: true },
    ];
  }

  tools.payments = [
    { name: 'Paystack', use: 'Accept card payments, bank transfers, and USSD in Nigeria. Easiest payment integration for Nigerian products. 1.5 percent transaction fee.', link: 'paystack.com', free: true },
    { name: 'Flutterwave', use: 'Accept payments across Africa. Better for products operating in multiple African countries. Similar fees to Paystack.', link: 'flutterwave.com', free: true },
  ];

  tools.analytics = [
    { name: 'Google Analytics', use: 'Track who visits your product, where they come from, and what they do. Free for most startups.', link: 'analytics.google.com', free: true },
    { name: 'Hotjar', use: 'See recordings of real users using your product. Reveals where people get confused without asking them.', link: 'hotjar.com', free: true },
    { name: 'Mixpanel', use: 'Track specific user actions and build funnels. Better than Google Analytics for understanding user behaviour inside your product.', link: 'mixpanel.com', free: true },
  ];

  tools.customer = [
    { name: 'Typeform', use: 'Collect customer feedback with forms that feel like conversations. Much higher completion rates than Google Forms.', link: 'typeform.com', free: true },
    { name: 'Intercom', use: 'Live chat and customer messaging for your product. Lets you talk to customers in real time as they use your product.', link: 'intercom.com', free: false },
    { name: 'WhatsApp Business', use: 'Free customer support channel. Most Nigerian customers prefer WhatsApp over email or in-app chat.', link: 'business.whatsapp.com', free: true },
  ];

  tools.operations = [
    { name: 'Notion', use: 'Document everything: decisions, processes, meeting notes, and product specs. Free for small teams.', link: 'notion.so', free: true },
    { name: 'Slack', use: 'Team communication. Free tier supports small teams well.', link: 'slack.com', free: true },
    { name: 'Google Workspace', use: 'Email, docs, sheets, and drive. Professional email address builds trust with customers.', link: 'workspace.google.com', free: false },
  ];

  return tools;
}

function startupProofs() {
  return [
    { name: 'Paystack', country: 'Nigeria', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one precise problem for one specific group. Started focused and only expanded after dominating that niche. Their first product was a simple payment API for developers.' },
    { name: 'Piggyvest', country: 'Nigeria', result: '4 million users, profitable without VC until Series A', stage: 'success', lesson: 'Started as a WhatsApp savings group before any technology was built. Proved the behaviour existed before automating it. This is the best possible way to validate an idea.' },
    { name: 'Flutterwave', country: 'Nigeria and Africa', result: '3 billion dollar valuation', stage: 'success', lesson: 'Founded by people who had worked inside the banks they were disrupting. Insider knowledge and existing relationships were the unfair advantage that no outside competitor could replicate quickly.' },
    { name: 'Gokada', country: 'Nigeria', result: 'Forced to pivot after Lagos bike ban', stage: 'struggle', lesson: 'Great product but regulatory risk was not managed. A single government decision changed the business overnight. Always know your regulatory exposure and have a contingency plan.' },
    { name: 'Andela', country: 'Africa', result: '1.5 billion dollar valuation', stage: 'success', lesson: 'Founders had lived the problem personally. African developers being overlooked globally. Personal connection to the mission sustained them through years of difficulty before the breakthrough.' },
  ];
}
