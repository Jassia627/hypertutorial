import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess, isGpuStartupFailure } from '../scripts/process.mjs';
import { renameWithRetry } from '../scripts/paths.mjs';

test('launch, status and timeout failures cannot look successful', async () => {
  await assert.rejects(runProcess('nonexistent-hypertutorial-command', []), /launch/i);
  await assert.rejects(runProcess(process.execPath, ['-e', 'process.exit(7)']), /exit 7/i);
  await assert.rejects(runProcess(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { timeout: 30 }), /timeout/i);
});
test('abort does not mark child successful', async () => {
  const controller = new AbortController();
  const promise = runProcess(process.execPath, ['-e', 'setTimeout(()=>{},10000)'], { signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, /cancel/i);
});
test('GPU fallback only recognizes startup errors, never generic render failures', () => {
  assert.equal(isGpuStartupFailure('Failed to initialize GPU device'), true);
  assert.equal(isGpuStartupFailure('Missing audio file'), false);
  assert.equal(isGpuStartupFailure('GPU frame 40 failed'), false);
});
test('Windows publication retries only bounded transient sharing failures', () => {
  let attempts = 0;
  renameWithRetry('source', 'target', { platform: 'win32', wait: () => {}, rename: () => { if (++attempts < 3) throw Object.assign(new Error('sharing'), { code: 'EPERM' }); } });
  assert.equal(attempts, 3);
  attempts = 0;
  assert.throws(() => renameWithRetry('source', 'target', { platform: 'win32', wait: () => {}, rename: () => { attempts++; throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } }));
  assert.equal(attempts, 1);
});
