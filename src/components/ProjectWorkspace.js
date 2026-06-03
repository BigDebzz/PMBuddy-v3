import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import DocumentGenerator from './DocumentGenerator';
import RemindersPanel from './RemindersPanel';
import TeamTab from './TeamTab';
import PMBuddyAssistant from './PMBuddyAssistant';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';

const AGILE_TABS = ['Overview', 'What We Are Building', 'Requirements', 'Work Cycles', 'Progress', 'What We Learned', 'Risks', 'Documents', 'Team', 'Reminders'];
const PREDICTIVE_TABS = ['Overview', 'Who Is Involved', 'Scope', 'Requirements', 'Planning', 'Risks and Compliance', 'Progress', 'Documents', 'Team', 'Reminders'];
const HYBRID_TABS = ['Overview', 'What We Are Building', 'Requirements', 'Who Is Involved', 'Planning', 'Risks and Compliance', 'Progress', 'Documents', 'Team', 'Reminders'];

const METHODOLOGY_INFO = {
  Agile: { color: '#0284C7', bg: '#EFF6FF', label: 'Agile', reason: 'Best for projects where things will change as you go. You build in short cycles, review often and adjust based on what you learn.' },
  Predictive: { color: '#7C3AED', bg: '#F5F3FF', label: 'Predictive', reason: 'Best for projects where the requirements are clear from the start. You plan everything upfront and follow the plan step by step.' },
  Hybrid: { color: '#0369A1', bg: '#E0F2FE', label: 'Hybrid', reason: 'A mix of both. You plan the big picture upfront but stay flexible on how you execute each part.' },
};

const REQ_CATEGORIES = [
  { key: 'must_do', title: 'What it must do', hint: 'List every feature and action your product or output must be able to perform. If a user needs to be able to do something, it goes here.', example: 'e.g. Users must be able to sign up with their email address', icon: '◈', color: '#0284C7', bg: '#EFF6FF' },
  { key: 'must_work', title: 'How it must work', hint: 'Describe how well it needs to perform. Speed, security, reliability, accessibility. These are things the user may not see directly but will definitely feel.', example: 'e.g. The app must load within 3 seconds on a mobile connection', icon: '⚡', color: '#D97706', bg: '#FFFBEB' },
  { key: 'must_look', title: 'What it must look like', hint: 'Describe design and interface expectations. Brand colours, fonts, layout, mobile versus desktop. What should the experience feel like?', example: 'e.g. Must work on mobile and follow the brand colour palette', icon: '◉', color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'must_connect', title: 'What it must connect to', hint: 'List any third-party tools, payment systems, APIs or platforms it needs to work with. If something else has to talk to this product, it goes here.', example: 'e.g. Must integrate with Paystack for payment processing', icon: '⟷', color: '#0369A1', bg: '#E0F2FE' },
  { key: 'rules', title: 'What the rules say', hint: 'Any legal, regulatory or business rules the product must follow. These are things you are not allowed to ignore regardless of timeline or cost.', example: 'e.g. Must comply with NDPR data protection requirements', icon: '⚖', color: '#DC2626', bg: '#FEF2F2' },
  { key: 'done_when', title: 'How we know it is done', hint: 'Define what finished looks like. What must be true before you can hand this over and call it complete? This prevents endless scope creep.', example: 'e.g. All test cases pass and the client has signed off on the final version', icon: '✓', color: '#15803D', bg: '#F0FDF4' },
];

async function notify(type, project, data) {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, projectId: project.id, projectName: project.name, ownerEmail: project.owner_email, data }),
    });
  } catch (err) { console.error('Notify error:', err); }
}

export default function ProjectWorkspace({ project, onBack, onUpdate }) {
  const [data, setData] = useState(project);
  const [methodology, setMethodology] = useState(project.methodology || 'Agile');
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [tab, setTab] = useState(project._openDoc ? 'Documents' : 'Overview');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [acceptedMembers, setAcceptedMembers] = useState([]);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    supabase
      .from('project_members')
      .select('*')
      .eq('project_id', project.id)
      .eq('status', 'accepted')
      .then(({ data: members }) => setAcceptedMembers(members || []));
  }, [project.id]);

  const save = useCallback(async (updates) => {
    const updated = { ...data, ...updates, updated_at: new Date().toISOString() };
    setData(updated);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      await supabase.from('pm_projects').update(updates).eq('id', project.id);
      setSaveStatus('saved');
      if (onUpdate) onUpdate(updated);
    }, 1500);
  }, [data, project.id, onUpdate]);

  const tabs = methodology === 'Agile' ? AGILE_TABS : methodology === 'Predictive' ? PREDICTIVE_TABS : HYBRID_TABS;

  const changeMethodology = async (m) => {
    setMethodology(m);
    setTab('Overview');
    setShowMethodPicker(false);
    await supabase.from('pm_projects').update({ methodology: m }).eq('id', project.id);
  };

  const info = METHODOLOGY_INFO[methodology] || METHODOLOGY_INFO.Agile;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button style={s.backBtn} onClick={onBack}>← All Projects</button>
            <span style={{ fontSize: 12, color: saveStatus === 'saved' ? '#15803D' : saveStatus === 'saving' ? '#D97706' : '#9CA3AF' }}>
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
            </span>
          </div>
          <div style={s.headerRow}>
            <div style={s.headerLeft}>
              <h1 style={s.title}>{data.name}</h1>
              <div style={s.metaRow}>
                <span style={s.industryBadge}>{data.industry}</span>
                <span style={{ ...s.statusBadge, background: data.status === 'active' ? '#F0FDF4' : '#FEF2F2', color: data.status === 'active' ? '#15803D' : '#DC2626' }}>
                  {data.status === 'active' ? 'Active' : 'Completed'}
                </span>
              </div>
            </div>
            <div style={s.methodBox}>
              <div style={{ ...s.methodBadge, background: info.bg, color: info.color }}>{info.label} Approach</div>
              <button style={s.switchBtn} onClick={() => setShowMethodPicker(p => !p)}>Switch approach</button>
            </div>
          </div>
        </div>

        {showMethodPicker && (
          <div style={s.methodPicker}>
            <p style={s.methodPickerTitle}>PM Buddy recommended <strong>{project.methodology}</strong> based on your project. You can switch anytime.</p>
            <div style={s.methodPickerGrid}>
              {Object.entries(METHODOLOGY_INFO).map(([key, val]) => (
                <button key={key} style={{ ...s.methodPickerCard, borderColor: methodology === key ? val.color : '#E5E7EB', background: methodology === key ? val.bg : WH }} onClick={() => changeMethodology(key)}>
                  <p style={{ ...s.methodPickerName, color: val.color }}>{val.label}</p>
                  <p style={s.methodPickerReason}>{val.reason}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={s.tabBar}>
          {tabs.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? BLUE : '#6B7280', borderBottomColor: tab === t ? BLUE : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div style={s.content}>
          {tab === 'Overview' && <OverviewTab data={data} methodology={methodology} info={info} onSave={save} acceptedMembers={acceptedMembers} />}
          {tab === 'What We Are Building' && <BacklogTab data={data} onSave={save} />}
          {tab === 'Work Cycles' && <SprintsTab data={data} onSave={save} />}
          {tab === 'Progress' && <ProgressTab data={data} onSave={save} />}
          {tab === 'What We Learned' && <RetrospectiveTab data={data} onSave={save} />}
          {tab === 'Who Is Involved' && <StakeholdersTab data={data} onSave={save} />}
          {tab === 'Scope' && <ScopeTab data={data} onSave={save} />}
          {tab === 'Planning' && <PlanningTab data={data} onSave={save} methodology={methodology} />}
          {tab === 'Risks' && <RisksComplianceTab data={data} onSave={save} />}
          {tab === 'Risks and Compliance' && <RisksComplianceTab data={data} onSave={save} />}
          {tab === 'Requirements' && <RequirementsTab data={data} onSave={save} project={project} />}
          {tab === 'Documents' && <DocumentGenerator data={data} methodology={methodology} user={project.user_id} openDoc={project._openDoc} />}
          {tab === 'Team' && <TeamTab project={data} currentUser={project._currentUser} onSave={save} />}
          {tab === 'Reminders' && <RemindersPanel project={data} onUpdate={(updated) => { setData(updated); onUpdate(updated); }} />}
        </div>
      </div>
      <PMBuddyAssistant project={data} />
    </div>
  );
}

function InsightCard({ title, icon, description, savedValue, savedEdited, onSave, generatePrompt }) {
  const [content, setContent] = useState(savedValue || '');
  const [edited, setEdited] = useState(savedEdited || false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => { setContent(savedValue || ''); setEdited(savedEdited || false); }, [savedValue, savedEdited]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: generatePrompt }) });
      const result = await res.json();
      const text = (result.result || '').trim().replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6} /g, '').trim();
      if (text) { setContent(text); setEdited(false); onSave(text, false); }
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  const saveEdit = () => { setContent(draft); setEdited(true); onSave(draft, true); setEditing(false); };

  return (
    <div style={s.insightCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={s.insightIcon}>{icon}</span>
          <div>
            <p style={s.insightTitle}>{title}</p>
            {content && edited && <span style={s.editedBadge}>Your version</span>}
            {content && !edited && <span style={s.aiBadge}>AI Generated</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {content && !editing && <button style={s.insightSmBtn} onClick={() => { setDraft(content); setEditing(true); }}>Edit</button>}
          {editing && (<><button style={{ ...s.insightSmBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveEdit}>Save</button><button style={s.insightSmBtn} onClick={() => setEditing(false)}>Cancel</button></>)}
          {!editing && <button style={{ ...s.insightSmBtn, background: content ? GREY : BLUE, color: content ? '#374151' : WH, borderColor: content ? '#E5E7EB' : BLUE }} onClick={generate} disabled={generating}>{generating ? 'Generating...' : content ? 'Regenerate' : 'Generate'}</button>}
        </div>
      </div>
      {!content && !generating && <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>{description}</p>}
      {generating && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE }} /><p style={{ fontSize: 13, color: '#6B7280' }}>PM Buddy is working on this...</p></div>}
      {content && !editing && <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{content}</div>}
      {editing && <textarea style={{ ...s.textarea, minHeight: 120, marginBottom: 0 }} value={draft} onChange={e => setDraft(e.target.value)} rows={5} />}
    </div>
  );
}

