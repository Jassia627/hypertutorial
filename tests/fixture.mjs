import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { runProcess } from '../scripts/process.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function fixture(label) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push({ method: req.method, path: req.url });
    if (req.url === '/fixture-font.woff2') {
      res.setHeader('Content-Type', 'font/woff2');
      res.end(fs.readFileSync(path.join(ROOT, 'node_modules/hyperframes/dist/skills/hyperframes/assets/frame-presets/code-editorial/fonts/Inter-400.woff2'))); return;
    }
    if (req.url === '/write') { res.end('unexpected write'); return; }
    if (req.url === '/style/base.css') { res.setHeader('Content-Type', 'text/css'); res.end('@font-face{font-family:TutorialFixture;src:url(../fixture-font.woff2) format("woff2")}body{font-family:TutorialFixture,sans-serif;background:#edf3f6;margin:0;padding:40px;color:#183342}#panel{background:white;border:2px solid #bdd2dd;border-radius:16px;padding:32px;width:600px}label{display:block;margin-top:14px}input,textarea,select,button{font:18px TutorialFixture;padding:8px;margin:8px}#identity{color:#126044}'); return; }
    if (req.url === '/asset.svg') { res.setHeader('Content-Type', 'image/svg+xml'); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#168455"/></svg>'); return; }
    if (req.url !== '/') { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><link rel="stylesheet" href="/style/base.css"></head><body><main id="panel"><img src="/asset.svg" alt="Fixture icon"><h1 id="identity">Local fixture</h1><label for="name">Name</label><input id="name" value="before"><label for="note">Note</label><textarea id="note">before</textarea><label for="choices">Choices</label><select id="choices" multiple><option value="a">Alpha</option><option value="b" selected>Beta</option></select><input id="checked" type="checkbox" checked><label for="checked">Enabled</label><input type="password" value="fixture-password"><input name="token" value="fixture-token"><p data-pii>PRIVATE FIXTURE PERSON</p><button id="next" onclick="advance()">Next</button><p id="status" role="status" aria-labelledby="identity">Ready</p><svg width="20" height="20"><defs><linearGradient id="paint"><stop stop-color="red"/></linearGradient></defs><rect width="20" height="20" fill="url(#paint)"/></svg></main><script>document.querySelector('#name').value='Live name';document.querySelector('#note').value='Live note';document.querySelector('option').selected=true;document.querySelector('#checked').checked=false;function advance(){fetch('/write',{method:'POST',body:'fixture-secret'}).catch(()=>{});document.querySelector('#status').textContent='Preview complete';const s=document.createElement('style');s.textContent='#identity{color:rgb(124, 20, 70)}';document.head.append(s)}</script></body></html>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const artifacts = path.join(ROOT, 'tests/artifacts'); fs.mkdirSync(artifacts, { recursive: true });
  const dir = fs.mkdtempSync(path.join(artifacts, label + '-'));
  const spec = {
    version: 1, title: 'Local fixture walkthrough', output: 'fixture', language: 'en', font: 'TutorialFixture',
    app: { url: origin, width: 1000, captureHeight: 850, viewportHeight: 850 },
    capturePolicy: { environment: 'isolated', origins: [origin], auth: [], capture: ['/', '/style/base.css', '/asset.svg', '/fixture-font.woff2'].map(p => ({ origin, path: p, method: 'GET', operation: 'read' })), redactSelectors: ['[data-pii]'] },
    voice: { provider: 'mock' },
    states: [{ name: 'start' }, { name: 'done', actions: [{ click: 'button:Next' }, { waitFor: 'text:Preview complete' }] }],
    steps: [{ id: 'next', state: 'start', kind: 'click', sel: 'button:Next', next: 'done', title: 'Preview', narration: 'Next.' }, { id: 'done', state: 'done', kind: 'none', title: 'Done', narration: 'Done.' }],
  };
  fs.writeFileSync(path.join(dir, 'hypertutorial.json'), JSON.stringify(spec, null, 2));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(APP_|SPEKO_|ELEVENLABS_|OPENAI_|HT_)/.test(k)));
  Object.assign(env, { HT_NO_ENV: '1', HT_TTS_PROVIDER: 'mock', HYPERFRAMES_SKIP_SKILLS: '1', HYPERFRAMES_NO_TELEMETRY: '1', DO_NOT_TRACK: '1' });
  env.NODE_OPTIONS = '--import ' + pathToFileURL(path.join(ROOT, 'tests/offline.mjs')).href;
  const cli = (script, args = [], options = {}) => runProcess(process.execPath, [path.join(ROOT, 'scripts', script), dir, ...args], { cwd: ROOT, env, timeout: 180000, ...options });
  return { dir, origin, spec, requests, env, cli, close: () => new Promise(resolve => server.close(resolve)) };
}
