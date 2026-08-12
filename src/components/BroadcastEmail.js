export const config = {
  api: { bodyParser: true },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const FROM_EMAIL = 'hello@pmbuddy.app';
const FROM_NAME = 'Debbie from PM Buddy';

// Only allow Deborah to trigger this
const ALLOWED_EMAILS = ['akpodeborah@gmail.com', 'hello@pmbuddy.app'];

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

async function getAllUsers() {
  // Fetch all users from Supabase auth using service role
  let users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!res.ok) break;
    const data = await res.json();
    const batch = data.users || [];
    users = [...users, ...batch];
    if (batch.length < perPage) break;
    page++;
  }

  return users.filter(u => u.email && u.email_confirmed_at);
}

async function sendEmail(toEmail, toName, subject, htmlContent) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: toEmail, name: toName || toEmail.split('@')[0] }],
      subject,
      htmlContent,
    }),
  });
  return res.ok;
}

function buildEmailHTML(firstName, subject, body) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0A0A0A;border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#0284C7;margin-right:8px;vertical-align:middle;"></span>
                    <span style="color:#FFFFFF;font-size:16px;font-weight:700;vertical-align:middle;">PM Buddy</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#FFFFFF;padding:36px 32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
              <p style="font-size:22px;font-weight:800;color:#0A0A0A;margin:0 0 8px;letter-spacing:-0.5px;">
                Hey ${firstName} 👋
              </p>
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:0 0 12px 12px;padding:20px 32px;">
              <p style="font-size:12px;color:#9CA3AF;margin:0 0 4px;">
                You're receiving this because you signed up for PM Buddy.
              </p>
              <p style="font-size:12px;color:#9CA3AF;margin:0;">
                <a href="https://pmbuddy-v3.vercel.app" style="color:#0284C7;text-decoration:none;">pmbuddy-v3.vercel.app</a>
                &nbsp;·&nbsp;
                PM Buddy, Nigeria
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const user = await verifyAuth(request);
  if (!user) {
    return response.status(401).json({ error: 'Unauthorised. Please log in.' });
  }

  // Only allow specific admin emails to trigger broadcasts
  if (!ALLOWED_EMAILS.includes(user.email)) {
    return response.status(403).json({ error: 'Not authorised to send broadcasts.' });
  }

  if (!BREVO_API_KEY) {
    return response.status(500).json({ error: 'Email service not configured.' });
  }

  try {
    let body = request.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { subject, bodyHTML, preview } = body || {};

    if (!subject || !bodyHTML) {
      return response.status(400).json({ error: 'subject and bodyHTML are required.' });
    }

    // Preview mode — just send to Deborah
    if (preview) {
      const previewName = user.user_metadata?.first_name || 'Deborah';
      const html = buildEmailHTML(previewName, subject, bodyHTML);
      const sent = await sendEmail(user.email, previewName, `[PREVIEW] ${subject}`, html);
      return response.status(200).json({ success: sent, message: `Preview sent to ${user.email}` });
    }

    // Fetch all confirmed users
    const users = await getAllUsers();
    console.log(`Broadcasting to ${users.length} users`);

    let sent = 0;
    let failed = 0;

    for (const u of users) {
      const firstName = u.user_metadata?.first_name || u.email.split('@')[0];
      const html = buildEmailHTML(firstName, subject, bodyHTML);

      // Small delay between sends to respect rate limits
      await new Promise(r => setTimeout(r, 100));

      const ok = await sendEmail(u.email, firstName, subject, html);
      if (ok) sent++;
      else { failed++; console.error(`Failed to send to ${u.email}`); }
    }

    return response.status(200).json({
      success: true,
      total: users.length,
      sent,
      failed,
      message: `Sent to ${sent} of ${users.length} users.`,
    });

  } catch (err) {
    console.error('Broadcast error:', err);
    return response.status(500).json({ error: err.message });
  }
}
