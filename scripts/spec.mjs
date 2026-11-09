import fs from 'node:fs';
import path from 'node:path';
import { containedPath } from './paths.mjs';
import { compilePolicy } from './capture-policy.mjs';

const fail = (message) => { throw new Error(`Invalid spec: ${message}`); };
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
const text = (v) => typeof v === 'string' && v.trim().length > 0;
const safeName = (v) => text(v) && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v) && !/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(v);
const selector = (v) => text(v) && /^(dialog>>\s*)?(text|button|option|combobox|placeholder|after|date|css):\S/.test(v);
function textFields(value, fields, context) {
  if (!object(value)) fail(`${context} must be an object`);
  for (const key of fields) if (value[key] !== undefined && typeof value[key] !== 'string') fail(`${context}.${key} must be text`);
}
const actions = ['goto', 'click', 'fill', 'press', 'waitFor', 'wait', 'eval', 'clearSessionStorage', 'toast'];
function action(a) {
  if (!object(a)) fail('action must be an object');
  const keys = actions.filter(k => k in a);
  if (keys.length !== 1 || Object.keys(a).some(k => ![...actions, 'value', 'optional'].includes(k))) fail('action requires exactly one known operation');
  const key = keys[0];
  if (['click', 'fill', 'waitFor'].includes(key) && !selector(a[key])) fail('invalid action selector');
  if (key === 'fill' && typeof a.value !== 'string') fail('fill requires a string value');
  if (key === 'wait' && (!Number.isFinite(a.wait) || a.wait < 0 || a.wait > 120)) fail('wait must be 0..120 seconds');
  if (['goto', 'press', 'eval', 'clearSessionStorage', 'toast'].includes(key) && !text(a[key])) fail(`${key} requires nonempty text`);
  if (key === 'goto' && (!a.goto.startsWith('/') || a.goto.startsWith('//'))) fail('goto must be an app-relative path');
  if ('optional' in a && typeof a.optional !== 'boolean') fail('optional must be boolean');
}
export function normalizeSpec(raw) {
  if (!object(raw)) fail('expected an object');
  const spec = structuredClone(raw);
  if (spec.version !== undefined && spec.version !== 1) fail('unsupported version');
  spec.version = 1;
  if (!text(spec.title) || !object(spec.app)) fail('title and app required');
  if (spec.language !== undefined && !/^[a-zA-Z-]{2,35}$/.test(spec.language)) fail('invalid language tag');
  if (spec.font !== undefined && !/^[\w -]{1,100}$/.test(spec.font)) fail('font must be a simple family name');
  if (spec.theme && (!object(spec.theme) || Object.values(spec.theme).some(v => typeof v !== 'string' || !/^#[0-9a-f]{3,8}$/i.test(v)))) fail('theme values must be hex colors');
  for (const key of ['intro', 'outro']) if (spec[key] !== undefined) textFields(spec[key], ['kicker', 'title', 'subtitle', 'narration'], key);
  if (spec.voice !== undefined) {
    textFields(spec.voice, ['provider', 'voice', 'model', 'style'], 'voice');
    if (spec.voice.options !== undefined && !object(spec.voice.options)) fail('voice.options must be an object');
  }
  if (spec.music !== undefined) textFields(spec.music, ['track', 'style', 'file'], 'music');
  let url; try { url = new URL(spec.app.url); } catch { fail('app.url must be an HTTP URL'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) fail('app.url must not contain credentials, query or fragment');
  for (const key of ['width', 'captureHeight', 'viewportHeight']) {
    if (key in spec.app && (!Number.isInteger(spec.app[key]) || spec.app[key] < 100 || spec.app[key] > 10000)) fail(`${key} must be an integer 100..10000`);
  }
  if (spec.app.start !== undefined && (!text(spec.app.start) || !spec.app.start.startsWith('/') || spec.app.start.startsWith('//'))) fail('app.start must be relative');
  spec.output ??= 'tutorial';
  if (!safeName(spec.output)) fail('unsafe output basename');
  if (!Array.isArray(spec.states) || !spec.states.length || !Array.isArray(spec.steps) || !spec.steps.length) fail('nonempty states and steps required');
  const names = new Set();
  for (const state of spec.states) {
    if (!object(state) || !safeName(state.name) || names.has(state.name)) fail('unsafe or duplicate state name');
    if ([...names].some(n => n.toLowerCase() === state.name.toLowerCase())) fail('case-colliding state name');
    names.add(state.name);
    if (state.fixed !== undefined && typeof state.fixed !== 'boolean') fail('fixed must be boolean');
    if (state.actions !== undefined && !Array.isArray(state.actions)) fail('actions must be an array');
    for (const a of state.actions ?? []) action(a);
  }
  const ids = new Set(['intro', 'outro']);
  for (const step of spec.steps) {
    if (!object(step) || !safeName(step.id) || ids.has(step.id)) fail('unsafe, reserved or duplicate step id');
    if ([...ids].some(n => n.toLowerCase() === step.id.toLowerCase())) fail('case-colliding step id');
    ids.add(step.id);
    textFields(step, ['title', 'narration'], 'step');
    if (step.set !== undefined) {
      textFields(step.set, ['match', 'text'], 'set');
      if (typeof step.set.match !== 'string' || typeof step.set.text !== 'string') fail('set requires match and text');
    }
    if (!names.has(step.state) || (step.next !== undefined && !names.has(step.next))) fail('unknown state reference');
    if (!['none', 'click', 'type', 'date', 'hover'].includes(step.kind)) fail('unknown step kind');
    if (step.kind !== 'none' && !selector(step.sel)) fail('step requires a selector');
    if (['type', 'date'].includes(step.kind) && typeof step.value !== 'string') fail('step requires string value');
    if (step.kind === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(step.value)) fail('date requires ISO date');
    for (const key of ['highlight', 'reveal', 'after']) if (step[key] !== undefined && !(key === 'after' && step[key] === 'all') && !selector(step[key])) fail(`invalid ${key} selector`);
    if (step.zoom !== undefined && (!Number.isFinite(step.zoom) || step.zoom <= 0 || step.zoom > 10)) fail('zoom must be 0..10');
  }
  if (spec.login) {
    if (!object(spec.login) || !text(spec.login.url) || !spec.login.url.startsWith('/') || spec.login.url.startsWith('//') || !Array.isArray(spec.login.steps)) fail('invalid login');
    spec.login.steps.forEach(action);
  }
  if (spec.voice?.provider && !['mock', 'speko', 'elevenlabs', 'openai'].includes(spec.voice.provider)) fail('unknown voice provider');
  if (spec.music?.volume !== undefined && (!Number.isFinite(spec.music.volume) || spec.music.volume < 0 || spec.music.volume > 1)) fail('music volume must be 0..1');
  if (spec.capturePolicy) compilePolicy(spec);
  return spec;
}
export function validateProjectPaths(dir, spec) {
  for (const name of ['states', 'voice', 'hf', 'snaps', '.auth.json', 'times.json', 'run-manifest.json', `${spec.output}.mp4`]) {
    const target = containedPath(dir, name);
    // Check descendants too: individual generated files may have been replaced with links.
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      const visit = (p) => { for (const entry of fs.readdirSync(p, { withFileTypes: true })) { const next = path.join(p, entry.name); if (entry.isSymbolicLink()) fail('managed output contains symlink'); if (entry.isDirectory()) visit(next); } };
      visit(target);
    }
  }
  for (const name of [spec.music?.file, spec.music?.track, spec.music?.style].filter(Boolean)) {
    if (typeof name !== 'string') fail('music reference must be text');
    if (/[/\\:]|^\./.test(name)) containedPath(dir, name);
  }
}
