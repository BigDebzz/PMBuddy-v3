const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

export const config = { api: { bodyParser: true } };

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
      sender: { name: 'PM Buddy', email: 'pmbuddy1@gmail.com' },
      to: emails.map(e => ({ email: e })),
      subject,
      htmlContent: html,
    }),
  });
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
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${actionLabel || 'Open PM Buddy'}</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy. Think, Plan and Execute Like a Professional PM</p>
    </div>
  </div>
</body>
</html>`;
}

function buildWelcomeEmail(firstName) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">Welcome${firstName ? ', ' + firstName : ''}. You are in.</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.8;">PM Buddy helps you manage projects like a professional without needing to be one. Here is how to get started.</p>

      <div style="background:#F8FAFC;border-radius:10px;padding:20px;margin:20px 0;border:1px solid #E5E7EB;">
        <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#0A0A0A;">Three things to do right now</p>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <div style="width:28px;height:28px;border-radius:50%;background:#0284C7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">1</div>
          <div>
            <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0A0A0A;">Create your first project</p>
            <p style="margin:0;font-size:13px;color:#6B7280;">Click New Project on your dashboard and PM Buddy will guide you through the setup.</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:12px;">
          <div style="width:28px;height:28px;border-radius:50%;background:#0284C7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">2</div>
          <div>
            <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0A0A0A;">Set your milestones</p>
            <p style="margin:0;font-size:13px;color:#6B7280;">Break your project into clear steps with dates. PM Buddy will remind you as deadlines approach.</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <div style="width:28px;height:28px;border-radius:50%;background:#0284C7;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">3</div>
          <div>
            <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#0A0A0A;">Talk to PM Buddy</p>
            <p style="margin:0;font-size:13px;color:#6B7280;">The assistant button at the bottom right reads your project and gives you specific guidance. Use it.</p>
          </div>
        </div>
      </div>

      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">Go to my dashboard</a>

      <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.7;">If you have any questions or feedback, reply to this email. We read every message.</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy. Think, Plan and Execute Like a Professional PM · <a href="https://pmbuddy-v3.vercel.app" style="color:#9CA3AF;">pmbuddy-v3.vercel.app</a></p>
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

    // Welcome email - no projectId needed
    if (type === 'welcome') {
      if (!data?.email) return response.status(400).json({ error: 'Missing email' });
      const html = buildWelcomeEmail(data.firstName || '');
      await sendEmail([data.email], 'Welcome to PM Buddy. Here is how to get started', html);
      return response.status(200).json({ success: true });
    }

    if (!type || !projectId || !projectName) return response.status(400).json({ error: 'Missing fields' });

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
