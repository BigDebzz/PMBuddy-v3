// Runs every Monday morning. Sends each person a short summary of their own projects, plus one tip.
import { POSTAL_ADDRESS, unsubscribeHeaders, isOptedOut } from './_shared.js';
import { summariseProjects, renderSummaryEmail, tipForWeek } from './_summary.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

const MAX_PER_RUN = 250; // keeps a run inside Brevo's free daily limit of 300 emails
const SKIP_IF_SENT_WITHIN_DAYS = 6;

const dbHeaders = () => ({ apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` });

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

async function getProjects(userIds) {
  const byUser = {};
  for (let i = 0; i < userIds.length; i += 100) {
    const ids = userIds.slice(i, i + 100).join(',');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pm_projects?user_id=in.(${ids})&select=id,user_id,name,status,tasks,milestones`, { headers: dbHeaders() });
    if (!res.ok) continue;
    for (const p of await res.json()) (byUser[p.user_id] = byUser[p.user_id] || []).push(p);
  }
  return byUser;
}

async function markSent(userId) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: { ...dbHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_metadata: { last_summary_at: new Date().toISOString() } }),
  });
}

export default async function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' });
  // A marketing email needs a real postal address. Until one is set in api/_shared.js, nothing is sent.
  if (!POSTAL_ADDRESS) return response.status(200).json({ sent: 0, skipped: 'postal address not set' });
  if (!BREVO_API_KEY) return response.status(500).json({ error: 'Email service not configured.' });

  try {
    const now = new Date();
    const cutoff = now.getTime() - SKIP_IF_SENT_WITHIN_DAYS * 86400000;
    const eligible = (await getAllUsers()).filter(u => {
      if (!u.email || !u.email_confirmed_at || isOptedOut(u)) return false;
      const last = u.user_metadata && u.user_metadata.last_summary_at;
      return !last || new Date(last).getTime() < cutoff;
    });
    const projectsByUser = await getProjects(eligible.map(u => u.id));
    const tip = tipForWeek(now);

    let sent = 0;
    for (const user of eligible) {
      if (sent >= MAX_PER_RUN) break;
      const summaries = summariseProjects(projectsByUser[user.id] || [], now);
      if (!summaries.length) continue;
      const { subject, html } = renderSummaryEmail({ firstName: user.user_metadata && user.user_metadata.first_name, summaries, tip, userId: user.id });
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: { name: 'PM Buddy', email: 'hello@pmbuddy.app' }, to: [{ email: user.email }], subject, htmlContent: html, headers: unsubscribeHeaders(user.id) }),
      });
      if (res.ok) { sent += 1; await markSent(user.id); }
      await new Promise(r => setTimeout(r, 100));
    }
    return response.status(200).json({ sent, considered: eligible.length });
  } catch (err) {
    console.error('weekly-summary error:', err.message);
    return response.status(500).json({ error: 'Something went wrong.' });
  }
}
