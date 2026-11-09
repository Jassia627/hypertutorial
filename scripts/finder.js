// Element finder shared by capture (live app) and the HyperFrames composition (captured layers).
// Selector forms: text:, button:, option:, combobox:, placeholder:, after:<label>, date:<n>, css:<selector>.
// Prefix with "dialog>> " to search inside the open [role=dialog].
(function () {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  function smallest(list, text) {
    const hits = list.filter((e) => norm(e.textContent).includes(text));
    hits.sort((a, b) => norm(a.textContent).length - norm(b.textContent).length);
    return hits[0];
  }
  // Modifiers at the end: " << css" climbs to the closest ancestor matching css; each trailing "^" climbs one parent.
  function find(root, spec) {
    const up = spec.match(/^(.*?)\s*<<\s*(.+)$/);
    if (up) {
      const el = find(root, up[1]).closest(up[2]);
      if (!el) throw new Error('Sin ancestro "' + up[2] + '" para: ' + up[1]);
      return el;
    }
    const hops = spec.match(/\^+$/);
    if (hops) {
      let el = find(root, spec.slice(0, -hops[0].length));
      for (let i = 0; i < hops[0].length; i++) el = el.parentElement;
      return el;
    }
    let scope = root, s = spec;
    const d = s.match(/^dialog>>\s*(.*)$/);
    if (d) { scope = root.querySelector('[role=dialog]') || root; s = d[1]; }
    const i = s.indexOf(':');
    const kind = s.slice(0, i), arg = s.slice(i + 1);
    let el;
    switch (kind) {
      case 'text': el = smallest([...scope.querySelectorAll('*')], arg); break;
      case 'button': el = smallest([...scope.querySelectorAll('button,[role=button],a')], arg); break;
      case 'option': el = smallest([...scope.querySelectorAll('[role=option]')], arg); break;
      case 'combobox': el = smallest([...scope.querySelectorAll('[role=combobox]')], arg); break;
      case 'placeholder': el = [...scope.querySelectorAll('[placeholder]')].find((e) => e.getAttribute('placeholder') === arg); break;
      case 'after': {
        const label = [...scope.querySelectorAll('span,label')].find((e) => norm(e.textContent) === arg);
        el = label && [...scope.querySelectorAll('input,textarea,select')].find((x) => label.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_FOLLOWING);
        break;
      }
      case 'date': el = scope.querySelectorAll('input[type=date]')[Number(arg)]; break;
      case 'css': el = scope.querySelector(arg); break;
      default: throw new Error('Selector desconocido: ' + spec);
    }
    if (!el) throw new Error('No encontré: ' + spec);
    return el;
  }
  window.__htFind = find;
  window.__htNorm = norm;
})();
