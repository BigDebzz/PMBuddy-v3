import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '../lib/analytics';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';
import { clearConsent } from '../lib/consent';

const RING_R = 46;
const RING_LEN = 2 * Math.PI * RING_R;

const AVATAR = { a1: '#E8501F', a2: '#1D75DE', a3: '#17A57F', a4: '#C9488F' };

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
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(18px)', transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function Chip({ tone, icon, children }) {
  const tones = {
    ok: { background: 'var(--ok-tint)', color: 'var(--ok-text)' },
    warn: { background: 'var(--warn-tint)', color: 'var(--warn-text)' },
    bad: { background: 'var(--bad-tint)', color: 'var(--bad-text)' },
    none: { background: 'var(--surface-2)', color: 'var(--text-2)' },
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', ...(tones[tone] || tones.none) }}>
      {icon && <Icon name={icon} size={14} />}{children}
    </span>
  );
}

function Avatar({ tone, children }) {
  return <span style={{ display: 'inline-grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50%', fontSize: 12, fontWeight: 800, color: '#FFFFFF', background: AVATAR[tone], flexShrink: 0 }}>{children}</span>;
}

// ---------- the hero picture: one clean board, drawn from sample data ----------
const BOARD = [
  { h: 'To do', cards: [{ t: 'Order banners and signage', tone: 'warn', due: 'Fri', who: ['a4', 'IK'] }] },
  { h: 'In progress', cards: [
    { t: 'Book venue for distribution day', tone: 'bad', due: 'Today', who: ['a1', 'AO'] },
    { t: 'Confirm 12 volunteers', tone: 'warn', due: 'Tomorrow', who: ['a3', 'CE'] },
  ] },
  { h: 'Done', cards: [{ t: 'Set the budget', tone: 'ok', due: 'Done', who: ['a2', 'TB'] }] },
];

