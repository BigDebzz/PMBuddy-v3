// src/data/analysis.js

export function analyze(mode, answers) {
  return mode === 'hackathon'
    ? analyzeHackathon(answers)
    : analyzeStartup(answers);
}

function analyzeHackathon(a) {
  let score = 0;
  const strengths = [];
  const risks = [];

  if (a.hackProblem && a.hackProblem.length > 80) {
    score += 25;
    strengths.push('Specific problem statement. Judges will understand it immediately.');
  } else {
    risks.push({ level: 'high', text: 'Problem statement is too vague.', action: 'Rewrite it as: Who suffers from what, how often, and at what cost to them?' });
  }

  if (a.hackSolution && a.hackSolution.length > 60) {
    score += 20;
    strengths.push('Clear solution description. You know what you are building.');
  } else {
    risks.push({ level: 'high', text: 'Solution not clearly described.', action: 'Write 2 to 3 sentences explaining exactly what the user does with your product.' });
  }

  const teamScores = { balanced: 25, solo_tech: 15, all_tech: 12, solo_notech: 8, mostly_business: 6 };
  score += (teamScores[a.hackTeam] || 10);
  if (a.hackTeam === 'balanced') strengths.push('Balanced team with tech, business, and design. Best possible setup for a hackathon.');
  if (a.hackTeam === 'solo_notech') risks.push({ level: 'high', text: 'No technical skills on the team.', action: 'Use Bubble, Glide, or Typeform to build your MVP without writing code. Focus on demonstrating the concept.' });
  if (a.hackTeam === 'mostly_business') risks.push({ level: 'high', text: 'Very limited technical skills.', action: 'Start with a no-code tool immediately. A working prototype, even rough, beats a perfect slide deck every time.' });

  if (a.hackMVP && a.hackMVP.length > 60) {
    score += 30;
    strengths.push('Clear MVP focus. You know exactly what the demo must prove.');
  } else {
    risks.push({ level: 'high', text: 'MVP not clearly defined.', action: 'Answer this: if judges see only one thing working, what is it? Build only that.' });
  }

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    strengths,
    risks,
    sprintPlan: buildSprintPlan(a.hackTimeline),
    proofPoints: hackathonProofs(a.hackTheme),
    bestPractices: hackathonPractices(),
    pitchFramework: buildPitchFramework(a),
  };
}

function analyzeStartup(a) {
  let score = 0;
  const strengths = [];
  const risks = [];

  if (a.startupProblem && a.startupProblem.length > 80) { score += 15; strengths.push('Well-articulated problem statement with clear specificity.'); }
  else { risks.push({ level: 'high', text: 'Problem statement needs more specificity.', action: 'Name a specific person, their exact pain, and the frequency. One paragraph minimum.' }); }

  if (a.startupCustomer && a.startupCustomer.length > 60) { score += 15; strengths.push('Specific first customer identified. This is how great products get built.'); }
  else { risks.push({ level: 'high', text: 'First customer not specifically described.', action: 'Can you name a real person? If not, do customer research before building anything.' }); }

  if (a.startupCompetitors && a.startupCompetitors.length > 50) { score += 15; strengths.push('Competitor awareness shows market research and maturity.'); }
  else { risks.push({ level: 'medium', text: 'Limited competitor research.', action: 'Search Google, Crunchbase, App Store, and LinkedIn. No competitors almost always means incomplete research.' }); }

  if (a.startupDiff && a.startupDiff.length > 60) { score += 15; strengths.push('Clear differentiation thesis with structural thinking.'); }
  else { risks.push({ level: 'high', text: 'Differentiation not clearly defined.', action: 'List 3 structural advantages that are difficult for a competitor to replicate.' }); }

  if (a.startupScalability && a.startupScalability.length > 60) { score += 20; strengths.push('Scalability and defensibility considered. Shows long-term thinking.'); }
  else { risks.push({ level: 'high', text: 'No scalability strategy defined.', action: 'Answer: if a well-funded competitor enters in 12 months, what is your plan to survive and win?' }); }

  if (['subscription', 'transaction', 'b2b_license', 'commission'].includes(a.startupRevenue)) { score += 10; strengths.push('Proven revenue model that matches market expectations.'); }

  if (a.startupFunding === 'revenue') { score += 10; strengths.push('Revenue-funded. Strongest possible signal of product-market fit.'); }
  else if (a.startupFunding === 'bootstrapped') { score += 5; strengths.push('Bootstrapped approach forces lean, disciplined decision-making.'); }

  score = Math.min(score, 100);

  return {
    score,
    verdict: verdict(score),
    color: scoreColor(score),
    strengths,
    risks,
    roadmap: buildRoadmap(),
    methodology: recommendMethod(a),
    scalabilityInsight: buildScalabilityInsight(a),
    proofPoints: startupProofs(),
    bestPractices: startupPractices(),
  };
}

