import { buildSuggestionPrompt, parseSuggestions, suggestionToTask } from './taskSuggestions';

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

  const out = parseSuggestions(reply, project, 1000);
  test('keeps good tasks, drops repeats and blanks', () => {
    expect(out.map(t => t.title)).toEqual(['Create the training platform', 'Write the curriculum', 'Plan funding']);
  });
  test('matches milestones by title and clears unknown ones', () => {
    expect(out[0].milestone).toBe('30 people trained');
    expect(out[1].milestone).toBe('30 people trained');
    expect(out[2].milestone).toBeNull();
  });
  test('only keeps real dates', () => {
    expect(out[0].dueDate).toBe('2026-11-10');
    expect(out[1].dueDate).toBe('');
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
