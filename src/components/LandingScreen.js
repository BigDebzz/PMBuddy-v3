import React, { useState, useEffect } from 'react';
import { Analytics } from '../lib/analytics';

const B = '#550000';
const BL = '#0A0A0A';
const WH = '#FFFFFF';

export default function LandingScreen({ onSelectMode, onLogin, onSignup, onDashboard, user }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const handleSelect = (modeId) => {
    Analytics.modeSelected(modeId);
    onSelectMode(modeId);
  };

  return (
    <div style={s.page}>

      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.7s ease' }}>
            <div style={s.eyebrow}>Product Validation Tool</div>
            <h1 style={s.headline}>
              Validate your idea<br />
              <span style={s.headlineAccent}>before you build it.</span>
            </h1>
            <p style={s.heroSub}>
              PM Buddy asks the hard questions founders avoid. Answer honestly and get a report that tells you what is working, what is broken, and exactly what to do next.
            </p>
            <div style={s.heroBtns}>
              <button style={s.primaryBtn} onClick={onSignup}>Get started for free</button>
              <button style={s.outlineBtn} onClick={onLogin}>Log in</button>
            </div>
            <p style={s.heroSkip}>
              No account?{' '}
              <button style={s.skipLink} onClick={() => handleSelect('startup')}>Try without signing up</button>
            </p>
          </div>
        </div>
      </div>

      <div style={s.statsBand}>
        {[
          { num: '92+', label: 'Founders validated' },
          { num: '10 min', label: 'Average completion' },
          { num: '2', label: 'Validation modes' },
          { num: '90 days', label: 'Roadmap included' },
        ].map((stat, i) => (
          <div key={i} style={s.bandStat}>
            <span style={s.bandNum}>{stat.num}</span>
            <span style={s.bandLabel}>{stat.label}</span>
          </div>
        ))}
      </div>

      <div style={s.modesSection}>
        <div style={s.sectionInner}>
          <p style={s.sectionEye}>Choose your path</p>
          <h2 style={s.sectionH2}>Two modes built for your situation</h2>
          <div style={s.modesGrid}>
            <ModeCard
              title="Hackathon"
              badge="11 questions"
              time="10 min"
              desc="Validate your hackathon idea before you write a single line of code. Get a pitch structure, tool recommendations, and proof points from winning teams."
              color="#7C3AED"
              points={['Problem clarity check', 'Pitch structure in 5 slides', 'No code tools for your theme', 'Proof points from winning teams']}
              onClick={() => handleSelect('hackathon')}
            />
            <ModeCard
              title="Startup"
              badge="12 questions"
              time="12 min"
              desc="Validate your startup idea with the same rigour investors use. Get a 90 day roadmap, methodology recommendation, and honest risk analysis."
              color={B}
              points={['Customer validation check', '90 day execution roadmap', 'Revenue model analysis', 'African startup proof points']}
              onClick={() => handleSelect('startup')}
            />
          </div>
        </div>
      </div>

      <div style={s.getSection}>
        <div style={s.sectionInner}>
          <p style={s.sectionEye}>What you get</p>
          <h2 style={s.sectionH2}>Everything in one report</h2>
          <div style={s.getGrid}>
            {[
              { title: 'Validation score', body: 'A score out of 100 with a clear verdict on the strength of your idea and thinking.' },
              { title: 'Strengths and risks', body: 'Specific strengths flagged from your actual answers. Risks called out directly and honestly.' },
              { title: 'Prioritised next steps', body: 'The most important actions ranked in order. Based on your specific gaps, not generic advice.' },
              { title: '90 day roadmap', body: 'A phased execution plan from validation to first paying customers, adjusted for your timeline.' },
              { title: 'Tools matched to you', body: 'Build, payment, analytics, and growth tools selected for your team type and budget.' },
              { title: 'African proof points', body: 'Real startups from Nigeria and Africa that started where you are and what they did right.' },
            ].map((f, i) => (
              <div key={i} style={s.getCard}>
                <div style={s.getCardDot} />
                <div>
                  <p style={s.getCardTitle}>{f.title}</p>
                  <p style={s.getCardBody}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.forSection}>
        <div style={s.sectionInner}>
          <p style={s.sectionEye}>Who it is for</p>
          <h2 style={s.sectionH2}>Built for builders in emerging markets</h2>
          <div style={s.forGrid}>
            {[
              { title: 'Hackathon teams', body: 'Validate your idea before you write a line of code. Build what judges and users actually want.' },
              { title: 'Early stage founders', body: 'Get honest feedback on your assumptions before you spend 6 months building the wrong thing.' },
              { title: 'Solo builders', body: 'Think through your idea properly without a co-founder or advisor to challenge you.' },
              { title: 'Community builders', body: 'Share PM Buddy with your members to help them validate ideas before demo days and pitch events.' },
            ].map((a, i) => (
              <div key={i} style={s.forCard}>
                <div style={s.forCardNum}>{String(i + 1).padStart(2, '0')}</div>
                <p style={s.forCardTitle}>{a.title}</p>
                <p style={s.forCardBody}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={s.cta}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaH2}>Ready to validate your idea?</h2>
          <p style={s.ctaSub}>Takes 10 minutes. Gives you clarity that founders spend months trying to find on their own.</p>
          <div style={s.ctaBtns}>
            <button style={s.ctaPrimaryBtn} onClick={onSignup}>Create a free account</button>
            <button style={s.ctaOutlineBtn} onClick={() => handleSelect('startup')}>Try without account</button>
          </div>
        </div>
      </div>

      <div style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <p style={s.footerLogo}>PM Buddy</p>
            <p style={s.footerTagline}>Helping founders validate ideas and build with clarity.</p>
          </div>
          <div style={s.footerRight}>
            <p style={s.footerCredit}>Built by <span style={{ color: '#E5E7EB', fontWeight: 700 }}>Deborah Akpokighe</span></p>
          </div>
        </div>
      </div>

    </div>
  );
}

function ModeCard({ title, badge, time, desc, color, points, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ ...s.modeCard, borderColor: hovered ? color : '#E5E7EB', boxShadow: hovered ? `0 12px 40px ${color}20` : '0 2px 8px rgba(0,0,0,0.06)', transform: hovered ? 'translateY(-3px)' : 'translateY(0)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={s.modeCardTop}>
        <p style={{ ...s.modeBadge, background: color + '12', color }}>{badge}</p>
        <h3 style={s.modeTitle}>{title}</h3>
        <p style={s.modeTime}>{time}</p>
      </div>
      <p style={s.modeDesc}>{desc}</p>
      <ul style={s.modePoints}>
        {points.map((p, i) => (
          <li key={i} style={s.modePoint}>
            <span style={{ ...s.modeDot, background: color }} />
            {p}
          </li>
        ))}
      </ul>
      <button style={{ ...s.modeBtn, background: color }} onClick={onClick}>
        Start {title} validation
      </button>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: WH, fontFamily: 'inherit' },

  hero: { background: BL, padding: '100px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroInner: { maxWidth: 620, width: '100%', textAlign: 'center' },
  eyebrow: { display: 'inline-block', background: B, color: WH, fontSize: 10, fontWeight: 700, padding: '4px 14px', borderRadius: 100, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 24 },
  headline: { fontSize: 'clamp(36px, 6vw, 60px)', fontWeight: 800, color: WH, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1.5px' },
  headlineAccent: { color: WH, borderBottom: `3px solid ${B}`, paddingBottom: 2 },
  heroSub: { fontSize: 17, color: '#9CA3AF', lineHeight: 1.8, marginBottom: 36, maxWidth: 520, margin: '0 auto 36px' },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, justifyContent: 'center' },
  primaryBtn: { padding: '14px 32px', background: B, color: WH, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { padding: '14px 32px', background: 'transparent', color: WH, border: `1.5px solid ${B}`, borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  heroSkip: { fontSize: 13, color: '#4B5563', textAlign: 'center' },
  skipLink: { background: 'none', border: 'none', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' },

  statsBand: { background: WH, borderBottom: '1px solid #E5E7EB', padding: '36px 20px', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 },
  bandStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  bandNum: { fontSize: 32, fontWeight: 800, color: B, letterSpacing: '-0.5px' },
  bandLabel: { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' },

  modesSection: { padding: '80px 20px', background: WH },
  sectionInner: { maxWidth: 760, margin: '0 auto' },
  sectionEye: { fontSize: 11, fontWeight: 700, color: B, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 },
  sectionH2: { fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 800, color: BL, marginBottom: 40, letterSpacing: '-0.5px' },
  modesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 },
  modeCard: { background: WH, border: '2px solid #E5E7EB', borderRadius: 20, padding: '28px', transition: 'all 0.25s ease' },
  modeCardTop: { marginBottom: 16 },
  modeBadge: { display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  modeTitle: { fontSize: 22, fontWeight: 800, color: BL, letterSpacing: '-0.4px', marginBottom: 4 },
  modeTime: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  modeDesc: { fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 20 },
  modePoints: { listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 10 },
  modePoint: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#374151', fontWeight: 600 },
  modeDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  modeBtn: { width: '100%', color: WH, border: 'none', borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },

  getSection: { background: '#F9FAFB', padding: '80px 20px' },
  getGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  getCard: { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '20px', background: WH, borderRadius: 14, border: '1px solid #E5E7EB' },
  getCardDot: { width: 8, height: 8, borderRadius: '50%', background: B, flexShrink: 0, marginTop: 5 },
  getCardTitle: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 6 },
  getCardBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  forSection: { padding: '80px 20px', background: WH },
  forGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  forCard: { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 16, padding: '24px' },
  forCardNum: { fontSize: 11, fontWeight: 800, color: B, letterSpacing: '0.1em', marginBottom: 12 },
  forCardTitle: { fontSize: 15, fontWeight: 800, color: BL, marginBottom: 8 },
  forCardBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  cta: { background: B, padding: '80px 20px' },
  ctaInner: { maxWidth: 600, margin: '0 auto', textAlign: 'center' },
  ctaH2: { fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: WH, marginBottom: 16, letterSpacing: '-0.5px' },
  ctaSub: { fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: 36 },
  ctaBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
  ctaPrimaryBtn: { padding: '14px 28px', background: WH, color: B, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ctaOutlineBtn: { padding: '14px 28px', background: 'transparent', color: WH, border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },

  footer: { background: BL, padding: '40px 20px' },
  footerInner: { maxWidth: 760, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 },
  footerLogo: { fontSize: 18, fontWeight: 800, color: WH, letterSpacing: '-0.3px', marginBottom: 6 },
  footerTagline: { fontSize: 13, color: '#4B5563' },
  footerRight: { textAlign: 'right' },
  footerCredit: { fontSize: 14, color: '#9CA3AF' },
};
