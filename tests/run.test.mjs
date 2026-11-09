import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprint, outputHashes, reusable, privateProjection } from '../scripts/run-manifest.mjs';

test('hashes are deterministic and credentials are excluded rather than hashed', () => {
  assert.equal(fingerprint({ b: 2, a: 1 }), fingerprint({ a: 1, b: 2 }));
  const base = { login: { steps: [{ fill: 'css:input', value: 'weak-password' }] }, password: 'secret', app: { url: 'http://localhost' } };
  const projected = privateProjection(base);
  assert.ok(!JSON.stringify(projected).includes('weak-password'));
  assert.equal(fingerprint(projected), fingerprint(privateProjection({ ...base, password: 'changed', login: { steps: [{ fill: 'css:input', value: 'changed' }] } })));
});
test('resume verifies output hashes, missing and tampered files invalidate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-manifest-'));
  try {
    fs.writeFileSync(path.join(dir, 'artifact'), 'valid');
    const record = { status: 'complete', input: 'input', outputs: outputHashes(dir, ['artifact']) };
    assert.equal(reusable(dir, record, 'input'), true);
    assert.equal(reusable(dir, record, 'changed'), false);
    fs.writeFileSync(path.join(dir, 'artifact'), 'tampered');
    assert.equal(reusable(dir, record, 'input'), false);
    fs.unlinkSync(path.join(dir, 'artifact'));
    assert.equal(reusable(dir, record, 'input'), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