function HeroWindow() {
  return (
    <div className="lp-sky lp-herovis" style={s.heroVis}>
      <div style={s.win}>
        <div style={s.winBar}>
          Community Food Drive
          <span style={{ marginLeft: 'auto' }}><Chip tone="ok" icon="check-circle">On track</Chip></span>
        </div>
        <div className="lp-kan" style={{ padding: 16 }}>
          {BOARD.map(col => (
            <div key={col.h} style={s.col}>
              <div style={s.colHead}><span>{col.h}</span><span>{col.cards.length}</span></div>
              {col.cards.map(c => (
                <div key={c.t} style={s.kcard}>
                  <span>{c.t}</span>
                  <div style={s.cardRow}>
                    <Chip tone={c.tone} icon={c.tone === 'ok' ? 'check-circle' : 'clock'}>{c.due}</Chip>
                    <Avatar tone={c.who[0]}>{c.who[1]}</Avatar>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- the tour: one document in, a full project out ----------
const FOUND = [
  { icon: 'flag', label: 'Goal', n: 1 },
  { icon: 'calendar', label: 'Milestones', n: 4 },
  { icon: 'alert', label: 'Risks', n: 3 },
  { icon: 'users', label: 'People involved', n: 5 },
];
const START_TASKS = [
  { t: 'Book venue for distribution day', c: 1 }, { t: 'Confirm 12 volunteers', c: 1 },
  { t: 'Order banners and signage', c: 0 }, { t: 'Collect donations from sponsors', c: 0 },
  { t: 'Set the budget', c: 2 }, { t: 'Invite the team', c: 2 },
];
const COLS = ['To do', 'In progress', 'Done'];
const STEPS = [
  { tab: 'Upload', title: 'Upload', body: 'A plan, proposal or brief. PDF, Word, Excel or pasted text.' },
  { tab: 'Read', title: 'Read', body: 'The goal, milestones, risks and people are pulled out of the document.' },
  { tab: 'Work', title: 'Work', body: 'Move tasks across the board. Reminders go out when things are due.' },
];

function Tour() {
  const [step, setStep] = useState(0);
  const [shown, setShown] = useState(0);
  const [tasks, setTasks] = useState(START_TASKS);

  useEffect(() => {
    if (step !== 1) return undefined;
    setShown(0);
    const ids = FOUND.map((_, i) => setTimeout(() => setShown(i + 1), 500 + i * 650));
    ids.push(setTimeout(() => setStep(2), 500 + FOUND.length * 650 + 900));
    return () => ids.forEach(clearTimeout);
  }, [step]);

  const go = (n) => { if (n === 2) setTasks(START_TASKS); setStep(n); };
  const advance = (i) => setTasks(prev => prev.map((t, k) => (k === i && t.c < 2 ? { ...t, c: t.c + 1 } : t)));
  const done = tasks.filter(t => t.c === 2).length;
  const pct = Math.round((done / tasks.length) * 100);
  const current = STEPS[step];

  return (
    <div style={s.tour}>
      <div style={s.tourSteps} role="tablist" aria-label="Tour steps">
        {STEPS.map((st, i) => (
          <React.Fragment key={st.tab}>
            {i > 0 && <span style={{ width: 22, height: 1, background: 'var(--border-strong)' }} />}
            <button type="button" role="tab" aria-selected={step === i} onClick={() => go(i)}
              style={{ ...s.stepBtn, ...(step === i ? s.stepOn : null) }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: step >= i ? 'var(--accent)' : 'var(--border-strong)' }} />{st.tab}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div style={{ padding: 'clamp(20px, 4vw, 34px)', minHeight: 400, display: 'grid', alignContent: 'start', gap: 24 }}>
        <div>
          <h3 style={{ fontSize: 'clamp(18px, 2vw, 22px)', fontWeight: 700 }}>{current.title}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 4, maxWidth: 560 }}>{current.body}</p>
        </div>

        {step === 0 && (
          <div style={{ maxWidth: 560, marginInline: 'auto', textAlign: 'center', display: 'grid', gap: 18, justifyItems: 'center', width: '100%' }}>
            <div style={s.dropzone}>
              <Icon name="upload" size={36} style={{ color: 'var(--accent-text)' }} />
              <h4 style={{ fontSize: 'clamp(17px, 2vw, 20px)', fontWeight: 700 }}>Drop your document here</h4>
            </div>
            <div style={{ display: 'grid', gap: 8, justifyItems: 'center', width: '100%' }}>
              <span style={{ position: 'relative', display: 'inline-flex', maxWidth: '100%' }}>
                <button type="button" className="lp-btn lp-btn-primary" onClick={() => go(1)}>Try it with a sample plan <Icon name="arrow-right" size={18} /></button>
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 14 }}>No sign-up</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="lp-read">
            <div style={s.docpage} aria-hidden="true">
              {[54, 100, 92, 78, 54, 100, 85, 94, 60].map((w, i) => (
                <div key={i} style={{ height: i === 0 || i === 4 ? 13 : 9, width: `${w}%`, borderRadius: 99, background: i === 0 || i === 4 ? 'var(--border-strong)' : 'var(--surface-3)', marginTop: i === 4 ? 10 : 0 }} />
              ))}
            </div>
            <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
              {FOUND.map((f, i) => (
                <div key={f.label} style={{ ...s.found, opacity: shown > i ? 1 : 0, transform: shown > i ? 'none' : 'translateY(10px)' }}>
                  <Icon name={f.icon} size={18} style={{ color: 'var(--ok-text)' }} />{f.label}
                  <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-head)', fontSize: 18 }}>{f.n}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="lp-run">
            <div style={s.ringBox}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg viewBox="0 0 100 100" width="120" height="120" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
                  <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={RING_LEN} strokeDashoffset={RING_LEN * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
                </svg>
                <b style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-head)', fontSize: 28 }}>{pct}%</b>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>{pct === 100 ? 'Everything is done.' : `${done} of ${tasks.length} tasks done`}</span>
            </div>
            <div className="lp-kan">
              {COLS.map((name, c) => (
                <div key={name} style={s.col}>
                  <div style={s.colHead}><span>{name}</span><span>{tasks.filter(t => t.c === c).length}</span></div>
                  {tasks.map((t, i) => t.c === c && (
                    <button key={t.t} type="button" onClick={() => advance(i)} style={s.tcard} aria-label={c < 2 ? `Move ${t.t} forward` : t.t}>
                      {t.t}
                      {c < 2
                        ? <span style={s.moveChip}>Move forward <Icon name="arrow-right" size={13} /></span>
                        : <Chip tone="ok" icon="check-circle">Done</Chip>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={s.tourFoot}>
        <span>Sample data. Nothing is saved.</span>
        {step === 2 && <button type="button" style={s.replay} onClick={() => go(0)}>Replay</button>}
      </div>
    </div>
  );
}

// The demo video starts loading just before it scrolls into view, so it is ready when someone presses play.
function DemoVideo() {
  const ref = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNear(true); return undefined; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); obs.disconnect(); } }, { rootMargin: '600px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <video ref={ref} controls playsInline preload={near ? 'auto' : 'none'} poster="/demo/poster.jpg" style={{ width: '100%', display: 'block', background: '#171412' }}>
      <source src="/demo/pmbuddy-demo.mp4" type="video/mp4" />
      Your browser cannot play this video.
    </video>
  );
}

export default function LandingScreen({ onSelectMode, onSignup, onDashboard, user }) {
  const start = user ? onDashboard : onSignup;
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
  const validate = () => { Analytics.modeSelected('startup'); onSelectMode('startup'); };

  const gets = [
    { icon: 'board', title: 'Tasks, milestones and risks', body: 'Kept on one board that the whole team can see.' },
    { icon: 'bell', title: 'Daily reminders', body: 'One email each morning, only when something is due or overdue.' },
    { icon: 'download', title: 'Status reports', body: 'Team updates, funder reports and investor updates drawn from the live project, as Word or PDF.' },
  ];

  return (
    <div style={s.page}>

      <div style={s.rainbow} />
      <div style={s.section}>
        <div className="lp-hero" style={s.inner}>
          <div>
            <h1 style={s.h1}>Upload your project document. Get a working project dashboard in minutes.</h1>
            <p style={s.sub}>Built for coordinators and program managers who are done with scattered updates and last-minute reports.</p>
            <div style={s.ctas}>
              <button type="button" className="lp-btn lp-btn-primary" onClick={start}>{user ? 'Go to my projects' : 'Try it free'} <Icon name="arrow-right" size={18} /></button>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={() => scrollTo('how-it-works')}>See how it works</button>
            </div>
            <p style={s.note}>No forms. No project management experience needed.</p>
          </div>
          <HeroWindow />
        </div>
      </div>

      <div id="how-it-works" style={s.section}>
        <div style={s.inner}>
          <Reveal><h2 style={{ ...s.h2, marginBottom: 32 }}>From document to project board</h2></Reveal>
          <Tour />
        </div>
      </div>

      <div style={s.section}>
        <div style={s.inner}>
          <Reveal><h2 style={s.h2}>What you get</h2></Reveal>
          <div className="lp-grid lp-grid3" style={{ marginTop: 40 }}>
            {gets.map(f => (
              <div key={f.title} className="lp-feat">
                <span className="lp-ficon" style={s.featIcon}><Icon name={f.icon} size={20} /></span>
                <h3 style={{ fontSize: 'clamp(17px, 1.6vw, 19px)', fontWeight: 700, margin: '16px 0 6px' }}>{f.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.55 }}>{f.body}</p>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 15, marginTop: 20 }}>Also included: a project health check, and an assistant that answers questions about your project.</p>
        </div>
      </div>

      <div style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <p style={s.who}>For coordinators, program managers, nonprofits and small teams who deliver projects without a dedicated project manager.</p>
        </div>
      </div>

      <div id="demo" style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <Reveal><h2 style={s.h2}>Watch the demo</h2></Reveal>
          <p style={{ color: 'var(--muted)', fontSize: 16, lineHeight: 1.6, marginTop: 10, maxWidth: 620 }}>See PM Buddy turn a concept note into a working project, with suggested tasks and a funder report.</p>
          <div style={s.videoWrap}>
            <DemoVideo />
          </div>
        </div>
      </div>

      <div style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <div className="lp-sky" style={s.finalCta}>
            <h2 style={{ ...s.h2, color: 'var(--text)', maxWidth: 560, marginBottom: 28 }}>Set up your first project.</h2>
            <button type="button" className="lp-btn lp-btn-primary" style={{ width: 'auto' }} onClick={start}>{user ? 'Go to my projects' : 'Try it free'} <Icon name="arrow-right" size={18} /></button>
            {!user && (
              <p style={{ color: 'var(--text-2)', fontSize: 15, marginTop: 20 }}>
                Not sure your idea is worth building yet?{' '}
                <button type="button" style={s.link} onClick={validate}>Validate it first, free, no account needed.</button>
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <div style={{ ...s.inner, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontSize: 15, color: 'var(--muted)' }}><b style={{ fontFamily: 'var(--font-head)', color: 'var(--text)', fontWeight: 800 }}>PM Buddy.</b> Project management for anyone with a project to deliver.</p>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={{ ...s.footLink, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }} onClick={() => scrollTo('demo')}>Watch demo</button>
            <a href="/about.html" style={s.footLink}>About</a>
            <a href="/privacy.html" style={s.footLink}>Privacy</a>
            <a href="/terms.html" style={s.footLink}>Terms</a>
            <button type="button" style={{ ...s.footLink, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }} onClick={clearConsent}>Cookie settings</button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden' },
  rainbow: { height: 2, background: 'var(--accent)' },
  section: { padding: 'clamp(56px, 8vw, 96px) 24px' },
  inner: { maxWidth: 1200, margin: '0 auto' },
  h1: { fontSize: 'clamp(26px, 3.6vw, 46px)', lineHeight: 1.08, fontWeight: 600, letterSpacing: '-0.04em', margin: '0 0 20px' },
  h2: { fontSize: 'clamp(22px, 2.8vw, 34px)', lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.035em', maxWidth: 780 },
  sub: { fontSize: 'clamp(15px, 1.4vw, 17px)', lineHeight: 1.65, color: 'var(--muted)', maxWidth: 520 },
  ctas: { display: 'flex', gap: 14, flexWrap: 'wrap', margin: '28px 0 16px' },
  note: { fontSize: 15, color: 'var(--muted)' },
  link: { background: 'none', border: 'none', padding: 0, color: 'var(--accent-text)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left' },
  who: { fontSize: 'clamp(17px, 1.8vw, 21px)', lineHeight: 1.55, fontWeight: 600, letterSpacing: '-0.01em', maxWidth: 760 },

  heroVis: { position: 'relative', overflow: 'hidden', borderRadius: 12, padding: 'clamp(24px, 4vw, 40px)' },
  floatCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: 'var(--shadow-lg)' },
  floatIcon: { width: 36, height: 36, borderRadius: 12, display: 'grid', placeItems: 'center', flexShrink: 0 },
  win: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  winBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 15 },
  dotI: { width: 11, height: 11, borderRadius: '50%', background: 'var(--surface-3)', display: 'inline-block' },
  col: { background: 'var(--surface-2)', borderRadius: 8, padding: 12, display: 'grid', gap: 10, alignContent: 'start' },
  colHead: { display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--muted)' },
  kcard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontWeight: 600, fontSize: 14, lineHeight: 1.35, display: 'grid', gap: 10, alignContent: 'space-between', minHeight: 92 },
  cardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  tour: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  tourSteps: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  stepBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 0, color: 'var(--muted)', fontWeight: 700, fontSize: 15, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' },
  stepOn: { background: 'var(--surface-2)', color: 'var(--text)' },
  dropzone: { width: '100%', border: '1px dashed var(--border-strong)', borderRadius: 10, padding: '36px 20px', display: 'grid', gap: 10, justifyItems: 'center' },
  docpage: { position: 'relative', overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, display: 'grid', gap: 10, alignContent: 'start' },
  found: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 15, fontWeight: 600, transition: 'opacity 0.4s ease, transform 0.4s ease' },
  ringBox: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, display: 'grid', justifyItems: 'center', gap: 10 },
  tcard: { textAlign: 'left', width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', color: 'var(--text)', fontWeight: 600, fontSize: 14, lineHeight: 1.35, cursor: 'pointer', display: 'grid', gap: 8, fontFamily: 'inherit' },
  moveChip: { justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--accent-tint)', color: 'var(--accent-text)' },
  tourFoot: { padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: 'var(--muted)', fontSize: 14 },
  replay: { background: 'none', border: 0, color: 'var(--accent-text)', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' },

  featIcon: { width: 36, height: 36, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--surface-2)', color: 'var(--text-2)' },
  finalCta: { position: 'relative', overflow: 'hidden', borderRadius: 12, padding: 'clamp(32px, 6vw, 64px)', border: '1px solid var(--border)' },
  videoWrap: { marginTop: 28, maxWidth: 960, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)', background: '#171412' },
  footer: { borderTop: '1px solid var(--border)', padding: '32px 24px' },
  footLink: { fontSize: 15, color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 },
};
