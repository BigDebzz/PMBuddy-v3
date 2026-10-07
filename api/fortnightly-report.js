// Runs every Monday, but only sends on every second week. The report goes to hello@pmbuddy.app,
// which Cloudflare forwards to your Gmail.
import { isOptedOut } from './_shared.js';
import { isoWeek, renderOwnerReport } from './_summary.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SEND_TO = 'hello@pmbuddy.app';

const dbHeaders = () => ({ apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` });
const dayString = (d) => d.toISOString().slice(0, 10);

async function getAllUsers() {
  let users = [];
  for (let page = 1; page < 50; page++) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=1000`, { headers: dbHeaders() });
    if (!res.ok) break;
    const batch = (await res.json()).users || [];
    users = users.concat(batch);
    if (batch.length < 1000) break;
  }
  return users;
}

async function rest(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: dbHeaders() });
  return res.ok ? res.json() : [];
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });
  if (isoWeek(new Date()) % 2 !== 0) return response.status(200).json({ sent: false, reason: 'off week' });
  if (!BREVO_API_KEY) return response.status(500).json({ error: 'Email service not configured.' });

  try {
    const now = new Date();
    const since = new Date(now.getTime() - 14 * 86400000);
    const users = (await getAllUsers()).filter(u => u.email_confirmed_at);
    const projects = await rest('pm_projects?select=user_id,created_at&limit=10000');
    const usage = await rest(`ai_usage?day=gte.${dayString(since)}&select=count&limit=10000`);

    const useCases = {};
    users.filter(u => new Date(u.created_at) >= since).forEach(u => {
      const k = u.user_metadata && u.user_metadata.use_case;
      if (k) useCases[k] = (useCases[k] || 0) + 1;
    });

    const { subject, html } = renderOwnerReport({
      from: since.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      to: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      newSignups: users.filter(u => new Date(u.created_at) >= since).length,
      totalUsers: users.length,
      activated: new Set(projects.map(p => p.user_id)).size,
      newProjects: projects.filter(p => new Date(p.created_at) >= since).length,
      aiRequests: usage.reduce((n, r) => n + (r.count || 0), 0),
      optedOut: users.filter(isOptedOut).length,
      useCases,
    });

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: { name: 'PM Buddy', email: 'hello@pmbuddy.app' }, to: [{ email: SEND_TO }], subject, htmlContent: html }),
    });
    return response.status(200).json({ sent: res.ok });
  } catch (err) {
    console.error('fortnightly-report error:', err.message);
    return response.status(500).json({ error: 'Something went wrong.' });
  }
}
