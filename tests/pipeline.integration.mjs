import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture } from './fixture.mjs';

test('repeated refused resumes preserve capture replay consent and failed-capture history', { timeout: 180000 }, async () => {
  const f = await fixture('resume-consent');
  const saveSpec = () => fs.writeFileSync(path.join(f.dir, 'hypertutorial.json'), JSON.stringify(f.spec));
  const refuseTwice = async () => {
    const count = f.requests.length;
    for (let attempt = 0; attempt < 2; attempt++) {
      await assert.rejects(f.cli('run.mjs', ['--resume']), error => {
        assert.match(error.output, /--refresh-capture/);
        return true;
      });
      assert.equal(f.requests.length, count, 'refused resumes must never replay capture requests');
      const manifest = JSON.parse(fs.readFileSync(path.join(f.dir, 'run-manifest.json')));
      assert.ok(manifest.phases.capture, 'capture history must survive earlier phase saves');
    }
  };
  try {
    await f.cli('run.mjs');
    f.spec.states[0].actions = [{ wait: 0 }]; saveSpec();
    await refuseTwice();
    const beforeRefresh = f.requests.length;
    await f.cli('run.mjs', ['--resume', '--refresh-capture']);
    assert.ok(f.requests.length > beforeRefresh);
    const beforeReuse = f.requests.length;
    await f.cli('run.mjs', ['--resume']);
    assert.equal(f.requests.length, beforeReuse, 'unchanged resume still reuses capture');
    f.spec.app.start = '/missing'; saveSpec();
    await assert.rejects(f.cli('run.mjs', ['--resume', '--refresh-capture']));
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.dir, 'run-manifest.json'))).phases.capture.status, 'failed');
    await refuseTwice();
    f.spec.app.start = '/'; saveSpec();
    await refuseTwice();
  } finally { await f.close(); }
});

test('local CLI capture blocks writes, redacts exports, builds with mock voice, preserves last build', { timeout: 120000 }, async () => {
  const f = await fixture('integration');
  try {
    const before = fs.readdirSync(f.dir);
    const dry = await f.cli('run.mjs', ['--dry-run']);
    assert.match(dry.output, /Dry-run finished/);
    assert.deepEqual(fs.readdirSync(f.dir), before);
    await f.cli('capture.mjs');
    assert.equal(f.requests.filter(r => r.path === '/write').length, 0);
    const start = JSON.parse(fs.readFileSync(path.join(f.dir, 'states/start.json')));
    const done = JSON.parse(fs.readFileSync(path.join(f.dir, 'states/done.json')));
    for (const secret of ['fixture-password', 'fixture-token', 'PRIVATE FIXTURE PERSON']) assert.ok(!JSON.stringify(start).includes(secret));
    assert.match(done.css, /124, 20, 70/);
    assert.match(start.html, /aria-labelledby="identity"/);
    await f.cli('voice.mjs', ['--provider', 'mock']);
    const voiceFile = path.join(f.dir, 'voice/next.wav'); const mtime = fs.statSync(voiceFile).mtimeMs;
    await f.cli('voice.mjs', ['--provider', 'mock']); assert.equal(fs.statSync(voiceFile).mtimeMs, mtime);
    await f.cli('build.mjs');
    const built = fs.readFileSync(path.join(f.dir, 'hf/index.html'), 'utf8');
    fs.renameSync(path.join(f.dir, 'states/done.json'), path.join(f.dir, 'states/done.missing'));
    await assert.rejects(f.cli('build.mjs'));
    assert.equal(fs.readFileSync(path.join(f.dir, 'hf/index.html'), 'utf8'), built);
    assert.match(fs.readFileSync(path.join(f.dir, 'states/diagnostics.json'), 'utf8'), /request-denied/);
    f.spec.app.start = '/missing?token=fixture-query-secret';
    fs.writeFileSync(path.join(f.dir, 'hypertutorial.json'), JSON.stringify(f.spec));
    await assert.rejects(f.cli('capture.mjs'), error => { assert.doesNotMatch(error.output, /fixture-query-secret/); return true; });
    console.log('Fixture artifacts:', f.dir);
  } finally { await f.close(); }
});
