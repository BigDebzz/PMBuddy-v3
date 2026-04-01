import React from 'react';
import { Analytics } from '../lib/analytics';

const BURGUNDY = '#550000';

export default function LandingScreen({ onSelectMode, onLogin, onSignup }) {

  const handleSelect = (modeId) => {
    Analytics.modeSelected(modeId);
    onSelectMode(modeId);
  };

  return (
    <div style={s.page}>

      {/* HERO */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.heroTag}>Free product validation tool</div>
          <h1 style={s.headline}>
            Stop building on<br />
            <span style={{ color: BURGUNDY }}>assumptions.</span>
          </h1>
          <p style={s.heroSub}>
            PM Buddy asks the hard questions founders avoid. Get an honest validation report, a 90-day roadmap, and an execution plan — in minutes. Free to use. No fluff.
          </p>
          <div style={s.heroBtns}>
            <button style={s.primaryBtn} onClick={onSignup}>Sign up to get started</button>
            <button style={s.ghostBtn} onClick={onLogin}>Log in</button>
          </div>
          <p style={s.heroNote}>Already used PM Buddy? <button style={s.inlineLink} onClick={() => handleSelect('hackathon')}>Continue without account</button></p>
        </div>
      </div>

      {/* STATS */}
      <div style={s.statsBar}>
        <div style={s.statsInner}>
          {[
            { num: '92+', label: 'Founders validated' },
            { num: '2', label: 'Validation modes' },
            { num: '100%', label: 'Free to start' },
            { num: '90', label: 'Day roadmap included' },
          ].map((stat, i) => (
            <div key={i} style={s.statItem}>
              <span style={s.statNum}>{stat.num}</span>
              <span style={s.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={s.section}>
        <div style={s.sectionInner}>
          <p style={s.sectionTag}>How it works</p>
          <h2 style={s.sectionTitle}>From idea to execution plan in 4 steps</h2>
          <div style={s.stepsGrid}>
            {[
              { num: '01', title: 'Choose your mode', body: 'Hackathon or Startup. Each mode asks questions built for your specific situation and timeline.' },
              { num: '02', title: 'Answer honestly', body: 'No right answers. PM Buddy reads what you actually say and responds directly to your specific situation.' },
              { num: '03', title: 'Get your report', body: 'Strengths, risks, next steps, tools, roadmap, pitch structure, and African proof points all in one place.' },
              { num: '04', title: 'Save and track', body: 'Create an account to save your project, return to it anytime, and track your progress as you build.' },
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

      {/* WHAT YOU GET */}
      <div style={{ ...s.section, background: '#FAFAFA' }}>
        <div style={s.sectionInner}>
          <p style={s.sectionTag}>What you get</p>
          <h2 style={s.sectionTitle}>A full validation report built from your answers</h2>
          <div style={s.featuresGrid}>
            {[
              { title: 'Validation score', body: 'A score out of 100 with a clear verdict on the strength of your idea.' },
              { title: 'Strengths and risks', body: 'Specific strengths in your thinking and risks flagged directly from what you said.' },
              { title: 'Next steps in order', body: 'The most important actions ranked by priority, not generic startup advice.' },
              { title: '90-day roadmap', body: 'A phased execution plan from validation to first paying customers.' },
              { title: 'Tools matched to you', body: 'Build, payment, analytics, and operations tools matched to your team and budget.' },
              { title: 'African proof points', body: 'Real startups from Nigeria and Africa that started where you are and what they learned.' },
            ].map((f, i) => (
              <div key={i} style={s.featureCard}>
                <div style={s.featureDot} />
                <div>
                  <p style={s.featureTitle}>{f.title}</p>
                  <p style={s.featureBody}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHO IT IS FOR */}
      <div style={s.section}>
        <div style={s.sectionInner}>
          <p style={s.sectionTag}>Who it is for</p>
          <h2 style={s.sectionTitle}>Built for builders in emerging markets</h2>
          <div style={s.audienceGrid}>
            {[
              { title: 'Hackathon teams', body: 'Validate your idea before you write a single line of code. Build what judges and users actually want.' },
              { title: 'Early stage founders', body: 'Get honest feedback on your assumptions before you spend 6 months building the wrong thing.' },
              { title: 'Solo builders', body: 'Think through your idea properly without a co-founder or advisor to challenge you.' },
              { title: 'Community builders', body: 'Share PM Buddy with your community to help members validate ideas before demo days and pitch competitions.' },
            ].map((a, i) => (
              <div key={i} style={s.audienceCard}>
                <p style={s.audienceTitle}>{a.title}</p>
                <p style={s.audienceBody}>{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={s.cta}>
        <div style={s.ctaInner}>
          <h2 style={s.ctaTitle}>Ready to validate your idea?</h2>
          <p style={s.ctaSub}>Free to use. Takes 10 minutes. Gives you clarity that takes founders months to find on their own.</p>
          <div style={s.ctaBtns}>
            <button style={s.primaryBtn} onClick={onSignup}>Create a free account</button>
            <button style={{ ...s.ghostBtn, borderColor: 'rgba(255,255,255,0.3)', color: '#FFFFFF' }} onClick={() => handleSelect('startup')}>Try without account</button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.footerLeft}>
            <span style={s.footerLogo}>PM Buddy</span>
            <p style={s.footerTagline}>Helping founders validate ideas and build with clarity.</p>
          </div>
          <div style={s.footerRight}>
            <p style={s.footerCredit}>Built by <span style={{ color: BURGUNDY, fontWeight: 700 }}>DDK</span> · Abuja, Nigeria</p>
            <p style={s.footerSub}>Free forever for founders who need it most.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#FFFFFF', fontFamily: 'inherit' },

  hero: { background: '#0A0A0A', padding: '80px 20px 80px' },
  heroInner: { maxWidth: 700, margin: '0 auto' },
  heroTag: { display: 'inline-block', background: BURGUNDY, color: '#FFFFFF', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 24 },
  headline: { fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px' },
  heroSub: { fontSize: 17, color: '#9CA3AF', lineHeight: 1.75, maxWidth: 540, marginBottom: 32 },
  heroBtns: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  primaryBtn: { padding: '14px 28px', background: BURGUNDY, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  ghostBtn: { padding: '14px 28px', background: 'transparent', color: '#9CA3AF', border: '1px solid #374151', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  heroNote: { fontSize: 13, color: '#6B7280' },
  inlineLink: { background: 'none', border: 'none', color: '#9CA3AF', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' },

  statsBar: { background: BURGUNDY, padding: '28px 20px' },
  statsInner: { maxWidth: 700, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statNum: { fontSize: 32, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-1px' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textAlign: 'center' },

  section: { padding: '72px 20px' },
  sectionInner: { maxWidth: 700, margin: '0 auto' },
  sectionTag: { fontSize: 11, fontWeight: 700, color: BURGUNDY, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 },
  sectionTitle: { fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, color: '#0A0A0A', marginBottom: 40, letterSpacing: '-0.5px', lineHeight: 1.2 },

  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 },
  stepCard: { padding: '24px', background: '#FAFAFA', borderRadius: 16, border: '1px solid #F3F4F6' },
  stepNum: { fontSize: 11, fontWeight: 800, color: BURGUNDY, letterSpacing: '0.08em', display: 'block', marginBottom: 12 },
  stepTitle: { fontSize: 15, fontWeight: 800, color: '#0A0A0A', marginBottom: 8 },
  stepBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  featureCard: { display: 'flex', gap: 14, alignItems: 'flex-start', padding: '20px', background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E7EB' },
  featureDot: { width: 8, height: 8, borderRadius: '50%', background: BURGUNDY, flexShrink: 0, marginTop: 5 },
  featureTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginBottom: 4 },
  featureBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },

  audienceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  audienceCard: { padding: '22px', background: '#FFFFFF', borderRadius: 14, border: `2px solid #F3F4F6`, transition: 'border-color 0.2s' },
  audienceTitle: { fontSize: 15, fontWeight: 800, color: '#0A0A0A', marginBottom: 8 },
  audienceBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  cta: { background: '#0A0A0A', padding: '80px 20px' },
  ctaInner: { maxWidth: 600, margin: '0 auto', textAlign: 'center' },
  ctaTitle: { fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: '#FFFFFF', marginBottom: 16, letterSpacing: '-0.5px' },
  ctaSub: { fontSize: 16, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 32 },
  ctaBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },

  footer: { background: '#FAFAFA', borderTop: '1px solid #F3F4F6', padding: '40px 20px' },
  footerInner: { maxWidth: 700, margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 },
  footerLeft: {},
  footerLogo: { fontSize: 18, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px', display: 'block', marginBottom: 8 },
  footerTagline: { fontSize: 13, color: '#9CA3AF' },
  footerRight: { textAlign: 'right' },
  footerCredit: { fontSize: 14, color: '#374151', marginBottom: 4 },
  footerSub: { fontSize: 12, color: '#9CA3AF' },
};
