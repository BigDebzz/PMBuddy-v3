// src/data/analysis.js
// This engine reads actual answers and responds directly to what the user said.

export function analyze(mode, answers) {
  return mode === 'hackathon'
    ? analyzeHackathon(answers)
    : analyzeStartup(answers);
}

// ─── HELPERS ─────────────────────────────────────────────────
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

// ─── HACKATHON ANALYSIS ───────────────────────────────────────
function analyzeHackathon(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  // Theme fit
  if (a.hack_theme) {
    score += 5;
  }

  // Problem specificity
  if (has(a.hack_q1)) {
    score += 15;
    if (len(a.hack_q1) > 150) {
      insights.push({ type: 'strength', text: 'Your problem statement is specific and detailed. That gives your whole project a clear direction.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a specific problem. Keep pushing for more specificity in your pitch.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Your problem statement is too vague.', response: 'You answered with very little detail. Judges need to feel the pain of the person experiencing this problem. Rewrite it: name one person, their exact situation, and what it costs them.' });
  }

  // Real example
  if (has(a.hack_q2)) {
    score += 15;
    insights.push({ type: 'strength', text: 'You have a real example of the problem. Use this exact story in your pitch. Specific examples are far more compelling than statistics.' });
  } else {
    challenges.push({ level: 'high', text: 'You have no real example of the problem happening.', response: 'This is a serious gap. If you cannot give one specific real example of this problem affecting a real person, you may not understand the problem well enough to build a solution. Go find that example before the demo.' });
  }

  // What was built
  if (has(a.hack_q3)) {
    score += 20;
    if (contains(a.hack_q3, 'mockup', 'prototype', 'design', 'figma', 'slide', 'wireframe')) {
      challenges.push({ level: 'high', text: 'What you described sounds like a mockup or design, not a working product.', response: 'Judges will test your product. A design is not enough. Even a rough working version is worth more than a polished mockup. What can you actually build in the time remaining?' });
    } else {
      insights.push({ type: 'strength', text: 'You have built something real. Focus your remaining time on making the core interaction work flawlessly, not on adding features.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not clearly described what you built.', response: 'Be specific. What exists right now that a person can interact with? If you cannot answer this clearly, your first priority is to build the core interaction before anything else.' });
  }

  // User can do
  if (has(a.hack_q4)) {
    score += 10;
    if (contains(a.hack_q4, 'can do', 'can use', 'works', 'right now')) {
      insights.push({ type: 'strength', text: 'You are clear about current capabilities. This honesty will serve you well in the demo.' });
    }
  } else {
    challenges.push({ level: 'medium', text: 'You have not defined what a user can actually do right now.', response: 'Before your demo, list the exact actions a user can take. If the list is short, that is fine. Knowing it clearly means you design your demo around what works, not what you wish worked.' });
  }

  // User journey
  if (has(a.hack_q5)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have mapped the user journey. Check each step: is there any point where a user might get confused or give up? That is where you focus next.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not mapped how a user would actually experience your product.', response: 'Walk through it right now. From how they discover you to how they get value. Every step. The weakest step is where you lose users.' });
    nextSteps.push('Map the complete user journey before your demo. Identify the step most likely to confuse a first time user and fix it.');
  }

  // Tradeoffs
  if (has(a.hack_q6)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have made deliberate tradeoff decisions. This is a sign of product thinking. Make sure you can explain your reasoning clearly in 30 seconds.' });
  } else {
    challenges.push({ level: 'medium', text: 'You have not identified what you deliberately chose not to build.', response: 'Every feature you did not build is a decision. If you cannot explain those decisions, it looks like you ran out of time rather than made strategic choices. Define your tradeoffs now.' });
  }

  // Incomplete parts
  if (has(a.hack_q7)) {
    score += 5;
    insights.push({ type: 'neutral', text: 'You know what is incomplete. Acknowledge these gaps briefly in your pitch and explain your plan to address them. Honesty about limitations builds trust.' });
  } else {
    challenges.push({ level: 'low', text: 'You have not identified what is incomplete or not working.', response: 'Every project has gaps. Finding them yourself before judges find them is always better. Spend 10 minutes stress testing your product right now.' });
  }

  // Demo value
  if (has(a.hack_q8)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You know what your one minute demo must prove. Build your entire demo around that single moment. Everything else is context.' });
    nextSteps.push('Practice your demo until you can get to the value moment in under 45 seconds every time.');
  } else {
    challenges.push({ level: 'high', text: 'You have not defined what value a judge should see in 1 minute.', response: 'This is the most important question for your demo. If you do not know what the key moment is, your demo will wander and judges will not remember it. Identify that moment right now.' });
    nextSteps.push('Identify the single interaction that proves your concept works. Build your demo to reach that moment in under 60 seconds.');
  }

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    insights,
    challenges,
    nextSteps: nextSteps.length > 0 ? nextSteps : defaultHackNextSteps(a),
    pitchFramework: buildPitchFramework(a),
    proofPoints: hackathonProofs(a.hack_theme),
  };
}

function defaultHackNextSteps(a) {
  return [
    'Practice your demo until you can reach the value moment in under 45 seconds.',
    'Test your product with one person outside your team and watch where they get confused.',
    'Prepare a 30 second backup explanation in case your live demo fails.',
    'Write your pitch opening line: one sentence that names the person, the problem, and the consequence.',
  ];
}

function buildPitchFramework(a) {
  const problem = a.hack_q1 ? a.hack_q1.slice(0, 100) + (a.hack_q1.length > 100 ? '...' : '') : 'Describe the exact problem and who experiences it.';
  const example = a.hack_q2 ? a.hack_q2.slice(0, 100) + (a.hack_q2.length > 100 ? '...' : '') : 'Give one real life example of this problem happening.';
  const built = a.hack_q3 ? a.hack_q3.slice(0, 100) + (a.hack_q3.length > 100 ? '...' : '') : 'Describe what you built specifically.';
  const value = a.hack_q8 ? a.hack_q8.slice(0, 100) + (a.hack_q8.length > 100 ? '...' : '') : 'Show the moment that proves your concept works.';

  return [
    { step: '1. Open with the problem', duration: '30 seconds', content: problem, tip: 'Start with the person, not the technology. Make the judge feel the pain before you show the solution.' },
    { step: '2. Make it real with an example', duration: '20 seconds', content: example, tip: 'One specific story is worth more than ten statistics. Use the real example you described.' },
    { step: '3. Show your solution live', duration: '60 seconds', content: built, tip: 'Do not explain. Demonstrate. Show it working in real time.' },
    { step: '4. Land the value moment', duration: '20 seconds', content: value, tip: 'This is the moment judges remember. Make it clear, simple, and undeniable.' },
    { step: '5. Close with your ask', duration: '10 seconds', content: 'Tell judges what winning means to you and what you will do next.', tip: 'Be specific. Not we want to help farmers. We want to launch in Kano State and reach 1,000 farmers by harvest season.' },
  ];
}

function hackathonProofs(theme) {
  const proofs = {
    ai_ml: [{ name: 'Hugging Face', result: 'Now valued at 4.5 billion dollars', lesson: 'Started as a small AI chatbot demo. Built one thing that worked. Everything else came after.' }],
    fintech: [{ name: 'Paystack', result: 'Acquired by Stripe for 200 million dollars', lesson: 'Solved one problem for one group. Started focused and expanded only after dominating that niche.' }],
    health: [{ name: 'Helium Health', result: 'Largest health tech company in Nigeria', lesson: 'Started with hospital management only. Did not try to solve all of healthcare at once.' }],
    agriculture: [{ name: 'Twiga Foods', result: 'Series C funded, operating across Kenya', lesson: 'Started with one supply chain problem in Nairobi. Did not try to fix all of agriculture.' }],
    education: [{ name: 'uLesson', result: 'Raised over 20 million dollars', lesson: 'Started with secondary school students in Nigeria only. Focused before expanding.' }],
    default: [
      { name: 'GroupMe', result: 'Sold to Skype for 85 million dollars', lesson: 'Built at TechCrunch Hackathon in 36 hours. Did one thing: group SMS. Nothing else.' },
      { name: 'Carrd', result: 'Bootstrapped to over 1 million dollars annual revenue', lesson: 'Started as a weekend project. One simple thing done extremely well.' },
    ],
  };
  return proofs[theme] || proofs.default;
}

// ─── STARTUP ANALYSIS ─────────────────────────────────────────
function analyzeStartup(a) {
  let score = 0;
  const insights = [];
  const challenges = [];
  const nextSteps = [];

  // Problem clarity
  if (has(a.startup_q1)) {
    score += 12;
    if (len(a.startup_q1) > 200) {
      insights.push({ type: 'strength', text: 'Detailed problem statement. You understand this problem well. The depth here will make your pitch and your product sharper.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have described the problem but there is room to go deeper. Can you quantify the cost to the customer? Numbers make the pain concrete.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'Your problem statement is too vague.', response: 'You cannot build a focused product on a vague problem. Rewrite it: name one specific person, their exact situation, and what it costs them every month. One paragraph minimum.' });
    nextSteps.push('Rewrite your problem statement with a specific person, a specific situation, and a specific measurable cost.');
  }

  // Target customer
  if (has(a.startup_q2)) {
    score += 10;
    if (contains(a.startup_q2, 'sme', 'everyone', 'anyone', 'all businesses', 'people who')) {
      challenges.push({ level: 'medium', text: 'Your target customer description is still too broad.', response: 'SMEs, everyone, and people who are categories, not customers. Name one specific type of person with specific characteristics. The more specific you are, the easier it is to find them, sell to them, and build for them.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a specific target customer. This focus will help you build the right product and find your first users faster.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not clearly defined who your first customer is.', response: 'Without a specific first customer, you cannot make product decisions, sales decisions, or distribution decisions. Define one specific type of person with specific characteristics before moving forward.' });
    nextSteps.push('Define your first customer in one paragraph. Name the specific type of person, their situation, their budget, and why they would talk to you.');
  }

  // Customer conversations
  if (has(a.startup_q3)) {
    score += 15;
    if (contains(a.startup_q3, 'no', 'not yet', 'have not', 'haven\'t', 'plan to', 'will do')) {
      challenges.push({ level: 'high', text: 'You have not spoken to any potential customers yet.', response: 'This is the most important thing you need to do before anything else. Not a survey. Not a form. A real conversation with someone who has this problem. Talk to 5 people this week. Ask how they currently solve it, not whether they would use your product.' });
      score -= 10;
      nextSteps.push('Talk to 5 potential customers this week before building anything. Ask how they currently solve this problem, not whether they would use yours.');
    } else if (contains(a.startup_q3, 'spoke', 'talked', 'interviewed', 'conversation', 'asked')) {
      insights.push({ type: 'strength', text: 'You have had real conversations with potential customers. This is one of the most valuable things a founder can do. The insights from those conversations should drive every product decision you make.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'No customer research mentioned.', response: 'You cannot build a product people will pay for without understanding how they currently live without it. Talk to 5 real people with this problem before writing any more code.' });
    nextSteps.push('Have 5 customer conversations before your next build sprint. Listen more than you talk.');
  }

  // Switching reason
  if (has(a.startup_q4)) {
    score += 8;
    if (contains(a.startup_q4, 'better', 'easier', 'cheaper', 'faster', 'simpler')) {
      insights.push({ type: 'neutral', text: 'You have described why someone might switch but the reasons are comparative. Make sure you can explain the specific trigger moment that pushes someone from their current solution to yours.' });
    } else {
      insights.push({ type: 'strength', text: 'You have identified a specific switching trigger. That clarity will make your sales conversations and your onboarding much more effective.' });
    }
  } else {
    challenges.push({ level: 'medium', text: 'You have not clearly explained why someone would switch to your product.', response: 'Switching has a real cost. People are used to their current solution even if it is imperfect. What is the specific moment or frustration that pushes someone to change? Name it precisely.' });
  }

  // First 10 users
  if (has(a.startup_q5)) {
    score += 10;
    if (contains(a.startup_q5, 'social media', 'instagram', 'twitter', 'ads', 'marketing', 'seo')) {
      challenges.push({ level: 'high', text: 'Your plan to reach first users relies on channels that do not work at early stage.', response: 'Social media and paid ads almost never produce the first 10 paying customers. Your first 10 users will almost certainly come from personal relationships, direct outreach, or communities you are already part of. Who do you know personally who has this problem?' });
      score -= 5;
    } else {
      insights.push({ type: 'strength', text: 'Your plan to reach first users is grounded and realistic. The best early stage growth comes from personal relationships and direct outreach. Stay focused on this channel until it stops working.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have no clear plan for reaching your first 10 users.', response: 'Your first 10 users will not find you. You need to find them. Who do you know personally who has this problem? Start there.' });
    nextSteps.push('List 10 people you know personally who have this problem. Contact each one directly this week.');
  }

  // Competitive advantage
  if (has(a.startup_q6)) {
    score += 10;
    if (contains(a.startup_q6, 'design', 'ui', 'ux', 'interface', 'look', 'beautiful', 'easy to use')) {
      challenges.push({ level: 'high', text: 'Your competitive advantage is design or user experience. That is not a moat.', response: 'Any competitor can hire a designer and copy your interface in 2 weeks. What do you have that takes years to build? Think about relationships, data, distribution, domain expertise, or network effects. What is your structural advantage?' });
      score -= 5;
    } else if (contains(a.startup_q6, 'cheaper', 'price', 'affordable', 'low cost', 'free')) {
      challenges.push({ level: 'high', text: 'Your competitive advantage is price. That is not a sustainable moat.', response: 'A well funded competitor can always undercut your price. Price competition destroys margins and attracts the wrong customers. What advantage do you have that cannot be bought or copied? Relationships, data, expertise, or access?' });
      score -= 5;
    } else {
      insights.push({ type: 'strength', text: 'You have identified a structural competitive advantage. Make sure you can explain this in one sentence and that it genuinely gets harder to copy over time, not easier.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not identified a real competitive advantage.', response: 'Without a clear answer to this question, you are building a product that anyone with more money can replicate. What do you know, who do you know, or what can you access that a competitor cannot easily get?' });
  }

  // Revenue model
  if (has(a.startup_q7)) {
    score += 10;
    if (contains(a.startup_q7, 'not sure', 'unsure', 'figure out', 'later', 'ads', 'advertising')) {
      challenges.push({ level: 'high', text: 'Your revenue model is unclear or relies on advertising.', response: a.startup_q7.toLowerCase().includes('ads') || a.startup_q7.toLowerCase().includes('advertising') ? 'Ad models require millions of users to generate meaningful revenue. For a startup at this stage, advertising is almost never a viable primary revenue model. Who has a direct reason to pay you and what would they pay?' : 'Not knowing how you make money at this stage is a serious risk. Talk to 5 potential customers this week and ask what they currently pay to solve this problem. That conversation will give you your pricing anchor.' });
      score -= 8;
    } else if (contains(a.startup_q7, 'Naira', 'dollar', 'per month', 'subscription', 'fee', 'commission', '%')) {
      insights.push({ type: 'strength', text: 'You have a specific revenue model with real numbers. This specificity is what separates serious founders from people with ideas. Make sure those numbers are grounded in actual customer conversations.' });
    } else {
      insights.push({ type: 'neutral', text: 'You have a revenue direction. Now make it specific. Name the exact price, name who pays it, and explain why they would pay that amount based on the value you create for them.' });
    }
  } else {
    challenges.push({ level: 'high', text: 'You have not defined how you will make money.', response: 'This is a fundamental gap. Without a revenue model, you are building a project not a business. Ask 5 potential customers this week: what do you currently pay to solve this problem? Start there.' });
    nextSteps.push('Define your revenue model this week. Ask 5 potential customers what they currently pay to solve this problem. Use that as your pricing anchor.');
  }

  // Biggest assumption
  if (has(a.startup_q8)) {
    score += 10;
    insights.push({ type: 'strength', text: 'You have named your biggest assumption. Now build a test for it. What is the cheapest, fastest way to find out if this assumption is true before you invest more time building on it?' });
    nextSteps.push(`Test your biggest assumption before your next major build. Design a simple experiment that gives you a clear answer within 2 weeks.`);
  } else {
    challenges.push({ level: 'high', text: 'You have not identified your biggest unvalidated assumption.', response: 'Every startup is built on assumptions. The ones that go unexamined are the ones that cause failure. What is the one thing you are counting on being true that you have not yet confirmed?' });
  }

  // Persistence of need
  if (has(a.startup_q9)) {
    score += 8;
    if (contains(a.startup_q9, 'yes', 'still need', 'persistent', 'structural', 'always')) {
      insights.push({ type: 'strength', text: 'The problem you are solving is persistent. That means you are building on a durable foundation. Persistent problems support durable businesses.' });
    } else {
      challenges.push({ level: 'medium', text: 'You are not sure whether this problem will still exist in 6 months.', response: 'If the problem could disappear or change significantly in 6 months, you need to be building very fast or reconsidering the timing. What makes the problem persistent enough to support a long term business?' });
    }
  }

  // Failure mode
  if (has(a.startup_q10)) {
    score += 7;
    insights.push({ type: 'strength', text: 'You have named your most likely failure mode. That self awareness is more valuable than most founder skills. Now build an early warning system. What metric or signal will tell you this failure is beginning before it becomes irreversible?' });
    nextSteps.push('Define the early warning signal for your failure mode. What metric or behaviour tells you things are going wrong before it is too late?');
  } else {
    challenges.push({ level: 'medium', text: 'You have not identified why this startup might fail.', response: 'Founders who cannot name their failure mode are the most likely to be surprised by it. Be honest with yourself. What is the specific scenario in which this does not work?' });
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
    proofPoints: startupProofs(),
  };
}

function defaultStartupNextSteps() {
  return [
    'Talk to 5 potential customers this week before building anything.',
    'Define your revenue model with a specific price and a specific type of customer.',
    'Identify your biggest unvalidated assumption and design a 2 week test for it.',
    'Map how your first 10 users will realistically find and trust you.',
  ];
}

function buildRoadmap() {
  return [
    { week: 'Week 1 to 2', title: 'Validate before you build', color: '#2563EB', tasks: ['Talk to 10 potential customers. Listen. Do not pitch.', 'Ask: how do you currently solve this? What would you pay for something better?', 'Document patterns and surprises. What did you assume that turned out to be wrong?', 'Decide: does the evidence support moving forward?'] },
    { week: 'Week 3 to 6', title: 'Build the minimum viable product', color: '#7C3AED', tasks: ['Build only the single most important feature. Resist adding more.', 'Get 3 people from your target audience to test it while you watch.', 'Fix the top 3 issues before expanding to more users.', 'Charge something from the first user. Even a small amount proves real demand.'] },
    { week: 'Week 7 to 10', title: 'Get to first paying customers', color: '#15803D', tasks: ['Launch to 10 to 20 handpicked first customers from your personal network.', 'Track your one key metric every week without exception.', 'Get your first testimonial or case study from a real user.', 'Fix the top issue your first customers complain about.'] },
    { week: 'Week 11 to 13', title: 'Iterate and decide', color: '#D97706', tasks: ['Expand to 50 to 100 users through your chosen channel.', 'Add only the most requested feature, not the most interesting one.', 'Review your unit economics. Are you making or losing money per customer?', 'Decide based on data: double down, adjust, or change direction.'] },
  ];
}

function startupProofs() {
  return [
    { name: 'Paystack', country: 'Nigeria', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one precise problem for one specific group. Started focused and expanded only after dominating that niche.' },
    { name: 'Piggyvest', country: 'Nigeria', result: '4 million users, profitable without VC until Series A', stage: 'success', lesson: 'Started with a WhatsApp savings group before building any technology. Proved the behaviour existed before automating it.' },
    { name: 'Gokada', country: 'Nigeria', result: 'Forced to pivot after Lagos bike ban', stage: 'struggle', lesson: 'Great product but regulatory risk was not managed. A single government decision changed everything overnight. Always know your regulatory exposure.' },
    { name: 'Andela', country: 'Africa', result: '1.5 billion dollar valuation', stage: 'success', lesson: 'Founders had lived the problem. African developers were being overlooked globally. Personal connection to the mission sustained them through the hard years.' },
  ];
}
