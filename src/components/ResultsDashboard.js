import React, { useState } from 'react';
import { modeConfig } from '../data/questions';
import { Analytics } from '../lib/analytics';

const modeAccents = { hackathon: '#7C3AED', startup: '#2563EB' };

const TABS = {
  hackathon: ['Report', 'Tools', 'Slide Structure', 'Action Plan', 'Proof Points'],
  startup: ['Report', 'Tools', 'Roadmap', 'Methodology', 'Proof Points'],
};

export default function ResultsDashboard({ mode, answers, analysis, onReset, onEdit }) {
  const [tab, setTab] = useState('Report');
  const config = modeConfig[mode];
  const accent = modeAccents[mode];
  const tabs = TABS[mode];

  const handleTab = (t) => { setTab(t); Analytics.reportTabViewed(t, mode); };

  return (
    <div style={s.page}>
      <div style={s.wrap}>

        <div style={s.header}>
          <div>
            <div style={s.breadcrumb}>
              <span style={{ color: accent, fontWeight: 700 }}>{config.label}</span>
              <span style={s.sep}>›</span>
              <span>Reality Check Report</span>
            </div>
            <h1 style={s.title}>Your Report</h1>
          </div>
          <div style={s.headerBtns}>
            <button style={s.btn} onClick={onEdit}>Edit answers</button>
            <button style={s.btn} onClick={() => { Analytics.restartClicked(); onReset(); }}>New project</button>
          </div>
        </div>

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

        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? accent : '#6B7280', borderBottomColor: tab === t ? accent : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => handleTab(t)}>
              {t}
            </button>
          ))}
        </div>

        <div key={tab} className="fade-in">
          {tab === 'Report' && <ReportTab analysis={analysis} accent={accent} />}
          {tab === 'Tools' && <ToolsTab analysis={analysis} accent={accent} mode={mode} />}
          {tab === 'Slide Structure' && <SlideTab analysis={analysis} accent={accent} />}
          {tab === 'Action Plan' && <ActionPlanTab analysis={analysis} accent={accent} />}
          {tab === 'Roadmap' && <RoadmapTab analysis={analysis} accent={accent} />}
          {tab === 'Methodology' && <MethodologyTab analysis={analysis} />}
          {tab === 'Proof Points' && <ProofTab analysis={analysis} />}
        </div>

      </div>
    </div>
  );
}

