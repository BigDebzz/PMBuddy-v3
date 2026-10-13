import { buildSuggestionPrompt, parseSuggestions, suggestionToTask, fillDates } from './taskSuggestions';

const project = {
  name: 'Youth training',
  industry: 'Education',
  scope: { goal: 'Train 100 people in three months', deliverables: ['Curriculum'] },
  timeline: { start: '2026-11-01', end: '2027-01-31' },
  milestones: [{ title: '30 people trained', date: '2026-11-30' }, { title: '65 people trained', date: '2026-12-31' }],
  tasks: [{ id: '1', title: 'Book the venue' }],
  team: [{ name: 'Ada' }],
};

describe('the prompt', () => {
  const p = buildSuggestionPrompt(project, new Date('2026-10-13T10:00:00Z'));
  test('carries the goal, dates and milestones', () => {
    expect(p).toContain('Train 100 people in three months');
    expect(p).toContain('TODAY: 2026-10-13');
    expect(p).toContain('30 people trained (due 2026-11-30)');
    expect(p).toContain('Book the venue');
  });
  test('says tasks are not milestones and not to invent facts', () => {
    expect(p).toMatch(/never suggest a milestone as a task/);
    expect(p).toMatch(/Do not invent/);
  });
  test('copes with an empty project', () => {
    expect(() => buildSuggestionPrompt({}, new Date())).not.toThrow();
  });
});

describe('reading the reply', () => {
  const reply = '```json\n' + JSON.stringify({
    tasks: [
      { title: 'Create the training platform', milestone: '30 people trained', due_date: '2026-11-10' },
      { title: 'book the venue', milestone: null, due_date: null },
      { title: 'Write the curriculum', milestone: '30 PEOPLE TRAINED', due_date: 'next week' },
      { title: 'Plan funding', milestone: 'A milestone that does not exist', due_date: '2026-12-01' },
      { title: '', milestone: null },
      42,
    ],
  }) + '\n```';

  const out = parseSuggestions(reply, project, 1000, new Date('2026-10-13T10:00:00Z'));
  test('keeps good tasks, drops repeats and blanks', () => {
    expect(out.map(t => t.title)).toEqual(['Create the training platform', 'Write the curriculum', 'Plan funding']);
  });
  test('matches milestones by title and clears unknown ones', () => {
    expect(out[0].milestone).toBe('30 people trained');
    expect(out[1].milestone).toBe('30 people trained');
    expect(out[2].milestone).toBeNull();
  });
  test('keeps a good date and fills a missing one', () => {
    expect(out[0].dueDate).toBe('2026-11-10');
    expect(out[1].dueDate).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
    expect(out.every(t => t.dueDate)).toBe(true);
  });
  test('bad replies give nothing', () => {
    expect(parseSuggestions('sorry I cannot', project)).toEqual([]);
    expect(parseSuggestions('{"tasks": "no"}', project)).toEqual([]);
    expect(parseSuggestions('', project)).toEqual([]);
  });
  test('an accepted suggestion becomes a task linked to its milestone', () => {
    const t = suggestionToTask(out[0], project.milestones, new Date('2026-10-13T10:00:00Z'));
    expect(t).toMatchObject({ title: 'Create the training platform', status: 'todo', milestoneId: '0', dueDate: '2026-11-10', isBlocker: false });
    expect(suggestionToTask(out[2], project.milestones).milestoneId).toBe('');
  });
});

describe('dates for suggestions', () => {
  const today = new Date(2026, 9, 13);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const mk = (n, milestone) => Array.from({ length: n }, (_, i) => ({ id: `${milestone || 'g'}-${i}`, title: `Task ${i}`, milestone, dueDate: '' }));

  test('tasks towards a milestone fall between today and its date, in order', () => {
    const dates = fillDates(mk(4, '30 people trained'), project, today).map(t => t.dueDate);
    expect(dates.every(d => d >= iso(today) && d <= '2026-11-30')).toBe(true);
    expect([...dates].sort()).toEqual(dates);
  });

  test('tasks for a later milestone start after the earlier milestone', () => {
    const out = fillDates(mk(3, '65 people trained'), project, today);
    expect(out.every(t => t.dueDate > '2026-11-30' && t.dueDate <= '2026-12-31')).toBe(true);
  });

  test('general tasks are spread across the project window', () => {
    const out = fillDates(mk(3, null), project, today);
    expect(out.every(t => t.dueDate >= '2026-11-01' && t.dueDate <= '2027-01-31')).toBe(true);
    expect(new Set(out.map(t => t.dueDate)).size).toBe(3);
  });

  test('no weekends, nothing before today', () => {
    const out = fillDates([...mk(6, '30 people trained'), ...mk(6, null)], project, today);
    out.forEach(t => {
      const [y, m, d] = t.dueDate.split('-').map(Number);
      const day = new Date(y, m - 1, d).getDay();
      expect(day === 0 || day === 6).toBe(false);
      expect(t.dueDate >= iso(today)).toBe(true);
    });
  });

  test('works with no timeline and no milestone dates', () => {
    const bare = { name: 'X', milestones: [{ title: 'Pilot' }] };
    const out = fillDates(mk(3, 'Pilot'), bare, today);
    expect(out.every(t => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.dueDate) && t.dueDate >= iso(today))).toBe(true);
  });

  test('a milestone already past still gives future dates', () => {
    const past = { milestones: [{ title: 'Old', date: '2026-09-01' }] };
    const out = fillDates(mk(2, 'Old'), past, today);
    expect(out.every(t => t.dueDate >= iso(today))).toBe(true);
  });

  test('a valid date from the AI is kept', () => {
    const out = fillDates([{ id: 'a', title: 'x', milestone: null, dueDate: '2026-11-20' }], project, today);
    expect(out[0].dueDate).toBe('2026-11-20');
  });
});
