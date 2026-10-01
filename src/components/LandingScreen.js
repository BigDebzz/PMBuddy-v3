import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '../lib/analytics';

const RING_R = 34;
const RING_LEN = 2 * Math.PI * RING_R;
const STAGE_W = 520;
const STAGE_H = 470;

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
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(18px)', transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
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
  };
}

// Tilts a 3D scene toward the mouse. Touch and reduced-motion users get a still scene.
function useTilt(maxX = 7, maxY = 11) {
  const ref = useRef(null);
  const reduced = useRef(false);
  useEffect(() => {
    try { reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { reduced.current = false; }
  }, []);
  const onMove = (e) => {
    if (reduced.current || e.pointerType !== 'mouse' || !ref.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    ref.current.style.transition = 'transform 0.12s ease-out';
    ref.current.style.transform = `rotateX(${(-py * maxX * 2).toFixed(2)}deg) rotateY(${(px * maxY * 2).toFixed(2)}deg)`;
  };
  const onLeave = () => {
    if (!ref.current) return;
    ref.current.style.transition = 'transform 0.7s cubic-bezier(0.16,1,0.3,1)';
    ref.current.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };
  return { ref, onMove, onLeave };
}

function MiniRing({ size = 84, percent = 64, stroke = 9, label }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => { const id = setTimeout(() => setDrawn(true), 400); return () => clearTimeout(id); }, []);
  const offset = RING_LEN * (1 - (drawn ? percent : 0) / 100);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={RING_R} fill="none" stroke="var(--color-primary-tint)" strokeWidth={stroke} />
        <circle cx="42" cy="42" r={RING_R} fill="none" stroke="var(--color-primary)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={RING_LEN} strokeDashoffset={offset} transform="rotate(-90 42 42)"
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.27, fontWeight: 700, color: 'var(--color-text)' }}>
        {label || `${percent}%`}
      </div>
    </div>
  );
}

