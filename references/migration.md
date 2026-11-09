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

## Fidelity and redaction

Each state retains its own ordered CSS and live form properties. Build mounts
states in separate shadow roots, preserving IDs, labels, ARIA links and SVG
fragments. It does not globally rename IDs or reuse only the first state's CSS.
Simple `:root` rules use parsed CSSOM selectors; compound document-root selectors
may differ in shadow DOM and must be visually reviewed. Root custom properties
are copied inline. Native shadow roots, canvas, video and embedded frames are
unsupported and reported, not silently claimed pixel-exact.

Assets (including CSS URLs and fonts) are fetched through the same explicit
capture rules using each stylesheet's base URL. Failed assets and inaccessible
cross-origin stylesheets appear as sanitized diagnostics. Fonts and images settle
before capture. A missing font can still change layout: inspect all frames.

Passwords, hidden/token/secret inputs and known credential values are redacted.
Declare extra CSS selectors in `capturePolicy.redactSelectors` for customer PII,
including images. Screenshots come from the redacted inert export, not the live
app. Binary image content cannot be automatically recognized as PII. Exported
handlers/scripts/active embeds are removed; CSP denies app API access and form
submission. Review redacted exports before distributing any tutorial.
