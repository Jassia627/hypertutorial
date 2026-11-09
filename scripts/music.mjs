// Background music: built-in tracks synthesized here (royalty-free, deterministic) plus any song the user drops
// into <skill>/music/. The bed is looped to the video length, faded in/out and ducked under every narration line.
//   node music.mjs list                         — numbered repertoire (built-in + music/ folder)
//   node music.mjs preview <track> <out.wav> [s] — listen to a track before choosing it
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static');
const SR = 48000;
export const MUSIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'music');
const AUDIO = /\.(mp3|wav|ogg|m4a|flac|aac)$/i;

const N = (name) => 440 * 2 ** (({ C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 })[name[0]] / 12 + (name[1] === 'b' ? -1 / 12 : name[1] === '#' ? 1 / 12 : 0) + (Number(name.replace(/[^0-9]/g, '')) - 4));
const ch = (s) => s.split(' ').map(N);

// Each style: tempo, chord progression (one chord per bar) and how loud each instrument plays.
// arp: notes per beat; wave: 'sine' | 'tri' | 'square' | 'guitar'; lp: low-pass amount (0 = none, 0.9 = dark).
export const STYLES = {
  calma: { label: 'Calma — piano suave y pausado', bpm: 78, chords: ['A3 C4 E4', 'F3 A3 C4', 'C4 E4 G4', 'G3 B3 D4'], pad: 0.08, arp: 2, pluck: 0.16, bass: 0.14, lp: 0.35 },
  alegre: { label: 'Alegre — arpegios brillantes con ritmo ligero', bpm: 108, chords: ['C4 E4 G4', 'G3 B3 D4', 'A3 C4 E4', 'F3 A3 C4'], pad: 0.07, arp: 4, pluck: 0.15, bass: 0.13, shaker: 0.05 },
  corporativo: { label: 'Corporativo — positivo y profesional, con batería suave', bpm: 100, chords: ['C4 E4 G4', 'A3 C4 E4', 'F3 A3 C4', 'G3 B3 D4'], pad: 0.07, arp: 2, pluck: 0.13, bass: 0.15, kick: 0.35, clap: 0.08, hat: 0.03 },
  tecnologia: { label: 'Tecnología — electrónico moderno y con pulso', bpm: 120, chords: ['D4 F4 A4', 'Bb3 D4 F4', 'F3 A3 C4', 'C4 E4 G4'], pad: 0.05, arp: 4, pluck: 0.11, wave: 'square', bass: 0.16, kick: 0.45, hat: 0.035, lp: 0.2 },
  lofi: { label: 'Lo-fi — relajado, cálido y con textura de vinilo', bpm: 72, chords: ['D4 F4 A4 C5', 'G3 B3 D4 F4', 'C4 E4 G4 B4', 'A3 C4 E4 G4'], pad: 0.09, arp: 2, pluck: 0.1, swing: 0.62, bass: 0.15, kick: 0.3, clap: 0.06, hat: 0.02, lp: 0.7, vinyl: 0.012 },
  inspirador: { label: 'Inspirador — crece poco a poco, emotivo', bpm: 90, chords: ['F3 A3 C4', 'C4 E4 G4', 'G3 B3 D4', 'A3 C4 E4'], pad: 0.1, arp: 2, pluck: 0.13, bass: 0.15, kick: 0.3, hat: 0.02, build: 4, lp: 0.2 },
  minimalista: { label: 'Minimalista — pocas notas, mucho aire', bpm: 70, chords: ['E3 G3 B3', 'C3 E3 G3', 'G3 B3 D4', 'D3 F#3 A3'], pad: 0.06, arp: 1, pluck: 0.18, bass: 0.1, lp: 0.45 },
  acustico: { label: 'Acústico — guitarra rasgueada, cercano', bpm: 96, chords: ['G3 B3 D4', 'D3 F#3 A3', 'E3 G3 B3', 'C3 E3 G3'], pad: 0.03, arp: 2, pluck: 0.17, wave: 'guitar', bass: 0.12, shaker: 0.035, lp: 0.15 },
};

const wave = (kind, ph) => {
  const s = Math.sin(ph);
  if (kind === 'tri') return (2 / Math.PI) * Math.asin(s);
  if (kind === 'square') return Math.tanh(3 * s) * 0.7;
  if (kind === 'guitar') return s + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph) + 0.15 * Math.sin(5 * ph);
  return s + 0.25 * Math.sin(2 * ph);
};