function PMBuddyInsights({ data, onSave }) {
  const insights = data.insights || {};
  const projectContext = `Project: ${data.name}\nIndustry: ${data.industry}\nGoal: ${data.scope?.goal || 'Not specified'}\nDescription: ${data.description || 'Not specified'}\nTeam: ${data.team_type === 'solo' ? 'Solo project' : (data.team || []).map(m => `${m.name} (${m.role})`).join(', ') || 'Not specified'}\nMilestones: ${(data.milestones || []).map(m => `${m.title} (${m.status})`).join(', ') || 'None set'}\nTimeline: ${data.timeline?.start ? `${data.timeline.start} to ${data.timeline.end}` : 'Not set'}\nRisks: ${(data.risks || []).map(r => r.title).join(', ') || 'None listed'}\nCommunication: ${data.planning?.communications || data.scope?.communicationFlow || 'Not specified'}\nMethodology: ${data.methodology || 'Agile'}`.trim();

  const insightDefs = [
    { key: 'definition_of_done', title: 'Definition of Done', icon: '✓', description: 'PM Buddy will define exactly what "done" looks like for this project based on your goal and milestones.', prompt: `You are PM Buddy, a friendly project management coach. Based on this project, write a clear Definition of Done in plain English.\n\n${projectContext}\n\nWrite 4 to 6 bullet points starting with "✓". Specific and checkable. No jargon. No intro.` },
    { key: 'business_benefit', title: 'Business Benefit', icon: '◈', description: 'PM Buddy will identify what value this project delivers — financial, social, or strategic.', prompt: `You are PM Buddy. Write a clear Business Benefit statement in plain English.\n\n${projectContext}\n\nWrite 3 to 5 sentences. What problem it solves, who benefits, what the outcome is. Plain language. No bullet points.` },
    { key: 'quality_metrics', title: 'Quality Markers', icon: '◆', description: 'PM Buddy will define how you will know the work is good enough before calling it done.', prompt: `You are PM Buddy. Write simple Quality Markers.\n\n${projectContext}\n\nWrite 4 to 6 quality checks starting with "•". Plain language. No jargon.` },
    { key: 'roadmap', title: 'Project Roadmap', icon: '→', description: 'PM Buddy will create a simple roadmap showing what happens when across the project timeline.', prompt: `You are PM Buddy. Write a simple Project Roadmap in plain English.\n\n${projectContext}\n\nOrganise into phases. For each phase: name, what happens, roughly when. Simple. No jargon.` },
  ];

  return (
    <div style={s.insightsSection}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <p style={s.sectionLabel}>PM Buddy Insights</p>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>Auto-generated · Always editable</span>
      </div>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>PM Buddy generates these from your project details. Click Generate on any card, or Regenerate after updates.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insightDefs.map(ins => (
          <InsightCard key={ins.key} title={ins.title} icon={ins.icon} description={ins.description} savedValue={insights[ins.key]?.content || ''} savedEdited={insights[ins.key]?.edited || false} generatePrompt={ins.prompt}
            onSave={(content, edited) => onSave({ insights: { ...insights, [ins.key]: { content, edited, updatedAt: new Date().toISOString() } } })} />
        ))}
      </div>
    </div>
  );
}

function CurrentStatusSection({ data, onSave }) {
  const scope = data.scope || {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ currentPhase: scope.currentPhase || '', completedWork: scope.completedWork || '', remainingWork: scope.remainingWork || '', blockers: scope.blockers || '', communicationFlow: scope.communicationFlow || '' });
  const [aiReview, setAiReview] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const saveStatus = () => {
    onSave({ scope: { ...scope, ...draft } });
    if (draft.blockers && draft.blockers !== scope.blockers) notify('blocker_added', data, { blocker: draft.blockers });
    setEditing(false);
  };

  const getAiReview = async () => {
    setReviewing(true);
    setAiReview('');
    const prompt = `You are PM Buddy. Review this project status and give honest plain-English feedback.\n\nProject: ${data.name}\nGoal: ${scope.goal}\nPhase: ${draft.currentPhase || 'Not specified'}\nDone: ${draft.completedWork || 'Not specified'}\nRemaining: ${draft.remainingWork || 'Not specified'}\nBlockers: ${draft.blockers || 'None'}\n\nGive 3 to 4 sentences. What looks good, what is concerning, what to focus on. Simple language. No bullet points.`;
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) });
      const result = await res.json();
      setAiReview(result.result || 'Could not get feedback right now. Try again.');
    } catch { setAiReview('Could not get feedback right now. Try again.'); }
    setReviewing(false);
  };

  return (
    <div style={{ ...s.overviewSection, background: '#EFF6FF', borderRadius: 14, padding: 20, border: '1px solid #BFDBFE' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ ...s.sectionLabel, color: BLUE, marginBottom: 0 }}>Current Project Status</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing ? (<><button style={{ ...s.sprintBtn, fontSize: 12 }} onClick={() => setEditing(true)}>Edit</button><button style={{ ...s.sprintBtn, fontSize: 12, background: BLUE, color: WH, borderColor: BLUE }} onClick={getAiReview} disabled={reviewing}>{reviewing ? 'Reviewing...' : 'AI Review'}</button></>) : (<><button style={{ ...s.sprintBtn, fontSize: 12, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveStatus}>Save</button><button style={{ ...s.sprintBtn, fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button></>)}
        </div>
      </div>
      {!editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[{ label: 'Current Phase', value: scope.currentPhase }, { label: 'What has been done', value: scope.completedWork }, { label: 'What is remaining', value: scope.remainingWork }, { label: 'Blockers', value: scope.blockers }, { label: 'Communication', value: scope.communicationFlow }].map(({ label, value }) => value ? (<div key={label}><p style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</p><p style={{ fontSize: 14, color: BL, lineHeight: 1.6 }}>{value}</p></div>) : null)}
        </div>
      ) : (
        <div>
          {[{ key: 'currentPhase', label: 'Current Phase', placeholder: 'e.g. Planning, Development, Testing' }, { key: 'completedWork', label: 'What has been done', placeholder: 'What has been completed so far?' }, { key: 'remainingWork', label: 'What is remaining', placeholder: 'What work is still left to do?' }, { key: 'blockers', label: 'Current blockers', placeholder: 'What is slowing things down?' }, { key: 'communicationFlow', label: 'How the team communicates', placeholder: 'e.g. Weekly meetings, WhatsApp, email' }].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 14 }}><label style={{ ...s.label, color: '#1E40AF' }}>{label}</label><textarea style={{ ...s.textarea, marginBottom: 0, minHeight: 60 }} placeholder={placeholder} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))} rows={2} /></div>
          ))}
        </div>
      )}
      {aiReview && <div style={{ marginTop: 16, background: WH, borderRadius: 10, padding: '14px 16px', border: '1px solid #BFDBFE' }}><p style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>PM Buddy's Take</p><p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{aiReview}</p></div>}
    </div>
  );
}

