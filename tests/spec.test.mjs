import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeSpec, validateProjectPaths } from '../scripts/spec.mjs';

export const fixture = () => ({ title: 'Local test', app: { url: 'http://127.0.0.1:4123' }, states: [{ name: 'start' }], steps: [{ id: 'one', state: 'start', kind: 'none' }] });
test('legacy normalization does not change source', () => {
  const raw = fixture();
  assert.equal(normalizeSpec(raw).version, 1);
  assert.equal(raw.version, undefined);
});
test('reject unsupported versions, references, malformed actions and unsafe names', () => {
  for (const change of [s => s.version = 2, s => s.output = '../escape', s => s.steps[0].state = 'missing', s => s.steps[0].id = 'intro', s => s.app.width = Infinity, s => s.states[0].actions = [{ fill: 'css:input' }], s => s.states[0].actions = [{ wait: -1 }]]) {
    const s = fixture(); change(s); assert.throws(() => normalizeSpec(s));
  }
});
test('existing output symlinks cannot escape project', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-spec-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'ht-out-'));
  try {
    try { fs.symlinkSync(outside, path.join(dir, 'states'), 'junction'); }
    catch (error) { if (error.code === 'EPERM') { t.skip('Sandbox cannot create junctions'); return; } throw error; }
    assert.throws(() => validateProjectPaths(dir, normalizeSpec(fixture())), /contained|symlink/i);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});
