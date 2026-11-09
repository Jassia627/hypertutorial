import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { captureState, inertDocument } from '../scripts/capture-state.mjs';

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
