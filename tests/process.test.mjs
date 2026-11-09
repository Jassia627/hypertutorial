import test from 'node:test';
import assert from 'node:assert/strict';
import { runProcess, isGpuStartupFailure } from '../scripts/process.mjs';

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
