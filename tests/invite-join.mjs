import fs from 'fs';
import path from 'path';
import assert from 'assert';

// Run with:  node tests/invite-join.mjs
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const helperCopy = path.join(here, '_invite-join.under-test.mjs');
fs.writeFileSync(helperCopy, fs.readFileSync(path.join(here, '..', 'api', '_invite-join.js'), 'utf8'));
const copy = path.join(here, 'invite.under-test.mjs');
fs.writeFileSync(copy, fs.readFileSync(path.join(here, '..', 'api', 'invite.js'), 'utf8').replace("'./_invite-join.js'", "'./_invite-join.under-test.mjs'"));

process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

// a tiny fake database
const db = {
  members: [
    { id: 1, project_id: 'p1', email: 'ada@x.org', role: 'editor', status: 'pending', token: 'tokenAda12345', user_id: null },
    { id: 2, project_id: 'p1', email: 'bola@x.org', role: 'viewer', status: 'accepted', token: 'tokenBola1234', user_id: 'u-bola' },
    { id: 3, project_id: 'p2', email: 'ada@x.org', role: 'editor', status: 'pending', token: 'tokenAda22222', user_id: null },
  ],
  projects: [{ id: 'p1', name: 'Youth training', description: 'Train 100', owner_email: 'o@x.org' }, { id: 'p2', name: 'Second', description: '' }],
  users: { 'jwt-ada': { id: 'u-ada', email: 'Ada@X.org' }, 'jwt-chi': { id: 'u-chi', email: 'chi@x.org' } },
};
const calls = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);
  calls.push([opts.method || 'GET', u.pathname + u.search]);
  const json = (v, status = 200) => ({ ok: status < 400, status, json: async () => v });
  if (u.pathname === '/auth/v1/user') {
    const jwt = (opts.headers.Authorization || '').replace('Bearer ', '');
    return db.users[jwt] ? json(db.users[jwt]) : json({}, 401);
  }
  if (u.pathname === '/rest/v1/project_members') {
    if ((opts.method || 'GET') === 'GET') {
      let rows = db.members;
      const t = u.searchParams.get('token'); if (t) rows = rows.filter(m => `eq.${m.token}` === t);
      const e = u.searchParams.get('email'); if (e) rows = rows.filter(m => `eq.${m.email}` === e);
      const s = u.searchParams.get('status'); if (s) rows = rows.filter(m => `eq.${m.status}` === s);
      return json(rows);
    }
    const id = Number(u.searchParams.get('id').replace('eq.', ''));
    const row = db.members.find(m => m.id === id);
    if (opts.method === 'PATCH') Object.assign(row, JSON.parse(opts.body));
    if (opts.method === 'DELETE') db.members = db.members.filter(m => m.id !== id);
    return json([]);
  }
  if (u.pathname === '/rest/v1/pm_projects') {
    const id = u.searchParams.get('id').replace('eq.', '');
    return json(db.projects.filter(p => p.id === id));
  }
  return json({}, 404);
};

const { default: handler } = await import('file:///' + copy.replace(/\\/g, '/'));
const call = async (body, jwt) => {
  let out = { status: 0, body: null };
  const res = { status(s) { out.status = s; return this; }, json(b) { out.body = b; return this; } };
  await handler({ method: 'POST', body, headers: jwt ? { authorization: 'Bearer ' + jwt } : {} }, res);
  return out;
};
const results = [];
const t = async (name, fn) => { try { await fn(); results.push('PASS ' + name); } catch (e) { results.push('FAIL ' + name + ' :: ' + e.message); } };

