import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { fixture } from './fixture.mjs';

test('generated composition isolates styles and retains form/ID semantics; deterministic screenshots', { timeout: 120000 }, async () => {
  const f = await fixture('visual');
  let browser;
  try {
    await f.cli('capture.mjs'); await f.cli('voice.mjs', ['--provider', 'mock']); await f.cli('build.mjs');
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(f.dir, 'hf/index.html')).href);
    assert.equal(await page.evaluate(() => !!window.__timelines?.main), true);
    const forms = await page.evaluate(() => {
      const roots = [...document.querySelectorAll('[data-state]')].map(el => el.shadowRoot);
      return roots.map(root => ({ color: getComputedStyle(root.querySelector('#identity')).color, value: root.querySelector('#name').value, note: root.querySelector('textarea').value, selected: root.querySelectorAll('option:checked').length, checked: root.querySelector('#checked').checked, label: root.querySelector('label').htmlFor, id: root.querySelector('svg rect').getAttribute('fill') }));
    });
    assert.equal(forms[0].color, 'rgb(18, 96, 68)'); assert.equal(forms[1].color, 'rgb(124, 20, 70)');
    for (const form of forms) { assert.equal(form.value, 'Live name'); assert.equal(form.note, 'Live note'); assert.equal(form.selected, 2); assert.equal(form.checked, false); assert.equal(form.label, 'name'); assert.equal(form.id, 'url(#paint)'); }
    const times = JSON.parse(fs.readFileSync(path.join(f.dir, 'times.json')));
    for (const time of times) {
      await page.evaluate(t => { window.__timelines.main.pause().seek(t); }, time.check);
      const opacity = await page.locator('#caption-' + time.id + ' div').evaluate(el => Number(getComputedStyle(el).opacity));
      assert.ok(opacity > 0.95, 'QA check times must sample a legible caption before fade-out');
      await page.screenshot({ path: path.join(f.dir, `${time.id}-frame.png`), animations: 'disabled' });
    }
    assert.deepEqual(errors, []);
    console.log('Visual inspection artifacts:', f.dir);
  } finally { await browser?.close(); await f.close(); }
});
