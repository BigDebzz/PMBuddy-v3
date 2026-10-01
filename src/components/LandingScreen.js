import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '../lib/analytics';
import Icon from './Icon';

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

// ---------- real product views, drawn from sample data ----------
const BOARD = [
  { h: 'To do', cards: [
    { t: 'Order banners and signage', tone: 'warn', due: 'Fri', who: ['a4', 'IK'] },
    { t: 'Collect sponsor donations', tone: 'none', due: 'Next week', who: ['a2', 'TB'] },
  ] },
  { h: 'In progress', cards: [
    { t: 'Book venue for distribution day', tone: 'bad', due: 'Today', who: ['a1', 'AO'] },
    { t: 'Confirm 12 volunteers', tone: 'warn', due: 'Tomorrow', who: ['a3', 'CE'] },
  ] },
  { h: 'Done', cards: [
    { t: 'Set the budget', tone: 'ok', due: 'Done', who: ['a2', 'TB'] },
    { t: 'Invite the team', tone: 'ok', due: 'Done', who: ['a1', 'AO'] },
  ] },
];

function BoardView() {
  return (
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
  );
}

const LIST = [
  { group: 'In progress', dot: '#2F8BFF' },
  { t: 'Book venue for distribution day', tone: 'bad', p: 'High', who: ['a1', 'AO'], due: 'Today' },
  { t: 'Confirm 12 volunteers', tone: 'warn', p: 'Medium', who: ['a3', 'CE'], due: 'Tomorrow' },
  { group: 'To do', dot: '#9AA0AA' },
  { t: 'Order banners and signage', tone: 'warn', p: 'Medium', who: ['a4', 'IK'], due: 'Fri' },
  { t: 'Collect sponsor donations', tone: 'none', p: 'Low', who: ['a2', 'TB'], due: 'Next week' },
];

