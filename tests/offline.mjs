// Preloaded only by fixture children, never by normal user commands.
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
function allowed(input) {
  const u = input instanceof URL ? input : new URL(typeof input === 'string' ? input : input.url);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) {
    process.stderr.write('OFFLINE_DENIED: external network attempted\n');
    throw new Error('Fixture mode forbids external network');
  }
}
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, options) => { allowed(input); return originalFetch(input, options); };
for (const client of [http, https]) {
  for (const method of ['request', 'get']) {
    const original = client[method];
    client[method] = function (input, ...args) {
      if (typeof input === 'string' || input instanceof URL) allowed(input);
      else allowed(`${client === https ? 'https' : 'http'}://${input.hostname ?? input.host ?? 'localhost'}`);
      return original.call(this, input, ...args);
    };
  }
}
syncBuiltinESMExports();
