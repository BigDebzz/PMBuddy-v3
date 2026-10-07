// Building blocks for the weekly project summary and your own fortnightly report.
// A file starting with an underscore is not exposed as a web address.
import { marketingFooter } from './_shared.js';

const INK = '#1E1919';
const MUTED = '#5F5852';
const ACCENT = '#1F57F0';
const TINT = '#E9F0FE';
const BORDER = '#E3DED7';
const BAD = '#B42318';

// One tip per week, in this order, starting again from the top after the last.
export const TIPS = [
  { title: 'Invite your colleagues', text: 'Add the people on your project from the People tab. Everyone gets a notification when something changes, so you do not have to remember to update them.' },
  { title: 'Paste in what just happened', text: 'Got a message from your team or a funder? Press "Add new information" inside a project, paste it in, and PM Buddy suggests the updates. Nothing changes until you approve it.' },
  { title: 'Write a report in one click', text: 'Press "Create a report" to get a team update, or a report for a funder or investor, written from your live project. You can edit it, then download it as Word or PDF.' },
  { title: 'Ask PM Buddy anything', text: 'The chat button in the corner knows your project. Ask what needs attention, or what to do next, and it answers from your actual tasks and dates.' },
  { title: 'Speak instead of typing', text: 'Tap the microphone next to any box and just talk. It is quicker than typing on a phone, and it keeps listening through pauses.' },
  { title: 'Tick tasks off as you go', text: 'When a task is done, mark it done. PM Buddy records the date, and your reports can then say exactly what was finished and when.' },
  { title: 'Keep risks visible', text: 'Open the Risks tab and write down the two or three things that could go wrong. It takes two minutes, and it is the first thing a funder or manager asks about.' },
  { title: 'Share progress without a meeting', text: 'Download your latest report as Word or PDF and send it. It is a clear update for people who are not in PM Buddy.' },
];

export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function tipForWeek(date = new Date()) {
  return TIPS[isoWeek(date) % TIPS.length];
}

const day = (d) => d.toISOString().slice(0, 10);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// One entry per active project that has tasks or milestones.
export function summariseProjects(projects, now = new Date()) {
  const today = day(now);
  const weekAgo = now.getTime() - 7 * 86400000;
  const nextWeek = day(new Date(now.getTime() + 7 * 86400000));
  const out = [];
  for (const p of projects || []) {
    if (p.status && p.status !== 'active') continue;
    const tasks = Array.isArray(p.tasks) ? p.tasks : [];
    const milestones = Array.isArray(p.milestones) ? p.milestones : [];
    if (!tasks.length && !milestones.length) continue;
    const doneThisWeek = tasks.filter(t => t.status === 'done' && t.completedAt && new Date(t.completedAt).getTime() >= weekAgo);
    const open = tasks.filter(t => t.status !== 'done');
    const overdueTasks = open.filter(t => t.dueDate && t.dueDate < today);
    const overdueMilestones = milestones.filter(m => m.status !== 'done' && m.date && m.date < today);
    const soon = [
      ...open.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= nextWeek).map(t => ({ title: t.title, date: t.dueDate, kind: 'Task' })),
      ...milestones.filter(m => m.status !== 'done' && m.date && m.date >= today && m.date <= nextWeek).map(m => ({ title: m.title, date: m.date, kind: 'Milestone' })),
    ].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 3);
    out.push({ id: p.id, name: p.name || 'Untitled project', doneCount: doneThisWeek.length, openCount: open.length, overdueCount: overdueTasks.length + overdueMilestones.length, upcoming: soon });
  }
  return out;
}

function niceDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function renderSummaryEmail({ firstName, summaries, tip, userId }) {
  const shown = summaries.slice(0, 3);
  const more = summaries.length - shown.length;
  const totalDone = summaries.reduce((n, s) => n + s.doneCount, 0);
  const totalOverdue = summaries.reduce((n, s) => n + s.overdueCount, 0);
  const subject = `Your PM Buddy week: ${totalDone} done${totalOverdue ? `, ${totalOverdue} overdue` : ''}`;

  const cards = shown.map(s => `
      <div style="border:1px solid ${BORDER};border-radius:12px;padding:16px 18px;margin:0 0 14px;">
        <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:${INK};">${esc(s.name)}</p>
        <p style="margin:0 0 ${s.upcoming.length ? 10 : 0}px;font-size:14px;color:${MUTED};line-height:1.7;">
          <strong style="color:${INK};">${s.doneCount}</strong> done this week &nbsp;&middot;&nbsp;
          <strong style="color:${INK};">${s.openCount}</strong> still open
          ${s.overdueCount ? `&nbsp;&middot;&nbsp; <strong style="color:${BAD};">${s.overdueCount} overdue</strong>` : ''}
        </p>
        ${s.upcoming.length ? `<p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;letter-spacing:0.06em;">Coming up in the next 7 days</p>
        ${s.upcoming.map(u => `<p style="margin:0 0 2px;font-size:14px;color:${INK};">${esc(u.title)} <span style="color:${MUTED};">(${u.kind.toLowerCase()}, ${niceDate(u.date)})</span></p>`).join('')}` : ''}
      </div>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F4F0;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
    <div style="padding:22px 28px;border-bottom:1px solid ${BORDER};">
      <p style="margin:0;font-size:15px;font-weight:800;color:${INK};">PM Buddy</p>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 8px;font-size:22px;color:${INK};line-height:1.3;">${firstName ? `Hi ${esc(firstName)}, here` : 'Here'} is your week.</h1>
      <p style="margin:0 0 22px;font-size:15px;color:${MUTED};line-height:1.6;">Where your projects stand right now.</p>
      ${cards}
      ${more > 0 ? `<p style="margin:0 0 18px;font-size:14px;color:${MUTED};">And ${more} more project${more === 1 ? '' : 's'} in PM Buddy.</p>` : ''}
      <p style="margin:6px 0 26px;"><a href="https://pmbuddy.app" style="display:inline-block;background:${ACCENT};color:#FFFFFF;padding:13px 26px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;">Open PM Buddy</a></p>
      <div style="background:${TINT};border-radius:12px;padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.06em;">Tip of the week</p>
        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:${INK};">${esc(tip.title)}</p>
        <p style="margin:0;font-size:14px;color:${INK};line-height:1.65;">${esc(tip.text)}</p>
      </div>
    </div>
    <div style="padding:18px 28px;border-top:1px solid ${BORDER};">
      <p style="margin:0;font-size:12px;color:#8A837B;">PM Buddy. <a href="https://pmbuddy.app" style="color:#8A837B;">pmbuddy.app</a></p>
      ${marketingFooter(userId, '#8A837B')}
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

// Your own report, every two weeks. Plain numbers, no personal data about individual users.
export function renderOwnerReport(m) {
  const row = (label, value, note = '') => `<tr><td style="padding:8px 0;font-size:15px;color:${MUTED};">${esc(label)}</td><td style="padding:8px 0;font-size:15px;font-weight:700;color:${INK};text-align:right;">${esc(value)}</td><td style="padding:8px 0 8px 12px;font-size:13px;color:${MUTED};">${esc(note)}</td></tr>`;
  const useCases = Object.entries(m.useCases).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none yet';
  const subject = `PM Buddy fortnight: ${m.newSignups} new ${m.newSignups === 1 ? 'person' : 'people'}, ${m.newProjects} new project${m.newProjects === 1 ? '' : 's'}`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F6F4F0;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#FFFFFF;border:1px solid ${BORDER};border-radius:16px;padding:28px;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.06em;">Your PM Buddy report</p>
    <h1 style="margin:0 0 4px;font-size:22px;color:${INK};">The last two weeks</h1>
    <p style="margin:0 0 18px;font-size:14px;color:${MUTED};">${esc(m.from)} to ${esc(m.to)}</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid ${BORDER};">
      ${row('New sign-ups', m.newSignups)}
      ${row('People with an account', m.totalUsers)}
      ${row('Created at least one project', `${m.activated} of ${m.totalUsers}`, m.totalUsers ? `${Math.round((m.activated / m.totalUsers) * 100)}%` : '')}
      ${row('New projects', m.newProjects)}
      ${row('AI requests used', m.aiRequests, 'across everyone')}
      ${row('Turned off tips emails', m.optedOut)}
    </table>
    <p style="margin:18px 0 4px;font-size:13px;font-weight:700;color:${MUTED};">What new people say they use PM Buddy for</p>
    <p style="margin:0;font-size:14px;color:${INK};line-height:1.6;">${esc(useCases)}</p>
    <p style="margin:22px 0 0;font-size:13px;color:${MUTED};line-height:1.6;">Sent every two weeks. For what people search to find you, open Search Console, then Performance.</p>
  </div>
</body></html>`;
  return { subject, html };
}
