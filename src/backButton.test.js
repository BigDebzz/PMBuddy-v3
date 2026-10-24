// The browser's Back button: opening a project is a step in the history, and Back returns to the dashboard.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

let mockSession = null;
jest.mock('./lib/supabase', () => {
  const chain = () => { const c = {}; ['from', 'select', 'eq', 'order', 'limit', 'delete', 'single', 'maybeSingle', 'in', 'insert', 'update'].forEach(k => { c[k] = () => c; }); c.then = (r) => r({ data: { id: 'p1', name: 'Youth' }, error: null }); return c; };
  return { supabase: { ...chain(), auth: { getSession: async () => ({ data: { session: mockSession } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => {} } } };
});
jest.mock('./components/LandingScreen', () => () => <div>LANDING</div>);
jest.mock('./components/Dashboard', () => ({ onOpenProject, onNewProject }) => <div>DASHBOARD <button onClick={() => onOpenProject({ id: 'p1', name: 'Youth' })}>open</button><button onClick={onNewProject}>new</button></div>);
jest.mock('./components/ProjectWorkspace', () => ({ project, onBack }) => <div>PROJECT {project.name} <button onClick={onBack}>back</button></div>);
jest.mock('./components/ProjectWizard', () => ({ onComplete, onBack }) => <div>WIZARD <button onClick={() => onComplete({ id: 'p9', name: 'Fresh' })}>finish</button><button onClick={onBack}>cancel</button></div>);
['AuthScreen', 'QuestionWizard', 'ResultsDashboard', 'CampaignWizard', 'QuickDoc', 'FeedbackButton', 'CookieBanner'].forEach(n => jest.doMock('./components/' + n, () => () => null));

global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
window.IntersectionObserver = window.IntersectionObserver || class { observe() {} disconnect() {} };
const App = require('./App').default;

const wait = (ms = 30) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const mount = async () => { const div = document.createElement('div'); document.body.appendChild(div); await act(async () => { createRoot(div).render(<App />); }); await wait(); await wait(); return div; };
const click = async (div, label) => { const b = Array.from(div.querySelectorAll('button')).find(x => x.textContent.trim() === label); await act(async () => { b.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); await wait(); };
const back = async () => { await act(async () => { window.history.back(); await new Promise(r => setTimeout(r, 60)); }); await wait(); };

beforeEach(() => {
  document.body.innerHTML = ''; localStorage.clear(); sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  mockSession = { user: { id: 'u1', email: 'a@b.c', user_metadata: {} }, access_token: 'jwt' };
});

test('the browser Back button goes from a project to the dashboard, not out of the site', async () => {
  const div = await mount();
  expect(div.textContent).toContain('DASHBOARD');
  await click(div, 'open');
  expect(div.textContent).toContain('PROJECT Youth');
  expect(window.history.state.pmb.screen).toBe('project_open');
  await back();
  expect(div.textContent).toContain('DASHBOARD');
  expect(div.textContent).not.toContain('PROJECT Youth');
});

test('Forward goes back into the project', async () => {
  const div = await mount();
  await click(div, 'open');
  await back();
  await act(async () => { window.history.forward(); await new Promise(r => setTimeout(r, 60)); }); await wait();
  expect(div.textContent).toContain('PROJECT Youth');
});

test('the in-app "All projects" button behaves like Back, with no extra history step', async () => {
  const div = await mount();
  const before = window.history.length;
  await click(div, 'open');
  await click(div, 'back');
  await wait(80);
  expect(div.textContent).toContain('DASHBOARD');
  // opening then going back leaves the history one step longer at most, and Back is still on the dashboard
  expect(window.history.state.pmb.screen).toBe('dashboard');
  expect(window.history.length).toBeLessThanOrEqual(before + 1);
});

test('after finishing the new-project wizard, Back from the project goes to the dashboard, not the wizard', async () => {
  const div = await mount();
  await click(div, 'new');
  expect(div.textContent).toContain('WIZARD');
  await click(div, 'finish');
  expect(div.textContent).toContain('PROJECT Fresh');
  await back();
  expect(div.textContent).toContain('DASHBOARD');
  expect(div.textContent).not.toContain('WIZARD');
});
