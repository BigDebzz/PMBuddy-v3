import { DOC_LAYOUT_RULES } from './docStyle';
// Builds the facts and the instructions for each report type.
// Only imports the shared layout rules, so it can still be tested on its own.

export const REPORT_TYPES = [
  { id: 'team', label: 'Team update', desc: 'One page. What is done, what is next, blockers.' },
  { id: 'funder', label: 'Funder or donor report', desc: 'Formal. Progress against objectives, risks, budget, next period.' },
  { id: 'investor', label: 'Investor update', desc: 'Short, founder style. Metrics, wins, challenges, asks.' },
  { id: 'personal', label: 'Personal progress report', desc: 'For yourself or a line manager. Covers everything in the project.' },
];

const TITLES = { team: 'Team update', funder: 'Funder report', investor: 'Investor update', personal: 'Personal progress report' };
const MAX_ITEMS = 12;

// "YYYY-MM-DD" is read as a local date so day counts are right in every time zone.
export function parseLocal(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const date = new Date(y, (m || 1) - 1, d || 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmt(value) {
  if (!value) return '';
  const d = typeof value === 'string' ? (value.length <= 10 ? parseLocal(value) : new Date(value)) : value;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatPeriod(start, end) {
  return `${fmt(start)} to ${fmt(end)}`;
}

export function reportTitle(type, projectName, start, end) {
  return `${TITLES[type] || 'Report'}: ${projectName}, ${formatPeriod(start, end)}`;
}

function list(items, line) {
  if (!items.length) return 'None';
  const shown = items.slice(0, MAX_ITEMS).map(line).join('; ');
  return items.length > MAX_ITEMS ? `${shown}; (+${items.length - MAX_ITEMS} more)` : shown;
}

function taskLine(t) {
  const who = t.assignee ? ` (${t.assignee})` : '';
  const due = t.dueDate ? `, due ${fmt(t.dueDate)}` : '';
  const note = t.notes ? `, note: ${String(t.notes).slice(0, 80)}` : '';
  return `${t.title}${who}${due}${note}`;
}

// Turns the live project into a compact list of facts for the AI.
export function buildFacts(data, start, end, today = new Date()) {
  const startD = parseLocal(start) || new Date(0);
  const endD = parseLocal(end) || new Date();
  endD.setHours(23, 59, 59, 999);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const in14 = new Date(todayStart);
  in14.setDate(in14.getDate() + 14);

  const tasks = data.tasks || [];
  const milestones = data.milestones || [];
  const risks = data.risks || [];
  const inPeriod = (iso) => { if (!iso) return false; const d = new Date(iso); return d >= startD && d <= endD; };
  const dueOf = (item, key) => parseLocal(item[key]);

  const done = tasks.filter(t => t.status === 'done');
  const doneInPeriod = done.filter(t => inPeriod(t.completedAt));
  const doneNoDate = done.filter(t => !t.completedAt);
  const open = tasks.filter(t => t.status !== 'done');
  const inProgress = open.filter(t => t.status === 'in_progress');
  const overdue = open.filter(t => { const d = dueOf(t, 'dueDate'); return d && d < todayStart; });
  const blocked = open.filter(t => t.isBlocker);
  const next14 = open.filter(t => { const d = dueOf(t, 'dueDate'); return d && d >= todayStart && d <= in14; });

  const msDone = milestones.filter(m => m.status === 'done');
  const msDoneInPeriod = msDone.filter(m => inPeriod(m.completedAt));
  const msDoneNoDate = msDone.filter(m => !m.completedAt);
  const msOpen = milestones.filter(m => m.status !== 'done');
  const msOverdue = msOpen.filter(m => { const d = dueOf(m, 'date'); return d && d < todayStart; });
  const msUpcoming = msOpen.filter(m => { const d = dueOf(m, 'date'); return !d || d >= todayStart; });

  const history = (data.history || []).filter(h => inPeriod(h.timestamp)).slice(-MAX_ITEMS);
  const endDate = dueOf(data.timeline || {}, 'end');
  const daysLeft = endDate ? Math.round((endDate - todayStart) / 86400000) : null;

  const team = (data.team || []).map(m => `${m.name}${m.role ? ` (${m.role})` : ''}`).join(', ') || 'No team members added';

  const text = [
    `PROJECT: ${data.name} | Industry: ${data.industry || 'not set'}`,
    `GOAL: ${data.scope?.goal || 'not set'}`,
    `TIMELINE: ${fmt(data.timeline?.start) || 'not set'} to ${fmt(data.timeline?.end) || 'not set'}${daysLeft === null ? '' : daysLeft >= 0 ? ` (${daysLeft} days left)` : ` (${Math.abs(daysLeft)} days past the end date)`}`,
    `CURRENT PHASE: ${data.scope?.currentPhase || 'not set'}`,
    `TEAM: ${team}`,
    `TASKS OVERALL: ${done.length} of ${tasks.length} done, ${inProgress.length} in progress, ${overdue.length} overdue, ${blocked.length} blocked`,
    `MILESTONES OVERALL: ${msDone.length} of ${milestones.length} reached`,
    `TASKS COMPLETED IN THE PERIOD: ${list(doneInPeriod, taskLine)}`,
    `TASKS COMPLETED, DATE NOT RECORDED: ${doneNoDate.length === 0 ? 'None' : `${doneNoDate.length} (${list(doneNoDate, t => t.title)})`}`,
    `TASKS IN PROGRESS: ${list(inProgress, taskLine)}`,
    `TASKS OVERDUE TODAY: ${list(overdue, taskLine)}`,
    `BLOCKED TASKS: ${list(blocked, taskLine)}`,
    `TASKS DUE IN THE NEXT 14 DAYS: ${list(next14, taskLine)}`,
    `MILESTONES REACHED IN THE PERIOD: ${list(msDoneInPeriod, m => `${m.title}${m.date ? `, planned ${fmt(m.date)}` : ''}`)}`,
    `MILESTONES REACHED, DATE NOT RECORDED: ${list(msDoneNoDate, m => m.title)}`,
    `MILESTONES UPCOMING: ${list(msUpcoming, m => `${m.title}${m.date ? `, due ${fmt(m.date)}` : ''}`)}`,
    `MILESTONES OVERDUE: ${list(msOverdue, m => `${m.title}, was due ${fmt(m.date)}`)}`,
    `RISKS: ${list(risks, r => `${r.title} (${r.level || 'level not set'}, ${r.status || 'status not set'}${r.mitigation ? `, mitigation: ${String(r.mitigation).slice(0, 80)}` : ''})`)}`,
    `ACTIVITY IN THE PERIOD: ${history.length ? history.map(h => `${h.label}${h.detail ? `: ${h.detail}` : ''}`).join('; ') : 'None recorded'}`,
  ].join('\n');

  return {
    text,
    counts: { tasks: tasks.length, done: done.length, doneInPeriod: doneInPeriod.length, overdue: overdue.length, blocked: blocked.length, milestones: milestones.length, msDone: msDone.length },
  };
}

const RULES = [
  'You write project reports for PM Buddy users. Plain, professional English.',
  'Use ONLY the facts below and the notes the user typed. NEVER invent numbers, names, outcomes, quotes or dates.',
  'If a section needs information that is not in the facts, write a placeholder in square brackets, for example [Add budget figure], so the user can fill it in.',
  'Where a fact says a date was not recorded, say the item was completed without claiming when.',
  'Do not use emoji or decorative symbols.',
  DOC_LAYOUT_RULES,
].join(' ');

const STRUCTURES = {
  team: [
    'Write a TEAM UPDATE. One page, informal and brief, under 300 words. Title it "Team update" with the project name and period.',
    'Sections: Overall status (say On track, At risk or Off track, with one sentence why: At risk if anything is overdue or blocked, Off track if the end date has passed with open milestones or more than a third of tasks are overdue, otherwise On track); Done this period; Coming up next; Blockers and who needs to act; Deadlines in the next 14 days.',
  ],
  funder: [
    'Write a FUNDER OR DONOR REPORT. Formal tone, about 500 words.',
    'Begin with a cover block listing: Project name, Prepared for, Reporting period, Prepared by, Date.',
    'Sections: Executive summary (one paragraph); Progress against objectives (a table with columns Objective, Planned, Achieved, Status, built from the project goal and the milestones, with Status as Complete, In progress, Behind or Not started); Milestones completed this period and upcoming milestones; Key activities carried out; Challenges and how they were addressed; Risks and mitigation; Budget utilisation (only from the user key figures, otherwise [Add budget figure]); Plan for next period; Lessons learned (only what the facts support, otherwise a short placeholder such as [Add lessons learned]).',
  ],
  investor: [
    'Write an INVESTOR UPDATE in a direct founder voice, using "we". Short, under 350 words.',
    'Sections: a one-line headline of the period; Key metrics (only the user key figures, otherwise placeholders such as [Add active users] and [Add revenue]); Wins; Challenges; Priorities for next period; Asks (introductions, hires, advice, taken from the user notes, otherwise [Add ask]).',
  ],
  personal: [
    'Write a PERSONAL PROGRESS REPORT in the first person ("I"), for the user or their line manager. The user is responsible for the whole project, including tasks assigned to other people, so cover everything in the project and mention who a task is assigned to where relevant. About 350 words.',
    'Sections: Summary of the period; What I completed; What is in progress; What is overdue and why (use task notes, otherwise [Add reason]); My focus for next period; Support I need (from the user notes, otherwise [Add support needed]).',
  ],
};

export function buildPrompt(type, facts, form, today = new Date()) {
  const lines = [
    RULES,
    ...(STRUCTURES[type] || STRUCTURES.team),
    '',
    `REPORTING PERIOD: ${formatPeriod(form.start, form.end)}`,
    `TODAY: ${fmt(today)}`,
    `PREPARED BY: ${form.preparedBy || '[Add name]'}`,
    `PREPARED FOR: ${form.preparedFor || (type === 'funder' ? '[Add funder name]' : 'not specified')}`,
    '',
    'FACTS:',
    facts.text,
    '',
    `USER KEY FIGURES: ${form.keyFigures && form.keyFigures.trim() ? form.keyFigures.trim() : 'none given'}`,
    `USER NOTES: ${form.notes && form.notes.trim() ? form.notes.trim() : 'none'}`,
  ];
  return lines.join('\n');
}
