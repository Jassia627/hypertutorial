// Builds the HyperFrames composition (hf/index.html) from captured states, steps and narration.
// Usage: node build.mjs <project dir>
import fs from 'node:fs';
import path from 'node:path';
import { SKILL, loadProject } from './common.mjs';
import { makeBed, resolveTrack } from './music.mjs';

const { dir, spec } = loadProject(process.argv[2]);
const OUT = path.join(dir, 'hf');
const VOICE = path.join(dir, 'voice');
const voice = JSON.parse(fs.readFileSync(path.join(VOICE, 'voice.json'), 'utf8'));
const theme = { bg: '#0b2a24', accent: '#16a34a', glow: '#16a34a55', ...spec.theme };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'audio'), { recursive: true });
fs.cpSync(path.join(dir, 'states/fonts'), path.join(OUT, 'states/fonts'), { recursive: true });
fs.copyFileSync(path.join(SKILL, 'node_modules/gsap/dist/gsap.min.js'), path.join(OUT, 'gsap.min.js'));
fs.writeFileSync(path.join(OUT, 'hyperframes.json'), JSON.stringify({ paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' } }, null, 2));

// --- captured states ---------------------------------------------------------
const W = spec.app.width ?? 1440, CH = spec.app.captureHeight ?? 1500, VH0 = spec.app.viewportHeight ?? 810;
const states = Object.fromEntries(spec.states.map((s) => [s.name, JSON.parse(fs.readFileSync(path.join(dir, 'states', s.name + '.json'), 'utf8'))]));
const used = [...new Set(spec.steps.flatMap((s) => [s.state, s.next].filter(Boolean)))];
for (const n of used) if (!states[n]) throw new Error('Estado no capturado: ' + n);
const first = states[used[0]];
const appCss = first.css.replace(/#root\b/g, '.app-root');
const clean = (html) => html.replace('<div id="root">', '<div class="app-root">').replace(/\sid="[^"]*"/g, '');
const fixedOf = (n) => spec.states.find((s) => s.name === n)?.fixed;

// --- schedule (seconds) ------------------------------------------------------
const dur = (id) => voice[id]?.duration ?? 1.5;
const intro = { t: 0, d: +(dur('intro') + 0.9).toFixed(3) };
let T = intro.d;
const plan = spec.steps.map((s, i) => {
  const typeDur = s.kind === 'type' ? Math.min(1.5, 0.07 * String(s.value).length) : 0;
  const d = Math.max(dur(s.id) + 0.6, 1.0 + typeDur + (s.reveal ? 2.2 : 0.55));
  const p = { ...s, n: i + 1, t: +T.toFixed(3), d: +d.toFixed(3), act: 1.0, typeDur };
  T += d;
  return p;
});
const outro = { t: +T.toFixed(3), d: +(dur('outro') + 1.6).toFixed(3) };
const TOTAL = +(outro.t + outro.d).toFixed(3);

const beats = ['intro', ...plan.map((p) => p.id), 'outro'].filter((id) => voice[id]);
for (const id of beats) fs.copyFileSync(path.join(VOICE, id + '.wav'), path.join(OUT, 'audio', id + '.wav'));
// Optional music bed, ducked under every narration line. spec.music: { track: <built-in style | song in music/ | path> }, plus volume.
const trackId = spec.music?.track ?? spec.music?.style ?? spec.music?.file;
const music = trackId && trackId !== 'none';
if (music) {
  const { style, file } = resolveTrack(trackId, dir);
  const ducks = [['intro', 0], ...plan.map((p) => [p.id, p.t]), ['outro', outro.t]].filter(([id]) => voice[id]).map(([id, t]) => [t + 0.15, t + 0.15 + dur(id)]);
  makeBed({ style, file, volume: spec.music.volume ?? 0.16, seconds: TOTAL, ducks, out: path.join(OUT, 'audio', 'music.wav') });
}
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const audio = (id, t) => voice[id] ? `<audio id="v-${id}" src="audio/${id}.wav" data-start="${(t + 0.15).toFixed(3)}" data-duration="${dur(id).toFixed(3)}" data-track-index="5"></audio>` : '';
const emoji = ['Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', 'SFMono-Regular'].map((f) => `@font-face { font-family: '${f}'; src: local('${f}'); }`).join(' ');
const font = spec.font ?? 'Outfit';

const html = `<!doctype html>
<html lang="${spec.language ?? 'es'}" style="${first.htmlStyle.replace(/"/g, '&quot;')}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1920, height=1080" />
<script src="gsap.min.js"></script>
<style>${fs.readFileSync(path.join(dir, 'states/fonts.css'), 'utf8')}
${emoji}</style>
<style>${appCss}</style>
<style>
  html, body { margin: 0 !important; width: 1920px !important; height: 1080px !important; overflow: hidden !important; background: ${theme.bg} !important; }
  #hf-root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: '${font}', sans-serif; }
  .clip { position: absolute; inset: 0; }
  #bg { background: radial-gradient(1200px 800px at 80% 10%, ${theme.glow}, transparent 60%), radial-gradient(1000px 700px at 5% 95%, #0ea5e933, transparent 60%), ${theme.bg}; }
  #win { position: absolute; left: 160px; top: 52px; width: 1600px; height: 944px; border-radius: 18px; overflow: hidden; background: #fff; box-shadow: 0 40px 120px #0008, 0 0 0 1px #ffffff22; }
  #bar { height: 44px; background: #f1f5f9; display: flex; align-items: center; gap: 9px; padding: 0 18px; border-bottom: 1px solid #e2e8f0; }
  #bar i { width: 13px; height: 13px; border-radius: 50%; display: block; }
  #bar b { margin-left: 18px; font: 600 15px '${font}', sans-serif; color: #64748b; background: #fff; border-radius: 8px; padding: 5px 16px; }
  #vp { position: absolute; left: 0; top: 44px; width: 1600px; height: 900px; overflow: hidden; background: #f8fafc; }
  #world { position: absolute; left: 0; top: 0; width: ${W}px; height: ${CH}px; transform-origin: 0 0; }
  .layer { position: absolute; inset: 0; width: ${W}px; height: ${CH}px; overflow: hidden; transform: translateZ(0); opacity: 0; }
  .layer, .layer * { animation: none !important; transition: none !important; }
  #cur { position: absolute; left: 0; top: 0; width: 1px; height: 1px; z-index: 50; }
  #cur svg { position: absolute; left: 0; top: 0; width: 30px; height: 40px; transform-origin: 0 0; filter: drop-shadow(0 3px 5px #0006); }
  #rip { position: absolute; left: -26px; top: -26px; width: 52px; height: 52px; border-radius: 50%; border: 4px solid ${theme.accent}; opacity: 0; z-index: 49; }
  #hl { position: absolute; border: 4px solid ${theme.accent}; border-radius: 14px; box-shadow: 0 0 0 9999px #0f172a26; opacity: 0; z-index: 48; }
  .cap { display: flex; align-items: flex-end; justify-content: center; padding-bottom: 46px; pointer-events: none; z-index: 60; }
  .cap div { max-width: 1300px; background: #0f172ae6; color: #fff; font: 600 30px/1.3 '${font}', sans-serif; padding: 14px 30px; border-radius: 16px; text-align: center; }
  .badge { z-index: 61; }
  .badge div { position: absolute; left: 190px; top: 4px; background: ${theme.accent}; color: #fff; font: 700 24px '${font}', sans-serif; padding: 9px 22px; border-radius: 999px; box-shadow: 0 8px 24px #0005; }
  .card { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #fff; z-index: 70; }
  .card .k { font: 700 28px '${font}', sans-serif; color: #86efac; letter-spacing: .08em; text-transform: uppercase; }
  .card h1 { font: 800 92px/1.05 '${font}', sans-serif; margin: 18px 0 0; max-width: 1500px; }
  .card p { font: 500 34px '${font}', sans-serif; color: #d1fae5; margin: 22px 0 0; }
</style>
</head>
<body>
<div id="hf-root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${TOTAL}">
  <div id="bg" class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="0"></div>
  <div id="app" class="clip" data-start="0" data-duration="${TOTAL}" data-track-index="1">
    <div id="win">
      <div id="bar"><i style="background:#f87171"></i><i style="background:#fbbf24"></i><i style="background:#34d399"></i><b>${esc(spec.windowTitle ?? spec.title)}</b></div>
      <div id="vp"><div id="world">
${used.map((n) => `        <div class="layer ${states[n].bodyClass}" data-state="${n}"${fixedOf(n) ? ` style="height:${VH0}px"` : ''}>${clean(states[n].html)}</div>`).join('\n')}
        <div id="hl"></div><div id="rip"></div>
        <div id="cur"><svg viewBox="0 0 30 40"><path d="M2 2 L2 32 L10 25 L15 37 L21 34 L16 22 L27 22 Z" fill="#fff" stroke="#0f172a" stroke-width="2.4" stroke-linejoin="round"/></svg></div>
      </div></div>
    </div>
  </div>
  <div id="intro" class="clip card" data-start="0" data-duration="${intro.d}" data-track-index="2"><div class="in"><div class="k">${esc(spec.intro?.kicker)}</div><h1>${esc(spec.intro?.title ?? spec.title)}</h1><p>${esc(spec.intro?.subtitle)}</p></div></div>
${plan.map((p) => `  <div class="clip cap" data-start="${p.t}" data-duration="${p.d}" data-track-index="3"><div>${esc(p.narration)}</div></div>
  <div class="clip badge" data-start="${p.t}" data-duration="${p.d}" data-track-index="4"><div>${p.n} · ${esc(p.title)}</div></div>`).join('\n')}
  <div id="outro" class="clip card" data-start="${outro.t}" data-duration="${outro.d}" data-track-index="2"><div class="in"><div class="k">${esc(spec.outro?.kicker)}</div><h1>${esc(spec.outro?.title)}</h1><p>${esc(spec.outro?.subtitle)}</p></div></div>
  ${audio('intro', 0)}
${plan.map((p) => '  ' + audio(p.id, p.t)).join('\n')}
  ${audio('outro', outro.t)}
  ${music ? `<audio id="music" src="audio/music.wav" data-start="0" data-duration="${TOTAL}" data-volume="1" data-track-index="6"></audio>` : ''}
</div>
<script>${fs.readFileSync(path.join(SKILL, 'scripts/finder.js'), 'utf8')}</script>
<script>
const PLAN = ${JSON.stringify(plan.map(({ narration, ...p }) => p))};
const INTRO = ${JSON.stringify(intro)}, OUTRO = ${JSON.stringify(outro)}, STATES = ${JSON.stringify(used)}, FIXED = ${JSON.stringify(used.filter(fixedOf))};
const hOf = (n) => (FIXED.includes(n) ? ${VH0} : WH);
const VW = 1600, VH = 900, WW = ${W}, WH = ${CH}, BASE = VW / WW;
const world = document.getElementById('world');
const layerEl = (n) => document.querySelector('[data-state="' + n + '"]');
const find = (n, sel) => window.__htFind(layerEl(n), sel);
function rect(el) {
  const r = el.getBoundingClientRect(), w = world.getBoundingClientRect();
  return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height };
}
function camFor(r, maxZoom, wh = WH) {
  const pad = 140;
  const s = Math.max(BASE, Math.min(maxZoom, VW / (r.w + pad * 2), VH / (r.h + pad * 2)));
  const x = Math.min(0, Math.max(VW - WW * s, VW / 2 - (r.x + r.w / 2) * s));
  const y = Math.min(0, Math.max(VH - wh * s, VH / 2 - (r.y + r.h / 2) * s));
  return { x, y, scale: s };
}
const ALL = { x: 0, y: 0, scale: BASE };

gsap.set(world, { x: 0, y: 0, scale: 1 });
const tl = gsap.timeline({ paused: true });
const show = (n, t) => { for (const l of STATES) tl.set(layerEl(l), { opacity: l === n ? 1 : 0 }, t); };
const cur = document.getElementById('cur'), curSvg = cur.querySelector('svg'), rip = document.getElementById('rip'), hl = document.getElementById('hl');
const flip = (fn0, fn1, t) => { const o = { v: 0 }; tl.to(o, { v: 1, duration: 0.05, onUpdate: () => (o.v >= 1 ? fn1() : fn0()) }, t); };

// Measure targets on the static layout before any camera move (deterministic).
for (const p of PLAN) {
  p.el = p.sel ? find(p.state, p.sel) : null;
  p.r = p.el ? rect(p.el) : { x: 0, y: 0, w: WW, h: ${VH0} };
  p.hr = p.highlight ? rect(find(p.state, p.highlight)) : null;
  if (p.after && p.after !== 'all') p.ar = rect(find(p.next, p.after));
  if (p.reveal) p.revealEl = find(p.next, p.reveal);
  if (p.set) p.setEls = [...layerEl(p.state).querySelectorAll('*')].filter((e) => !e.children.length && window.__htNorm(e.textContent) === p.set.match);
}

show(PLAN[0].state, 0);
tl.set(world, ALL, 0);
tl.set(cur, { x: WW * 0.75, y: ${VH0} * 0.8 }, 0);
tl.fromTo('#intro .in', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0.2);
tl.to('#intro .in', { y: -30, opacity: 0, duration: 0.5, ease: 'power2.in' }, INTRO.d - 0.6);
tl.fromTo('#win', { y: 120, scale: 0.9, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out' }, INTRO.d - 0.5);

const camTo = (c, t) => { tl.to(world, { ...c, duration: 0.75, ease: 'power2.inOut' }, t); tl.to(curSvg, { scale: BASE / c.scale, duration: 0.75, ease: 'power2.inOut' }, t); };
for (const p of PLAN) {
  const t = p.t, a = t + p.act;
  camTo(p.camera === 'all' || !p.el ? ALL : camFor(p.r, p.zoom ?? (p.kind === 'hover' ? 1.6 : 1.9), hOf(p.state)), t);
  const tx = p.r.x + Math.min(p.r.w * 0.5, 60), ty = p.r.y + p.r.h * 0.55;
  if (p.kind !== 'none') tl.to(cur, { x: tx, y: ty, duration: 0.7, ease: 'power3.inOut' }, t + 0.2);
  if (['click', 'type', 'date'].includes(p.kind)) {
    tl.set(rip, { x: tx, y: ty }, a);
    tl.fromTo(rip, { scale: 0.3, opacity: 0.9 }, { scale: 1.6, opacity: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, a);
    tl.fromTo(curSvg, { y: 0 }, { y: 3, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, a);
  }
  if (p.kind === 'type') {
    const el = p.el, text = String(p.value), orig = el.value, o = { n: -1 };
    tl.to(o, { n: text.length, duration: p.typeDur, ease: 'none', onUpdate: () => { el.value = o.n < 0 ? orig : text.slice(0, Math.max(0, Math.round(o.n))); } }, a + 0.05);
  }
  if (p.kind === 'date') { const el = p.el, orig = el.value; flip(() => (el.value = orig), () => (el.value = p.value), a + 0.25); }
  if (p.set) for (const e of p.setEls) { const orig = e.textContent; flip(() => (e.textContent = orig), () => (e.textContent = p.set.text), a + p.typeDur + 0.15); }
  if (p.hr) {
    const pad = 12;
    tl.set(hl, { left: p.hr.x - pad, top: p.hr.y - pad, width: p.hr.w + pad * 2, height: p.hr.h + pad * 2 }, t);
    tl.fromTo(hl, { opacity: 0 }, { opacity: 1, duration: 0.35, immediateRender: false }, t + 0.5);
    tl.to(hl, { opacity: 0, duration: 0.3 }, t + p.d - 0.35);
  }
  if (p.next) show(p.next, a + (p.kind === 'type' ? p.typeDur + 0.15 : 0.18));
  if (p.after) camTo(p.after === 'all' ? ALL : camFor(p.ar, 1.3, hOf(p.next)), a + 0.3);
  if (p.reveal) tl.fromTo(p.revealEl, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.6)', immediateRender: false }, a + 0.35);
}
for (const c of document.querySelectorAll('.cap div, .badge div')) {
  const host = c.parentElement, s = +host.dataset.start, d = +host.dataset.duration;
  tl.fromTo(c, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, s + 0.05);
  tl.to(c, { opacity: 0, duration: 0.2 }, s + d - 0.22);
}
tl.to('#win', { scale: 0.94, opacity: 0, duration: 0.6, ease: 'power2.in' }, OUTRO.t);
tl.fromTo('#outro .in', { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out', immediateRender: false }, OUTRO.t + 0.4);
window.__timelines['main'] = tl;
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.writeFileSync(path.join(dir, 'times.json'), JSON.stringify(plan.map((p) => ({ id: p.id, start: p.t, action: +(p.t + p.act).toFixed(2), check: +(p.t + p.act + p.typeDur + 0.7).toFixed(2) })), null, 1));
console.log(`✔ hf/index.html · ${TOTAL} s · ${plan.length} pasos · tiempos en times.json`);
