// HyperFrames checks/render with bounded failures and staged video publication.
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { SKILL, loadProject } from './common.mjs';
import { runProcess, isGpuStartupFailure } from './process.mjs';
import { containedPath } from './paths.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const [cmd, ...rest] = process.argv.slice(3);
if (!['lint', 'snapshot', 'render'].includes(cmd)) throw new Error('Use lint, snapshot or render');
const pkg = JSON.parse(fs.readFileSync(path.join(SKILL, 'node_modules/hyperframes/package.json'), 'utf8'));
const bin = path.join(SKILL, 'node_modules/hyperframes', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.hyperframes);
const out = containedPath(dir, spec.output + '.mp4');
const staged = containedPath(dir, `.ht-video-${crypto.randomUUID()}.mp4`);
const args = cmd === 'render'
  ? ['render', '--quality', rest.includes('--draft') ? 'draft' : 'high', '--fps', '30', '--gpu', '--output', staged]
  : cmd === 'snapshot' ? ['snapshot', ...rest, '--no-end', '--timeout', '20000', '-o', path.join(dir, 'snaps')]
  : [cmd, ...rest];
const env = { ...process.env, HYPERFRAMES_SKIP_SKILLS: '1', HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' };
const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
const options = { cwd: path.join(dir, 'hf'), env, signal: controller.signal, timeout: cmd === 'render' ? 600000 : 120000, echo: true };
try {
  try { await runProcess(process.execPath, [bin, ...args], options); }
  catch (error) {
    if (cmd !== 'render' || controller.signal.aborted || !isGpuStartupFailure(error.output ?? '')) throw error;
    console.log('Recognized GPU startup failure; retrying once on CPU.');
    await runProcess(process.execPath, [bin, ...args.filter(a => a !== '--gpu')], options);
  }
  if (cmd === 'render') {
    if (!fs.existsSync(staged) || fs.statSync(staged).size < 100) throw new Error('Render produced no valid video');
    const require = createRequire(import.meta.url);
    const probe = await runProcess(require('ffprobe-static').path, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', staged], { signal: controller.signal });
    const info = JSON.parse(probe.output);
    if (!(Number(info.format?.duration) > 0) || !info.streams?.some(s => s.codec_type === 'video')) throw new Error('Render artifact failed video validation');
    fs.renameSync(staged, out);
    console.log('Video:', out);
  }
} catch (error) { console.error(error.message); process.exitCode = controller.signal.aborted ? 130 : 1; }
finally {
  if (fs.existsSync(staged)) fs.unlinkSync(staged);
  process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
}
