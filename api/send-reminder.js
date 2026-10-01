export const config = {
  api: { bodyParser: true },
};

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = 'pmbuddy1@gmail.com';
const FROM_NAME = 'Debbie from PM Buddy';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  if (!BREVO_API_KEY) {
    return response.status(500).json({ error: 'Email service not configured' });
  }

  try {
    let body = request.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return response.status(400).json({ error: 'Missing to, subject or html' });
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Brevo error:', data);
      return response.status(res.status).json({ error: data });
    }

    return response.status(200).json({ success: true, messageId: data.messageId });

  } catch (err) {
    console.error('Send reminder error:', err);
    return response.status(500).json({ error: err.message });
  }
}
