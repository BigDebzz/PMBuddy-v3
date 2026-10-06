import { supabase } from './supabase';

function makeToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

// Invites one person to a project: saves the invite, then sends the email. Same steps as the Team tab.
// Returns { ok: true } or { ok: false, error }.
export async function inviteToProject({ project, email, role = 'editor', currentUser }) {
  const address = String(email || '').trim().toLowerCase();
  if (!looksLikeEmail(address)) return { ok: false, error: 'That email address does not look right.' };
  if (address === (currentUser?.email || '').toLowerCase()) return { ok: false, error: 'That is your own email.' };

  const token = makeToken();
  const { error: dbErr } = await supabase.from('project_members').insert({
    project_id: project.id,
    invited_by: currentUser.id,
    email: address,
    role,
    status: 'pending',
    token,
  });
  if (dbErr) return { ok: false, error: 'This person may already be invited.' };

  try {
    const { data } = await supabase.auth.getSession();
    const access = data?.session?.access_token;
    const inviterName = currentUser?.user_metadata?.first_name || currentUser?.email?.split('@')[0] || 'A team member';
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
      body: JSON.stringify({ email: address, role, projectId: project.id, projectName: project.name, inviterName, token }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: result.error || 'The email could not be sent. The invite is saved in the Team tab.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'Network error. The invite is saved in the Team tab.' };
  }
}
