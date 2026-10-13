// The project history: what changed, who did it and when.
//
// Every change is recorded as an entry. Each entry carries a fingerprint that is built from the entry
// before it, so changing or removing an old entry breaks the chain and the History tab shows a warning.
// Entries are only ever added. Nobody can delete one for the team.

// ---------- SHA-256, written out so the fingerprint can be made without waiting on the browser ----------
const PRIMES = (() => {
  const out = [];
  for (let n = 2; out.length < 64; n += 1) if (out.every(p => n % p !== 0)) out.push(n);
  return out;
})();
const frac32 = (x) => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
const K = PRIMES.map(p => frac32(Math.cbrt(p)));
const H0 = PRIMES.slice(0, 8).map(p => frac32(Math.sqrt(p)));

function utf8(str) {
  const out = [];
  for (let i = 0; i < str.length; i += 1) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d < 0xe000) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i += 1; }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

export function sha256(str) {
  const bytes = utf8(String(str));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 4294967296);
  const lo = bitLen >>> 0;
  [hi, lo].forEach(v => { bytes.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255); });

  const h = H0.slice();
  const w = new Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i += 1) {
      const j = off + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) >>> 0; });
  }
  return h.map(v => v.toString(16).padStart(8, '0')).join('');
}

// ---------- the chain ----------
function payload(prev, e) {
  return JSON.stringify([prev || '', e.id || '', e.type || '', e.label || '', e.detail || '', e.by || '', e.timestamp || '', e.notified || '']);
}

// Adds the next entries to the history, each one tied to the one before it.
export function appendEntries(history, entries, by, now) {
  const list = Array.isArray(history) ? history.slice() : [];
  let prev = '';
  for (let i = list.length - 1; i >= 0; i -= 1) { if (list[i] && list[i].hash) { prev = list[i].hash; break; } }
  const stamp = now || new Date().toISOString();
  entries.forEach((raw, n) => {
    const e = { ...raw, by: raw.by || by, timestamp: raw.timestamp || stamp };
    e.id = e.id || `${Date.parse(stamp) || 0}-${list.length + n}-${sha256(JSON.stringify([e.type, e.label, e.detail])).slice(0, 6)}`;
    e.prev = prev;
    e.hash = sha256(payload(prev, e));
    prev = e.hash;
    list.push(e);
  });
  return list;
}

// Checks the chain. Entries written before the chain existed have no fingerprint and are left alone.
export function verifyHistory(history) {
  const list = Array.isArray(history) ? history : [];
  let prev = '';
  let started = false;
  let checked = 0;
  for (let i = 0; i < list.length; i += 1) {
    const e = list[i] || {};
    if (!e.hash) {
      if (started) return { ok: false, brokenAt: i, checked, reason: 'An entry without a fingerprint was added.' };
      continue;
    }
    started = true;
    if ((e.prev || '') !== prev) return { ok: false, brokenAt: i, checked, reason: 'An earlier entry was removed or changed.' };
    if (sha256(payload(prev, e)) !== e.hash) return { ok: false, brokenAt: i, checked, reason: 'An entry was edited after it was recorded.' };
    prev = e.hash;
    checked += 1;
  }
  return { ok: true, brokenAt: -1, checked, reason: '' };
}

// ---------- working out what changed ----------
const TASK_LABEL = { todo: 'To Do', in_progress: 'In Progress', done: 'Done' };
const MILESTONE_LABEL = { pending: 'To Do', in_progress: 'In Progress', done: 'Done' };
const clip = (s, n = 70) => String(s || '').trim().slice(0, n);
const who = (v) => (v && String(v).trim()) || 'nobody';

function diffTasks(prev, next) {
  const out = [];
  const before = new Map((prev || []).map(t => [t.id, t]));
  const after = new Map((next || []).map(t => [t.id, t]));
  after.forEach((t, id) => {
    const o = before.get(id);
    if (!o) { out.push({ type: 'task_added', label: 'Task added', detail: `${clip(t.title)}${t.assignee ? ` (assigned to ${t.assignee})` : ''}` }); return; }
    if (o.status !== t.status) out.push({ type: 'task_moved', label: `Task moved to ${TASK_LABEL[t.status] || t.status}`, detail: clip(t.title) });
    if (o.title !== t.title) out.push({ type: 'task_renamed', label: 'Task renamed', detail: `${clip(o.title, 40)} to ${clip(t.title, 40)}` });
    if ((o.assignee || '') !== (t.assignee || '')) out.push({ type: 'task_assigned', label: 'Task reassigned', detail: `${clip(t.title, 40)}: ${who(o.assignee)} to ${who(t.assignee)}` });
    if ((o.dueDate || '') !== (t.dueDate || '')) out.push({ type: 'task_due', label: 'Due date changed', detail: `${clip(t.title, 40)}: ${t.dueDate || 'no date'}` });
    if (!!o.isBlocker !== !!t.isBlocker) out.push({ type: 'task_blocked', label: t.isBlocker ? 'Task flagged as blocker' : 'Blocker cleared', detail: clip(t.title) });
    if ((o.notes || '') !== (t.notes || '')) out.push({ type: 'task_note', label: t.notes ? 'Note added to task' : 'Task note removed', detail: `${clip(t.title, 40)}${t.notes ? `: ${clip(t.notes, 60)}` : ''}` });
  });
  before.forEach((t, id) => { if (!after.has(id)) out.push({ type: 'task_deleted', label: 'Task deleted', detail: clip(t.title) }); });
  return out;
}

