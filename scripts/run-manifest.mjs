import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { containedPath } from './paths.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export const fileHash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function privateProjection(value, key = '') {
  if (/password|token|secret|api.?key|credential/i.test(key)) return '[excluded]';
  if (key === 'login') return value ? { configured: true, url: value.url } : undefined;
  if (Array.isArray(value)) return value.map(v => privateProjection(v));
  if (value && typeof value === 'object') {
    const result = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, privateProjection(v, k)]));
    if (value.fill && /password|token|secret|email|user/i.test(value.fill)) result.value = '[excluded]';
    if (value.eval) result.eval = '[trusted-code-excluded]';
    return result;
  }
  return value;
}
export function outputHashes(dir, names) {
  const result = {};
  const visit = relative => {
    const file = containedPath(dir, relative);
    if (!fs.existsSync(file)) throw new Error('Required output missing');
    if (fs.statSync(file).isDirectory()) for (const name of fs.readdirSync(file).sort()) visit(path.join(relative, name));
    else result[relative.replaceAll('\\', '/')] = fileHash(file);
  };
  names.forEach(visit);
  return result;
}
export function reusable(dir, record, input) {
  if (record?.status !== 'complete' || record.input !== input || !record.outputs) return false;
  try { return Object.entries(record.outputs).every(([name, hash]) => fileHash(containedPath(dir, name)) === hash); }
  catch { return false; }
}
export function saveManifest(dir, manifest) {
  const temporary = containedPath(dir, `.ht-manifest-${crypto.randomUUID()}.json`);
  fs.writeFileSync(temporary, JSON.stringify(manifest, null, 2));
  fs.renameSync(temporary, containedPath(dir, 'run-manifest.json'));
}
