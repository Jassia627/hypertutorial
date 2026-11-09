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
const beats = [['intro', spec.intro?.narration], ...spec.steps.map((s) => [s.id, s.narration]), ['outro', spec.outro?.narration]].filter(([, t]) => t);

for (const [id, text] of beats) {
  const key = crypto.createHash('sha1').update(JSON.stringify([text, name, v])).digest('hex').slice(0, 12);
  const file = path.join(out, id + '.wav');
  if (manifest[id]?.key === key && fs.existsSync(file)) continue;
  console.log(`voz ${id} (${name})…`);
  await tts({ text, ...v, env, outFile: file });
  manifest[id] = { key, text, duration: duration(file) };
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
}
console.log(`✔ voz lista: ${beats.length} audios con ${name}`);
