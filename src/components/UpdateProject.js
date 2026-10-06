import React, { useRef, useState } from 'react';
import mammoth from 'mammoth';
import { supabase } from '../lib/supabase';
import AiLoading from './AiLoading';
import Icon from './Icon';
import { inviteToProject, looksLikeEmail } from '../lib/invite';

const MAX_CHARS = 12000;
const FILE_TYPES = '.txt,.md,.csv,.docx,.pdf';
const STATUS_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };

async function getAuthHeader() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch { return {}; }
}

function readFile(file, as) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    if (as === 'buffer') reader.readAsArrayBuffer(file);
    else if (as === 'base64') reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

function parseJson(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('bad json');
  return JSON.parse(clean.slice(start, end + 1));
}

function buildPrompt(data, text) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = (data.tasks || []).slice(0, 60).map(t => `${t.id} | ${t.title} | ${t.status} | due ${t.dueDate || 'none'} | ${t.assignee || 'unassigned'}`).join('\n') || 'None';
  const milestones = (data.milestones || []).map((m, i) => `${i} | ${m.title} | ${m.status || 'pending'} | due ${m.date || 'none'}`).join('\n') || 'None';
  const risks = (data.risks || []).map(r => `${r.title} (${r.level})`).join('; ') || 'None';
  const team = (data.team || []).map(m => `${m.name} (${m.role})`).join('; ') || 'None';
  return `You are PM Buddy. A user has new information about a project that already exists. Work out what should change in the project. Today is ${today}.

CURRENT PROJECT: ${data.name}
Goal: ${data.scope?.goal || 'Not set'}
Tasks (id | title | status | due | assignee):
${tasks}
Milestones (index | title | status | due):
${milestones}
Risks: ${risks}
People: ${team}

NEW INFORMATION:
${text}

Rules: only propose changes that the new information clearly supports. Never invent people, dates or emails. Use ids and indexes exactly as listed. Do not duplicate a task, risk or person that already exists. Keep each "reason" under 15 words. Use plain words, no emoji.
Return ONLY JSON in this shape, using empty arrays when there is nothing:
{"summary":"one sentence on what this information is about",
"new_tasks":[{"title":"string","assignee":"string or empty","due_date":"YYYY-MM-DD or null","reason":"string"}],
"task_changes":[{"task_id":"id from the list","change":"status|due_date|assignee","value":"todo|in_progress|done, or YYYY-MM-DD, or a name","reason":"string"}],
"milestone_changes":[{"index":0,"new_date":"YYYY-MM-DD","reason":"string"}],
"new_risks":[{"title":"string","level":"high|medium|low","reason":"string"}],
"people":[{"name":"string","role":"string","email":"string or null, only if written in the text"}]}`;
}

// Turns the AI answer into a flat list of changes the person can tick.
function buildChanges(data, result) {
  const list = [];
  const tasks = data.tasks || [];
  const milestones = data.milestones || [];
  (result.new_tasks || []).forEach(t => {
    if (!t.title) return;
    list.push({ kind: 'new_task', group: 'New tasks', text: t.title, extra: [t.assignee && `for ${t.assignee}`, t.due_date && `due ${t.due_date}`].filter(Boolean).join(', '), reason: t.reason, payload: t });
  });
  (result.task_changes || []).forEach(c => {
    const task = tasks.find(x => String(x.id) === String(c.task_id));
    if (!task || !c.value) return;
    const what = c.change === 'status' ? `move to ${STATUS_LABEL[c.value] || c.value}` : c.change === 'due_date' ? `new due date ${c.value}` : `assign to ${c.value}`;
    if (!['status', 'due_date', 'assignee'].includes(c.change)) return;
    if (c.change === 'status' && !STATUS_LABEL[c.value]) return;
    list.push({ kind: 'task_change', group: 'Changes to existing tasks', text: task.title, extra: what, reason: c.reason, payload: { task, change: c.change, value: c.value } });
  });
  (result.milestone_changes || []).forEach(c => {
    const m = milestones[Number(c.index)];
    if (!m || !c.new_date) return;
    list.push({ kind: 'milestone_date', group: 'Milestone dates', text: m.title, extra: `${m.date || 'no date'} to ${c.new_date}`, reason: c.reason, payload: { index: Number(c.index), date: c.new_date } });
  });
  (result.new_risks || []).forEach(r => {
    if (!r.title) return;
    list.push({ kind: 'new_risk', group: 'New risks', text: r.title, extra: r.level ? `${r.level} risk` : '', reason: r.reason, payload: r });
  });
  const known = new Set((data.team || []).map(m => String(m.name || '').trim().toLowerCase()));
  (result.people || []).forEach(p => {
    if (!p.name || known.has(String(p.name).trim().toLowerCase())) return;
    list.push({ kind: 'person', group: 'People', text: p.name, extra: p.role || '', reason: '', payload: p, email: p.email || '' });
  });
  return list.map((c, i) => ({ ...c, id: i, on: c.kind !== 'person' }));
}

