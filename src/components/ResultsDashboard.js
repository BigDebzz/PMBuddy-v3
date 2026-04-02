import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { deepAnalyze } from '../lib/gemini';
import { modeConfig } from '../data/questions';
import { Analytics } from '../lib/analytics';

const modeAccents = { hackathon: '#7C3AED', startup: '#2563EB' };

const TABS = {
  hackathon: ['Report', 'AI Analysis', 'Pitch Structure', 'Tools to Use', 'Proof Points'],
  startup: ['Report', 'AI Analysis', 'Roadmap', 'Tools to Use', 'Methodology', 'Proof Points'],
};

export default function ResultsDashboard({ mode, answers, analysis, onReset, onEdit, onSave, user, projectId }) {
  const [tab, setTab] = useState('Report');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!projectId);
  const [title, setTitle] = useState('');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [deepAnalysis, setDeepAnalysis] = useState(null);
  const [deepLoading, setDeepLoading] = useState(false);
  const config = modeConfig[mode];
  const accent = modeAccents[mode];
  const tabs = TABS[mode];

  const handleTab = (t) => {
    setTab(t);
    Analytics.reportTabViewed(t, mode);
    if (t === 'AI Analysis' && !deepAnalysis && !deepLoading) {
      runDeepAnalysis();
    }
  };

  const runDeepAnalysis = async () => {
    setDeepLoading(true);
    const result = await deepAnalyze(mode, answers);
    setDeepAnalysis(result);
    setDeepLoading(false);
  };

  const handleSave = async () => {
    if (!user) { onSave(); return; }
    if (!title.trim() && !projectId) { setShowTitleInput(true); return; }
    setSaving(true);
    await onSave(title.trim() || 'Untitled project');
    setSaving(false);
    setSaved(true);
    setShowTitleInput(false);
  };

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
            <h1 style={s.title}>Your Validation Report</h1>
          </div>
          <div style={s.headerBtns}>
            <button style={s.btn} onClick={onEdit}>Edit answers</button>
            <button style={s.btn} onClick={() => { Analytics.restartClicked(); onReset(); }}>New project</button>
            {saved ? (
              <button style={s.savedBtn} disabled>Saved</button>
            ) : (
              <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save project'}
              </button>
            )}
          </div>
        </div>

        {showTitleInput && (
          <div style={s.titleInputRow}>
            <input
              style={s.titleInput}
              placeholder="Give this project a name e.g. Fintech MVP idea"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button style={s.btn} onClick={() => setShowTitleInput(false)}>Cancel</button>
          </div>
        )}

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
            <span style={s.countGreen}>{analysis.insights?.length || 0} strengths found</span>
            <span style={s.countRed}>{analysis.challenges?.length || 0} issues to fix</span>
          </div>
        </div>

        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? accent : '#6B7280', borderBottomColor: tab === t ? accent : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => handleTab(t)}>
              {t === 'AI Analysis' ? '✦ AI Analysis' : t}
            </button>
          ))}
        </div>

        <div key={tab} className="fade-in">
          {tab === 'Report' && <ReportTab analysis={analysis} accent={accent} />}
          {tab === 'AI Analysis' && <AIAnalysisTab deepAnalysis={deepAnalysis} deepLoading={deepLoading} accent={accent} />}
          {tab === 'Pitch Structure' && <PitchTab analysis={analysis} accent={accent} />}
          {tab === 'Roadmap' && <RoadmapTab analysis={analysis} accent={accent} />}
          {tab === 'Tools to Use' && <ToolsTab analysis={analysis} accent={accent} />}
          {tab === 'Methodology' && <MethodologyTab analysis={analysis} />}
          {tab === 'Proof Points' && <ProofTab analysis={analysis} />}
        </div>

        <FeedbackForm mode={mode} />

      </div>
    </div>
  );
}

