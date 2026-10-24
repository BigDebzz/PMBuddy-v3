// What a beginner sees: one calm thing at a time. Nothing opens by itself.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

jest.mock('./lib/supabase', () => {
  const chain = () => { const c = {}; ['from', 'select', 'eq', 'order', 'limit', 'delete', 'single', 'maybeSingle', 'in', 'insert', 'update', 'upsert'].forEach(k => { c[k] = () => c; }); c.then = (r) => r({ data: [], count: 0, error: null }); return c; };
  return { supabase: { ...chain(), auth: { getSession: async () => ({ data: { session: null } }) } } };
});

global.IS_REACT_ACT_ENVIRONMENT = true;
window.HTMLElement.prototype.scrollIntoView = function () {};
const setWidth = (narrow) => { window.matchMedia = (q) => ({ matches: /max-width/.test(q) ? narrow : false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }); };
const flush = async (ms = 20) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const mount = async (el) => { const div = document.createElement('div'); document.body.appendChild(div); await act(async () => { createRoot(div).render(el); }); await flush(); await flush(); return div; };
const btn = (root, t) => Array.from(root.querySelectorAll('button')).find(b => b.textContent.trim().includes(t));
const click = async (el) => { await act(async () => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); await flush(); };

beforeEach(() => { document.body.innerHTML = ''; localStorage.clear(); });

describe('the assistant', () => {
  const Assistant = require('./components/PMBuddyAssistant').default;
  const project = { id: 'p1', name: 'Youth training', scope: { goal: 'Train 100' }, tasks: [], milestones: [], risks: [] };

  test('never opens the chat by itself, only shows a small hint', async () => {
    setWidth(true);
    jest.useFakeTimers();
    const div = document.createElement('div'); document.body.appendChild(div);
    await act(async () => { createRoot(div).render(<Assistant project={project} />); });
    await act(async () => { jest.advanceTimersByTime(12000); });
    jest.useRealTimers(); await flush(30);
    expect(div.textContent).toContain('Need a hand? Ask PM Buddy');
    expect(div.querySelector('textarea')).toBeNull();         // no chat panel
    // closing the hint remembers it
    await click(div.querySelector('button[aria-label="Hide this hint"]'));
    expect(div.textContent).not.toContain('Need a hand?');
    expect(localStorage.getItem('pmb-assistant-hint-p1')).toBe('1');
  });

  test('tapping the hint opens the chat', async () => {
    setWidth(true);
    jest.useFakeTimers();
    const div = document.createElement('div'); document.body.appendChild(div);
    await act(async () => { createRoot(div).render(<Assistant project={project} />); });
    await act(async () => { jest.advanceTimersByTime(12000); });
    jest.useRealTimers(); await flush(30);
    await click(btn(div, 'Need a hand'));
    expect(div.querySelector('textarea')).not.toBeNull();
  });
});

describe('the "what to do next" card', () => {
  const NextSteps = require('./components/NextSteps').default;
  const project = { id: 'p1' };
  const data = { tasks: [] };

  test('on a phone it is one line, and opens when tapped', async () => {
    setWidth(true);
    const div = await mount(<NextSteps data={data} project={project} onTab={() => {}} onReport={() => {}} version={0} />);
    expect(div.textContent).toContain('Next step');
    expect(div.textContent).toContain('Add your first tasks');
    expect(div.textContent).not.toContain('Invite the people on this project');
    await click(btn(div, 'Add your first tasks'));
    expect(div.textContent).toContain('Invite the people on this project');
    await click(btn(div, 'Fold up'));
    expect(div.textContent).not.toContain('Invite the people on this project');
  });

  test('on a wide screen with nothing done yet it starts open', async () => {
    setWidth(false);
    const div = await mount(<NextSteps data={data} project={project} onTab={() => {}} onReport={() => {}} version={0} />);
    expect(div.textContent).toContain('Invite the people on this project');
  });
});

describe('suggested tasks on a phone', () => {
  const SuggestedTasks = require('./components/SuggestedTasks').default;
  const data = { tasks: [], milestones: [], scope: { suggestedTasks: [{ id: 's1', title: 'Create the platform', milestone: null, dueDate: '2026-11-10' }, { id: 's2', title: 'Write the curriculum', milestone: null, dueDate: '2026-11-12' }] } };

  test('folded to one line, with a Review button', async () => {
    setWidth(true);
    const div = await mount(<SuggestedTasks data={data} onSave={() => {}} />);
    expect(div.textContent).toContain('PM Buddy suggests 2 tasks');
    expect(div.textContent).not.toContain('Create the platform');
    await click(btn(div, 'Review'));
    expect(div.textContent).toContain('Create the platform');
    expect(div.textContent).toContain('Add all 2');
  });

  test('on a wide screen the list is already open', async () => {
    setWidth(false);
    const div = await mount(<SuggestedTasks data={data} onSave={() => {}} />);
    expect(div.textContent).toContain('Create the platform');
  });

  test('the dates bar is short on a phone', async () => {
    setWidth(true);
    const d = { tasks: [{ id: 't1', title: 'A', status: 'todo', dueDate: '' }], milestones: [], scope: {} };
    const div = await mount(<SuggestedTasks data={d} onSave={() => {}} />);
    expect(div.textContent).toContain('1 task needs a date');
    expect(btn(div, 'Fix dates')).toBeTruthy();
  });
});
