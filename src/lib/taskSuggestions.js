// Suggested tasks: PM Buddy proposes everyday tasks under a project's milestones.
// Nothing is added to the board until the person accepts it.

const MAX_SUGGESTIONS = 15;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);

export function buildSuggestionPrompt(project, today = new Date()) {
  const p = project || {};
  const scope = p.scope || {};
  const timeline = p.timeline || {};
  const milestones = (p.milestones || []).filter(m => m && m.title);
  const existing = (p.tasks || []).map(t => t.title).filter(Boolean).slice(0, 40);
  const team = (p.team || []).map(m => m.name).filter(Boolean).slice(0, 15);
  const day = today.toISOString().slice(0, 10);

  const lines = [
    `PROJECT: ${clean(p.name, 120) || 'Untitled'} | Field: ${clean(p.industry, 60) || 'not set'}`,
    `GOAL: ${clean(scope.goal || p.description, 500) || 'not set'}`,
    `TODAY: ${day}`,
    `PROJECT START: ${timeline.start || 'not set'} | PROJECT END: ${timeline.end || 'not set'}`,
    `DELIVERABLES: ${(scope.deliverables || []).map(d => clean(d, 80)).filter(Boolean).join('; ') || 'not set'}`,
    `MILESTONES (checkpoints): ${milestones.length ? milestones.map(m => `${clean(m.title, 100)}${m.date ? ` (due ${m.date})` : ''}`).join(' | ') : 'none set'}`,
    `TEAM: ${team.join(', ') || 'not set'}`,
    `TASKS ALREADY ON THE BOARD: ${existing.join('; ') || 'none'}`,
  ];

  return [
    'You are PM Buddy. Suggest the everyday tasks this project needs, so the person does not start with an empty task board.',
    '',
    lines.join('\n'),
    '',
    'Rules:',
    '- Suggest 8 to 14 practical tasks that would get the project to its milestones, in the order the work should happen.',
    '- A task is one piece of work that one person can finish, such as "Write the training curriculum". A milestone is a checkpoint, so never suggest a milestone as a task.',
    '- Each task should support one of the milestones above. Copy that milestone title exactly into "milestone", or use null if the task is general.',
    '- Start each task with a verb. Keep it under 90 characters. Plain English, no emoji.',
    '- Do not repeat anything already on the board.',
    '- Do not invent names, numbers, budgets or facts that are not given above. These are recommendations the person will review.',
    '- "due_date" is YYYY-MM-DD, between today and the end of the project or of that milestone, or null if you cannot tell.',
    '',
    'Return ONLY a JSON object, no explanation, in this exact shape:',
    '{"tasks":[{"title":"string","milestone":"exact milestone title or null","due_date":"YYYY-MM-DD or null"}]}',
  ].join('\n');
}

// Turns the AI's reply into a safe list. Anything unusable is dropped quietly.
export function parseSuggestions(text, project, stamp = Date.now()) {
  const raw = String(text || '').replace(/```json|```/g, '');
  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a < 0 || b <= a) return [];
  let parsed;
  try { parsed = JSON.parse(raw.slice(a, b + 1)); } catch (e) { return []; }
  const list = Array.isArray(parsed) ? parsed : parsed && parsed.tasks;
  if (!Array.isArray(list)) return [];

  const milestoneTitles = ((project && project.milestones) || []).map(m => m && m.title).filter(Boolean);
  const exact = (t) => milestoneTitles.find(m => m.trim().toLowerCase() === String(t || '').trim().toLowerCase()) || null;
  const seen = new Set(((project && project.tasks) || []).map(t => String(t.title || '').trim().toLowerCase()));

  const out = [];
  list.forEach((item, i) => {
    if (!item || out.length >= MAX_SUGGESTIONS) return;
    const title = clean(item.title, 120);
    const key = title.toLowerCase();
    if (!title || seen.has(key)) return;
    seen.add(key);
    out.push({
      id: `s-${stamp}-${i}`,
      title,
      milestone: exact(item.milestone),
      dueDate: DATE.test(String(item.due_date || '')) ? String(item.due_date) : '',
    });
  });
  return out;
}

// Turns an accepted suggestion into a real task. The milestone link is the milestone's position, as the board expects.
export function suggestionToTask(s, milestones, now = new Date()) {
  const idx = (milestones || []).findIndex(m => m && m.title === s.milestone);
  return {
    id: `${now.getTime()}${Math.floor(Math.random() * 1000)}`,
    title: s.title,
    assignee: '',
    dueDate: s.dueDate || '',
    status: 'todo',
    milestoneId: idx >= 0 ? String(idx) : '',
    notes: '',
    isBlocker: false,
    createdAt: now.toISOString(),
  };
}
