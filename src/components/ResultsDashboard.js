import React, { useState } from 'react';
import { modeConfig } from '../data/questions';
import { Analytics } from '../lib/analytics';

const modeAccents = { hackathon: '#7C3AED', startup: '#2563EB' };

const TABS = {
  hackathon: ['Your Report', 'Pitch Framework', 'Proof Points'],
  startup: ['Your Report', 'Roadmap', 'Proof Points'],
};

export default function ResultsDashboard({ mode, answers, analysis, onReset, onEdit }) {
  const [tab, setTab] = useState('Your Report');
  const config = modeConfig[mode];
  const accent = modeAccents[mode];
  const tabs = TABS[mode];

  const name = answers.startup_q1
    ? answers.startup_q1.slice(0, 40) + '...'
    : answers.hack_q1
    ? answers.hack_q1.slice(0, 40) + '...'
    : 'Your Project';

  const handleTab = (t) => { setTab(t); Analytics.reportTabViewed(t, mode); };

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.breadcrumb}>
              <span style={{ color: accent, fontWeight: 700 }}>{config.label}</span>
              <span style={s.sep}>›</span>
              <span>Your Report</span>
            </div>
            <h1 style={s.title}>Reality Check Report</h1>
          </div>
          <div style={s.headerBtns}>
            <button style={s.btn} onClick={onEdit}>Edit answers</button>
            <button style={s.btn} onClick={() => { Analytics.restartClicked(); onReset(); }}>New project</button>
          </div>
        </div>

        {/* Score banner */}
        <div style={{ ...s.scoreBanner, borderTop: `3px solid ${accent}` }}>
          <div style={s.scoreLeft}>
            <span style={{ ...s.scoreNum, color: analysis.color }}>{analysis.score}</span>
            <span style={s.scoreTag}>out of 100</span>
          </div>
          <div style={s.scoreMid}>
            <span style={{ ...s.scoreVerdict, color: analysis.color }}>{analysis.verdict}</span>
            <div style={s.barTrack}>
              <div style={{ ...s.barFill, width: `${analysis.score}%`, background: analysis.color }} />
            </div>
          </div>
          <div style={s.scoreRight}>
            <span style={s.countGreen}>{analysis.insights?.length || 0} insights</span>
            <span style={s.countRed}>{analysis.challenges?.length || 0} challenges</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? accent : '#6B7280', borderBottomColor: tab === t ? accent : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => handleTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div key={tab} className="fade-in">
          {tab === 'Your Report' && <ReportTab analysis={analysis} accent={accent} answers={answers} mode={mode} />}
          {tab === 'Pitch Framework' && <PitchTab analysis={analysis} accent={accent} />}
          {tab === 'Roadmap' && <RoadmapTab analysis={analysis} accent={accent} />}
          {tab === 'Proof Points' && <ProofTab analysis={analysis} />}
        </div>

      </div>
    </div>
  );
}

