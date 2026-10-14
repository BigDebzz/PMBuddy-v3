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
