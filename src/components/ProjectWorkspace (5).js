import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RemindersPanel from './RemindersPanel';
import TeamTab from './TeamTab';
import PMBuddyAssistant from './PMBuddyAssistant';

const BLUE = '#0284C7';
const BL = '#0A0A0A';
const WH = '#FFFFFF';
const GREY = '#F8FAFC';
const RULE = '#E5E7EB';

const TABS = ['Overview', 'Tasks', 'Risks', 'People', 'Documents'];

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch { return {}; }
}

async function notify(type, project, data) {
  try {
    const authHeader = await getAuthHeader();
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ type, projectId: project.id, projectName: project.name, ownerEmail: project.owner_email, data }),
    });
  } catch (err) { console.error('Notify error:', err); }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ─── MAIN COMPONENT ───────────────────────────────────────────

export default function ProjectWorkspace({ project, onBack, onUpdate }) {
  const [data, setData] = useState(project);
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

  const save = useCallback(async (updates, historyEntry) => {
    const currentHistory = data.history || [];
    const newHistory = historyEntry
      ? [...currentHistory, { ...historyEntry, timestamp: new Date().toISOString(), by: project._currentUser?.user_metadata?.first_name || project._currentUser?.email || 'You' }]
      : currentHistory;
    const finalUpdates = historyEntry ? { ...updates, history: newHistory } : updates;
    const updated = { ...data, ...finalUpdates, updated_at: new Date().toISOString() };
    setData(updated);
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      await supabase.from('pm_projects').update(finalUpdates).eq('id', project.id);
      setSaveStatus('saved');
      if (onUpdate) onUpdate(updated);
    }, 1500);
  }, [data, project.id, onUpdate, project._currentUser]);

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button style={s.backBtn} onClick={onBack}>← All Projects</button>
            <span style={{ fontSize: 12, color: saveStatus === 'saved' ? '#15803D' : saveStatus === 'saving' ? '#D97706' : '#9CA3AF' }}>
              {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
            </span>
          </div>
          <h1 style={s.title}>{data.name}</h1>
          <div style={s.metaRow}>
            <span style={s.industryBadge}>{data.industry}</span>
            <span style={{ ...s.statusBadge, background: data.status === 'active' ? '#F0FDF4' : '#FEF2F2', color: data.status === 'active' ? '#15803D' : '#DC2626' }}>
              {data.status === 'active' ? 'Active' : 'Completed'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? BLUE : '#6B7280', borderBottomColor: tab === t ? BLUE : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div style={s.content}>
          {tab === 'Overview' && <OverviewTab data={data} onSave={save} acceptedMembers={acceptedMembers} />}
          {tab === 'Tasks' && <TasksTab data={data} onSave={save} />}
          {tab === 'Risks' && <RisksTab data={data} onSave={save} />}
          {tab === 'People' && <PeopleTab data={data} onSave={save} project={project} acceptedMembers={acceptedMembers} />}
          {tab === 'Documents' && <DocumentsTab data={data} onSave={save} project={project} />}
        </div>
      </div>
      <PMBuddyAssistant project={data} />
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────

function OverviewTab({ data, onSave, acceptedMembers }) {
  const end = data.timeline?.end ? new Date(data.timeline.end) : null;
  const start = data.timeline?.start ? new Date(data.timeline.start) : null;
  const today = new Date();
  const totalDays = start && end ? Math.ceil((end - start) / 86400000) : 0;
  const daysLeft = end ? Math.ceil((end - today) / 86400000) : null;
  const progress = totalDays > 0 ? Math.max(0, Math.min(100, Math.round(((totalDays - (daysLeft || 0)) / totalDays) * 100))) : 0;
  const milestones = data.milestones || [];
  const doneMilestones = milestones.filter(m => m.status === 'done').length;
  const openRisks = (data.risks || []).filter(r => r.status === 'open').length;
  const tasks = data.tasks || [];
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const totalTeam = 1 + acceptedMembers.length;

  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(data.scope?.goal || '');
  const [refiningGoal, setRefiningGoal] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState('');

  const saveGoal = () => {
    onSave({ scope: { ...data.scope, goal: goalDraft } }, { type: 'goal_updated', label: 'Goal updated', detail: goalDraft.substring(0, 80) });
    setEditingGoal(false);
  };

  const refineGoal = async () => {
    if (!goalDraft.trim()) return;
    setRefiningGoal(true);
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ prompt: `You are PM Buddy. Rewrite this as a clear measurable goal in plain English: "${goalDraft}"\n\nOne or two sentences starting with "This project will succeed when...". No jargon. Return ONLY the rewritten goal.` }) });
      const result = await res.json();
      if (result.result?.trim()) setGoalSuggestion(result.result.trim());
    } catch (err) { console.error(err); }
    setRefiningGoal(false);
  };

  return (
    <div>
      {/* Stats */}
      <div style={s.statsGrid}>
        {[
          { label: 'Time used', value: `${progress}%`, sub: daysLeft !== null ? (daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue') : 'No end date', color: daysLeft !== null && daysLeft < 7 ? '#DC2626' : BLUE },
          { label: 'Milestones', value: `${doneMilestones}/${milestones.length}`, sub: 'completed', color: BLUE },
          { label: 'Tasks', value: `${doneTasks}/${tasks.length}`, sub: 'done', color: '#15803D' },
          { label: 'Open risks', value: openRisks, sub: 'need attention', color: openRisks > 0 ? '#DC2626' : '#15803D' },
          { label: 'Team', value: totalTeam, sub: 'people', color: BLUE },
        ].map((stat, i) => (
          <div key={i} style={s.statCard}>
            <p style={s.statLabel}>{stat.label}</p>
            <p style={{ ...s.statNum, color: stat.color }}>{stat.value}</p>
            <p style={s.statSub}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Timeline bar */}
      {totalDays > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 6, background: RULE, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: daysLeft !== null && daysLeft < 7 ? '#DC2626' : BLUE, borderRadius: 3, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{data.timeline?.start ? formatDate(data.timeline.start) : 'Start'}</span>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{data.timeline?.end ? formatDate(data.timeline.end) : 'End'}</span>
          </div>
        </div>
      )}

      {/* Goal */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={s.cardLabel}>What success looks like</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editingGoal && <button style={s.smallBtn} onClick={() => { setEditingGoal(true); setGoalDraft(data.scope?.goal || ''); }}>Edit</button>}
            {!editingGoal && <button style={{ ...s.smallBtn, color: '#15803D', borderColor: '#BBF7D0', background: '#F0FDF4' }} onClick={() => { setEditingGoal(true); setGoalDraft(data.scope?.goal || ''); setTimeout(refineGoal, 100); }}>AI Refine</button>}
            {editingGoal && <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveGoal}>Save</button>}
            {editingGoal && <button style={s.smallBtn} onClick={() => { setEditingGoal(false); setGoalSuggestion(''); }}>Cancel</button>}
          </div>
        </div>
        {!editingGoal && <p style={{ fontSize: 15, color: BL, lineHeight: 1.7 }}>{data.scope?.goal || 'No goal set yet. Click Edit to add one.'}</p>}
        {editingGoal && <textarea style={s.textarea} rows={3} value={goalDraft} onChange={e => setGoalDraft(e.target.value)} />}
        {editingGoal && goalDraft.length > 20 && !goalSuggestion && <button style={{ ...s.smallBtn, color: '#15803D', borderColor: '#BBF7D0', background: '#F0FDF4', marginTop: 8 }} onClick={refineGoal} disabled={refiningGoal}>{refiningGoal ? 'Refining...' : 'AI Refine'}</button>}
        {goalSuggestion && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px', marginTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#15803D', marginBottom: 6 }}>PM BUDDY SUGGESTION</p>
            <p style={{ fontSize: 14, color: '#166534', lineHeight: 1.7, marginBottom: 10 }}>{goalSuggestion}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.smallBtn, background: '#15803D', color: WH, borderColor: '#15803D' }} onClick={() => { setGoalDraft(goalSuggestion); setGoalSuggestion(''); }}>Use this</button>
              <button style={s.smallBtn} onClick={() => setGoalSuggestion('')}>Keep mine</button>
            </div>
          </div>
        )}
      </div>

      {/* Current status */}
      <CurrentStatus data={data} onSave={onSave} />

      {/* Milestones snapshot */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <p style={s.cardLabel}>Milestones</p>
        {milestones.length === 0 && <p style={s.emptyText}>No milestones yet. Add them in the Tasks tab.</p>}
        {milestones.slice(0, 5).map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(milestones.length, 5) - 1 ? `1px solid ${RULE}` : 'none' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${m.status === 'done' ? BLUE : m.status === 'in_progress' ? '#D97706' : '#D1D5DB'}`, background: m.status === 'done' ? BLUE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.status === 'done' && <span style={{ color: WH, fontSize: 9, fontWeight: 900 }}>✓</span>}
            </div>
            <p style={{ flex: 1, fontSize: 14, color: m.status === 'done' ? '#9CA3AF' : BL, textDecoration: m.status === 'done' ? 'line-through' : 'none' }}>{m.title}</p>
            <span style={{ fontSize: 11, color: '#9CA3AF' }}>{m.date ? formatDate(m.date) : ''}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: m.status === 'done' ? '#F0FDF4' : m.status === 'in_progress' ? '#FFF7ED' : '#EFF6FF', color: m.status === 'done' ? '#15803D' : m.status === 'in_progress' ? '#D97706' : BLUE }}>
              {m.status === 'done' ? 'Done' : m.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
          </div>
        ))}
        {milestones.length > 5 && <p style={{ fontSize: 12, color: BLUE, marginTop: 8, cursor: 'pointer' }}>+ {milestones.length - 5} more — see Tasks tab</p>}
      </div>

      {/* Compliance heads up */}
      {data.compliance?.flags?.length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Things to keep in mind</p>
          {data.compliance.flags.map((f, i) => <p key={i} style={{ fontSize: 13, color: '#92400E', lineHeight: 1.7 }}>· {f}</p>)}
        </div>
      )}

      {/* AI Insights */}
      <AIInsights data={data} onSave={onSave} />
    </div>
  );
}

function CurrentStatus({ data, onSave }) {
  const scope = data.scope || {};
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ currentPhase: scope.currentPhase || '', completedWork: scope.completedWork || '', remainingWork: scope.remainingWork || '', blockers: scope.blockers || '', communicationFlow: scope.communicationFlow || '' });
  const [aiReview, setAiReview] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const saveStatus = () => { onSave({ scope: { ...scope, ...draft } }); setEditing(false); };

  const getAiReview = async () => {
    setReviewing(true);
    setAiReview('');
    const prompt = `You are PM Buddy. Review this project status and give honest plain-English feedback in 3 to 4 sentences. What looks good, what is concerning, what to focus on. No bullet points.\n\nProject: ${data.name}\nGoal: ${scope.goal}\nPhase: ${draft.currentPhase || 'Not specified'}\nDone: ${draft.completedWork || 'Not specified'}\nRemaining: ${draft.remainingWork || 'Not specified'}\nBlockers: ${draft.blockers || 'None'}`;
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ prompt }) });
      const result = await res.json();
      setAiReview(result.result || 'Could not get feedback right now.');
    } catch { setAiReview('Could not get feedback right now.'); }
    setReviewing(false);
  };

  const hasContent = scope.currentPhase || scope.completedWork || scope.remainingWork || scope.blockers;

  return (
    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasContent || editing ? 12 : 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Status</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editing && <button style={s.smallBtn} onClick={() => setEditing(true)}>Edit</button>}
          {!editing && hasContent && <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={getAiReview} disabled={reviewing}>{reviewing ? 'Reviewing...' : 'AI Review'}</button>}
          {editing && <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveStatus}>Save</button>}
          {editing && <button style={s.smallBtn} onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      </div>
      {!editing && !hasContent && <p style={{ fontSize: 13, color: '#6B7280' }}>No status yet. Click Edit to add where things stand.</p>}
      {!editing && hasContent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ label: 'Phase', value: scope.currentPhase }, { label: 'Done so far', value: scope.completedWork }, { label: 'Still to do', value: scope.remainingWork }, { label: 'Blockers', value: scope.blockers }].map(({ label, value }) => value ? (
            <div key={label}><p style={{ fontSize: 10, fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</p><p style={{ fontSize: 14, color: BL, lineHeight: 1.6 }}>{value}</p></div>
          ) : null)}
        </div>
      )}
      {editing && (
        <div>
          {[{ key: 'currentPhase', label: 'What phase is it in?', placeholder: 'e.g. Planning, Building, Testing' }, { key: 'completedWork', label: 'What has been done?', placeholder: 'What is finished so far?' }, { key: 'remainingWork', label: 'What is left to do?', placeholder: 'What still needs to happen?' }, { key: 'blockers', label: 'Any blockers?', placeholder: 'What is slowing things down?' }].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>{label}</label>
              <textarea style={{ ...s.textarea, minHeight: 50 }} rows={2} placeholder={placeholder} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}
      {aiReview && <div style={{ marginTop: 12, background: WH, borderRadius: 8, padding: '12px', border: '1px solid #BFDBFE' }}><p style={{ fontSize: 11, fontWeight: 700, color: BLUE, marginBottom: 6 }}>PM BUDDY'S TAKE</p><p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7 }}>{aiReview}</p></div>}
    </div>
  );
}

function AIInsights({ data, onSave }) {
  const insights = data.insights || {};
  const projectContext = `Project: ${data.name}\nIndustry: ${data.industry}\nGoal: ${data.scope?.goal || 'Not specified'}\nTeam: ${(data.team || []).map(m => `${m.name} (${m.role})`).join(', ') || 'Solo'}\nMilestones: ${(data.milestones || []).map(m => `${m.title} (${m.status})`).join(', ') || 'None'}\nRisks: ${(data.risks || []).map(r => r.title).join(', ') || 'None'}`;

  const defs = [
    { key: 'definition_of_done', title: 'How we know it is finished', icon: '✓', prompt: `Write 4-6 checkable bullet points starting with ✓ that define done for this project. Plain English. No jargon.\n\n${projectContext}` },
    { key: 'business_benefit', title: 'Why this matters', icon: '◈', prompt: `Write 3-5 sentences about the value this project delivers. Who benefits, what changes, what the outcome is. Plain language.\n\n${projectContext}` },
    { key: 'roadmap', title: 'Simple roadmap', icon: '→', prompt: `Write a simple roadmap in plain English. Organise into phases with what happens in each. No jargon.\n\n${projectContext}` },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>PM Buddy Insights</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {defs.map(ins => (
          <InsightCard key={ins.key} title={ins.title} icon={ins.icon} savedValue={insights[ins.key]?.content || ''} savedEdited={insights[ins.key]?.edited || false} generatePrompt={ins.prompt}
            onSave={(content, edited) => onSave({ insights: { ...insights, [ins.key]: { content, edited, updatedAt: new Date().toISOString() } } })} />
        ))}
      </div>
    </div>
  );
}

function InsightCard({ title, icon, savedValue, savedEdited, onSave, generatePrompt }) {
  const [content, setContent] = useState(savedValue || '');
  const [edited, setEdited] = useState(savedEdited || false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => { setContent(savedValue || ''); setEdited(savedEdited || false); }, [savedValue, savedEdited]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ prompt: generatePrompt }) });
      const result = await res.json();
      const text = (result.result || '').trim().replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6} /g, '').trim();
      if (text) { setContent(text); setEdited(false); onSave(text, false); }
    } catch (err) { console.error(err); }
    setGenerating(false);
  };

  return (
    <div style={{ background: GREY, borderRadius: 10, padding: '14px 16px', border: `1px solid ${RULE}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: content ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: BLUE }}>{icon}</span>
          <p style={{ fontSize: 13, fontWeight: 700, color: BL }}>{title}</p>
          {content && <span style={{ fontSize: 10, fontWeight: 600, color: edited ? '#D97706' : BLUE, background: edited ? '#FFFBEB' : '#EFF6FF', padding: '1px 6px', borderRadius: 100 }}>{edited ? 'Edited' : 'AI'}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {content && !editing && <button style={s.smallBtn} onClick={() => { setDraft(content); setEditing(true); }}>Edit</button>}
          {editing && <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={() => { setContent(draft); setEdited(true); onSave(draft, true); setEditing(false); }}>Save</button>}
          {editing && <button style={s.smallBtn} onClick={() => setEditing(false)}>Cancel</button>}
          {!editing && <button style={{ ...s.smallBtn, background: content ? GREY : BLUE, color: content ? '#374151' : WH, borderColor: content ? RULE : BLUE }} onClick={generate} disabled={generating}>{generating ? 'Generating...' : content ? 'Regenerate' : 'Generate'}</button>}
        </div>
      </div>
      {!content && !generating && <p style={{ fontSize: 13, color: '#9CA3AF' }}>Click Generate and PM Buddy will fill this in from your project details.</p>}
      {generating && <p style={{ fontSize: 13, color: '#6B7280' }}>PM Buddy is working on this...</p>}
      {content && !editing && <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{content}</div>}
      {editing && <textarea style={{ ...s.textarea, marginTop: 8, minHeight: 100 }} value={draft} onChange={e => setDraft(e.target.value)} rows={4} />}
    </div>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────

function TasksTab({ data, onSave }) {
  const tasks = data.tasks || [];
  const milestones = data.milestones || [];
  const [newTask, setNewTask] = useState({ title: '', assignee: '', dueDate: '', milestoneId: '' });
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);
  const [editTaskDraft, setEditTaskDraft] = useState({});
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' });
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState(null);
  const [editMilestoneDraft, setEditMilestoneDraft] = useState({});
  const [activeView, setActiveView] = useState('kanban'); // 'kanban' | 'list'

  const COLUMNS = [
    { id: 'todo', label: 'To Do', color: '#6B7280', bg: GREY },
    { id: 'in_progress', label: 'In Progress', color: '#D97706', bg: '#FFFBEB' },
    { id: 'done', label: 'Done', color: '#15803D', bg: '#F0FDF4' },
  ];

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task = { id: Date.now().toString(), title: newTask.title.trim(), assignee: newTask.assignee.trim(), dueDate: newTask.dueDate, status: 'todo', milestoneId: newTask.milestoneId, createdAt: new Date().toISOString() };
    onSave({ tasks: [...tasks, task] }, { type: 'task_added', label: 'Task added', detail: newTask.title });
    setNewTask({ title: '', assignee: '', dueDate: '', milestoneId: '' });
    setShowAddTask(false);
  };

  const moveTask = (taskId, newStatus) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    onSave({ tasks: updated });
    if (newStatus === 'done') notify('task_done', data, { task: tasks.find(t => t.id === taskId)?.title });
  };

  const deleteTask = (taskId) => onSave({ tasks: tasks.filter(t => t.id !== taskId) });

  const saveTaskEdit = () => {
    const updated = tasks.map((t, idx) => idx === editingTaskIdx ? { ...t, ...editTaskDraft } : t);
    onSave({ tasks: updated });
    setEditingTaskIdx(null);
  };

  const addMilestone = () => {
    if (!newMilestone.title.trim()) return;
    onSave({ milestones: [...milestones, { title: newMilestone.title.trim(), date: newMilestone.date, status: 'pending' }] });
    setNewMilestone({ title: '', date: '' });
    setShowAddMilestone(false);
  };

  const cycleMilestone = (i) => {
    const current = milestones[i].status;
    const next = current === 'pending' ? 'in_progress' : current === 'in_progress' ? 'done' : 'pending';
    onSave({ milestones: milestones.map((m, idx) => idx === i ? { ...m, status: next } : m) });
    if (next === 'done') notify('milestone_done', data, { milestone: milestones[i].title });
  };

  const deleteMilestone = (i) => onSave({ milestones: milestones.filter((_, idx) => idx !== i) });

  const saveMilestoneEdit = () => {
    onSave({ milestones: milestones.map((m, idx) => idx === editingMilestoneIdx ? { ...m, ...editMilestoneDraft } : m) });
    setEditingMilestoneIdx(null);
  };

  const teamMembers = (data.team || []).map(m => m.name).filter(Boolean);

  return (
    <div>
      {/* KANBAN BOARD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: BL, marginBottom: 2 }}>Task Board</h3>
          <p style={{ fontSize: 13, color: '#6B7280' }}>Move tasks between columns as work progresses.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...s.smallBtn, background: activeView === 'kanban' ? BL : WH, color: activeView === 'kanban' ? WH : '#374151', borderColor: activeView === 'kanban' ? BL : RULE }} onClick={() => setActiveView('kanban')}>Board</button>
          <button style={{ ...s.smallBtn, background: activeView === 'list' ? BL : WH, color: activeView === 'list' ? WH : '#374151', borderColor: activeView === 'list' ? BL : RULE }} onClick={() => setActiveView('list')}>List</button>
          <button style={{ padding: '7px 14px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowAddTask(p => !p)}>+ Add Task</button>
        </div>
      </div>

      {/* Add task form */}
      {showAddTask && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: BL, marginBottom: 12 }}>New Task</p>
          <input style={s.input} placeholder="What needs to be done?" value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask()} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {teamMembers.length > 0 ? (
              <select style={{ ...s.input, flex: 1, marginBottom: 0 }} value={newTask.assignee} onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))}>
                <option value="">Who is doing this?</option>
                {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Who is doing this?" value={newTask.assignee} onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))} />
            )}
            <input style={{ ...s.input, flex: 1, marginBottom: 0 }} type="date" value={newTask.dueDate} onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          {milestones.length > 0 && (
            <select style={{ ...s.input, marginTop: 10 }} value={newTask.milestoneId} onChange={e => setNewTask(p => ({ ...p, milestoneId: e.target.value }))}>
              <option value="">Link to a milestone (optional)</option>
              {milestones.map((m, i) => <option key={i} value={i.toString()}>{m.title}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ padding: '8px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={addTask}>Add Task</button>
            <button style={s.smallBtn} onClick={() => setShowAddTask(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {activeView === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} style={{ background: col.bg, borderRadius: 12, padding: 12, border: `1px solid ${RULE}`, minHeight: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: col.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.label}</p>
                  <span style={{ fontSize: 11, fontWeight: 700, color: col.color, background: WH, padding: '1px 7px', borderRadius: 100, border: `1px solid ${RULE}` }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>No tasks here</p>}
                {colTasks.map(task => {
                  const taskIdx = tasks.findIndex(t => t.id === task.id);
                  const overdue = task.status !== 'done' && isOverdue(task.dueDate);
                  if (editingTaskIdx === taskIdx) {
                    return (
                      <div key={task.id} style={{ background: WH, borderRadius: 8, padding: 10, marginBottom: 8, border: `1px solid ${BLUE}` }}>
                        <input style={{ ...s.input, marginBottom: 6, fontSize: 13 }} value={editTaskDraft.title || ''} onChange={e => setEditTaskDraft(p => ({ ...p, title: e.target.value }))} />
                        <input style={{ ...s.input, marginBottom: 6, fontSize: 12 }} placeholder="Who is doing this?" value={editTaskDraft.assignee || ''} onChange={e => setEditTaskDraft(p => ({ ...p, assignee: e.target.value }))} />
                        <input style={{ ...s.input, marginBottom: 8, fontSize: 12 }} type="date" value={editTaskDraft.dueDate || ''} onChange={e => setEditTaskDraft(p => ({ ...p, dueDate: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE, fontSize: 11 }} onClick={saveTaskEdit}>Save</button>
                          <button style={{ ...s.smallBtn, fontSize: 11 }} onClick={() => setEditingTaskIdx(null)}>Cancel</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={task.id} style={{ background: WH, borderRadius: 8, padding: '10px 12px', marginBottom: 8, border: `1px solid ${overdue ? '#FECACA' : RULE}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: BL, marginBottom: 4, lineHeight: 1.4 }}>{task.title}</p>
                      {task.assignee && <p style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>👤 {task.assignee}</p>}
                      {task.dueDate && <p style={{ fontSize: 11, color: overdue ? '#DC2626' : '#6B7280', fontWeight: overdue ? 700 : 400 }}>{overdue ? '⚠ Overdue · ' : ''}{formatDate(task.dueDate)}</p>}
                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {col.id !== 'todo' && <button style={{ ...s.miniBtn }} onClick={() => moveTask(task.id, 'todo')}>← To Do</button>}
                        {col.id !== 'in_progress' && <button style={{ ...s.miniBtn }} onClick={() => moveTask(task.id, 'in_progress')}>In Progress</button>}
                        {col.id !== 'done' && <button style={{ ...s.miniBtn, background: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' }} onClick={() => moveTask(task.id, 'done')}>✓ Done</button>}
                        <button style={s.miniBtn} onClick={() => { setEditingTaskIdx(taskIdx); setEditTaskDraft({ ...task }); }}>Edit</button>
                        <button style={{ ...s.miniBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteTask(task.id)}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* LIST VIEW */}
      {activeView === 'list' && (
        <div style={{ marginBottom: 32 }}>
          {tasks.length === 0 && <p style={s.emptyText}>No tasks yet. Click + Add Task to get started.</p>}
          {tasks.map((task, taskIdx) => {
            const overdue = task.status !== 'done' && isOverdue(task.dueDate);
            const sc = { todo: { label: 'To Do', color: '#6B7280', bg: GREY }, in_progress: { label: 'In Progress', color: '#D97706', bg: '#FFFBEB' }, done: { label: 'Done', color: '#15803D', bg: '#F0FDF4' } };
            const status = sc[task.status] || sc.todo;
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: WH, borderRadius: 10, border: `1px solid ${overdue ? '#FECACA' : RULE}`, marginBottom: 8 }}>
                <button style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.status === 'done' ? '#15803D' : '#D1D5DB'}`, background: task.status === 'done' ? '#15803D' : WH, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => moveTask(task.id, task.status === 'done' ? 'todo' : 'done')}>
                  {task.status === 'done' && <span style={{ color: WH, fontSize: 9, fontWeight: 900 }}>✓</span>}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: task.status === 'done' ? '#9CA3AF' : BL, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</p>
                  <p style={{ fontSize: 12, color: overdue ? '#DC2626' : '#9CA3AF' }}>{task.assignee ? `${task.assignee} · ` : ''}{task.dueDate ? (overdue ? '⚠ Overdue · ' : '') + formatDate(task.dueDate) : ''}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>{status.label}</span>
                <button style={{ ...s.smallBtn, fontSize: 11 }} onClick={() => { setEditingTaskIdx(taskIdx); setEditTaskDraft({ ...task }); setActiveView('kanban'); }}>Edit</button>
                <button style={{ ...s.miniBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteTask(task.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* MILESTONES SECTION */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: BL, marginBottom: 2 }}>Milestones</h3>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Key checkpoints that show the project is on track.</p>
          </div>
          <button style={{ padding: '7px 14px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowAddMilestone(p => !p)}>+ Add Milestone</button>
        </div>

        {showAddMilestone && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input style={{ ...s.input, flex: 2, marginBottom: 0 }} placeholder="e.g. Launch beta, Complete training" value={newMilestone.title} onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addMilestone()} />
              <input style={{ ...s.input, flex: 1, marginBottom: 0 }} type="date" value={newMilestone.date} onChange={e => setNewMilestone(p => ({ ...p, date: e.target.value }))} />
              <button style={{ padding: '8px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={addMilestone}>Add</button>
              <button style={s.smallBtn} onClick={() => setShowAddMilestone(false)}>Cancel</button>
            </div>
          </div>
        )}

        {milestones.length === 0 && <p style={s.emptyText}>No milestones yet. Add one above.</p>}
        {milestones.map((m, i) => {
          const overdue = m.status !== 'done' && isOverdue(m.date);
          const sc = { done: { label: 'Done', color: '#15803D', bg: '#F0FDF4', next: 'Mark Pending' }, in_progress: { label: 'In Progress', color: '#D97706', bg: '#FFFBEB', next: 'Mark Done' }, pending: { label: 'Pending', color: BLUE, bg: '#EFF6FF', next: 'Start' } };
          const status = sc[m.status] || sc.pending;

          if (editingMilestoneIdx === i) {
            return (
              <div key={i} style={{ ...s.card, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input style={{ ...s.input, flex: 2, marginBottom: 0 }} value={editMilestoneDraft.title || ''} onChange={e => setEditMilestoneDraft(p => ({ ...p, title: e.target.value }))} />
                  <input style={{ ...s.input, flex: 1, marginBottom: 0 }} type="date" value={editMilestoneDraft.date || ''} onChange={e => setEditMilestoneDraft(p => ({ ...p, date: e.target.value }))} />
                  <select style={{ ...s.input, marginBottom: 0 }} value={editMilestoneDraft.status || 'pending'} onChange={e => setEditMilestoneDraft(p => ({ ...p, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                  <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={saveMilestoneEdit}>Save</button>
                  <button style={s.smallBtn} onClick={() => setEditingMilestoneIdx(null)}>Cancel</button>
                </div>
              </div>
            );
          }

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: WH, borderRadius: 10, border: `1px solid ${overdue ? '#FECACA' : RULE}`, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: m.status === 'done' ? '#9CA3AF' : BL, textDecoration: m.status === 'done' ? 'line-through' : 'none' }}>{m.title}</p>
                {m.date && <p style={{ fontSize: 12, color: overdue ? '#DC2626' : '#9CA3AF', fontWeight: overdue ? 700 : 400 }}>{overdue ? '⚠ Overdue · ' : ''}{formatDate(m.date)}</p>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: status.bg, color: status.color }}>{status.label}</span>
              <button style={s.smallBtn} onClick={() => cycleMilestone(i)}>{status.next}</button>
              <button style={s.smallBtn} onClick={() => { setEditingMilestoneIdx(i); setEditMilestoneDraft({ ...m }); }}>Edit</button>
              <button style={{ ...s.miniBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteMilestone(i)}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RISKS TAB ────────────────────────────────────────────────

function RisksTab({ data, onSave }) {
  const risks = data.risks || [];
  const compliance = data.compliance || { flags: [], internal: [], external: [] };
  const [newRisk, setNewRisk] = useState('');
  const [newLevel, setNewLevel] = useState('medium');
  const [newInternal, setNewInternal] = useState('');
  const [newExternal, setNewExternal] = useState('');

  const addRisk = () => {
    if (!newRisk.trim()) return;
    onSave({ risks: [...risks, { title: newRisk.trim(), level: newLevel, status: 'open' }] }, { type: 'risk_added', label: 'Risk added', detail: newRisk.trim() });
    if (newLevel === 'high') notify('risk_high', data, { risk: newRisk.trim() });
    setNewRisk('');
  };

  const toggleRisk = (i) => onSave({ risks: risks.map((r, idx) => idx === i ? { ...r, status: r.status === 'open' ? 'mitigated' : 'open' } : r) });
  const deleteRisk = (i) => onSave({ risks: risks.filter((_, idx) => idx !== i) });

  const addCompliance = (type, value, setter) => {
    if (!value.trim()) return;
    onSave({ compliance: { ...compliance, [type]: [...(compliance[type] || []), value.trim()] } });
    setter('');
  };

  const removeCompliance = (type, i) => onSave({ compliance: { ...compliance, [type]: (compliance[type] || []).filter((_, idx) => idx !== i) } });

  const levelColors = { high: { bg: '#FEF2F2', color: '#DC2626', label: 'High' }, medium: { bg: '#FFFBEB', color: '#D97706', label: 'Medium' }, low: { bg: '#F0FDF4', color: '#15803D', label: 'Low' } };
  const openRisks = risks.filter(r => r.status === 'open');
  const mitigatedRisks = risks.filter(r => r.status === 'mitigated');

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#DC2626' }}>{openRisks.length}</p>
          <p style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>Open risks</p>
        </div>
        <div style={{ background: '#F0FDF4', borderRadius: 10, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#15803D' }}>{mitigatedRisks.length}</p>
          <p style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>Handled</p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>What could go wrong?</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Add anything that could delay, derail or affect this project.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0, minWidth: 180 }} placeholder="Describe a risk..." value={newRisk} onChange={e => setNewRisk(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRisk()} />
          <select style={{ ...s.input, marginBottom: 0, width: 120 }} value={newLevel} onChange={e => setNewLevel(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button style={{ padding: '11px 20px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={addRisk}>Add</button>
        </div>

        {risks.length === 0 && <p style={s.emptyText}>No risks added yet.</p>}
        {risks.map((r, i) => {
          const lc = levelColors[r.level] || levelColors.medium;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: r.status === 'mitigated' ? GREY : WH, borderRadius: 10, border: `1px solid ${RULE}`, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: lc.bg, color: lc.color, flexShrink: 0 }}>{lc.label}</span>
              <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: r.status === 'mitigated' ? '#9CA3AF' : BL, textDecoration: r.status === 'mitigated' ? 'line-through' : 'none', minWidth: 100 }}>{r.title}</p>
              <button style={s.smallBtn} onClick={() => toggleRisk(i)}>{r.status === 'mitigated' ? 'Reopen' : 'Mark Handled'}</button>
              <button style={{ ...s.miniBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteRisk(i)}>✕</button>
            </div>
          );
        })}
      </div>

      {/* Compliance */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>Rules and Compliance</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Legal, regulatory or internal rules this project must follow.</p>

        {data.compliance?.flags?.length > 0 && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>PM Buddy flagged these for your industry</p>
            {data.compliance.flags.map((f, i) => <p key={i} style={{ fontSize: 13, color: '#92400E', lineHeight: 1.7 }}>· {f}</p>)}
          </div>
        )}

        <p style={{ fontSize: 13, fontWeight: 700, color: BL, marginBottom: 8 }}>Internal rules</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. All outputs must be approved by the director" value={newInternal} onChange={e => setNewInternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('internal', newInternal, setNewInternal)} />
          <button style={{ padding: '11px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => addCompliance('internal', newInternal, setNewInternal)}>Add</button>
        </div>
        {(compliance.internal || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: BL }}>{item}</span>
            <button style={s.removeBtn} onClick={() => removeCompliance('internal', i)}>✕</button>
          </div>
        ))}

        <p style={{ fontSize: 13, fontWeight: 700, color: BL, marginBottom: 8, marginTop: 16 }}>External regulations</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. Must comply with NDPR data protection" value={newExternal} onChange={e => setNewExternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('external', newExternal, setNewExternal)} />
          <button style={{ padding: '11px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => addCompliance('external', newExternal, setNewExternal)}>Add</button>
        </div>
        {(compliance.external || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: BL }}>{item}</span>
            <button style={s.removeBtn} onClick={() => removeCompliance('external', i)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PEOPLE TAB ───────────────────────────────────────────────

function PeopleTab({ data, onSave, project, acceptedMembers }) {
  const planning = data.planning || {};
  const [commsDraft, setCommsDraft] = useState(planning.communications || '');
  const [editingComms, setEditingComms] = useState(false);

  return (
    <div>
      {/* Team */}
      <div style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>Your Team</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Manage who is working on this project and invite new members.</p>
        <TeamTab project={data} currentUser={project._currentUser} onSave={onSave} />
      </div>

      {/* Stakeholders */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>People With an Interest</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Anyone outside the team who cares about this project — funders, leadership, beneficiaries.</p>
        <StakeholdersList data={data} onSave={onSave} />
      </div>

      {/* How we communicate */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 2 }}>How we share updates</h3>
            <p style={{ fontSize: 13, color: '#6B7280' }}>Who gets updates, how often, and through what channel.</p>
          </div>
          {!editingComms && <button style={s.smallBtn} onClick={() => setEditingComms(true)}>Edit</button>}
          {editingComms && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ ...s.smallBtn, background: BLUE, color: WH, borderColor: BLUE }} onClick={() => { onSave({ planning: { ...planning, communications: commsDraft } }); setEditingComms(false); }}>Save</button>
              <button style={s.smallBtn} onClick={() => setEditingComms(false)}>Cancel</button>
            </div>
          )}
        </div>
        {!editingComms && <p style={{ fontSize: 14, color: planning.communications ? BL : '#9CA3AF', lineHeight: 1.7 }}>{planning.communications || 'Nothing set yet. Click Edit to add how the team stays in touch.'}</p>}
        {editingComms && <textarea style={s.textarea} rows={4} placeholder="e.g. Weekly WhatsApp updates every Monday. Monthly report to funder. Daily standup at 9am via Zoom." value={commsDraft} onChange={e => setCommsDraft(e.target.value)} />}
      </div>

      {/* Reminders */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>Reminders</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Set reminders for important dates and checkpoints.</p>
        <RemindersPanel project={data} onUpdate={(updated) => { onSave({}); }} />
      </div>
    </div>
  );
}

function StakeholdersList({ data, onSave }) {
  const stakeholders = data.stakeholders || [];
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [influence, setInfluence] = useState('medium');
  const [comms, setComms] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const add = () => {
    if (!name.trim()) return;
    onSave({ stakeholders: [...stakeholders, { name, role, influence, comms }] });
    setName(''); setRole(''); setComms(''); setShowAdd(false);
  };

  const remove = (i) => onSave({ stakeholders: stakeholders.filter((_, idx) => idx !== i) });
  const ic = { high: { bg: '#FEF2F2', color: '#DC2626' }, medium: { bg: '#FFFBEB', color: '#D97706' }, low: { bg: '#F0FDF4', color: '#15803D' } };

  return (
    <div>
      {showAdd && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Name or group" value={name} onChange={e => setName(e.target.value)} />
            <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="Their role or interest" value={role} onChange={e => setRole(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <select style={{ ...s.input, flex: 1, marginBottom: 0 }} value={influence} onChange={e => setInfluence(e.target.value)}>
              <option value="high">High influence</option>
              <option value="medium">Medium influence</option>
              <option value="low">Low influence</option>
            </select>
            <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="How to communicate with them" value={comms} onChange={e => setComms(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 16px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={add}>Add</button>
            <button style={s.smallBtn} onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
      {!showAdd && <button style={{ ...s.smallBtn, marginBottom: 12 }} onClick={() => setShowAdd(true)}>+ Add person or group</button>}
      {stakeholders.length === 0 && !showAdd && <p style={s.emptyText}>No stakeholders added yet.</p>}
      {stakeholders.map((st, i) => {
        const c = ic[st.influence] || ic.medium;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: GREY, borderRadius: 10, border: `1px solid ${RULE}`, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: BLUE, color: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{(st.name[0] || '?').toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: BL }}>{st.name}</p>
              <p style={{ fontSize: 12, color: '#6B7280' }}>{st.role}{st.comms ? ` · ${st.comms}` : ''}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: c.bg, color: c.color }}>{st.influence}</span>
            <button style={s.removeBtn} onClick={() => remove(i)}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────

function DocumentsTab({ data, onSave, project }) {
  const [section, setSection] = useState('reports');
  const [reportType, setReportType] = useState('progress');
  const [generating, setGenerating] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [savedDocs, setSavedDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [docGenerating, setDocGenerating] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [docPreviewType, setDocPreviewType] = useState(null);
  const [aiReport, setAiReport] = useState(data.ai_health_check || null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState(null);
  const [showProgressMap, setShowProgressMap] = useState(false);
  const [progressMap, setProgressMap] = useState(null);
  const [generatingMap, setGeneratingMap] = useState(false);

  const SECTIONS = [
    { id: 'reports', label: 'Reports' },
    { id: 'health', label: 'Health Check' },
    { id: 'pm_plan', label: 'PM Plan' },
    { id: 'history', label: 'History' },
    { id: 'saved', label: 'Saved Docs' },
  ];

  const milestones = data.milestones || [];
  const risks = data.risks || [];
  const doneMilestones = milestones.filter(m => m.status === 'done');
  const pendingMilestones = milestones.filter(m => m.status !== 'done');
  const openRisks = risks.filter(r => r.status === 'open');

  const fetchDocs = async () => {
    setLoadingDocs(true);
    const { data: docs } = await supabase.from('documents').select('*').eq('project_id', project.id).order('updated_at', { ascending: false });
    setSavedDocs(docs || []);
    setLoadingDocs(false);
  };

  useEffect(() => { fetchDocs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const projectContext = `Project: ${data.name}\nIndustry: ${data.industry || 'Not specified'}\nGoal: ${data.scope?.goal || 'Not specified'}\nStart: ${data.timeline?.start ? formatDate(data.timeline.start) : 'Not set'}\nEnd: ${data.timeline?.end ? formatDate(data.timeline.end) : 'Not set'}\nTeam: ${(data.team || []).map(m => `${m.name} (${m.role})`).join(', ') || 'Not specified'}\nMilestones done: ${doneMilestones.map(m => m.title).join(', ') || 'None'}\nMilestones pending: ${pendingMilestones.map(m => m.title).join(', ') || 'None'}\nOpen risks: ${openRisks.map(r => `${r.title} (${r.level})`).join(', ') || 'None'}\nCurrent phase: ${data.scope?.currentPhase || 'Not specified'}\nDone so far: ${data.scope?.completedWork || 'Not specified'}\nRemaining: ${data.scope?.remainingWork || 'Not specified'}`;

  const saveDoc = async (html, title, type) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase.from('documents').insert({ user_id: sessionData.session.user.id, project_id: project.id, project_name: data.name, type: type || 'report', title, content: html });
        fetchDocs();
      }
    } catch (err) { console.error(err); }
  };

  const generateReport = async () => {
    setGenerating(true);
    setReportContent('');
    const prompts = {
      progress: `You are a professional project manager writing a progress report. Write a clear HTML report.\n\n${projectContext}${additionalContext ? '\nAdditional context: ' + additionalContext : ''}\n\nSections: Executive Summary, Progress Against Objectives, Milestones Achieved, Milestones Remaining, Risks and Issues, Next Steps.\n\nUse h1 for title, h2 for sections, p for paragraphs. No html/head/body tags.`,
      donor: `You are writing a funder report. Write a formal HTML report.\n\n${projectContext}${additionalContext ? '\nAdditional context: ' + additionalContext : ''}\n\nSections: Report Title and Period, Project Overview, Activities and Outputs, Outcomes and Results, Challenges and How They Were Addressed, Financial Summary, Upcoming Activities, Conclusion.\n\nUse h1 for title, h2 for sections, p for paragraphs. No html/head/body tags.`,
    };
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ prompt: prompts[reportType], mode: 'document' }) });
      const result = await res.json();
      const html = (result.result || '').replace(/```html|```/g, '').trim();
      if (html && html.length > 100) {
        setReportContent(html);
        const label = reportType === 'progress' ? 'Progress Update' : 'Funder Report';
        await saveDoc(html, `${data.name} — ${label} — ${new Date().toLocaleDateString('en-GB')}`, 'report');
      }
    } catch { setReportContent('<p>Could not generate. Please try again.</p>'); }
    setGenerating(false);
  };

  const generateDoc = async (type) => {
    setDocGenerating(type);
    setDocPreview(null);
    const formatD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
    const prompts = {
      pm: `Write a Project Management Plan in HTML. h2 for headings, p for paragraphs. No html/head/body tags.\n\nProject: ${data.name} | Industry: ${data.industry} | Goal: ${data.scope?.goal || 'Not set'}\nTimeline: ${formatD(data.timeline?.start)} to ${formatD(data.timeline?.end)}\nTeam: ${(data.team || []).map(m => `${m.name} (${m.role})`).join(', ') || 'Solo'}\nRisks: ${risks.map(r => `${r.title} (${r.level})`).join(', ') || 'None'}\nMilestones: ${milestones.map(m => `${m.title} due ${formatD(m.date)}`).join(', ')}\n\nSections: Executive Summary, Project Overview, Scope and Deliverables, Team and Responsibilities, Timeline and Milestones, Communication Plan, Risk Management, Definition of Done.`,
    };
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ prompt: prompts[type], mode: 'document' }) });
      const result = await res.json();
      const html = (result.result || '').replace(/```html|```/g, '').trim();
      if (html && html.length > 100) {
        setDocPreview(html);
        setDocPreviewType(type);
        await saveDoc(html, `${data.name} — Project Management Plan — ${new Date().toLocaleDateString('en-GB')}`, type);
      }
    } catch (err) { console.error(err); }
    setDocGenerating(null);
  };

  const runHealthCheck = async () => {
    setAiReportLoading(true);
    setAiReport(null);
    setAiReportError(null);
    const hasGoal = !!(data.scope?.goal?.trim().length > 20);
    const hasTimeline = !!(data.timeline?.start && data.timeline?.end);
    const hasMilestones = milestones.length >= 2;
    const hasRisks = risks.length >= 1;
    const hasTeam = (data.team || []).length > 0;
    const filledFields = [hasGoal, hasTimeline, hasMilestones, hasRisks, hasTeam].filter(Boolean).length;
    const baseScore = Math.round((filledFields / 5) * 100);
    const prompt = `You are PM Buddy doing an honest project health check. Be specific.\n\n${projectContext}\n\nBase score: ${baseScore}/100.\n\nRespond ONLY with JSON (no markdown):\n{"score":${baseScore},"verdict":"${baseScore >= 70 ? 'Looking good' : baseScore >= 45 ? 'Needs attention' : 'Needs work'}","strengths":[{"title":"strength","detail":"max 20 words"}],"gaps":[{"title":"gap","why":"why it matters max 15 words","howToFix":"concrete step max 15 words"}],"recommendation":"one specific sentence referencing ${data.name}"}`;
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ prompt }) });
      if (!res.ok) { setAiReportError('Could not run health check. Please try again.'); setAiReportLoading(false); return; }
      const result = await res.json();
      if (result.result) {
        const clean = result.result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean.substring(clean.indexOf('{'), clean.lastIndexOf('}') + 1));
        setAiReport(parsed);
        await supabase.from('pm_projects').update({ ai_health_check: parsed }).eq('id', data.id);
      }
    } catch { setAiReportError('Something went wrong. Please try again.'); }
    setAiReportLoading(false);
  };
  const generateProgressMap = async () => {
    setGeneratingMap(true);
    setProgressMap(null);
    const prompt = `You are PM Buddy. Write a plain-English progress summary in 3-4 paragraphs: where the project started, what has been achieved, what to focus on next, and one honest observation about what could go wrong. Be specific, warm but direct. No bullet points.\n\n${projectContext}\nHistory entries: ${data.history?.length || 0}`;
    try {
      const result = await callGemini(prompt);
      setProgressMap(result.result || 'Could not generate. Try again.');
      setShowProgressMap(true);
    } catch { setProgressMap('Could not generate. Try again.'); setShowProgressMap(true); }
    setGeneratingMap(false);
  };

  const buildHTML = (html, title) => `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 40px;color:#1a1a1a;line-height:1.7;}h1{font-size:24px;}h2{font-size:16px;color:#0284C7;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin-top:28px;}p{font-size:14px;margin-bottom:12px;}@media print{body{margin:0;padding:20px;}}</style></head><body>${html}<p style="margin-top:40px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:16px;">Generated by PM Buddy · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></body></html>`;
  const downloadPDF = (html, title) => { const w = window.open('', '_blank'); w.document.write(buildHTML(html, title)); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); };
  const downloadWord = (html, title) => { const blob = new Blob([buildHTML(html, title)], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${title.replace(/\s+/g, '_')}.doc`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const deleteDoc = async (id) => { await supabase.from('documents').delete().eq('id', id); fetchDocs(); };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECTIONS.map(sec => (
          <button key={sec.id} style={{ padding: '7px 14px', background: section === sec.id ? BL : WH, color: section === sec.id ? WH : '#374151', border: `1px solid ${section === sec.id ? BL : RULE}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setSection(sec.id)}>{sec.label}</button>
        ))}
      </div>

      {section === 'reports' && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {[{ id: 'progress', label: 'Progress Update', desc: 'What has been achieved and what comes next.' }, { id: 'donor', label: 'Funder or Grant Report', desc: 'Results against funded objectives. For donors or sponsors.' }].map(rt => (
              <button key={rt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: reportType === rt.id ? '#EFF6FF' : WH, border: `1.5px solid ${reportType === rt.id ? BLUE : RULE}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }} onClick={() => { setReportType(rt.id); setReportContent(''); }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: reportType === rt.id ? BLUE : '#D1D5DB', flexShrink: 0, marginTop: 5 }} />
                <div><p style={{ fontSize: 14, fontWeight: 700, color: reportType === rt.id ? BLUE : BL, marginBottom: 2 }}>{rt.label}</p><p style={{ fontSize: 13, color: '#6B7280' }}>{rt.desc}</p></div>
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Extra context (optional)</label>
            <textarea style={{ ...s.textarea, minHeight: 60 }} rows={2} placeholder="e.g. Reporting period April to June." value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} />
          </div>
          <button style={{ padding: '12px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: generating ? 0.6 : 1 }} onClick={generateReport} disabled={generating}>{generating ? 'Generating...' : '✦ Generate Report'}</button>
          {reportContent && !generating && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button style={{ padding: '8px 16px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadWord(reportContent, `${data.name} Report`)}>⬇ Word</button>
                <button style={{ padding: '8px 16px', background: BL, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadPDF(reportContent, `${data.name} Report`)}>⬇ PDF</button>
              </div>
              <div style={{ background: WH, border: `1px solid ${RULE}`, borderRadius: 12, padding: '28px 32px', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: '55vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: reportContent }} />
            </div>
          )}
        </div>
      )}

      {section === 'health' && (
        <div>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, marginBottom: 16 }}>PM Buddy reads your project data and gives you an honest score.</p>
          <button style={{ padding: '10px 20px', background: BL, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }} onClick={runHealthCheck} disabled={aiReportLoading}>{aiReportLoading ? 'Checking...' : aiReport ? 'Run Again' : 'Run Health Check'}</button>
          {aiReportError && <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, marginBottom: 16 }}><p style={{ fontSize: 13, color: '#DC2626' }}>{aiReportError}</p></div>}
          {aiReport && !aiReportLoading && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 52, fontWeight: 900, color: aiReport.score >= 70 ? '#15803D' : aiReport.score >= 45 ? BLUE : '#DC2626', letterSpacing: '-2px' }}>{aiReport.score}</span>
                <div><p style={{ fontSize: 13, color: '#9CA3AF' }}>/100</p><span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: aiReport.score >= 70 ? '#F0FDF4' : aiReport.score >= 45 ? '#FFFBEB' : '#FEF2F2', color: aiReport.score >= 70 ? '#15803D' : aiReport.score >= 45 ? '#D97706' : '#DC2626' }}>{aiReport.verdict}</span></div>
              </div>
              {aiReport.strengths?.length > 0 && <div style={{ marginBottom: 16 }}><p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 10 }}>What is working</p>{aiReport.strengths.map((item, i) => <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${RULE}` }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#15803D', flexShrink: 0, marginTop: 6 }} /><div><p style={{ fontSize: 13, fontWeight: 600, color: BL, marginBottom: 2 }}>{item.title}</p>{item.detail && <p style={{ fontSize: 13, color: '#374151' }}>{item.detail}</p>}</div></div>)}</div>}
              {aiReport.gaps?.length > 0 && <div style={{ marginBottom: 16 }}><p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 10 }}>What needs attention</p>{aiReport.gaps.map((item, i) => <div key={i} style={{ marginBottom: 10, padding: '12px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}><p style={{ fontSize: 13, fontWeight: 600, color: BL, marginBottom: 4 }}>{item.title}</p>{item.why && <p style={{ fontSize: 13, color: '#92400E', marginBottom: 6 }}><strong>Why it matters:</strong> {item.why}</p>}{item.howToFix && <p style={{ fontSize: 13, color: '#374151' }}><strong>How to fix it:</strong> {item.howToFix}</p>}</div>)}</div>}
              {aiReport.recommendation && <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '12px 14px' }}><p style={{ fontSize: 11, fontWeight: 700, color: BLUE, marginBottom: 6 }}>TOP RECOMMENDATION</p><p style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.65 }}>{aiReport.recommendation}</p></div>}
            </div>
          )}
        </div>
      )}

      {section === 'pm_plan' && (
        <div>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.7, marginBottom: 16 }}>Full project management plan generated from your live project data.</p>
          <button style={{ padding: '12px 24px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: docGenerating === 'pm' ? 0.6 : 1, marginBottom: 16 }} onClick={() => generateDoc('pm')} disabled={!!docGenerating}>{docGenerating === 'pm' ? 'Writing...' : 'Generate PM Plan'}</button>
          {docPreview && docPreviewType === 'pm' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button style={{ padding: '8px 16px', background: WH, color: BLUE, border: `1.5px solid ${BLUE}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadWord(docPreview, `${data.name} PM Plan`)}>⬇ Word</button>
                <button style={{ padding: '8px 16px', background: BL, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadPDF(docPreview, `${data.name} PM Plan`)}>⬇ PDF</button>
              </div>
              <div style={{ background: WH, border: `1px solid ${RULE}`, borderRadius: 12, padding: '28px 32px', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: '55vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: docPreview }} />
            </div>
          )}
        </div>
      )}

      {section === 'history' && (
        <div>
          <div style={{ background: BL, borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div><p style={{ fontSize: 14, fontWeight: 700, color: WH, marginBottom: 2 }}>Progress Map</p><p style={{ fontSize: 13, color: '#6B7280' }}>PM Buddy reads your history and tells you where things stand.</p></div>
            <button style={{ padding: '9px 18px', background: BLUE, color: WH, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: generatingMap ? 0.6 : 1 }} onClick={generateProgressMap} disabled={generatingMap}>{generatingMap ? 'Generating...' : '✦ Generate'}</button>
          </div>
          {showProgressMap && progressMap && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{progressMap}</div>
              <button style={{ marginTop: 12, background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowProgressMap(false)}>Close</button>
            </div>
          )}
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Activity Log</p>
          {(data.history || []).length === 0 && <p style={s.emptyText}>No recorded history yet.</p>}
          {(data.history || []).slice().reverse().map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: BLUE, flexShrink: 0, fontWeight: 700 }}>
                {entry.type === 'goal_updated' ? '◈' : entry.type === 'milestone_done' ? '✓' : entry.type === 'risk_added' ? '⚠' : '·'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: BL }}>{entry.label}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</p>
                </div>
                {entry.detail && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{entry.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'saved' && (
        <div>
          {loadingDocs && <p style={s.emptyText}>Loading...</p>}
          {!loadingDocs && savedDocs.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0' }}><p style={{ fontSize: 15, fontWeight: 600, color: BL, marginBottom: 6 }}>No saved documents yet</p><p style={{ fontSize: 13, color: '#9CA3AF' }}>Generate a report or PM Plan and it will appear here.</p></div>}
          {!loadingDocs && savedDocs.map(doc => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: '#EFF6FF', color: BLUE, display: 'inline-block', marginBottom: 3 }}>{doc.type === 'report' ? 'Report' : doc.type === 'pm' ? 'PM Plan' : 'Doc'}</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: BL, marginBottom: 1 }}>{doc.title}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.smallBtn} onClick={() => setViewingDoc(doc)}>Open</button>
                <button style={s.smallBtn} onClick={() => downloadWord(doc.content, doc.title)}>Word</button>
                <button style={{ ...s.smallBtn, background: BL, color: WH, borderColor: BL }} onClick={() => downloadPDF(doc.content, doc.title)}>PDF</button>
                <button style={{ ...s.smallBtn, color: '#DC2626', borderColor: '#FECACA' }} onClick={() => deleteDoc(doc.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: WH, borderRadius: 16, width: '100%', maxWidth: 800, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${RULE}` }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: BL }}>{viewingDoc.title}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ padding: '7px 14px', background: WH, color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadWord(viewingDoc.content, viewingDoc.title)}>⬇ Word</button>
                <button style={{ padding: '7px 14px', background: BL, color: WH, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadPDF(viewingDoc.content, viewingDoc.title)}>⬇ PDF</button>
                <button style={{ padding: '7px 14px', background: WH, color: '#6B7280', border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setViewingDoc(null)}>Close</button>
              </div>
            </div>
            <div style={{ padding: '28px 36px', fontSize: 14, lineHeight: 1.8, color: '#374151', fontFamily: 'Georgia, serif', maxHeight: '70vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: viewingDoc.content }} />
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: GREY, padding: '32px 24px 80px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 900, margin: '0 auto' },
  header: { marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: '#6B7280', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 12, display: 'block' },
  title: { fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: BL, letterSpacing: '-0.8px', marginBottom: 8 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  industryBadge: { fontSize: 11, fontWeight: 700, background: '#EFF6FF', color: BLUE, padding: '3px 10px', borderRadius: 100 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  tabBar: { display: 'flex', borderBottom: `1.5px solid ${RULE}`, marginBottom: 20, overflowX: 'auto' },
  tabBtn: { padding: '10px 18px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  content: { background: WH, borderRadius: 20, padding: '28px', border: `1px solid ${RULE}` },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 },
  statCard: { background: GREY, borderRadius: 12, padding: '14px', border: `1px solid ${RULE}`, textAlign: 'center' },
  statLabel: { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  statNum: { fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 2 },
  statSub: { fontSize: 11, color: '#9CA3AF' },
  card: { background: GREY, borderRadius: 12, padding: '16px', border: `1px solid ${RULE}` },
  cardLabel: { fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 },
  input: { width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  textarea: { width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', marginBottom: 0, boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  smallBtn: { padding: '5px 12px', background: WH, color: '#374151', border: `1px solid ${RULE}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  miniBtn: { padding: '3px 8px', background: WH, color: '#6B7280', border: `1px solid ${RULE}`, borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  removeBtn: { background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', flexShrink: 0 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' },
};
