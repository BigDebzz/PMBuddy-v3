import { supabase } from './supabase';

export const PENDING_KEY = 'pmbuddy_pending_invite';

export function sameEmail(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

export function getPendingToken() {
  try { return localStorage.getItem(PENDING_KEY); } catch (e) { return null; }
}

export function setPendingToken(tok) {
  try { localStorage.setItem(PENDING_KEY, tok); } catch (e) { /* storage can be unavailable */ }
}

export function clearPendingToken() {
  try { localStorage.removeItem(PENDING_KEY); } catch (e) { /* storage can be unavailable */ }
}

// Talks to /api/invite-join. Always resolves, with ok: true or false.
export async function inviteApi(action, payload = {}) {
  try {
    const { data } = await supabase.auth.getSession();
    const access = data && data.session && data.session.access_token;
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(access ? { Authorization: `Bearer ${access}` } : {}) },
      body: JSON.stringify({ action, ...payload }),
    });
    const body = await res.json().catch(() => ({}));
    return { ...body, ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: 'Network error. Please check your connection and try again.' };
  }
}
