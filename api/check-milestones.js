const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

async function supabaseQuery(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  return res.json();
}

async function sendEmail(to, subject, html) {
  // to can be a single email string or array of emails
  const recipients = Array.isArray(to) ? to.map(e => ({ email: e })) : [{ email: to }];
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'PM Buddy', email: 'debbiescorner7@gmail.com' },
      to: recipients,
      subject,
      htmlContent: html,
    }),
  });
  return res.ok ? { success: true } : { success: false, status: res.status };
}

// Get all email addresses for a project (owner + accepted team members)
async function getProjectEmails(project) {
  const emails = new Set();

  // Get owner email
  if (project.owner_email) emails.add(project.owner_email);

  // Get accepted team member emails
  const members = await supabaseQuery(
    `project_members?project_id=eq.${project.id}&status=eq.accepted&select=email`,
    { method: 'GET' }
  );
  if (Array.isArray(members)) {
    members.forEach(m => { if (m.email) emails.add(m.email); });
  }

  return [...emails];
}

function buildMilestoneEmail(project, milestone, daysUntil) {
  const urgency = daysUntil === 0 ? 'due today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
  const color = daysUntil <= 0 ? '#DC2626' : daysUntil <= 3 ? '#D97706' : '#0284C7';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.1em;">Milestone Reminder</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">${milestone.title}</h1>
      <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Project</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#0A0A0A;">${project.name}</p>
      </div>
      <div style="background:${color}15;border:1px solid ${color}40;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:15px;font-weight:700;color:${color};">This milestone is ${urgency}.</p>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7;">Log in to PM Buddy to update your progress or mark this milestone complete.</p>
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open PM Buddy</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy — Think, Plan and Execute Like a Professional PM</p>
    </div>
  </div>
</body>
</html>`;
}

function buildTimelineEmail(project, daysUntil) {
  const urgency = daysUntil === 0 ? 'ends today' : daysUntil === 7 ? 'ends in 7 days' : `ends in ${daysUntil} days`;
  const color = daysUntil === 0 ? '#DC2626' : '#D97706';
  const endDate = new Date(project.timeline.end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.1em;">Project Timeline Alert</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">${project.name} ${urgency}</h1>
      <div style="background:${color}15;border:1px solid ${color}40;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Project End Date</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:${color};">${endDate}</p>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7;">Your project is approaching its end date. Log in to review your progress, update your milestones or adjust your timeline if needed.</p>
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open PM Buddy</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy — Think, Plan and Execute Like a Professional PM</p>
    </div>
  </div>
</body>
</html>`;
}

function buildWeeklyEmail(project, upcomingMilestones) {
  const milestoneRows = upcomingMilestones.map(m => {
    const date = new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const days = Math.ceil((new Date(m.date) - new Date()) / 86400000);
    const color = days <= 3 ? '#DC2626' : '#0284C7';
    return `<tr>
      <td style="padding:10px 14px;font-size:14px;color:#0A0A0A;border-bottom:1px solid #F3F4F6;">${m.title}</td>
      <td style="padding:10px 14px;font-size:13px;color:${color};font-weight:600;border-bottom:1px solid #F3F4F6;">${date}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0284C7;text-transform:uppercase;letter-spacing:0.1em;">Weekly Summary</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0A0A0A;">Good morning.</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;">Here is what is coming up for <strong style="color:#0A0A0A;">${project.name}</strong> this week.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#F9FAFB;">
            <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Milestone</th>
            <th style="padding:10px 14px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.08em;text-align:left;">Due</th>
          </tr>
        </thead>
        <tbody>${milestoneRows}</tbody>
      </table>
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open PM Buddy</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">Weekly summaries are sent every Monday. PM Buddy — Think, Plan and Execute Like a Professional PM</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(request, response) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BREVO_API_KEY) {
    return response.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isMonday = today.getDay() === 1;

    const projects = await supabaseQuery(
      `pm_projects?select=id,name,milestones,reminders,status,timeline,owner_email&status=eq.active`,
      { method: 'GET' }
    );

    if (!Array.isArray(projects)) {
      return response.status(500).json({ error: 'Failed to fetch projects', detail: projects });
    }

    const results = [];

    for (const project of projects) {
      const reminders = project.reminders;
      if (!reminders?.enabled) continue;

      // Get all emails for this project
      const emails = await getProjectEmails(project);
      if (emails.length === 0) continue;

      const milestones = project.milestones || [];

      // ── Milestone reminders ──────────────────────────────────────
      for (const milestone of milestones) {
        if (milestone.status === 'done') continue;
        if (!milestone.date) continue;

        const daysUntil = Math.ceil((new Date(milestone.date) - today) / 86400000);

        // Send on day of, 3 days before, and 7 days before
        if (daysUntil === 0 || daysUntil === 3 || daysUntil === 7) {
          const subject = daysUntil === 0
            ? `Milestone due today: ${milestone.title} — ${project.name}`
            : `Milestone in ${daysUntil} days: ${milestone.title} — ${project.name}`;
          const html = buildMilestoneEmail(project, milestone, daysUntil);
          const sent = await sendEmail(emails, subject, html);
          results.push({ type: 'milestone', project: project.name, milestone: milestone.title, daysUntil, recipients: emails.length, sent });
        }
      }

      // ── Timeline reminders ───────────────────────────────────────
      const endDate = project.timeline?.end;
      if (endDate) {
        const daysUntilEnd = Math.ceil((new Date(endDate) - today) / 86400000);

        if (daysUntilEnd === 0 || daysUntilEnd === 7) {
          const subject = daysUntilEnd === 0
            ? `Project ends today: ${project.name}`
            : `Project ends in 7 days: ${project.name}`;
          const html = buildTimelineEmail(project, daysUntilEnd);
          const sent = await sendEmail(emails, subject, html);
          results.push({ type: 'timeline', project: project.name, daysUntilEnd, recipients: emails.length, sent });
        }
      }

      // ── Weekly summary (Mondays only) ────────────────────────────
      if (isMonday) {
        const upcoming = milestones.filter(m => {
          if (m.status === 'done' || !m.date) return false;
          const days = Math.ceil((new Date(m.date) - today) / 86400000);
          return days >= 0 && days <= 14;
        });

        if (upcoming.length > 0) {
          const html = buildWeeklyEmail(project, upcoming);
          const sent = await sendEmail(emails, `Your week ahead: ${project.name}`, html);
          results.push({ type: 'weekly', project: project.name, recipients: emails.length, sent });
        }
      }
    }

    return response.status(200).json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error('Check milestones error:', err);
    return response.status(500).json({ error: err.message });
  }
}