function Check({ done, active }) {
  return (
    <span style={{ ...s.check, background: done ? 'var(--color-primary)' : 'var(--color-surface)', borderColor: done || active ? 'var(--color-primary)' : 'var(--color-border)' }}>
      {done && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>{'\u2713'}</span>}
      {!done && active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', display: 'block' }} />}
    </span>
  );
}

export default function LandingScreen({ onSelectMode, onLogin, onSignup, onDashboard, user }) {
  const [visible, setVisible] = useState(false);
  const [activeWho, setActiveWho] = useState(0);
  const [tick, setTick] = useState(0);
  const [scale, setScale] = useState(1);
  const tilt = useTilt();

  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setInterval(() => setTick(p => p + 1), 2200); return () => clearInterval(t); }, []);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 40) / STAGE_W));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const handleSelect = (modeId) => { Analytics.modeSelected(modeId); onSelectMode(modeId); };
  const scrollToHow = () => { const el = document.getElementById('how-it-works'); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
  const start = user ? onDashboard : onSignup;
  const startLabel = user ? 'Go to my projects' : 'Start your first project';

  const milestones = ['Customer interviews', 'MVP wireframes', 'First user test', 'Investor demo'];
  const active = tick % milestones.length;

  const whoCards = [
    { label: 'Startup founders', outcome: 'Ship without falling apart', body: 'You are building fast and things keep slipping. PM Buddy keeps your team aligned, your timeline real and your risks visible before they become problems.' },
    { label: 'Solo builders', outcome: 'Build like a team of ten', body: 'No co-founder. No PM. No problem. PM Buddy gives you the structure that turns a solo effort into a professional project.' },
    { label: 'Non-technical founders', outcome: 'Lead your team with confidence', body: 'You do not need to understand code to run a project well. PM Buddy puts you in control without the jargon.' },
    { label: 'Corporate teams', outcome: 'Get everyone on the same page', body: 'Multiple people, multiple opinions, one goal. PM Buddy gives your team clarity on who owns what, what is due and how to communicate.' },
  ];

  return (
    <div className="pmb-motion" style={s.page}>

      {/* HERO */}
      <div style={s.heroWrap}>
        <div className="lp-two" style={s.hero}>
          <div>
            <p style={{ ...line(visible, 0), ...s.pill }}>
              <span style={s.pillDot} /> Project management for people who are not project managers
            </p>

            <h1 style={s.h1}>
              <span style={line(visible, 0.12)}>Run your project</span>
              <span style={line(visible, 0.28)}>
                <span style={s.marker}>like a pro,</span> without
              </span>
              <span style={line(visible, 0.44)}>being one.</span>
            </h1>

            <p style={{ ...s.heroSub, ...line(visible, 0.6) }}>
              Drop in your plan, proposal or even a WhatsApp message. PM Buddy turns it into milestones, tasks, risks and reminders, in plain English.
            </p>

            <div style={{ ...line(visible, 0.75), ...s.ctas }}>
              <button className="lp-btn lp-btn-primary" onClick={start}>{startLabel}</button>
              {user
                ? null
                : <button className="lp-btn lp-btn-ghost" onClick={scrollToHow}>See how it works</button>}
            </div>

            <ul style={{ ...line(visible, 0.9), ...s.trust }}>
              {['Upload a plan, get a project', 'Reminders so nothing slips', 'No jargon, ever'].map(t => (
                <li key={t} style={s.trustItem}><span style={s.trustTick}>{'\u2713'}</span>{t}</li>
              ))}
            </ul>

            {!user && (
              <p style={{ ...s.heroNote, ...line(visible, 1.05) }}>
                Not sure your idea is worth building?{' '}
                <button style={s.inlineLink} onClick={() => handleSelect('startup')}>Validate it first, it is free</button>
              </p>
            )}
          </div>

          {/* 3D product scene */}
          <div style={{ ...s.sceneBox, height: STAGE_H * scale, opacity: visible ? 1 : 0, transition: 'opacity 0.9s ease 0.4s' }}>
            <div
              style={{ ...s.stage, transform: `scale(${scale})` }}
              onPointerMove={tilt.onMove}
              onPointerLeave={tilt.onLeave}
              aria-hidden="true"
            >
              <div style={{ ...s.blob, width: 300, height: 300, left: 40, top: 20, background: 'var(--color-primary-tint)', animation: 'lp-blob 9s ease-in-out infinite' }} />
              <div style={{ ...s.blob, width: 220, height: 220, right: 10, bottom: 10, background: '#F1E6D6', animation: 'lp-blob 11s ease-in-out infinite reverse' }} />

              <div ref={tilt.ref} style={s.scene}>
                {/* main board */}
                <div style={{ ...s.layer, left: 18, top: 62, width: 350, transform: 'translateZ(0px)' }}>
                  <div style={s.mainCard}>
                    <div style={s.mcTop}>
                      <div>
                        <p style={s.mcLabel}>Active project</p>
                        <p style={s.mcName}>Fintech MVP Lagos</p>
                      </div>
                      <span style={s.badgeGood}>On track</span>
                    </div>
                    <div style={s.mcBody}>
                      <MiniRing percent={64} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {milestones.map((m, i) => (
                          <div key={m} style={{ ...s.mcRow, background: active === i ? 'var(--color-primary-tint)' : 'transparent' }}>
                            <Check done={i < active} active={active === i} />
                            <span style={{ ...s.mcRowText, color: i < active ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: i < active ? 'line-through' : 'none' }}>{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* reminder toast */}
                <div style={{ ...s.layer, right: 0, top: 0, transform: 'translateZ(80px)' }}>
                  <div style={{ ...s.floatCard, width: 224, animation: 'lp-float 5.2s ease-in-out infinite' }}>
                    <span style={{ ...s.iconDot, background: 'var(--color-warning-tint)', color: 'var(--color-warning)' }}>{'\uD83D\uDD14'}</span>
                    <div>
                      <p style={s.fcLabel}>Due today</p>
                      <p style={s.fcText}>Book venue for kickoff</p>
                    </div>
                  </div>
                </div>

                {/* assistant bubble */}
                <div style={{ ...s.layer, left: 0, bottom: 14, transform: 'translateZ(100px)' }}>
                  <div style={{ ...s.floatCard, width: 268, animation: 'lp-float 6s ease-in-out 0.6s infinite' }}>
                    <span style={{ ...s.iconDot, background: 'var(--color-primary)', color: '#fff' }}>{'\u2726'}</span>
                    <div>
                      <p style={s.fcLabel}>PM Buddy</p>
                      <p style={s.fcText}>I read your plan and set up 6 milestones and 4 risks.</p>
                    </div>
                  </div>
                </div>

                {/* health chip */}
                <div style={{ ...s.layer, right: 4, bottom: 70, transform: 'translateZ(60px)' }}>
                  <div style={{ ...s.floatCard, width: 150, flexDirection: 'column', alignItems: 'flex-start', gap: 6, animation: 'lp-float 5.6s ease-in-out 1.2s infinite' }}>
                    <p style={s.fcLabel}>Health check</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MiniRing size={46} stroke={11} percent={82} label="" />
                      <div>
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-success)', lineHeight: 1 }}>82</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>out of 100</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROBLEM */}
      <div style={s.section}>
        <div style={s.inner}>
          <Reveal>
            <p style={s.eyebrow}>Sound familiar?</p>
            <h2 style={s.h2}>Great ideas rarely die from bad ideas. They die from poor execution.</h2>
          </Reveal>
          <div className="lp-steps" style={{ marginTop: 40 }}>
            {[
              { n: '1', title: 'No one is in charge', body: 'Tasks get dropped because nobody owns them.' },
              { n: '2', title: 'The plan keeps changing', body: 'New ideas keep getting added until the original goal is gone.' },
              { n: '3', title: 'Nothing is written down', body: 'Everything lives in a WhatsApp chat. When things go wrong there is no record.' },
            ].map((p, i) => (
              <Reveal key={p.n} delay={i * 0.1}>
                <div className="lp-lift" style={s.problemCard}>
                  <span style={s.problemNum}>{p.n}</span>
                  <p style={s.cardTitle}>{p.title}</p>
                  <p style={s.cardBody}>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how-it-works" style={{ ...s.section, background: 'var(--color-primary-tint)' }}>
        <div style={s.inner}>
          <Reveal>
            <p style={s.eyebrow}>How it works</p>
            <h2 style={s.h2}>From a messy document to a real project in three steps.</h2>
          </Reveal>
          <div className="lp-steps" style={{ marginTop: 40 }}>
            <Reveal>
              <div className="lp-lift" style={s.stepCard}>
                <div style={s.stepVisual}>
                  <div style={s.dropzone}>
                    <span style={{ fontSize: 26 }}>{'\uD83D\uDCC4'}</span>
                    <span style={s.filePill}>project-plan.pdf</span>
                  </div>
                </div>
                <p style={s.stepNum}>Step 1</p>
                <p style={s.cardTitle}>Drop in what you already have</p>
                <p style={s.cardBody}>A plan, proposal, brief or pasted text. No forms to fill in.</p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="lp-lift" style={s.stepCard}>
                <div style={s.stepVisual}>
                  <div style={{ width: '100%' }}>
                    {[88, 64, 76].map((w, i) => (
                      <div key={w} style={{ ...s.skeleton, width: `${w}%`, background: i === tick % 3 ? 'var(--color-primary-border)' : 'var(--color-border)', transition: 'background 0.5s' }} />
                    ))}
                    <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>PM Buddy is reading...</p>
                  </div>
                </div>
                <p style={s.stepNum}>Step 2</p>
                <p style={s.cardTitle}>PM Buddy reads and organises it</p>
                <p style={s.cardBody}>Goals, milestones, risks and people are pulled out for you to review.</p>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="lp-lift" style={s.stepCard}>
                <div style={s.stepVisual}>
                  <div style={{ width: '100%' }}>
                    {['Goal set', '6 milestones', '4 risks tracked'].map((t, i) => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                        <Check done={i <= tick % 3} active={false} />
                        <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={s.stepNum}>Step 3</p>
                <p style={s.cardTitle}>Your project is ready to run</p>
                <p style={s.cardBody}>Track tasks, get reminders and ask for help whenever you are stuck.</p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={s.section}>
        <div style={s.inner}>
          <Reveal>
            <p style={s.eyebrow}>Everything in one place</p>
            <h2 style={s.h2}>The tools a project manager would use, in words anyone understands.</h2>
          </Reveal>
          <div className="lp-bento" style={{ marginTop: 40 }}>

            <div className="lp-span2">
              <Reveal>
                <div className="lp-lift" style={{ ...s.featCard, height: '100%' }}>
                  <p style={s.cardTitle}>A board your whole team understands</p>
                  <p style={s.cardBody}>Tasks and milestones on one board. Flag blockers, add notes and move things with one click.</p>
                  <div style={s.boardMini}>
                    {[
                      { h: 'To do', items: ['Order banners', 'Confirm speakers'] },
                      { h: 'In progress', items: ['Book venue'] },
                      { h: 'Done', items: ['Set budget', 'Invite team'] },
                    ].map(col => (
                      <div key={col.h} style={s.boardCol}>
                        <p style={s.boardHead}>{col.h}</p>
                        {col.items.map(it => <div key={it} style={s.boardCard}>{it}</div>)}
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <div className="lp-lift" style={{ ...s.featCard, height: '100%' }}>
                <p style={s.cardTitle}>Reminders that nudge</p>
                <p style={s.cardBody}>Email nudges for milestones and tasks that are due or overdue.</p>
                <div style={s.featVisual}>
                  <div style={{ ...s.floatCard, boxShadow: 'var(--shadow-sm)', width: '100%', animation: 'lp-float 5s ease-in-out infinite' }}>
                    <span style={{ ...s.iconDot, background: 'var(--color-danger-tint)', color: 'var(--color-danger)' }}>!</span>
                    <div>
                      <p style={s.fcLabel}>2 days overdue</p>
                      <p style={s.fcText}>Send funder update</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div className="lp-lift" style={{ ...s.featCard, height: '100%' }}>
                <p style={s.cardTitle}>A health check, in plain English</p>
                <p style={s.cardBody}>A score out of 100 and exactly what is missing.</p>
                <div style={{ ...s.featVisual, justifyContent: 'flex-start' }}>
                  <MiniRing size={92} stroke={9} percent={82} label="82" />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="lp-lift" style={{ ...s.featCard, height: '100%' }}>
                <p style={s.cardTitle}>Reports in one click</p>
                <p style={s.cardBody}>Progress updates, funder reports and plans from your live data.</p>
                <div style={{ ...s.featVisual, flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8 }}>
                  {['Progress update', 'Funder report', 'PM plan'].map(t => <span key={t} style={s.docChip}>{'\uD83D\uDCC4'} {t}</span>)}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="lp-lift" style={{ ...s.featCard, height: '100%' }}>
                <p style={s.cardTitle}>Ask PM Buddy anything</p>
                <p style={s.cardBody}>Stuck on a risk or a message to your team? Just ask.</p>
                <div style={s.featVisual}>
                  <div style={s.bubble}>How do I tell my team the deadline moved?</div>
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </div>

      {/* SOLUTION BAND */}
      <div style={s.band}>
        <div style={s.inner}>
          <Reveal>
            <div className="lp-two" style={{ alignItems: 'start' }}>
              <div>
                <p style={{ ...s.eyebrow, color: 'var(--color-primary-border)' }}>The idea</p>
                <h2 style={{ ...s.h2, color: '#fff' }}>PM Buddy thinks like a PM so you do not have to.</h2>
                <p style={{ ...s.lead, color: 'rgba(255,255,255,0.88)' }}>You focus on building. PM Buddy handles the structure, the risks, the documents and the follow-ups that keep a project on track.</p>
              </div>
              <div className="lp-points">
                {[
                  { title: 'Structure from day one', body: 'Clear goal, realistic timeline and defined roles.' },
                  { title: 'Stay focused', body: 'Say no to scope creep. Say yes to what matters.' },
                  { title: 'Always ready to share', body: 'Your plan is always up to date and easy to send.' },
                  { title: 'Expert help on demand', body: 'Book a real PM consultant when you need one.' },
                ].map(p => (
                  <div key={p.title}>
                    <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#fff' }}>{p.title}</p>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.88)' }}>{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* WHO */}
      <div style={s.section}>
        <div style={s.inner}>
          <Reveal>
            <p style={s.eyebrow}>Who it is for</p>
            <h2 style={s.h2}>Built for every kind of builder.</h2>
          </Reveal>
          <div style={s.whoLayout}>
            <div style={s.whoTabs}>
              {whoCards.map((w, i) => (
                <button key={w.label} onClick={() => setActiveWho(i)}
                  style={{ ...s.whoTab, background: activeWho === i ? 'var(--color-primary)' : 'var(--color-surface)', color: activeWho === i ? '#fff' : 'var(--color-text)', borderColor: activeWho === i ? 'var(--color-primary)' : 'var(--color-border)' }}>
                  {w.label}
                </button>
              ))}
            </div>
            <div style={s.whoDetail}>
              <p style={s.whoOutcome}>{whoCards[activeWho].outcome}</p>
              <p style={s.lead}>{whoCards[activeWho].body}</p>
              <button className="lp-btn lp-btn-primary" onClick={start}>{user ? 'Go to my projects' : 'Get started'}</button>
            </div>
          </div>
        </div>
      </div>

      {/* VALIDATION */}
      <div style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <Reveal>
            <div style={s.validCard}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <p style={s.eyebrow}>Not sure where to start?</p>
                <h3 style={s.h3}>Check your idea before you commit to building it.</h3>
                <p style={s.lead}>Answer honest questions and get a report on what is strong, what is missing and what to do next. It takes about 10 minutes.</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
                  <button className="lp-btn lp-btn-primary" onClick={() => handleSelect('startup')}>Validate a startup idea</button>
                  <button className="lp-btn lp-btn-ghost" onClick={() => handleSelect('hackathon')}>Validate a hackathon idea</button>
                </div>
              </div>
              <div style={s.freeBadge}>
                <span style={s.freeSmall}>Always</span>
                <span style={s.freeBig}>Free</span>
                <span style={s.freeSmall}>No account needed</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      {/* FINAL CTA */}
      <div style={{ ...s.section, paddingTop: 0 }}>
        <div style={s.inner}>
          <Reveal>
            <div style={s.finalCta}>
              <span style={{ ...s.ringDecor, width: 320, height: 320, right: -90, top: -110 }} />
              <span style={{ ...s.ringDecor, width: 190, height: 190, right: 120, bottom: -120 }} />
              <h2 style={s.finalH2}>Start running your project like a professional.</h2>
              <p style={{ ...s.lead, color: 'rgba(255,255,255,0.9)', maxWidth: 480, margin: '0 0 28px' }}>
                The thinking, structure and tools of a project manager, without the cost of hiring one.
              </p>
              <button className="lp-btn lp-btn-white" onClick={start}>{user ? 'Go to my projects' : 'Create your account'}</button>
            </div>
          </Reveal>
        </div>
      </div>

      {/* FOOTER */}
      <div style={s.footer}>
        <div style={{ ...s.inner, ...s.footerInner }}>
          <div>
            <p style={s.footerLogo}>PM Buddy</p>
            <p style={s.footerTagline}>Think, plan and execute like a professional PM, without being one.</p>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/about.html" style={s.footerLink}>About</a>
            <a href="/privacy.html" style={s.footerLink}>Privacy</a>
            <a href="/terms.html" style={s.footerLink}>Terms</a>
            <p style={s.footerCredit}>Built in Nigeria by <strong style={{ color: 'var(--color-text)' }}>Deborah Akpokighe</strong></p>
          </div>
        </div>
      </div>

    </div>
  );
}

const s = {
  page: { background: 'var(--color-canvas)', fontFamily: 'var(--font)', color: 'var(--color-text)', overflowX: 'hidden' },

  heroWrap: { padding: '56px 24px 72px' },
  hero: { maxWidth: 1180, margin: '0 auto' },
  pill: { display: 'inline-flex', alignItems: 'center', gap: 8, margin: '0 0 24px', padding: '7px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' },
  pillDot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--color-success)', flexShrink: 0 },
  h1: { margin: '0 0 22px', fontSize: 'clamp(40px, 6.2vw, 68px)', lineHeight: 1.06, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text)' },
  marker: { background: 'linear-gradient(transparent 62%, var(--color-primary-border) 62%)', padding: '0 4px', margin: '0 -4px' },
  heroSub: { margin: '0 0 28px', maxWidth: 520, fontSize: 'clamp(17px, 2vw, 20px)', lineHeight: 1.6, color: 'var(--color-text-muted)' },
  ctas: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 26 },
  trust: { listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '8px 22px' },
  trustItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: 'var(--color-text-muted)' },
  trustTick: { color: 'var(--color-success)', fontWeight: 700 },
  heroNote: { margin: 0, fontSize: 14, color: 'var(--color-text-muted)' },
  inlineLink: { background: 'none', border: 'none', padding: 0, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' },

  sceneBox: { position: 'relative', width: '100%', maxWidth: STAGE_W, justifySelf: 'center' },
  stage: { position: 'absolute', left: 0, top: 0, width: STAGE_W, height: STAGE_H, transformOrigin: 'top left', perspective: 1200 },
  blob: { position: 'absolute', borderRadius: '50%', filter: 'blur(36px)', opacity: 0.9 },
  scene: { position: 'absolute', inset: 0, transformStyle: 'preserve-3d', willChange: 'transform' },
  layer: { position: 'absolute' },
  mainCard: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', padding: 20 },
  mcTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  mcLabel: { margin: '0 0 2px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' },
  mcName: { margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--color-text)' },
  badgeGood: { padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-success-tint)', color: 'var(--color-success)', fontSize: 12, fontWeight: 700 },
  mcBody: { display: 'flex', alignItems: 'center', gap: 16 },
  mcRow: { display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8, transition: 'background 0.4s' },
  mcRowText: { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  check: { width: 18, height: 18, borderRadius: '50%', border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.4s' },
  floatCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' },
  iconDot: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 },
  fcLabel: { margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' },
  fcText: { margin: '1px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.35 },

  section: { padding: '88px 24px' },
  inner: { maxWidth: 1180, margin: '0 auto' },
  eyebrow: { margin: '0 0 12px', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-primary)' },
  h2: { margin: 0, maxWidth: 760, fontSize: 'clamp(28px, 4vw, 42px)', lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text)' },
  h3: { margin: '0 0 12px', fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text)' },
  lead: { margin: '16px 0 24px', fontSize: 17, lineHeight: 1.7, color: 'var(--color-text-muted)' },
  cardTitle: { margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--color-text)' },
  cardBody: { margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-muted)' },

  problemCard: { height: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 24 },
  problemNum: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, marginBottom: 14, borderRadius: '50%', background: 'var(--color-danger-tint)', color: 'var(--color-danger)', fontSize: 15, fontWeight: 700 },

  stepCard: { height: '100%', background: 'var(--color-surface)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 22 },
  stepVisual: { height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, padding: 16, background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' },
  stepNum: { margin: '0 0 4px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary)' },
  dropzone: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', padding: '14px 10px', border: '2px dashed var(--color-primary-border)', borderRadius: 'var(--radius)' },
  filePill: { padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-tint)', color: 'var(--color-primary-hover)', fontSize: 12, fontWeight: 600 },
  skeleton: { height: 10, borderRadius: 999, marginBottom: 9 },

  featCard: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 24, display: 'flex', flexDirection: 'column' },
  featVisual: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 18, minHeight: 80 },
  boardMini: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 20 },
  boardCol: { background: 'var(--color-canvas)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 10 },
  boardHead: { margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' },
  boardCard: { padding: '8px 10px', marginBottom: 6, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: 'var(--shadow-sm)' },
  docChip: { padding: '6px 12px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary-tint)', border: '1px solid var(--color-primary-border)', color: 'var(--color-primary-hover)', fontSize: 13, fontWeight: 600 },
  bubble: { padding: '12px 16px', background: 'var(--color-primary)', color: '#fff', borderRadius: '16px 16px 16px 4px', fontSize: 14, lineHeight: 1.45, fontWeight: 500 },

  band: { background: 'var(--color-primary)', padding: '88px 24px' },

  whoLayout: { display: 'flex', gap: 40, flexWrap: 'wrap', marginTop: 36, alignItems: 'flex-start' },
  whoTabs: { display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 260px' },
  whoTab: { padding: '14px 18px', border: '1.5px solid', borderRadius: 'var(--radius)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s ease' },
  whoDetail: { flex: 1, minWidth: 280, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 28 },
  whoOutcome: { margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-primary)' },

  validCard: { display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center', padding: 'clamp(24px, 4vw, 44px)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)' },
  freeBadge: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 40px', background: 'var(--color-primary-tint)', border: '1px solid var(--color-primary-border)', borderRadius: 'var(--radius-lg)' },
  freeSmall: { fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' },
  freeBig: { fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, color: 'var(--color-primary)' },

  finalCta: { position: 'relative', overflow: 'hidden', padding: 'clamp(36px, 6vw, 72px)', background: 'var(--color-primary)', borderRadius: 28 },
  ringDecor: { position: 'absolute', borderRadius: '50%', border: '28px solid rgba(255,255,255,0.1)' },
  finalH2: { position: 'relative', margin: '0 0 14px', maxWidth: 640, fontSize: 'clamp(28px, 4.4vw, 46px)', lineHeight: 1.12, fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' },

  footer: { borderTop: '1px solid var(--color-border)', padding: '36px 24px' },
  footerInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 },
  footerLogo: { margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--color-text)' },
  footerTagline: { margin: 0, maxWidth: 360, fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-muted)' },
  footerLink: { fontSize: 14, color: 'var(--color-text-muted)', textDecoration: 'none' },
  footerCredit: { margin: 0, fontSize: 13, color: 'var(--color-text-muted)' },
};
