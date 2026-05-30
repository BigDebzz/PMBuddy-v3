const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

export const config = { api: { bodyParser: false } };

async function sendEmail(email, firstName) {
  const name = firstName ? `, ${firstName}` : '';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.1em;">One thing left to do</p>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0A0A0A;line-height:1.3;">You signed up${name}. Now let PM Buddy actually help you.</h1>
      <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.8;">You created an account yesterday but have not started a project yet. That is the one step that makes PM Buddy actually useful for you.</p>

      <div style="background:#F8FAFC;border-radius:10px;padding:20px;margin:20px 0;border-left:4px solid #0284C7;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0A0A0A;">What happens when you create your first project</p>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">PM Buddy asks you a few questions and builds out your project structure automatically including milestones, risks and a communication plan.</p>
        <p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">You get a professional project setup in under 3 minutes without needing to know anything about project management.</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">From there PM Buddy stays with you, flags what needs attention and generates your documents when you need them.</p>
      </div>

      <a href="https://pmbuddy-v3.vercel.app" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">Create my first project</a>

      <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.7;">If something stopped you or you have a question, just reply to this email. We will help you get started.</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy. Think, Plan and Execute Like a Professional PM. <a href="https://pmbuddy-v3.vercel.app" style="color:#9CA3AF;">pmbuddy-v3.vercel.app</a></p>
    </div>
  </div>
</body>
</html>`;

  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'PM Buddy', email: 'pmbuddy1@gmail.com' },
      to: [{ email }],
      subject: 'Your first project is one click away',
      htmlContent: html,
    }),
  });
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });

  try {
    // Get users who signed up 24-48 hours ago
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();

    // Fetch users created in the 24-48 hour window
    const usersRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?created_after=${fortyEightHoursAgo}&created_before=${twentyFourHoursAgo}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const usersData = await usersRes.json();
    const users = usersData.users || [];

    if (!users.length) return response.status(200).json({ message: 'No users in window', sent: 0 });

    // Check which users have already been sent a re-engagement email
    const userIds = users.map(u => u.id);
    const flagsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_flags?user_id=in.(${userIds.join(',')})&select=user_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const flags = await flagsRes.json();
    const alreadySentIds = new Set((flags || []).map(f => f.user_id));

    let sent = 0;
    for (const user of users) {
      if (alreadySentIds.has(user.id)) continue;

      // Check if user has created any project or campaign
      const projectsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/pm_projects?user_id=eq.${user.id}&select=id&limit=1`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const projects = await projectsRes.json();

      // Only send if they have no projects
      if (!projects || projects.length === 0) {
        const email = user.email;
        const firstName = user.user_metadata?.first_name || '';
        if (email) {
          await sendEmail(email, firstName);
          sent++;

          // Flag this user so we never send again
          await fetch(`${SUPABASE_URL}/rest/v1/user_flags`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              user_id: user.id,
              reengagement_sent: true,
              reengagement_sent_at: new Date().toISOString(),
            }),
          });
        }
      }
    }

    return response.status(200).json({ success: true, sent, checked: users.length });
  } catch (err) {
    console.error('check-inactive-users error:', err);
    return response.status(500).json({ error: err.message });
  }
}
