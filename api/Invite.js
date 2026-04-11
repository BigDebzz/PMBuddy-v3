const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

export const config = { api: { bodyParser: true } };

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  try {
    let body = request.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { email, role, projectId, projectName, inviterName, token } = body;
    if (!email || !projectId || !token) return response.status(400).json({ error: 'Missing fields' });

    const inviteUrl = `https://pmbuddy-v3.vercel.app?invite=${token}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#0A0A0A;padding:24px 32px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#0284C7;letter-spacing:0.1em;text-transform:uppercase;">PM Buddy</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#0284C7;text-transform:uppercase;letter-spacing:0.1em;">Project Invitation</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0A0A0A;">You have been invited to collaborate</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.7;">
        <strong style="color:#0A0A0A;">${inviterName || 'A PM Buddy user'}</strong> has invited you to join <strong style="color:#0A0A0A;">${projectName}</strong> as a <strong style="color:#0A0A0A;">${role}</strong>.
      </p>
      <a href="${inviteUrl}" style="display:inline-block;background:#0284C7;color:#ffffff;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:24px;">Accept Invitation</a>
      <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">If you do not have a PM Buddy account, you will be asked to create one. If you did not expect this invitation, you can ignore this email.</p>
    </div>
    <div style="padding:20px 32px;border-top:1px solid #F3F4F6;">
      <p style="margin:0;font-size:12px;color:#9CA3AF;">PM Buddy — Think, Plan and Execute Like a Professional PM</p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PM Buddy <onboarding@resend.dev>',
        to: [email],
        subject: `You have been invited to ${projectName} on PM Buddy`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return response.status(res.status).json({ error: err });
    }

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Invite error:', err);
    return response.status(500).json({ error: err.message });
  }
}