function verdict(score) {
  if (score >= 80) return 'Strong foundation';
  if (score >= 60) return 'Good with key gaps to address';
  if (score >= 40) return 'Needs work before proceeding';
  return 'Significant risks. Reconsider scope.';
}

function scoreColor(score) {
  if (score >= 75) return '#15803D';
  if (score >= 55) return '#2563EB';
  if (score >= 35) return '#D97706';
  return '#DC2626';
}

function buildSprintPlan(timeline) {
  const plans = {
    '24h': [
      { phase: 'Hours 1 to 3', title: 'Define and decide', tasks: ['Write your problem in one sentence', 'Define the one feature your demo must show', 'Assign roles clearly: who builds, who designs, who pitches'] },
      { phase: 'Hours 4 to 14', title: 'Build core only', tasks: ['Build only the one core feature. Nothing else.', 'Use no-code tools if possible', 'No polish yet. Functionality first.'] },
      { phase: 'Hours 15 to 20', title: 'Test and fix', tasks: ['Show it to 3 people outside your team', 'Fix the top 2 issues only', 'Record a demo video as a backup'] },
      { phase: 'Hours 21 to 24', title: 'Pitch ready', tasks: ['Write the 3-minute pitch: Problem, Solution, Demo, Ask', 'Prepare 3 slides maximum', 'Practice the demo twice out loud'] },
    ],
    '48h': [
      { phase: 'Hours 1 to 4', title: 'Foundation', tasks: ['Define problem, solution, and success metric', 'Set up your tech stack and development environment', 'Assign clear roles with no overlap'] },
      { phase: 'Hours 5 to 24', title: 'Core build', tasks: ['Build the single most important feature first', 'Use existing APIs and services. Do not reinvent the wheel.', 'Brief check-in at start of each day: 15 minutes maximum'] },
      { phase: 'Hours 25 to 40', title: 'Polish and expand', tasks: ['Add the second most important feature', 'Basic interface that looks intentional', 'Test with 3 real people from your target audience'] },
      { phase: 'Hours 41 to 48', title: 'Pitch and submit', tasks: ['Build your pitch deck: 5 slides covering problem, solution, demo, team, and ask', 'Practice the demo 3 times with a real audience', 'Submit before the deadline with time to spare'] },
    ],
    '72h': [
      { phase: 'Day 1', title: 'Foundation and core', tasks: ['Define and agree on problem statement and MVP scope', 'Set up development environment and tools', 'Build the single most critical feature end to end'] },
      { phase: 'Day 2', title: 'Build and test', tasks: ['Add second feature and basic interface', 'User test with 5 real people. Watch and listen.', 'Fix top 3 issues identified in testing'] },
      { phase: 'Day 3', title: 'Polish and pitch', tasks: ['Final polish and bug fixes', 'Build pitch deck and practice 3 times', 'Record demo video backup. Submit on time.'] },
    ],
    'week': [
      { phase: 'Days 1 to 2', title: 'Validate before building', tasks: ['Talk to 10 potential users. Listen, do not pitch.', 'Define MVP scope based on what you learn', 'Set up tools and assign responsibilities'] },
      { phase: 'Days 3 to 5', title: 'Build MVP', tasks: ['Build the core feature only', 'Test with real users daily', 'Fix and iterate based on feedback'] },
      { phase: 'Days 6 to 7', title: 'Launch and pitch', tasks: ['Final testing and polish', 'Prepare pitch and demo', 'Submit and share with target users for early feedback'] },
    ],
  };
  return plans[timeline] || plans['48h'];
}