function ListView() {
  return (
    <div style={{ padding: '6px 10px 14px', overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 15 }}>
        <thead>
          <tr>{['Task', 'Priority', 'Assignee', 'Due'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {LIST.map((r, i) => r.group ? (
            <tr key={i}><td colSpan={4} style={{ ...s.td, fontWeight: 800, paddingTop: 16, borderBottom: 0 }}><i style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: r.dot, marginRight: 8 }} />{r.group}</td></tr>
          ) : (
            <tr key={i}>
              <td style={{ ...s.td, fontWeight: 700 }}>{r.t}</td>
              <td style={s.td}><Chip tone={r.tone} icon="flag">{r.p}</Chip></td>
              <td style={s.td}><Avatar tone={r.who[0]}>{r.who[1]}</Avatar></td>
              <td style={s.td}>{r.due}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RemindView() {
  const rows = [
    ['Book venue for distribution day', 'bad', 'alert', 'Due today'],
    ['Send funder update', 'bad', 'alert', '2 days overdue'],
    ['Confirm 12 volunteers', 'warn', 'clock', 'Due in 3 days'],
  ];
  return (
    <div style={{ padding: 18, display: 'grid', gap: 10 }}>
      {rows.map(r => (
        <div key={r[0]} style={s.kcard}>
          <div style={s.rowBetween}><span>{r[0]}</span><Chip tone={r[1]} icon={r[2]}>{r[3]}</Chip></div>
        </div>
      ))}
      <div style={{ color: 'var(--muted)', fontSize: 15 }}>One email each morning, only when something needs you.</div>
    </div>
  );
}

function HeroWindow() {
  const [tab, setTab] = useState('board');
  const tabs = [['board', 'Board'], ['list', 'List'], ['remind', 'Reminders']];
  return (
    <div className="lp-sky lp-herovis" style={s.heroVis}>
      <div role="tablist" aria-label="Product views" style={s.tabs}>
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            style={{ ...s.tab, ...(tab === id ? s.tabOn : null) }}>{label}</button>
        ))}
      </div>
      <div style={s.win}>
        <div style={s.winBar}>
          <span style={{ display: 'flex', gap: 6, marginRight: 8 }}>{[0, 1, 2].map(i => <i key={i} style={s.dotI} />)}</span>
          Community Food Drive
          <span style={{ marginLeft: 'auto' }}><Chip tone="ok" icon="check-circle">On track</Chip></span>
        </div>
        {tab === 'board' && <BoardView />}
        {tab === 'list' && <ListView />}
        {tab === 'remind' && <RemindView />}
      </div>
    </div>
  );
}

// ---------- the tour: drop a document, watch the project appear ----------
const FOUND = [
  { icon: 'flag', label: 'Goal', n: 1 },
  { icon: 'calendar', label: 'Milestones', n: 4 },
  { icon: 'alert', label: 'Risks to watch', n: 3 },
  { icon: 'users', label: 'People involved', n: 5 },
  { icon: 'board', label: 'Tasks created', n: 6 },
];
const START_TASKS = [
  { t: 'Book venue for distribution day', c: 1 }, { t: 'Confirm 12 volunteers', c: 1 },
  { t: 'Order banners and signage', c: 0 }, { t: 'Collect donations from sponsors', c: 0 },
  { t: 'Set the budget', c: 2 }, { t: 'Invite the team', c: 2 },
];
const COLS = ['To do', 'In progress', 'Done'];

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
  const steps = ['Drop', 'Read', 'Run'];

  return (
    <div style={s.tour}>
      <div style={s.tourSteps} role="tablist" aria-label="Tour steps">
        {steps.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && <span style={{ width: 22, height: 1, background: 'var(--border-strong)' }} />}
            <button type="button" role="tab" aria-selected={step === i} onClick={() => go(i)}
              style={{ ...s.stepBtn, ...(step === i ? s.stepOn : null) }}>
              <i style={{ width: 8, height: 8, borderRadius: '50%', background: step >= i ? 'var(--accent)' : 'var(--border-strong)' }} />{label}
            </button>
          </React.Fragment>
        ))}
      </div>

      <div style={{ padding: 'clamp(20px, 4vw, 34px)', minHeight: 380, display: 'grid', alignContent: 'center' }}>
        {step === 0 && (
          <div style={{ maxWidth: 560, marginInline: 'auto', textAlign: 'center', display: 'grid', gap: 18, justifyItems: 'center', width: '100%' }}>
            <div style={s.dropzone}>
              <Icon name="upload" size={36} style={{ color: 'var(--accent-text)' }} />
              <h4 style={{ fontSize: 'clamp(19px, 2.4vw, 22px)', fontWeight: 700 }}>Drop a plan, proposal or brief here</h4>
              <p style={{ color: 'var(--muted)', fontSize: 15 }}>PDF, Word, Excel or text.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={s.cue} />
                <button type="button" className="lp-btn lp-btn-primary" onClick={() => go(1)}>Use a sample plan <Icon name="arrow-right" size={18} /></button>
              </span>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={() => go(1)}>Paste text instead</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="lp-read">
            <div style={s.docpage} aria-hidden="true">
              {[54, 100, 92, 78, 54, 100, 85, 94, 60].map((w, i) => (
                <div key={i} style={{ height: i === 0 || i === 4 ? 13 : 9, width: `${w}%`, borderRadius: 99, background: i === 0 || i === 4 ? 'var(--border-strong)' : 'var(--surface-3)', marginTop: i === 4 ? 10 : 0 }} />
              ))}
              <span style={s.scan} />
            </div>
            <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
              <h4 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>PM Buddy is reading</h4>
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
          <div style={{ display: 'grid', gap: 18, position: 'relative' }}>
            <div style={s.rowBetween}>
              <h4 style={{ fontSize: 'clamp(20px, 2.4vw, 24px)', fontWeight: 700 }}>Community Food Drive</h4>
              <Chip tone="ok" icon="check-circle">On track</Chip>
            </div>
            <div style={s.toast}><Icon name="bell" size={18} style={{ color: 'var(--warn-text)' }} /><span><b>Due today</b><br />Book venue for distribution day</span></div>
            <div className="lp-run">
              <div style={s.ringBox}>
                <div style={{ position: 'relative', width: 128, height: 128 }}>
                  <svg viewBox="0 0 100 100" width="128" height="128" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                    <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
                    <circle cx="50" cy="50" r={RING_R} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={RING_LEN} strokeDashoffset={RING_LEN * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
                  </svg>
                  <b style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-head)', fontSize: 30 }}>{pct}%</b>
                </div>
                <span style={{ color: 'var(--muted)', fontSize: 15, textAlign: 'center' }}>{pct === 100 ? 'Everything is done. Well done.' : `${done} of ${tasks.length} tasks done`}</span>
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
            <div style={s.coach}>
              <span>All of this came from one document.</span>
              <button type="button" className="lp-btn lp-btn-ghost" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => go(0)}>Replay tour</button>
            </div>
          </div>
        )}
      </div>
      <div style={s.tourFoot}>
        <span>Step {step + 1} of 3</span>
        <span>Sample data. Nothing is saved.</span>
      </div>
    </div>
  );
}