function synth(name, seconds) {
  const st = STYLES[name];
  const chords = st.chords.map(ch);
  const beat = 60 / st.bpm, bar = beat * 4, step = beat / st.arp;
  const len = Math.ceil(seconds * SR);
  const out = new Float32Array(len);
  let seed = 7, lp = 0;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const b = Math.floor(t / bar), tb = t - b * bar, notes = chords[b % chords.length];
    const drums = !st.build || b >= st.build;
    const env = Math.min(1, tb / 0.5, (bar - tb) / 0.5);
    let s = 0;
    for (const f of notes) s += st.pad * env * (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(2 * Math.PI * f * 1.003 * t));
    // Arpeggio, with optional swing on the off-steps.
    let k = Math.floor(tb / step), tn = tb - k * step;
    if (st.swing && k % 2 === 1) { const off = step * (st.swing - 0.5) * 2; if (tn < off) { k -= 1; tn += step; } else tn -= off; }
    const f = notes[k % notes.length] * (st.wave === 'guitar' ? 1 : 2);
    s += st.pluck * Math.exp(-tn * (st.wave === 'guitar' ? 3.5 : 5)) * wave(st.wave, 2 * Math.PI * f * t) * (st.wave === 'guitar' ? 0.6 : 1);
    s += st.bass * Math.exp(-(tb % (bar / 2)) * 1.4) * Math.sin(Math.PI * notes[0] * t);
    const tq = tb % beat, beatN = Math.floor(tb / beat);
    if (drums && st.kick) s += st.kick * Math.exp(-tq * 18) * Math.sin(2 * Math.PI * (50 + 90 * Math.exp(-tq * 30)) * tq);
    if (drums && st.clap && beatN % 2 === 1) s += st.clap * Math.exp(-tq * 22) * rnd();
    if (drums && st.hat) { const te = tb % (beat / 2); s += st.hat * Math.exp(-te * 70) * rnd(); }
    if (st.shaker && (tb / (beat / 2)) % 2 >= 1) s += st.shaker * Math.exp(-((tb % (beat / 2)) * 40)) * rnd();
    if (st.vinyl) s += st.vinyl * (rnd() > 0.995 ? rnd() * 6 : rnd() * 0.3);
    lp += (1 - (st.lp ?? 0)) * (s - lp);
    out[i] = lp;
  }
  return out;
}

function decode(file, seconds) {
  const raw = execFileSync(FFMPEG, ['-v', 'error', '-stream_loop', '-1', '-i', file, '-t', String(seconds), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
}

/** Full repertoire: built-in styles first, then the songs in <skill>/music/. */
export function listTracks() {
  const songs = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR).filter((f) => AUDIO.test(f)).sort() : [];
  return [
    ...Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label, kind: 'incluida' })),
    ...songs.map((f) => ({ id: f, label: f.replace(AUDIO, '').replace(/[-_]+/g, ' '), kind: 'tu carpeta', file: path.join(MUSIC_DIR, f) })),
  ];
}

/** Resolves a track id: a built-in style, a song in music/, or a path (relative to baseDir). */
export function resolveTrack(id, baseDir = process.cwd()) {
  if (STYLES[id]) return { style: id };
  const inFolder = path.join(MUSIC_DIR, id);
  if (fs.existsSync(inFolder)) return { file: inFolder };
  const p = path.resolve(baseDir, id);
  if (fs.existsSync(p)) return { file: p };
  throw new Error(`No encuentro la pista "${id}". Opciones: ${listTracks().map((t) => t.id).join(', ')}`);
}

/** Writes the final music bed. ducks: [start, end] seconds where the narration speaks. */
export function makeBed({ style, file, volume = 0.16, seconds, ducks = [], out }) {
  const src = file ? decode(file, seconds) : synth(style ?? 'calma', seconds);
  let peak = 0;
  for (const v of src) peak = Math.max(peak, Math.abs(v));
  const gain = peak ? 1 / peak : 1;
  const ramp = 0.35, duckTo = 0.4;
  const pcm = Buffer.alloc(src.length * 4);
  for (let i = 0; i < src.length; i++) {
    const t = i / SR;
    let d = 1;
    for (const [a, b] of ducks) {
      if (t > a - ramp && t < b + ramp) d = Math.min(d, t < a ? 1 - (1 - duckTo) * (t - (a - ramp)) / ramp : t > b ? duckTo + (1 - duckTo) * (t - b) / ramp : duckTo);
    }
    const fade = Math.max(0, Math.min(1, t / 1.5, (seconds - t) / 3));
    const s = Math.round(Math.max(-1, Math.min(1, src[i] * gain * volume * d * fade)) * 32767);
    pcm.writeInt16LE(s, i * 4);
    pcm.writeInt16LE(s, i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + pcm.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(out, Buffer.concat([head, pcm]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , cmd = 'list', id, out, seconds = '20'] = process.argv;
  if (cmd === 'list') {
    listTracks().forEach((t, i) => console.log(`${String(i + 1).padStart(2)}. ${t.id.padEnd(14)} ${t.label}  (${t.kind})`));
    console.log(`\nAgrega canciones (mp3, wav, ogg, m4a) en ${MUSIC_DIR} y aparecen aquí.`);
  } else if (cmd === 'preview') {
    if (!id || !out) throw new Error('Uso: node music.mjs preview <pista> <salida.wav> [segundos]');
    makeBed({ ...resolveTrack(id), seconds: Number(seconds), out, volume: 0.5 });
    console.log('✔', out);
  }
}
