import React, { useState, useEffect } from 'react';
import { Analytics } from '../lib/analytics';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

export default function LandingScreen({ onSelectMode, onLogin, onSignup, onDashboard, user }) {
  const [visible, setVisible] = useState(false);
  const [activeWho, setActiveWho] = useState(0);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);

  const handleSelect = (modeId) => {
    Analytics.modeSelected(modeId);
    onSelectMode(modeId);
  };

  const whoCards = [
    { label: 'Startup founders', outcome: 'Ship without falling apart', body: 'You are building fast and things keep slipping. PM Buddy keeps your team aligned, your timeline real and your risks visible before they become problems.' },
    { label: 'Solo builders', outcome: 'Build like a team of ten', body: 'No co-founder. No PM. No problem. PM Buddy gives you the structure and thinking process that turns a solo effort into a professional project.' },
    { label: 'Non-technical founders', outcome: 'Lead your team with confidence', body: 'You do not need to understand code to run a project well. PM Buddy puts you in control of timelines, responsibilities and communication without the jargon.' },
    { label: 'Corporate teams', outcome: 'Get everyone on the same page', body: 'Multiple people, multiple opinions, one goal. PM Buddy gives your team clarity on who owns what, what is due and how to communicate with every stakeholder.' },
  ];

  return (
    <div style={s.page}>

      {/* HERO */}
      <div style={s.hero}>
        <div style={{ ...s.heroInner, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
          <p style={s.tagline}>Build better. Manage smarter.</p>
          <h1 style={s.headline}>
            Think, plan and execute<br />
            <span style={s.accent}>like a professional PM.</span><br />
            Without being one.
          </h1>
          <p style={s.heroSub}>
            Most projects fail not because of bad ideas but because nobody is running them properly. PM Buddy is the thinking partner every builder needs.
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

      {/* STATS */}
      <div style={s.statsStrip}>
        {[
          { num: '92+', label: 'Projects managed' },
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
          <h2 style={s.h2}>Great ideas die from poor execution.</h2>
          <p style={s.lead}>You know what you want to build. But without someone managing how it gets built, things fall apart. Deadlines slip. Scope grows. The team loses direction.</p>
          <div style={s.threeGrid}>
            {[
              { title: 'No one is in charge', body: 'Tasks get dropped because nobody owns them. Decisions happen twice because nobody documented the first one.' },
              { title: 'The plan keeps changing', body: 'New ideas keep getting added. The original goal gets buried and three months in you are building something nobody planned.' },
              { title: 'Nothing is documented', body: 'Everything lives in someone\'s head or a WhatsApp chat. When something goes wrong there is no record of what was agreed.' },
            ].map((p, i) => (
              <div key={i} style={s.problemCard}>
                <div style={s.problemLine} />
                <p style={s.problemTitle}>{p.title}</p>
                <p style={s.problemBody}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SOLUTION */}
      <div style={{ ...s.section, background: BLUE }}>
        <div style={s.inner}>
          <h2 style={{ ...s.h2, color: WH }}>PM Buddy thinks like a PM so you do not have to.</h2>
          <p style={{ ...s.lead, color: 'rgba(255,255,255,0.8)', marginBottom: 48 }}>You focus on building. PM Buddy handles the thinking, planning and structure that keeps your project on track.</p>
          <div style={s.threeGrid}>
            {[
              { title: 'Structure from day one', body: 'Every project starts with a clear goal, a realistic timeline and defined roles. No more starting blind.' },
              { title: 'Stay focused on what matters', body: 'PM Buddy helps you say no to scope creep and yes to the things that actually move your project forward.' },
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
          <h2 style={s.h2}>Built for every kind of builder.</h2>
          <div style={s.whoLayout}>
            <div style={s.whoTabs}>
              {whoCards.map((w, i) => (
                <button
                  key={i}
                  style={{ ...s.whoTab, background: activeWho === i ? BLUE : WH, color: activeWho === i ? WH : BL, borderColor: activeWho === i ? BLUE : '#E5E7EB' }}
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
          <h2 style={s.h2}>Not another task board.</h2>
          <p style={s.lead}>Trello and Asana show you what needs to be done. PM Buddy helps you think through risks, structure your team, plan your communications and spot what is about to go wrong before it does.</p>
          <div style={s.twoGrid}>
            <div style={s.compareCard}>
              <p style={s.compareLabel}>Trello and Asana</p>
              {['Task boards and lists', 'You do all the thinking', 'No risk or scope management', 'No communication planning'].map((item, i) => (
                <div key={i} style={s.compareRow}>
                  <span style={s.crossIcon}>✕</span>
                  <span style={s.compareItem}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ ...s.compareCard, borderTop: `3px solid ${BLUE}` }}>
              <p style={{ ...s.compareLabel, color: BLUE }}>PM Buddy</p>
              {['Thinks through your project with you', 'Spots risks before they happen', 'Keeps scope under control', 'Plans your stakeholder communications'].map((item, i) => (
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
          <h2 style={s.h2}>Up and running in minutes.</h2>
          <div style={s.fourGrid}>
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

      {/* VALIDATION */}
      <div style={{ ...s.section, background: GREY }}>
        <div style={s.inner}>
          <div style={s.validBanner}>
            <div style={s.validLeft}>
              <h3 style={s.validTitle}>Not sure if your idea is worth building?</h3>
              <p style={s.validBody}>Answer honest questions about your idea and get a report that tells you what is strong, what is missing and what to do next. Takes 10 minutes.</p>
              <div style={s.validBtns}>
                <button style={s.primaryBtn} onClick={() => handleSelect('startup')}>Validate a startup idea</button>
                <button style={s.outlineBtn} onClick={() => handleSelect('hackathon')}>Validate a hackathon idea</button>
              </div>
            </div>
            <div style={s.validBadge}>
              <span style={s.validBadgeTop}>Always</span>
              <span style={s.validBadgeFree}>Free</span>
              <span style={s.validBadgeBot}>No account needed</span>
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

const s = {
  page: { minHeight: '100vh', background: WH, fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif" },

  hero: { padding: '100px 48px', maxWidth: 860, margin: '0 auto', textAlign: 'center' },
  heroInner: {},
  tagline: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 24 },
  headline: { fontSize: 'clamp(40px, 5.5vw, 68px)', fontWeight: 900, color: BL, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24 },
  accent: { color: BLUE },
  heroSub: { fontSize: 18, color: '#4B5563', lineHeight: 1.8, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, justifyContent: 'center' },
  primaryBtn: { padding: '14px 28px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { padding: '14px 28px', background: WH, color: BL, border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { padding: '13px 24px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  heroNote: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  textLink: { background: 'none', border: 'none', color: BLUE, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' },

  statsStrip: { borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', padding: '28px 48px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 },
  statBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 38, fontWeight: 900, color: BLUE, letterSpacing: '-1.5px' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' },

  section: { padding: '80px 48px' },
  inner: { maxWidth: 1060, margin: '0 auto' },
  h2: { fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 900, color: BL, marginBottom: 16, letterSpacing: '-1.5px', lineHeight: 1.1 },
  lead: { fontSize: 16, color: '#4B5563', lineHeight: 1.8, maxWidth: 580, marginBottom: 48 },

  threeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  twoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 16 },
  fourGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, marginTop: 48 },

  problemCard: { background: GREY, borderRadius: 16, padding: 28, border: '1px solid #E5E7EB' },
  problemLine: { width: 32, height: 3, background: BLUE, borderRadius: 2, marginBottom: 16 },
  problemTitle: { fontSize: 16, fontWeight: 800, color: BL, marginBottom: 10, letterSpacing: '-0.3px' },
  problemBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },

  solutionCard: { background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.2)' },
  solutionTitle: { fontSize: 16, fontWeight: 800, color: WH, marginBottom: 10, letterSpacing: '-0.3px' },
  solutionBody: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 },

  whoLayout: { display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 40 },
  whoTabs: { display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto', minWidth: 200 },
  whoTab: { padding: '13px 20px', border: '1.5px solid', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' },
  whoDetail: { flex: 1, minWidth: 280, background: GREY, borderRadius: 20, padding: 36 },
  whoOutcome: { fontSize: 22, fontWeight: 900, color: BLUE, letterSpacing: '-0.5px', marginBottom: 14 },
  whoBody: { fontSize: 15, color: '#374151', lineHeight: 1.75, marginBottom: 28 },

  compareCard: { background: WH, borderRadius: 16, padding: 28, border: '1px solid #E5E7EB', borderTop: '3px solid #E5E7EB' },
  compareLabel: { fontSize: 15, fontWeight: 800, color: '#9CA3AF', marginBottom: 20 },
  compareRow: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  crossIcon: { fontSize: 12, color: '#D1D5DB', fontWeight: 700, flexShrink: 0, marginTop: 2 },
  checkIcon: { fontSize: 12, color: BLUE, fontWeight: 700, flexShrink: 0, marginTop: 2 },
  compareItem: { fontSize: 14, color: '#374151', lineHeight: 1.5 },

  stepCard: {},
  stepNum: { display: 'inline-block', fontSize: 11, fontWeight: 900, color: BLUE, background: '#EFF6FF', borderRadius: 8, padding: '4px 10px', marginBottom: 16 },
  stepTitle: { fontSize: 16, fontWeight: 800, color: BL, marginBottom: 8, letterSpacing: '-0.3px' },
  stepBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },

  validBanner: { background: WH, borderRadius: 24, padding: 48, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  validLeft: { flex: 1, minWidth: 280 },
  validTitle: { fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 900, color: BL, marginBottom: 12, letterSpacing: '-0.8px', lineHeight: 1.2 },
  validBody: { fontSize: 15, color: '#6B7280', lineHeight: 1.75, marginBottom: 24 },
  validBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  validBadge: { background: '#EFF6FF', borderRadius: 20, padding: '28px 36px', textAlign: 'center', border: `1px solid ${BLUE}20` },
  validBadgeTop: { display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  validBadgeFree: { display: 'block', fontSize: 52, fontWeight: 900, color: BLUE, letterSpacing: '-3px', lineHeight: 1, marginBottom: 4 },
  validBadgeBot: { display: 'block', fontSize: 11, color: '#9CA3AF', fontWeight: 600 },

  finalCta: { background: BLUE, padding: '100px 48px', textAlign: 'center' },
  finalInner: { maxWidth: 580, margin: '0 auto' },
  finalH2: { fontSize: 'clamp(26px, 4vw, 48px)', fontWeight: 900, color: WH, marginBottom: 16, letterSpacing: '-1.5px', lineHeight: 1.1 },
  finalSub: { fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: 40 },
  finalBtn: { padding: '16px 40px', background: WH, color: BLUE, border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },

  footer: { background: BL, padding: '40px 48px' },
  footerInner: { maxWidth: 1060, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  footerLogo: { fontSize: 18, fontWeight: 900, color: WH, letterSpacing: '-0.5px', marginBottom: 6 },
  footerTagline: { fontSize: 13, color: '#4B5563', maxWidth: 400, lineHeight: 1.6 },
  footerCredit: { fontSize: 13, color: '#6B7280' },
};
