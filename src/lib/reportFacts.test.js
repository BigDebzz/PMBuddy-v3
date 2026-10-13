import { buildFacts, buildPrompt, FUNDER_STYLES } from './reportFacts';

const data = {
  name: 'Youth training',
  scope: { goal: 'Train 100 people in three months' },
  timeline: { start: '2026-08-01', end: '2026-10-31' },
  milestones: [{ title: '30 people trained', date: '2026-09-01', status: 'done', completedAt: '2026-09-01T10:00:00Z' }],
  tasks: [{ id: '1', title: 'Create the platform', status: 'done', completedAt: '2026-08-20T10:00:00Z', createdAt: '2026-08-01T10:00:00Z' }],
  risks: [],
  team: [],
  history: [],
};
const facts = buildFacts(data, '2026-08-01', '2026-09-30', new Date('2026-10-13T10:00:00Z'));
const base = { start: '2026-08-01', end: '2026-09-30', preparedBy: 'Debbie', preparedFor: '', keyFigures: '', notes: '' };

describe('funder report prompt', () => {
  const funding = { funder: 'Ford Foundation', purpose: 'Train 100 young people', amount: '$20,000 for 12 months', objectives: 'Train 100 people, target 100', template: '' };

  test('is detailed and ties progress to the purpose of the funding', () => {
    const p = buildPrompt('funder', facts, { ...base, funding }, new Date('2026-10-13T10:00:00Z'));
    expect(p).toMatch(/900 to 1,200 words/);
    expect(p).toMatch(/moves the project towards the funding purpose/);
    expect(p).toContain('FUNDER: Ford Foundation');
    expect(p).toContain('WHAT THE FUNDING IS FOR: Train 100 young people');
    expect(p).toContain('Train 100 people, target 100');
    expect(p).toContain('PREPARED FOR: Ford Foundation');
  });

  test('never lets the AI invent figures', () => {
    const p = buildPrompt('funder', facts, { ...base, funding });
    expect(p).toMatch(/NEVER invent numbers/);
    expect(p).toMatch(/\[Add amount spent\]/);
  });

  test('each style adds its own note', () => {
    expect(FUNDER_STYLES.map(s => s.id)).toEqual(['standard', 'foundation', 'government', 'corporate', 'own']);
    expect(buildPrompt('funder', facts, { ...base, funding, funderStyle: 'foundation' })).toMatch(/foundation grant report/);
    expect(buildPrompt('funder', facts, { ...base, funding, funderStyle: 'government' })).toMatch(/ministry report/);
    expect(buildPrompt('funder', facts, { ...base, funding, funderStyle: 'corporate' })).toMatch(/CSR/);
  });

  test("the funder's own template is followed when pasted", () => {
    const template = '1. Summary of progress\n2. Results and indicators\n3. Financial summary';
    const p = buildPrompt('funder', facts, { ...base, funding: { ...funding, template }, funderStyle: 'own' });
    expect(p).toMatch(/follow the FUNDER'S OWN TEMPLATE/);
    expect(p).toContain('2. Results and indicators');
  });

  test('the own-template option without a template falls back to the standard report', () => {
    const p = buildPrompt('funder', facts, { ...base, funding, funderStyle: 'own' });
    expect(p).not.toMatch(/follow the FUNDER'S OWN TEMPLATE/);
  });

  test('other report types are untouched', () => {
    const p = buildPrompt('team', facts, base);
    expect(p).not.toContain('FUNDING DETAILS');
  });

  test('time taken per task is in the facts', () => {
    expect(facts.text).toMatch(/TIME TAKEN/);
  });
});
