import React, { useState, useEffect } from 'react';
import { Analytics } from '../lib/analytics';

const B = '#550000';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F7F7F5';

export default function LandingScreen({ onSelectMode, onLogin, onSignup, onDashboard, user }) {
  const [visible, setVisible] = useState(false);
  const [activeWho, setActiveWho] = useState(0);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  const handleSelect = (modeId) => {
    Analytics.modeSelected(modeId);
    onSelectMode(modeId);
  };

  const whoCards = [
    {
      label: 'Startup founders',
      outcome: 'Ship without falling apart',
      body: 'You are building fast and things keep slipping. PM Buddy keeps your team aligned, your timeline real and your risks visible before they become problems.',
    },
    {
      label: 'Solo builders',
      outcome: 'Build like a team of ten',
      body: 'No co-founder. No PM. No problem. PM Buddy gives you the structure and thinking process that turns a solo effort into a professional project.',
    },
    {
      label: 'Non-technical founders',
      outcome: 'Lead your team with confidence',
      body: 'You do not need to understand code to run a project well. PM Buddy puts you in control of timelines, responsibilities and communication without the jargon.',
    },
    {
      label: 'Corporate teams',
      outcome: 'Get everyone on the same page',
      body: 'Multiple people, multiple opinions, one goal. PM Buddy gives your team clarity on who owns what, what is due and how to communicate with every stakeholder.',
    },
  ];

  const features = [
    { title: 'Project setup in minutes', body: 'Tell PM Buddy what you are building. It structures your project with a clear goal, timeline and team roles automatically.' },
    { title: 'Always know who owns what', body: 'No more "I thought you were handling that." Every task has a clear owner, a deadline and a status everyone can see.' },
    { title: 'Spot problems before they happen', body: 'PM Buddy tracks your risks and flags what could go wrong before it derails your project. Stay ahead, not reactive.' },
    { title: 'Hit your deadlines', body: 'Set milestones, track progress and get reminded when things are falling behind. No more missed deadlines that nobody saw coming.' },
    { title: 'Communicate without confusion', body: 'Know exactly what to tell each person on your project and when. Your stakeholders stay informed without the back and forth.' },
    { title: 'Documents that are always ready', body: 'Your project plan, risk log and team structure are generated and updated automatically. Share them anytime in seconds.' },
  ];

  return (
    <div style={s.page}>

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
            <p style={s.tagline}>Build better. Manage smarter.</p>
            <h1 style={s.headline}>
              Think, plan and execute<br />
              <span style={s.accent}>like a professional PM.</span><br />
              Without being one.
            </h1>
            <p style={s.heroSub}>
              Most projects do not fail because of bad ideas. They fail because nobody is running them properly. PM Buddy is the project management thinking partner every builder needs.
            </p>
            <div style={s.heroBtns}>
              {user ? (
                <button style={s.primaryBtn} onClick={onDashboard}>Go to my projects</button>
              ) : (
                <>
                  <button style={s.primaryBtn} onClick={onSignup}>Start your first project</button>
                  <button style={s.ghostBtn} onClick={onLogin}>Log in</button>
                </>
              )}
            </div>
            {!user && (
              <p style={s.heroNote}>
                Not sure if your idea is worth building?{' '}
                <button style={s.textLink} onClick={() => handleSelect('startup')}>Validate it first for free</button>
              </p>
            )}
          </div>
        </div>
        <div style={{ ...s.heroRight, opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 0.2s' }}>
          <ProjectCard />
        </div>
      </div>

      {/* STATS */}
      <div style={s.statsStrip}>
        {[
          { num: '92+', label: 'Projects running on PM Buddy' },
          { num: '10 min', label: 'To set up your project' },
          { num: '8', label: 'PM frameworks built in' },
          { num: '0', label: 'PMs you need to hire' },
        ].map((st, i) => (
          <div key={i} style={s.statBlock}>
            <span style={s.statNum}>{st.num}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
      </div>

      {/* PROBLEM */}
      <div style={s.section}>
        <div style={s.inner}>
          <p style={s.eyebrow}>The problem</p>
          <h2 style={s.h2}>Great ideas are dying from poor execution.</h2>
          <p style={s.lead}>You know what you want to build. But without someone managing how it gets built, things fall apart. Deadlines slip. Scope grows. The team loses direction. The idea never becomes the product it was meant to be.</p>
          <div style={s.problemGrid}>
            {[
              { title: 'No one is in charge', body: 'Tasks get dropped because nobody owns them. Decisions get made twice because nobody documented the first one.' },
              { title: 'The plan keeps changing', body: 'New ideas keep getting added. The original goal gets buried. Three months in you are building something nobody planned.' },
              { title: 'Communication breaks down', body: 'The team does not know what is happening. Stakeholders are asking questions you do not have answers to.' },
              { title: 'Nothing is documented', body: 'Everything lives in someone\'s head or a WhatsApp chat. When something goes wrong there is no record of what was agreed.' },
            ].map((p, i) => (
              <div key={i} style={s.problemCard}>
                <div style={s.problemDot} />
                <p style={s.problemTitle}>{p.title}</p>
                <p style={s.problemBody}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SOLUTION */}
      <div style={{ ...s.section, background: BL }}>
        <div style={s.inner}>
          <p style={{ ...s.eyebrow, color: B }}>The solution</p>
          <h2 style={{ ...s.h2, color: WH }}>PM Buddy thinks like a PM<br /><span style={{ color: B }}>so you do not have to.</span></h2>
          <p style={{ ...s.lead, color: '#9CA3AF', marginBottom: 48 }}>You focus on building. PM Buddy handles the thinking, planning and structure that keeps your project on track from start to finish.</p>
          <div style={s.solutionGrid}>
            {[
              { title: 'Structure from day one', body: 'Every project starts with a clear goal, a realistic timeline and defined roles. No more starting blind.' },
              { title: 'Stay focused on what matters', body: 'PM Buddy helps you say no to scope creep and yes to the things that actually move your project forward.' },
              { title: 'Always know where you stand', body: 'Real-time visibility into your milestones, risks and team progress without chasing anyone for updates.' },
              { title: 'Documentation that writes itself', body: 'Your project plan, risk log and team structure are always up to date and ready to share in one click.' },
            ].map((c, i) => (
              <div key={i} style={s.solutionCard}>
                <p style={s.solutionTitle}>{c.title}</p>
                <p style={s.solutionBody}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHO IT IS FOR */}
      <div style={s.section}>
        <div style={s.inner}>
          <p style={s.eyebrow}>Who it is for</p>
          <h2 style={s.h2}>Built for every kind of builder.</h2>
          <div style={s.whoLayout}>
            <div style={s.whoTabs}>
              {whoCards.map((w, i) => (
                <button
                  key={i}
                  style={{ ...s.whoTab, background: activeWho === i ? B : WH, color: activeWho === i ? WH : BL, borderColor: activeWho === i ? B : '#E5E7EB' }}
                  onClick={() => setActiveWho(i)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div style={s.whoDetail}>
              <p style={s.whoOutcome}>{whoCards[activeWho].outcome}</p>
              <p style={s.whoBody}>{whoCards[activeWho].body}</p>
              <button style={s.primaryBtn} onClick={user ? onDashboard : onSignup}>
                {user ? 'Go to my projects' : 'Get started'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NOT TRELLO */}
      <div style={{ ...s.section, background: GREY }}>
        <div style={s.inner}>
          <p style={s.eyebrow}>Why not just use Trello or Asana?</p>
          <h2 style={s.h2}>Tools do not run your project.<br />Thinking does.</h2>
          <p style={s.lead}>Trello and Asana are task boards. They show you what needs to be done but they do not help you think through risks, structure your team, plan your communications or spot what is about to go wrong. PM Buddy does all of that.</p>
          <div style={s.compareGrid}>
            <div style={s.compareCard}>
              <p style={s.compareLabel}>Trello and Asana</p>
              {[
                'Task boards and lists',
                'You do all the thinking',
                'No risk or scope management',
                'No communication planning',
                'No PM frameworks built in',
                'Generic for any use case',
              ].map((item, i) => (
                <div key={i} style={s.compareRow}>
                  <span style={s.crossIcon}>✕</span>
                  <span style={s.compareItem}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ ...s.compareCard, borderTop: `3px solid ${B}` }}>
              <p style={{ ...s.compareLabel, color: B }}>PM Buddy</p>
              {[
                'Thinks through your project with you',
                'Spots risks before they happen',
                'Keeps scope under control',
                'Plans your stakeholder communications',
                'Real PM frameworks without the jargon',
                'Built for founders and builders',
              ].map((item, i) => (
                <div key={i} style={s.compareRow}>
                  <span style={s.checkIcon}>✓</span>
                  <span style={s.compareItem}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={s.section}>
        <div style={s.inner}>
          <p style={s.eyebrow}>How it works</p>
          <h2 style={s.h2}>Up and running in minutes.</h2>
          <div style={s.stepsGrid}>
            {[
              { num: '01', title: 'Tell PM Buddy what you are building', body: 'Describe your project, your goal and your team. PM Buddy sets up the structure you need to start properly.' },
              { num: '02', title: 'Get your full project toolkit', body: 'Your team roles, risk tracker, milestone plan and communication guide are generated automatically.' },
              { num: '03', title: 'Build while PM Buddy watches your back', body: 'Track progress, manage risks and stay on schedule. PM Buddy flags problems before they derail your project.' },
              { num: '04', title: 'Get expert help when you need it', body: 'Book a real PM consultant directly from your dashboard when your project needs human expertise.' },
            ].map((step, i) => (
              <div key={i} style={s.stepCard}>
                <span style={s.stepNum}>{step.num}</span>
                <p style={s.stepTitle}>{step.title}</p>
                <p style={s.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ ...s.section, background: GREY }}>
        <div style={s.inner}>
          <p style={s.eyebrow}>Core features</p>
          <h2 style={s.h2}>Everything you need to run a real project.</h2>
          <div style={s.featuresGrid}>
            {features.map((f, i) => (
              <div key={i} style={s.featureCard}>
                <div style={s.featureLine} />
                <p style={s.featureTitle}>{f.title}</p>
                <p style={s.featureBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VALIDATION */}
      <div style={s.section}>
        <div style={s.inner}>
          <div style={s.validationBanner}>
            <div style={s.validationLeft}>
              <p style={s.eyebrow}>Not sure if your idea is worth building?</p>
              <h3 style={s.validationTitle}>Validate your idea before you commit to building it.</h3>
              <p style={s.validationBody}>Answer honest questions about your idea and get a report that tells you what is strong, what is missing and what to do next. Takes 10 minutes.</p>
              <div style={s.validationBtns}>
                <button style={s.primaryBtn} onClick={() => handleSelect('startup')}>Validate a startup idea</button>
                <button style={s.ghostBtn} onClick={() => handleSelect('hackathon')}>Validate a hackathon idea</button>
              </div>
            </div>
            <div style={s.validationRight}>
              <div style={s.validationBadge}>
                <span style={s.validationBadgeTop}>Always</span>
                <span style={s.validationBadgeFree}>Free</span>
                <span style={s.validationBadgeBot}>No account needed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={s.finalCta}>
        <div style={s.finalInner}>
          <h2 style={s.finalH2}>Start running your project like a professional.</h2>
          <p style={s.finalSub}>PM Buddy gives you the thinking, structure and tools of a project manager without the cost of hiring one.</p>
          <button style={s.finalBtn} onClick={user ? onDashboard : onSignup}>
            {user ? 'Go to my projects' : 'Create your account'}
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <p style={s.footerLogo}>PM Buddy</p>
            <p style={s.footerTagline}>PM Buddy helps you think, plan and execute like a professional PM without being one.</p>
          </div>
          <p style={s.footerCredit}>Built by <strong style={{ color: '#E5E7EB' }}>Deborah Akpokighe</strong></p>
        </div>
      </div>

    </div>
  );
}

function ProjectCard() {
  return (
    <div style={pc.wrap}>
      <div style={pc.card}>
        <div style={pc.head}>
          <div>
            <p style={pc.tag}>Active project</p>
            <p style={pc.name}>Fintech MVP — Lagos</p>
          </div>
          <span style={pc.badge}>On track</span>
        </div>
        <div style={pc.prog}>
          <div style={pc.progRow}>
            <span style={pc.progLbl}>Progress</span>
            <span style={pc.progPct}>64%</span>
          </div>
          <div style={pc.track}><div style={pc.fill} /></div>
        </div>
        <p style={pc.secLbl}>Upcoming milestones</p>
        {[
          { name: 'Customer interviews', due: 'Apr 8', done: true },
          { name: 'MVP wireframes', due: 'Apr 15', done: false },
          { name: 'First user test', due: 'Apr 22', done: false },
        ].map((m, i) => (
          <div key={i} style={pc.mile}>
            <div style={{ ...pc.check, background: m.done ? B : WH, borderColor: m.done ? B : '#D1D5DB' }}>
              {m.done && <span style={{ color: WH, fontSize: 9, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ ...pc.mileName, textDecoration: m.done ? 'line-through' : 'none', color: m.done ? '#9CA3AF' : BL }}>{m.name}</span>
            <span style={pc.miDue}>{m.due}</span>
          </div>
        ))}
        <div style={pc.riskRow}>
          <span style={pc.riskLbl}>Risks tracked</span>
          <span style={pc.riskVal}>3 medium · 1 high</span>
        </div>
      </div>
      <div style={pc.raciCard}>
        <p style={pc.raciHd}>Team ownership</p>
        {[
          { role: 'Product lead', tag: 'Accountable' },
          { role: 'Dev team', tag: 'Responsible' },
          { role: 'Investors', tag: 'Informed' },
        ].map((r, i) => (
          <div key={i} style={pc.raciRow}>
            <span style={pc.raciRole}>{r.role}</span>
            <span style={pc.raciTag}>{r.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const pc = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: WH, borderRadius: 20, padding: 22, width: 290, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid #F0F0F0' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  tag: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 },
  name: { fontSize: 15, fontWeight: 800, color: BL, letterSpacing: '-0.3px' },
  badge: { fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#15803D', padding: '3px 10px', borderRadius: 100 },
  prog: { marginBottom: 16 },
  progRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 7 },
  progLbl: { fontSize: 11, color: '#9CA3AF', fontWeight: 600 },
  progPct: { fontSize: 11, color: B, fontWeight: 800 },
  track: { height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', width: '64%', background: B, borderRadius: 3 },
  secLbl: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  mile: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 },
  check: { width: 16, height: 16, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mileName: { fontSize: 12, fontWeight: 600, flex: 1 },
  miDue: { fontSize: 10, color: '#9CA3AF', fontWeight: 600 },
  riskRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF2F2', borderRadius: 8, padding: '7px 10px', marginTop: 12 },
  riskLbl: { fontSize: 10, fontWeight: 700, color: '#9CA3AF' },
  riskVal: { fontSize: 11, fontWeight: 700, color: B },
  raciCard: { background: WH, borderRadius: 14, padding: '16px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.07)', border: '1px solid #F0F0F0' },
  raciHd: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  raciRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid #F3F4F6' },
  raciRole: { fontSize: 12, fontWeight: 600, color: BL },
  raciTag: { fontSize: 11, fontWeight: 700, color: B, background: '#FFF5F5', padding: '2px 8px', borderRadius: 100 },
};

const s = {
  page: { minHeight: '100vh', background: WH, fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif" },

  hero: { padding: '80px 48px', maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' },
  heroLeft: { flex: 1, minWidth: 300, maxWidth: 560 },
  heroRight: { flex: '0 0 auto' },
  tagline: { fontSize: 11, fontWeight: 800, color: B, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 20 },
  headline: { fontSize: 'clamp(38px, 5.5vw, 68px)', fontWeight: 900, color: BL, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 22 },
  accent: { color: B },
  heroSub: { fontSize: 17, color: '#4B5563', lineHeight: 1.8, marginBottom: 32, maxWidth: 480 },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  primaryBtn: { padding: '14px 28px', background: B, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { padding: '14px 28px', background: WH, color: BL, border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  heroNote: { fontSize: 13, color: '#9CA3AF' },
  textLink: { background: 'none', border: 'none', color: B, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' },

  statsStrip: { borderTop: '1px solid #EBEBEB', borderBottom: '1px solid #EBEBEB', padding: '28px 48px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 },
  statBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 38, fontWeight: 900, color: B, letterSpacing: '-1.5px' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' },

  section: { padding: '88px 48px' },
  inner: { maxWidth: 1100, margin: '0 auto' },
  eyebrow: { fontSize: 11, fontWeight: 800, color: B, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 14 },
  h2: { fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, color: BL, marginBottom: 20, letterSpacing: '-1.5px', lineHeight: 1.08 },
  lead: { fontSize: 16, color: '#4B5563', lineHeight: 1.8, maxWidth: 640, marginBottom: 48 },

  problemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  problemCard: { background: GREY, borderRadius: 16, padding: 24, border: '1px solid #EBEBEB' },
  problemDot: { width: 8, height: 8, borderRadius: '50%', background: B, marginBottom: 14 },
  problemTitle: { fontSize: 16, fontWeight: 800, color: BL, marginBottom: 10, letterSpacing: '-0.3px' },
  problemBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },

  solutionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  solutionCard: { background: '#111111', borderRadius: 16, padding: 28, border: '1px solid #1F1F1F' },
  solutionTitle: { fontSize: 17, fontWeight: 800, color: WH, marginBottom: 10, letterSpacing: '-0.3px' },
  solutionBody: { fontSize: 14, color: '#9CA3AF', lineHeight: 1.75 },

  whoLayout: { display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 8 },
  whoTabs: { display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto', minWidth: 220 },
  whoTab: { padding: '14px 20px', border: '1.5px solid', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' },
  whoDetail: { flex: 1, minWidth: 280, background: GREY, borderRadius: 20, padding: 36 },
  whoOutcome: { fontSize: 22, fontWeight: 900, color: B, letterSpacing: '-0.5px', marginBottom: 14 },
  whoBody: { fontSize: 15, color: '#374151', lineHeight: 1.75, marginBottom: 28 },

  compareGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 48 },
  compareCard: { background: WH, borderRadius: 16, padding: 28, border: '1px solid #E5E7EB', borderTop: '3px solid #E5E7EB' },
  compareLabel: { fontSize: 15, fontWeight: 800, color: '#9CA3AF', marginBottom: 20, letterSpacing: '-0.2px' },
  compareRow: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  crossIcon: { fontSize: 13, color: '#D1D5DB', fontWeight: 700, flexShrink: 0, marginTop: 1 },
  checkIcon: { fontSize: 13, color: B, fontWeight: 700, flexShrink: 0, marginTop: 1 },
  compareItem: { fontSize: 14, color: '#374151', lineHeight: 1.5 },

  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, marginTop: 48 },
  stepCard: {},
  stepNum: { display: 'inline-block', fontSize: 12, fontWeight: 900, color: B, background: '#FFF5F5', border: `1px solid ${B}20`, borderRadius: 8, padding: '4px 10px', marginBottom: 16 },
  stepTitle: { fontSize: 16, fontWeight: 800, color: BL, marginBottom: 8, letterSpacing: '-0.3px' },
  stepBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginTop: 8 },
  featureCard: { background: WH, borderRadius: 16, padding: 24, border: '1px solid #E5E7EB' },
  featureLine: { width: 32, height: 3, background: B, borderRadius: 2, marginBottom: 16 },
  featureTitle: { fontSize: 15, fontWeight: 800, color: BL, marginBottom: 8, letterSpacing: '-0.2px' },
  featureBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  validationBanner: { background: GREY, borderRadius: 24, padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' },
  validationLeft: { flex: 1, minWidth: 280 },
  validationTitle: { fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 900, color: BL, marginBottom: 12, letterSpacing: '-0.8px', lineHeight: 1.15 },
  validationBody: { fontSize: 15, color: '#6B7280', lineHeight: 1.75, marginBottom: 24 },
  validationBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  validationRight: { flex: '0 0 auto' },
  validationBadge: { background: WH, border: `2px solid ${B}20`, borderRadius: 20, padding: '28px 36px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  validationBadgeTop: { display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  validationBadgeFree: { display: 'block', fontSize: 52, fontWeight: 900, color: B, letterSpacing: '-3px', lineHeight: 1, marginBottom: 4 },
  validationBadgeBot: { display: 'block', fontSize: 11, color: '#9CA3AF', fontWeight: 600 },

  finalCta: { background: B, padding: '100px 48px', textAlign: 'center' },
  finalInner: { maxWidth: 600, margin: '0 auto' },
  finalH2: { fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, color: WH, marginBottom: 16, letterSpacing: '-1.5px', lineHeight: 1.05 },
  finalSub: { fontSize: 17, color: 'rgba(255,255,255,0.72)', lineHeight: 1.75, marginBottom: 40 },
  finalBtn: { padding: '16px 40px', background: WH, color: B, border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },

  footer: { background: BL, padding: '40px 48px' },
  footerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  footerLogo: { fontSize: 18, fontWeight: 900, color: WH, letterSpacing: '-0.5px', marginBottom: 6 },
  footerTagline: { fontSize: 13, color: '#4B5563', maxWidth: 400, lineHeight: 1.6 },
  footerCredit: { fontSize: 13, color: '#6B7280' },
};
