// The invitation journey, screen by screen. The database and the big screens are stand-ins.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

let mockSession = null;
jest.mock('./lib/supabase', () => {
  const chain = () => { const c = {}; ['from', 'select', 'eq', 'order', 'limit', 'delete', 'single', 'maybeSingle', 'in', 'insert', 'update'].forEach(k => { c[k] = () => c; }); c.then = (r) => r({ data: null, error: null }); return c; };
  return { supabase: { ...chain(), auth: { getSession: async () => ({ data: { session: mockSession } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => {} } } };
});
jest.mock('./components/LandingScreen', () => () => <div>LANDING</div>);
jest.mock('./components/Dashboard', () => () => <div>DASHBOARD</div>);
jest.mock('./components/ProjectWorkspace', () => ({ project }) => <div>PROJECT OPEN: {project.name}</div>);
jest.mock('./components/AuthScreen', () => (p) => <div>AUTH prefill={p.prefillEmail} token={p.inviteToken} project={p.inviteProject}</div>);
['QuestionWizard', 'ResultsDashboard', 'ProjectWizard', 'CampaignWizard', 'QuickDoc', 'FeedbackButton', 'CookieBanner'].forEach(n => jest.doMock('./components/' + n, () => () => null));

global.IS_REACT_ACT_ENVIRONMENT = true;
const apiCalls = [];
const fakeFetch = async (url, opts) => {
  const body = opts && opts.body ? JSON.parse(opts.body) : {};
  apiCalls.push([url, body.action || body.type, body.confirmDifferentEmail]);
  if (url === '/api/invite-join') {
    if (body.action === 'info') return { ok: true, status: 200, json: async () => ({ projectName: 'Youth training', description: 'Train 100', role: 'editor', email: 'ada@x.org' }) };
    if (body.action === 'accept') return { ok: true, status: 200, json: async () => ({ success: true, project: { id: 'p1', name: 'Youth training', owner_email: 'o@x.org' } }) };
  }
  return { ok: true, status: 200, json: async () => ({}) };
};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.IntersectionObserver = window.IntersectionObserver || class { observe() {} disconnect() {} };

const App = require('./App').default;
const settle = async () => { for (let i = 0; i < 8; i++) await act(async () => { await new Promise(r => setTimeout(r, 15)); }); };
const mount = async () => { const div = document.createElement('div'); document.body.appendChild(div); await act(async () => { createRoot(div).render(<App />); }); await settle(); return div; };
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); await settle(); };

beforeEach(() => { global.fetch = fakeFetch; apiCalls.length = 0; localStorage.clear(); sessionStorage.clear(); window.location.hash = ''; document.body.innerHTML = ''; });

test(' after the confirmation email, the matching person lands inside the project', async () => {
  localStorage.setItem('pmbuddy_pending_invite', 'tokenAda12345');
  window.location.hash = '#access_token=abc&type=signup';
  mockSession = { user: { id: 'u-ada', email: 'Ada@X.org', user_metadata: { first_name: 'Ada' } }, access_token: 'jwt' };
  const div = await mount();
  expect(div.textContent).toContain('PROJECT OPEN: Youth training');
  expect(localStorage.getItem('pmbuddy_pending_invite')).toBeNull();
  expect(apiCalls.some(c => c[1] === 'accept')).toBe(true);
  expect(apiCalls.some(c => c[1] === 'member_joined')).toBe(true);
});

test(' a different email sees a note, and joins with one click', async () => {
  localStorage.setItem('pmbuddy_pending_invite', 'tokenAda12345');
  mockSession = { user: { id: 'u-chi', email: 'chi@x.org', user_metadata: {} }, access_token: 'jwt' };
  const div = await mount();
  expect(div.textContent).toContain('This invitation was sent to ada@x.org');
  expect(apiCalls.some(c => c[1] === 'accept')).toBe(false);
  const join = Array.from(div.querySelectorAll('button')).find(b => b.textContent.includes('Join the project'));
  await click(join);
  expect(div.textContent).toContain('PROJECT OPEN: Youth training');
  expect(apiCalls.find(c => c[1] === 'accept')[2]).toBe(true);
});

test(' a visitor with no account sees the invitation and a friendly sign-up button', async () => {
  window.history.pushState({}, '', '/?invite=tokenAda12345');
  mockSession = null;
  const div = await mount();
  expect(div.textContent).toContain('Youth training');
  expect(div.textContent).toContain('Sign up or log in to join');
  expect(localStorage.getItem('pmbuddy_pending_invite')).toBe('tokenAda12345');
  const go = Array.from(div.querySelectorAll('button')).find(b => b.textContent.includes('Sign up or log in to join'));
  await click(go);
  expect(div.textContent).toContain('prefill=ada@x.org');
  expect(div.textContent).toContain('project=Youth training');
});

test(' no invitation at all: a normal login goes to the dashboard', async () => {
  mockSession = { user: { id: 'u-x', email: 'x@x.org', user_metadata: {} }, access_token: 'jwt' };
  const div = await mount();
  expect(div.textContent).toContain('DASHBOARD');
  expect(apiCalls.length).toBe(0);
});