function ReportTab({ analysis, accent, answers, mode }) {
  return (
    <div>
      <SectionHead title="What your answers reveal" sub="This report is based on exactly what you said. Not a generic template." />

      {/* Insights */}
      {analysis.insights?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>What is working in your thinking</p>
          {analysis.insights.map((item, i) => (
            <div key={i} style={{
              ...s.insightCard,
              borderLeftColor: item.type === 'strength' ? '#15803D' : item.type === 'neutral' ? '#2563EB' : '#D97706',
            }}>
              <div style={s.insightTop}>
                <span style={{
                  ...s.insightBadge,
                  background: item.type === 'strength' ? '#F0FDF4' : item.type === 'neutral' ? '#EFF6FF' : '#FFFBEB',
                  color: item.type === 'strength' ? '#15803D' : item.type === 'neutral' ? '#2563EB' : '#D97706',
                }}>
                  {item.type === 'strength' ? 'Strength' : item.type === 'neutral' ? 'Note' : 'Watch'}
                </span>
              </div>
              <p style={s.insightText}>{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Challenges */}
      {analysis.challenges?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>What needs to change</p>
          {analysis.challenges.map((item, i) => (
            <div key={i} style={{ ...s.challengeCard, borderLeftColor: item.level === 'high' ? '#DC2626' : item.level === 'medium' ? '#D97706' : '#9CA3AF' }}>
              <div style={s.challengeTop}>
                <span style={{
                  ...s.challengeBadge,
                  background: item.level === 'high' ? '#FEF2F2' : item.level === 'medium' ? '#FFFBEB' : '#F9FAFB',
                  color: item.level === 'high' ? '#DC2626' : item.level === 'medium' ? '#D97706' : '#6B7280',
                }}>
                  {item.level === 'high' ? 'Fix this now' : item.level === 'medium' ? 'Address soon' : 'Keep in mind'}
                </span>
              </div>
              <p style={s.challengeTitle}>{item.text}</p>
              <div style={s.responseBox}>
                <p style={s.responseText}>{item.response}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next steps */}
      {analysis.nextSteps?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>Your most important next steps</p>
          <div style={s.nextStepsCard}>
            {analysis.nextSteps.map((step, i) => (
              <div key={i} style={s.nextStep}>
                <div style={{ ...s.stepNum, background: accent }}>{i + 1}</div>
                <p style={s.stepText}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PitchTab({ analysis, accent }) {
  if (!analysis.pitchFramework) return <p style={s.empty}>Complete the hackathon questions to generate your pitch framework.</p>;
  return (
    <div>
      <SectionHead title="Your Pitch Framework" sub="A structured 3 minute pitch built from your actual answers." />
      {analysis.pitchFramework.map((step, i) => (
        <div key={i} style={{ ...s.pitchCard, borderLeft: `3px solid ${accent}` }}>
          <div style={s.pitchTop}>
            <span style={{ ...s.pitchStep, color: accent }}>{step.step}</span>
            <span style={s.pitchDur}>{step.duration}</span>
          </div>
          <p style={s.pitchContent}>{step.content}</p>
          <div style={s.tipBox}>
            <p style={s.tipText}>{step.tip}</p>
          </div>
        </div>
      ))}
      <div style={s.practiceBox}>
        <p style={s.practiceText}>Practice this pitch out loud at least 3 times before presenting. Time each section. The most common mistake is spending too long on the problem and not enough time on the live demo.</p>
      </div>
    </div>
  );
}

function RoadmapTab({ analysis, accent }) {
  if (!analysis.roadmap) return <p style={s.empty}>No roadmap available.</p>;
  return (
    <div>
      <SectionHead title="90-Day Roadmap" sub="Phase by phase execution plan from validation to first paying customers." />
      {analysis.roadmap.map((phase, i) => (
        <div key={i} style={{ ...s.phaseCard, borderLeftColor: phase.color }}>
          <div style={s.phaseTop}>
            <span style={{ ...s.phaseBadge, background: phase.color + '10', color: phase.color }}>{phase.week}</span>
            <h4 style={s.phaseTitle}>{phase.title}</h4>
          </div>
          <ul style={s.taskList}>
            {phase.tasks.map((t, j) => (
              <li key={j} style={s.taskItem}>
                <div style={{ ...s.taskDot, background: phase.color }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ProofTab({ analysis }) {
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

function SectionHead({ title, sub }) {
  return (
    <div style={s.sectionHead}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <p style={s.sectionSub}>{sub}</p>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#FAFAFA', padding: '28px 20px 64px' },
  wrap: { maxWidth: 780, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4 },
  sep: { color: '#D1D5DB' },
  title: { fontSize: 26, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.4px' },
  headerBtns: { display: 'flex', gap: 8 },
  btn: { padding: '8px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  scoreBanner: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '20px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  scoreLeft: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70 },
  scoreNum: { fontSize: 42, fontWeight: 800, lineHeight: 1, letterSpacing: '-1px' },
  scoreTag: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 },
  scoreMid: { flex: 1, minWidth: 140 },
  scoreVerdict: { fontSize: 17, fontWeight: 700, marginBottom: 8, display: 'block', letterSpacing: '-0.2px' },
  barTrack: { height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 0.8s ease' },
  scoreRight: { display: 'flex', flexDirection: 'column', gap: 4 },
  countGreen: { fontSize: 13, color: '#15803D', fontWeight: 600 },
  countRed: { fontSize: 13, color: '#DC2626', fontWeight: 600 },
  tabBar: { display: 'flex', borderBottom: '1.5px solid #F3F4F6', marginBottom: 24, overflowX: 'auto' },
  tabBtn: { padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit' },
  section: { marginBottom: 28 },
  sectionHead: { marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionTitle: { fontSize: 19, fontWeight: 800, color: '#0A0A0A', marginBottom: 4, letterSpacing: '-0.3px' },
  sectionSub: { fontSize: 14, color: '#6B7280' },
  colLabel: { fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  insightCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  insightTop: { marginBottom: 6 },
  insightBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.02em' },
  insightText: { fontSize: 14, color: '#111827', lineHeight: 1.7 },
  challengeCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  challengeTop: { marginBottom: 6 },
  challengeBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6 },
  challengeTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 10, letterSpacing: '-0.1px' },
  responseBox: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '12px 14px' },
  responseText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  nextStepsCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  nextStep: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 12, fontWeight: 800, flexShrink: 0 },
  stepText: { fontSize: 14, color: '#111827', lineHeight: 1.65, paddingTop: 3 },
  empty: { color: '#9CA3AF', fontSize: 14, padding: '24px 0' },
  pitchCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderRadius: '0 12px 12px 0', padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  pitchTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pitchStep: { fontSize: 13, fontWeight: 800, letterSpacing: '-0.1px' },
  pitchDur: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  pitchContent: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  tipBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' },
  tipText: { fontSize: 13, color: '#15803D', lineHeight: 1.6 },
  practiceBox: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginTop: 16 },
  practiceText: { fontSize: 14, color: '#92400E', lineHeight: 1.7 },
  phaseCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  phaseTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  phaseBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  phaseTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.1px' },
  taskList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  taskItem: { display: 'flex', gap: 10, fontSize: 14, color: '#374151', lineHeight: 1.6, alignItems: 'flex-start' },
  taskDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 7 },
  proofCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  proofTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  proofName: { fontSize: 17, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },
  proofCountry: { fontSize: 13, color: '#9CA3AF' },
  proofBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, marginLeft: 'auto' },
  proofResult: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 },
  lessonBox: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '10px 12px' },
  lessonText: { fontSize: 13, color: '#374151', lineHeight: 1.65 },
};
