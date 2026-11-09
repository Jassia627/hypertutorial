// Text-to-speech providers. Each one writes a 48 kHz stereo .wav to outFile.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { runProcess } from './process.mjs';

const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static');
const FFPROBE = require('ffprobe-static').path;

const ffmpeg = (args) => execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
export const duration = (file) => Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

async function toWav(buf, outFile, inputArgs = [], signal) {
  const tmp = outFile + '.src';
  fs.writeFileSync(tmp, buf);
  try { await runProcess(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...inputArgs, '-i', tmp, '-ar', '48000', '-ac', '2', outFile], { signal }); }
  finally { fs.rmSync(tmp, { force: true }); }
}

async function post(url, headers, body, label, signal) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error(`${label} request failed (${r.status}); response details suppressed`);
  return Buffer.from(await r.arrayBuffer());
}

const need = (env, k) => { if (!env[k]) throw new Error(`Falta ${k}: corre "npm run setup" en la carpeta de la skill`); return env[k]; };

export const providers = {
  /** Speko voice gateway: auto-routes by language, or pin options.routing { mode: explicit, provider, model }. Returns raw PCM. */
  async speko({ text, voice, language, options, env, outFile, signal }) {
    const rate = 24000;
    const buf = await post('https://router.speko.dev/v1/tts/speech',
      { authorization: `Bearer ${need(env, 'SPEKO_API_KEY')}`, 'idempotency-key': crypto.randomUUID() },
      { routing: options?.routing ?? { mode: 'auto', objective: 'quality' }, input: text, language: language ?? 'es', ...(voice ? { voice } : {}), audio: { encoding: 'pcm_s16le', sample_rate_hz: rate, channels: 1 } },
      'Speko', signal);
    await toWav(buf, outFile, ['-f', 's16le', '-ar', String(rate), '-ac', '1'], signal);
  },
  async elevenlabs({ text, voice, model, env, outFile, signal }) {
    const buf = await post(`https://api.elevenlabs.io/v1/text-to-speech/${voice ?? 'EXAVITQu4vr4xnSDxMaL'}?output_format=mp3_44100_128`,
      { 'xi-api-key': need(env, 'ELEVENLABS_API_KEY') }, { text, model_id: model ?? 'eleven_multilingual_v2' }, 'ElevenLabs', signal);
    await toWav(buf, outFile, [], signal);
  },
  async openai({ text, voice, model, style, env, outFile, signal }) {
    const buf = await post('https://api.openai.com/v1/audio/speech', { authorization: `Bearer ${need(env, 'OPENAI_API_KEY')}` },
      { model: model ?? 'gpt-4o-mini-tts', voice: voice ?? 'coral', input: text, instructions: style, response_format: 'wav' }, 'OpenAI', signal);
    await toWav(buf, outFile, [], signal);
  },
  /** Free placeholder tone with the estimated length of the line: for timing tests only. */
  async mock({ text, outFile, signal }) {
    const d = Math.max(1.2, text.length / 14).toFixed(2);
    await runProcess(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=220:duration=${d}`, '-af', 'volume=0.15', '-ar', '48000', '-ac', '2', outFile], { signal });
  },
};
