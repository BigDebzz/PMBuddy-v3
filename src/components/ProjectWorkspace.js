import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import RemindersPanel from './RemindersPanel';
import TeamTab from './TeamTab';
import PMBuddyAssistant from './PMBuddyAssistant';
import AiLoading from './AiLoading';
import ProgressOverview from './ProgressOverview';
import Icon from './Icon';
import ReportBuilder from './ReportBuilder';
import DocView from './DocView';
import { downloadWord, downloadPDF } from '../lib/docExport';

const BLUE = 'var(--accent)';
const BL = 'var(--text)';
const WH = 'var(--surface)';
const GREY = 'var(--surface-2)';
const RULE = 'var(--border)';

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

// Records the date a task or milestone is finished, and clears it if the item is reopened.
function stampCompletion(previous, next, sameItem) {
  if (!Array.isArray(next)) return next;
  const now = new Date().toISOString();
  return next.map((item, idx) => {
    const before = (previous || []).find((p, pi) => sameItem(p, item, pi, idx));
    if (item.status === 'done') {
      return !item.completedAt && (!before || before.status !== 'done') ? { ...item, completedAt: now } : item;
    }
    if (item.completedAt) { const copy = { ...item }; delete copy.completedAt; return copy; }
    return item;
  });
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
  const [showReport, setShowReport] = useState(false);
  const [docsVersion, setDocsVersion] = useState(0);
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
    const by = project._currentUser?.user_metadata?.first_name || project._currentUser?.email || 'You';
    setData(prev => {
      const stamped = { ...updates };
      if (updates.tasks) stamped.tasks = stampCompletion(prev.tasks, updates.tasks, (p, i) => p.id === i.id);
      if (updates.milestones) {
        const sameLength = (prev.milestones || []).length === updates.milestones.length;
        stamped.milestones = stampCompletion(prev.milestones, updates.milestones, sameLength ? (p, i, pi, idx) => pi === idx : (p, i) => p.title === i.title && p.date === i.date);
      }
      const currentHistory = prev.history || [];
      const newHistory = historyEntry
        ? [...currentHistory, { ...historyEntry, timestamp: new Date().toISOString(), by }]
        : currentHistory;
      const finalUpdates = historyEntry ? { ...stamped, history: newHistory } : stamped;
      const updated = { ...prev, ...finalUpdates, updated_at: new Date().toISOString() };
      setSaveStatus('unsaved');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        await supabase.from('pm_projects').update(finalUpdates).eq('id', project.id);
        setSaveStatus('saved');
        if (onUpdate) onUpdate(updated);
      }, 1500);
      return updated;
    });
  }, [project.id, onUpdate, project._currentUser]);

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button style={s.backBtn} onClick={onBack}><Icon name="arrow-left" size={15} style={{ marginRight: 6 }} />All Projects</button>
            <span style={{ fontSize: 13, color: saveStatus === 'saved' ? 'var(--ok-text)' : saveStatus === 'saving' ? 'var(--warn-text)' : 'var(--muted)' }}>
              {saveStatus === 'saved' ? <><Icon name="check" size={14} style={{ marginRight: 4 }} />Saved</> : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
            </span>
          </div>
          <h1 style={s.title}>{data.name}</h1>
          <div style={s.metaRow}>
            <span style={s.industryBadge}>{data.industry}</span>
            <span style={{ ...s.statusBadge, background: data.status === 'active' ? 'var(--ok-tint)' : 'var(--bad-tint)', color: data.status === 'active' ? 'var(--ok-text)' : 'var(--bad-text)' }}>
              {data.status === 'active' ? 'Active' : 'Completed'}
            </span>
            <button type="button" style={s.reportBtn} onClick={() => setShowReport(true)}><Icon name="file" size={16} style={{ marginRight: 8 }} />Create a report</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={s.tabBar}>
          {TABS.map(t => (
            <button key={t} style={{ ...s.tabBtn, color: tab === t ? 'var(--accent-text)' : 'var(--muted)', borderBottomColor: tab === t ? BLUE : 'transparent', fontWeight: tab === t ? 700 : 500 }} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        <div style={s.content}>
          {tab === 'Overview' && <OverviewTab data={data} onSave={save} acceptedMembers={acceptedMembers} />}
          {tab === 'Tasks' && <TasksTab data={data} onSave={save} />}
          {tab === 'Risks' && <RisksTab data={data} onSave={save} />}
          {tab === 'People' && <PeopleTab data={data} onSave={save} project={project} acceptedMembers={acceptedMembers} />}
          {tab === 'Documents' && <DocumentsTab data={data} history={data.history || []} onSave={save} project={project} onCreateReport={() => setShowReport(true)} docsVersion={docsVersion} />}
        </div>
      </div>
      {showReport && <ReportBuilder data={data} project={project} onClose={() => setShowReport(false)} onSaved={() => setDocsVersion(v => v + 1)} />}
      <PMBuddyAssistant project={data} />
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────

function OverviewTab({ data, onSave, acceptedMembers }) {
  const milestones = data.milestones || [];

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
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ prompt: `You are PM Buddy. Rewrite this as a clear measurable goal in plain English: "${goalDraft}"\n\nOne or two sentences starting with "This project will succeed when...". No jargon. Return ONLY the rewritten goal.` }) });
      const result = await res.json();
      if (result.result?.trim()) setGoalSuggestion(result.result.trim());
    } catch (err) { console.error(err); }
    setRefiningGoal(false);
  };

  return (
    <div>
      <ProgressOverview data={data} acceptedMembers={acceptedMembers} />

      {/* Goal */}
      <div style={{ ...s.card, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={s.cardLabel}>What success looks like</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {!editingGoal && <button style={s.smallBtn} onClick={() => { setEditingGoal(true); setGoalDraft(data.scope?.goal || ''); }}>Edit</button>}
            {!editingGoal && <button style={{ ...s.smallBtn, color: 'var(--ok-text)', borderColor: 'var(--ok-border)', background: 'var(--ok-tint)' }} onClick={() => { setEditingGoal(true); setGoalDraft(data.scope?.goal || ''); setTimeout(refineGoal, 100); }}>AI Refine</button>}
            {editingGoal && <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE }} onClick={saveGoal}>Save</button>}
            {editingGoal && <button style={s.smallBtn} onClick={() => { setEditingGoal(false); setGoalSuggestion(''); }}>Cancel</button>}
          </div>
        </div>
        {!editingGoal && <p style={{ fontSize: 15, color: BL, lineHeight: 1.7 }}>{data.scope?.goal || 'No goal set yet. Click Edit to add one.'}</p>}
        {editingGoal && <textarea style={s.textarea} rows={3} value={goalDraft} onChange={e => setGoalDraft(e.target.value)} />}
        {editingGoal && goalDraft.length > 20 && !goalSuggestion && <button style={{ ...s.smallBtn, color: 'var(--ok-text)', borderColor: 'var(--ok-border)', background: 'var(--ok-tint)', marginTop: 8 }} onClick={refineGoal} disabled={refiningGoal}>{refiningGoal ? 'Refining...' : 'AI Refine'}</button>}
        {goalSuggestion && (
          <div style={{ background: 'var(--ok-tint)', border: '1px solid var(--ok-border)', borderRadius: 10, padding: '12px', marginTop: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ok-text)', marginBottom: 6 }}>PM BUDDY SUGGESTION</p>
            <p style={{ fontSize: 15, color: 'var(--ok-text)', lineHeight: 1.7, marginBottom: 10 }}>{goalSuggestion}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...s.smallBtn, background: 'var(--ok)', color: '#FFFFFF', borderColor: 'var(--ok)' }} onClick={() => { setGoalDraft(goalSuggestion); setGoalSuggestion(''); }}>Use this</button>
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
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${m.status === 'done' ? BLUE : m.status === 'in_progress' ? 'var(--warn)' : 'var(--border-strong)'}`, background: m.status === 'done' ? BLUE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.status === 'done' && <Icon name="check" size={12} strokeWidth={3.4} style={{ color: '#FFFFFF' }} />}
            </div>
            <p style={{ flex: 1, fontSize: 15, color: m.status === 'done' ? 'var(--muted)' : BL, textDecoration: m.status === 'done' ? 'line-through' : 'none' }}>{m.title}</p>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{m.date ? formatDate(m.date) : ''}</span>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: m.status === 'done' ? 'var(--ok-tint)' : m.status === 'in_progress' ? 'var(--warn-tint)' : 'var(--accent-tint)', color: m.status === 'done' ? 'var(--ok-text)' : m.status === 'in_progress' ? 'var(--warn-text)' : 'var(--accent-text)' }}>
              {m.status === 'done' ? 'Done' : m.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
          </div>
        ))}
        {milestones.length > 5 && <p style={{ fontSize: 13, color: 'var(--accent-text)', marginTop: 8, cursor: 'pointer' }}>+ {milestones.length - 5} more — see Tasks tab</p>}
      </div>

      {/* Compliance heads up */}
      {data.compliance?.flags?.length > 0 && (
        <div style={{ background: 'var(--warn-tint)', border: '1px solid var(--warn-border)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--warn-text)', marginBottom: 8 }}>Things to keep in mind</p>
          {data.compliance.flags.map((f, i) => <p key={i} style={{ fontSize: 14, color: 'var(--warn-text)', lineHeight: 1.7 }}>· {f}</p>)}
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
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ prompt }) });
      const result = await res.json();
      setAiReview(result.result || 'Could not get feedback right now.');
    } catch { setAiReview('Could not get feedback right now.'); }
    setReviewing(false);
  };

  const hasContent = scope.currentPhase || scope.completedWork || scope.remainingWork || scope.blockers;

  return (
    <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasContent || editing ? 12 : 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', }}>Current Status</p>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editing && <button style={s.smallBtn} onClick={() => setEditing(true)}>Edit</button>}
          {!editing && hasContent && <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE }} onClick={getAiReview} disabled={reviewing}>{reviewing ? 'Reviewing...' : 'AI Review'}</button>}
          {editing && <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE }} onClick={saveStatus}>Save</button>}
          {editing && <button style={s.smallBtn} onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      </div>
      {reviewing && <AiLoading compact kind="think" />}
      {!editing && !hasContent && <p style={{ fontSize: 14, color: 'var(--muted)' }}>No status yet. Click Edit to add where things stand.</p>}
      {!editing && hasContent && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[{ label: 'Phase', value: scope.currentPhase }, { label: 'Done so far', value: scope.completedWork }, { label: 'Still to do', value: scope.remainingWork }, { label: 'Blockers', value: scope.blockers }].map(({ label, value }) => value ? (
            <div key={label}><p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 2 }}>{label}</p><p style={{ fontSize: 15, color: BL, lineHeight: 1.6 }}>{value}</p></div>
          ) : null)}
        </div>
      )}
      {editing && (
        <div>
          {[{ key: 'currentPhase', label: 'What phase is it in?', placeholder: 'e.g. Planning, Building, Testing' }, { key: 'completedWork', label: 'What has been done?', placeholder: 'What is finished so far?' }, { key: 'remainingWork', label: 'What is left to do?', placeholder: 'What still needs to happen?' }, { key: 'blockers', label: 'Any blockers?', placeholder: 'What is slowing things down?' }].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 4 }}>{label}</label>
              <textarea style={{ ...s.textarea, minHeight: 50 }} rows={2} placeholder={placeholder} value={draft[key]} onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}
      {aiReview && <div style={{ marginTop: 12, background: WH, borderRadius: 10, padding: '12px', border: '1px solid var(--accent-border)' }}><p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 6 }}>PM BUDDY'S TAKE</p><p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.7 }}>{aiReview}</p></div>}
    </div>
  );
}

function AIInsights({ data, onSave }) {
  const insights = data.insights || {};
  const projectContext = `Project: ${data.name}\nIndustry: ${data.industry}\nGoal: ${data.scope?.goal || 'Not specified'}\nTeam: ${(data.team || []).map(m => `${m.name} (${m.role})`).join(', ') || 'Solo'}\nMilestones: ${(data.milestones || []).map(m => `${m.title} (${m.status})`).join(', ') || 'None'}\nRisks: ${(data.risks || []).map(r => r.title).join(', ') || 'None'}`;

  const defs = [
    { key: 'definition_of_done', title: 'How we know it is finished', icon: 'check', prompt: `Write 4-6 checkable statements, one per line, that define done for this project. Do not use bullets, dashes or symbols. Plain English. No jargon.\n\n${projectContext}` },
    { key: 'business_benefit', title: 'Why this matters', icon: 'flag', prompt: `Write 3-5 sentences about the value this project delivers. Who benefits, what changes, what the outcome is. Plain language.\n\n${projectContext}` },
    { key: 'roadmap', title: 'Simple roadmap', icon: 'arrow-right', prompt: `Write a simple roadmap in plain English. Organise into phases with what happens in each. No jargon.\n\n${projectContext}` },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 12 }}>PM Buddy Insights</p>
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
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify({ prompt: generatePrompt }) });
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
          <span style={{ fontSize: 15, color: 'var(--accent-text)' }}><Icon name={icon} size={16} /></span>
          <p style={{ fontSize: 14, fontWeight: 700, color: BL }}>{title}</p>
          {content && <span style={{ fontSize: 12, fontWeight: 600, color: edited ? 'var(--warn-text)' : 'var(--accent-text)', background: edited ? 'var(--warn-tint)' : 'var(--accent-tint)', padding: '1px 6px', borderRadius: 100 }}>{edited ? 'Edited' : 'AI'}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {content && !editing && <button style={s.smallBtn} onClick={() => { setDraft(content); setEditing(true); }}>Edit</button>}
          {editing && <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE }} onClick={() => { setContent(draft); setEdited(true); onSave(draft, true); setEditing(false); }}>Save</button>}
          {editing && <button style={s.smallBtn} onClick={() => setEditing(false)}>Cancel</button>}
          {!editing && <button style={{ ...s.smallBtn, background: content ? GREY : BLUE, color: content ? 'var(--text-2)' : '#FFFFFF', borderColor: content ? RULE : BLUE }} onClick={generate} disabled={generating}>{generating ? 'Generating...' : content ? 'Regenerate' : 'Generate'}</button>}
        </div>
      </div>
      {!content && !generating && <p style={{ fontSize: 14, color: 'var(--muted)' }}>Click Generate and PM Buddy will fill this in from your project details.</p>}
      {generating && <AiLoading compact kind="write" />}
      {content && !editing && <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{content}</div>}
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
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [editingTaskIdx, setEditingTaskIdx] = useState(null);
  const [editTaskDraft, setEditTaskDraft] = useState({});
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' });
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState(null);
  const [editMilestoneDraft, setEditMilestoneDraft] = useState({});
  const [activeView, setActiveView] = useState('kanban'); // 'kanban' | 'list'

  const COLUMNS = [
    { id: 'todo', label: 'To Do', color: 'var(--muted)', bg: GREY },
    { id: 'in_progress', label: 'In Progress', color: 'var(--warn-text)', bg: 'var(--warn-tint)' },
    { id: 'done', label: 'Done', color: 'var(--ok-text)', bg: 'var(--ok-tint)' },
  ];

  // Milestones appear on the board as cards — status maps to column
  const milestoneStatusToColumn = { pending: 'todo', in_progress: 'in_progress', done: 'done' };
  const milestonesAsCards = milestones.map((m, i) => ({
    ...m,
    id: `milestone-${i}`,
    isMilestone: true,
    milestoneIdx: i,
    status: milestoneStatusToColumn[m.status] || 'todo',
  }));

  // Combined board items: milestone cards + tasks
  const allBoardItems = [...milestonesAsCards, ...tasks];

  const addTask = () => {
    if (!newTask.title.trim()) return;
    const task = { id: Date.now().toString(), title: newTask.title.trim(), assignee: newTask.assignee.trim(), dueDate: newTask.dueDate, status: 'todo', milestoneId: newTask.milestoneId, notes: '', isBlocker: false, createdAt: new Date().toISOString() };
    onSave({ tasks: [...tasks, task] }, { type: 'task_added', label: 'Task added', detail: `${newTask.title.trim()}${newTask.assignee.trim() ? ' (assigned to ' + newTask.assignee.trim() + ')' : ''}` });
    setNewTask({ title: '', assignee: '', dueDate: '', milestoneId: '' });
    setShowAddTask(false);
  };

  const moveTask = (taskId, newStatus) => {
    const task = tasks.find(t => t.id === taskId);
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    const statusLabels = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
    const historyEntry = {
      type: 'task_moved',
      label: `Task moved to ${statusLabels[newStatus] || newStatus}`,
      detail: task?.title || '',
    };
    onSave({ tasks: updated }, historyEntry);
    if (newStatus === 'done') notify('task_done', data, { task: task?.title });
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
          <p style={{ fontSize: 14, color: 'var(--muted)' }}>Move tasks between columns as work progresses.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...s.smallBtn, background: activeView === 'kanban' ? 'var(--color-primary)' : WH, color: activeView === 'kanban' ? '#FFFFFF' : 'var(--text-2)', borderColor: activeView === 'kanban' ? 'var(--color-primary)' : RULE }} onClick={() => setActiveView('kanban')}>Board</button>
          <button style={{ ...s.smallBtn, background: activeView === 'list' ? 'var(--color-primary)' : WH, color: activeView === 'list' ? '#FFFFFF' : 'var(--text-2)', borderColor: activeView === 'list' ? 'var(--color-primary)' : RULE }} onClick={() => setActiveView('list')}>List</button>
          <button style={{ padding: '7px 14px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowAddTask(p => !p)}>+ Add Task</button>
        </div>
      </div>

      {/* Add task form */}
      {showAddTask && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: BL, marginBottom: 12 }}>New Task</p>
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
            <button style={{ padding: '8px 20px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={addTask}>Add Task</button>
            <button style={s.smallBtn} onClick={() => setShowAddTask(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {activeView === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {COLUMNS.map(col => {
            const colTasks = allBoardItems.filter(t => t.status === col.id);
            return (
              <div key={col.id} style={{ background: col.bg, borderRadius: 16, padding: 12, border: `1px solid ${RULE}`, minHeight: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: col.color, }}>{col.label}</p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: col.color, background: WH, padding: '1px 7px', borderRadius: 100, border: `1px solid ${RULE}` }}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>No tasks here</p>}
                {colTasks.map(task => {
                  const overdue = task.status !== 'done' && isOverdue(task.dueDate || task.date);

                  // MILESTONE CARD
                  if (task.isMilestone) {
                    const mi = task.milestoneIdx;
                    const m = milestones[mi];
                    if (!m) return null;
                    return (
                      <div key={task.id} style={{ background: 'var(--accent-tint)', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: `1px solid ${overdue ? 'var(--bad-border)' : 'var(--accent-border)'}`, boxShadow: '0 1px 3px rgba(43,42,40,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-text)', background: 'var(--accent-tint)', padding: '1px 6px', borderRadius: 100 }}>Milestone</span>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: BL, marginBottom: 4, lineHeight: 1.4 }}>{m.title}</p>
                        {m.date && <p style={{ fontSize: 12, color: overdue ? 'var(--bad-text)' : 'var(--muted)', fontWeight: overdue ? 700 : 400 }}>{overdue ? <><Icon name="alert" size={12} style={{ marginRight: 4 }} />Overdue · </> : ''}{formatDate(m.date)}</p>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {m.status !== 'pending' && <button style={s.miniBtn} onClick={() => { const updated = milestones.map((ml, idx) => idx === mi ? { ...ml, status: 'pending' } : ml); onSave({ milestones: updated }); }}><Icon name="arrow-left" size={15} style={{ marginRight: 6 }} />To Do</button>}
                          {m.status !== 'in_progress' && <button style={s.miniBtn} onClick={() => { const updated = milestones.map((ml, idx) => idx === mi ? { ...ml, status: 'in_progress' } : ml); onSave({ milestones: updated }); }}>In Progress</button>}
                          {m.status !== 'done' && <button style={{ ...s.miniBtn, background: 'var(--ok-tint)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)' }} onClick={() => { const updated = milestones.map((ml, idx) => idx === mi ? { ...ml, status: 'done' } : ml); onSave({ milestones: updated }); if (m.status !== 'done') notify('milestone_done', data, { milestone: m.title }); }}><Icon name="check" size={15} style={{ marginRight: 6 }} />Done</button>}
                        </div>
                      </div>
                    );
                  }

                  // TASK CARD
                  const taskIdx = tasks.findIndex(t => t.id === task.id);
                  const isExpanded = expandedTaskId === task.id;
                  if (editingTaskIdx === taskIdx) {
                    return (
                      <div key={task.id} style={{ background: WH, borderRadius: 10, padding: 10, marginBottom: 8, border: `1px solid ${BLUE}` }}>
                        <input style={{ ...s.input, marginBottom: 6, fontSize: 14 }} value={editTaskDraft.title || ''} onChange={e => setEditTaskDraft(p => ({ ...p, title: e.target.value }))} />
                        <input style={{ ...s.input, marginBottom: 6, fontSize: 13 }} placeholder="Who is doing this?" value={editTaskDraft.assignee || ''} onChange={e => setEditTaskDraft(p => ({ ...p, assignee: e.target.value }))} />
                        <input style={{ ...s.input, marginBottom: 8, fontSize: 13 }} type="date" value={editTaskDraft.dueDate || ''} onChange={e => setEditTaskDraft(p => ({ ...p, dueDate: e.target.value }))} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE, fontSize: 12 }} onClick={saveTaskEdit}>Save</button>
                          <button style={{ ...s.smallBtn, fontSize: 12 }} onClick={() => setEditingTaskIdx(null)}>Cancel</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={task.id} style={{ background: WH, borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: `1px solid ${task.isBlocker ? 'var(--warn)' : overdue ? 'var(--bad-border)' : RULE}`, boxShadow: '0 1px 3px rgba(43,42,40,0.05)' }}>
                      {task.isBlocker && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, padding: '3px 8px', background: 'var(--warn-tint)', borderRadius: 8, width: 'fit-content' }}>
                          <Icon name="blocked" size={13} />
                          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--warn-text)', }}>Blocker</span>
                        </div>
                      )}
                      <p style={{ fontSize: 14, fontWeight: 600, color: BL, marginBottom: 4, lineHeight: 1.4 }}>{task.title}</p>
                      {task.assignee && <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}><Icon name="user" size={12} style={{ marginRight: 4 }} />{task.assignee}</p>}
                      {task.dueDate && <p style={{ fontSize: 12, color: overdue ? 'var(--bad-text)' : 'var(--muted)', fontWeight: overdue ? 700 : 400 }}>{overdue ? <><Icon name="alert" size={12} style={{ marginRight: 4 }} />Overdue · </> : ''}{formatDate(task.dueDate)}</p>}
                      {task.notes && !isExpanded && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><Icon name="file" size={12} style={{ marginRight: 4 }} />{task.notes}</p>}

                      {isExpanded && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${RULE}` }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>Notes / Updates</label>
                          <textarea
                            style={{ width: '100%', border: `1px solid ${RULE}`, borderRadius: 8, padding: '7px 9px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 60, boxSizing: 'border-box', outline: 'none', lineHeight: 1.6 }}
                            placeholder="Add a note, update, or describe the blocker..."
                            value={noteDraft}
                            onChange={e => setNoteDraft(e.target.value)}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
                              <input
                                type="checkbox"
                                checked={editTaskDraft.isBlocker !== undefined ? editTaskDraft.isBlocker : task.isBlocker || false}
                                onChange={e => setEditTaskDraft(p => ({ ...p, isBlocker: e.target.checked }))}
                                style={{ width: 14, height: 14, cursor: 'pointer' }}
                              />
                              <Icon name="blocked" size={13} style={{ marginRight: 6 }} />Mark as blocker
                            </label>
                            <button style={{ ...s.miniBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE, marginLeft: 'auto' }} onClick={() => {
                              const updatedTask = tasks[taskIdx];
                              const wasBlocker = updatedTask?.isBlocker || false;
                              const nowBlocker = editTaskDraft.isBlocker !== undefined ? editTaskDraft.isBlocker : wasBlocker;
                              const updated = tasks.map((t, idx) => idx === taskIdx ? { ...t, notes: noteDraft, isBlocker: nowBlocker } : t);
                              const noteHistory = {
                                type: nowBlocker && !wasBlocker ? 'task_blocked' : 'task_note',
                                label: nowBlocker && !wasBlocker ? 'Task flagged as blocker' : 'Note added to task',
                                detail: `${updatedTask?.title || ''}${noteDraft ? ': ' + noteDraft.substring(0, 60) : ''}`,
                              };
                              onSave({ tasks: updated }, noteHistory);
                              setExpandedTaskId(null);
                              setNoteDraft('');
                              setEditTaskDraft({});
                            }}>Save note</button>
                            <button style={s.miniBtn} onClick={() => { setExpandedTaskId(null); setNoteDraft(''); setEditTaskDraft({}); }}>Cancel</button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {col.id !== 'todo' && <button style={{ ...s.miniBtn }} onClick={() => moveTask(task.id, 'todo')}><Icon name="arrow-left" size={15} style={{ marginRight: 6 }} />To Do</button>}
                        {col.id !== 'in_progress' && <button style={{ ...s.miniBtn }} onClick={() => moveTask(task.id, 'in_progress')}>In Progress</button>}
                        {col.id !== 'done' && <button style={{ ...s.miniBtn, background: 'var(--ok-tint)', color: 'var(--ok-text)', borderColor: 'var(--ok-border)' }} onClick={() => moveTask(task.id, 'done')}><Icon name="check" size={15} style={{ marginRight: 6 }} />Done</button>}
                        <button style={s.miniBtn} onClick={() => { setEditingTaskIdx(taskIdx); setEditTaskDraft({ ...task }); }}>Edit</button>
                        <button style={{ ...s.miniBtn, color: 'var(--accent-text)', borderColor: 'var(--accent-border)', background: 'var(--accent-tint)' }} onClick={() => { setExpandedTaskId(isExpanded ? null : task.id); setNoteDraft(task.notes || ''); setEditTaskDraft({ isBlocker: task.isBlocker || false }); }}>
                          {isExpanded ? 'Close' : <><Icon name="file" size={12} style={{ marginRight: 4 }} />Notes</>}
                        </button>
                        <button style={{ ...s.miniBtn, color: 'var(--bad-text)', borderColor: 'var(--bad-border)' }} onClick={() => deleteTask(task.id)}><Icon name="x" size={14} /></button>
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
            const sc = { todo: { label: 'To Do', color: 'var(--muted)', bg: GREY }, in_progress: { label: 'In Progress', color: 'var(--warn-text)', bg: 'var(--warn-tint)' }, done: { label: 'Done', color: 'var(--ok-text)', bg: 'var(--ok-tint)' } };
            const status = sc[task.status] || sc.todo;
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: WH, borderRadius: 10, border: `1px solid ${overdue ? 'var(--bad-border)' : RULE}`, marginBottom: 8 }}>
                <button style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${task.status === 'done' ? 'var(--ok)' : 'var(--border-strong)'}`, background: task.status === 'done' ? 'var(--ok)' : WH, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => moveTask(task.id, task.status === 'done' ? 'todo' : 'done')}>
                  {task.status === 'done' && <Icon name="check" size={12} strokeWidth={3.4} style={{ color: '#FFFFFF' }} />}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: task.status === 'done' ? 'var(--muted)' : BL, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</p>
                  <p style={{ fontSize: 13, color: overdue ? 'var(--bad-text)' : 'var(--muted)' }}>{task.assignee ? `${task.assignee} · ` : ''}{task.dueDate ? <>{overdue ? <><Icon name="alert" size={12} style={{ marginRight: 4 }} />Overdue · </> : null}{formatDate(task.dueDate)}</> : ''}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>{status.label}</span>
                <button style={{ ...s.smallBtn, fontSize: 12 }} onClick={() => { setEditingTaskIdx(taskIdx); setEditTaskDraft({ ...task }); setActiveView('kanban'); }}>Edit</button>
                <button style={{ ...s.miniBtn, color: 'var(--bad-text)', borderColor: 'var(--bad-border)' }} onClick={() => deleteTask(task.id)}><Icon name="x" size={14} /></button>
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
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Key checkpoints that show the project is on track.</p>
          </div>
          <button style={{ padding: '7px 14px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowAddMilestone(p => !p)}>+ Add Milestone</button>
        </div>

        {showAddMilestone && (
          <div style={{ ...s.card, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input style={{ ...s.input, flex: 2, marginBottom: 0 }} placeholder="e.g. Launch beta, Complete training" value={newMilestone.title} onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addMilestone()} />
              <input style={{ ...s.input, flex: 1, marginBottom: 0 }} type="date" value={newMilestone.date} onChange={e => setNewMilestone(p => ({ ...p, date: e.target.value }))} />
              <button style={{ padding: '8px 16px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={addMilestone}>Add</button>
              <button style={s.smallBtn} onClick={() => setShowAddMilestone(false)}>Cancel</button>
            </div>
          </div>
        )}

        {milestones.length === 0 && <p style={s.emptyText}>No milestones yet. Add one above.</p>}
        {milestones.map((m, i) => {
          const overdue = m.status !== 'done' && isOverdue(m.date);
          const sc = { done: { label: 'Done', color: 'var(--ok-text)', bg: 'var(--ok-tint)', next: 'Mark Pending' }, in_progress: { label: 'In Progress', color: 'var(--warn-text)', bg: 'var(--warn-tint)', next: 'Mark Done' }, pending: { label: 'Pending', color: 'var(--accent-text)', bg: 'var(--accent-tint)', next: 'Start' } };
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
                  <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE }} onClick={saveMilestoneEdit}>Save</button>
                  <button style={s.smallBtn} onClick={() => setEditingMilestoneIdx(null)}>Cancel</button>
                </div>
              </div>
            );
          }

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: WH, borderRadius: 10, border: `1px solid ${overdue ? 'var(--bad-border)' : RULE}`, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: m.status === 'done' ? 'var(--muted)' : BL, textDecoration: m.status === 'done' ? 'line-through' : 'none' }}>{m.title}</p>
                {m.date && <p style={{ fontSize: 13, color: overdue ? 'var(--bad-text)' : 'var(--muted)', fontWeight: overdue ? 700 : 400 }}>{overdue ? <><Icon name="alert" size={12} style={{ marginRight: 4 }} />Overdue · </> : ''}{formatDate(m.date)}</p>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: status.bg, color: status.color }}>{status.label}</span>
              <button style={s.smallBtn} onClick={() => cycleMilestone(i)}>{status.next}</button>
              <button style={s.smallBtn} onClick={() => { setEditingMilestoneIdx(i); setEditMilestoneDraft({ ...m }); }}>Edit</button>
              <button style={{ ...s.miniBtn, color: 'var(--bad-text)', borderColor: 'var(--bad-border)' }} onClick={() => deleteMilestone(i)}><Icon name="x" size={14} /></button>
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

  const levelColors = { high: { bg: 'var(--bad-tint)', color: 'var(--bad-text)', label: 'High' }, medium: { bg: 'var(--warn-tint)', color: 'var(--warn-text)', label: 'Medium' }, low: { bg: 'var(--ok-tint)', color: 'var(--ok-text)', label: 'Low' } };
  const openRisks = risks.filter(r => r.status === 'open');
  const mitigatedRisks = risks.filter(r => r.status === 'mitigated');

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--bad-tint)', borderRadius: 10, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--bad-text)' }}>{openRisks.length}</p>
          <p style={{ fontSize: 13, color: 'var(--bad-text)', fontWeight: 600 }}>Open risks</p>
        </div>
        <div style={{ background: 'var(--ok-tint)', borderRadius: 10, padding: '12px 16px', flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--ok-text)' }}>{mitigatedRisks.length}</p>
          <p style={{ fontSize: 13, color: 'var(--ok-text)', fontWeight: 600 }}>Handled</p>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>What could go wrong?</h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 14 }}>Add anything that could delay, derail or affect this project.</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0, minWidth: 180 }} placeholder="Describe a risk..." value={newRisk} onChange={e => setNewRisk(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRisk()} />
          <select style={{ ...s.input, marginBottom: 0, width: 120 }} value={newLevel} onChange={e => setNewLevel(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button style={{ padding: '11px 20px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={addRisk}>Add</button>
        </div>

        {risks.length === 0 && <p style={s.emptyText}>No risks added yet.</p>}
        {risks.map((r, i) => {
          const lc = levelColors[r.level] || levelColors.medium;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: r.status === 'mitigated' ? GREY : WH, borderRadius: 10, border: `1px solid ${RULE}`, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: lc.bg, color: lc.color, flexShrink: 0 }}>{lc.label}</span>
              <p style={{ flex: 1, fontSize: 15, fontWeight: 500, color: r.status === 'mitigated' ? 'var(--muted)' : BL, textDecoration: r.status === 'mitigated' ? 'line-through' : 'none', minWidth: 100 }}>{r.title}</p>
              <button style={s.smallBtn} onClick={() => toggleRisk(i)}>{r.status === 'mitigated' ? 'Reopen' : 'Mark Handled'}</button>
              <button style={{ ...s.miniBtn, color: 'var(--bad-text)', borderColor: 'var(--bad-border)' }} onClick={() => deleteRisk(i)}><Icon name="x" size={14} /></button>
            </div>
          );
        })}
      </div>

      {/* Compliance */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>Rules and Compliance</h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Legal, regulatory or internal rules this project must follow.</p>

        {data.compliance?.flags?.length > 0 && (
          <div style={{ background: 'var(--warn-tint)', border: '1px solid var(--warn-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--warn-text)', marginBottom: 8 }}>PM Buddy flagged these for your industry</p>
            {data.compliance.flags.map((f, i) => <p key={i} style={{ fontSize: 14, color: 'var(--warn-text)', lineHeight: 1.7 }}>· {f}</p>)}
          </div>
        )}

        <p style={{ fontSize: 14, fontWeight: 700, color: BL, marginBottom: 8 }}>Internal rules</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. All outputs must be approved by the director" value={newInternal} onChange={e => setNewInternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('internal', newInternal, setNewInternal)} />
          <button style={{ padding: '11px 16px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => addCompliance('internal', newInternal, setNewInternal)}>Add</button>
        </div>
        {(compliance.internal || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, color: BL }}>{item}</span>
            <button style={s.removeBtn} onClick={() => removeCompliance('internal', i)}><Icon name="x" size={14} /></button>
          </div>
        ))}

        <p style={{ fontSize: 14, fontWeight: 700, color: BL, marginBottom: 8, marginTop: 16 }}>External regulations</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input style={{ ...s.input, flex: 1, marginBottom: 0 }} placeholder="e.g. Must comply with NDPR data protection" value={newExternal} onChange={e => setNewExternal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCompliance('external', newExternal, setNewExternal)} />
          <button style={{ padding: '11px 16px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => addCompliance('external', newExternal, setNewExternal)}>Add</button>
        </div>
        {(compliance.external || []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bad)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 14, color: BL }}>{item}</span>
            <button style={s.removeBtn} onClick={() => removeCompliance('external', i)}><Icon name="x" size={14} /></button>
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
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Manage who is working on this project and invite new members.</p>
        <TeamTab project={data} currentUser={project._currentUser} onSave={onSave} />
      </div>

      {/* Stakeholders */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>People With an Interest</h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Anyone outside the team who cares about this project — funders, leadership, beneficiaries.</p>
        <StakeholdersList data={data} onSave={onSave} />
      </div>

      {/* How we communicate */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 2 }}>How we share updates</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Who gets updates, how often, and through what channel.</p>
          </div>
          {!editingComms && <button style={s.smallBtn} onClick={() => setEditingComms(true)}>Edit</button>}
          {editingComms && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ ...s.smallBtn, background: BLUE, color: '#FFFFFF', borderColor: BLUE }} onClick={() => { onSave({ planning: { ...planning, communications: commsDraft } }); setEditingComms(false); }}>Save</button>
              <button style={s.smallBtn} onClick={() => setEditingComms(false)}>Cancel</button>
            </div>
          )}
        </div>
        {!editingComms && <p style={{ fontSize: 15, color: planning.communications ? BL : 'var(--muted)', lineHeight: 1.7 }}>{planning.communications || 'Nothing set yet. Click Edit to add how the team stays in touch.'}</p>}
        {editingComms && <textarea style={s.textarea} rows={4} placeholder="e.g. Weekly WhatsApp updates every Monday. Monthly report to funder. Daily standup at 9am via Zoom." value={commsDraft} onChange={e => setCommsDraft(e.target.value)} />}
      </div>

      {/* Reminders */}
      <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: BL, marginBottom: 4 }}>Reminders</h3>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Set reminders for important dates and checkpoints.</p>
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
  const ic = { high: { bg: 'var(--bad-tint)', color: 'var(--bad-text)' }, medium: { bg: 'var(--warn-tint)', color: 'var(--warn-text)' }, low: { bg: 'var(--ok-tint)', color: 'var(--ok-text)' } };

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
            <button style={{ padding: '8px 16px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={add}>Add</button>
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
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: BLUE, color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{(st.name[0] || '?').toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: BL }}>{st.name}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>{st.role}{st.comms ? ` · ${st.comms}` : ''}</p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: c.bg, color: c.color }}>{st.influence}</span>
            <button style={s.removeBtn} onClick={() => remove(i)}><Icon name="x" size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────

function DocumentsTab({ data, history, onSave, project, onCreateReport, docsVersion }) {
  const [section, setSection] = useState('reports');
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
  const [docError, setDocError] = useState('');

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

  useEffect(() => { fetchDocs(); }, [docsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const generateDoc = async (type) => {
    setDocGenerating(type);
    setDocPreview(null);
    const formatD = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not set';
    const prompts = {
      pm: `Write a Project Management Plan in HTML. h2 for headings, p for paragraphs. No html/head/body tags.\n\nProject: ${data.name} | Industry: ${data.industry} | Goal: ${data.scope?.goal || 'Not set'}\nTimeline: ${formatD(data.timeline?.start)} to ${formatD(data.timeline?.end)}\nTeam: ${(data.team || []).map(m => `${m.name} (${m.role})`).join(', ') || 'Solo'}\nRisks: ${risks.map(r => `${r.title} (${r.level})`).join(', ') || 'None'}\nMilestones: ${milestones.map(m => `${m.title} due ${formatD(m.date)}`).join(', ')}\n\nSections: Executive Summary, Project Overview, Scope and Deliverables, Team and Responsibilities, Timeline and Milestones, Communication Plan, Risk Management, Definition of Done.`,
    };
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ prompt: prompts[type], mode: 'document' }) });
      const result = await res.json();
      const html = (result.result || '').replace(/```html|```/g, '').trim();
      if (html && html.length > 100) {
        setDocPreview(html);
        setDocPreviewType(type);
        await saveDoc(html, `${data.name} — Project Management Plan — ${new Date().toLocaleDateString('en-GB')}`, type);
      }
    } catch (err) {
      console.error('generateDoc error:', err);
      setDocError('Could not generate. Please try again.');
    }
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
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ prompt }) });
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
    const prompt = `You are PM Buddy. Write a plain-English progress summary in 3-4 paragraphs: where the project started, what has been achieved, what to focus on next, and one honest observation about what could go wrong. Be specific, warm but direct. No bullet points.\n\n${projectContext}\nHistory entries: ${history?.length || 0}`;
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ prompt }) });
      const result = await res.json();
      setProgressMap(result.result || 'Could not generate. Try again.');
      setShowProgressMap(true);
    } catch { setProgressMap('Could not generate. Try again.'); setShowProgressMap(true); }
    setGeneratingMap(false);
  };

  const deleteDoc = async (id) => { await supabase.from('documents').delete().eq('id', id); fetchDocs(); };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {SECTIONS.map(sec => (
          <button key={sec.id} style={{ padding: '7px 14px', background: section === sec.id ? 'var(--color-primary)' : WH, color: section === sec.id ? '#FFFFFF' : 'var(--text-2)', border: `1px solid ${section === sec.id ? BL : RULE}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setSection(sec.id)}>{sec.label}</button>
        ))}
      </div>

      {section === 'reports' && (
        <div>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16 }}>Team updates, funder reports, investor updates and personal progress reports, written from your live project.</p>
          <button type="button" style={s.reportBtn} onClick={onCreateReport}><Icon name="file" size={16} style={{ marginRight: 8 }} />Create a report</button>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 14 }}>Finished reports are saved under Saved Docs.</p>
        </div>
      )}

      {section === 'health' && (
        <div>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>PM Buddy reads your project data and gives you an honest score.</p>
          <button style={{ padding: '10px 20px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }} onClick={runHealthCheck} disabled={aiReportLoading}>{aiReportLoading ? 'Checking...' : aiReport ? 'Run Again' : 'Run Health Check'}</button>
          {aiReportError && <div style={{ padding: '12px', background: 'var(--bad-tint)', border: '1px solid var(--bad-border)', borderRadius: 10, marginBottom: 16 }}><p style={{ fontSize: 14, color: 'var(--bad-text)' }}>{aiReportError}</p></div>}
          {aiReportLoading && <AiLoading kind="think" title="Running your health check" />}
          {aiReport && !aiReportLoading && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <span style={{ fontSize: 52, fontWeight: 900, color: aiReport.score >= 70 ? 'var(--ok-text)' : aiReport.score >= 45 ? 'var(--accent-text)' : 'var(--bad-text)', letterSpacing: '-2px' }}>{aiReport.score}</span>
                <div><p style={{ fontSize: 14, color: 'var(--muted)' }}>/100</p><span style={{ fontSize: 14, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: aiReport.score >= 70 ? 'var(--ok-tint)' : aiReport.score >= 45 ? 'var(--warn-tint)' : 'var(--bad-tint)', color: aiReport.score >= 70 ? 'var(--ok-text)' : aiReport.score >= 45 ? 'var(--warn-text)' : 'var(--bad-text)' }}>{aiReport.verdict}</span></div>
              </div>
              {aiReport.strengths?.length > 0 && <div style={{ marginBottom: 16 }}><p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>What is working</p>{aiReport.strengths.map((item, i) => <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${RULE}` }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', flexShrink: 0, marginTop: 6 }} /><div><p style={{ fontSize: 14, fontWeight: 600, color: BL, marginBottom: 2 }}>{item.title}</p>{item.detail && <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{item.detail}</p>}</div></div>)}</div>}
              {aiReport.gaps?.length > 0 && <div style={{ marginBottom: 16 }}><p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>What needs attention</p>{aiReport.gaps.map((item, i) => <div key={i} style={{ marginBottom: 10, padding: '12px 14px', background: 'var(--warn-tint)', border: '1px solid var(--warn-border)', borderRadius: 10 }}><p style={{ fontSize: 14, fontWeight: 600, color: BL, marginBottom: 4 }}>{item.title}</p>{item.why && <p style={{ fontSize: 14, color: 'var(--warn-text)', marginBottom: 6 }}><strong>Why it matters:</strong> {item.why}</p>}{item.howToFix && <p style={{ fontSize: 14, color: 'var(--text-2)' }}><strong>How to fix it:</strong> {item.howToFix}</p>}</div>)}</div>}
              {aiReport.recommendation && <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 10, padding: '12px 14px' }}><p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-text)', marginBottom: 6 }}>TOP RECOMMENDATION</p><p style={{ fontSize: 14, color: 'var(--accent-text)', lineHeight: 1.65 }}>{aiReport.recommendation}</p></div>}
            </div>
          )}
        </div>
      )}

      {section === 'pm_plan' && (
        <div>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 16 }}>Full project management plan generated from your live project data.</p>
          <button style={{ padding: '12px 24px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: docGenerating === 'pm' ? 0.6 : 1, marginBottom: 16 }} onClick={() => { setDocError(''); generateDoc('pm'); }} disabled={!!docGenerating}>{docGenerating === 'pm' ? 'Writing your plan...' : 'Generate PM Plan'}</button>
          {docError && <div style={{ padding: '12px 14px', background: 'var(--bad-tint)', border: '1px solid var(--bad-border)', borderRadius: 10, marginBottom: 16 }}><p style={{ fontSize: 14, color: 'var(--bad-text)' }}>{docError}</p></div>}
          {docPreview && docPreviewType === 'pm' && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button style={{ padding: '8px 16px', background: WH, color: 'var(--accent-text)', border: `1.5px solid ${BLUE}`, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadWord(docPreview, `${data.name} PM Plan`)}><Icon name="download" size={15} style={{ marginRight: 6 }} />Word</button>
                <button style={{ padding: '8px 16px', background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => downloadPDF(docPreview, `${data.name} PM Plan`)}><Icon name="download" size={15} style={{ marginRight: 6 }} />PDF</button>
              </div>
              <div style={{ background: WH, border: `1px solid ${RULE}`, borderRadius: 16, padding: '28px 32px', fontSize: 15, lineHeight: 1.8, color: 'var(--text-2)', fontFamily: 'Georgia, serif', maxHeight: '55vh', overflowY: 'auto' }} dangerouslySetInnerHTML={{ __html: docPreview }} />
            </div>
          )}
        </div>
      )}

      {section === 'history' && (
        <div>
          <div style={{ background: 'var(--color-primary-tint)', border: '1px solid var(--color-primary-border)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div><p style={{ fontSize: 15, fontWeight: 700, color: BL, marginBottom: 2 }}>Progress Map</p><p style={{ fontSize: 14, color: 'var(--muted)' }}>PM Buddy reads your history and tells you where things stand.</p></div>
            <button style={{ padding: '9px 18px', background: BLUE, color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: generatingMap ? 0.6 : 1 }} onClick={generateProgressMap} disabled={generatingMap}>{generatingMap ? 'Generating...' : <><Icon name="spark" size={15} style={{ marginRight: 6 }} />Generate</>}</button>
          </div>
          {generatingMap && <div style={{ marginBottom: 20 }}><AiLoading compact kind="think" /></div>}
          {showProgressMap && progressMap && (
            <div style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-border)', borderRadius: 16, padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{progressMap}</div>
              <button style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setShowProgressMap(false)}>Close</button>
            </div>
          )}
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 16 }}>Activity Log</p>
          {(history || []).length === 0 && <p style={s.emptyText}>No recorded history yet.</p>}
          {(history || []).slice().reverse().map((entry, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${RULE}`, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--accent-text)', flexShrink: 0, fontWeight: 700 }}>
                <Icon name={entry.type === 'goal_updated' ? 'flag' : entry.type === 'milestone_done' ? 'check' : entry.type === 'risk_added' ? 'alert' : 'clock'} size={14} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: BL }}>{entry.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</p>
                </div>
                {entry.detail && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{entry.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'saved' && (
        <div>
          {loadingDocs && <p style={s.emptyText}>Loading...</p>}
          {!loadingDocs && savedDocs.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0' }}><p style={{ fontSize: 15, fontWeight: 600, color: BL, marginBottom: 6 }}>No saved documents yet</p><p style={{ fontSize: 14, color: 'var(--muted)' }}>Generate a report or PM Plan and it will appear here.</p></div>}
          {!loadingDocs && savedDocs.map(doc => (
            <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${RULE}`, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: 'var(--accent-tint)', color: 'var(--accent-text)', display: 'inline-block', marginBottom: 3 }}>{doc.type === 'report' ? 'Report' : doc.type === 'pm' ? 'PM Plan' : 'Doc'}</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: BL, marginBottom: 1 }}>{doc.title}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(doc.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.smallBtn} onClick={() => setViewingDoc(doc)}>Open</button>
                <button style={s.smallBtn} onClick={() => downloadWord(doc.content, doc.title)}>Word</button>
                <button style={{ ...s.smallBtn, background: 'var(--color-primary)', color: '#FFFFFF', borderColor: 'var(--color-primary)' }} onClick={() => downloadPDF(doc.content, doc.title)}>PDF</button>
                <button style={{ ...s.smallBtn, color: 'var(--bad-text)', borderColor: 'var(--bad-border)' }} onClick={() => deleteDoc(doc.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px', overflowY: 'auto' }}>
          <div style={{ background: WH, borderRadius: 16, width: '100%', maxWidth: 800, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: `1px solid ${RULE}`, gap: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: BL }}>{viewingDoc.title}</p>
              <button type="button" style={{ padding: '7px 14px', background: WH, color: 'var(--muted)', border: `1px solid ${RULE}`, borderRadius: 8, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }} onClick={() => setViewingDoc(null)}>Close</button>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <DocView key={viewingDoc.id} html={viewingDoc.content} title={viewingDoc.title} onSave={async (next) => {
                const { error: saveError } = await supabase.from('documents').update({ content: next, updated_at: new Date().toISOString() }).eq('id', viewingDoc.id);
                if (saveError) throw saveError;
                setViewingDoc({ ...viewingDoc, content: next });
                fetchDocs();
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: 'var(--bg)', padding: '32px 24px 80px', fontFamily: "'DM Sans', system-ui, sans-serif" },
  wrap: { maxWidth: 900, margin: '0 auto' },
  header: { marginBottom: 20 },
  backBtn: { background: 'none', border: 'none', color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, marginBottom: 12, display: 'block' },
  title: { fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: BL, letterSpacing: '-0.8px', marginBottom: 8 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  reportBtn: { display: 'inline-flex', alignItems: 'center', marginLeft: 'auto', padding: '9px 18px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  industryBadge: { fontSize: 12, fontWeight: 700, background: 'var(--accent-tint)', color: 'var(--accent-text)', padding: '3px 10px', borderRadius: 100 },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100 },
  tabBar: { display: 'flex', borderBottom: `1.5px solid ${RULE}`, marginBottom: 20, overflowX: 'auto' },
  tabBtn: { padding: '10px 18px', background: 'none', border: 'none', borderBottom: '2px solid transparent', marginBottom: -1.5, fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' },
  content: { padding: '4px 0' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 16 },
  statCard: { background: GREY, borderRadius: 16, padding: '14px', border: `1px solid ${RULE}`, textAlign: 'center' },
  statLabel: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 },
  statNum: { fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 2 },
  statSub: { fontSize: 12, color: 'var(--muted)' },
  card: { boxShadow: 'var(--shadow-sm)', background: WH, borderRadius: 16, padding: '16px', border: `1px solid ${RULE}` },
  cardLabel: { fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 },
  input: { width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 10, padding: '10px 12px', fontSize: 15, fontFamily: 'inherit', marginBottom: 10, boxSizing: 'border-box', color: BL, outline: 'none', background: WH },
  textarea: { width: '100%', border: `1.5px solid ${RULE}`, borderRadius: 10, padding: '10px 12px', fontSize: 15, fontFamily: 'inherit', marginBottom: 0, boxSizing: 'border-box', color: BL, outline: 'none', resize: 'vertical', lineHeight: 1.65, background: WH },
  smallBtn: { padding: '5px 12px', background: WH, color: 'var(--text-2)', border: `1px solid ${RULE}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  miniBtn: { padding: '3px 8px', background: WH, color: 'var(--muted)', border: `1px solid ${RULE}`, borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--border-strong)', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', flexShrink: 0 },
  emptyText: { fontSize: 15, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' },
};
