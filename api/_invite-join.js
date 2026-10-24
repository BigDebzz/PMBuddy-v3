// Lets a person join a project from an invitation, without the app having to read the invitations table directly.
// It is called from api/invite.js, so it does not count as a separate server function.
//
// POST /api/invite { action: 'info', token }                       no login needed: who invited, which project, which role
// POST { action: 'accept', token, confirmDifferentEmail? }   needs login: joins the project and returns it
// POST { action: 'decline', token }                    needs login: removes the invitation
// POST { action: 'mine' }                              needs login: pending invitations sent to this person's email
//
// The invitation token is the proof: it only ever went to the invited person's email.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = () => ({ apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` });
const norm = (e) => String(e || '').trim().toLowerCase();

async function verifyAuth(request) {
  const authHeader = request.headers['authorization'] || request.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? user : null;
  } catch (e) { return null; }
}

async function memberByToken(token) {
  const t = String(token || '');
  if (t.length < 8 || t.length > 100 || /[^A-Za-z0-9_-]/.test(t)) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/project_members?token=eq.${encodeURIComponent(t)}&select=*`, { headers: headers() });
  const list = await res.json();
  return Array.isArray(list) && list[0] ? list[0] : null;
}

async function projectById(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pm_projects?id=eq.${encodeURIComponent(String(id))}&select=*`, { headers: headers() });
  const list = await res.json();
  return Array.isArray(list) && list[0] ? list[0] : null;
}

export const JOIN_ACTIONS = ['info', 'accept', 'decline', 'mine'];

export async function handleJoin(request, response, body) {
  try {
    const { action, token } = body || {};

    if (action === 'info') {
      const member = await memberByToken(token);
      if (!member) return response.status(404).json({ error: 'This invite link is invalid or has expired.' });
      if (member.status === 'accepted') return response.status(200).json({ accepted: true });
      const project = await projectById(member.project_id);
      return response.status(200).json({
        projectName: (project && project.name) || 'a PM Buddy project',
        description: (project && project.description) || '',
        role: member.role || 'editor',
        email: member.email || '',
      });
    }

    const user = await verifyAuth(request);
    if (!user) return response.status(401).json({ error: 'Please log in first.' });

    if (action === 'mine') {
      const me = norm(user.email);
      if (!me) return response.status(200).json({ invites: [] });
      const res = await fetch(`${SUPABASE_URL}/rest/v1/project_members?email=eq.${encodeURIComponent(me)}&status=eq.pending&select=token,role,project_id`, { headers: headers() });
      const list = await res.json();
      const rows = Array.isArray(list) ? list.slice(0, 5) : [];
      const invites = [];
      for (const m of rows) {
        const project = await projectById(m.project_id);
        invites.push({ token: m.token, role: m.role || 'editor', projectName: (project && project.name) || 'a PM Buddy project', description: (project && project.description) || '', email: me });
      }
      return response.status(200).json({ invites });
    }

    const member = await memberByToken(token);
    if (!member) return response.status(404).json({ error: 'This invite link is invalid or has expired.' });
    const same = norm(member.email) === norm(user.email);

    if (action === 'decline') {
      if (!same && member.user_id !== user.id) return response.status(403).json({ error: 'This invitation was not sent to you.' });
      if (member.status === 'accepted') return response.status(409).json({ error: 'You have already joined this project.' });
      await fetch(`${SUPABASE_URL}/rest/v1/project_members?id=eq.${encodeURIComponent(String(member.id))}`, { method: 'DELETE', headers: headers() });
      return response.status(200).json({ success: true });
    }

    if (action === 'accept') {
      if (member.status === 'accepted') {
        if (member.user_id === user.id || same) {
          const project = await projectById(member.project_id);
          return response.status(200).json({ success: true, already: true, project });
        }
        return response.status(409).json({ error: 'This invitation has already been used.' });
      }
      if (!same && !body.confirmDifferentEmail) {
        return response.status(409).json({ needsConfirm: true, invitedEmail: member.email, error: 'This invitation was sent to a different email address.' });
      }
      const patch = await fetch(`${SUPABASE_URL}/rest/v1/project_members?id=eq.${encodeURIComponent(String(member.id))}`, {
        method: 'PATCH',
        headers: { ...headers(), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'accepted', user_id: user.id }),
      });
      if (!patch.ok) return response.status(500).json({ error: 'Could not join the project. Please try again.' });
      const project = await projectById(member.project_id);
      return response.status(200).json({ success: true, project });
    }

    return response.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('invite-join error:', err);
    return response.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
