import React, { useState } from 'react';
import { modeConfig } from '../data/questions';
import { Analytics } from '../lib/analytics';

const TABS = {
  hackathon: ['Reality Check', 'Sprint Plan', 'Pitch Framework', 'Proof Points', 'Best Practices'],
  startup: ['Reality Check', 'Roadmap', 'Methodology', 'Scalability', 'Proof Points', 'Best Practices'],
};

export default function ResultsDashboard({ mode, answers, analysis, onReset, onEdit }) {
  const [tab, setTab] = useState(TABS[mode][0]);
  const config = modeConfig[mode];
  const accent = config.accent;
  const tabs = TABS[mode];

  const handleTabChange = (t) => {
    setTab(t);
    Analytics.reportTabViewed(t, mode);
  };

  const name = answers.startupName || answers.hackProblem?.slice(0, 40) || 'Your Project';

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.breadcrumb}>
              <span style={{ ...s.breadMode, color: accent }}>{config.label}</span>
              <span style={s.breadSep}>›</span>
              <span style={s.breadLabel}>Reality Check Report</span>
            </div>
            <h1 style={s.title}>{name}</h1>
          </div>
          <div style={s.headerBtns}>
            <button style={s.btnGhost} onClick={onEdit}>Edit answers</button>
            <button style={s.btnGhost} onClick={() => { Analytics.restartClicked(); onReset(); }}>New project</button>
          </div>
        </div>

        {/* Score banner */}
        <div style={{ ...s.scoreBanner, borderTop: `3px solid ${accent}` }}>
          <div style={s.scoreBlock}>
            <span style={{ ...s.scoreNumber, color: analysis.color }}>{analysis.score}</span>
            <span style={s.scoreLabel}>out of 100</span>
          </div>
          <div style={s.scoreMiddle}>
            <p style={{ ...s.scoreVerdict, color: analysis.color }}>{analysis.verdict}</p>
            <div style={s.barWrap}>
              <div style={s.barTrack}>
                <div style={{ ...s.barFill, width: `${analysis.score}%`, background: analysis.color }} />
              </div>
            </div>
          </div>
          <div style={s.scoreSummary}>
            <span style={s.countGreen}>{analysis.strengths?.length || 0} strengths identified</span>
            <span style={s.countRed}>{analysis.risks?.length || 0} risks to address</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {tabs.map(t => (
            <button
              key={t}
              style={{
                ...s.tabBtn,
                color: tab === t ? accent : '#6B7280',
                borderBottomColor: tab === t ? accent : 'transparent',
                fontWeight: tab === t ? 700 : 500,
              }}
              onClick={() => handleTabChange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div key={tab} style={s.content} className="fade-in">
          {tab === 'Reality Check' && <RealityCheck analysis={analysis} accent={accent} />}
          {tab === 'Sprint Plan' && <SprintPlan analysis={analysis} accent={accent} />}
          {tab === 'Pitch Framework' && <PitchFramework analysis={analysis} accent={accent} />}
          {tab === 'Roadmap' && <Roadmap analysis={analysis} accent={accent} />}
          {tab === 'Methodology' && <Methodology analysis={analysis} />}
          {tab === 'Scalability' && <Scalability analysis={analysis} accent={accent} />}
          {tab === 'Proof Points' && <ProofPoints analysis={analysis} />}
          {tab === 'Best Practices' && <BestPractices analysis={analysis} />}
        </div>

      </div>
    </div>
  );
}

function RealityCheck({ analysis, accent }) {
  return (
    <div>
      <SectionHead title="Reality Check" sub="An honest assessment of where your idea stands right now." />
      <div style={s.twoCol}>
        <div>
          <p style={s.colLabel}>What is working</p>
          {analysis.strengths?.length > 0
            ? analysis.strengths.map((item, i) => (
                <div key={i} style={s.strengthItem}>
                  <div style={{ ...s.dot, background: '#15803D' }} />
                  <span style={s.strengthText}>{item}</span>
                </div>
              ))
            : <p style={s.empty}>Answer more questions to reveal strengths.</p>}
        </div>
        <div>
          <p style={s.colLabel}>What needs attention</p>
          {analysis.risks?.length > 0
            ? analysis.risks.map((r, i) => (
                <div key={i} style={{ ...s.riskCard, borderLeftColor: r.level === 'high' ? '#DC2626' : '#D97706' }}>
                  <span style={{ ...s.riskLevel, background: r.level === 'high' ? '#FEF2F2' : '#FFFBEB', color: r.level === 'high' ? '#DC2626' : '#D97706' }}>
                    {r.level === 'high' ? 'High priority' : 'Medium priority'}
                  </span>
                  <p style={s.riskText}>{r.text}</p>
                  <p style={s.riskAction}><strong>What to do:</strong> {r.action}</p>
                </div>
              ))
            : <p style={s.empty}>No critical risks detected. Keep validating.</p>}
        </div>
      </div>
    </div>
  );
}

function SprintPlan({ analysis, accent }) {
  if (!analysis.sprintPlan) return <p style={s.empty}>No sprint plan generated.</p>;
  return (
    <div>
      <SectionHead title="Sprint Plan" sub="Time-boxed execution plan based on your available time." />
      {analysis.sprintPlan.map((phase, i) => (
        <PhaseCard key={i} phase={phase.phase} title={phase.title} tasks={phase.tasks} accent={accent} />
      ))}
    </div>
  );
}

function PitchFramework({ analysis, accent }) {
  if (!analysis.pitchFramework) return <p style={s.empty}>Answer all questions to generate a pitch framework.</p>;
  return (
    <div>
      <SectionHead title="Pitch Framework" sub="A structured approach to your 3-minute hackathon pitch." />
      {analysis.pitchFramework.map((step, i) => (
        <div key={i} style={{ ...s.pitchCard, borderLeft: `3px solid ${accent}` }}>
          <div style={s.pitchTop}>
            <span style={{ ...s.pitchStep, color: accent }}>{step.step}</span>
            <span style={s.pitchDuration}>{step.duration}</span>
          </div>
          <p style={s.pitchContent}>{step.content}</p>
        </div>
      ))}
      <div style={s.pitchTip}>
        <p style={s.pitchTipText}>Practice your pitch out loud at least 3 times before presenting. Time yourself on each section. Judges decide in the first 30 seconds.</p>
      </div>
    </div>
  );
}

function Roadmap({ analysis, accent }) {
  if (!analysis.roadmap) return <p style={s.empty}>No roadmap generated.</p>;
  return (
    <div>
      <SectionHead title="90-Day Roadmap" sub="Phase by phase execution plan from validation to first customers." />
      {analysis.roadmap.map((phase, i) => (
        <PhaseCard key={i} phase={phase.week} title={phase.title} tasks={phase.tasks} accent={phase.color} />
      ))}
    </div>
  );
}

function Methodology({ analysis }) {
  const m = analysis.methodology;
  if (!m || typeof m === 'string') return null;
  return (
    <div>
      <SectionHead title="Recommended Methodology" sub="Based on your team size, timeline, and product stage." />
      <div style={{ ...s.methodCard, borderTop: `3px solid ${m.color}` }}>
        <h3 style={{ ...s.methodName, color: m.color }}>{m.name}</h3>
        <p style={s.methodText}><strong>Why this fits you:</strong> {m.why}</p>
        <p style={s.methodText}><strong>How to apply it:</strong> {m.howTo}</p>
        <div style={s.chipRow}>
          <span style={s.chipLabel}>Free tools to get started</span>
          {m.tools.map(t => (
            <span key={t} style={{ ...s.chip, borderColor: m.color + '40', color: m.color }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Scalability({ analysis, accent }) {
  const si = analysis.scalabilityInsight;
  if (!si) return <p style={s.empty}>Answer the scalability question to see this analysis.</p>;
  return (
    <div>
      <SectionHead title="Scalability Analysis" sub="How your business survives and wins as competition intensifies." />
      <div style={s.infoCard}>
        <p style={s.quoteText}>"{si.response}"</p>
        <p style={s.bodyText}>{si.assessment}</p>
      </div>
      <p style={{ ...s.colLabel, marginTop: 24 }}>Types of competitive moats</p>
      {si.moats.map((m, i) => (
        <div key={i} style={s.moatCard}>
          <div style={s.moatRow}>
            <strong style={s.moatName}>{m.type}</strong>
            <span style={{ ...s.strengthBadge, color: '#15803D', background: '#F0FDF4' }}>{m.strength}</span>
          </div>
          <p style={s.moatExample}>{m.example}</p>
        </div>
      ))}
    </div>
  );
}

function ProofPoints({ analysis }) {
  const proofs = analysis.proofPoints || [];
  return (
    <div>
      <SectionHead title="Real World Proof Points" sub="Products that started where you are and what they learned." />
      {proofs.map((p, i) => (
        <div key={i} style={s.proofCard}>
          <div style={s.proofTop}>
            <span style={s.proofName}>{p.name}</span>
            {p.country && <span style={s.proofCountry}>{p.country}</span>}
            <span style={{
              ...s.proofBadge,
              background: p.stage === 'success' ? '#F0FDF4' : '#FEF2F2',
              color: p.stage === 'success' ? '#15803D' : '#DC2626',
            }}>
              {p.stage === 'success' ? 'Succeeded' : 'Struggled'}
            </span>
          </div>
          <p style={s.proofResult}>{p.result}</p>
          <div style={s.lessonBox}>
            <p style={s.lessonText}><strong>Key lesson:</strong> {p.lesson}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BestPractices({ analysis }) {
  const practices = analysis.bestPractices || [];
  return (
    <div>
      <SectionHead title="Best Practices" sub="What the most successful founders do at this exact stage. Backed by real data." />
      {practices.map((p, i) => (
        <div key={i} style={s.practiceCard}>
          <h4 style={s.practiceTitle}>{p.title}</h4>
          <p style={s.bodyText}>{p.body}</p>
        </div>
      ))}
    </div>
  );
}

function SectionHead({ title, sub }) {
  return (
    <div style={s.sectionHead}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <p style={s.sectionSub}>{sub}</p>
    </div>
  );
}

function PhaseCard({ phase, title, tasks, accent }) {
  return (
    <div style={{ ...s.phaseCard, borderLeftColor: accent }}>
      <div style={s.phaseTop}>
        {phase && <span style={{ ...s.phaseBadge, background: accent + '10', color: accent }}>{phase}</span>}
        <h4 style={s.phaseTitle}>{title}</h4>
      </div>
      <ul style={s.taskList}>
        {tasks.map((t, i) => (
          <li key={i} style={s.taskItem}>
            <div style={{ ...s.taskDot, background: accent }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#FAFAFA', padding: '28px 20px 64px' },
  wrap: { maxWidth: 780, margin: '0 auto' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 6 },
  breadMode: { fontWeight: 700 },
  breadSep: { color: '#D1D5DB' },
  breadLabel: { color: '#6B7280', fontWeight: 500 },
  title: { fontSize: 26, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.4px' },
  headerBtns: { display: 'flex', gap: 8 },
  btnGhost: { padding: '8px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },

  scoreBanner: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  scoreBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 },
  scoreNumber: { fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' },
  scoreLabel: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 },
  scoreMiddle: { flex: 1, minWidth: 140 },
  scoreVerdict: { fontSize: 17, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.2px' },
  barWrap: {},
  barTrack: { height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' },
  scoreSummary: { display: 'flex', flexDirection: 'column', gap: 4 },
  countGreen: { fontSize: 13, color: '#15803D', fontWeight: 600 },
  countRed: { fontSize: 13, color: '#DC2626', fontWeight: 600 },

  tabBar: { display: 'flex', borderBottom: '1.5px solid #F3F4F6', marginBottom: 24, overflowX: 'auto', gap: 0 },
  tabBtn: { padding: '10px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit' },

  content: { minHeight: 280 },

  sectionHead: { marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionTitle: { fontSize: 19, fontWeight: 800, color: '#0A0A0A', marginBottom: 4, letterSpacing: '-0.3px' },
  sectionSub: { fontSize: 14, color: '#6B7280' },

  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  colLabel: { fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },

  strengthItem: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 6 },
  strengthText: { fontSize: 14, color: '#111827', lineHeight: 1.6 },
  strengthBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 },

  riskCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 10px 10px 0', padding: '13px 14px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  riskLevel: { display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, marginBottom: 6, letterSpacing: '0.02em' },
  riskText: { fontSize: 14, color: '#111827', lineHeight: 1.6, marginBottom: 6 },
  riskAction: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },

  empty: { color: '#9CA3AF', fontSize: 14, padding: '20px 0' },

  phaseCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  phaseTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  phaseBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  phaseTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.1px' },
  taskList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  taskItem: { display: 'flex', gap: 10, fontSize: 14, color: '#374151', lineHeight: 1.6, alignItems: 'flex-start' },
  taskDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 7 },

  pitchCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderRadius: '0 12px 12px 0', padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  pitchTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pitchStep: { fontSize: 13, fontWeight: 800, letterSpacing: '-0.1px' },
  pitchDuration: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  pitchContent: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  pitchTip: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '13px 16px', marginTop: 16 },
  pitchTipText: { fontSize: 13, color: '#15803D', lineHeight: 1.65 },

  methodCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  methodName: { fontSize: 22, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.3px' },
  methodText: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  chipRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  chipLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  chip: { padding: '4px 12px', borderRadius: 100, border: '1.5px solid', fontSize: 12, fontWeight: 600 },

  infoCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  quoteText: { fontSize: 15, color: '#374151', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 10 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },

  moatCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderRadius: 10, padding: '13px 16px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  moatRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  moatName: { fontSize: 14, color: '#0A0A0A' },
  moatExample: { fontSize: 13, color: '#6B7280', lineHeight: 1.55 },

  proofCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  proofTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  proofName: { fontSize: 17, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },
  proofCountry: { fontSize: 13, color: '#9CA3AF' },
  proofBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, marginLeft: 'auto' },
  proofResult: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 },
  lessonBox: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '10px 12px' },
  lessonText: { fontSize: 13, color: '#374151', lineHeight: 1.65 },

  practiceCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  practiceTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 6, letterSpacing: '-0.1px' },
};
