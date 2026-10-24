// The dashboard home: short on a phone, with the details folded away until asked for.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

const mockTables = { pm_projects: [], documents: [], projects: [], project_members: [] };
jest.mock('./lib/supabase', () => {
  const make = (table) => { const c = {}; ['select', 'eq', 'order', 'limit', 'delete', 'single', 'maybeSingle', 'in', 'insert', 'update', 'upsert', 'neq', 'is'].forEach(k => { c[k] = () => c; }); c.then = (r) => r({ data: mockTables[table] || [], error: null, count: 0 }); return c; };
  return { supabase: { from: (t) => make(t), auth: { getSession: async () => ({ data: { session: null } }), updateUser: async () => ({}) } } };
});

global.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = (q) => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
const Dashboard = require('./components/Dashboard').default;
const user = { id: 'u1', email: 'ada@x.org', user_metadata: { first_name: 'Ada' } };
const flush = async (ms = 20) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const mount = async (width) => {
  window.innerWidth = width;
  const div = document.createElement('div'); document.body.appendChild(div);
  await act(async () => { createRoot(div).render(<Dashboard user={user} onOpenProject={() => {}} onNewProject={() => {}} onNewValidation={() => {}} onNewCampaign={() => {}} onNewQuickDoc={() => {}} onOpenValidation={() => {}} onLogout={() => {}} />); });
  await flush(); await flush(); return div;
};
const btn = (root, t) => Array.from(root.querySelectorAll('button')).find(b => b.textContent.trim().includes(t));
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); await flush(); };
const project = (i) => ({ id: 'p' + i, name: 'Project ' + i, industry: 'Education', description: 'A long description that used to take up room', milestones: [{ status: 'done' }, { status: 'pending' }], tasks: [{ status: 'todo' }], risks: [], timeline: {} });

beforeEach(() => { document.body.innerHTML = ''; localStorage.clear(); sessionStorage.clear(); mockTables.pm_projects = []; mockTables.documents = []; });

test('phone, brand new person: getting started and profile are one slim line each', async () => {
  const div = await mount(390);
  expect(div.textContent).toContain('Getting started');
  expect(div.textContent).toContain('1 of 5 done');
  expect(div.textContent).toContain('Tell us about you');
  expect(div.textContent).not.toContain('Complete these steps to get the most out of the platform');
  expect(div.textContent).not.toContain('Here is where your work lives');
  expect(div.textContent).toContain('New Project');            // the big actions stay for someone with no projects
  await click(btn(div, 'Show'));
  expect(div.textContent).toContain('Complete these steps to get the most out of the platform');
  await click(btn(div, 'Fold up'));
  expect(div.textContent).not.toContain('Complete these steps to get the most out of the platform');
});

test('phone, with projects: slim rows, small counts, no extra action cards', async () => {
  mockTables.pm_projects = [project(1), project(2), project(3)];
  const div = await mount(390);
  expect(div.textContent).toContain('Your projects');
  expect(div.textContent).toContain('Project 1');
  expect(div.textContent).toContain('1/2 milestones');
  expect(div.textContent).not.toContain('A long description that used to take up room');
  expect(div.textContent).not.toContain('Quick actions');
  expect(div.textContent).toContain('3 projects');
});

test('wide screen keeps the fuller layout', async () => {
  mockTables.pm_projects = [project(1)];
  const div = await mount(1200);
  expect(div.textContent).toContain('Here is where your work lives');
  expect(div.textContent).toContain('Quick actions');
  expect(div.textContent).toContain('A long description that used to take up room');
});

test('wide screen, brand new person: the getting started list is open', async () => {
  const div = await mount(1200);
  expect(div.textContent).toContain('Complete these steps to get the most out of the platform');
});
