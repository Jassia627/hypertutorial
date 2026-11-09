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

## Resumable runs

`node scripts/run.mjs <project> --dry-run` validates and prints the phase plan
without launching a browser/provider or writing any output. `--resume` verifies
each recorded output's SHA-256 before reuse. Spec, tool, dependency, Node and
configuration fingerprints invalidate affected phases and their dependents.
The v1 manifest contains hashes and relative output locators, not credentials.
Authentication values are excluded, never hashed. Credential-sensitive captures
need a manually changed, nonsecret `capturePolicy.authRevision` to be reusable;
otherwise explicitly use `--refresh-capture` to replay from the beginning.
Update that revision when credentials/account identity or trusted eval changes.
Do not put secrets in specs, narration, URLs, provider options or revision names.

Capture cannot resume halfway through browser actions. A failed or invalidated
capture blocks resume until `--refresh-capture` explicitly authorizes replay.
Voice keeps its per-line verified WAV cache. Non-mock narration always needs
`--allow-paid` when calls may run; failed requests are not automatically retried.
Other safe phases can run again. `--render [--draft]` includes video generation;
without it the run ends after lint and snapshots. Cancellation/failure never
records a complete phase. Manifests are replaced atomically. Run one process per
project at a time; concurrent writers are unsupported.

Builds use project-local staging and retain `.ht-backup-hf-*` directories after
successful replacement. Failed staging and retained backups can be inspected and
removed manually; the CLI does not recursively delete unknown directories.
