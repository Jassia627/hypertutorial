/** Runs in the composition. Shadow roots isolate each state's CSS and preserve
 * IDs plus label/ARIA/SVG fragment references without renaming or global CSS. */
export function mountStates(states) {
  for (const [name, data] of Object.entries(states)) {
    const host = document.querySelector('[data-state="' + name + '"]');
    if (!host) continue;
    const root = host.attachShadow({ mode: 'open' });
    const html = document.createElement('html');
    html.style.cssText = data.htmlStyle || '';
    const body = document.createElement('body');
    body.className = data.bodyClass || '';
    body.style.cssText = data.bodyStyle || '';
    body.innerHTML = data.html;
    const style = document.createElement('style');
    style.textContent = data.css;
    root.append(style, html); html.append(body);
    const frozen = document.createElement('style');
    frozen.textContent = '*,*::before,*::after{animation:none!important;transition:none!important}';
    root.append(frozen);
    // Use the browser's CSS parser, never regex-renaming IDs or selectors.
    // :root does not match a shadow child; root variables are captured inline.
    // Rewrite only parsed selectors that target the root document element.
    const visit = rules => { for (const rule of rules) {
      if (rule.selectorText === ':root') rule.selectorText = 'html';
      if (rule.cssRules) visit(rule.cssRules);
    } };
    if (style.sheet) visit(style.sheet.cssRules);
    root.addEventListener('click', event => event.preventDefault());
    root.addEventListener('submit', event => event.preventDefault());
  }
}
