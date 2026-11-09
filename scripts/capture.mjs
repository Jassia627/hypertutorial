// Captures each state in hypertutorial.json as static HTML + CSS from the running app.
// Usage: node capture.mjs <project dir> [stateName]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { SKILL, loadProject, readEnv, interpolate } from './common.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const require = createRequire(import.meta.url);
const only = process.argv[3];
const { chromium } = require('playwright');
const env = readEnv();
const APP = spec.app.url.replace(/\/+$/, '');
const W = spec.app.width ?? 1440, H = spec.app.captureHeight ?? 1500;
const OUT = path.join(dir, 'states');
const AUTH = path.join(dir, '.auth.json');
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });

const browser = await chromium.launch();
const finder = { path: path.join(SKILL, 'scripts/finder.js') };

async function newPage(storageState) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, storageState, locale: spec.app.locale ?? 'es-CO' });
  await ctx.addInitScript(finder);
  return [ctx, await ctx.newPage()];
}

async function handle(page, sel, timeout = 10000) {
  const end = Date.now() + timeout;
  for (;;) {
    try { return (await page.evaluateHandle((s) => window.__htFind(document.body, s), sel)).asElement(); } catch (e) {
      if (Date.now() > end) throw new Error(`No apareció "${sel}" (${e.message.split('\n')[0]})`);
      await page.waitForTimeout(250);
    }
  }
}

async function act(page, a) {
  try {
    if (a.goto) { await page.goto(APP + a.goto, { waitUntil: 'networkidle' }); await page.waitForTimeout(800); }
    else if (a.click) { await (await handle(page, a.click, a.optional ? 4000 : 10000)).click(); await page.waitForTimeout(500); }
    else if (a.fill) await (await handle(page, a.fill)).fill(interpolate(a.value, env));
    else if (a.press) await page.keyboard.press(a.press);
    else if (a.waitFor) await handle(page, a.waitFor, 20000);
    else if (a.wait) await page.waitForTimeout(a.wait * 1000);
    else if (a.eval) await page.evaluate(`(async () => { ${a.eval} })()`);
    else if (a.clearSessionStorage !== undefined) await page.evaluate((p) => Object.keys(sessionStorage).filter((k) => k.startsWith(p)).forEach((k) => sessionStorage.removeItem(k)), a.clearSessionStorage);
    else throw new Error('Acción desconocida: ' + JSON.stringify(a));
  } catch (e) { if (!a.optional) throw e; }
}

// Session: reuse .auth.json while it still opens the start page; otherwise log in with spec.login (values from the skill .env).
async function session() {
  if (fs.existsSync(AUTH)) {
    const [ctx, page] = await newPage(AUTH);
    await page.goto(APP + (spec.app.start ?? '/'), { waitUntil: 'networkidle' });
    const ok = !spec.login || !new URL(page.url()).pathname.startsWith(spec.login.url);
    await ctx.close();
    if (ok) return AUTH;
  }
  if (!spec.login) return undefined;
  console.log('Iniciando sesión…');
  const [ctx, page] = await newPage();
  await page.goto(APP + spec.login.url, { waitUntil: 'networkidle' });
  for (const a of spec.login.steps) await act(page, a);
  await ctx.storageState({ path: AUTH });
  await ctx.close();
  return AUTH;
}

async function snap(page, name) {
  await page.waitForTimeout(700);
  const data = await page.evaluate(async () => {
    const css = [];
    for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) css.push(r.cssText); } catch {} }
    const clone = document.body.cloneNode(true);
    const src = document.body.querySelectorAll('input,textarea,select');
    const dst = clone.querySelectorAll('input,textarea,select');
    src.forEach((el, i) => {
      const d = dst[i];
      if (el.tagName === 'TEXTAREA') d.textContent = el.value;
      else if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) d.setAttribute('checked', ''); }
      else d.setAttribute('value', el.value);
    });
    clone.querySelectorAll('script,noscript,iframe').forEach((n) => n.remove());
    for (const img of clone.querySelectorAll('img')) {
      try {
        const b = await (await fetch(img.src)).blob();
        img.src = await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
        img.removeAttribute('srcset');
      } catch {}
    }
    return { css: css.join('\n'), html: clone.innerHTML, htmlStyle: document.documentElement.getAttribute('style') || '', bodyClass: document.body.className };
  });
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(data));
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('✔', name);
}

const auth = await session();
const [, page] = await newPage(auth);
await page.goto(APP + (spec.app.start ?? '/'), { waitUntil: 'networkidle' });
if (spec.login && new URL(page.url()).pathname.startsWith(spec.login.url)) throw new Error('La sesión no sirve: revisa login en hypertutorial.json y APP_USER/APP_PASSWORD (npm run setup)');
for (const st of spec.states) {
  for (const a of st.actions ?? []) await act(page, a);
  if (!only || only === st.name) await snap(page, st.name);
}

// Fonts: same-origin @font-face files plus Google Fonts stylesheets, saved locally for the composition.
const faces = [];
const ua = await page.evaluate(() => navigator.userAgent);
const local = await page.evaluate(() => [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } })
  .filter((r) => r.type === CSSRule.FONT_FACE_RULE).map((r) => ({ css: r.cssText, base: r.parentStyleSheet.href || location.href })));
const remote = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).filter((h) => !h.startsWith(location.origin)));
for (const href of remote) {
  try {
    const css = await (await fetch(href, { headers: { 'user-agent': ua } })).text();
    for (const rule of css.match(/@font-face\s*{[^}]*}/g) ?? []) local.push({ css: rule, base: href });
  } catch {}
}
for (const [i, f] of local.entries()) {
  const m = f.css.match(/url\("?([^")]+)"?\)/);
  if (!m || m[1].startsWith('data:')) { if (m) faces.push(f.css); continue; }
  const url = new URL(m[1], f.base).href;
  const ext = (url.split('?')[0].match(/\.(woff2?|ttf|otf)$/) ?? [, 'woff2'])[1];
  try {
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    fs.writeFileSync(path.join(OUT, 'fonts', `f${i}.${ext}`), buf);
    faces.push(f.css.replace(m[0], `url("states/fonts/f${i}.${ext}")`));
  } catch {}
}
fs.writeFileSync(path.join(OUT, 'fonts.css'), faces.join('\n'));
console.log('fuentes:', faces.length);
await browser.close();
