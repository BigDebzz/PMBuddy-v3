const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

export const config = { api: { bodyParser: true } };

// Verify the request has a valid Supabase session token
// Welcome emails are exempt since they fire during signup before a session exists
async function verifyAuth(request) {
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ? user : null;
  } catch { return null; }
}

async function getProjectEmails(projectId, ownerEmail) {
  const emails = new Set();
  if (ownerEmail) emails.add(ownerEmail);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_members?project_id=eq.${projectId}&status=eq.accepted&select=email`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const members = await res.json();
  if (Array.isArray(members)) members.forEach(m => { if (m.email) emails.add(m.email); });
  return [...emails];
}

async function sendEmail(emails, subject, html) {
  if (!emails.length) return;
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'PM Buddy', email: 'hello@pmbuddy.app' },
      to: emails.map(e => ({ email: e })),
      subject,
      htmlContent: html,
    }),
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Tells people they were given tasks. Recipients are checked against the project here, on the
// server, so this cannot be used to send mail to addresses that are not on the project.
async function handleTaskAssigned({ user, projectId, projectName, data, response }) {
  const headers = { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };
  const id = encodeURIComponent(String(projectId));
  const projRes = await fetch(`${SUPABASE_URL}/rest/v1/pm_projects?id=eq.${id}&select=user_id,owner_email,name`, { headers });
  const projects = await projRes.json();
  const project = Array.isArray(projects) ? projects[0] : null;
  if (!project) return response.status(404).json({ error: 'Project not found' });

  const memRes = await fetch(`${SUPABASE_URL}/rest/v1/project_members?project_id=eq.${id}&status=eq.accepted&select=email,user_id`, { headers });
  const members = await memRes.json();
  const list = Array.isArray(members) ? members : [];

  const allowedCaller = project.user_id === user.id || list.some(m => m.user_id === user.id);
  if (!allowedCaller) return response.status(403).json({ error: 'You are not on this project.' });

  const valid = new Set();
  if (project.owner_email) valid.add(String(project.owner_email).trim().toLowerCase());
  list.forEach(m => { if (m.email) valid.add(String(m.email).trim().toLowerCase()); });
  const me = String(user.email || '').trim().toLowerCase();

  const assignments = Array.isArray(data && data.assignments) ? data.assignments.slice(0, 10) : [];
  const by = String((data && data.assignedBy) || 'A team member').slice(0, 80);
  let sent = 0;
  let skipped = 0;
  for (const a of assignments) {
    const email = String((a && a.email) || '').trim().toLowerCase();
    const tasks = Array.isArray(a && a.tasks) ? a.tasks.slice(0, 10) : [];
    if (!email || email === me || !valid.has(email) || tasks.length === 0) { skipped++; continue; }
    const lines = tasks.map(t => {
      const due = t && t.dueDate ? ` (due ${escapeHtml(t.dueDate)})` : '';
      return `&bull; ${escapeHtml(String((t && t.title) || '').slice(0, 160))}${due}`;
    }).join('<br>');
    const many = tasks.length > 1;
    const subject = many
      ? `${tasks.length} tasks assigned to you on ${String(projectName).slice(0, 80)}`
      : `Task assigned to you: ${String((tasks[0] && tasks[0].title) || 'a task').slice(0, 80)}`;
    const html = buildUpdateEmail(
      escapeHtml(projectName),
      many ? 'You have been given some tasks' : 'You have been given a task',
      `${escapeHtml(by)} assigned ${many ? 'these tasks' : 'this task'} to you:<br><br>${lines}`,
      'Open the task board'
    );
    await sendEmail([email], subject, html);
    sent++;
  }
  return response.status(200).json({ success: true, sent, skipped });
}

async function authEmail(userId) {
  if (!userId) return '';
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!res.ok) return '';
    const u = await res.json();
    return String(u.email || '').trim().toLowerCase();
  } catch { return ''; }
}

// Tells the project that someone accepted an invitation. Everything is looked up here from the
// database, not taken from the browser, so the person who invited them and the owner are always
// told, whichever device the invitation was accepted on.
async function handleMemberJoined({ user, projectId, response }) {
  const headers = { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };
  const id = encodeURIComponent(String(projectId));
  const me = String(user.email || '').trim().toLowerCase();

  const projRes = await fetch(`${SUPABASE_URL}/rest/v1/pm_projects?id=eq.${id}&select=user_id,owner_email,name`, { headers });
  const projects = await projRes.json();
  const project = Array.isArray(projects) ? projects[0] : null;
  if (!project) return response.status(404).json({ error: 'Project not found' });

  const memRes = await fetch(`${SUPABASE_URL}/rest/v1/project_members?project_id=eq.${id}&status=eq.accepted&select=email,role,invited_by,user_id`, { headers });
  const members = await memRes.json();
  const list = Array.isArray(members) ? members : [];
  const mine = list.find(m => m.user_id === user.id || String(m.email || '').trim().toLowerCase() === me);
  if (!mine) return response.status(403).json({ error: 'You have not accepted an invitation to this project.' });

  const to = new Set();
  const add = (e) => { const v = String(e || '').trim().toLowerCase(); if (v && v !== me) to.add(v); };
  add(project.owner_email);
  add(await authEmail(project.user_id));   // the owner, even if owner_email was never saved on the project
  add(await authEmail(mine.invited_by));   // whoever sent this invitation
  list.forEach(m => add(m.email));         // everyone else already on the project

  if (to.size === 0) return response.status(200).json({ skipped: true, reason: 'No one to tell' });

  const name = (user.user_metadata && user.user_metadata.first_name) || user.email;
  const role = mine.role || 'editor';
  const html = buildUpdateEmail(
    escapeHtml(project.name),
    'New team member joined',
    `${escapeHtml(name)} (${escapeHtml(user.email)}) has accepted their invitation and joined ${escapeHtml(project.name)} as ${escapeHtml(role)}.`,
    'View Team'
  );
  await sendEmail([...to], `${String(name).slice(0, 60)} joined ${String(project.name).slice(0, 80)}`, html);
  return response.status(200).json({ success: true, recipients: to.size });
}

function buildUpdateEmail(projectName, eventTitle, eventDetail, actionLabel) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0284C7;text-transform:uppercase;letter-spacing:0.1em;">Project Update</p>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0A0A0A;line-height:1.3;">${projectName}</h1>
      <div style="background:#F8FAFC;border-radius:10px;padding:18px;margin:20px 0;border:1px solid #E5E7EB;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151;">${eventTitle}</p>
        <p style="margin:0;font-size:14px;color:#6B7280;line-height:1.6;">${eventDetail}</p>
      </div>
      <a href="https://pmbuddy.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${actionLabel || 'Open PM Buddy'}</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy. Think, Plan and Execute Like a Professional PM</p>
    </div>
  </div>
</body>
</html>`;
}