function ReportTab({ analysis, accent }) {
  return (
    <div>
      <SectionHead title="What your answers reveal" sub="This report is based on exactly what you said. Not a generic template." />

      {analysis.insights?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>What is working in your thinking</p>
          {analysis.insights.map((item, i) => (
            <div key={i} style={{ ...s.insightCard, borderLeftColor: item.type === 'strength' ? '#15803D' : item.type === 'neutral' ? '#2563EB' : '#D97706' }}>
              <span style={{ ...s.badge, background: item.type === 'strength' ? '#F0FDF4' : item.type === 'neutral' ? '#EFF6FF' : '#FFFBEB', color: item.type === 'strength' ? '#15803D' : item.type === 'neutral' ? '#2563EB' : '#D97706' }}>
                {item.type === 'strength' ? 'Strength' : item.type === 'neutral' ? 'Note' : 'Watch'}
              </span>
              <p style={s.insightText}>{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {analysis.challenges?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>What needs to change</p>
          {analysis.challenges.map((item, i) => (
            <div key={i} style={{ ...s.challengeCard, borderLeftColor: item.level === 'high' ? '#DC2626' : item.level === 'medium' ? '#D97706' : '#9CA3AF' }}>
              <span style={{ ...s.badge, background: item.level === 'high' ? '#FEF2F2' : item.level === 'medium' ? '#FFFBEB' : '#F9FAFB', color: item.level === 'high' ? '#DC2626' : item.level === 'medium' ? '#D97706' : '#6B7280' }}>
                {item.level === 'high' ? 'Fix this now' : item.level === 'medium' ? 'Address soon' : 'Keep in mind'}
              </span>
              <p style={s.challengeTitle}>{item.text}</p>
              <div style={s.responseBox}>
                <p style={s.responseText}>{item.response}</p>
              </div>
            </div>
          ))}
        </div>
      )}

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

function ToolsTab({ analysis, accent, mode }) {
  const [activeCategory, setActiveCategory] = useState(mode === 'hackathon' ? 'build' : 'build');
  const tools = analysis.tools || {};
  const categories = Object.keys(tools).filter(k => tools[k] && tools[k].length > 0);
  const categoryLabels = { build: 'Build', design: 'Design', pitch: 'Pitch', collaborate: 'Collaborate', payments: 'Payments', analytics: 'Analytics', marketing: 'Marketing', operations: 'Operations' };

  return (
    <div>
      <SectionHead title="Recommended Tools" sub="Tools selected based on your team setup and timeline. All have free tiers." />
      <div style={s.catTabs}>
        {categories.map(cat => (
          <button key={cat} style={{ ...s.catTab, borderColor: activeCategory === cat ? accent : '#E5E7EB', color: activeCategory === cat ? accent : '#6B7280', background: activeCategory === cat ? accent + '08' : '#FFFFFF' }} onClick={() => setActiveCategory(cat)}>
            {categoryLabels[cat] || cat}
          </button>
        ))}
      </div>
      <div style={s.toolsList}>
        {(tools[activeCategory] || []).map((tool, i) => (
          <div key={i} style={s.toolCard}>
            <div style={s.toolTop}>
              <span style={s.toolName}>{tool.name}</span>
              {tool.free && <span style={s.freeBadge}>Free tier available</span>}
            </div>
            <p style={s.toolUse}>{tool.use}</p>
            <a href={`https://${tool.link}`} target="_blank" rel="noopener noreferrer" style={{ ...s.toolLink, color: accent }}>
              Visit {tool.name} →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideTab({ analysis, accent }) {
  const slides = analysis.slideStructure || [];
  if (slides.length === 0) return <p style={s.empty}>Complete the hackathon questions to generate your slide structure.</p>;
  return (
    <div>
      <SectionHead title="Pitch Slide Structure" sub="A 5 slide pitch framework built from your actual answers. Stay under 3 minutes total." />
      {slides.map((slide, i) => (
        <div key={i} style={{ ...s.slideCard, borderLeft: `3px solid ${accent}` }}>
          <div style={s.slideTop}>
            <span style={{ ...s.slideName, color: accent }}>{slide.slide}: {slide.title}</span>
            <span style={s.slideDur}>{slide.duration}</span>
          </div>
          <p style={s.slideContent}>{slide.content}</p>
          <div style={s.tipBox}>
            <p style={s.tipText}>{slide.tip}</p>
          </div>
        </div>
      ))}
      <div style={s.practiceBox}>
        <p style={s.practiceText}>Practice this pitch out loud at least 3 times before presenting. Time each section. Always record a backup demo video. Live demos fail. Connectivity fails. Always have a backup.</p>
      </div>
    </div>
  );
}

function ActionPlanTab({ analysis, accent }) {
  const plan = analysis.actionPlan || [];
  if (plan.length === 0) return <p style={s.empty}>Complete the hackathon questions to generate your action plan.</p>;
  return (
    <div>
      <SectionHead title="Your Action Plan" sub="Hour by hour plan based on your hackathon timeline." />
      {plan.map((phase, i) => (
        <div key={i} style={{ ...s.phaseCard, borderLeftColor: accent }}>
          <div style={s.phaseTop}>
            <span style={{ ...s.phaseBadge, background: accent + '10', color: accent }}>{phase.phase}</span>
            <h4 style={s.phaseTitle}>{phase.title}</h4>
          </div>
          <ul style={s.taskList}>
            {phase.tasks.map((t, j) => (
              <li key={j} style={s.taskItem}>
                <div style={{ ...s.taskDot, background: accent }} />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RoadmapTab({ analysis, accent }) {
  const roadmap = analysis.roadmap || [];
  if (roadmap.length === 0) return <p style={s.empty}>No roadmap available.</p>;
  return (
    <div>
      <SectionHead title="90-Day Roadmap" sub="Phase by phase execution plan from validation to first paying customers." />
      {roadmap.map((phase, i) => (
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

function MethodologyTab({ analysis }) {
  const m = analysis.methodology;
  if (!m) return <p style={s.empty}>No methodology recommendation available.</p>;
  return (
    <div>
      <SectionHead title="Recommended Methodology" sub="Based on your team size, timeline, and current stage." />
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
            <span style={{ ...s.badge, background: p.stage === 'success' ? '#F0FDF4' : '#FEF2F2', color: p.stage === 'success' ? '#15803D' : '#DC2626', marginLeft: 'auto' }}>
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
  tabBtn: { padding: '10px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', fontFamily: 'inherit' },
  section: { marginBottom: 28 },
  sectionHead: { marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionTitle: { fontSize: 19, fontWeight: 800, color: '#0A0A0A', marginBottom: 4, letterSpacing: '-0.3px' },
  sectionSub: { fontSize: 14, color: '#6B7280' },
  colLabel: { fontSize: 12, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 },
  badge: { display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, marginBottom: 6 },
  insightCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  insightText: { fontSize: 14, color: '#111827', lineHeight: 1.7 },
  challengeCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  challengeTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 10, letterSpacing: '-0.1px' },
  responseBox: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '12px 14px' },
  responseText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  nextStepsCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  nextStep: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 12, fontWeight: 800, flexShrink: 0 },
  stepText: { fontSize: 14, color: '#111827', lineHeight: 1.65, paddingTop: 3 },
  empty: { color: '#9CA3AF', fontSize: 14, padding: '24px 0' },
  catTabs: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  catTab: { padding: '7px 14px', border: '1.5px solid', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  toolsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  toolCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  toolTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  toolName: { fontSize: 16, fontWeight: 700, color: '#0A0A0A' },
  freeBadge: { fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#F0FDF4', color: '#15803D' },
  toolUse: { fontSize: 14, color: '#374151', lineHeight: 1.65, marginBottom: 10 },
  toolLink: { fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  slideCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderRadius: '0 12px 12px 0', padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  slideTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  slideName: { fontSize: 14, fontWeight: 800 },
  slideDur: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  slideContent: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
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
  methodCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '22px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  methodName: { fontSize: 22, fontWeight: 800, marginBottom: 14, letterSpacing: '-0.3px' },
  methodText: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  chipRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  chipLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: 600 },
  chip: { padding: '4px 12px', borderRadius: 100, border: '1.5px solid', fontSize: 12, fontWeight: 600 },
  proofCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  proofTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  proofName: { fontSize: 17, fontWeight: 800, color: '#0A0A0A', letterSpacing: '-0.3px' },
  proofCountry: { fontSize: 13, color: '#9CA3AF' },
  proofResult: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 },
  lessonBox: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '10px 12px' },
  lessonText: { fontSize: 13, color: '#374151', lineHeight: 1.65 },
};
