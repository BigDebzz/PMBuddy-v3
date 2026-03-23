import React, { useState } from 'react';
import { modeConfig } from '../data/questions';
import { LogoIcon, ZapIcon, RocketIcon, ArrowRightIcon } from '../lib/icons';
import { Analytics } from '../lib/analytics';

const modeIcons = { hackathon: ZapIcon, startup: RocketIcon };

export default function LandingScreen({ onSelectMode }) {
  const [hovered, setHovered] = useState(null);
  const modes = Object.values(modeConfig);

  const handleSelect = (modeId) => {
    Analytics.modeSelected(modeId);
    onSelectMode(modeId);
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        {/* Logo */}
        <div style={s.logoRow}>
          <LogoIcon size={40} />
          <span style={s.logoText}>PM Buddy</span>
        </div>

        {/* Hero */}
        <div style={s.hero}>
          <h1 style={s.headline}>
            Stop building on assumptions.
          </h1>
          <p style={s.sub}>
            Answer focused questions about your idea and get an honest validation report, action plan, and execution framework — in minutes.
          </p>
        </div>

        {/* Mode cards */}
        <div style={s.modeLabel}>Select your path</div>
        <div style={s.cards}>
          {modes.map((mode) => {
            const Icon = modeIcons[mode.id];
            const isHovered = hovered === mode.id;
            return (
              <button
                key={mode.id}
                style={{
                  ...s.card,
                  borderColor: isHovered ? mode.accent : '#E5E7EB',
                  boxShadow: isHovered
                    ? `0 8px 30px ${mode.accent}18, 0 2px 8px rgba(0,0,0,0.06)`
                    : '0 2px 8px rgba(0,0,0,0.06)',
                  transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                }}
                onClick={() => handleSelect(mode.id)}
                onMouseEnter={() => setHovered(mode.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Icon */}
                <div style={{
                  ...s.iconBox,
                  background: isHovered ? mode.accent + '10' : '#F3F4F6',
                  color: isHovered ? mode.accent : '#6B7280',
                }}>
                  <Icon size={22} />
                </div>

                {/* Text */}
                <div style={s.cardText}>
                  <div style={s.cardTop}>
                    <span style={s.cardTitle}>{mode.label}</span>
                    <span style={{ ...s.cardMeta, color: isHovered ? mode.accent : '#9CA3AF' }}>
                      {mode.time} · {mode.questions} questions
                    </span>
                  </div>
                  <p style={s.cardTagline}>{mode.tagline}</p>
                  <p style={s.cardDesc}>{mode.description}</p>
                </div>

                {/* Arrow */}
                <div style={{ color: isHovered ? mode.accent : '#D1D5DB', transition: 'color 0.2s', flexShrink: 0 }}>
                  <ArrowRightIcon size={18} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Trust line */}
        <div style={s.trust}>
          <span style={s.trustDot} />
          <span>Free to use</span>
          <span style={s.divider} />
          <span>No sign-up required</span>
          <span style={s.divider} />
          <span>Built on research from 21,000 startups</span>
          <span style={s.trustDot} />
        </div>

        {/* Why section */}
        <div style={s.why}>
          <h2 style={s.whyTitle}>Built for builders who want to get it right</h2>
          <div style={s.whyGrid}>
            {[
              { num: '01', title: 'Honest, not encouraging', body: 'PM Buddy asks hard questions and flags risks others miss. It does not tell you what you want to hear.' },
              { num: '02', title: 'Grounded in real data', body: 'Every recommendation draws from 21,000 startup founder profiles, African startup case studies, and proven PM frameworks.' },
              { num: '03', title: 'Built for emerging markets', body: 'Nigerian regulators, African market dynamics, realistic budgets, and local examples throughout. Not generic Silicon Valley advice.' },
              { num: '04', title: 'Execution, not just validation', body: 'You leave with a sprint plan or 90-day roadmap you can act on immediately, not a score you forget tomorrow.' },
            ].map(item => (
              <div key={item.num} style={s.whyItem}>
                <span style={s.whyNum}>{item.num}</span>
                <div>
                  <p style={s.whyItemTitle}>{item.title}</p>
                  <p style={s.whyItemBody}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p style={s.footer}>PM Buddy · Built for builders everywhere · Free forever</p>

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#FFFFFF', padding: '48px 20px 64px' },
  wrap: { maxWidth: 680, margin: '0 auto' },

  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 },
  logoText: { fontSize: 20, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },

  hero: { marginBottom: 48 },
  headline: { fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, color: '#0A0A0A', lineHeight: 1.15, marginBottom: 16, letterSpacing: '-0.5px' },
  sub: { fontSize: 17, color: '#6B7280', lineHeight: 1.75, maxWidth: 520 },

  modeLabel: { fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 },

  cards: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 },
  card: {
    display: 'flex', alignItems: 'flex-start', gap: 16,
    background: '#FFFFFF', border: '1.5px solid #E5E7EB',
    borderRadius: 16, padding: '20px 18px',
    cursor: 'pointer', textAlign: 'left',
    transition: 'all 0.2s ease', width: '100%',
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.2s ease',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  cardTitle: { fontSize: 16, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.2px' },
  cardMeta: { fontSize: 12, fontWeight: 600, transition: 'color 0.2s', whiteSpace: 'nowrap' },
  cardTagline: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },

  trust: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: '#9CA3AF', marginBottom: 56 },
  trustDot: { display: 'none' },
  divider: { display: 'block', width: 1, height: 14, background: '#E5E7EB' },

  why: { borderTop: '1px solid #F3F4F6', paddingTop: 48, marginBottom: 48 },
  whyTitle: { fontSize: 22, fontWeight: 800, color: '#0A0A0A', marginBottom: 28, letterSpacing: '-0.3px' },
  whyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 },
  whyItem: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  whyNum: { fontSize: 11, fontWeight: 800, color: '#E5E7EB', letterSpacing: '0.05em', paddingTop: 3, flexShrink: 0 },
  whyItemTitle: { fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginBottom: 4 },
  whyItemBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.65 },

  footer: { fontSize: 13, color: '#D1D5DB', textAlign: 'center' },
};
