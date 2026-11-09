// Runs the skill's HyperFrames CLI inside <project>/hf.
// Usage: node hf.mjs <project dir> lint | snapshot --at 3,10 | render [--draft]
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { SKILL, loadProject } from './common.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const [cmd, ...rest] = process.argv.slice(3);
const pkg = JSON.parse(fs.readFileSync(path.join(SKILL, 'node_modules/hyperframes/package.json'), 'utf8'));
const bin = path.join(SKILL, 'node_modules/hyperframes', typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.hyperframes);
const out = path.join(dir, (spec.output ?? 'tutorial') + '.mp4');
const args = cmd === 'render'
  ? ['render', '--quality', rest.includes('--draft') ? 'draft' : 'high', '--fps', '30', '--gpu', '--output', out]
  : cmd === 'snapshot' ? ['snapshot', ...rest, '--no-end', '--timeout', '20000', '-o', path.join(dir, 'snaps')]
  : [cmd, ...rest];
const r = spawnSync(process.execPath, [bin, ...args], {
  cwd: path.join(dir, 'hf'), stdio: 'inherit',
  env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: '1', HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' },
});
let status = r.status ?? 0;
if (status !== 0 && cmd === "render") {
  console.log('Reintentando sin GPU…');
  status = spawnSync(process.execPath, [bin, ...args.filter((a) => a !== "--gpu")], { cwd: path.join(dir, "hf"), stdio: "inherit" }).status ?? 1;
}
if (cmd === 'render') console.log('Video:', out);
process.exit(status);
