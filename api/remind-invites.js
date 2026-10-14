// Daily job: invitations that are still not accepted after 3 days get one gentle reminder email.
//
// Each run looks at invites created between 72 and 96 hours ago. Because the job runs once a day,
// every invite falls into that window exactly once, so nobody is reminded twice and no extra
// column is needed to remember who was reminded.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

export const config = { api: { bodyParser: false } };

const HEADERS = { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function inviterName(userId, cache) {
  if (!userId) return 'A PM Buddy user';
  if (cache.has(userId)) return cache.get(userId);
  let name = 'A PM Buddy user';
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, { headers: HEADERS });
    if (res.ok) {
      const u = await res.json();
      name = (u.user_metadata && u.user_metadata.first_name) || (u.email ? u.email.split('@')[0] : name);
    }
  } catch { /* keep the generic name */ }
  cache.set(userId, name);
  return name;
}

function reminderHtml({ who, projectName, role, url }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">Your invitation is still waiting</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
        <strong style="color:#0A0A0A;">${escapeHtml(who)}</strong> invited you to join <strong style="color:#0A0A0A;">${escapeHtml(projectName)}</strong> as ${escapeHtml(role)} a few days ago. It only takes a minute to accept, and then you can see the tasks and updates.
      </p>
      <a href="${url}" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">Accept the invitation</a>
      <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">This is a one-time reminder. If you were not expecting this invitation, you can ignore this email.</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy. <a href="https://pmbuddy.app" style="color:#9CA3AF;">pmbuddy.app</a></p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BREVO_API_KEY) return response.status(500).json({ error: 'Not configured' });

  try {
    const now = Date.now();
    const from = new Date(now - 96 * 3600 * 1000).toISOString();
    const to = new Date(now - 72 * 3600 * 1000).toISOString();

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/project_members?status=eq.pending&created_at=gte.${encodeURIComponent(from)}&created_at=lt.${encodeURIComponent(to)}&select=id,email,role,token,project_id,invited_by`,
      { headers: HEADERS }
    );
    const invites = await res.json();
    if (!Array.isArray(invites) || invites.length === 0) return response.status(200).json({ checked: 0, sent: 0 });

    const ids = [...new Set(invites.map(i => i.project_id).filter(Boolean))];
    const pRes = await fetch(`${SUPABASE_URL}/rest/v1/pm_projects?id=in.(${ids.map(encodeURIComponent).join(',')})&select=id,name,status`, { headers: HEADERS });
    const projects = await pRes.json();
    const byId = new Map((Array.isArray(projects) ? projects : []).map(p => [p.id, p]));

    const cache = new Map();
    let sent = 0;
    for (const inv of invites) {
      const project = byId.get(inv.project_id);
      if (!inv.email || !inv.token || !project || project.status === 'completed') continue;
      const who = await inviterName(inv.invited_by, cache);
      const out = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: { name: 'PM Buddy', email: 'hello@pmbuddy.app' },
          to: [{ email: inv.email }],
          subject: `Reminder: ${who} invited you to ${project.name} on PM Buddy`,
          htmlContent: reminderHtml({ who, projectName: project.name, role: inv.role === 'viewer' ? 'a viewer' : 'an editor', url: `https://pmbuddy.app?invite=${encodeURIComponent(inv.token)}` }),
        }),
      });
      if (out.ok) sent++;
    }
    return response.status(200).json({ checked: invites.length, sent });
  } catch (err) {
    console.error('remind-invites error:', err);
    return response.status(500).json({ error: err.message });
  }
}
