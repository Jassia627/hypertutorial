import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fixture } from './fixture.mjs';

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
