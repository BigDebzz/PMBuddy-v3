import { cleanNames, taskAssignees, withAssignees, toggleName, initials, projectPeople, emailFor, newlyAssigned } from './assignees';

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


describe('projectPeople', () => {
  const data = { team: [{ name: 'Ada Obi', role: 'Lead', email: 'ada@x.org' }, { name: 'Tunde Bello', role: 'Field' }] };
  test('joins the named team, accepted members and the owner without repeats', () => {
    const people = projectPeople(data, [{ email: 'ADA@x.org' }, { email: 'chi@x.org' }], { name: 'Debbie', email: 'debbie@x.org' });
    expect(people.map(p => p.name)).toEqual(['Ada Obi', 'Tunde Bello', 'chi@x.org', 'Debbie']);
    expect(people[0].email).toBe('ada@x.org');
    expect(people[1].email).toBe('');
  });
});

describe('emailFor', () => {
  const people = [{ name: 'Ada Obi', email: 'ada@x.org' }, { name: 'Tunde', email: '' }];
  test('only returns an address for accepted people', () => {
    expect(emailFor('ada obi', people, ['ada@x.org'])).toBe('ada@x.org');
    expect(emailFor('Ada Obi', people, [])).toBe('');
    expect(emailFor('Tunde', people, ['ada@x.org'])).toBe('');
    expect(emailFor('Nobody', people, ['ada@x.org'])).toBe('');
  });
});

describe('newlyAssigned', () => {
  test('lists only people who were added', () => {
    const prev = [{ id: '1', title: 'A', assignee: 'Ada' }, { id: '2', title: 'B', assignee: '' }];
    const next = [{ id: '1', title: 'A', assignee: 'Ada, Tunde' }, { id: '2', title: 'B', assignee: '' }, { id: '3', title: 'C', assignee: 'Chi' }];
    const r = newlyAssigned(prev, next);
    expect(r.map(x => [x.task.id, x.names])).toEqual([['1', ['Tunde']], ['3', ['Chi']]]);
  });
  test('no change means nobody to tell', () => {
    const t = [{ id: '1', assignee: 'Ada' }];
    expect(newlyAssigned(t, t)).toEqual([]);
  });
});
