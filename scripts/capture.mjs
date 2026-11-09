// Capture only explicitly authorized test-app operations.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { SKILL, loadProject, readEnv, interpolate } from './common.mjs';
import { compilePolicy, checkAction, protectContext } from './capture-policy.mjs';
import { captureState, inertDocument } from './capture-state.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const policy = compilePolicy(spec);
for (const a of [...(spec.login?.steps ?? []), ...spec.states.flatMap(s => s.actions ?? [])]) checkAction(policy, a);
const only = process.argv[3];
if (only && !spec.states.some(s => s.name === only)) throw new Error('Unknown state');
const env = readEnv(), diagnostics = [];
const OUT = path.join(dir, 'states');
const W = spec.app.width ?? 1440, H = spec.app.captureHeight ?? 1500;
let browser, cancelled = false;
const cancel = () => { cancelled = true; void browser?.close(); };
process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
async function newPage(phase, storageState) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, storageState, locale: spec.app.locale ?? 'en-US', serviceWorkers: 'block' });
  await protectContext(context, policy, phase, diagnostics);
  await context.addInitScript({ path: path.join(SKILL, 'scripts/finder.js') });
  return { context, page: await context.newPage() };
}
async function handle(page, sel, timeout = 10000) {
  await page.waitForFunction(s => { try { return !!window.__htFind(document.body, s); } catch { return false; } }, sel, { timeout });
  return (await page.evaluateHandle(s => window.__htFind(document.body, s), sel)).asElement();
}
async function act(page, a) {
  if (cancelled) throw new Error('Capture cancelled');
  try {
    if (a.goto) await page.goto(new URL(a.goto, spec.app.url).href, { waitUntil: 'domcontentloaded' });
    else if (a.click) await (await handle(page, a.click, a.optional ? 1500 : 10000)).click();
    else if (a.fill) await (await handle(page, a.fill)).fill(interpolate(a.value, env));
    else if (a.press) await page.keyboard.press(a.press);
    else if (a.waitFor) await handle(page, a.waitFor, 20000);
    else if (a.wait !== undefined) await page.waitForTimeout(a.wait * 1000);
    else if (a.eval) await page.evaluate(`(async () => { ${a.eval} })()`);
    else if (a.toast) await page.evaluate(text => { const el = document.createElement('div'); el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#17382d;color:white;padding:20px;z-index:2147483647'; el.textContent = text; document.body.append(el); }, a.toast);
    else if (a.clearSessionStorage !== undefined) await page.evaluate(p => Object.keys(sessionStorage).filter(k => k.startsWith(p)).forEach(k => sessionStorage.removeItem(k)), a.clearSessionStorage);
  } catch { if (!a.optional || cancelled) throw new Error(cancelled ? 'Capture cancelled' : 'Capture action failed (details suppressed to protect values)'); }
}
async function snap(page, name) {
  const secrets = Object.entries(env).filter(([k]) => /PASSWORD|TOKEN|SECRET|KEY|APP_USER/.test(k)).map(([, v]) => v);
  const data = await captureState(page, policy, secrets);
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data));
  // Screenshot the inert, redacted export, never the secret-bearing live page.
  const preview = await browser.newPage({ viewport: { width: W, height: H }, serviceWorkers: 'block' });
  try {
    await preview.route('**/*', route => route.abort());
    await preview.setContent(inertDocument(data));
    await preview.evaluate(async () => { await document.fonts.ready; });
    await preview.screenshot({ path: path.join(OUT, `${name}.png`) });
  } finally { await preview.close(); }
  console.log('Captured:', name);
}
try {
  browser = await chromium.launch();
  let storageState;
  if (spec.login) {
    const { context, page } = await newPage('auth');
    try {
      await page.goto(new URL(spec.login.url, spec.app.url).href, { waitUntil: 'domcontentloaded' });
      for (const a of spec.login.steps) await act(page, a);
      storageState = await context.storageState(); // Never persist session tokens.
    } finally { await context.close(); }
  }
  const { context, page } = await newPage('capture', storageState);
  try {
    await page.goto(new URL(spec.app.start ?? '/', spec.app.url).href, { waitUntil: 'domcontentloaded' });
    fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
    fs.writeFileSync(path.join(OUT, 'fonts.css'), '');
    for (const state of spec.states) {
      for (const a of state.actions ?? []) await act(page, a);
      if (!only || only === state.name) await snap(page, state.name);
    }
    const fonts = spec.states.filter(s => !only || s.name === only).flatMap(s => JSON.parse(fs.readFileSync(path.join(OUT, `${s.name}.json`), 'utf8')).fonts ?? []);
    fs.writeFileSync(path.join(OUT, 'fonts.css'), [...new Set(fonts)].join('\n'));
    fs.writeFileSync(path.join(OUT, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
  } finally { await context.close(); }
  if (cancelled) throw new Error('Capture cancelled');
} catch {
  console.error(cancelled ? 'Capture cancelled' : 'Capture failed; browser details suppressed to protect URLs and input values. Check explicit policy rules and state diagnostics.');
  process.exitCode = cancelled ? 130 : 1;
} finally {
  await browser?.close();
  process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
}
