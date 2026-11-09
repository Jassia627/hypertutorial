# Safe capture migration

Legacy specs remain readable and are never rewritten. Capture requires explicit
`capturePolicy`; validation, voice and build do not require a live app. Use
`examples/safe-local.json` for isolated data. The environment declaration is not
proof: point the app at a disposable database and use minimal account privileges.

Request rules bind exact origin, pathname, uppercase method and read/write intent.
There are no wildcards. Authentication uses separate rules and an ephemeral
context. Cookies transfer in memory, never to `.auth.json`; old sessions are not
reused. Service workers, websocket channels and WebRTC are blocked. Unknown HTTP
routes fail closed. POST reads require an exact `operationName` and GraphQL query
`document`; batches and persisted-query extensions are denied. Other POSTs must
be explicitly labeled write. Authentication write rules belong only in `auth`.

**Not a universal no-write guarantee:** GET can mutate data. Explicitly allowed
writes and trusted eval can have side effects. Isolation and server-side read-only
permissions are primary; routing is defense in depth, not an adversarial-app sandbox.
Diagnostics omit URLs, bodies, headers and input values.

Replace eval toasts with `{ "toast": "Saved (simulation)" }`. Arbitrary eval needs
`trustedEval: true` and a trusted isolated app. Storage clearing needs explicit
`storagePrefixes` (at least three characters); actions can use narrower prefixes,
never empty. Production capture needs `allowProduction: true`; it is discouraged.