await t('info works without logging in', async () => {
  const r = await call({ action: 'info', token: 'tokenAda12345' });
  assert.equal(r.status, 200); assert.equal(r.body.projectName, 'Youth training'); assert.equal(r.body.email, 'ada@x.org'); assert.equal(r.body.role, 'editor');
});
await t('info for an unknown or malformed token is a clean 404', async () => {
  assert.equal((await call({ action: 'info', token: 'nope-nope-nope' })).status, 404);
  assert.equal((await call({ action: 'info', token: "x'; drop table--" })).status, 404);
  assert.equal((await call({ action: 'info' })).status, 404);
});
await t('info says when the invitation was already used', async () => {
  const r = await call({ action: 'info', token: 'tokenBola1234' });
  assert.equal(r.status, 200); assert.equal(r.body.accepted, true); assert.equal(r.body.email, undefined);
});
await t('accepting needs a login', async () => {
  assert.equal((await call({ action: 'accept', token: 'tokenAda12345' })).status, 401);
  assert.equal((await call({ action: 'accept', token: 'tokenAda12345' }, 'bad-jwt')).status, 401);
});
await t('a different email must confirm first, and nothing changes', async () => {
  const r = await call({ action: 'accept', token: 'tokenAda12345' }, 'jwt-chi');
  assert.equal(r.status, 409); assert.equal(r.body.needsConfirm, true);
  assert.equal(db.members[0].status, 'pending');
});
await t('the invited email (any capital letters) joins and gets the project back', async () => {
  const r = await call({ action: 'accept', token: 'tokenAda12345' }, 'jwt-ada');
  assert.equal(r.status, 200); assert.equal(r.body.project.name, 'Youth training');
  assert.equal(db.members[0].status, 'accepted'); assert.equal(db.members[0].user_id, 'u-ada');
});
await t('accepting twice is fine for the same person', async () => {
  const r = await call({ action: 'accept', token: 'tokenAda12345' }, 'jwt-ada');
  assert.equal(r.status, 200); assert.equal(r.body.already, true);
});
await t('someone else cannot use an invitation already taken', async () => {
  assert.equal((await call({ action: 'accept', token: 'tokenBola1234' }, 'jwt-chi')).status, 409);
});
await t('a different email can join after confirming', async () => {
  const r = await call({ action: 'accept', token: 'tokenAda22222', confirmDifferentEmail: true }, 'jwt-chi');
  assert.equal(r.status, 200); assert.equal(db.members.find(m => m.id === 3).user_id, 'u-chi');
});
await t('"mine" lists pending invitations for the logged-in email', async () => {
  db.members.push({ id: 9, project_id: 'p2', email: 'chi@x.org', role: 'editor', status: 'pending', token: 'tokenChi99999', user_id: null });
  const r = await call({ action: 'mine' }, 'jwt-chi');
  assert.equal(r.status, 200); assert.equal(r.body.invites.length, 1); assert.equal(r.body.invites[0].projectName, 'Second');
  assert.equal((await call({ action: 'mine' })).status, 401);
});
await t('declining removes only your own invitation', async () => {
  assert.equal((await call({ action: 'decline', token: 'tokenChi99999' }, 'jwt-ada')).status, 403);
  assert.equal((await call({ action: 'decline', token: 'tokenChi99999' }, 'jwt-chi')).status, 200);
  assert.equal(db.members.some(m => m.id === 9), false);
});
await t('the normal invite email still needs a login, and unknown actions fall through to it', async () => {
  assert.equal((await call({ email: 'x@x.org', projectId: 'p1', token: 'tokenNew12345' })).status, 401);
  assert.equal((await call({ action: 'delete-everything', token: 'tokenAda12345' }, 'jwt-ada')).status, 400);
});
await t('wrong methods are refused', async () => {
  let out = {}; await handler({ method: 'GET', headers: {} }, { status(s) { out.s = s; return this; }, json() { return this; } });
  assert.equal(out.s, 405);
});
console.log(results.join('\n'));
console.log(results.some(r => r.startsWith('FAIL')) ? '\nSOME FAILED' : '\nALL PASSED');
fs.unlinkSync(copy);
fs.unlinkSync(helperCopy);
