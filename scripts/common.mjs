// Shared helpers: skill paths, project spec, and the skill's own .env (credentials and API keys).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_FILE = path.join(SKILL, '.env');

export function loadProject(dirArg) {
  if (!dirArg) throw new Error('Uso: node <script> <carpeta del proyecto>');
  const dir = path.resolve(dirArg);
  const file = path.join(dir, 'hypertutorial.json');
  if (!fs.existsSync(file)) throw new Error('No existe ' + file);
  if (!fs.existsSync(path.join(SKILL, 'node_modules'))) throw new Error(`Faltan dependencias: corre "npm install" en ${SKILL}`);
  return { dir, spec: JSON.parse(fs.readFileSync(file, 'utf8')) };
}

/** KEY=value pairs from the skill's .env, overridden by real environment variables. */
export function readEnv() {
  const file = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  const env = Object.fromEntries(file.split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  for (const k of Object.keys(process.env)) if (/^(APP_|SPEKO_|ELEVENLABS_|OPENAI_|HT_)/.test(k)) env[k] = process.env[k];
  return env;
}

export function writeEnv(values) {
  const env = { ...readEnv(), ...values };
  fs.writeFileSync(ENV_FILE, Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
}

export const interpolate = (s, env) => String(s ?? '').replace(/\$\{(\w+)\}/g, (_, k) => env[k] ?? '');
