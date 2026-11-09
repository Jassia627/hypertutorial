import test from 'node:test';
import assert from 'node:assert/strict';
import { compilePolicy, permits, checkAction } from '../scripts/capture-policy.mjs';

const spec = () => ({ app: { url: 'http://127.0.0.1:4123' }, capturePolicy: { environment: 'isolated', origins: ['http://127.0.0.1:4123'], capture: [{ origin: 'http://127.0.0.1:4123', path: '/', method: 'GET', operation: 'read' }], auth: [] } });
test('capture requires explicit policy and exact channels', () => {
  assert.throws(() => compilePolicy({ app: { url: 'http://localhost' } }));
  const p = compilePolicy(spec());
  assert.equal(permits(p, 'capture', { url: 'http://127.0.0.1:4123/', method: 'GET' }), true);
  for (const request of [{ url: 'http://127.0.0.1:4123/', method: 'POST' }, { url: 'http://elsewhere/', method: 'GET' }, { url: 'http://127.0.0.1:4123/mutate', method: 'GET' }, { url: 'ws://127.0.0.1:4123/', method: 'GET' }]) assert.equal(permits(p, 'capture', request), false);
  assert.equal(permits(p, 'auth', { url: 'http://127.0.0.1:4123/', method: 'GET' }), false);
});
test('POST reads require a narrow operation and GraphQL documents reject mutation', () => {
  const s = spec(); s.capturePolicy.capture.push({ origin: s.app.url, path: '/graphql', method: 'POST', operation: 'read', operationName: 'Products', document: 'query Products { products { id } }' });
  const p = compilePolicy(s);
  const req = { url: s.app.url + '/graphql', method: 'POST', body: JSON.stringify({ operationName: 'Products', query: 'query Products { products { id } }' }) };
  assert.equal(permits(p, 'capture', req), true);
  assert.equal(permits(p, 'capture', { ...req, body: JSON.stringify({ operationName: 'Products', query: 'mutation Products { deleteAll }' }) }), false);
  assert.equal(permits(p, 'capture', { ...req, body: '[]' }), false);
});
test('eval and broad storage clearing are rejected', () => {
  const p = compilePolicy(spec());
  assert.throws(() => checkAction(p, { eval: 'fetch("/")' }));
  assert.throws(() => checkAction(p, { clearSessionStorage: '' }));
  assert.throws(() => checkAction(p, { clearSessionStorage: 'draft' }));
});