export default function UpdateProject({ data, project, onApply, onClose }) {
  const [phase, setPhase] = useState('input');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState('');
  const [changes, setChanges] = useState([]);
  const [outcome, setOutcome] = useState(null);
  const fileRef = useRef(null);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!FILE_TYPES.split(',').includes(ext)) { setError('Please use a PDF, Word (.docx), text or CSV file, or paste the text.'); return; }
    setFile(f);
    setError('');
  };

  const readInfo = async () => {
    if (!text.trim() && !file) { setError('Paste some text or choose a file first.'); return; }
    setError('');
    setPhase('working');
    try {
      let body;
      let pasted = text.trim();
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
          const url = await readFile(file, 'base64');
          body = { prompt: buildPrompt(data, pasted || '(see the attached document)'), mode: 'document', documentBase64: String(url).split(',')[1], documentMediaType: 'application/pdf' };
        } else if (ext === 'docx') {
          const result = await mammoth.extractRawText({ arrayBuffer: await readFile(file, 'buffer') });
          pasted = `${pasted}\n\n${result.value}`.trim();
        } else {
          pasted = `${pasted}\n\n${await readFile(file, 'text')}`.trim();
        }
      }
      if (!body) {
        if (!pasted) throw new Error('empty');
        body = { prompt: buildPrompt(data, pasted.slice(0, MAX_CHARS)), mode: 'document' };
      }
      const res = await fetch('/api/claude', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Could not read that. Please try again.');
      const parsed = parseJson(out.result);
      setSummary(parsed.summary || '');
      setChanges(buildChanges(data, parsed));
      setPhase('review');
    } catch (err) {
      setError(err.message === 'bad json' || err.message === 'empty' ? 'PM Buddy could not make sense of that. Try adding a little more detail.' : err.message);
      setPhase('input');
    }
  };

  const toggle = (id, patch) => setChanges(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  const chosen = changes.filter(c => c.on);

  const apply = async () => {
    setPhase('applying');
    let tasks = [...(data.tasks || [])];
    let milestones = [...(data.milestones || [])];
    let risks = [...(data.risks || [])];
    let team = [...(data.team || [])];
    const invites = [];
    chosen.forEach(c => {
      const p = c.payload;
      if (c.kind === 'new_task') {
        tasks.push({ id: `${Date.now()}${c.id}`, title: p.title, assignee: p.assignee || '', dueDate: p.due_date || '', status: 'todo', milestoneId: '', notes: '', isBlocker: false, createdAt: new Date().toISOString() });
      } else if (c.kind === 'task_change') {
        const field = p.change === 'status' ? 'status' : p.change === 'due_date' ? 'dueDate' : 'assignee';
        tasks = tasks.map(t => (t.id === p.task.id ? { ...t, [field]: p.value } : t));
      } else if (c.kind === 'milestone_date') {
        milestones = milestones.map((m, i) => (i === p.index ? { ...m, date: p.date } : m));
      } else if (c.kind === 'new_risk') {
        risks.push({ title: p.title, level: ['high', 'medium', 'low'].includes(String(p.level).toLowerCase()) ? String(p.level).toLowerCase() : 'medium', status: 'open' });
      } else if (c.kind === 'person') {
        team.push({ name: p.name, role: p.role || '' });
        if (looksLikeEmail(c.email)) invites.push(c.email);
      }
    });

    const updates = {};
    if (tasks.length !== (data.tasks || []).length || chosen.some(c => c.kind === 'task_change')) updates.tasks = tasks;
    if (chosen.some(c => c.kind === 'milestone_date')) updates.milestones = milestones;
    if (chosen.some(c => c.kind === 'new_risk')) updates.risks = risks;
    if (chosen.some(c => c.kind === 'person')) updates.team = team;

    onApply(updates, { type: 'info_added', label: 'New information added', detail: `${summary || 'Project updated'} (${chosen.length} change${chosen.length === 1 ? '' : 's'} applied)` });

    let sent = 0;
    for (const email of invites) {
      const r = await inviteToProject({ project, email, role: 'editor', currentUser: project._currentUser });
      if (r.ok) sent += 1;
    }
    setOutcome({ count: chosen.length, sent, invites: invites.length });
    setPhase('done');
  };

  const groups = [...new Set(changes.map(c => c.group))];

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Add new information">
      <div style={s.panel}>
        <div style={s.head}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add new information</h2>
          <button type="button" style={s.close} onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        <div style={s.body}>
          {phase === 'input' && (
            <div>
              <p style={s.help}>Paste a message, meeting notes or an email, or upload a file. PM Buddy will suggest what to change in this project. Nothing changes until you approve it.</p>
              <textarea id="up-text" style={s.textarea} rows={8} placeholder="e.g. a WhatsApp message from your team, notes from a call, or an email from a funder" value={text} onChange={e => setText(e.target.value)} aria-label="New information" />
              <div style={s.fileRow}>
                <input ref={fileRef} type="file" accept={FILE_TYPES} onChange={pickFile} style={{ display: 'none' }} />
                <button type="button" style={s.secondary} onClick={() => fileRef.current && fileRef.current.click()}><Icon name="upload" size={15} style={{ marginRight: 6 }} />{file ? 'Change file' : 'Upload a file'}</button>
                {file && <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{file.name}</span>}
              </div>
              {error && <div style={s.error}>{error}</div>}
              <button type="button" style={s.primary} onClick={readInfo}><Icon name="spark" size={16} style={{ marginRight: 8 }} />Read it</button>
            </div>
          )}

          {phase === 'working' && <AiLoading kind="read" title="Reading your new information" />}

          {phase === 'review' && (
            <div>
              {summary && <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{summary}</p>}
              {changes.length === 0 ? (
                <div>
                  <p style={s.help}>PM Buddy did not find anything to change in this project. Try pasting more detail.</p>
                  <button type="button" style={s.secondary} onClick={() => setPhase('input')}>Back</button>
                </div>
              ) : (
                <div>
                  <p style={s.help}>Untick anything you do not want. People are not added unless you tick them.</p>
                  {groups.map(g => (
                    <div key={g} style={{ marginBottom: 18 }}>
                      <p style={s.group}>{g}</p>
                      {changes.filter(c => c.group === g).map(c => (
                        <div key={c.id} style={s.item}>
                          <label style={s.itemLabel}>
                            <input type="checkbox" checked={c.on} onChange={e => toggle(c.id, { on: e.target.checked })} style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0 }} />
                            <span>
                              <span style={{ fontWeight: 600 }}>{c.text}</span>
                              {c.extra && <span style={{ color: 'var(--text-2)' }}> ({c.extra})</span>}
                              {c.reason && <span style={{ display: 'block', fontSize: 14, color: 'var(--muted)' }}>{c.reason}</span>}
                            </span>
                          </label>
                          {c.kind === 'person' && c.on && (
                            <input type="email" style={s.email} placeholder="Email to invite them (optional)" value={c.email} onChange={e => toggle(c.id, { email: e.target.value })} aria-label={`Email for ${c.text}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" style={{ ...s.primary, opacity: chosen.length ? 1 : 0.5 }} disabled={!chosen.length} onClick={apply}>Apply {chosen.length} change{chosen.length === 1 ? '' : 's'}</button>
                    <button type="button" style={s.secondary} onClick={() => setPhase('input')}>Back</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === 'applying' && <AiLoading kind="write" title="Updating your project" />}

          {phase === 'done' && outcome && (
            <div>
              <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Your project is updated.</p>
              <p style={s.help}>
                {outcome.count} change{outcome.count === 1 ? '' : 's'} applied and recorded in the History.
                {outcome.invites > 0 && ` ${outcome.sent} of ${outcome.invites} invitation${outcome.invites === 1 ? '' : 's'} sent.`}
              </p>
              <button type="button" style={s.primary} onClick={onClose}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 10000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' },
  panel: { background: 'var(--surface)', borderRadius: 20, width: '100%', maxWidth: 700, boxShadow: 'var(--shadow-lg)', marginTop: 24, marginBottom: 24 },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: '1px solid var(--border)' },
  close: { background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex' },
  body: { padding: '22px 24px 26px' },
  help: { fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 },
  textarea: { width: '100%', padding: '12px 14px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 12, fontSize: 15, color: 'var(--text)', fontFamily: 'inherit', resize: 'vertical', marginBottom: 12 },
  fileRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  group: { fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 },
  item: { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, background: 'var(--surface)' },
  itemLabel: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15, cursor: 'pointer' },
  email: { width: '100%', marginTop: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 15, color: 'var(--text)', fontFamily: 'inherit' },
  error: { padding: '10px 14px', background: 'var(--bad-tint)', border: '1px solid var(--bad-border)', borderRadius: 10, color: 'var(--bad-text)', fontSize: 14, marginBottom: 14 },
  primary: { display: 'inline-flex', alignItems: 'center', padding: '11px 22px', background: 'var(--accent)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  secondary: { display: 'inline-flex', alignItems: 'center', padding: '10px 18px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border-strong)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
};
