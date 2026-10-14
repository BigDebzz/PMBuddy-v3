import crypto from 'crypto';
import { sha256, appendEntries, verifyHistory, describeChanges, entriesForSave } from './historyLog';

const node = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

describe('sha256', () => {
  test('matches the standard result', () => {
    ['', 'abc', 'PM Buddy', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(200), 'Café, naïve, 日本語 and an emoji 🙂'].forEach(s => {
      expect(sha256(s)).toBe(node(s));
    });
  });
});

describe('the chain', () => {
  const base = appendEntries([], [{ type: 'a', label: 'One' }, { type: 'b', label: 'Two', detail: 'x' }], 'Debbie', '2026-10-12T10:00:00.000Z');

  test('a fresh history is intact', () => {
    expect(base).toHaveLength(2);
    expect(verifyHistory(base).ok).toBe(true);
    const more = appendEntries(base, [{ type: 'c', label: 'Three' }], 'Ada', '2026-10-12T11:00:00.000Z');
    expect(verifyHistory(more)).toMatchObject({ ok: true, checked: 3 });
  });

  test('editing an entry is noticed', () => {
    const t = base.map((e, i) => (i === 0 ? { ...e, label: 'Changed' } : e));
    expect(verifyHistory(t).ok).toBe(false);
  });

  test('removing an entry from the middle is noticed', () => {
    const more = appendEntries(base, [{ type: 'c', label: 'Three' }], 'Ada');
    const t = more.filter((_, i) => i !== 1);
    expect(verifyHistory(t).ok).toBe(false);
  });

  test('adding an entry without a fingerprint is noticed', () => {
    expect(verifyHistory([...base, { type: 'x', label: 'Sneaky' }]).ok).toBe(false);
  });

  test('older entries from before the chain are left alone', () => {
    const old = [{ type: 'task_added', label: 'Task added', timestamp: '2026-01-01T00:00:00Z' }];
    const mixed = appendEntries(old, [{ type: 'a', label: 'New' }], 'Debbie');
    expect(verifyHistory(mixed).ok).toBe(true);
  });
});

describe('what changed', () => {
  const prev = {
    tasks: [{ id: '1', title: 'Book venue', status: 'todo', assignee: '', dueDate: '', notes: '', isBlocker: false }],
    milestones: [{ title: 'Launch', date: '2026-11-01', status: 'pending' }],
    risks: [{ title: 'Weather', level: 'high', status: 'open' }],
    scope: { goal: 'Feed 500 families', boardNotes: [] },
  };

  test('a task move, a note and a blocker are each recorded', () => {
    const next = { tasks: [{ ...prev.tasks[0], status: 'in_progress', notes: 'Waiting on the church', isBlocker: true }] };
    const labels = describeChanges(prev, next).map(e => e.label);
    expect(labels).toEqual(expect.arrayContaining(['Task moved to In Progress', 'Task flagged as blocker', 'Note added to task']));
  });

  test('milestones, risks and notes are recorded', () => {
    expect(describeChanges(prev, { milestones: [{ ...prev.milestones[0], status: 'done' }] })[0].label).toBe('Milestone moved to Done');
    expect(describeChanges(prev, { risks: [{ ...prev.risks[0], status: 'mitigated' }] })[0].label).toBe('Risk marked as handled');
    const n = describeChanges(prev, { scope: { ...prev.scope, boardNotes: [{ id: 'n1', text: 'Agreed Friday', taskId: '1' }] } });
    expect(n[0].label).toBe('Note added to a task');
    expect(n[0].detail).toContain('Book venue');
  });

  test('remembering when an invitation was sent is not history', () => {
    const next = { scope: { ...prev.scope, inviteSent: { 'ada@x.org': { last: '2026-10-14T09:00:00Z', count: 2 } } } };
    expect(describeChanges(prev, next)).toHaveLength(0);
  });

  test('suggested tasks waiting for review are not history', () => {
    const next = { scope: { ...prev.scope, suggestedTasks: [{ id: 's1', title: 'x' }] } };
    expect(describeChanges(prev, next)).toHaveLength(0);
  });

  test('nothing is recorded when nothing changed', () => {
    expect(describeChanges(prev, { tasks: prev.tasks, milestones: prev.milestones })).toHaveLength(0);
    expect(entriesForSave(prev, {}, null)).toHaveLength(0);
  });

  test('the silent / team answer is kept on a milestone move', () => {
    const e = entriesForSave(prev, { milestones: [{ ...prev.milestones[0], status: 'done' }] }, { type: 'milestone_moved', notified: 'silent' });
    expect(e[0].notified).toBe('silent');
  });

  test('adding information is one entry', () => {
    const e = entriesForSave(prev, { tasks: [] }, { type: 'info_added', label: 'New information added', detail: 'x' });
    expect(e).toHaveLength(1);
  });
});
