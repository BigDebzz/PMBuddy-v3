import crypto from 'crypto';
import { unsubscribeToken } from './_shared.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function page(title, message) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#F9FAFB;color:#1E1919;">
<div style="max-width:480px;margin:80px auto;padding:32px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;">
<h1 style="font-size:22px;margin:0 0 12px;">${title}</h1><p style="font-size:16px;line-height:1.6;margin:0 0 20px;">${message}</p>
<a href="https://pmbuddy.app" style="color:#1F57F0;font-weight:600;">Go to PM Buddy</a></div></body></html>`;
}

// Works from the link in an email (GET) and from the one-click button in Gmail (POST).
export default async function handler(request, response) {
  const query = request.query || {};
  const userId = String(query.u || '');
  const token = String(query.t || '');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');

  const expected = unsubscribeToken(userId);
  const valid = userId && token.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!valid) return response.status(400).send(page('This link does not work', 'The unsubscribe link looks incomplete. You can also turn these emails off in PM Buddy under Settings.'));

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_metadata: { marketing_opt_out: true } }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return response.status(200).send(page('You are unsubscribed', 'You will not get any more marketing emails from PM Buddy. You will still get emails about your own projects, such as invitations and reminders.'));
  } catch (err) {
    console.error('unsubscribe error:', err.message);
    return response.status(500).send(page('Something went wrong', 'We could not unsubscribe you just now. Please try again in a minute, or turn these emails off in PM Buddy under Settings.'));
  }
}
