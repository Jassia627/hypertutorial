// Generates one narration .wav per beat (intro, steps, outro). Cached: only changed lines are regenerated.
// Usage: node voice.mjs <project dir> [--provider speko|elevenlabs|openai|mock]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadProject, readEnv } from './common.mjs';
import { providers, duration } from './tts.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const env = readEnv();
const flag = process.argv.indexOf('--provider');
const name = flag > 0 ? process.argv[flag + 1] : spec.voice?.provider ?? env.HT_TTS_PROVIDER ?? 'mock';
const tts = providers[name];
if (!tts) throw new Error(`Proveedor de voz desconocido "${name}". Disponibles: ${Object.keys(providers).join(', ')}`);
// A voice chosen in setup comes with its Speko route (provider/model); the spec can override both.
const [rp, rm] = (env.HT_TTS_ROUTE || '').split('/');
const fromSetup = !spec.voice?.voice && name === env.HT_TTS_PROVIDER;
const routing = spec.voice?.options?.routing ?? (fromSetup && rp ? { mode: 'explicit', provider: rp, ...(rm ? { model: rm } : {}) } : undefined);
const v = { voice: spec.voice?.voice ?? (fromSetup ? env.HT_TTS_VOICE || undefined : undefined), model: spec.voice?.model, style: spec.voice?.style, options: { ...spec.voice?.options, ...(routing ? { routing } : {}) }, language: spec.language ?? env.HT_LANGUAGE ?? 'es' };

const out = path.join(dir, 'voice');
fs.mkdirSync(out, { recursive: true });
const manifestFile = path.join(out, 'voice.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
const beats = [['intro', spec.intro?.narration], ...spec.steps.map((s) => [s.id, s.narration]), ['outro', spec.outro?.narration]].filter(([, t]) => t);

try { for (const [id, text] of beats) {
  const key = crypto.createHash('sha1').update(JSON.stringify([text, name, v])).digest('hex').slice(0, 12);
  const file = path.join(out, id + '.wav');
  const digest = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  if (manifest[id]?.key === key && fs.existsSync(file) && manifest[id].hash === digest(file)) continue;
  console.log(`voz ${id} (${name})…`);
  const staged = path.join(out, `.ht-${crypto.randomUUID()}.wav`);
  try {
    await tts({ text, ...v, env, outFile: staged, signal: controller.signal });
    if (controller.signal.aborted) throw new Error('Narration cancelled');
    const seconds = duration(staged);
    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Invalid narration artifact');
    fs.renameSync(staged, file);
    manifest[id] = { key, duration: seconds, hash: digest(file) };
    const temp = manifestFile + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(manifest, null, 2));
    fs.renameSync(temp, manifestFile);
  } finally { if (fs.existsSync(staged)) fs.unlinkSync(staged); }
} } finally { process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel); }
console.log(`✔ voz lista: ${beats.length} audios con ${name}`);
