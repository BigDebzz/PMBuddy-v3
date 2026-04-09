export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return response.status(500).json({ error: 'Resend API key not configured' });
  }

  try {
    let body = request.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { to, subject, html } = body;
    if (!to || !subject || !html) {
      return response.status(400).json({ error: 'Missing to, subject or html' });
    }

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

    const data = await res.json();
    if (!res.ok) {
      return response.status(res.status).json({ error: data });
    }

    return response.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Send reminder error:', err);
    return response.status(500).json({ error: err.message });
  }
}
