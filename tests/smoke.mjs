import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fixture } from './fixture.mjs';

const f = await fixture('smoke');
try {
  console.log('Local fixture smoke: mock tone narration only; no paid APIs. Draft render may use CPU/GPU for up to 10 minutes.');
  const first = await f.cli('run.mjs', ['--render', '--draft'], { timeout: 720000, echo: true });
  assert.match(first.output, /Video:/);
  assert.doesNotMatch(first.output, /OFFLINE_DENIED/);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.dir, 'run-manifest.json')));
  for (const phase of ['validate', 'capture', 'voice', 'build', 'lint', 'snapshots', 'render']) assert.equal(manifest.phases[phase].status, 'complete');
  const requests = f.requests.length;
  const resume = await f.cli('run.mjs', ['--resume', '--render', '--draft']);
  assert.match(resume.output, /render: reused/); assert.equal(f.requests.length, requests);
  fs.appendFileSync(path.join(f.dir, 'states/start.json'), ' ');
  await assert.rejects(f.cli('run.mjs', ['--resume']), /Process failed/);
  console.log('Smoke artifacts:', f.dir);
} finally { await f.close(); }
