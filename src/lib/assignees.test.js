import { cleanNames, taskAssignees, withAssignees, toggleName, initials } from './assignees';

describe('cleanNames', () => {
  test('trims, removes blanks and repeats', () => {
    expect(cleanNames([' Ada ', '', 'ada', 'Tunde  Bello', null])).toEqual(['Ada', 'Tunde Bello']);
  });
});

describe('taskAssignees', () => {
  test('reads the list when it matches the text', () => {
    expect(taskAssignees({ assignee: 'Ada, Tunde', assignees: ['Ada', 'Tunde'] })).toEqual(['Ada', 'Tunde']);
  });
  test('reads older tasks that only have the text', () => {
    expect(taskAssignees({ assignee: 'Ada' })).toEqual(['Ada']);
    expect(taskAssignees({ assignee: 'Ada, Tunde and Chi' })).toEqual(['Ada', 'Tunde', 'Chi']);
    expect(taskAssignees({})).toEqual([]);
  });
  test('the text wins when something else changed it', () => {
    expect(taskAssignees({ assignee: 'Chi', assignees: ['Ada', 'Tunde'] })).toEqual(['Chi']);
  });
  test('an empty text clears the list', () => {
    expect(taskAssignees({ assignee: '', assignees: ['Ada'] })).toEqual([]);
  });
});

describe('withAssignees', () => {
  test('keeps the list and the text in step', () => {
    const t = withAssignees({ id: '1', title: 'Book venue', assignee: 'Ada' }, ['Ada', 'Tunde']);
    expect(t.assignees).toEqual(['Ada', 'Tunde']);
    expect(t.assignee).toBe('Ada, Tunde');
    expect(t.title).toBe('Book venue');
  });
  test('can clear everyone', () => {
    expect(withAssignees({ assignee: 'Ada', assignees: ['Ada'] }, [])).toMatchObject({ assignees: [], assignee: '' });
  });
});

describe('toggleName', () => {
  test('adds and removes, ignoring case', () => {
    expect(toggleName(['Ada'], 'Tunde')).toEqual(['Ada', 'Tunde']);
    expect(toggleName(['Ada', 'Tunde'], 'ada')).toEqual(['Tunde']);
  });
});

describe('initials', () => {
  test('first and last initial', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Tunde')).toBe('TU');
    expect(initials('')).toBe('?');
  });
});
