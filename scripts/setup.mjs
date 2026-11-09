// Interactive setup: voice first (provider, key, one of its 3 most natural voices), then the app's test account.
// Everything is saved to the skill's .env (never committed). Usage: npm run setup
import readline from 'node:readline';
import { ENV_FILE, readEnv, writeEnv } from './common.mjs';
import { topVoices } from './voices.mjs';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
// Lines are queued, so answers typed ahead (or piped) are never lost between questions.
const lines = rl[Symbol.asyncIterator]();
let muted = false;
const echo = rl._writeToOutput;
// Hidden input: while a secret is typed, every echoed character is shown as a bullet.
rl._writeToOutput = (s) => echo.call(rl, muted ? s.replace(/[^\r\n]/g, '•') : s);
async function ask(q, def = '') {
  process.stdout.write(def ? `${q} [${def}]: ` : `${q}: `);
  const { value } = await lines.next();
  return (value ?? '').trim() || def;
}
async function secret(q) {
  process.stdout.write(`${q} (vacío = no cambiar): `);
  muted = true;
  const { value } = await lines.next();
  muted = false;
  if (process.stdin.isTTY) process.stdout.write('\n');
  return (value ?? '').trim();
}

const env = readEnv();
const save = {};
console.log('\nConfiguración de hypertutorial. Todo se guarda en', ENV_FILE);

// 1. Voice
console.log('\n— Voz —');
const NAMES = ['speko', 'elevenlabs', 'openai', 'mock'];
let provider;
for (;;) {
  provider = (await ask('Proveedor de voz: speko, elevenlabs, openai o mock (sin costo, solo pruebas)', NAMES.includes(env.HT_TTS_PROVIDER) ? env.HT_TTS_PROVIDER : 'speko')).toLowerCase();
  if (NAMES.includes(provider)) break;
  console.log('  Escribe solo el nombre del proveedor (la clave se pide en el siguiente paso).');
}
save.HT_TTS_PROVIDER = provider;

const keyName = { speko: 'SPEKO_API_KEY', elevenlabs: 'ELEVENLABS_API_KEY', openai: 'OPENAI_API_KEY' }[provider];
if (keyName) {
  let key = await secret(`Clave de ${provider}${env[keyName] ? ' (ya hay una guardada)' : ''}`);
  // Speko API keys start with sk_; anything else (e.g. a whsec_ webhook secret) is rejected with 401.
  while (provider === 'speko' && key && !key.startsWith('sk_')) {
    console.log('  Esa no es una clave de API de Speko (empieza por sk_, p. ej. sk_live_…). Búscala en platform.speko.ai → Gateway keys.');
    key = await secret('Clave de speko');
  }
  if (key) save[keyName] = key;
  if (!key && !env[keyName]) console.log(`  Sin clave de ${provider} no se podrá generar la voz.`);
}

if (provider !== 'mock') {
  const language = await ask('Idioma de la narración', env.HT_LANGUAGE || 'es');
  save.HT_LANGUAGE = language;
  const voices = await topVoices(provider, { ...env, ...save }, language);
  console.log('\nLas 3 voces más naturales:');
  voices.forEach((v, i) => console.log(`  ${i + 1}. ${v.label}`));
  console.log('  4. Otra (escribo el id de la voz)');
  const current = voices.findIndex((v) => v.voice === env.HT_TTS_VOICE);
  let pick;
  for (;;) {
    pick = Number(await ask('Elige 1, 2, 3 o 4', String(current >= 0 ? current + 1 : 1)));
    if (pick >= 1 && pick <= 4 && (pick === 4 || voices[pick - 1])) break;
  }
  if (pick === 4) {
    save.HT_TTS_VOICE = await ask('Id de la voz', env.HT_TTS_VOICE);
    save.HT_TTS_ROUTE = provider === 'speko' ? await ask('Ruta en Speko proveedor/modelo (vacío = automática)', env.HT_TTS_ROUTE) : '';
  } else {
    save.HT_TTS_VOICE = voices[pick - 1].voice;
    save.HT_TTS_ROUTE = voices[pick - 1].route ?? '';
  }
}

// 2. App test account
console.log('\n— Cuenta de prueba de la app que vas a grabar —');
save.APP_USER = await ask('Usuario o correo', env.APP_USER);
const pass = await secret('Contraseña');
if (pass) save.APP_PASSWORD = pass;

writeEnv(save);
rl.close();
console.log('\n✔ Listo. En hypertutorial.json usa ${APP_USER} y ${APP_PASSWORD} en el login.');
