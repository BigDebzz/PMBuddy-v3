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

  if (a.hack_theme) { score += 5; }

  if (has(a.hack_q1)) {
    score += 20;
    if (contains(a.hack_q1, 'app', 'platform', 'system', 'solution', 'build', 'create')) {
      challenges.push({ level: 'high', text: 'Your problem statement describes a solution, not a problem.', response: 'Remove any mention of what you are building. Describe only the pain. Who feels it? When does it happen? What does it cost them?' });
      score -= 8;
    } else if (len(a.hack_q1) > 150) {
      insights.push({ type: 'strength', text: 'Strong problem statement. You understand the pain clearly. Use this exact language in your pitch.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have identified the problem. Push for more specificity. Name a number. How much does this cost the person? How often does it happen?' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Your problem statement is too vague or missing.', response: 'This is the foundation of everything. Rewrite it: name one specific person, their exact situation, and what it costs them. One clear paragraph.' });
  }

  if (has(a.hack_q2)) {
    score += 15;
    insights.push({ type: 'strength', text: 'You have a real person in mind. Use this exact story to open your pitch. Specific examples are 10 times more compelling than general statements.' });
  } else {
    challenges.push({ level: 'high', text: 'You have not described a real person with this problem.', response: 'Before you build anything, find one real human being who has this problem. Talk to them or recall a specific moment you witnessed this problem. That story is your pitch opener.' });
  }

  if (has(a.hack_q3)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You understand why this problem matters now. Make sure this urgency comes through in your pitch. Judges fund problems that cannot wait.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not explained why this problem matters right now.', response: 'What changed recently that makes this solvable or more urgent? New technology? New behaviour? New regulation? Timing matters to investors and judges.' });
  }

  if (has(a.hack_q4)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You understand the current workaround. This tells you where the bar is set. Your solution needs to be significantly better than this, not just slightly different.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not researched how people currently deal with this problem.', response: 'Talk to 3 people with this problem today. Ask them what they currently do. Their answer tells you exactly what you are competing against.' });
  }

  if (has(a.hack_q5)) {
    score += 10;
    if (contains(a.hack_q5, 'better design', 'cheaper', 'easier to use', 'more features')) {
      challenges.push({ level: 'medium', text: 'Your differentiation is surface level.', response: 'Better design and lower price are not structural advantages. Ask yourself: what does your approach do that the current workaround literally cannot do? That is your real differentiation.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural difference. Make sure you can explain this in one sentence during your pitch.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not explained what makes your approach different.', response: 'Without clear differentiation, judges will ask why this is better than what already exists. Answer this now: what can your solution do that the current workaround literally cannot?' });
  }

  if (has(a.hack_q6)) {
    score += 10;
    if (contains(a.hack_q6, 'yes', 'automatic', 'scales', 'no extra effort', 'software')) {
      insights.push({ type: 'strength', text: 'Your solution has scalability potential. Make sure you can explain this simply: the system runs automatically, adding users does not add proportional work.' });
    } else {
      insights.push({ type: 'neutral', text: 'Think through your scalability story. Can this serve 1,000 users the same way it serves 10? What would break first and what is your plan for it?' });
    }
  } else {
    challenges.push({ level: 'medium', text: 'You have not thought through whether this can grow beyond initial users.', response: 'Judges always ask: can this scale? Prepare your answer. Describe what happens when 10 times more people use this. What stays the same and what needs to change?' });
  }

  if (has(a.hack_q7)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have mapped the user journey. Now stress test it: is there any step where a first time user might get confused or give up? That is where you focus your remaining build time.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not mapped how a user actually gets to value.', response: 'Walk through every step: how they find out, how they start, and what they do to get the result. The weakest step in that journey is where you lose users.' });
    nextSteps.push('Map your complete user journey before the demo. Find the step most likely to confuse a first time user and fix it.');
  }

  if (has(a.hack_q8)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have a clear success metric. Put this number on your final slide. It shows judges you are thinking beyond the demo.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not defined how you will know if this works.', response: 'Pick one number. Not downloads or signups. A behaviour that proves real value. For example: users returning after the first session, or completing a core action without help.' });
    nextSteps.push('Define your one success metric before the demo. Put it on your closing slide.');
  }

  const teamAdvice = getHackathonTeamAdvice(a.hack_team);
  const timelineAdvice = getHackathonTimelineAdvice(a.hack_timeline);
  const toolSuggestions = getHackathonTools(a.hack_team, a.hack_theme);

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : getDefaultHackNextSteps(a),
    teamAdvice,
    timelineAdvice,
    toolSuggestions,
    pitchStructure: getPitchStructure(a),
    proofPoints: hackathonProofs(a.hack_theme),
  };
}

function getHackathonTeamAdvice(team) {
  const advice = {
    solo_tech: { title: 'Solo Technical Builder', summary: 'You can build fast but watch for blind spots. Use your extra time to validate the problem with at least 3 real people before the demo.', tips: ['Use no-code tools for anything non-core to save time', 'Record a demo video backup in case live demo fails', 'Prepare a simple one-page explainer in case you cannot be present to pitch'] },
    solo_notech: { title: 'Solo Non-Technical Builder', summary: 'You need to build without writing code. Focus entirely on no-code tools and validate the idea before investing time in any build.', tips: ['Use Bubble, Glide, or Typeform to build your MVP without code', 'A working no-code prototype beats a broken coded one', 'Focus your energy on the pitch and problem validation, not the build'] },
    team_balanced: { title: 'Balanced Team', summary: 'You have the strongest setup for a hackathon. Divide responsibilities clearly: one person owns the build, one owns the pitch, one owns user testing.', tips: ['Assign one person to be the demo owner. They practice it until it is perfect.', 'Have someone outside the build team test the product before the demo', 'Make sure your non-technical members are handling the pitch and slides'] },
    team_all_tech: { title: 'All Technical Team', summary: 'You can build anything but make sure someone owns the pitch and the business narrative. A brilliant product with a weak pitch loses to a mediocre product with a compelling story.', tips: ['Assign one technical person to switch roles and own the pitch entirely', 'Make sure your solution is explained in plain language, not technical terms', 'Practice explaining the user value to someone with no technical background'] },
    team_no_tech: { title: 'Limited Technical Team', summary: 'Use no-code tools and focus on the problem validation and pitch. A well researched problem with a no-code prototype can win over a poorly defined problem with custom code.', tips: ['Bubble, Glide, Webflow, or Typeform can get you a working demo fast', 'Focus 70 percent of your time on the pitch and problem clarity', 'A compelling problem with a simple demo beats a complex product nobody understands'] },
  };
  return advice[team] || advice['team_balanced'];
}

function getHackathonTimelineAdvice(timeline) {
  const plans = {
    '24h': {
      title: 'Under 24 Hours',
      warning: 'You have very limited time. Build only the single most essential interaction. Nothing else.',
      breakdown: [
        { phase: 'Hours 1 to 3', tasks: ['Define the one interaction your demo must show', 'Assign roles immediately: builder, pitcher, designer', 'Set up your tools and environment'] },
        { phase: 'Hours 4 to 16', tasks: ['Build only the core interaction. Cut everything else.', 'Use no-code tools if possible to move faster', 'Do not add features. Make the one thing work perfectly.'] },
        { phase: 'Hours 17 to 21', tasks: ['Test with one person outside your team', 'Fix the top two issues only', 'Record a backup video demo'] },
        { phase: 'Hours 22 to 24', tasks: ['Finalise your 3 minute pitch', 'Prepare 3 slides maximum: Problem, Solution, Impact', 'Practice the demo twice out loud'] },
      ],
    },
    '48h': {
      title: '48 Hours',
      warning: 'Scope your MVP aggressively. A working demo of one feature beats a broken prototype of ten.',
      breakdown: [
        { phase: 'Hours 1 to 4', tasks: ['Define the problem and MVP scope in writing', 'Set up tools and environment', 'Assign clear roles with no overlap'] },
        { phase: 'Hours 5 to 28', tasks: ['Build the single most important feature first', 'Use existing APIs and services. Do not reinvent anything.', 'Test with a real user at the halfway point'] },
        { phase: 'Hours 29 to 42', tasks: ['Add the second feature only if the first is working perfectly', 'Basic interface that looks intentional', 'Fix top issues from user testing'] },
        { phase: 'Hours 43 to 48', tasks: ['Finalise pitch: Problem, Demo, Impact, Team, Ask', 'Practice demo 3 times with a real audience', 'Submit before deadline with buffer time'] },
      ],
    },
    '72h': {
      title: '72 Hours',
      warning: 'You have enough time to build something real. Use day 1 entirely for validation before building anything.',
      breakdown: [
        { phase: 'Day 1', tasks: ['Validate the problem with 5 real people before writing code', 'Define MVP scope and assign responsibilities', 'Set up all tools and infrastructure'] },
        { phase: 'Day 2', tasks: ['Build the core feature end to end', 'Test with 3 real users and document findings', 'Fix the top issues before adding anything new'] },
        { phase: 'Day 3', tasks: ['Polish and stress test the core interaction', 'Build pitch deck and practice 3 times', 'Record demo backup and submit on time'] },
      ],
    },
    'week': {
      title: '1 Week',
      warning: 'You have time to do this properly. Spend the first 2 days entirely on problem validation before touching any build tools.',
      breakdown: [
        { phase: 'Days 1 to 2', tasks: ['Talk to 10 real people with the problem', 'Define MVP scope based on what you learn', 'Set up tools and assign team responsibilities'] },
        { phase: 'Days 3 to 5', tasks: ['Build the core feature only', 'Test with real users daily', 'Iterate based on direct feedback'] },
        { phase: 'Days 6 to 7', tasks: ['Final testing and polish', 'Build pitch and practice with a real audience', 'Submit and share with target users immediately'] },
      ],
    },
  };
  return plans[timeline] || plans['48h'];
}

function getHackathonTools(team, theme) {
  const noCodeTools = [
    { name: 'Bubble', use: 'Build full web applications without writing code', link: 'bubble.io', free: true },
    { name: 'Glide', use: 'Build mobile apps from a spreadsheet in minutes', link: 'glideapps.com', free: true },
    { name: 'Typeform', use: 'Beautiful forms and surveys for user research and onboarding', link: 'typeform.com', free: true },
    { name: 'Tally', use: 'Simple free forms, great for Nigerian builders', link: 'tally.so', free: true },
    { name: 'Webflow', use: 'Professional websites and landing pages without code', link: 'webflow.com', free: true },
  ];

  const techTools = [
    { name: 'Supabase', use: 'Free database and authentication for your app', link: 'supabase.com', free: true },
    { name: 'Firebase', use: 'Real time database and user authentication', link: 'firebase.google.com', free: true },
    { name: 'Vercel', use: 'Deploy your web app for free in minutes', link: 'vercel.com', free: true },
    { name: 'Render', use: 'Free hosting for backends and APIs', link: 'render.com', free: true },
  ];

  const paymentTools = [
    { name: 'Paystack', use: 'Accept payments in Nigeria. Free to set up.', link: 'paystack.com', free: true },
    { name: 'Flutterwave', use: 'Accept payments across Africa and globally', link: 'flutterwave.com', free: true },
  ];

  const communicationTools = [
    { name: 'Twilio', use: 'Send SMS and WhatsApp messages programmatically', link: 'twilio.com', free: false },
    { name: 'Africa\'s Talking', use: 'SMS and USSD APIs built for African markets', link: 'africastalking.com', free: true },
  ];

  const aiTools = [
    { name: 'OpenAI API', use: 'Add AI capabilities to your product', link: 'platform.openai.com', free: false },
    { name: 'Hugging Face', use: 'Free open source AI models', link: 'huggingface.co', free: true },
    { name: 'Claude API', use: 'Powerful AI for text analysis and generation', link: 'anthropic.com', free: false },
  ];

  const isNoCode = team === 'solo_notech' || team === 'team_no_tech';
  const isAI = theme === 'ai_ml';
  const isFintech = theme === 'fintech';
  const isComms = theme === 'agriculture' || theme === 'health' || theme === 'civic';

  return {
    primary: isNoCode ? noCodeTools : techTools,
    payments: isFintech ? paymentTools : [],
    communication: isComms ? communicationTools : [],
    ai: isAI ? aiTools : [],
    noCode: isNoCode ? [] : noCodeTools,
  };
}

function getPitchStructure(a) {
  return [
    {
      slide: 'Slide 1: The Problem',
      duration: '30 seconds',
      content: has(a.hack_q1) ? a.hack_q1.slice(0, 120) + '...' : 'Describe the exact problem in one sentence. Name the person and the cost.',
      tip: 'Open with the person, not the technology. Make the judge feel the pain before you show anything.',
    },
    {
      slide: 'Slide 2: Real Example',
      duration: '20 seconds',
      content: has(a.hack_q2) ? a.hack_q2.slice(0, 120) + '...' : 'Give one specific real world example of this problem happening.',
      tip: 'One real story is worth more than ten statistics. Use the exact example you described.',
    },
    {
      slide: 'Slide 3: Live Demo',
      duration: '60 seconds',
      content: 'Show your solution working in real time. Do not explain. Demonstrate.',
      tip: 'Get to the value moment in under 30 seconds. Everything else is supporting detail.',
    },
    {
      slide: 'Slide 4: Impact',
      duration: '20 seconds',
      content: has(a.hack_q8) ? a.hack_q8.slice(0, 120) + '...' : 'Show the measurable change your solution creates for real users.',
      tip: 'Use a specific number. Not we help farmers. We help farmers earn 30 percent more per harvest.',
    },
    {
      slide: 'Slide 5: The Ask',
      duration: '10 seconds',
      content: 'Tell judges what winning means to you and exactly what you will do next.',
      tip: 'Be specific. Not we want to help people. We want to launch in Kano State and reach 1,000 farmers before the next harvest season.',
    },
  ];
}

function getDefaultHackNextSteps(a) {
  return [
    'Practice your demo until you can reach the value moment in under 45 seconds every single time.',
    'Test your product with one person outside your team and watch where they get confused.',
    'Record a backup video of your demo working before you present. Live demos fail.',
    'Write your pitch opening line now: one sentence naming the person, the problem, and the consequence.',
  ];
}

function hackathonProofs(theme) {
  const proofs = {
    ai_ml: [
      { name: 'Hugging Face', result: 'Now valued at 4.5 billion dollars', stage: 'success', lesson: 'Started as a small AI chatbot demo. Built one focused thing that worked. Everything else came after that foundation.' },
      { name: 'Jasper AI', result: 'Reached 1.5 billion dollar valuation', stage: 'success', lesson: 'Started with one use case: marketing copy. Did not try to do everything with AI at once.' },
    ],
    fintech: [
      { name: 'Paystack', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one problem for one group. Started focused and expanded only after dominating that niche completely.' },
      { name: 'Flutterwave', result: '3 billion dollar valuation', stage: 'success', lesson: 'Started with B2B payments and built deep relationships with banks before going consumer.' },
    ],
    health: [
      { name: 'Helium Health', result: 'Largest health tech company in Nigeria', stage: 'success', lesson: 'Started with hospital management software only. Did not try to solve all of healthcare at once.' },
      { name: 'mPharma', result: 'Operating across 8 African countries', stage: 'success', lesson: 'Started with one pharmacy in Ghana. Proved the model before expanding.' },
    ],
    agriculture: [
      { name: 'Twiga Foods', result: 'Series C funded, operating across Kenya', stage: 'success', lesson: 'Started with one supply chain problem in Nairobi. Did not try to fix all of agriculture at once.' },
      { name: 'Farmcrowdy', result: 'First agricultural crowdfunding platform in Nigeria', stage: 'success', lesson: 'Connected urban investors to rural farmers. Simple model. Real impact. Started in one state.' },
    ],
    education: [
      { name: 'uLesson', result: 'Raised over 20 million dollars', stage: 'success', lesson: 'Started with secondary school students in Nigeria only. Focused on one audience before expanding.' },
      { name: 'Andela', result: '1.5 billion dollar valuation', stage: 'success', lesson: 'Founders had lived the problem. African developers were being overlooked globally. Personal connection to the mission drove them through the hard years.' },
    ],
    default: [
      { name: 'GroupMe', result: 'Sold to Skype for 85 million dollars', stage: 'success', lesson: 'Built at TechCrunch Hackathon in 36 hours. Did one thing: group SMS. Nothing else. Won because the problem was real and the demo proved it.' },
      { name: 'Carrd', result: 'Bootstrapped to over 1 million dollars in annual revenue', stage: 'success', lesson: 'Started as a weekend project. One simple thing done extremely well. Still growing years later.' },
    ],
  };
  return proofs[theme] || proofs.default;
}

function analyzeStartup(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  if (has(a.startup_q1)) {
    score += 12;
    if (len(a.startup_q1) > 200) {
      insights.push({ type: 'strength', text: 'Detailed problem statement. You understand this problem deeply. The specificity here will make your pitch, your product, and your sales conversations sharper.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have described the problem. Push deeper. Can you quantify the cost to the customer every month? Numbers make the pain concrete and memorable.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Your problem statement is too vague.', response: 'Rewrite it with: one specific person, their exact situation, and what it costs them every month. One clear paragraph. This is the foundation everything else is built on.' });
    nextSteps.push('Rewrite your problem statement with a specific person, a specific situation, and a specific measurable cost per month.');
  }

  if (has(a.startup_q2)) {
    score += 10;
    if (contains(a.startup_q2, 'sme', 'everyone', 'anyone', 'all businesses', 'people who', 'nigerians', 'africans')) {
      challenges.push({ level: 'medium', text: 'Your target customer is still too broad.', response: 'Everyone and SMEs are categories, not customers. Name one specific type of person with specific characteristics: their job, their revenue range, their location, their behaviour. The more specific, the easier it is to find them and build for them.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a specific first customer. This focus will help you build the right product and find your first users faster than founders who target everyone.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not clearly defined who your first customer is.', response: 'Without a specific first customer, you cannot make product decisions, sales decisions, or know where to spend your time. Define one specific type of person before moving forward.' });
    nextSteps.push('Define your first customer in one paragraph. Name the specific type of person, their situation, their budget, and why they would talk to you.');
  }

  if (has(a.startup_q3)) {
    score += 15;
    if (contains(a.startup_q3, 'no', 'not yet', 'have not', 'haven\'t', 'plan to', 'will do', 'going to')) {
      challenges.push({ level: 'high', text: 'You have not spoken to any potential customers yet.', response: 'This is the single most important thing you need to do before building anything. Not a survey. A real conversation. Talk to 5 people with this problem this week. Ask how they currently solve it, not whether they would use your product.' });
      score -= 10;
      nextSteps.push('Talk to 5 potential customers this week before building anything. Ask: how do you currently deal with this problem?');
    } else {
      insights.push({ type: 'strength', text: 'You have had real conversations with potential customers. This is one of the most valuable things a founder can do at this stage. Keep doing it every week.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No customer conversations mentioned.', response: 'You cannot build something people will pay for without understanding how they currently live without it. Talk to 5 real people with this problem before your next build sprint.' });
    nextSteps.push('Have 5 real customer conversations before you build anything. Listen more than you talk.');
  }

  if (has(a.startup_q4)) {
    score += 8;
    insights.push({ type: 'strength', text: 'You have identified a switching trigger. That clarity will make your sales conversations and your onboarding flow much more effective.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not clearly explained why someone would switch to your product.', response: 'Switching has a real cost. People are used to their current solution even if it is imperfect. Name the specific moment or frustration that pushes someone to change. That moment is the heart of your sales pitch.' });
  }

  if (has(a.startup_q5)) {
    score += 10;
    if (contains(a.startup_q5, 'social media', 'instagram', 'twitter', 'tiktok', 'ads', 'paid', 'google ads', 'facebook ads')) {
      challenges.push({ level: 'high', text: 'Your plan to reach first users relies on channels that rarely work at early stage.', response: 'Paid ads and social media almost never produce the first 10 paying customers. Your first 10 users will come from personal relationships and direct outreach. Who do you know personally who has this problem? Start there.' });
      score -= 5;
    } else {
      insights.push({ type: 'strength', text: 'Your plan to reach first users is grounded and realistic. Stay focused on this channel until it stops working before trying anything else.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have no clear plan for reaching your first 10 users.', response: 'Your first 10 users will not find you. You need to find them. List 10 people you know personally who have this problem. Contact each one this week.' });
    nextSteps.push('List 10 people you know personally who have this problem. Contact each one directly this week.');
  }

  if (has(a.startup_q6)) {
    score += 10;
    if (contains(a.startup_q6, 'design', 'ui', 'ux', 'interface', 'look', 'beautiful', 'easy to use', 'user friendly')) {
      challenges.push({ level: 'high', text: 'Your competitive advantage is design or user experience. That is not a sustainable moat.', response: 'Any competitor can hire a designer and copy your interface in 2 weeks. What do you have that takes years to build? Think relationships, data, distribution, domain expertise, or network effects. What is your structural advantage?' });
      score -= 5;
    } else if (contains(a.startup_q6, 'cheaper', 'price', 'affordable', 'low cost', 'free')) {
      challenges.push({ level: 'high', text: 'Your competitive advantage is price. That is not a sustainable moat.', response: 'A well funded competitor can always undercut your price. Price competition destroys margins and attracts customers who will leave the moment something cheaper appears. What advantage do you have that cannot be bought?' });
      score -= 5;
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural competitive advantage. Make sure you can explain it in one sentence and that it genuinely gets harder to copy over time.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not identified a real competitive advantage.', response: 'Without a clear answer here, you are building something anyone with more money can replicate. What do you know, who do you know, or what can you access that a competitor cannot easily get?' });
  }

  if (has(a.startup_q7)) {
    score += 10;
    if (contains(a.startup_q7, 'not sure', 'unsure', 'figure out', 'later', 'tbd', 'to be determined')) {
      challenges.push({ level: 'high', text: 'Your revenue model is unclear.', response: 'Not knowing how you make money at this stage is a serious risk. Talk to 5 potential customers this week and ask: what do you currently pay to solve this problem? That conversation will give you your pricing anchor.' });
      score -= 8;
    } else if (contains(a.startup_q7, 'ads', 'advertising', 'ad revenue')) {
      challenges.push({ level: 'high', text: 'Your revenue model relies on advertising.', response: 'Ad models require millions of users to generate meaningful revenue. For a startup at this stage, advertising is almost never viable as a primary model. Who has a direct reason to pay you and what would they pay?' });
      score -= 8;
    } else if (contains(a.startup_q7, 'naira', 'dollar', 'per month', 'subscription', 'fee', 'commission', '%', 'percent')) {
      insights.push({ type: 'strength', text: 'You have a specific revenue model with real numbers. This specificity separates serious founders from people with ideas. Make sure those numbers come from actual customer conversations.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have a revenue direction. Now make it specific. Name the exact price, name who pays it, and explain why they would pay that amount based on the value you create.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not defined how you will make money.', response: 'This is a fundamental gap. Without a revenue model, you are building a project not a business. Ask 5 potential customers this week: what do you currently pay to solve this problem?' });
    nextSteps.push('Define your revenue model this week. Ask 5 potential customers what they currently pay to solve this problem. Use that as your pricing anchor.');
  }

  if (has(a.startup_team)) {
    score += 5;
  }

  if (has(a.startup_timeline)) {
    score += 5;
  }

  if (has(a.startup_q8)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have named your biggest assumption. Now design a test for it. What is the cheapest and fastest way to confirm whether this assumption is true before you invest more time building on it?' });
    nextSteps.push('Design a 2 week experiment to test your biggest assumption. Define what a pass looks like before you start.');
  } else {
    challenges.push({ level: 'high', text: 'You have not identified your biggest unvalidated assumption.', response: 'Every startup is built on assumptions. The ones that go unexamined cause failure. What is the one thing you are counting on being true that you have not yet confirmed?' });
  }

  if (has(a.startup_q9)) {
    score += 8;
    if (contains(a.startup_q9, 'yes', 'still need', 'persistent', 'structural', 'always', 'will always')) {
      insights.push({ type: 'strength', text: 'The problem you are solving is persistent and structural. That means you are building on a durable foundation. Persistent problems support durable businesses.' });
    } else {
      challenges.push({ level: 'medium', text: 'You are uncertain whether this problem will persist.', response: 'If the problem could change significantly in 6 months, you need to build very fast or reconsider the timing. What makes this problem structural enough to support a long term business?' });
    }
  }

  if (has(a.startup_q10)) {
    score += 7;
    insights.push({ type: 'strength', text: 'You have named your most likely failure mode. That self awareness is more valuable than most founder skills. Now define the early warning signal. What metric tells you this failure is beginning before it becomes irreversible?' });
    nextSteps.push('Define the early warning signal for your failure mode. What number or behaviour tells you things are going wrong before it is too late to change course?');
  } else {
    challenges.push({ level: 'medium', text: 'You have not identified why this startup might fail.', response: 'Founders who cannot name their failure mode are most likely to be surprised by it. What is the specific scenario where this does not work?' });
  }

  const teamAdvice = getStartupTeamAdvice(a.startup_team);
  const timelineAdvice = getStartupTimelineAdvice(a.startup_timeline);
  const toolSuggestions = getStartupTools(a.startup_team);

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : getDefaultStartupNextSteps(),
    teamAdvice,
    timelineAdvice,
    toolSuggestions,
    roadmap: buildRoadmap(),
    proofPoints: startupProofs(),
  };
}

function getStartupTeamAdvice(team) {
  const advice = {
    solo_tech: { title: 'Solo Technical Founder', summary: 'You can build fast but you are a single point of failure. Your biggest risks are burnout, blind spots, and lack of a thought partner. Address these deliberately.', tips: ['Find a weekly accountability partner even outside your field', 'Talk to at least one potential customer every single week without exception', 'Use advisors or mentors to challenge your assumptions regularly'] },
    solo_notech: { title: 'Solo Non-Technical Founder', summary: 'Your biggest immediate challenge is the build. Focus on no-code tools and validate the idea manually before spending money on development.', tips: ['Use Bubble, Glide, or Typeform to build your first version without a developer', 'Serve your first 10 customers manually before automating anything', 'When you do hire a developer, have a working no-code prototype ready to show them'] },
    team_balanced: { title: 'Balanced Founding Team', summary: 'You have the strongest possible setup. Your job now is to define clear ownership so nobody is waiting on anyone else.', tips: ['Define who owns product, who owns customers, and who owns revenue right now', 'Have a written agreement about roles and equity before things get complicated', 'Schedule a weekly team check-in and protect it from cancellation'] },
    team_all_tech: { title: 'Technical Team', summary: 'You can build anything but your biggest risk is building the wrong thing beautifully. Compensate by spending more time with customers than with code.', tips: ['Assign one team member to own customer conversations exclusively', 'Show your product to a real potential customer every single week', 'Hire or partner for sales and growth before you think you need it'] },
    team_no_tech: { title: 'Business Team Without Technical Skills', summary: 'You need a technical co-founder or a no-code build approach. Do not hire freelancers for your core product. Find someone who is in it for the long term.', tips: ['Use Bubble or Glide for your MVP before hiring any developer', 'When looking for a technical co-founder, look for someone who has the problem you are solving', 'Validate the business model first. Technical build comes after proof of demand.'] },
  };
  return advice[team] || advice['team_balanced'];
}

function getStartupTimelineAdvice(timeline) {
  const plans = {
    '2weeks': { title: 'Under 2 Weeks', advice: 'This is extremely aggressive. Your only option is a manual or no-code MVP. Do not write any custom code. Use existing tools to demonstrate the concept and get real user feedback.', focus: 'Use Typeform or Tally for data collection, WhatsApp for communication, and Google Sheets for tracking. Serve your first users entirely manually.' },
    '1month': { title: '2 to 4 Weeks', advice: 'Tight but achievable if you scope aggressively. Build only the single most essential feature. Everything else comes after you have real user feedback.', focus: 'Use Bubble or Glide for the core interface. Paystack for payments. Supabase for your database. Do not build authentication from scratch.' },
    '3months': { title: '1 to 3 Months', advice: 'A reasonable timeline for a focused MVP. Use the first 2 weeks entirely for customer conversations before touching any build tools.', focus: 'Spend week 1 and 2 on customer conversations only. Week 3 onward: build the MVP based on what you learned. Test with real users by week 8.' },
    '6months': { title: '3 to 6 Months', advice: 'This timeline carries risk. The longer you go without real user feedback, the more likely you are building the wrong thing. Build in feedback checkpoints every 4 weeks.', focus: 'Define a milestone for every 4 weeks. Each milestone must end with real user testing. If you reach month 4 without a paying customer, reassess your scope.' },
    'longer': { title: 'More Than 6 Months', advice: 'Consider whether this timeline can be shortened significantly. Most successful startups had something in users hands within 3 months. A longer timeline usually means the scope is too large.', focus: 'Break this into phases. Phase 1 should be no more than 3 months and produce something a real user can try. Everything after that depends on what you learn.' },
  };
  return plans[timeline] || plans['3months'];
}

function getStartupTools(team) {
  const isNoCode = team === 'solo_notech' || team === 'team_no_tech';
  return {
    build: isNoCode
      ? [
          { name: 'Bubble', use: 'Build full web applications without writing code', link: 'bubble.io', free: true },
          { name: 'Glide', use: 'Build mobile apps from a spreadsheet in minutes', link: 'glideapps.com', free: true },
          { name: 'Webflow', use: 'Professional websites and landing pages', link: 'webflow.com', free: true },
          { name: 'Softr', use: 'Build client portals and internal tools from Airtable', link: 'softr.io', free: true },
        ]
      : [
          { name: 'Supabase', use: 'Free database, authentication, and storage', link: 'supabase.com', free: true },
          { name: 'Vercel', use: 'Deploy your web app for free in minutes', link: 'vercel.com', free: true },
          { name: 'Firebase', use: 'Real time database and user authentication', link: 'firebase.google.com', free: true },
          { name: 'Render', use: 'Free hosting for backends and APIs', link: 'render.com', free: true },
        ],
    payments: [
      { name: 'Paystack', use: 'Accept payments in Nigeria. Free to set up. 1.5 percent per transaction.', link: 'paystack.com', free: true },
      { name: 'Flutterwave', use: 'Accept payments across Africa and internationally', link: 'flutterwave.com', free: true },
    ],
    communication: [
      { name: 'Resend', use: 'Send transactional emails. Free up to 3,000 emails per month.', link: 'resend.com', free: true },
      { name: 'Africa\'s Talking', use: 'SMS and USSD APIs built for African markets', link: 'africastalking.com', free: true },
      { name: 'Twilio', use: 'WhatsApp and SMS messaging APIs', link: 'twilio.com', free: false },
    ],
    analytics: [
      { name: 'Google Analytics', use: 'Track website visitors and user behaviour for free', link: 'analytics.google.com', free: true },
      { name: 'Mixpanel', use: 'Track user actions inside your product', link: 'mixpanel.com', free: true },
      { name: 'Hotjar', use: 'See recordings of real users using your product', link: 'hotjar.com', free: true },
    ],
    productivity: [
      { name: 'Notion', use: 'Team documentation, project management, and knowledge base', link: 'notion.so', free: true },
      { name: 'Linear', use: 'Issue tracking and sprint planning for product teams', link: 'linear.app', free: true },
      { name: 'Canva', use: 'Design pitch decks, social posts, and marketing materials', link: 'canva.com', free: true },
    ],
  };
}

function buildRoadmap() {
  return [
    { week: 'Week 1 to 2', title: 'Validate before you build', color: '#2563EB', tasks: ['Talk to 10 potential customers. Listen. Do not pitch.', 'Ask how they currently solve this problem and what they would pay for something better', 'Document patterns and surprises. What did you assume that turned out to be wrong?', 'Decide based on evidence: does this problem deserve the solution you imagined?'] },
    { week: 'Week 3 to 6', title: 'Build the minimum viable product', color: '#7C3AED', tasks: ['Build only the single most important feature. Resist every temptation to add more.', 'Use existing services for everything non-core. Do not build from scratch what already exists.', 'Get 3 people from your target audience to test it while you watch without helping them.', 'Charge something from the first user. Even a small amount proves real demand exists.'] },
    { week: 'Week 7 to 10', title: 'Get to first paying customers', color: '#15803D', tasks: ['Launch to 10 to 20 handpicked first customers from your personal network.', 'Track your one key metric every week without exception.', 'Get your first testimonial or case study from a real satisfied user.', 'Fix the top issue your first customers complain about before adding anything new.'] },
    { week: 'Week 11 to 13', title: 'Iterate and decide', color: '#D97706', tasks: ['Expand to 50 to 100 users through your chosen channel.', 'Add only the most requested feature, not the most technically interesting one.', 'Review your unit economics. Are you making or losing money per customer right now?', 'Decide based on data alone: double down, adjust your approach, or change direction completely.'] },
  ];
}

function getDefaultStartupNextSteps() {
  return [
    'Talk to 5 potential customers this week before building anything at all.',
    'Define your revenue model with a specific price and a specific type of paying customer.',
    'Identify your biggest unvalidated assumption and design a 2 week test for it.',
    'Map how your first 10 users will realistically find and trust you.',
  ];
}

function startupProofs() {
  return [
    { name: 'Paystack', country: 'Nigeria', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one precise problem for one specific group. Started focused and expanded only after completely dominating that niche.' },
    { name: 'Piggyvest', country: 'Nigeria', result: '4 million users, profitable without VC until Series A', stage: 'success', lesson: 'Started with a WhatsApp savings group before building any technology. Proved the behaviour existed before automating it.' },
    { name: 'Andela', country: 'Africa', result: '1.5 billion dollar valuation', stage: 'success', lesson: 'Founders had lived the problem. African developers were being overlooked globally. That personal connection sustained them through the hardest years.' },
    { name: 'Gokada', country: 'Nigeria', result: 'Forced to pivot after Lagos bike ban', stage: 'struggle', lesson: 'Great product but regulatory risk was completely ignored. A single government decision changed everything overnight. Always map your regulatory exposure before scaling.' },
  ];
}