function buildPitchFramework(a) {
  return [
    { step: '1. The Problem', duration: '30 seconds', content: a.hackProblem ? `"${a.hackProblem.slice(0, 120)}..."` : 'State the problem in one clear sentence. Make it feel real.' },
    { step: '2. The Solution', duration: '30 seconds', content: a.hackSolution ? `"${a.hackSolution.slice(0, 120)}..."` : 'What you built and how it solves the problem. Be specific.' },
    { step: '3. Live Demo', duration: '90 seconds', content: a.hackMVP ? `Show: ${a.hackMVP.slice(0, 100)}` : 'Show the product working. Focus on the moment that makes judges say I get it.' },
    { step: '4. The Ask', duration: '30 seconds', content: 'Why you and your team. What winning means to you. One clear call to action.' },
  ];
}

function hackathonProofs(theme) {
  const all = {
    ai_ml: [
      { name: 'Hugging Face', result: 'Now valued at 4.5 billion dollars', lesson: 'Started as a small AI demo. Built one thing that worked. Everything else came after.' },
    ],
    fintech: [
      { name: 'Paystack', result: 'Acquired by Stripe for 200 million dollars', lesson: 'Solved one problem for one group. Started extremely focused and expanded only after dominating that niche.' },
    ],
    agriculture: [
      { name: 'Twiga Foods', result: 'Series C funded, operating across Kenya', lesson: 'Started with one supply chain problem in Nairobi. Did not try to fix all of agriculture.' },
    ],
    default: [
      { name: 'GroupMe', result: 'Sold to Skype for 85 million dollars', lesson: 'Built at TechCrunch Hackathon in 36 hours. Did one thing: group SMS. Nothing else.' },
      { name: 'Carrd', result: 'Bootstrapped to over 1 million dollars in annual revenue', lesson: 'Started as a weekend project. Simple one-page website builder. Still does just that extremely well.' },
    ],
  };
  return all[theme] || all.default;
}

function hackathonPractices() {
  return [
    { title: 'The demo is everything', body: 'Judges remember what they see working, not what you describe. A live demo of one real feature beats 20 slides about a feature that does not exist yet.' },
    { title: 'Scope down ruthlessly', body: 'The number one hackathon mistake is building too much and having nothing complete. Cut every feature except the one that proves your concept.' },
    { title: 'Always have a backup', body: 'Record a video of your demo working before you present. Live demos fail. Connectivity fails. Laptops crash. A video ensures you can still show your product.' },
    { title: 'Build for the first 30 seconds', body: 'Design your demo to make judges say I get it within 30 seconds. The rest of your time is supporting detail.' },
  ];
}

function buildRoadmap() {
  return [
    { week: 'Week 1 to 2', title: 'Validate the pain', color: '#2563EB', icon: 'search', tasks: ['Talk to 10 potential customers. Do not pitch. Just listen and ask questions.', 'Ask: How do you currently solve this? What would you pay for something better?', 'Document patterns and insights. Look for the recurring frustration.', 'Decide: does the evidence support moving forward?'] },
    { week: 'Week 3 to 6', title: 'Build the MVP', color: '#7C3AED', icon: 'build', tasks: ['Build only the single most important feature. Resist adding more.', 'Use existing services for everything non-core.', 'Get 3 people from your target audience to test it while you watch.', 'Fix the top 3 issues before expanding to more users.'] },
    { week: 'Week 7 to 10', title: 'First customers', color: '#15803D', icon: 'rocket', tasks: ['Launch to 10 to 20 handpicked first customers.', 'Charge from day one, even a small amount. Paying users give you truth.', 'Track your North Star metric every week.', 'Get your first testimonial or case study.'] },
    { week: 'Week 11 to 13', title: 'Grow and iterate', color: '#D97706', icon: 'trending', tasks: ['Expand to 50 to 100 users through your chosen growth channel.', 'Add the most-requested feature, not the coolest feature.', 'Review unit economics. Are you making or losing money per customer?', 'Decide based on data: double down, pivot, or stop.'] },
  ];
}