function buildWelcomeEmail(firstName) {
  const name = firstName ? `, ${firstName}` : '';
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">Welcome${name}. You are in.</h1>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.8;">Most projects fail not because of bad ideas but because of poor planning, missed deadlines and no clear structure. PM Buddy fixes that without requiring you to become a project manager.</p>

      <div style="background:#F8FAFC;border-radius:10px;padding:20px;margin:0 0 20px;border:1px solid #E5E7EB;">
        <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#0A0A0A;">Here is what changes when you use PM Buddy</p>

        <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0A0A0A;">You stop running projects on WhatsApp and hope</p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">Create a project and PM Buddy sets up your milestones, risks and team structure in minutes. Everything in one place.</p>
        </div>

        <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0A0A0A;">You always know what needs to happen next</p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">PM Buddy tracks your deadlines and sends you reminders before things fall behind. No more last-minute panic.</p>
        </div>

        <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0A0A0A;">You walk into every stakeholder meeting prepared</p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">Generate a professional project plan or benefits document in seconds. No more starting from a blank page.</p>
        </div>

        <div>
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#0A0A0A;">You have a PM in your corner at all times</p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">The PM Buddy assistant reads your actual project data and flags risks, gaps and next steps before you even ask.</p>
        </div>
      </div>

      <a href="https://pmbuddy.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">Start my first project</a>

      <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.7;">Takes less than 3 minutes. If you get stuck or have feedback, just reply to this email.</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy. Think, Plan and Execute Like a Professional PM. <a href="https://pmbuddy.app" style="color:#9CA3AF;">pmbuddy.app</a></p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  try {
    let body = request.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { type, projectId, projectName, ownerEmail, data } = body;

    // Welcome email — exempt from auth since it fires during signup
    if (type === 'welcome') {
      if (!data?.email) return response.status(400).json({ error: 'Missing email' });
      const html = buildWelcomeEmail(data.firstName || '');
      await sendEmail([data.email], 'Welcome to PM Buddy. Here is how to get started', html);
      return response.status(200).json({ success: true });
    }

    // All other notification types require a logged in user
    const user = await verifyAuth(request);
    if (!user) return response.status(401).json({ error: 'Unauthorised. Please log in.' });

    if (!type || !projectId || !projectName) return response.status(400).json({ error: 'Missing fields' });

    if (type === 'task_assigned') return await handleTaskAssigned({ user, projectId, projectName, data, response });
    if (type === 'member_joined') return await handleMemberJoined({ user, projectId, response });

    const emails = await getProjectEmails(projectId, ownerEmail);
    if (!emails.length) return response.status(200).json({ skipped: true, reason: 'No emails to notify' });

    let subject = '';
    let eventTitle = '';
    let eventDetail = '';
    let actionLabel = 'View Project';

    switch (type) {
      case 'milestone_done':
        subject = `Milestone completed: ${data.milestone} on ${projectName}`;
        eventTitle = '✓ Milestone marked as done';
        eventDetail = `"${data.milestone}" has been completed on ${projectName}.`;
        actionLabel = 'See Progress';
        break;
      case 'milestone_in_progress':
        subject = `Milestone started: ${data.milestone} on ${projectName}`;
        eventTitle = '→ Milestone now in progress';
        eventDetail = `"${data.milestone}" is now being worked on in ${projectName}.`;
        actionLabel = 'See Progress';
        break;
      case 'risk_added':
        subject = `New risk flagged: ${projectName}`;
        eventTitle = '⚠ A new risk has been added';
        eventDetail = `"${data.risk}" was added as a ${data.level || 'medium'} risk on ${projectName}.`;
        actionLabel = 'Review Risks';
        break;
      case 'risk_high':
        subject = `High risk flagged on ${projectName}`;
        eventTitle = '🔴 High risk alert';
        eventDetail = `"${data.risk}" has been flagged as a HIGH risk on ${projectName}. This needs attention.`;
        actionLabel = 'Review Risks';
        break;
      case 'goal_updated':
        subject = `Project goal updated: ${projectName}`;
        eventTitle = 'Project goal was updated';
        eventDetail = `The goal for ${projectName} has been updated to: "${data.goal}"`;
        break;
      case 'description_updated':
        subject = `Project description updated: ${projectName}`;
        eventTitle = 'Project description was updated';
        eventDetail = `The description for ${projectName} has been updated.`;
        break;
      case 'blocker_added':
        subject = `Blocker reported on ${projectName}`;
        eventTitle = '⛔ A blocker has been reported';
        eventDetail = `"${data.blocker}" was added as a current blocker on ${projectName}. The team should be aware.`;
        actionLabel = 'View Project Status';
        break;
      case 'member_joined':
        subject = `${data.name || data.email} joined ${projectName}`;
        eventTitle = '👋 New team member joined';
        eventDetail = `${data.name || data.email} has accepted their invitation and joined ${projectName} as ${data.role}.`;
        actionLabel = 'View Team';
        break;
      default:
        return response.status(400).json({ error: 'Unknown notification type' });
    }

    const html = buildUpdateEmail(projectName, eventTitle, eventDetail, actionLabel);
    await sendEmail(emails, subject, html);
    return response.status(200).json({ success: true, recipients: emails.length });
  } catch (err) {
    console.error('Notify error:', err);
    return response.status(500).json({ error: err.message });
  }
}
