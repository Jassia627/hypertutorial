// Phase-level resume only: browser action sequences are never resumed in-place.
import fs from 'node:fs';
import path from 'node:path';
import { SKILL, loadProject, readEnv } from './common.mjs';
import { compilePolicy, checkAction } from './capture-policy.mjs';
import { fingerprint, fileHash, privateProjection, outputHashes, reusable, saveManifest } from './run-manifest.mjs';
import { runProcess } from './process.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const flags = new Set(process.argv.slice(3));
for (const flag of flags) if (!['--dry-run', '--resume', '--render', '--draft', '--allow-paid', '--refresh-capture'].includes(flag)) throw new Error('Unknown run flag');
const policy = compilePolicy(spec);
for (const a of [...(spec.login?.steps ?? []), ...spec.states.flatMap(s => s.actions ?? [])]) checkAction(policy, a);
const env = readEnv();
const provider = spec.voice?.provider ?? env.HT_TTS_PROVIDER ?? 'mock';
const tools = fingerprint({ node: process.version, platform: process.platform, arch: process.arch,
  installed: Object.fromEntries(['playwright', 'hyperframes', 'gsap', 'ffmpeg-static', 'ffprobe-static'].map(name => [name, JSON.parse(fs.readFileSync(path.join(SKILL, 'node_modules', name, 'package.json'), 'utf8')).version])),
  files: Object.fromEntries(['package-lock.json', ...fs.readdirSync(path.join(SKILL, 'scripts')).filter(n => /\.(mjs|js)$/.test(n)).map(n => 'scripts/' + n)].map(n => [n, fileHash(path.join(SKILL, n))])) });
const manifestPath = path.join(dir, 'run-manifest.json');
let old;
if (flags.has('--resume') && fs.existsSync(manifestPath)) { old = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); if (old.version !== 1) throw new Error('Unsupported run manifest version'); }
// Preserve prior evidence before any phase save. In particular, validation must
// not erase the capture record that requires explicit authorization for replay.
const manifest = { version: 1, tools, phases: structuredClone(old?.phases ?? {}) };
const projected = privateProjection(spec);
const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
const phaseNames = ['validate', 'capture', 'voice', 'build', 'lint', 'snapshots', ...(flags.has('--render') ? ['render'] : [])];
const captureFiles = spec.states.flatMap(s => [`states/${s.name}.json`, `states/${s.name}.png`]).concat(['states/fonts.css', 'states/diagnostics.json']);
const voiceFiles = ['voice/voice.json', ...[['intro', spec.intro?.narration], ...spec.steps.map(s => [s.id, s.narration]), ['outro', spec.outro?.narration]].filter(([, t]) => t).map(([id]) => `voice/${id}.wav`)];
const buildFiles = ['hf/index.html', 'hf/gsap.min.js', 'hf/hyperframes.json', 'hf/audio', 'hf/states', 'hf/times.json', 'times.json'];
function inputFor(name) {
  const deps = name === 'build' ? ['capture', 'voice'] : ['lint', 'snapshots', 'render'].includes(name) ? ['build'] : [];
  const config = name === 'capture' ? { app: projected.app, login: projected.login, states: projected.states, policy: projected.capturePolicy }
    : name === 'voice' ? { provider, voice: projected.voice, language: projected.language, beats: [projected.intro?.narration, projected.steps.map(s => [s.id, s.narration]), projected.outro?.narration], setup: { voice: env.HT_TTS_VOICE, route: env.HT_TTS_ROUTE, language: env.HT_LANGUAGE } }
    : projected;
  return fingerprint({ tools, config, deps: deps.map(n => manifest.phases[n]?.outputs), draft: name === 'render' && flags.has('--draft') });
}
try {
  for (const name of phaseNames) {
    const input = inputFor(name);
    const previous = old?.phases?.[name];
    const authUnversioned = name === 'capture' && (spec.login || spec.states.some(s => s.actions?.some(a => a.eval || /password|token|secret|email|user/i.test(a.fill ?? '')))) && !policy.authRevision;
    const reuse = flags.has('--resume') && !authUnversioned && !(name === 'capture' && flags.has('--refresh-capture')) && reusable(dir, previous, input);
    if (flags.has('--dry-run')) { console.log(`${name}: ${reuse ? 'reuse verified outputs' : 'run (no side effects in dry-run)'}`); manifest.phases[name] = reuse ? previous : { input, status: 'planned', outputs: {} }; continue; }
    if (reuse) { manifest.phases[name] = previous; console.log(`${name}: reused verified outputs`); continue; }
    if (name === 'capture' && flags.has('--resume') && previous && !flags.has('--refresh-capture')) throw new Error('Capture is invalid/incomplete; use --refresh-capture to authorize replay from the beginning');
    if (name === 'voice' && provider !== 'mock' && !flags.has('--allow-paid')) throw new Error('Paid narration requires --allow-paid; no automatic paid retry');
    manifest.phases[name] = { status: 'running', input, outputs: {} }; saveManifest(dir, manifest);
    try {
      let command, outputs = [];
      if (name === 'capture') { command = ['capture.mjs', dir]; outputs = captureFiles; }
      if (name === 'voice') { command = ['voice.mjs', dir, '--provider', provider]; outputs = voiceFiles; }
      if (name === 'build') { command = ['build.mjs', dir]; outputs = buildFiles; }
      if (name === 'lint') command = ['hf.mjs', dir, 'lint'];
      if (name === 'snapshots') {
        const times = JSON.parse(fs.readFileSync(path.join(dir, 'times.json'), 'utf8')).map(t => t.check).join(',');
        command = ['hf.mjs', dir, 'snapshot', '--at', times]; outputs = ['snaps'];
      }
      if (name === 'render') {
        console.log('Local render: up to 10 minutes CPU/GPU work, no provider calls.');
        command = ['hf.mjs', dir, 'render', ...(flags.has('--draft') ? ['--draft'] : [])]; outputs = [`${spec.output}.mp4`];
      }
      if (command) await runProcess(process.execPath, [path.join(SKILL, 'scripts', command[0]), ...command.slice(1)], { cwd: dir, env: process.env, signal: controller.signal, timeout: name === 'render' ? 660000 : 300000, echo: true });
      if (controller.signal.aborted) throw new Error('Run cancelled');
      const hashes = outputHashes(dir, outputs);
      if (outputs.length && !Object.keys(hashes).length) throw new Error('Phase produced no artifacts');
      manifest.phases[name] = { status: 'complete', input, outputs: hashes }; saveManifest(dir, manifest);
    } catch (error) { manifest.phases[name].status = controller.signal.aborted ? 'cancelled' : 'failed'; saveManifest(dir, manifest); throw error; }
  }
  console.log(flags.has('--dry-run') ? 'Dry-run finished; no outputs changed.' : 'Run phases completed.');
} catch (error) { console.error(error.message); process.exitCode = controller.signal.aborted ? 130 : 1; }
finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