function diffMilestones(prev, next) {
  const out = [];
  const a = prev || [];
  const b = next || [];
  const key = (m) => `${m.title}|${m.date || ''}`;
  if (a.length === b.length) {
    b.forEach((m, i) => {
      const o = a[i];
      if (!o) return;
      if (o.status !== m.status) out.push({ type: 'milestone_moved', label: `Milestone moved to ${MILESTONE_LABEL[m.status] || m.status}`, detail: clip(m.title) });
      if (o.title !== m.title) out.push({ type: 'milestone_edited', label: 'Milestone renamed', detail: `${clip(o.title, 40)} to ${clip(m.title, 40)}` });
      if ((o.date || '') !== (m.date || '')) out.push({ type: 'milestone_edited', label: 'Milestone date changed', detail: `${clip(m.title, 40)}: ${m.date || 'no date'}` });
    });
    return out;
  }
  const had = new Set(a.map(key));
  const has = new Set(b.map(key));
  b.forEach(m => { if (!had.has(key(m))) out.push({ type: 'milestone_added', label: 'Milestone added', detail: clip(m.title) }); });
  a.forEach(m => { if (!has.has(key(m))) out.push({ type: 'milestone_deleted', label: 'Milestone deleted', detail: clip(m.title) }); });
  return out;
}

function diffRisks(prev, next) {
  const out = [];
  const a = prev || [];
  const b = next || [];
  const before = new Map(a.map(r => [r.title, r]));
  const after = new Map(b.map(r => [r.title, r]));
  after.forEach((r, title) => {
    const o = before.get(title);
    if (!o) out.push({ type: 'risk_added', label: 'Risk added', detail: clip(title) });
    else if (o.status !== r.status) out.push({ type: 'risk_status', label: r.status === 'mitigated' ? 'Risk marked as handled' : 'Risk reopened', detail: clip(title) });
  });
  before.forEach((r, title) => { if (!after.has(title)) out.push({ type: 'risk_deleted', label: 'Risk deleted', detail: clip(title) }); });
  return out;
}

function diffPeople(prev, next) {
  const out = [];
  const names = (l) => new Set((l || []).map(s => s.name));
  const had = names(prev);
  const has = names(next);
  has.forEach(n => { if (!had.has(n)) out.push({ type: 'person_added', label: 'Stakeholder added', detail: clip(n) }); });
  had.forEach(n => { if (!has.has(n)) out.push({ type: 'person_removed', label: 'Stakeholder removed', detail: clip(n) }); });
  return out;
}

function diffScope(prev, next, tasks) {
  const out = [];
  const a = prev || {};
  const b = next || {};
  if ((a.goal || '') !== (b.goal || '')) out.push({ type: 'goal_updated', label: 'Goal updated', detail: clip(b.goal, 80) });
  const oldNotes = new Map((a.boardNotes || []).map(n => [n.id, n]));
  const newNotes = new Map((b.boardNotes || []).map(n => [n.id, n]));
  const taskTitle = (id) => { const t = (tasks || []).find(x => x.id === id); return t ? t.title : ''; };
  newNotes.forEach((n, id) => {
    if (oldNotes.has(id)) return;
    const about = n.taskId ? taskTitle(n.taskId) : '';
    out.push({ type: 'board_note', label: about ? 'Note added to a task' : 'Note added to the board', detail: `${about ? `${clip(about, 40)}: ` : ''}${clip(n.text, 60)}` });
  });
  oldNotes.forEach((n, id) => { if (!newNotes.has(id)) out.push({ type: 'board_note_deleted', label: 'Note deleted', detail: clip(n.text, 60) }); });
  const rest = (s) => { const c = { ...s }; delete c.goal; delete c.boardNotes; delete c.suggestedTasks; return JSON.stringify(c); };
  if (rest(a) !== rest(b)) out.push({ type: 'scope_edited', label: 'Project details edited', detail: '' });
  return out;
}

// Works out what an update changed, compared with the project as it was.
export function describeChanges(prev, updates) {
  const p = prev || {};
  const u = updates || {};
  const out = [];
  if (u.tasks) out.push(...diffTasks(p.tasks, u.tasks));
  if (u.milestones) out.push(...diffMilestones(p.milestones, u.milestones));
  if (u.risks) out.push(...diffRisks(p.risks, u.risks));
  if (u.stakeholders) out.push(...diffPeople(p.stakeholders, u.stakeholders));
  if (u.scope) out.push(...diffScope(p.scope, u.scope, u.tasks || p.tasks));
  if (u.compliance && JSON.stringify(u.compliance) !== JSON.stringify(p.compliance || {})) out.push({ type: 'compliance_changed', label: 'Compliance items changed', detail: '' });
  if (u.planning && JSON.stringify(u.planning) !== JSON.stringify(p.planning || {})) out.push({ type: 'plan_edited', label: 'Plan edited', detail: '' });
  if (u.insights && JSON.stringify(u.insights) !== JSON.stringify(p.insights || {})) out.push({ type: 'plan_edited', label: 'Insight edited', detail: '' });
  return out;
}

// The entries to record for one save. `explicit` is what the screen asked to record, if anything.
export function entriesForSave(prev, updates, explicit) {
  if (explicit && explicit.type === 'info_added') return [{ ...explicit }];
  const found = describeChanges(prev, updates);
  if (!found.length) return explicit ? [{ type: explicit.type, label: explicit.label, detail: explicit.detail }].filter(e => e.label) : [];
  const note = explicit && explicit.notified;
  return note ? found.map(e => (e.type === 'milestone_moved' ? { ...e, notified: note } : e)) : found;
}
