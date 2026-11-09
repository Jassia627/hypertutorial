const fail = message => { throw new Error(`Capture policy: ${message}`); };
export function compilePolicy(spec) {
  const p = spec.capturePolicy;
  if (!p || !['isolated', 'staging', 'production'].includes(p.environment)) fail('declare environment and explicit rules; see migration guide');
  if (p.environment === 'production' && p.allowProduction !== true) fail('production requires explicit allowProduction');
  if (!Array.isArray(p.origins) || !p.origins.length) fail('origins required');
  for (const origin of p.origins) {
    let u; try { u = new URL(origin); } catch { fail('invalid origin'); }
    if (!['http:', 'https:'].includes(u.protocol) || u.origin !== origin) fail('origins must be exact HTTP origins');
  }
  if (!p.origins.includes(new URL(spec.app.url).origin)) fail('app origin not authorized');
  for (const phase of ['auth', 'capture']) {
    if (!Array.isArray(p[phase])) fail(`${phase} rules required`);
    for (const r of p[phase]) {
      if (!p.origins.includes(r.origin) || typeof r.path !== 'string' || !r.path.startsWith('/') || /[?#*]/.test(r.path) || !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].includes(r.method) || !['read', 'write'].includes(r.operation)) fail('rules require exact origin, path, method and read/write operation');
      if (r.method === 'POST' && r.operation === 'read' && (!r.operationName || !r.document || !/^\s*query\b/.test(r.document))) fail('POST reads require exact named GraphQL query document');
      if (['PUT', 'PATCH', 'DELETE'].includes(r.method) && r.operation !== 'write') fail('mutation method cannot be labeled read');
    }
  }
  if (p.storagePrefixes && (!Array.isArray(p.storagePrefixes) || p.storagePrefixes.some(v => typeof v !== 'string' || v.length < 3))) fail('storagePrefixes must be narrow nonempty prefixes');
  if (p.redactSelectors && (!Array.isArray(p.redactSelectors) || p.redactSelectors.some(v => typeof v !== 'string' || !v.trim()))) fail('redactSelectors must be CSS selectors');
  return structuredClone(p);
}
export function permits(policy, phase, request) {
  let u; try { u = new URL(request.url); } catch { return false; }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return false;
  return (policy[phase] ?? []).some(r => {
    if (r.origin !== u.origin || r.path !== u.pathname || r.method !== request.method) return false;
    if (r.operationName) {
      try { const b = JSON.parse(request.body); return !Array.isArray(b) && b.operationName === r.operationName && b.query === r.document && !b.extensions; }
      catch { return false; }
    }
    return true;
  });
}
export function checkAction(policy, action) {
  if (action.eval && policy.trustedEval !== true) fail('eval disabled; prefer declarative toast');
  if (action.clearSessionStorage !== undefined && (!action.clearSessionStorage || !policy.storagePrefixes?.some(p => action.clearSessionStorage.startsWith(p)))) fail('storage action outside authorized prefixes');
}
export async function protectContext(context, policy, phase, diagnostics) {
  await context.route('**/*', async route => {
    const r = route.request();
    if (permits(policy, phase, { url: r.url(), method: r.method(), body: r.postData() })) return route.continue();
    // No URLs: pathname, query, credentials and bodies may all contain PII.
    diagnostics.push({ phase, reason: 'request-denied', method: r.method(), resourceType: r.resourceType() });
    await route.abort('blockedbyclient');
  });
  if (typeof context.routeWebSocket !== 'function') fail('Playwright websocket interception unavailable');
  await context.routeWebSocket('**/*', ws => { diagnostics.push({ phase, reason: 'websocket-denied' }); ws.close(); });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, configurable: false });
    Object.defineProperty(navigator, 'sendBeacon', { value: () => false, configurable: false });
  });
}
