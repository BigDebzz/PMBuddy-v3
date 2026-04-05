import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '../lib/analytics';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Reveal({ children, delay = 0 }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(24px)', transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s` }}>
      {children}
    </div>
  );
}

export default function LandingScreen({ onSelectMode, onLogin, onSignup, onDashboard, user }) {
  const [visible, setVisible] = useState(false);
  const [activeWho, setActiveWho] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => { setTimeout(() => setVisible(true), 60); }, []);
  useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 1800); return () => clearInterval(t); }, []);

  const handleSelect = (modeId) => { Analytics.modeSelected(modeId); onSelectMode(modeId); };

  const whoCards = [
    { label: 'Startup founders', outcome: 'Ship without falling apart', body: 'You are building fast and things keep slipping. PM Buddy keeps your team aligned, your timeline real and your risks visible before they become problems.' },
    { label: 'Solo builders', outcome: 'Build like a team of ten', body: 'No co-founder. No PM. No problem. PM Buddy gives you the structure and thinking that turns a solo effort into a professional project.' },
    { label: 'Non-technical founders', outcome: 'Lead your team with confidence', body: 'You do not need to understand code to run a project well. PM Buddy puts you in control without the jargon.' },
    { label: 'Corporate teams', outcome: 'Get everyone on the same page', body: 'Multiple people, multiple opinions, one goal. PM Buddy gives your team clarity on who owns what, what is due and how to communicate.' },
  ];

  const milestones = ['Customer interviews', 'MVP wireframes', 'First user test', 'Investor demo'];
  const activeMilestone = tick % milestones.length;

  return (
    <div style={s.page}>

      <div style={s.hero}>
        <div style={s.heroLeft}>
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
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

        <div style={{ ...s.heroRight, opacity: visible ? 1 : 0, transition: 'opacity 0.6s ease 0.3s' }}>
          <div style={s.projectCard}>
            <div style={s.cardHeader}>
              <div>
                <p style={s.cardTag}>Active project</p>
                <p style={s.cardName}>Fintech MVP — Lagos</p>
              </div>
              <span style={s.onTrack}>On track</span>
            </div>
            <div style={s.progressSection}>
              <div style={s.progressRow}>
                <span style={s.progressLbl}>Overall progress</span>
                <span style={s.progressPct}>64%</span>
              </div>
              <div style={s.progressTrack}>
                <div style={{ ...s.progressFill, width: '64%' }} />
              </div>
            </div>
            <p style={s.cardSectionLbl}>Milestones</p>
            {milestones.map((m, i) => (
              <div key={i} style={{ ...s.milestoneRow, background: activeMilestone === i ? '#EFF6FF' : 'transparent', transition: 'background 0.4s ease' }}>
                <div style={{ ...s.milestoneCheck, background: i < activeMilestone ? BLUE : WH, borderColor: i < activeMilestone ? BLUE : '#D1D5DB', transition: 'all 0.4s ease' }}>
                  {i < activeMilestone && <span style={{ color: WH, fontSize: 9, fontWeight: 900 }}>✓</span>}
                  {activeMilestone === i && <span style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE, display: 'block' }} />}
                </div>
                <span style={{ ...s.milestoneName, color: i < activeMilestone ? '#9CA3AF' : BL, textDecoration: i < activeMilestone ? 'line-through' : 'none', transition: 'all 0.4s ease' }}>{m}</span>
              </div>
            ))}
            <div style={s.riskBanner}>
              <span style={s.riskLbl}>Risks tracked</span>
              <span style={s.riskVal}>3 medium · 1 high</span>
            </div>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.inner}>
          <Reveal>
            <h2 style={s.h2}>Great ideas die from poor execution.</h2>
            <p style={s.lead}>You know what you want to build. But without someone managing how it gets built, things fall apart.</p>
          </Reveal>
          <div style={s.threeGrid}>
            {[
              { title: 'No one is in charge', body: 'Tasks get dropped because nobody owns them. Decisions happen twice because nobody documented the first one.' },
              { title: 'The plan keeps changing', body: 'New ideas keep getting added. The original goal gets buried and three months in you are building something nobody planned.' },
              { title: 'Nothing is documented', body: 'Everything lives in a WhatsApp chat. When something goes wrong there is no record of what was agreed.' },
            ].map((p, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div style={s.problemCard}>
                  <div style={s.problemLine} />
                  <p style={s.problemTitle}>{p.title}</p>
                  <p style={s.problemBody}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...s.section, background: BLUE }}>
        <div style={s.inner}>
          <Reveal>
            <h2 style={{ ...s.h2, color: WH }}>PM Buddy thinks like a PM so you do not have to.</h2>
            <p style={{ ...s.lead, color: 'rgba(255,255,255,0.8)' }}>You focus on building. PM Buddy handles the structure that keeps your project on track.</p>
          </Reveal>
          <div style={s.threeGrid}>
            {[
              { title: 'Structure from day one', body: 'Clear goal, realistic timeline and defined roles. No more starting blind.' },
              { title: 'Stay focused', body: 'Say no to scope creep. Say yes to the things that actually move your project forward.' },
              { title: 'Always ready to share', body: 'Your project plan and risk log are always up to date and shareable in one click.' },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div style={s.solutionCard}>
                  <p style={s.solutionTitle}>{c.title}</p>
                  <p style={s.solutionBody}>{c.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.inner}>
          <Reveal>
            <h2 style={s.h2}>Built for every kind of builder.</h2>
          </Reveal>
          <div style={s.whoLayout}>
            <div style={s.whoTabs}>
              {whoCards.map((w, i) => (
                <button key={i} style={{ ...s.whoTab, background: activeWho === i ? BLUE : WH, color: activeWho === i ? WH : BL, borderColor: activeWho === i ? BLUE : '#E5E7EB' }} onClick={() => setActiveWho(i)}>
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

      <div style={{ ...s.section, background: GREY }}>
        <div style={s.inner}>
          <Reveal>
            <h2 style={s.h2}>Up and running in minutes.</h2>
          </Reveal>
          <div style={s.fourGrid}>
            {[
              { num: '01', title: 'Tell PM Buddy what you are building', body: 'Describe your project, your goal and your team. PM Buddy sets up the structure automatically.' },
              { num: '02', title: 'Get your full project toolkit', body: 'Team roles, risk tracker, milestone plan and communication guide generated instantly.' },
              { num: '03', title: 'Build while PM Buddy watches your back', body: 'Track progress, manage risks and stay on schedule. Flags problems before they derail you.' },
              { num: '04', title: 'Get expert help when you need it', body: 'Book a real PM consultant directly from your dashboard when your project needs it.' },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={s.stepCard}>
                  <span style={s.stepNum}>{step.num}</span>
                  <p style={s.stepTitle}>{step.title}</p>
                  <p style={s.stepBody}>{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.inner}>
          <Reveal>
            <div style={s.validBanner}>
              <div style={s.validLeft}>
                <h3 style={s.validTitle}>Not sure if your idea is worth building?</h3>
                <p style={s.validBody}>Answer honest questions and get a report that tells you what is strong and what to fix. 10 minutes.</p>
                <div style={s.validBtns}>
                  <button style={s.primaryBtn} onClick={() => handleSelect('startup')}>Validate a startup idea</button>
                  <button style={s.outlineBtn} onClick={() => handleSelect('hackathon')}>Validate a hackathon idea</button>
                </div>
              </div>
              <div style={s.validBadge}>
                <span style={s.validTop}>Always</span>
                <span style={s.validFree}>Free</span>
                <span style={s.validBot}>No account needed</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div style={s.finalCta}>
        <Reveal>
          <div style={s.finalInner}>
            <h2 style={s.finalH2}>Start running your project like a professional.</h2>
            <p style={s.finalSub}>The thinking, structure and tools of a project manager without the cost of hiring one.</p>
            <button style={s.finalBtn} onClick={user ? onDashboard : onSignup}>
              {user ? 'Go to my projects' : 'Create your account'}
            </button>
          </div>
        </Reveal>
      </div>

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
  page: { minHeight: '100vh', background: WH, fontFamily: "'DM Sans', system-ui, sans-serif" },

  hero: { padding: '80px 48px', maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' },
  heroLeft: { flex: 1, minWidth: 300, maxWidth: 520 },
  heroRight: { flex: '0 0 auto' },
  headline: { fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, color: BL, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 20 },
  accent: { color: BLUE },
  heroSub: { fontSize: 17, color: '#4B5563', lineHeight: 1.8, marginBottom: 32, maxWidth: 460 },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  primaryBtn: { padding: '14px 28px', background: BLUE, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { padding: '14px 28px', background: WH, color: BL, border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { padding: '13px 24px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  heroNote: { fontSize: 13, color: '#9CA3AF' },
  textLink: { background: 'none', border: 'none', color: BLUE, fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' },

  projectCard: { background: WH, borderRadius: 20, padding: 24, width: 300, boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid #F0F0F0' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  cardTag: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 },
  cardName: { fontSize: 15, fontWeight: 800, color: BL, letterSpacing: '-0.3px' },
  onTrack: { fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#15803D', padding: '3px 10px', borderRadius: 100 },
  progressSection: { marginBottom: 16 },
  progressRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 7 },
  progressLbl: { fontSize: 11, color: '#9CA3AF', fontWeight: 600 },
  progressPct: { fontSize: 11, color: BLUE, fontWeight: 800 },
  progressTrack: { height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', background: BLUE, borderRadius: 3, transition: 'width 1s ease' },
  cardSectionLbl: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 },
  milestoneRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', marginBottom: 4, borderRadius: 8 },
  milestoneCheck: { width: 16, height: 16, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  milestoneName: { fontSize: 12, fontWeight: 600, flex: 1 },
  riskBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF2F2', borderRadius: 8, padding: '7px 10px', marginTop: 12 },
  riskLbl: { fontSize: 10, fontWeight: 700, color: '#9CA3AF' },
  riskVal: { fontSize: 11, fontWeight: 700, color: '#DC2626' },

  section: { padding: '80px 48px' },
  inner: { maxWidth: 1060, margin: '0 auto' },
  h2: { fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 900, color: BL, marginBottom: 14, letterSpacing: '-1px', lineHeight: 1.1 },
  lead: { fontSize: 16, color: '#4B5563', lineHeight: 1.8, maxWidth: 520, marginBottom: 40 },

  threeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 },
  fourGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 28, marginTop: 40 },

  problemCard: { background: GREY, borderRadius: 16, padding: 28, border: '1px solid #E5E7EB' },
  problemLine: { width: 32, height: 3, background: BLUE, borderRadius: 2, marginBottom: 16 },
  problemTitle: { fontSize: 15, fontWeight: 800, color: BL, marginBottom: 8 },
  problemBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },

  solutionCard: { background: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 28, border: '1px solid rgba(255,255,255,0.22)' },
  solutionTitle: { fontSize: 15, fontWeight: 800, color: WH, marginBottom: 8 },
  solutionBody: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75 },

  whoLayout: { display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 36 },
  whoTabs: { display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 auto', minWidth: 200 },
  whoTab: { padding: '13px 20px', border: '1.5px solid', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' },
  whoDetail: { flex: 1, minWidth: 280, background: GREY, borderRadius: 20, padding: 32 },
  whoOutcome: { fontSize: 20, fontWeight: 900, color: BLUE, letterSpacing: '-0.5px', marginBottom: 12 },
  whoBody: { fontSize: 15, color: '#374151', lineHeight: 1.75, marginBottom: 24 },

  stepCard: {},
  stepNum: { display: 'inline-block', fontSize: 11, fontWeight: 900, color: BLUE, background: '#EFF6FF', borderRadius: 8, padding: '4px 10px', marginBottom: 14 },
  stepTitle: { fontSize: 15, fontWeight: 800, color: BL, marginBottom: 8 },
  stepBody: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },

  validBanner: { background: GREY, borderRadius: 24, padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', border: '1px solid #E5E7EB' },
  validLeft: { flex: 1, minWidth: 280 },
  validTitle: { fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: BL, marginBottom: 12, letterSpacing: '-0.8px', lineHeight: 1.2 },
  validBody: { fontSize: 15, color: '#6B7280', lineHeight: 1.75, marginBottom: 24 },
  validBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  validBadge: { background: '#EFF6FF', borderRadius: 20, padding: '28px 36px', textAlign: 'center', border: `1px solid ${BLUE}20` },
  validTop: { display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 },
  validFree: { display: 'block', fontSize: 52, fontWeight: 900, color: BLUE, letterSpacing: '-3px', lineHeight: 1, marginBottom: 4 },
  validBot: { display: 'block', fontSize: 11, color: '#9CA3AF', fontWeight: 600 },

  finalCta: { background: BLUE, padding: '100px 48px', textAlign: 'center' },
  finalInner: { maxWidth: 560, margin: '0 auto' },
  finalH2: { fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, color: WH, marginBottom: 16, letterSpacing: '-1px', lineHeight: 1.1 },
  finalSub: { fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: 36 },
  finalBtn: { padding: '16px 40px', background: WH, color: BLUE, border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },

  footer: { background: BL, padding: '40px 48px' },
  footerInner: { maxWidth: 1060, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  footerLogo: { fontSize: 18, fontWeight: 900, color: WH, letterSpacing: '-0.5px', marginBottom: 6 },
  footerTagline: { fontSize: 13, color: '#4B5563', maxWidth: 400, lineHeight: 1.6 },
  footerCredit: { fontSize: 13, color: '#6B7280' },
};
