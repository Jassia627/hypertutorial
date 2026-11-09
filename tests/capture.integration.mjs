import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { captureState, inertDocument } from '../scripts/capture-state.mjs';

test('known secrets are redacted as decoded text and attributes without changing markup', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const secrets = ['a&b', 'less<than', 'more>than', 'double"quote', "single'quote", 'input'];
    await page.setContent('<main></main><input id="field"><div data-pii>PRIVATE</div>');
    await page.evaluate(values => {
      for (const value of values) {
        const p = document.createElement('p');
        p.textContent = value; p.title = value; p.setAttribute('aria-label', value);
        document.querySelector('main').append(p);
      }
      document.querySelector('#field').value = values[0];
    }, secrets);
    const data = await captureState(page, { redactSelectors: ['[data-pii]'] }, secrets);
    const output = await browser.newPage();
    await output.setContent(inertDocument(data));
    const artifacts = path.join(path.dirname(fileURLToPath(import.meta.url)), 'artifacts');
    fs.mkdirSync(artifacts, { recursive: true });
    const dir = fs.mkdtempSync(path.join(artifacts, 'redaction-'));
    await output.screenshot({ path: path.join(dir, 'redacted.png') });
    assert.deepEqual(await output.locator('main p').allTextContents(), secrets.map(() => '[REDACTED]'));
    assert.deepEqual(await output.locator('main p').evaluateAll(nodes => nodes.map(el => [el.title, el.getAttribute('aria-label')])), secrets.map(() => ['[REDACTED]', '[REDACTED]']));
    assert.equal(await output.locator('#field').inputValue(), '[REDACTED]');
    assert.equal(await output.locator('input').count(), 1, 'a secret matching a tag name must not rewrite markup');
    assert.doesNotMatch(data.html, /PRIVATE|a&amp;b|less&lt;than|more&gt;than|double&quot;quote/);
    console.log('Redaction screenshot:', path.join(dir, 'redacted.png'));
  } finally { await browser.close(); }
});

test('inert framework attributes retain computed styles while sensitive attributes are removed', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<style>button[data-state="open"][data-side="top"]{color:rgb(255,0,0);background-color:rgb(0,255,0)}</style><button data-state="open" data-side="top" data-access-token="unlisted-sensitive-value" data-description="a&amp;b" onclick="window.bad=1">a&amp;b</button>');
    const data = await captureState(page, {}, ['a&b']);
    const output = await browser.newPage(); await output.setContent(inertDocument(data));
    assert.equal(await output.locator('button').getAttribute('data-state'), 'open');
    assert.equal(await output.locator('button').getAttribute('data-side'), 'top');
    assert.equal(await output.locator('button').getAttribute('data-access-token'), null);
    assert.equal(await output.locator('button').getAttribute('data-description'), '[REDACTED]');
    assert.equal(await output.locator('button').textContent(), '[REDACTED]');
    assert.equal(await output.locator('button').getAttribute('onclick'), null);
    assert.equal(await output.locator('button').evaluate(el => getComputedStyle(el).color), 'rgb(255, 0, 0)');
    assert.equal(await output.locator('button').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(0, 255, 0)');
    assert.ok(!data.html.includes('unlisted-sensitive-value'));
  } finally { await browser.close(); }
});

test('form properties, redaction, IDs and state-specific styles survive inert capture', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>body{font-family:Arial}#label{color:rgb(2, 3, 4)}</style><label id="label" for="field">Name</label><input id="field" value="old"><input type="password" value="fixture-secret"><textarea>old</textarea><select multiple><option>a</option><option selected>b</option></select><input type="checkbox" checked><div data-pii>PRIVATE</div><button onclick="fetch('/write')">Go</button><script>window.bad=1</script>`);
    await page.evaluate(() => { document.querySelector('#field').value = 'new'; document.querySelector('textarea').value = 'live'; document.querySelectorAll('option')[0].selected = true; document.querySelector('[type=checkbox]').checked = false; });
    const data = await captureState(page, { redactSelectors: ['[data-pii]'] }, ['fixture-secret']);
    assert.ok(!JSON.stringify(data).includes('fixture-secret'));
    assert.ok(!data.html.includes('PRIVATE'));
    assert.ok(!data.html.includes('onclick'));
    const output = await browser.newPage();
    await output.setContent(inertDocument(data));
    assert.equal(await output.locator('#field').inputValue(), 'new');
    assert.equal(await output.locator('textarea').inputValue(), 'live');
    assert.equal(await output.locator('option:checked').count(), 2);
    assert.equal(await output.locator('[type=checkbox]').isChecked(), false);
    assert.equal(await output.locator('label').getAttribute('for'), 'field');
    assert.equal(await output.evaluate(() => window.bad), undefined);
    await output.close();
  } finally { await browser.close(); }
});
