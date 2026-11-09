/** Executed in the protected app page. Only approved requests can fetch assets. */
export async function captureState(page, policy, secrets = []) {
  return page.evaluate(async ({ selectors, secrets }) => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
    const diagnostics = [];
    const scrub = value => secrets.filter(Boolean).reduce((s, secret) => s.split(secret).join('[REDACTED]'), String(value));
    const assets = new Map();
    const fonts = [];
    async function asset(url, base) {
      if (!url || url.startsWith('#') || url.startsWith('data:')) return url;
      let absolute;
      try { absolute = new URL(url, base).href; } catch { diagnostics.push('invalid-asset'); return ''; }
      if (!assets.has(absolute)) assets.set(absolute, (async () => {
        try {
          const response = await fetch(absolute);
          if (!response.ok) throw new Error();
          const blob = await response.blob();
          return await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob); });
        } catch { diagnostics.push('asset-unavailable'); return ''; }
      })());
      return assets.get(absolute);
    }
    // Tokenize url() without treating quoted parentheses as closing tokens.
    async function urls(value, base) {
      let out = '', cursor = 0;
      const pattern = /url\s*\(/ig;
      let match;
      while ((match = pattern.exec(value))) {
        out += value.slice(cursor, match.index);
        let i = pattern.lastIndex;
        while (/\s/.test(value[i] ?? '') && i < value.length) i++;
        const quote = ['"', "'"].includes(value[i]) ? value[i++] : null;
        let raw = '';
        while (i < value.length) {
          if (value[i] === '\\' && i + 1 < value.length) { raw += value[i + 1]; i += 2; continue; }
          if (quote ? value[i] === quote : value[i] === ')') break;
          raw += value[i++];
        }
        if (quote) { i++; while (/\s/.test(value[i] ?? '') && i < value.length) i++; }
        if (value[i] !== ')') { diagnostics.push('unsupported-css-url'); return ''; }
        out += `url("${await asset(raw.trim(), base)}")`;
        cursor = i + 1; pattern.lastIndex = cursor;
      }
      return out + value.slice(cursor);
    }
    async function rules(sheet) {
      let list; try { list = [...sheet.cssRules]; } catch { diagnostics.push('inaccessible-stylesheet'); return ''; }
      const result = [];
      for (const rule of list) {
        if (rule.type === CSSRule.IMPORT_RULE) { result.push(await rules(rule.styleSheet)); continue; }
        const serialized = await urls(rule.cssText, sheet.href || document.baseURI);
        result.push(serialized);
        if (rule.type === CSSRule.FONT_FACE_RULE) fonts.push(serialized);
      }
      return result.join('\n');
    }
    const css = (await Promise.all([...document.styleSheets].map(rules))).join('\n');
    const clone = document.body.cloneNode(true);
    const source = document.body.querySelectorAll('input,textarea,select');
    const dest = clone.querySelectorAll('input,textarea,select');
    source.forEach((el, i) => {
      const d = dest[i];
      if (el.tagName === 'SELECT') [...el.options].forEach((o, j) => d.options[j].toggleAttribute('selected', o.selected));
      else if (el.tagName === 'TEXTAREA') d.textContent = el.value;
      else if (['checkbox', 'radio'].includes(el.type)) d.toggleAttribute('checked', el.checked);
      else d.setAttribute('value', el.value);
      if (el.indeterminate) diagnostics.push('indeterminate-checkbox-not-serialized');
    });
    for (const selector of ['input[type=password]', 'input[type=hidden]', 'input[autocomplete*=password]', 'input[name*=token i]', 'input[name*=secret i]', ...selectors]) {
      for (const el of clone.querySelectorAll(selector)) {
        el.textContent = '[REDACTED]';
        if ('value' in el) { el.value = '[REDACTED]'; el.setAttribute('value', '[REDACTED]'); }
        for (const a of [...el.attributes]) if (!['type', 'id', 'class', 'style', 'value'].includes(a.name)) el.removeAttribute(a.name);
      }
    }
    if (document.querySelector('canvas,video,iframe,object,embed') || [...document.querySelectorAll('*')].some(el => el.shadowRoot)) diagnostics.push('unsupported-active-or-shadow-content');
    clone.querySelectorAll('script,style,noscript,iframe,object,embed,video,audio,link,base,meta,canvas').forEach(el => el.remove());
    for (const el of clone.querySelectorAll('*')) {
      for (const a of [...el.attributes]) {
        if (/^on/i.test(a.name) || /password|token|secret|credential|authorization|api[-_]?key/i.test(a.name) || ['action', 'formaction', 'ping', 'srcdoc', 'nonce', 'integrity'].includes(a.name)) el.removeAttribute(a.name);
      }
      if (el.hasAttribute('style')) el.setAttribute('style', await urls(el.getAttribute('style'), document.baseURI));
      if (el.tagName === 'IMG') { el.setAttribute('src', await asset(el.currentSrc || el.src, document.baseURI)); el.removeAttribute('srcset'); }
      for (const attr of ['href', 'xlink:href']) if (el.hasAttribute(attr) && !el.getAttribute(attr).startsWith('#')) el.removeAttribute(attr);
      if (el.tagName !== 'IMG' && el.hasAttribute('src')) el.removeAttribute('src');
    }
    // DOM values are decoded here. Scrubbing serialized markup misses entities
    // and can corrupt tag names when a credential happens to match HTML syntax.
    // Comments have no visual role in an inert export and may contain secrets.
    const comments = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const discarded = [];
    while (comments.nextNode()) discarded.push(comments.currentNode);
    discarded.forEach(comment => comment.remove());
    const text = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    while (text.nextNode()) text.currentNode.nodeValue = scrub(text.currentNode.nodeValue);
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      for (const a of [...el.attributes]) el.setAttribute(a.name, scrub(a.value));
    }
    const rootStyle = [...getComputedStyle(document.documentElement)].filter(k => k.startsWith('--')).map(k => `${k}:${getComputedStyle(document.documentElement).getPropertyValue(k)}`).join(';');
    return {
      version: 1, html: clone.innerHTML, css: scrub(css),
      htmlStyle: scrub((document.documentElement.getAttribute('style') || '') + ';' + rootStyle),
      bodyStyle: scrub(document.body.getAttribute('style') || ''), bodyClass: scrub(document.body.className),
      diagnostics, assets: assets.size, fonts: fonts.map(scrub),
    };
  }, { selectors: policy.redactSelectors ?? [], secrets });
}
const attr = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
export const EXPORT_CSP = "default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'";
export function inertDocument(data) {
  return `<!doctype html><html style="${attr(data.htmlStyle)}"><head><meta http-equiv="Content-Security-Policy" content="${EXPORT_CSP}"><style>${data.css.replaceAll('</style', '<\\/style')}</style></head><body class="${attr(data.bodyClass)}" style="${attr(data.bodyStyle)}">${data.html}</body></html>`;
}