function GoalRefineSection({ label, value, field, onAccept }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [refining, setRefining] = useState(false);
  const [suggestion, setSuggestion] = useState('');

  const refine = async () => {
    if (!draft.trim()) return;
    setRefining(true);
    setSuggestion('');
    const prompts = {
      goal: `You are PM Buddy. Turn this into a clear measurable project goal: "${draft}"\n\nAnswer WHO benefits, WHAT changes, HOW they will know it worked. One or two sentences starting with "This project will succeed when...". Plain language. Return ONLY the rewritten goal.`,
      description: `You are PM Buddy. Rewrite this project description clearly: "${draft}"\n\n2-3 sentences. What it is, who it is for, what it does. No jargon. Return ONLY the rewritten description.`,
    };
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompts[field] || prompts.goal }) });
      const result = await res.json();
      const refined = (result.result || '').trim();
      if (refined) setSuggestion(refined);
    } catch (err) { console.error(err); }
    setRefining(false);
  };

  const accept = () => { onAccept(suggestion); setSuggestion(''); setDraft(suggestion); setEditing(false); };
  const saveEdit = () => { onAccept(draft); setEditing(false); };

  return (
    <div style={s.goalCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={s.sectionLabel}>{label}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editing ? (<><button style={s.smallEditBtn} onClick={() => { setEditing(true); setDraft(value || ''); }}>Edit</button><button style={s.smallRefineBtn} onClick={() => { setEditing(true); setDraft(value || ''); setTimeout(refine, 100); }}>AI Refine</button></>) : (<><button style={{ ...s.smallEditBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveEdit}>Save</button><button style={s.smallEditBtn} onClick={() => { setEditing(false); setSuggestion(''); }}>Cancel</button></>)}
        </div>
      </div>
      {!editing ? <p style={s.goalText}>{value || 'Not set.'}</p> : <textarea style={{ ...s.textarea, marginBottom: 8, minHeight: 80 }} value={draft} onChange={e => setDraft(e.target.value)} rows={3} />}
      {editing && draft.trim().length > 20 && !suggestion && <button style={s.smallRefineBtn} onClick={refine} disabled={refining}>{refining ? 'PM Buddy is refining...' : 'AI Refine'}</button>}
      {suggestion && (
        <div style={s.suggestionBox}>
          <p style={s.suggestionLabel}>PM Buddy Suggestion</p>
          <p style={s.suggestionText}>{suggestion}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button style={s.acceptBtn} onClick={accept}>Use this</button>
            <button style={s.dismissBtn} onClick={() => setSuggestion('')}>Keep mine</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ data, methodology, info, onSave, acceptedMembers = [] }) {
  const end = data.timeline?.end ? new Date(data.timeline.end) : null;
  const start = data.timeline?.start ? new Date(data.timeline.start) : null;
  const today = new Date();
  const totalDays = start && end ? Math.ceil((end - start) / 86400000) : 0;
  const daysLeft = end ? Math.ceil((end - today) / 86400000) : 0;
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100))) : 0;
  const openRisks = (data.risks || []).filter(r => r.status === 'open').length;
  const milestones = data.milestones || [];
  const doneMilestones = milestones.filter(m => m.status === 'done').length;
  const totalTeam = 1 + acceptedMembers.length;

  return (
    <div>
      <div style={s.overviewGrid}>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Time Progress</p>
          <p style={s.overviewNum}>{progress}%</p>
          <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: `${progress}%` }} /></div>
          <p style={s.overviewSub}>{daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Milestones Done</p>
          <p style={s.overviewNum}>{doneMilestones}/{milestones.length}</p>
          <div style={s.miniBar}><div style={{ ...s.miniBarFill, width: milestones.length > 0 ? `${(doneMilestones / milestones.length) * 100}%` : '0%' }} /></div>
          <p style={s.overviewSub}>completed</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Open Risks</p>
          <p style={{ ...s.overviewNum, color: openRisks > 0 ? '#DC2626' : '#15803D' }}>{openRisks}</p>
          <p style={s.overviewSub}>need attention</p>
        </div>
        <div style={s.overviewCard}>
          <p style={s.overviewLabel}>Team Size</p>
          <p style={s.overviewNum}>{totalTeam}</p>
          <p style={s.overviewSub}>{acceptedMembers.length > 0 ? `${acceptedMembers.length} member${acceptedMembers.length > 1 ? 's' : ''} + you` : 'Just you so far'}</p>
        </div>
      </div>

      <div style={{ ...s.approachCard, background: info.bg, border: `1px solid ${info.color}30` }}>
        <p style={{ ...s.approachLabel, color: info.color }}>Your Approach: {info.label}</p>
        <p style={s.approachText}>{info.reason}</p>
      </div>

      <div style={s.overviewSection}>
        <GoalRefineSection label="Your Project Goal" value={data.scope?.goal} field="goal" onAccept={(val) => { onSave({ scope: { ...data.scope, goal: val } }); notify('goal_updated', data, { goal: val }); }} />
      </div>

      <div style={s.overviewSection}>
        <GoalRefineSection label="Project Description" value={data.description} field="description" onAccept={(val) => { onSave({ description: val }); notify('description_updated', data, {}); }} />
      </div>

      {data.scope?.currentPhase !== undefined && <CurrentStatusSection data={data} onSave={onSave} />}

      <div style={s.overviewSection}>
        <p style={s.sectionLabel}>Key Milestones</p>
        {milestones.length === 0 && <p style={s.emptyText}>No milestones set.</p>}
        {milestones.slice(0, 5).map((m, i) => (
          <div key={i} style={s.milestoneRow}>
            <div style={{ ...s.milestoneCheck, background: m.status === 'done' ? BLUE : m.status === 'in_progress' ? '#FFF7ED' : WH, borderColor: m.status === 'done' ? BLUE : m.status === 'in_progress' ? '#D97706' : '#D1D5DB' }}>
              {m.status === 'done' && <span style={{ color: WH, fontSize: 10, fontWeight: 900 }}>✓</span>}
              {m.status === 'in_progress' && <span style={{ color: '#D97706', fontSize: 10, fontWeight: 900 }}>→</span>}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...s.milestoneName, textDecoration: m.status === 'done' ? 'line-through' : 'none', color: m.status === 'done' ? '#9CA3AF' : BL }}>{m.title}</p>
              <p style={s.milestoneDate}>{m.date ? formatDate(m.date) : 'No date set'}</p>
            </div>
            <span style={{ ...s.pill, background: m.status === 'done' ? '#F0FDF4' : m.status === 'in_progress' ? '#FFF7ED' : '#EFF6FF', color: m.status === 'done' ? '#15803D' : m.status === 'in_progress' ? '#D97706' : BLUE }}>
              {m.status === 'done' ? 'Done' : m.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
          </div>
        ))}
      </div>

      {data.compliance?.flags?.length > 0 && (
        <div style={s.complianceAlert}>
          <p style={s.complianceAlertTitle}>Things to Keep in Mind</p>
          {data.compliance.flags.map((f, i) => <p key={i} style={s.complianceFlag}>· {f}</p>)}
        </div>
      )}

      <PMBuddyInsights data={data} onSave={onSave} />
    </div>
  );
}