function AIAnalysisTab({ deepAnalysis, deepLoading, accent }) {
  if (deepLoading) {
    return (
      <div style={s.aiLoading}>
        <div style={s.aiSpinner} />
        <p style={s.aiLoadingText}>Reading your answers and generating a personalised analysis...</p>
        <p style={s.aiLoadingSubtext}>This takes about 10 seconds</p>
      </div>
    );
  }

  if (!deepAnalysis) {
    return <p style={s.empty}>Something went wrong generating the AI analysis. Please try again.</p>;
  }

  return (
    <div>
      <SectionHead
        title="AI Powered Deep Analysis"
        sub="Gemini has read every word of your answers and responded directly to your specific situation. Not a template."
      />

      {deepAnalysis.founderMessage && (
        <div style={s.founderMsg}>
          <p style={s.founderMsgLabel}>A message for you</p>
          <p style={s.founderMsgText}>{deepAnalysis.founderMessage}</p>
        </div>
      )}

      {deepAnalysis.topPriority && (
        <div style={s.topPriority}>
          <p style={s.topPriorityLabel}>Your single most important next action</p>
          <p style={s.topPriorityText}>{deepAnalysis.topPriority}</p>
        </div>
      )}

      {deepAnalysis.deepInsights?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>What Gemini found in your answers</p>
          {deepAnalysis.deepInsights.map((item, i) => (
            <div key={i} style={{ ...s.insightCard, borderLeftColor: item.type === 'strength' ? '#15803D' : item.type === 'neutral' ? '#2563EB' : '#D97706' }}>
              <span style={{ ...s.badge, background: item.type === 'strength' ? '#F0FDF4' : item.type === 'neutral' ? '#EFF6FF' : '#FFFBEB', color: item.type === 'strength' ? '#15803D' : item.type === 'neutral' ? '#2563EB' : '#D97706' }}>
                {item.type === 'strength' ? 'Strength' : item.type === 'neutral' ? 'Note' : 'Watch'}
              </span>
              <p style={s.insightText}>{item.text}</p>
            </div>
          ))}
        </div>
      )}

      {deepAnalysis.deepChallenges?.length > 0 && (
        <div style={s.section}>
          <p style={s.colLabel}>Challenges specific to your situation</p>
          {deepAnalysis.deepChallenges.map((item, i) => (
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
    </div>
  );
}

function ReportTab({ analysis, accent }) {
  return (
    <div>
      <SectionHead title="What your answers reveal" sub="This report is based on exactly what you said. Every insight and challenge is a direct response to your answers." />
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
          <p style={s.colLabel}>Your most important next steps in order</p>
          <div style={s.stepsCard}>
            {analysis.nextSteps.map((step, i) => (
              <div key={i} style={s.stepRow}>
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
  if (!analysis.pitchStructure) return <p style={s.empty}>Complete the hackathon questions to generate your pitch structure.</p>;
  return (
    <div>
      <SectionHead title="Your Pitch Structure" sub="A 3 minute pitch framework built from your actual answers. Use this as your script." />
      {analysis.pitchStructure.map((step, i) => (
        <div key={i} style={{ ...s.phaseCard, borderLeftColor: accent }}>
          <div style={s.phaseTop}>
            <span style={{ ...s.phaseBadge, background: accent + '10', color: accent }}>{step.step}</span>
            <span style={s.duration}>{step.duration}</span>
          </div>
          <p style={s.pitchContent}>{step.content}</p>
          {step.tip && (
            <div style={s.tipBox}>
              <p style={s.tipText}><strong>Tip:</strong> {step.tip}</p>
            </div>
          )}
        </div>
      ))}
      <div style={s.practiceBox}>
        <p style={s.practiceText}><strong>Practice advice:</strong> Record yourself giving this pitch. Watch it back once. Fix the part where you slow down or sound unsure. That is the part judges will notice.</p>
      </div>
    </div>
  );
}

function RoadmapTab({ analysis, accent }) {
  if (!analysis.roadmap) return <p style={s.empty}>No roadmap generated.</p>;
  return (
    <div>
      <SectionHead title="Your Execution Roadmap" sub="Phase by phase plan from validation to first paying customers. Follow this sequence." />
      {analysis.roadmap.map((phase, i) => (
        <div key={i} style={{ ...s.phaseCard, borderLeftColor: phase.color }}>
          <div style={s.phaseTop}>
            <span style={{ ...s.phaseBadge, background: phase.color + '10', color: phase.color }}>{phase.phase}</span>
            <h4 style={s.phaseTitle}>{phase.title}</h4>
            <span style={s.duration}>{phase.duration}</span>
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

function ToolsTab({ analysis, accent }) {
  const tools = analysis.tools;
  if (!tools || tools.length === 0) return <p style={s.empty}>No tool recommendations generated.</p>;
  return (
    <div>
      <SectionHead title="Tools Recommended for You" sub="Specific tools based on your team, timeline, and what you are building. All free or free to start." />
      {tools.map((group, i) => (
        <div key={i} style={s.section}>
          <p style={s.colLabel}>{group.category}</p>
          {group.items.map((tool, j) => (
            <div key={j} style={s.toolCard}>
              <div style={s.toolTop}>
                <span style={s.toolName}>{tool.name}</span>
                {tool.free && <span style={s.freeBadge}>Free to start</span>}
              </div>
              <p style={s.toolUse}>{tool.use}</p>
              <p style={s.toolLink}>{tool.link}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MethodologyTab({ analysis }) {
  const m = analysis.methodology;
  if (!m) return <p style={s.empty}>No methodology recommendation generated.</p>;
  return (
    <div>
      <SectionHead title="Recommended Project Management Approach" sub="Based on your team size, timeline, and stage. Here is how to actually run this project." />
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
      <SectionHead title="Real World Proof Points" sub="Products that started where you are. What they did right and what they learned the hard way." />
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

function FeedbackForm({ mode }) {
  const [rating, setRating] = useState(0);
  const [useful, setUseful] = useState('');
  const [missing, setMissing] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const ratingLabels = ['', 'Not useful at all', 'Somewhat useful', 'Useful but incomplete', 'Very useful', 'Exactly what I needed'];

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    await supabase.from('feedback').insert({
      mode,
      rating,
      useful_text: useful,
      missing_text: missing,
      email: email || null,
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={s.feedbackCard}>
        <p style={s.feedbackThanks}>Thank you. Your feedback helps make PM Buddy better for every founder after you.</p>
      </div>
    );
  }

  return (
    <div style={s.feedbackCard}>
      <p style={s.feedbackTitle}>Was this report useful?</p>
      <p style={s.feedbackSub}>Takes 60 seconds. Helps us improve for every founder after you.</p>
      <div style={s.starRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)} style={{ ...s.star, color: n <= rating ? '#F59E0B' : '#D1D5DB' }}>★</button>
        ))}
        <span style={s.starLabel}>{rating > 0 ? ratingLabels[rating] : 'How useful was this report?'}</span>
      </div>
      <textarea style={s.feedbackInput} placeholder="What was most useful?" value={useful} onChange={e => setUseful(e.target.value)} rows={2} />
      <textarea style={s.feedbackInput} placeholder="What was missing or could be better?" value={missing} onChange={e => setMissing(e.target.value)} rows={2} />
      <input style={s.feedbackInputSingle} placeholder="Your email (optional) — get notified about new features" value={email} onChange={e => setEmail(e.target.value)} />
      <button style={{ ...s.feedbackBtn, opacity: rating === 0 ? 0.5 : 1 }} onClick={handleSubmit} disabled={rating === 0 || loading}>
        {loading ? 'Sending...' : 'Send feedback'}
      </button>
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
  headerBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { padding: '8px 16px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  saveBtn: { padding: '8px 16px', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  savedBtn: { padding: '8px 16px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'default', fontFamily: 'inherit' },
  titleInputRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  titleInput: { flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '9px 14px', fontSize: 14, fontFamily: 'inherit', color: '#111827', outline: 'none', minWidth: 200 },
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
  badge: { display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, marginBottom: 8 },
  insightCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  insightText: { fontSize: 14, color: '#111827', lineHeight: 1.7 },
  challengeCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '14px 16px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  challengeTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', marginBottom: 10, letterSpacing: '-0.1px' },
  responseBox: { background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, padding: '12px 14px' },
  responseText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  stepsCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  stepRow: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 },
  stepNum: { width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: 12, fontWeight: 800, flexShrink: 0 },
  stepText: { fontSize: 14, color: '#111827', lineHeight: 1.65, paddingTop: 3 },
  empty: { color: '#9CA3AF', fontSize: 14, padding: '24px 0' },
  phaseCard: { background: '#FFFFFF', border: '1px solid #F3F4F6', borderLeft: '3px solid', borderRadius: '0 12px 12px 0', padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
  phaseTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' },
  phaseBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  phaseTitle: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.1px' },
  duration: { fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginLeft: 'auto' },
  taskList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  taskItem: { display: 'flex', gap: 10, fontSize: 14, color: '#374151', lineHeight: 1.6, alignItems: 'flex-start' },
  taskDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 7 },
  pitchContent: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 10 },
  tipBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px' },
  tipText: { fontSize: 13, color: '#15803D', lineHeight: 1.6 },
  practiceBox: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginTop: 16 },
  practiceText: { fontSize: 14, color: '#92400E', lineHeight: 1.7 },
  toolCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  toolTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  toolName: { fontSize: 15, fontWeight: 700, color: '#0A0A0A' },
  freeBadge: { fontSize: 11, fontWeight: 700, background: '#F0FDF4', color: '#15803D', padding: '2px 8px', borderRadius: 100 },
  toolUse: { fontSize: 14, color: '#374151', lineHeight: 1.65, marginBottom: 4 },
  toolLink: { fontSize: 12, color: '#2563EB', fontWeight: 600 },
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
  feedbackCard: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 16, padding: '28px', marginTop: 48, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  feedbackTitle: { fontSize: 18, fontWeight: 800, color: '#0A0A0A', marginBottom: 4, letterSpacing: '-0.3px' },
  feedbackSub: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  feedbackThanks: { fontSize: 16, fontWeight: 600, color: '#15803D', textAlign: 'center', padding: '16px 0' },
  starRow: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20, flexWrap: 'wrap' },
  star: { fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', lineHeight: 1 },
  starLabel: { fontSize: 13, color: '#6B7280', fontWeight: 600, marginLeft: 8 },
  feedbackInput: { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', marginBottom: 12, resize: 'vertical', boxSizing: 'border-box', color: '#111827', outline: 'none' },
  feedbackInputSingle: { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', marginBottom: 20, boxSizing: 'border-box', color: '#111827', outline: 'none' },
  feedbackBtn: { background: '#0A0A0A', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  aiLoading: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px', gap: 16 },
  aiSpinner: { width: 36, height: 36, border: '3px solid #F3F4F6', borderTop: '3px solid #2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  aiLoadingText: { fontSize: 15, fontWeight: 600, color: '#374151', textAlign: 'center' },
  aiLoadingSubtext: { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  founderMsg: { background: '#0A0A0A', borderRadius: 14, padding: '20px 22px', marginBottom: 20 },
  founderMsgLabel: { fontSize: 11, fontWeight: 700, color: '#550000', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  founderMsgText: { fontSize: 15, color: '#FFFFFF', lineHeight: 1.75, fontStyle: 'italic' },
  topPriority: { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '20px 22px', marginBottom: 24 },
  topPriorityLabel: { fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 },
  topPriorityText: { fontSize: 15, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.65 },
};
