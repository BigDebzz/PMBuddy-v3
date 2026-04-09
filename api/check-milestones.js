const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

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
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PM Buddy <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
    }),
  });
  return res.json();
}

function buildReminderEmail(project, milestone, daysUntil) {
  const urgency = daysUntil === 0 ? 'due today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : `due in ${daysUntil} days`;
  const color = daysUntil <= 0 ? '#DC2626' : daysUntil <= 3 ? '#D97706' : '#0284C7';

  return `
<!DOCTYPE html>
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
      <div style="background:#F9FAFB;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">Project</p>
        <p style="margin:0;font-size:15px;font-weight:600;color:#0A0A0A;">${project.name}</p>
      </div>
      <div style="background:${color}12;border:1px solid ${color}30;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:15px;font-weight:700;color:${color};">This milestone is ${urgency}.</p>
      </div>
      <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7;">Log in to PM Buddy to update your progress, mark this milestone complete or adjust your timeline.</p>
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0A0A0A;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open PM Buddy</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">You are receiving this because reminders are enabled for this project. To turn off reminders, open the project in PM Buddy and disable them in the Reminders section.</p>
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
    return `<tr><td style="padding:10px 14px;font-size:14px;color:#0A0A0A;border-bottom:1px solid #F3F4F6;">${m.title}</td><td style="padding:10px 14px;font-size:13px;color:${color};font-weight:600;border-bottom:1px solid #F3F4F6;">${date}</td></tr>`;
  }).join('');

  return `
<!DOCTYPE html>
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
      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0A0A0A;color:#ffffff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">Open PM Buddy</a>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">Weekly summaries are sent every Monday. To turn off reminders, open the project in PM Buddy and disable them in the Reminders section.</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(request, response) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    return response.status(500).json({ error: 'Missing environment variables' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const in3Days = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0];
    const isMonday = today.getDay() === 1;

    const projects = await supabaseQuery(
      `pm_projects?select=id,name,milestones,reminders,status&status=eq.active`,
      { method: 'GET' }
    );

    if (!Array.isArray(projects)) {
      return response.status(500).json({ error: 'Failed to fetch projects', detail: projects });
    }

    const results = [];

    for (const project of projects) {
      const reminders = project.reminders;
      if (!reminders?.enabled || !reminders?.email) continue;

      const milestones = project.milestones || [];
      const email = reminders.email;

      for (const milestone of milestones) {
        if (milestone.status === 'complete') continue;
        const mDate = milestone.date;
        if (!mDate) continue;

        const daysUntil = Math.ceil((new Date(mDate) - today) / 86400000);

        if (daysUntil === 0 || daysUntil === 3) {
          const subject = daysUntil === 0
            ? `Milestone due today: ${milestone.title}`
            : `Milestone in 3 days: ${milestone.title}`;
          const html = buildReminderEmail(project, milestone, daysUntil);
          const sent = await sendEmail(email, subject, html);
          results.push({ project: project.name, milestone: milestone.title, daysUntil, sent });
        }
      }

      if (isMonday) {
        const upcoming = milestones.filter(m => {
          if (m.status === 'complete' || !m.date) return false;
          const days = Math.ceil((new Date(m.date) - today) / 86400000);
          return days >= 0 && days <= 14;
        });

        if (upcoming.length > 0) {
          const html = buildWeeklyEmail(project, upcoming);
          const sent = await sendEmail(email, `Your week ahead: ${project.name}`, html);
          results.push({ project: project.name, type: 'weekly', sent });
        }
      }
    }

    return response.status(200).json({ success: true, processed: results.length, results });
  } catch (err) {
    console.error('Check milestones error:', err);
    return response.status(500).json({ error: err.message });
  }
}
