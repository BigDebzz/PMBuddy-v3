import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '../lib/analytics';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const MUTED = '#6B7280';
const RULE = '#E5E7EB';

function useInView(threshold = 0.1) {
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
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(16px)', transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function line(visible, delay) {
  return {
    display: 'block',
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(22px)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
    willChange: 'opacity, transform',
  };
}

export default function LandingScreen({ onSelectMode, onLogin, onSignup, onDashboard, user }) {
  const [visible, setVisible] = useState(false);
  const [activeWho, setActiveWho] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);
  useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 2000); return () => clearInterval(t); }, []);

  const handleSelect = (modeId) => { Analytics.modeSelected(modeId); onSelectMode(modeId); };

  const milestones = ['Customer Interviews', 'MVP Wireframes', 'First User Test', 'Investor Demo'];
  const active = tick % milestones.length;

  const whoCards = [
    { label: 'Startup Founders', outcome: 'Ship without falling apart', body: 'You are building fast and things keep slipping. PM Buddy keeps your team aligned, your timeline real and your risks visible before they become problems.' },
    { label: 'Solo Builders', outcome: 'Build like a team of ten', body: 'No co-founder. No PM. No problem. PM Buddy gives you the structure that turns a solo effort into a professional project.' },
    { label: 'Non-Technical Founders', outcome: 'Lead your team with confidence', body: 'You do not need to understand code to run a project well. PM Buddy puts you in control without the jargon.' },
    { label: 'Corporate Teams', outcome: 'Get everyone on the same page', body: 'Multiple people, multiple opinions, one goal. PM Buddy gives your team clarity on who owns what, what is due and how to communicate.' },
  ];

  return (
    <div style={s.page}>

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroLeft}>

          <p style={{ ...s.heroEyebrow, ...line(visible, 0) }}>
            Project Management
          </p>

          <h1 style={s.heroH1}>
            <span style={line(visible, 0.15)}>Think, Plan and Execute</span>
            <span style={{ ...line(visible, 0.35), color: BLUE }}>Like a Professional PM</span>
            <span style={line(visible, 0.55)}>Without Being One.</span>
          </h1>

          <p style={{ ...s.heroSub, ...line(visible, 0.75) }}>
            Most projects fail not because of bad ideas but because nobody is running them properly. PM Buddy is the thinking partner every builder needs.
          </p>

          <div style={{ ...s.heroCtas, ...line(visible, 0.9) }}>
            {user ? (
              <button style={s.ctaPrimary} onClick={onDashboard}>Go to my projects</button>
            ) : (
              <>
                <button style={s.ctaPrimary} onClick={onSignup}>Start your first project</button>
                <button style={s.ctaGhost} onClick={onLogin}>Log in</button>
              </>
            )}
          </div>

          {!user && (
            <p style={{ ...s.heroNote, ...line(visible, 1.05) }}>
              Not sure if your idea is worth building?{' '}
              <button style={s.inlineLink} onClick={() => handleSelect('startup')}>Validate it first, it is free</button>
            </p>
          )}

        </div>

        <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.4s', flexShrink: 0 }}>
          <div style={s.projectCard}>
            <div style={s.pcTop}>
              <div>
                <p style={s.pcLabel}>Active Project</p>
                <p style={s.pcName}>Fintech MVP — Lagos</p>
              </div>
              <span style={s.pcStatus}>On Track</span>
            </div>
            <div style={s.pcProg}>
              <div style={s.pcProgRow}>
                <span style={s.pcProgLbl}>Progress</span>
                <span style={s.pcProgPct}>64%</span>
              </div>
              <div style={s.pcProgTrack}>
                <div style={{ height: '100%', width: '64%', background: BLUE, borderRadius: 2 }} />
              </div>
            </div>
            <p style={s.pcMilestonesLbl}>Milestones</p>
            {milestones.map((m, i) => (
              <div key={i} style={{ ...s.pcMile, background: active === i ? '#EFF6FF' : 'transparent', transition: 'background 0.4s' }}>
                <div style={{ ...s.pcCheck, background: i < active ? BLUE : WH, borderColor: i < active ? BLUE : '#D1D5DB', transition: 'all 0.4s' }}>
                  {i < active && <span style={{ color: WH, fontSize: 9, fontWeight: 700 }}>✓</span>}
                  {active === i && <span style={{ width: 5, height: 5, borderRadius: '50%', background: BLUE, display: 'block' }} />}
                </div>
                <span style={{ ...s.pcMileName, color: i < active ? '#9CA3AF' : BL, textDecoration: i < active ? 'line-through' : 'none', transition: 'all 0.4s' }}>{m}</span>
              </div>
            ))}
            <div style={s.pcRisk}>
              <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>Risks tracked</span>
              <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>3 medium · 1 high</span>
            </div>
          </div>
        </div>
      </div>

      <div style={s.rule} />

      {/* PROBLEM */}
      <div style={s.section}>
        <div style={s.sectionInner}>
          <Reveal>
            <div style={s.twoCol}>
              <div style={s.twoColLeft}>
                <p style={s.eyebrow}>The Problem</p>
                <h2 style={s.h2}>Great Ideas Die From Poor Execution.</h2>
              </div>
              <div style={s.twoColRight}>
                <p style={s.bodyText}>You know what you want to build. But without someone managing how it gets built, things fall apart. Deadlines slip. Scope grows. The team loses direction.</p>
                <div style={s.problemList}>
                  {[
                    { title: 'No one is in charge', body: 'Tasks get dropped because nobody owns them.' },
                    { title: 'The plan keeps changing', body: 'New ideas keep getting added until the original goal is gone.' },
                    { title: 'Nothing is documented', body: 'Everything lives in a WhatsApp chat. When things go wrong there is no record.' },
                  ].map((p, i) => (
                    <div key={i} style={s.problemItem}>
                      <div style={s.problemDot} />
                      <div>
                        <p style={s.problemTitle}>{p.title}</p>
                        <p style={s.problemBody}>{p.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div style={s.rule} />

      {/* SOLUTION */}
      <div style={{ ...s.section, background: BL }}>
        <div style={s.sectionInner}>
          <Reveal>
            <div style={s.twoCol}>
              <div style={s.twoColLeft}>
                <p style={{ ...s.eyebrow, color: BLUE }}>The Solution</p>
                <h2 style={{ ...s.h2, color: WH }}>PM Buddy Thinks Like a PM So You Do Not Have To.</h2>
              </div>
              <div style={s.twoColRight}>
                <p style={{ ...s.bodyText, color: '#9CA3AF' }}>You focus on building. PM Buddy handles the structure, the risks, the documentation and the communication that keeps your project on track from start to finish.</p>
                <div style={s.solutionGrid}>
                  {[
                    { title: 'Structure from day one', body: 'Clear goal, realistic timeline and defined roles.' },
                    { title: 'Stay focused', body: 'Say no to scope creep. Say yes to what actually matters.' },
                    { title: 'Always ready to share', body: 'Your project plan is always up to date and shareable.' },
                    { title: 'Expert support on demand', body: 'Book a real PM consultant when your project needs it.' },
                  ].map((c, i) => (
                    <div key={i} style={s.solutionItem}>
                      <p style={s.solutionTitle}>{c.title}</p>
                      <p style={s.solutionBody}>{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div style={{ ...s.rule, borderColor: '#1F1F1F' }} />

      {/* WHO */}
      <div style={s.section}>
        <div style={s.sectionInner}>
          <Reveal>
            <p style={s.eyebrow}>Who It Is For</p>
            <h2 style={{ ...s.h2, marginBottom: 40 }}>Built for Every Kind of Builder.</h2>
          </Reveal>
          <div style={s.whoLayout}>
            <div style={s.whoTabs}>
              {whoCards.map((w, i) => (
                <button
                  key={i}
                  style={{ ...s.whoTab, borderLeftColor: activeWho === i ? BLUE : 'transparent', color: activeWho === i ? BL : MUTED, fontWeight: activeWho === i ? 600 : 400 }}
                  onClick={() => setActiveWho(i)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div style={s.whoDetail}>
              <p style={s.whoOutcome}>{whoCards[activeWho].outcome}</p>
              <p style={s.whoBody}>{whoCards[activeWho].body}</p>
              <button style={s.ctaPrimary} onClick={user ? onDashboard : onSignup}>
                {user ? 'Go to my projects' : 'Get started'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={s.rule} />

      {/* HOW IT WORKS */}
      <div style={s.section}>
        <div style={s.sectionInner}>
          <Reveal>
            <p style={s.eyebrow}>How It Works</p>
            <h2 style={{ ...s.h2, marginBottom: 48 }}>Up and Running in Minutes.</h2>
          </Reveal>
          <div style={s.stepsGrid}>
            {[
              { num: '01', title: 'Tell PM Buddy what you are building', body: 'Describe your project, your goal and your team. PM Buddy sets up the structure automatically.' },
              { num: '02', title: 'Get your full project toolkit', body: 'Team roles, risk tracker, milestone plan and communication guide generated instantly.' },
              { num: '03', title: 'Build while PM Buddy watches your back', body: 'Track progress, manage risks and stay on schedule.' },
              { num: '04', title: 'Get expert help when you need it', body: 'Book a real PM consultant directly from your dashboard.' },
            ].map((step, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div style={s.stepItem}>
                  <p style={s.stepNum}>{step.num}</p>
                  <p style={s.stepTitle}>{step.title}</p>
                  <p style={s.stepBody}>{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div style={s.rule} />

      {/* VALIDATION */}
      <div style={s.section}>
        <div style={s.sectionInner}>
          <Reveal>
            <div style={s.validRow}>
              <div style={s.validLeft}>
                <p style={s.eyebrow}>Not Sure Where to Start?</p>
                <h3 style={s.validH3}>Validate Your Idea Before You Commit to Building It.</h3>
                <p style={s.bodyText}>Answer honest questions about your idea and get a report that tells you what is strong, what is missing and what to do next. Takes 10 minutes.</p>
                <div style={s.validBtns}>
                  <button style={s.ctaPrimary} onClick={() => handleSelect('startup')}>Validate a startup idea</button>
                  <button style={s.ctaOutline} onClick={() => handleSelect('hackathon')}>Validate a hackathon idea</button>
                </div>
              </div>
              <div style={s.validBadge}>
                <span style={s.validBadgeWord}>Always</span>
                <span style={s.validBadgeFree}>Free</span>
                <span style={s.validBadgeSub}>No account needed</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <div style={s.rule} />

      {/* FINAL CTA */}
      <div style={s.finalCta}>
        <div style={s.sectionInner}>
          <Reveal>
            <h2 style={s.finalH2}>Start Running Your Project Like a Professional.</h2>
            <p style={{ ...s.bodyText, color: 'rgba(255,255,255,0.65)', maxWidth: 480, marginBottom: 36 }}>
              The thinking, structure and tools of a project manager without the cost of hiring one.
            </p>
            <button style={s.ctaWhite} onClick={user ? onDashboard : onSignup}>
              {user ? 'Go to my projects' : 'Create your account'}
            </button>
          </Reveal>
        </div>
      </div>

      {/* FOOTER */}
      <div style={s.footer}>
        <div style={s.sectionInner}>
          <div style={s.footerInner}>
            <div>
              <p style={s.footerLogo}>PM Buddy</p>
              <p style={s.footerTagline}>PM Buddy helps you think, plan and execute like a professional PM without being one.</p>
            </div>
            <p style={s.footerCredit}>Built by <strong style={{ color: '#E5E7EB' }}>Deborah Akpokighe</strong></p>
          </div>
        </div>
      </div>

    </div>
  );
}

const s = {
  page: { background: WH, fontFamily: "'DM Sans', 'Outfit', system-ui, sans-serif", color: BL },

  hero: { maxWidth: 1100, margin: '0 auto', padding: '80px 48px 72px', display: 'flex', alignItems: 'center', gap: 72, flexWrap: 'wrap' },
  heroLeft: { flex: 1, minWidth: 300, maxWidth: 520 },
  heroEyebrow: { fontSize: 11, fontWeight: 500, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 20 },
  heroH1: { fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 500, color: BL, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 22 },
  heroSub: { fontSize: 16, color: MUTED, lineHeight: 1.8, marginBottom: 32, maxWidth: 440 },
  heroCtas: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 },
  heroNote: { fontSize: 13, color: '#9CA3AF' },
  inlineLink: { background: 'none', border: 'none', color: BLUE, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 },

  ctaPrimary: { padding: '11px 24px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  ctaGhost: { padding: '11px 24px', background: 'transparent', color: BL, border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  ctaOutline: { padding: '11px 24px', background: 'transparent', color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  ctaWhite: { padding: '12px 28px', background: WH, color: BL, border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  projectCard: { background: WH, borderRadius: 12, padding: 22, width: 288, border: '1px solid #E5E7EB', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
  pcTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pcLabel: { fontSize: 9, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 },
  pcName: { fontSize: 14, fontWeight: 600, color: BL, letterSpacing: '-0.2px' },
  pcStatus: { fontSize: 10, fontWeight: 600, background: '#F0FDF4', color: '#15803D', padding: '3px 9px', borderRadius: 100 },
  pcProg: { marginBottom: 16 },
  pcProgRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 7 },
  pcProgLbl: { fontSize: 10, color: '#9CA3AF', fontWeight: 500 },
  pcProgPct: { fontSize: 10, color: BLUE, fontWeight: 700 },
  pcProgTrack: { height: 3, background: '#F3F4F6', borderRadius: 2, overflow: 'hidden' },
  pcMilestonesLbl: { fontSize: 9, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  pcMile: { display: 'flex', alignItems: 'center', gap: 9, padding: '5px 7px', marginBottom: 3, borderRadius: 6 },
  pcCheck: { width: 15, height: 15, borderRadius: '50%', border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pcMileName: { fontSize: 12, fontWeight: 500, flex: 1 },
  pcRisk: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF2F2', borderRadius: 6, padding: '6px 10px', marginTop: 12 },

  rule: { borderTop: `1px solid ${RULE}`, margin: '0 48px' },

  section: { padding: '80px 48px' },
  sectionInner: { maxWidth: 1060, margin: '0 auto' },
  eyebrow: { fontSize: 11, fontWeight: 500, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 14 },
  h2: { fontSize: 'clamp(24px, 3.5vw, 40px)', fontWeight: 500, color: BL, letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 20 },
  bodyText: { fontSize: 15, color: MUTED, lineHeight: 1.8, marginBottom: 28 },

  twoCol: { display: 'flex', gap: 64, flexWrap: 'wrap' },
  twoColLeft: { flex: '0 0 260px', minWidth: 200 },
  twoColRight: { flex: 1, minWidth: 280 },

  problemList: { display: 'flex', flexDirection: 'column', gap: 24 },
  problemItem: { display: 'flex', gap: 16, alignItems: 'flex-start' },
  problemDot: { width: 6, height: 6, borderRadius: '50%', background: BLUE, flexShrink: 0, marginTop: 7 },
  problemTitle: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 4 },
  problemBody: { fontSize: 14, color: MUTED, lineHeight: 1.65 },

  solutionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 },
  solutionItem: { borderTop: '1px solid #2A2A2A', paddingTop: 16 },
  solutionTitle: { fontSize: 14, fontWeight: 600, color: WH, marginBottom: 6 },
  solutionBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  whoLayout: { display: 'flex', gap: 48, flexWrap: 'wrap' },
  whoTabs: { display: 'flex', flexDirection: 'column', gap: 0, flex: '0 0 220px' },
  whoTab: { padding: '12px 16px', background: 'none', border: 'none', borderLeft: '2px solid transparent', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' },
  whoDetail: { flex: 1, minWidth: 280 },
  whoOutcome: { fontSize: 20, fontWeight: 500, color: BLUE, letterSpacing: '-0.3px', marginBottom: 14 },
  whoBody: { fontSize: 15, color: MUTED, lineHeight: 1.8, marginBottom: 28 },

  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40 },
  stepItem: { borderTop: `1px solid ${RULE}`, paddingTop: 20 },
  stepNum: { fontSize: 12, fontWeight: 500, color: BLUE, letterSpacing: '0.05em', marginBottom: 12 },
  stepTitle: { fontSize: 15, fontWeight: 500, color: BL, marginBottom: 8, lineHeight: 1.4 },
  stepBody: { fontSize: 13, color: MUTED, lineHeight: 1.7 },

  validRow: { display: 'flex', alignItems: 'flex-start', gap: 64, flexWrap: 'wrap' },
  validLeft: { flex: 1, minWidth: 280 },
  validH3: { fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 500, color: BL, marginBottom: 14, letterSpacing: '-0.3px', lineHeight: 1.2 },
  validBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  validBadge: { flex: '0 0 auto', background: '#EFF6FF', borderRadius: 12, padding: '28px 36px', textAlign: 'center', border: `1px solid ${BLUE}20` },
  validBadgeWord: { display: 'block', fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 },
  validBadgeFree: { display: 'block', fontSize: 48, fontWeight: 300, color: BLUE, letterSpacing: '-3px', lineHeight: 1, marginBottom: 4 },
  validBadgeSub: { display: 'block', fontSize: 11, color: '#9CA3AF' },

  finalCta: { background: BL, padding: '96px 48px' },
  finalH2: { fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 500, color: WH, marginBottom: 14, letterSpacing: '-0.5px', lineHeight: 1.1 },

  footer: { background: '#0A0A0A', padding: '40px 48px', borderTop: '1px solid #1A1A1A' },
  footerInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 },
  footerLogo: { fontSize: 16, fontWeight: 600, color: WH, letterSpacing: '-0.3px', marginBottom: 6 },
  footerTagline: { fontSize: 13, color: '#4B5563', maxWidth: 360, lineHeight: 1.6 },
  footerCredit: { fontSize: 12, color: '#4B5563' },
};
