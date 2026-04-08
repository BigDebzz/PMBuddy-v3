export function analyze(mode, answers) {
  return mode === 'hackathon' ? analyzeHackathon(answers) : analyzeStartup(answers);
}

const len = (val) => (val || '').trim().length;
const has = (val) => len(val) > 10;
const contains = (val, ...words) => words.some(w => (val || '').toLowerCase().includes(w.toLowerCase()));

function scoreColor(score) {
  if (score >= 75) return '#15803D';
  if (score >= 55) return '#2563EB';
  if (score >= 35) return '#D97706';
  return '#DC2626';
}

function verdict(score) {
  if (score >= 75) return 'Strong foundation';
  if (score >= 55) return 'Good with gaps to address';
  if (score >= 35) return 'Needs more work before building';
  return 'Significant gaps. Rethink before proceeding.';
}

// ─── HACKATHON ────────────────────────────────────────────────
function analyzeHackathon(a) {
  let score = 0;
  const insights = [];
  const challenges = [];

  // Theme
  if (a.hack_theme) score += 10;

  // Problem statement
  if (has(a.hack_q1)) {
    score += 25;
    if (len(a.hack_q1) > 100) {
      insights.push({ type: 'strength', text: 'Your problem statement is specific and detailed. This gives your project a clear direction and will make your pitch more compelling to judges.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have identified a problem. Push for more specificity. Name a real person, their exact situation, and what it costs them.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Problem statement is too vague.', response: 'Describe a specific person in a specific situation with a specific cost. Judges need to feel the pain before they believe in your solution.' });
  }

  // Solution
  if (has(a.hack_q2)) {
    score += 25;
    insights.push({ type: 'strength', text: 'You have described what you are building. Make sure your demo shows this working end to end, not just a design mockup.' });
  } else {
    challenges.push({ level: 'high', text: 'Solution is not clearly defined.', response: 'Describe what someone can actually do with your product from start to finish in plain language.' });
  }

  // Timeline
  if (a.hack_q3) {
    if (a.hack_q3 === '24h') {
      score += 5;
      challenges.push({ level: 'high', text: 'Under 24 hours is extremely tight.', response: 'Build only the single most essential interaction. Use no-code tools. Your demo must prove one thing works perfectly.' });
    } else if (a.hack_q3 === '48h') {
      score += 15;
      insights.push({ type: 'neutral', text: '48 hours. Use the first 4 hours planning. Build the core feature in the middle. Keep the last 4 hours only for pitch and testing.' });
    } else if (a.hack_q3 === '72h') {
      score += 18;
      insights.push({ type: 'strength', text: '72 hours gives you enough time to build something solid and test it with real users before presenting.' });
    } else {
      score += 20;
      insights.push({ type: 'strength', text: 'A full week means you can test with real users before presenting. Plan at least 2 user testing sessions in the middle of the week.' });
    }
  }

  // Team
  if (a.hack_q4) {
    if (a.hack_q4 === 'team_balanced') {
      score += 20;
      insights.push({ type: 'strength', text: 'Balanced team with technical and business skills. Assign clear roles immediately so nobody duplicates work.' });
    } else if (a.hack_q4 === 'solo_tech') {
      score += 10;
      challenges.push({ level: 'medium', text: 'Solo builder risk: spending too much time coding and not enough on the pitch.', response: 'Stop building 3 hours before the demo. Use that time to practice your pitch and test with fresh eyes.' });
    } else if (a.hack_q4 === 'solo_notech' || a.hack_q4 === 'team_no_tech') {
      score += 5;
      challenges.push({ level: 'high', text: 'Limited technical skills on the team.', response: 'Use no-code tools. Bubble, Glide, or Typeform can get you to a working demo without writing code. Focus on proving the concept.' });
    } else {
      score += 10;
    }
  }

  // Real world viability
  if (has(a.hack_q5)) {
    score += 5;
    insights.push({ type: 'strength', text: 'You have thought about whether this idea has staying power. Mentioning this in your pitch shows judges you are thinking beyond the event.' });
  }

  score = Math.min(Math.max(score, 0), 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: getHackathonNextSteps(a),
    pitchStructure: getPitchStructure(a),
    tools: formatTools(getHackathonTools(a)),
    proofPoints: hackathonProofs(a.hack_theme),
  };
}

function getHackathonNextSteps(a) {
  const tl = a.hack_q3;
  if (tl === '24h') {
    return [
      'Right now: Write your problem in one sentence and your solution in one sentence.',
      'Hours 1 to 4: Build only the core interaction. One screen. One action. One result.',
      'Hours 5 to 20: Test with 3 people. Fix the top 2 issues only.',
      'Hours 21 to 24: Practice the pitch. Record a demo video backup.',
    ];
  }
  return [
    'Start by agreeing on the problem statement and solution in one sentence each.',
    'Build only the core feature. Resist adding anything extra until the core works.',
    'Test with at least 3 real people and fix the top issues before the demo.',
    'Practice the pitch 5 times. Record a backup demo video in case the live demo fails.',
  ];
}

function getPitchStructure(a) {
  return [
    { step: '1. Open with the person', duration: '30 seconds', content: 'Describe one real person experiencing this problem. Make them feel real.', tip: 'Start with a specific person in a specific situation. Do not start with statistics.' },
    { step: '2. State the problem', duration: '20 seconds', content: a.hack_q1 ? a.hack_q1.slice(0, 100) + '...' : 'State the exact problem in one or two sentences.', tip: 'State the problem in one sentence. Then pause. Let it land.' },
    { step: '3. Show your solution live', duration: '60 seconds', content: a.hack_q2 ? a.hack_q2.slice(0, 100) + '...' : 'Show the product working in real time.', tip: 'The demo is the pitch. Show the core interaction working. Always have a backup video.' },
    { step: '4. Show the impact', duration: '20 seconds', content: 'What changes for your user when your solution works?', tip: 'Connect back to the person you opened with. What is different for them now?' },
    { step: '5. Close with your ask', duration: '10 seconds', content: 'Tell judges what winning means to you and your next step.', tip: 'Be specific. Not we want to help people. Tell them exactly what you will do next if you win.' },
  ];
}

function getHackathonTools(a) {
  const team = a.hack_q4;
  const theme = a.hack_theme;
  const tools = { build: [], design: [], demo: [], themeSpecific: [] };

  if (team === 'solo_notech' || team === 'team_no_tech') {
    tools.build = [
      { name: 'Bubble', use: 'Build a full web app without code.', link: 'bubble.io', free: true },
      { name: 'Glide', use: 'Build a mobile app from a Google Sheet in minutes.', link: 'glideapps.com', free: true },
      { name: 'Typeform', use: 'Create forms that feel like conversations.', link: 'typeform.com', free: true },
    ];
  } else {
    tools.build = [
      { name: 'Next.js', use: 'React framework for fast web apps.', link: 'nextjs.org', free: true },
      { name: 'Supabase', use: 'Database, auth and storage in minutes.', link: 'supabase.com', free: true },
      { name: 'Vercel', use: 'Deploy your app in seconds.', link: 'vercel.com', free: true },
    ];
  }

  tools.design = [
    { name: 'Figma', use: 'Design screens before building. Free for small projects.', link: 'figma.com', free: true },
    { name: 'Canva', use: 'Create pitch slides and graphics quickly.', link: 'canva.com', free: true },
  ];

  tools.demo = [
    { name: 'Loom', use: 'Record a backup demo video. Always have one in case live demo fails.', link: 'loom.com', free: true },
  ];

  if (theme === 'fintech') {
    tools.themeSpecific = [
      { name: 'Paystack', use: 'Accept payments in Nigeria. Integrate in minutes.', link: 'paystack.com', free: true },
      { name: 'Flutterwave', use: 'Pan-African payment processing.', link: 'flutterwave.com', free: true },
    ];
  } else if (theme === 'health' || theme === 'agriculture') {
    tools.themeSpecific = [
      { name: 'Twilio', use: 'Send SMS and WhatsApp messages programmatically.', link: 'twilio.com', free: true },
      { name: "Africa's Talking", use: 'USSD and SMS APIs that work on feature phones.', link: 'africastalking.com', free: true },
    ];
  } else if (theme === 'ai_ml') {
    tools.themeSpecific = [
      { name: 'Gemini API', use: 'Free Google AI API. Good for text and analysis features.', link: 'aistudio.google.com', free: true },
      { name: 'Hugging Face', use: 'Free open source AI models.', link: 'huggingface.co', free: true },
    ];
  }

  return tools;
}

function formatTools(toolsObj) {
  const labelMap = { build: 'Build Tools', design: 'Design Tools', demo: 'Demo Tools', themeSpecific: 'Recommended for Your Theme', payments: 'Payment Tools', analytics: 'Analytics Tools', customer: 'Customer Tools', operations: 'Operations Tools' };
  return Object.entries(toolsObj).filter(([, items]) => items && items.length > 0).map(([key, items]) => ({ category: labelMap[key] || key, items }));
}

function hackathonProofs(theme) {
  const all = {
    ai_ml: [
      { name: 'Hugging Face', result: 'Now valued at 4.5 billion dollars', stage: 'success', lesson: 'Started as a small AI chatbot built over a weekend. Built one thing that worked well.' },
    ],
    fintech: [
      { name: 'Paystack', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one problem for one group. Started focused and expanded only after dominating that niche.' },
    ],
    health: [
      { name: 'mPharma', result: 'Operating in 8 African countries', stage: 'success', lesson: 'Started with one pharmacy in Ghana. Solved one problem completely before expanding.' },
    ],
    default: [
      { name: 'GroupMe', result: 'Sold to Skype for 85 million dollars', stage: 'success', lesson: 'Built at a hackathon in 36 hours. Did one thing: group SMS. Nothing else.' },
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
    score += 25;
    if (len(a.startup_q1) > 150) {
      insights.push({ type: 'strength', text: 'Detailed problem statement. This depth will make your pitch and product decisions sharper.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have described the problem. Can you quantify the cost to the customer? A number makes the pain concrete and the opportunity clear.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Problem statement is too vague.', response: 'Rewrite it with a specific person, their exact situation, and what it costs them every month.' });
    nextSteps.push('Rewrite your problem statement with a specific person, a specific situation, and a measurable cost.');
  }

  // Customer conversations
  if (has(a.startup_q2)) {
    score += 25;
    if (contains(a.startup_q2, 'no', 'not yet', 'have not', 'plan to', 'will do', 'going to', 'haven')) {
      score -= 15;
      challenges.push({ level: 'high', text: 'You have not spoken to any potential customers yet.', response: 'This is the single most important thing to do before building anything. Talk to 5 real people who have this problem this week. Ask how they currently solve it. Listen more than you talk.' });
      nextSteps.push('Talk to 5 potential customers this week before building anything.');
    } else {
      insights.push({ type: 'strength', text: 'You have had real conversations with potential customers. Every product decision you make should be traceable back to something you heard in those conversations.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No customer research mentioned.', response: 'You cannot build a product people will pay for without understanding how they currently live without it. Talk to 5 real people before writing any code.' });
    nextSteps.push('Have 5 real customer conversations before your next build sprint.');
  }

  // Solution and revenue
  if (has(a.startup_q3)) {
    score += 25;
    if (contains(a.startup_q3, 'not sure', 'figure out later', 'ads', 'advertising', 'free')) {
      score -= 10;
      challenges.push({ level: 'high', text: 'Revenue model is unclear.', response: 'Ask 5 potential customers what they currently pay to solve this problem. That conversation will give you your pricing anchor.' });
      nextSteps.push('Ask 5 potential customers what they currently pay to solve this problem.');
    } else if (contains(a.startup_q3, 'naira', 'dollar', 'per month', 'subscription', 'fee', 'commission', 'percent', '%')) {
      insights.push({ type: 'strength', text: 'You have a specific revenue model with real numbers. Now validate those numbers by asking your first 5 potential customers to actually pay.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have a revenue direction. Make it more specific. Name the exact price and why a customer would pay that amount based on the value you create for them.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No solution or revenue model defined.', response: 'Describe what you are building and how you will charge for it. Ask 5 customers what they would pay before you build anything.' });
    nextSteps.push('Define what you are building and how you will make money from it.');
  }

  // Team
  if (a.startup_team) {
    if (a.startup_team === 'team_balanced') {
      score += 15;
      insights.push({ type: 'strength', text: 'Balanced team covering technology and business. Assign clear ownership so nobody is doing the same thing.' });
    } else if (a.startup_team === 'solo_tech') {
      score += 8;
      insights.push({ type: 'neutral', text: 'Solo technical founder. You can move fast but you will eventually need someone to own sales and customer relationships.' });
    } else if (a.startup_team === 'solo_notech') {
      score += 5;
      challenges.push({ level: 'high', text: 'Non-technical solo founder building a software product.', response: 'You need a technical co-founder or a no-code approach. Use Bubble or Glide to build an MVP. Find a technical co-founder before you need to scale.' });
    } else if (a.startup_team === 'team_all_tech') {
      score += 8;
      challenges.push({ level: 'medium', text: 'Technical team without clear business ownership.', response: 'Assign one person to own talking to customers every day. Technical products without commercial ownership rarely find product-market fit.' });
    } else {
      score += 5;
      challenges.push({ level: 'high', text: 'No technical capability on the team.', response: 'Use no-code tools for your MVP or find a technical co-founder. Agencies and freelancers can get you started but create long-term dependency.' });
    }
  }

  // Failure mode
  if (has(a.startup_q4)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have named your biggest risk. Now design a test for it. What is the cheapest fastest way to find out if this assumption is true before investing more time building on it?' });
    nextSteps.push('Test your biggest assumption within 2 weeks. Design the cheapest experiment that gives you a clear answer.');
  } else {
    challenges.push({ level: 'high', text: 'Biggest risk not identified.', response: 'Every startup has one assumption holding everything together. Name the one thing you are counting on being true that you have not yet confirmed.' });
  }

  score = Math.min(Math.max(score, 0), 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : ['Talk to 5 potential customers this week.', 'Define your revenue model with a specific price and who pays it.', 'Test your biggest assumption within 2 weeks.'],
    roadmap: buildRoadmap(a),
    tools: formatTools(getStartupTools(a)),
    methodology: recommendMethodology(a),
    proofPoints: startupProofs(),
  };
}

function buildRoadmap(a) {
  return [
    { phase: 'Phase 1', duration: 'Week 1 to 2', title: 'Validate before building', color: '#2563EB', tasks: ['Talk to 10 potential customers. Listen. Do not pitch.', 'Ask how they currently solve this and what they would pay for something better.', 'Document what surprised you. What did you assume that was wrong?', 'Decide: does the evidence support moving forward?'] },
    { phase: 'Phase 2', duration: 'Week 3 to 6', title: 'Build the minimum viable product', color: '#7C3AED', tasks: ['Build only the single most important feature. Resist adding more.', 'Use existing services for everything that is not your core value.', 'Get 3 target users to test while you watch. Fix the top issues.', 'Charge from the first user. Even a small amount proves real demand.'] },
    { phase: 'Phase 3', duration: 'Week 7 to 10', title: 'First paying customers', color: '#15803D', tasks: ['Launch to 10 to 20 handpicked first customers from your personal network.', 'Track your one key metric every week.', 'Get your first testimonial from a real user.', 'Fix the top issue your first customers complain about.'] },
    { phase: 'Phase 4', duration: 'Week 11 to 13', title: 'Iterate and decide', color: '#D97706', tasks: ['Expand to 50 to 100 users through your chosen channel.', 'Add only the most requested feature, not the most interesting one.', 'Review your unit economics. Are you making or losing money per customer?', 'Decide based on data: double down, adjust, or change direction.'] },
  ];
}

function recommendMethodology(a) {
  return {
    name: 'Agile with weekly check-ins',
    color: '#2563EB',
    why: 'Your requirements are still evolving. Build a small piece, get user feedback, adjust, and repeat. Do not plan more than 2 weeks ahead.',
    howTo: 'Every week: pick the most important thing to build. Build it. Show it to a real user. Learn. Adjust next week based on what you learned.',
    tools: ['Trello', 'Notion', 'WhatsApp for team communication', 'Google Sheets for tracking'],
  };
}

function getStartupTools(a) {
  const team = a.startup_team;
  const tools = { build: [], payments: [], analytics: [], customer: [] };

  if (team === 'solo_notech' || team === 'team_no_tech') {
    tools.build = [
      { name: 'Bubble', use: 'Build a full web app without code. Used by many Nigerian startups for MVPs.', link: 'bubble.io', free: true },
      { name: 'Glide', use: 'Build a mobile app from a Google Sheet. Fastest path to a working mobile product.', link: 'glideapps.com', free: true },
    ];
  } else {
    tools.build = [
      { name: 'Next.js and Supabase', use: 'Fastest way to build a web app with auth, database and storage included.', link: 'supabase.com', free: true },
      { name: 'Flutter', use: 'Build iOS and Android from one codebase.', link: 'flutter.dev', free: true },
      { name: 'Vercel', use: 'Deploy web apps in seconds. Free tier is enough for most early startups.', link: 'vercel.com', free: true },
    ];
  }

  tools.payments = [
    { name: 'Paystack', use: 'Accept card payments and bank transfers in Nigeria. 1.5 percent transaction fee.', link: 'paystack.com', free: true },
    { name: 'Flutterwave', use: 'Accept payments across Africa. Good for multi-country products.', link: 'flutterwave.com', free: true },
  ];

  tools.analytics = [
    { name: 'Google Analytics', use: 'Track who visits and what they do. Free for most startups.', link: 'analytics.google.com', free: true },
    { name: 'Hotjar', use: 'See recordings of real users. Reveals where people get confused without asking.', link: 'hotjar.com', free: true },
  ];

  tools.customer = [
    { name: 'WhatsApp Business', use: 'Free customer support channel. Most Nigerian customers prefer WhatsApp over email.', link: 'business.whatsapp.com', free: true },
    { name: 'Typeform', use: 'Collect feedback with forms that feel like conversations.', link: 'typeform.com', free: true },
  ];

  return tools;
}

function startupProofs() {
  return [
    { name: 'Paystack', country: 'Nigeria', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one precise problem for one specific group. Started focused and only expanded after dominating that niche.' },
    { name: 'Piggyvest', country: 'Nigeria', result: '4 million users, profitable without VC until Series A', stage: 'success', lesson: 'Started as a WhatsApp savings group before any technology was built. Proved the behaviour existed before automating it.' },
    { name: 'Flutterwave', country: 'Nigeria', result: '3 billion dollar valuation', stage: 'success', lesson: 'Founded by people who had worked inside the banks they were disrupting. Insider knowledge was the unfair advantage.' },
    { name: 'Gokada', country: 'Nigeria', result: 'Forced to pivot after Lagos bike ban', stage: 'struggle', lesson: 'Great product but regulatory risk was not managed. A single government decision changed the business overnight. Always know your regulatory exposure.' },
  ];
}