function ProgressTab({ data, onSave }) {
  const milestones = data.milestones || [];
  const [editingIdx, setEditingIdx] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  const cycleMilestone = (i) => {
    const current = milestones[i].status;
    const next = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'done' : 'pending';
    onSave({ milestones: milestones.map((m, idx) => idx === i ? { ...m, status: next } : m) });
    if (next === 'done') notify('milestone_done', data, { milestone: milestones[i].title });
    if (next === 'in_progress') notify('milestone_in_progress', data, { milestone: milestones[i].title });
  };

  const startEdit = (i) => { setEditingIdx(i); setEditDraft({ ...milestones[i] }); };
  const saveEdit = () => { onSave({ milestones: milestones.map((m, idx) => idx === editingIdx ? { ...editDraft } : m) }); setEditingIdx(null); };
  const deleteMilestone = (i) => { onSave({ milestones: milestones.filter((_, idx) => idx !== i) }); if (editingIdx === i) setEditingIdx(null); };
  const [milestoneError, setMilestoneError] = useState('');
  const addMilestone = () => {
    if (!newTitle.trim()) return;
    if (newDate) {
      const projectStart = data.timeline?.start;
      const projectEnd = data.timeline?.end;
      const mDate = new Date(newDate);
      if (projectStart && mDate < new Date(projectStart)) {
        setMilestoneError('Milestone date cannot be before the project start date.');
        return;
      }
      if (projectEnd && mDate > new Date(projectEnd)) {
        setMilestoneError('Milestone date cannot be after the project end date.');
        return;
      }
    }
    setMilestoneError('');
    onSave({ milestones: [...milestones, { title: newTitle.trim(), date: newDate, status: 'pending' }] });
    setNewTitle('');
    setNewDate('');
  };

  const statusConfig = {
    done: { bg: '#F0FDF4', color: '#15803D', label: 'Done', next: 'Mark Pending' },
    in_progress: { bg: '#FFF7ED', color: '#D97706', label: 'In Progress', next: 'Mark Done' },
    pending: { bg: '#EFF6FF', color: BLUE, label: 'Pending', next: 'Mark In Progress' },
  };

  return (
    <div>
      <SectionHead title="Progress" sub="Track where things stand. Edit milestones, add new ones, or cycle their status." />
      <div style={s.timelineRange}>
        <div style={{ flex: 1, textAlign: 'center' }}><p style={s.timelineDateLabel}>Start Date</p><p style={s.timelineDateVal}>{data.timeline?.start ? formatDate(data.timeline.start) : 'Not set'}</p></div>
        <div style={{ flex: 1, height: 2, background: BLUE, borderRadius: 1 }} />
        <div style={{ flex: 1, textAlign: 'center' }}><p style={s.timelineDateLabel}>End Date</p><p style={s.timelineDateVal}>{data.timeline?.end ? formatDate(data.timeline.end) : 'Not set'}</p></div>
      </div>
      <p style={{ ...s.sectionLabel, marginBottom: 12 }}>Milestones</p>
      {milestones.length === 0 && <p style={s.emptyText}>No milestones set. Add one below.</p>}
      {milestones.map((m, i) => {
        const sc = statusConfig[m.status] || statusConfig.pending;
        if (editingIdx === i) {
          return (
            <div key={i} style={{ ...s.milestoneCard, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
              <input style={{ ...s.input, marginBottom: 0 }} value={editDraft.title} onChange={e => setEditDraft(p => ({ ...p, title: e.target.value }))} placeholder="Milestone name" />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input style={{ ...s.input, marginBottom: 0, flex: 1 }} type="date" value={editDraft.date || ''} onChange={e => setEditDraft(p => ({ ...p, date: e.target.value }))} />
                <select style={s.select} value={editDraft.status} onChange={e => setEditDraft(p => ({ ...p, status: e.target.value }))}><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="done">Done</option></select>
                <button style={{ ...s.sprintBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveEdit}>Save</button>
                <button style={s.sprintBtn} onClick={() => setEditingIdx(null)}>Cancel</button>
              </div>
            </div>
          );
        }
        return (
          <div key={i} style={s.milestoneCard}>
            <div style={{ flex: 1 }}><p style={{ ...s.milestoneName, textDecoration: m.status === 'done' ? 'line-through' : 'none', color: m.status === 'done' ? '#9CA3AF' : BL }}>{m.title}</p><p style={s.milestoneDate}>{m.date ? formatDate(m.date) : 'No date'}</p></div>
            <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>{sc.label}</span>
            <button style={s.sprintBtn} onClick={() => cycleMilestone(i)}>{sc.next}</button>
            <button style={s.sprintBtn} onClick={() => startEdit(i)}>Edit</button>
            <button style={{ ...s.sprintBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteMilestone(i)}>Delete</button>
          </div>
        );
      })}
      <div style={{ marginTop: 16, background: GREY, borderRadius: 10, padding: '14px', border: '1px solid #E5E7EB' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Add a Milestone</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input style={{ ...s.input, flex: 2, marginBottom: 0, minWidth: 140 }} placeholder="e.g. Launch beta version" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMilestone()} />
          <input style={{ ...s.input, flex: 1, marginBottom: 0, minWidth: 120 }} type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          <button style={s.addBtn} onClick={addMilestone}>Add</button>
        </div>
        {milestoneError && <p style={{ fontSize: 13, color: '#DC2626', marginTop: 8 }}>{milestoneError}</p>}
      </div>
    </div>
  );
}

function BacklogTab({ data, onSave }) {
  const backlog = data.backlog || { epics: [] };
  const [newEpic, setNewEpic] = useState('');
  const [newStory, setNewStory] = useState({});
  const [expandedEpic, setExpandedEpic] = useState(null);
  const addEpic = () => { if (!newEpic.trim()) return; onSave({ backlog: { epics: [...(backlog.epics || []), { title: newEpic.trim(), stories: [] }] } }); setNewEpic(''); };
  const addStory = (epicIdx) => { if (!newStory[epicIdx]?.trim()) return; const epics = [...(backlog.epics || [])]; epics[epicIdx].stories = [...(epics[epicIdx].stories || []), { title: newStory[epicIdx].trim(), status: 'todo' }]; onSave({ backlog: { epics } }); setNewStory(p => ({ ...p, [epicIdx]: '' })); };
  const toggleStory = (epicIdx, storyIdx) => { const epics = [...(backlog.epics || [])]; const story = epics[epicIdx].stories[storyIdx]; story.status = story.status === 'done' ? 'todo' : 'done'; onSave({ backlog: { epics } }); };
  const removeEpic = (i) => onSave({ backlog: { epics: (backlog.epics || []).filter((_, idx) => idx !== i) } });
  return (
    <div>
      <SectionHead title="What We Are Building" sub="Break your project into big areas of work, then list what needs to be built inside each one." />
      <div style={s.addRow}><input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Add a work area e.g. User Authentication" value={newEpic} onChange={e => setNewEpic(e.target.value)} onKeyDown={e => e.key === 'Enter' && addEpic()} /><button style={s.addBtn} onClick={addEpic}>Add</button></div>
      {(backlog.epics || []).length === 0 && <p style={s.emptyText}>No work areas added yet.</p>}
      {(backlog.epics || []).map((epic, epicIdx) => (
        <div key={epicIdx} style={s.epicCard}>
          <div style={s.epicHeader}>
            <button style={s.epicToggle} onClick={() => setExpandedEpic(expandedEpic === epicIdx ? null : epicIdx)}>
              <span style={s.epicArrow}>{expandedEpic === epicIdx ? '▼' : '▶'}</span>
              <span style={s.epicTitle}>{epic.title}</span>
              <span style={s.epicCount}>{(epic.stories || []).length} items</span>
            </button>
            <button style={s.removeSmallBtn} onClick={() => removeEpic(epicIdx)}>✕</button>
          </div>
          {expandedEpic === epicIdx && (
            <div style={s.epicBody}>
              {(epic.stories || []).map((story, storyIdx) => (
                <div key={storyIdx} style={s.storyRow}>
                  <button style={{ ...s.checkBtn, background: story.status === 'done' ? BLUE : WH, borderColor: story.status === 'done' ? BLUE : '#D1D5DB' }} onClick={() => toggleStory(epicIdx, storyIdx)}>
                    {story.status === 'done' && <span style={{ color: WH, fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </button>
                  <span style={{ ...s.storyTitle, textDecoration: story.status === 'done' ? 'line-through' : 'none', color: story.status === 'done' ? '#9CA3AF' : BL }}>{story.title}</span>
                </div>
              ))}
              <div style={{ ...s.addRow, marginTop: 12 }}><input style={{ ...s.input, flex: 1, marginBottom: 0, fontSize: 13 }} placeholder="Add item..." value={newStory[epicIdx] || ''} onChange={e => setNewStory(p => ({ ...p, [epicIdx]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addStory(epicIdx)} /><button style={s.addBtn} onClick={() => addStory(epicIdx)}>Add</button></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SprintsTab({ data, onSave }) {
  const sprints = data.sprints || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newSprint, setNewSprint] = useState({ goal: '', duration: '2 weeks', start: '', end: '' });
  const addSprint = () => { if (!newSprint.goal.trim()) return; onSave({ sprints: [...sprints, { ...newSprint, number: sprints.length + 1, status: 'planning', items: [] }] }); setNewSprint({ goal: '', duration: '2 weeks', start: '', end: '' }); setShowAdd(false); };
  const updateSprintStatus = (i, status) => onSave({ sprints: sprints.map((sp, idx) => idx === i ? { ...sp, status } : sp) });
  const statusColors = { planning: { bg: '#EFF6FF', color: BLUE }, active: { bg: '#FFF7ED', color: '#D97706' }, done: { bg: '#F0FDF4', color: '#15803D' } };
  return (
    <div>
      <SectionHead title="Work Cycles" sub="A work cycle is a short focused period where your team builds a specific set of things." />
      <button style={s.primaryBtn} onClick={() => setShowAdd(p => !p)}>+ Plan a New Work Cycle</button>
      {showAdd && (
        <div style={s.addCard}>
          <label style={s.label}>Goal of this cycle</label>
          <input style={s.input} placeholder="e.g. Complete user login and signup" value={newSprint.goal} onChange={e => setNewSprint(p => ({ ...p, goal: e.target.value }))} />
          <label style={s.label}>Duration</label>
          <select style={s.select} value={newSprint.duration} onChange={e => setNewSprint(p => ({ ...p, duration: e.target.value }))}><option>1 week</option><option>2 weeks</option><option>3 weeks</option><option>4 weeks</option></select>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><label style={s.label}>Start</label><input style={s.input} type="date" value={newSprint.start} onChange={e => setNewSprint(p => ({ ...p, start: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><label style={s.label}>End</label><input style={s.input} type="date" value={newSprint.end} onChange={e => setNewSprint(p => ({ ...p, end: e.target.value }))} /></div>
          </div>
          <button style={s.primaryBtn} onClick={addSprint}>Save</button>
        </div>
      )}
      {sprints.length === 0 && !showAdd && <p style={s.emptyText}>No work cycles planned yet.</p>}
      {sprints.map((sprint, i) => {
        const sc = statusColors[sprint.status] || statusColors.planning;
        return (
          <div key={i} style={s.sprintCard}>
            <div style={s.sprintHeader}>
              <div><p style={s.sprintNum}>Cycle {sprint.number}</p><p style={s.sprintGoal}>{sprint.goal}</p><p style={s.sprintMeta}>{sprint.duration} · {sprint.start ? formatDate(sprint.start) : ''}{sprint.end ? ` to ${formatDate(sprint.end)}` : ''}</p></div>
              <span style={{ ...s.pill, background: sc.bg, color: sc.color }}>{sprint.status === 'planning' ? 'Planning' : sprint.status === 'active' ? 'In Progress' : 'Completed'}</span>
            </div>
            <div style={s.sprintActions}>
              {sprint.status === 'planning' && <button style={s.sprintBtn} onClick={() => updateSprintStatus(i, 'active')}>Start This Cycle</button>}
              {sprint.status === 'active' && <button style={s.sprintBtn} onClick={() => updateSprintStatus(i, 'done')}>Mark Complete</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RetrospectiveTab({ data, onSave }) {
  const retros = data.retrospectives || [];
  const [showAdd, setShowAdd] = useState(false);
  const [newRetro, setNewRetro] = useState({ cycle: '', wentWell: '', improve: '', lessons: '' });
  const addRetro = () => { if (!newRetro.wentWell.trim()) return; onSave({ retrospectives: [...retros, { ...newRetro, date: new Date().toISOString().split('T')[0] }] }); setNewRetro({ cycle: '', wentWell: '', improve: '', lessons: '' }); setShowAdd(false); };
  return (
    <div>
      <SectionHead title="What We Learned" sub="After each work cycle, take 30 minutes to reflect. What went well? What needs to change?" />
      <button style={s.primaryBtn} onClick={() => setShowAdd(p => !p)}>+ Add a Reflection</button>
      {showAdd && (
        <div style={s.addCard}>
          <label style={s.label}>Which cycle?</label><input style={s.input} placeholder="e.g. Cycle 1" value={newRetro.cycle} onChange={e => setNewRetro(p => ({ ...p, cycle: e.target.value }))} />
          <label style={s.label}>What went well?</label><textarea style={s.textarea} rows={3} value={newRetro.wentWell} onChange={e => setNewRetro(p => ({ ...p, wentWell: e.target.value }))} />
          <label style={s.label}>What needs to improve?</label><textarea style={s.textarea} rows={3} value={newRetro.improve} onChange={e => setNewRetro(p => ({ ...p, improve: e.target.value }))} />
          <label style={s.label}>Key lessons learned</label><textarea style={s.textarea} rows={3} value={newRetro.lessons} onChange={e => setNewRetro(p => ({ ...p, lessons: e.target.value }))} />
          <button style={s.primaryBtn} onClick={addRetro}>Save</button>
        </div>
      )}
      {retros.length === 0 && !showAdd && <p style={s.emptyText}>No reflections yet.</p>}
      {retros.map((r, i) => (
        <div key={i} style={s.retroCard}>
          <div style={s.retroHeader}><p style={s.retroCycle}>{r.cycle || `Reflection ${i + 1}`}</p><p style={s.retroDate}>{r.date ? formatDate(r.date) : ''}</p></div>
          <div style={s.retroSection}><p style={s.retroSectionLabel}>What went well</p><p style={s.retroText}>{r.wentWell}</p></div>
          <div style={s.retroSection}><p style={s.retroSectionLabel}>What needs to improve</p><p style={s.retroText}>{r.improve}</p></div>
          <div style={s.retroSection}><p style={s.retroSectionLabel}>Key lessons</p><p style={s.retroText}>{r.lessons}</p></div>
        </div>
      ))}
    </div>
  );
}

function StakeholdersTab({ data, onSave }) {
  const stakeholders = data.stakeholders || [];
  const [name, setName] = useState(''); const [role, setRole] = useState(''); const [influence, setInfluence] = useState('high'); const [comms, setComms] = useState('');
  const add = () => { if (!name.trim()) return; onSave({ stakeholders: [...stakeholders, { name, role, influence, comms }] }); setName(''); setRole(''); setComms(''); };
  const remove = (i) => onSave({ stakeholders: stakeholders.filter((_, idx) => idx !== i) });
  const influenceColors = { high: { bg: '#FEF2F2', color: '#DC2626' }, medium: { bg: '#FFFBEB', color: '#D97706' }, low: { bg: '#F0FDF4', color: '#15803D' } };
  return (
    <div>
      <SectionHead title="Who Is Involved" sub="List every person or group who has an interest in this project." />
      <div style={s.addCard}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}><label style={s.label}>Name or group</label><input style={s.input} placeholder="e.g. Investors" value={name} onChange={e => setName(e.target.value)} /></div>
          <div style={{ flex: 1, minWidth: 160 }}><label style={s.label}>Their role</label><input style={s.input} placeholder="e.g. Provide funding" value={role} onChange={e => setRole(e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}><label style={s.label}>Influence level</label><select style={s.select} value={influence} onChange={e => setInfluence(e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div style={{ flex: 1, minWidth: 160 }}><label style={s.label}>Communication method</label><input style={s.input} placeholder="e.g. Weekly email" value={comms} onChange={e => setComms(e.target.value)} /></div>
        </div>
        <button style={s.primaryBtn} onClick={add}>Add</button>
      </div>
      {stakeholders.length === 0 && <p style={s.emptyText}>No stakeholders added yet.</p>}
      {stakeholders.map((st, i) => { const ic = influenceColors[st.influence] || influenceColors.medium; return (
        <div key={i} style={s.stakeholderCard}>
          <div style={s.stakeholderLeft}><div style={s.memberAvatar}>{st.name[0]?.toUpperCase()}</div><div><p style={s.memberName}>{st.name}</p><p style={s.memberRole}>{st.role}</p>{st.comms && <p style={s.stakeholderComms}>{st.comms}</p>}</div></div>
          <div style={s.stakeholderRight}><span style={{ ...s.pill, background: ic.bg, color: ic.color }}>{st.influence} influence</span><button style={s.removeSmallBtn} onClick={() => remove(i)}>✕</button></div>
        </div>
      ); })}
    </div>
  );
}

function ScopeTab({ data, onSave }) {
  const scope = data.scope || {};
  const [deliverable, setDeliverable] = useState(''); const [assumption, setAssumption] = useState(''); const [constraint, setConstraint] = useState(''); const [excluded, setExcluded] = useState('');
  const addToList = (field, value, setter) => { if (!value.trim()) return; onSave({ scope: { ...scope, [field]: [...(scope[field] || []), value.trim()] } }); setter(''); };
  const removeFromList = (field, i) => onSave({ scope: { ...scope, [field]: (scope[field] || []).filter((_, idx) => idx !== i) } });
  return (
    <div>
      <SectionHead title="Scope" sub="Define exactly what this project will and will not deliver." />
      <div style={s.goalCard}><p style={s.sectionLabel}>Project Goal</p><p style={s.goalText}>{scope.goal || 'No goal defined.'}</p></div>
      {[
        { field: 'deliverables', label: 'What will this project deliver?', value: deliverable, setter: setDeliverable, placeholder: 'Add a deliverable...' },
        { field: 'assumptions', label: 'What are we assuming?', value: assumption, setter: setAssumption, placeholder: 'Add an assumption...' },
        { field: 'constraints', label: 'What is limiting us?', value: constraint, setter: setConstraint, placeholder: 'Add a constraint...' },
        { field: 'exclusions', label: 'What is NOT included?', value: excluded, setter: setExcluded, placeholder: 'Add something out of scope...' },
      ].map(({ field, label, value, setter, placeholder }) => (
        <div key={field} style={s.scopeSection}>
          <p style={s.scopeLabel}>{label}</p>
          <div style={s.addRow}><input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder={placeholder} value={value} onChange={e => setter(e.target.value)} onKeyDown={e => e.key === 'Enter' && addToList(field, value, setter)} /><button style={s.addBtn} onClick={() => addToList(field, value, setter)}>Add</button></div>
          {(scope[field] || []).map((item, i) => (<div key={i} style={s.scopeItem}><div style={s.scopeDot} /><span style={s.scopeItemText}>{item}</span><button style={s.removeSmallBtn} onClick={() => removeFromList(field, i)}>✕</button></div>))}
        </div>
      ))}
    </div>
  );
}

function PlanningTab({ data, onSave, methodology }) {
  const planning = data.planning || {};
  const updateField = (field, value) => onSave({ planning: { ...planning, [field]: value } });
  const areas = methodology === 'Agile' ? [
    { key: 'timeline', label: 'Timeline', hint: 'When does the project start and end? How many work cycles?' },
    { key: 'resources', label: 'Who and What Do You Need?', hint: 'People, tools and budget.' },
    { key: 'quality', label: 'How Will You Know It Is Good Enough?', hint: 'What does done look like?' },
    { key: 'communications', label: 'How Will You Keep Everyone Informed?', hint: 'Who gets updates, how often, through what channel?' },
  ] : [
    { key: 'timeline', label: 'Timeline and Milestones', hint: 'Break into phases. What happens in each and when?' },
    { key: 'resources', label: 'Who and What Do You Need?', hint: 'People, tools, equipment and budget.' },
    { key: 'quality', label: 'Quality Standards', hint: 'What does a successful output look like? Who approves it?' },
    { key: 'communications', label: 'Communication Plan', hint: 'Who gets what information, how often?' },
    { key: 'procurement', label: 'What Do You Need to Buy or Hire?', hint: 'External services, tools or contractors.' },
    { key: 'budget', label: 'Budget Overview', hint: 'Total budget and allocation across phases.' },
  ];
  return (
    <div>
      <SectionHead title="Planning" sub="Good planning prevents surprises. Fill in each area below." />
      {areas.map(({ key, label, hint }) => (
        <div key={key} style={s.planningSection}>
          <p style={s.scopeLabel}>{label}</p>
          <p style={s.scopeHint}>{hint}</p>
          <textarea style={s.textarea} rows={4} placeholder={`Add ${label.toLowerCase()} details...`} value={planning[key] || ''} onChange={e => updateField(key, e.target.value)} />
        </div>
      ))}
    </div>
  );
}

function RisksComplianceTab({ data, onSave }) {
  const risks = data.risks || [];
  const compliance = data.compliance || { flags: [], internal: [], external: [] };
  const [newRisk, setNewRisk] = useState(''); const [newLevel, setNewLevel] = useState('medium'); const [newInternal, setNewInternal] = useState(''); const [newExternal, setNewExternal] = useState('');
  const addRisk = () => {
    if (!newRisk.trim()) return;
    onSave({ risks: [...risks, { title: newRisk.trim(), level: newLevel, status: 'open' }] });
    if (newLevel === 'high') notify('risk_high', data, { risk: newRisk.trim(), level: newLevel });
    else notify('risk_added', data, { risk: newRisk.trim(), level: newLevel });
    setNewRisk('');
  };
  const toggleRisk = (i) => onSave({ risks: risks.map((r, idx) => idx === i ? { ...r, status: r.status === 'open' ? 'mitigated' : 'open' } : r) });
  const addCompliance = (type, value, setter) => { if (!value.trim()) return; onSave({ compliance: { ...compliance, [type]: [...(compliance[type] || []), value.trim()] } }); setter(''); };
  const removeCompliance = (type, i) => onSave({ compliance: { ...compliance, [type]: (compliance[type] || []).filter((_, idx) => idx !== i) } });
  const levelColors = { high: { bg: '#FEF2F2', color: '#DC2626' }, medium: { bg: '#FFFBEB', color: '#D97706' }, low: { bg: '#F0FDF4', color: '#15803D' } };
  return (
    <div>
      <SectionHead title="Risks and Compliance" sub="Know what could go wrong before it happens." />
      <p style={s.scopeLabel}>What Could Go Wrong?</p>
      <div style={s.addRow}><input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Describe a risk..." value={newRisk} onChange={e => setNewRisk(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRisk()} /><select style={s.select} value={newLevel} onChange={e => setNewLevel(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><button style={s.addBtn} onClick={addRisk}>Add</button></div>
      {risks.length === 0 && <p style={s.emptyText}>No risks added yet.</p>}
      {risks.map((r, i) => { const lc = levelColors[r.level] || levelColors.medium; return (<div key={i} style={s.riskCard}><span style={{ ...s.pill, background: lc.bg, color: lc.color, flexShrink: 0 }}>{r.level}</span><p style={{ ...s.riskTitle, textDecoration: r.status === 'mitigated' ? 'line-through' : 'none', color: r.status === 'mitigated' ? '#9CA3AF' : BL }}>{r.title}</p><button style={s.sprintBtn} onClick={() => toggleRisk(i)}>{r.status === 'mitigated' ? 'Handled' : 'Mark Handled'}</button></div>); })}
      <div style={{ marginTop: 32 }}>
        <p style={s.scopeLabel}>Internal Rules</p>
        <div style={s.addRow}><input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. All features must pass security review" value={newInternal} onChange={e => setNewInternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('internal', newInternal, setNewInternal)} /><button style={s.addBtn} onClick={() => addCompliance('internal', newInternal, setNewInternal)}>Add</button></div>
        {(compliance.internal || []).map((item, i) => (<div key={i} style={s.scopeItem}><div style={{ ...s.scopeDot, background: '#7C3AED' }} /><span style={s.scopeItemText}>{item}</span><button style={s.removeSmallBtn} onClick={() => removeCompliance('internal', i)}>✕</button></div>))}
      </div>
      <div style={{ marginTop: 24 }}>
        <p style={s.scopeLabel}>External Regulations</p>
        <div style={s.addRow}><input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. Must comply with NDPR" value={newExternal} onChange={e => setNewExternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('external', newExternal, setNewExternal)} /><button style={s.addBtn} onClick={() => addCompliance('external', newExternal, setNewExternal)}>Add</button></div>
        {(compliance.external || []).map((item, i) => (<div key={i} style={s.scopeItem}><div style={{ ...s.scopeDot, background: '#DC2626' }} /><span style={s.scopeItemText}>{item}</span><button style={s.removeSmallBtn} onClick={() => removeCompliance('external', i)}>✕</button></div>))}
        {(compliance.flags || []).length > 0 && (<div style={{ marginTop: 16 }}><p style={s.scopeHint}>PM Buddy flagged these based on your industry:</p>{compliance.flags.map((f, i) => <div key={i} style={s.scopeItem}><div style={{ ...s.scopeDot, background: '#D97706' }} /><span style={s.scopeItemText}>{f}</span></div>)}</div>)}
      </div>
    </div>
  );
}

// REQUIREMENTS TAB

function RequirementsTab({ data, onSave, project }) {
  const requirements = data.requirements || {};
  const [openCategory, setOpenCategory] = useState(null);
  const [newItems, setNewItems] = useState({});
  const [suggesting, setSuggesting] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const [showAdvice, setShowAdvice] = useState(false);

  const totalItems = REQ_CATEGORIES.reduce((sum, cat) => sum + (requirements[cat.key] || []).length, 0);

  const addItem = (key, value) => {
    if (!value.trim()) return;
    const updated = { ...requirements, [key]: [...(requirements[key] || []), { text: value.trim(), addedAt: new Date().toISOString(), addedBy: project._currentUser?.user_metadata?.first_name || project._currentUser?.email || 'You' }] };
    onSave({ requirements: updated });
    setNewItems(p => ({ ...p, [key]: '' }));
    if (totalItems + 1 >= 3) setShowAdvice(true);
  };

  const removeItem = (key, idx) => {
    const updated = { ...requirements, [key]: (requirements[key] || []).filter((_, i) => i !== idx) };
    onSave({ requirements: updated });
  };

  const getSuggestions = async (cat) => {
    setSuggesting(p => ({ ...p, [cat.key]: true }));
    setSuggestions(p => ({ ...p, [cat.key]: null }));
    const existing = (requirements[cat.key] || []).map(i => i.text).join('\n');
    const prompt = `You are PM Buddy, a plain-English project management coach.

Project: ${data.name}
Goal: ${data.scope?.goal || data.description || 'Not specified'}
Industry: ${data.industry || 'Not specified'}
Description: ${data.description || 'Not specified'}

The user is filling in requirements for the category: "${cat.title}"
What this category means: ${cat.hint}

${existing ? `They already have these:\n${existing}\n\nSuggest 3 to 5 MORE that they may have missed.` : 'Suggest 4 to 6 requirements for this category.'}

Rules:
- Plain English only. No technical jargon unless essential.
- Each item should be one clear sentence starting with a verb.
- Be specific to this project, not generic.
- Return ONLY a JSON array of strings. No markdown. No explanation. Example: ["Item one", "Item two"]`;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const result = await res.json();
      const text = (result.result || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) setSuggestions(p => ({ ...p, [cat.key]: parsed }));
    } catch { setSuggestions(p => ({ ...p, [cat.key]: ['Could not generate suggestions right now. Try again.'] })); }
    setSuggesting(p => ({ ...p, [cat.key]: false }));
  };

  const acceptSuggestion = (key, item) => {
    const updated = { ...requirements, [key]: [...(requirements[key] || []), { text: item, addedAt: new Date().toISOString(), addedBy: 'PM Buddy AI' }] };
    onSave({ requirements: updated });
    setSuggestions(p => ({ ...p, [key]: (p[key] || []).filter(s => s !== item) }));
    if (totalItems + 1 >= 3) setShowAdvice(true);
  };

  return (
    <div>
      <SectionHead
        title="Requirements"
        sub="Define exactly what you are building before you start building it. Fill in what you know. Ask PM Buddy to suggest what you might have missed."
      />

      {totalItems === 0 && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px', marginBottom: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0A0A0A', marginBottom: 6 }}>Start with what you know</p>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>Click any category below and add what your project must do. Once you have added a few, click "Suggest more" and PM Buddy will fill in what you may have missed.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {REQ_CATEGORIES.map((cat) => {
          const items = requirements[cat.key] || [];
          const isOpen = openCategory === cat.key;
          const isSuggesting = suggesting[cat.key];
          const catSuggestions = suggestions[cat.key] || [];

          return (
            <div key={cat.key} style={{ background: '#FFFFFF', border: `1px solid ${isOpen ? cat.color + '40' : '#E5E7EB'}`, borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s' }}>
              <button
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                onClick={() => setOpenCategory(isOpen ? null : cat.key)}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: cat.color, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginBottom: 2 }}>{cat.title}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>{items.length > 0 ? `${items.length} item${items.length !== 1 ? 's' : ''} added` : 'Nothing added yet'}</p>
                </div>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${cat.color}20` }}>
                  <div style={{ background: cat.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 14, marginTop: 14 }}>
                    <p style={{ fontSize: 13, color: cat.color, lineHeight: 1.65, fontWeight: 500 }}>{cat.hint}</p>
                  </div>

                  {items.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      {items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0, marginTop: 6 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, color: '#0A0A0A', lineHeight: 1.6 }}>{item.text}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Added by {item.addedBy}</p>
                          </div>
                          <button style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, flexShrink: 0, fontFamily: 'inherit' }} onClick={() => removeItem(cat.key, idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input
                      style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: '#0A0A0A', outline: 'none', background: '#FFFFFF' }}
                      placeholder={cat.example}
                      value={newItems[cat.key] || ''}
                      onChange={e => setNewItems(p => ({ ...p, [cat.key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addItem(cat.key, newItems[cat.key] || '')}
                    />
                    <button
                      style={{ padding: '10px 16px', background: cat.color, color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                      onClick={() => addItem(cat.key, newItems[cat.key] || '')}
                    >Add</button>
                  </div>

                  <button
                    style={{ padding: '8px 16px', background: '#F8FAFC', color: cat.color, border: `1px solid ${cat.color}40`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: isSuggesting ? 0.6 : 1 }}
                    onClick={() => getSuggestions(cat)}
                    disabled={isSuggesting}
                  >
                    {isSuggesting ? 'PM Buddy is thinking...' : '✦ Suggest more'}
                  </button>

                  {catSuggestions.length > 0 && (
                    <div style={{ marginTop: 14, background: '#F8FAFC', borderRadius: 10, padding: '14px', border: '1px solid #E5E7EB' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>PM Buddy Suggestions</p>
                      {catSuggestions.map((suggestion, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                          <p style={{ flex: 1, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{suggestion}</p>
                          <button
                            style={{ padding: '4px 12px', background: cat.color, color: '#FFFFFF', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                            onClick={() => acceptSuggestion(cat.key, suggestion)}
                          >Add</button>
                        </div>
                      ))}
                      <button style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }} onClick={() => setSuggestions(p => ({ ...p, [cat.key]: [] }))}>Dismiss</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(showAdvice || totalItems >= 3) && (
        <div style={{ background: '#0A0A0A', borderRadius: 16, padding: '24px', marginTop: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Before you start building</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF', marginBottom: 10, lineHeight: 1.5 }}>You have your requirements. Now map out how everything connects.</p>
          <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.75, marginBottom: 16 }}>A simple diagram showing how your product flows from one step to the next can save you from expensive blockers mid-build. You do not need to be technical. A box-and-arrow sketch is enough to catch gaps before they become problems.</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', marginBottom: 10 }}>Free tools to create your diagram</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { name: 'draw.io', url: 'https://draw.io', note: 'Free, no signup needed' },
              { name: 'Miro', url: 'https://miro.com', note: 'Great for team collaboration' },
              { name: 'Figma', url: 'https://figma.com', note: 'If you want it to look polished' },
              { name: 'Lucidchart', url: 'https://lucidchart.com', note: 'Simple and structured' },
            ].map(tool => (
              <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', flexDirection: 'column', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 10, padding: '10px 14px', textDecoration: 'none', minWidth: 130 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 3 }}>{tool.name}</span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{tool.note}</span>
              </a>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>Start with a simple flow: what does a user do first? What happens next? Where does the data go? Even a rough sketch in 20 minutes will save you hours of confusion later.</p>
        </div>
      )}
    </div>
  );
}


function SectionHead({ title, sub }) {
  return (<div style={s.sectionHeadWrap}><h3 style={s.sectionHeadTitle}>{title}</h3><p style={s.sectionHeadSub}>{sub}</p></div>);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '32px 24px 80px' },
  wrap: { maxWidth: 900, margin: '0 auto' },
  header: { marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 12, display: 'block' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  headerLeft: {},
  title: { fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: BL, letterSpacing: '-0.8px', marginBottom: 10 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  industryBadge: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  methodBox: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  methodBadge: { fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 100 },
  switchBtn: { fontSize: 12, fontWeight: 600, color: BLUE, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' },
  methodPicker: { background: WH, border: '1px solid #E5E7EB', borderRadius: 16, padding: 24, marginBottom: 20 },
  methodPickerTitle: { fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 16 },
  methodPickerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 },
  methodPickerCard: { padding: 16, border: '2px solid', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  methodPickerName: { fontSize: 15, fontWeight: 800, marginBottom: 6 },
  methodPickerReason: { fontSize: 13, color: '#6B7280', lineHeight: 1.6 },
  tabBar: { display: 'flex', borderBottom: '1.5px solid #E5E7EB', marginBottom: 20, overflowX: 'auto' },
  tabBtn: { padding: '10px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  content: { background: WH, borderRadius: 20, padding: '28px', border: '1px solid #E5E7EB' },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 },
  sectionHeadWrap: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #F3F4F6' },
  sectionHeadTitle: { fontSize: 18, fontWeight: 800, color: BL, marginBottom: 4, letterSpacing: '-0.3px' },
  sectionHeadSub: { fontSize: 14, color: '#6B7280', lineHeight: 1.7 },
  overviewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  overviewCard: { background: GREY, borderRadius: 14, padding: '18px', border: '1px solid #E5E7EB' },
  overviewLabel: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  overviewNum: { fontSize: 28, fontWeight: 900, color: BLUE, letterSpacing: '-1px', marginBottom: 6 },
  overviewSub: { fontSize: 12, color: '#6B7280' },
  miniBar: { height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  miniBarFill: { height: '100%', background: BLUE, borderRadius: 2 },
  approachCard: { borderRadius: 12, padding: '14px 16px', marginBottom: 20 },
  approachLabel: { fontSize: 12, fontWeight: 800, marginBottom: 6 },
  approachText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  overviewSection: { marginBottom: 20 },
  goalCard: { background: GREY, borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid #E5E7EB' },
  goalText: { fontSize: 15, color: BL, lineHeight: 1.7 },
  smallEditBtn: { padding: '4px 12px', background: WH, color: '#374151', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  smallRefineBtn: { padding: '4px 12px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  suggestionBox: { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', marginTop: 10 },
  suggestionLabel: { fontSize: 10, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 },
  suggestionText: { fontSize: 14, color: '#166534', lineHeight: 1.7 },
  acceptBtn: { padding: '5px 14px', background: '#15803D', color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  dismissBtn: { padding: '5px 12px', background: 'none', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  milestoneRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  milestoneCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB', flexWrap: 'wrap' },
  milestoneCheck: { width: 20, height: 20, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  milestoneName: { fontSize: 14, fontWeight: 600, color: BL, marginBottom: 2 },
  milestoneDate: { fontSize: 12, color: '#9CA3AF' },
  complianceAlert: { background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 20 },
  complianceAlertTitle: { fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 },
  complianceFlag: { fontSize: 13, color: '#92400E', lineHeight: 1.7 },
  pill: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' },
  input: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 14, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  textarea: { width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '11px 14px', fontSize: 14, fontFamily: 'inherit', marginBottom: 14, boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  select: { padding: '11px 12px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: BL, outline: 'none', background: WH },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 },
  addRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 },
  addBtn: { padding: '11px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 },
  primaryBtn: { padding: '11px 22px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, display: 'inline-block' },
  addCard: { background: GREY, borderRadius: 14, padding: 20, border: '1px solid #E5E7EB', marginBottom: 20 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' },
  removeSmallBtn: { background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', flexShrink: 0 },
  checkBtn: { width: 22, height: 22, borderRadius: '50%', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, background: WH },
  epicCard: { background: GREY, borderRadius: 14, border: '1px solid #E5E7EB', marginBottom: 10, overflow: 'hidden' },
  epicHeader: { display: 'flex', alignItems: 'center', padding: '14px 16px' },
  epicToggle: { flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' },
  epicArrow: { fontSize: 10, color: '#9CA3AF', flexShrink: 0 },
  epicTitle: { fontSize: 15, fontWeight: 700, color: BL, flex: 1 },
  epicCount: { fontSize: 11, color: '#9CA3AF', fontWeight: 600 },
  epicBody: { padding: '16px', borderTop: '1px solid #E5E7EB' },
  storyRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  storyTitle: { flex: 1, fontSize: 13, fontWeight: 600 },
  sprintCard: { background: GREY, borderRadius: 14, padding: '18px', border: '1px solid #E5E7EB', marginBottom: 10 },
  sprintHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sprintNum: { fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  sprintGoal: { fontSize: 15, fontWeight: 700, color: BL, marginBottom: 4 },
  sprintMeta: { fontSize: 12, color: '#9CA3AF' },
  sprintActions: { display: 'flex', gap: 8 },
  sprintBtn: { padding: '7px 14px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: WH, color: '#374151', whiteSpace: 'nowrap' },
  retroCard: { background: GREY, borderRadius: 14, padding: '20px', border: '1px solid #E5E7EB', marginBottom: 12 },
  retroHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  retroCycle: { fontSize: 14, fontWeight: 800, color: BL },
  retroDate: { fontSize: 12, color: '#9CA3AF' },
  retroSection: { marginBottom: 12 },
  retroSectionLabel: { fontSize: 11, fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  retroText: { fontSize: 14, color: '#374151', lineHeight: 1.7 },
  stakeholderCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px', background: GREY, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 10 },
  stakeholderLeft: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  stakeholderRight: { display: 'flex', alignItems: 'center', gap: 8 },
  stakeholderComms: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  memberAvatar: { width: 36, height: 36, borderRadius: '50%', background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 },
  memberName: { fontSize: 14, fontWeight: 700, color: BL, marginBottom: 2 },
  memberRole: { fontSize: 12, color: '#6B7280' },
  scopeSection: { marginBottom: 24 },
  scopeLabel: { fontSize: 13, fontWeight: 800, color: BL, marginBottom: 4 },
  scopeHint: { fontSize: 13, color: '#6B7280', lineHeight: 1.65, marginBottom: 12 },
  scopeItem: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' },
  scopeDot: { width: 8, height: 8, borderRadius: '50%', background: BLUE, flexShrink: 0, marginTop: 5 },
  scopeItemText: { flex: 1, fontSize: 14, color: BL, lineHeight: 1.6 },
  planningSection: { marginBottom: 24 },
  riskCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: GREY, borderRadius: 10, marginBottom: 8, border: '1px solid #E5E7EB' },
  riskTitle: { flex: 1, fontSize: 14, fontWeight: 600 },
  timelineRange: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, background: GREY, borderRadius: 12, padding: '18px' },
  timelineDateLabel: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  timelineDateVal: { fontSize: 15, fontWeight: 800, color: BL },
  insightsSection: { marginTop: 28, paddingTop: 24, borderTop: '1px solid #F3F4F6' },
  insightCard: { background: GREY, borderRadius: 12, padding: '16px 18px', border: '1px solid #E5E7EB' },
  insightIcon: { fontSize: 16, width: 28, height: 28, background: WH, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', flexShrink: 0 },
  insightTitle: { fontSize: 13, fontWeight: 700, color: BL },
  aiBadge: { fontSize: 10, fontWeight: 600, color: BLUE, background: '#EFF6FF', padding: '2px 7px', borderRadius: 100, display: 'inline-block', marginTop: 2 },
  editedBadge: { fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: 100, display: 'inline-block', marginTop: 2 },
  insightSmBtn: { padding: '4px 10px', background: WH, color: '#374151', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