export default function LandingScreen({ onSelectMode, onSignup, onDashboard, user }) {
  const handleSelect = (modeId) => { Analytics.modeSelected(modeId); onSelectMode(modeId); };
  const start = user ? onDashboard : onSignup;
  const scrollTo = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); };

  const features = [
    { icon: 'file', title: 'Starts from your document', body: 'Upload a plan. Get a project.' },
    { icon: 'board', title: 'A simple board', body: 'Move tasks with one click.' },
    { icon: 'bell', title: 'Reminders that nudge', body: 'Nothing slips quietly.' },
    { icon: 'chart', title: 'A health check', body: 'A score and what to fix.' },
    { icon: 'download', title: 'One-click reports', body: 'Word or PDF, from live data.' },
    { icon: 'spark', title: 'Ask PM Buddy', body: 'Plain answers when you are stuck.' },
  ];

  return (
    <div style={s.page}>

      <div style={s.rainbow} />
      <div style={s.section}>
        <div className="lp-hero" style={s.inner}>
          <div>
            <h1 style={s.h1}>Get your project out of your head and onto one screen.</h1>
            <p style={s.sub}>PM Buddy reads your plan and sets up the milestones, tasks and reminders.</p>
            <div style={s.ctas}>
              <button type="button" className="lp-btn lp-btn-primary" onClick={start}>{user ? 'Go to my projects' : 'Try PM Buddy free'} <Icon name="arrow-right" size={18} /></button>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={() => scrollTo('tour')}>See a sample project</button>
            </div>
          </div>
          <HeroWindow />
        </div>
      </div>

      <div style={{ ...s.inner, padding: '0 24px' }}>
        <div className="lp-cells">
          {[['1 document', 'in'], ['6 tasks', 'out'], ['Daily', 'reminders'], ['1 click', 'reports']].map(c => (
            <div key={c[0]} className="lp-cell">
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 700, letterSpacing: '-0.03em' }}>{c[0]}</div>
              <div style={{ color: 'var(--muted)', fontSize: 15 }}>{c[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="tour" style={s.section}>
        <div style={s.inner}>
          <Reveal><h2 style={{ ...s.h2, marginBottom: 32 }}>Try it. Drop in a plan.</h2></Reveal>
          <Tour />
        </div>
      </div>

      <div style={s.section}>
        <div style={s.inner}>
          <Reveal><h2 style={s.h2}>Everything a project manager would use.</h2></Reveal>
          <div className="lp-grid" style={{ marginTop: 40 }}>
            {features.map(f => (
              <div key={f.title} className="lp-feat">
                <span style={s.featIcon}><Icon name={f.icon} size={20} /></span>
                <h3 style={{ fontSize: 'clamp(16px, 1.5vw, 18px)', fontWeight: 700, margin: '16px 0 4px' }}>{f.title}</h3>
                <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.5 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <div style={s.valid}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3 style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 700, marginBottom: 20 }}>Not sure your idea is worth building?</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="lp-btn lp-btn-primary" style={{ width: 'auto' }} onClick={() => handleSelect('startup')}>Validate a startup idea</button>
                <button type="button" className="lp-btn lp-btn-ghost" style={{ width: 'auto' }} onClick={() => handleSelect('hackathon')}>Validate a hackathon idea</button>
              </div>
            </div>
            <div style={s.free}>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--accent-text)' }}>Free</span>
              <span style={{ fontSize: 15, color: 'var(--muted)' }}>No account needed</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <div className="lp-sky" style={s.finalCta}>
            <h2 style={{ ...s.h2, color: 'var(--text)', maxWidth: 560, marginBottom: 28 }}>Start running your project like a pro.</h2>
            <button type="button" className="lp-btn lp-btn-primary" style={{ width: 'auto' }} onClick={start}>{user ? 'Go to my projects' : 'Create your account'} <Icon name="arrow-right" size={18} /></button>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <div style={{ ...s.inner, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <p style={{ fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>PM Buddy</p>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <a href="/about.html" style={s.footLink}>About</a>
            <a href="/privacy.html" style={s.footLink}>Privacy</a>
            <a href="/terms.html" style={s.footLink}>Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { background: 'var(--bg)', color: 'var(--text)', overflowX: 'hidden' },
  rainbow: { height: 4, background: 'var(--rainbow)' },
  section: { padding: 'clamp(64px, 9vw, 104px) 24px' },
  inner: { maxWidth: 1200, margin: '0 auto' },
  h1: { fontSize: 'clamp(26px, 3.6vw, 46px)', lineHeight: 1.08, fontWeight: 600, letterSpacing: '-0.04em', margin: '0 0 22px' },
  h2: { fontSize: 'clamp(22px, 2.8vw, 34px)', lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.035em', maxWidth: 780 },
  sub: { fontSize: 'clamp(15px, 1.4vw, 17px)', lineHeight: 1.65, color: 'var(--muted)', maxWidth: 540 },
  ctas: { display: 'flex', gap: 14, flexWrap: 'wrap', margin: '32px 0 28px' },
  note: { fontSize: 16, color: 'var(--muted)' },
  link: { background: 'none', border: 'none', padding: 0, color: 'var(--accent-text)', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' },

  heroVis: { position: 'relative', borderRadius: 26, padding: '26px 22px 26px' },
  tabs: { display: 'inline-flex', gap: 4, padding: 5, background: 'rgba(15, 25, 50, 0.82)', borderRadius: 999, marginBottom: 16 },
  tab: { border: 0, background: 'none', color: '#E8EEF9', fontWeight: 600, fontSize: 14, padding: '8px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' },
  tabOn: { background: '#FFFFFF', color: '#0B1A33' },
  win: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' },
  winBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 16 },
  dotI: { width: 11, height: 11, borderRadius: '50%', background: 'var(--surface-3)', display: 'inline-block' },
  col: { background: 'var(--surface-2)', borderRadius: 14, padding: 12, display: 'grid', gap: 10, alignContent: 'start' },
  colHead: { display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--muted)' },
  kcard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', fontWeight: 600, fontSize: 14, lineHeight: 1.35, display: 'grid', gap: 10, alignContent: 'space-between', minHeight: 92 },
  cardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  th: { textAlign: 'left', padding: '10px 12px', fontSize: 14, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)' },
  td: { padding: '12px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
  phone: { position: 'absolute', right: 16, bottom: -30, width: 176, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 26, padding: '14px 12px 16px', boxShadow: 'var(--shadow-lg)', display: 'grid', gap: 8 },
  phoneRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, padding: '8px 10px', borderRadius: 12, background: 'var(--surface-2)' },

  tour: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow)', overflow: 'hidden' },
  tourSteps: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' },
  stepBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 0, color: 'var(--muted)', fontWeight: 700, fontSize: 15, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit' },
  stepOn: { background: 'var(--surface-2)', color: 'var(--text)' },
  dropzone: { width: '100%', border: '2px dashed var(--accent-border)', borderRadius: 22, padding: '40px 20px', display: 'grid', gap: 10, justifyItems: 'center', animation: 'lp-dash 3s ease-in-out infinite' },
  cue: { position: 'absolute', inset: -6, borderRadius: 999, border: '2px solid var(--accent)', animation: 'lp-cue 1.8s ease-out infinite', pointerEvents: 'none' },
  docpage: { position: 'relative', overflow: 'hidden', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, display: 'grid', gap: 10, alignContent: 'start' },
  scan: { position: 'absolute', left: 0, right: 0, height: 60, background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent) 28%, transparent), transparent)', animation: 'lp-scan 2.2s ease-in-out infinite' },
  found: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 16, fontWeight: 600, transition: 'opacity 0.4s ease, transform 0.4s ease' },
  toast: { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'var(--warn-tint)', border: '1px solid var(--warn-border)', borderRadius: 14, fontSize: 16, animation: 'lp-toast 0.6s 1.2s cubic-bezier(0.16,1,0.3,1) both' },
  ringBox: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, padding: 18, display: 'grid', justifyItems: 'center', gap: 10 },
  tcard: { textAlign: 'left', width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', color: 'var(--text)', fontWeight: 600, fontSize: 15, lineHeight: 1.35, cursor: 'pointer', display: 'grid', gap: 8, fontFamily: 'inherit', animation: 'lp-pop 0.45s cubic-bezier(0.16,1,0.3,1) both' },
  moveChip: { justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-tint)', color: 'var(--accent-text)' },
  coach: { color: 'var(--muted)', fontSize: 16, borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' },
  tourFoot: { padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', color: 'var(--muted)', fontSize: 15 },

  featIcon: { width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--accent-tint)', color: 'var(--accent-text)' },
  whoTab: { padding: '14px 18px', border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' },
  whoOn: { background: 'var(--accent)', color: '#FFFFFF', borderColor: 'var(--accent)' },
  whoCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(24px, 4vw, 38px)', boxShadow: 'var(--shadow-sm)' },
  valid: { display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center', padding: 'clamp(24px, 4vw, 46px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 26, boxShadow: 'var(--shadow-sm)' },
  free: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 36px', background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 20 },
  finalCta: { borderRadius: 28, padding: 'clamp(32px, 6vw, 70px)', border: '1px solid var(--border)' },
  footer: { borderTop: '1px solid var(--border)', padding: '40px 24px' },
  footLink: { fontSize: 16, color: 'var(--muted)', textDecoration: 'none', fontWeight: 600 },
};
