// A task can be given to more than one person.
//
// `assignees` (an array of names) is what the task board edits. `assignee` (one text, names
// joined with ", ") is kept in step with it, because reports, reminders, the history and the
// "Add new information" flow all read that single text. If `assignee` was changed by one of
// those without updating `assignees`, the text wins.

export function cleanNames(list) {
  const seen = new Set();
  const out = [];
  (list || []).forEach(n => {
    const name = String(n || '').trim().replace(/\s+/g, ' ');
    const key = name.toLowerCase();
    if (name && !seen.has(key)) { seen.add(key); out.push(name); }
  });
  return out;
}

export function taskAssignees(task) {
  if (!task) return [];
  const text = String(task.assignee || '').trim();
  if (Array.isArray(task.assignees)) {
    const list = cleanNames(task.assignees);
    if (list.join(', ') === text || (!text && list.length === 0)) return list;
  }
  return cleanNames(text.split(/\s*(?:,|;|\band\b|&)\s*/i));
}

export function withAssignees(task, list) {
  const names = cleanNames(list);
  return { ...task, assignees: names, assignee: names.join(', ') };
}

export function toggleName(list, name) {
  const key = String(name || '').trim().toLowerCase();
  const has = (list || []).some(n => String(n).trim().toLowerCase() === key);
  return has ? cleanNames((list || []).filter(n => String(n).trim().toLowerCase() !== key)) : cleanNames([...(list || []), name]);
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ---------- who is on the project, and who should be told ----------

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Everyone a task can be given to: the named team, the people who accepted an invite, and the owner.
// Each person is { name, email }. `email` is empty when we only know the name.
export function projectPeople(data, acceptedMembers, owner) {
  const people = [];
  const add = (name, email) => {
    const n = String(name || '').trim();
    const e = String(email || '').trim().toLowerCase();
    if (!n && !e) return;
    const hit = people.find(p => (e && p.email === e) || (n && sameName(p.name, n)));
    if (hit) { if (!hit.email && e) hit.email = e; return; }
    people.push({ name: n || e, email: e });
  };
  ((data && data.team) || []).forEach(m => add(m && m.name, m && m.email));
  (acceptedMembers || []).forEach(m => {
    const e = String((m && m.email) || '').trim().toLowerCase();
    const linked = people.find(p => p.email === e);
    add(linked ? linked.name : e, e);
  });
  if (owner && owner.email) add(owner.name || owner.email, owner.email);
  return people;
}

// The email address to use for a name, or '' if that person has no account on the project.
export function emailFor(name, people, accepted) {
  const p = (people || []).find(x => sameName(x.name, name));
  if (!p || !p.email) return '';
  const ok = new Set([...(accepted || [])].map(e => String(e || '').trim().toLowerCase()));
  return ok.has(p.email) ? p.email : '';
}

// Compares tasks before and after a save and lists who was newly given what.
// Returns [{ task, names }] for tasks that gained at least one person.
export function newlyAssigned(prevTasks, nextTasks) {
  const before = new Map((prevTasks || []).map(t => [t.id, t]));
  const out = [];
  (nextTasks || []).forEach(t => {
    const had = taskAssignees(before.get(t.id)).map(n => n.toLowerCase());
    const added = taskAssignees(t).filter(n => !had.includes(n.toLowerCase()));
    if (added.length) out.push({ task: t, names: added });
  });
  return out;
}