function recommendMethod(a) {
  const methods = {
    scrum: { name: 'Scrum', icon: 'sprint', color: '#2563EB', why: 'Your team size and multi-month timeline are ideal for 2-week sprints. Scrum keeps everyone aligned and delivers working results every fortnight.', howTo: 'Plan in 2-week sprints. Each sprint: pick tasks, build, review with a real user. Repeat until launch.', tools: ['Jira free tier', 'Linear', 'ClickUp', 'Notion with sprint template'] },
    kanban: { name: 'Kanban', icon: 'board', color: '#15803D', why: 'For your stage and team size, a visual board works better than rigid sprints. Kanban keeps you moving without unnecessary ceremony.', howTo: 'Set up a board with 4 columns: Backlog, This Week, In Progress, Done. Review every Friday and update priorities.', tools: ['Trello free', 'Notion', 'Linear', 'Physical sticky notes on a wall'] },
    agile: { name: 'Agile', icon: 'lightning', color: '#7C3AED', why: 'Your requirements are still evolving. Agile means build a small piece, get user feedback, adjust, and repeat. Do not plan too far ahead.', howTo: 'Build the smallest thing that tests your riskiest assumption. Show it to users. Learn. Adjust. Repeat every 1 to 2 weeks.', tools: ['Trello', 'Notion', 'Basecamp', 'WhatsApp for team communication'] },
  };
  if (a.startupFunding === 'vc' || a.startupFunding === 'angel') return methods.scrum;
  if (!a.startupCompetitors || a.startupCompetitors.length < 40) return methods.agile;
  return methods.kanban;
}

function buildScalabilityInsight(a) {
  if (!a.startupScalability) return null;
  return {
    response: a.startupScalability,
    assessment: 'Your scalability answer shows you have thought about defensibility. The key test is whether your advantage compounds over time. Network effects, data, and deep relationships all get stronger as you grow. Make sure at least one of these is in your plan.',
    moats: [
      { type: 'Network effects', strength: 'Very strong', example: 'WhatsApp, Piggyvest social savings. Gets better with every new user.' },
      { type: 'Proprietary data', strength: 'Strong', example: 'Paystack transaction data, Flutterwave cross-border data. Takes years to replicate.' },
      { type: 'Switching costs', strength: 'Medium', example: 'Enterprise software and integrated tools. Users are locked in by habit and integration.' },
      { type: 'Exclusive relationships', strength: 'Medium', example: 'Twiga Foods farmer contracts. Requires ongoing relationship management.' },
    ],
  };
}

function startupProofs() {
  return [
    { name: 'Paystack', country: 'Nigeria', result: 'Acquired by Stripe for 200 million dollars', stage: 'success', lesson: 'Solved one precise problem for one specific group. Started focused and expanded only after dominating that niche.' },
    { name: 'Piggyvest', country: 'Nigeria', result: '4 million plus users, profitable', stage: 'success', lesson: 'Built community trust before features. Users refer others because they trust the product. Community is a moat that money cannot buy.' },
    { name: 'Notion', country: 'Global', result: '10 billion dollar valuation', stage: 'success', lesson: 'Grew entirely through word of mouth and community until 100 million users. Never spent heavily on paid acquisition.' },
    { name: 'Gokada', country: 'Nigeria', result: 'Pivoted after Lagos bike ban', stage: 'struggle', lesson: 'Great product but poor regulatory risk management. A single government decision wiped out the core business. Always map your regulatory exposure.' },
  ];
}

function startupPractices() {
  return [
    { title: 'Charge from day one', body: 'Free users give you feedback. Paying users give you truth. If nobody will pay even a small amount, the problem is not painful enough or your solution does not actually solve it.' },
    { title: 'One channel, done well', body: 'Startups that master one customer acquisition channel before adding another grow 4 times faster. Pick your channel and go deep before expanding.' },
    { title: 'Talk to customers every week', body: 'Every week you go without talking to a customer, your product drifts further from what the market needs. Schedule it like a non-negotiable meeting.' },
    { title: 'Revenue is the best fundraising tool', body: '20 paying customers will get you more investor attention than a 50-page pitch deck. Show traction, not potential.' },
  ];
}
