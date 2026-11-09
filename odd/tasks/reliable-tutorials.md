# Reliable and safer tutorial generation

## Objective

Implement the six approved improvement phases for the existing local hypertutorial CLI: early validation, explicit capture protections, visual fidelity and redaction, reliable rendering, resumable execution, and repeatable qualification.

## Scope and constraints

- Work only in hypertutorial; do not read credentials or touch other projects.
- Write source only with dedicated editing/patch tools, never shell-generated code.
- Preserve existing tutorials through a documented compatibility path; do not silently permit unsafe legacy actions.
- Use local deterministic fixtures and mock narration; no paid requests or real application capture.
- Keep existing CLI entry points. No GUI, hosting, new voice providers, publishing, or remote operations.
- Existing untracked `.codegraph/`, `AGENTS.md`, and `output/` predate implementation and must not be committed or removed.
- Functional changes use failing deterministic tests before implementation when applicable, followed by green tests and refactoring.

## Delivery

- Route: delegated direct, one writer, followed by independent verification.
- Reason: implementation spans multiple non-trivial source files and requires testing and integration.
- Use a local `codex/` feature branch; main must remain unchanged. Do not push, create PRs, or merge.
- Forecast: approximately 1,500–3,000 authored changed lines, to be measured rather than enforced through code compression.
- Work-unit boundaries follow phases. Any future PR slicing remains a separate decision; no remote delivery is authorized.
- Receipt-driven development: off, verified by `gentle-ai review mode status`; do not enable or start native review.
- Engram mirror: available under `odd/reliable-tutorials/tasks`, observation 632; refresh the full document after progress changes.

## Tasks

- [x] P1 — Validate and normalize a versioned spec before side effects; add a standalone validation command, path containment and legacy compatibility tests.
- [x] P2 — Enforce explicit application policies, separate authentication, constrain scripts/storage, safely cancel and redact policy diagnostics.
- [x] P3 — Preserve per-state CSS, form state and ID relationships; report resource failures, redact HTML/screenshots and make exports inert.
- [x] P4 — Handle subprocess launch errors, exit codes, signals and output validation correctly; retain last successful outputs and bounded GPU fallback.
- [x] P5 — Add dry-run/resumable orchestration with input/output invalidation and no unsafe action or paid-call replay.
- [x] P6 — Qualify with local fixtures, mock voice, deterministic and visual checks; update user documentation and migration examples.

Each phase follows the delegated route above. Tests and relevant documentation belong with their behavior, not solely in P6.

## Acceptance criteria

1. Invalid specs and unsafe paths fail before browser/provider/output side effects; existing examples have tested compatibility.
2. Local policy fixtures prove forbidden writes do not reach their server; safety limitations are explicit.
3. State-specific styles, forms and ID references survive export; test secrets are absent from exported HTML, screenshots and logs.
4. Launch/render failures never report success, cancellation does not mark work complete, and failed runs preserve valid artifacts.
5. Resume checks inputs and outputs; changes invalidate dependent phases; browser actions are never resumed mid-sequence.
6. Deterministic tests, fixture integration and a local mock smoke run have observed results; visual inspection and unavailable checks are recorded honestly.

## Verification

- Writer must establish runnable test scripts and report exact RED/GREEN observations for applicable regressions.
- Required final checks: `npm test`, `npm run test:integration`, `npm run test:visual`, and `npm run smoke` once implemented; report missing prerequisites explicitly.
- Existing HyperFrames lint/snapshot/draft render should be exercised only against the local fixture with mock narration.
- Independent verifier runs final applicable tests and audits safety, validation, recovery, secret handling and compatibility.
- Parent spot check: rerun `npm test` and structurally inspect the final diff.

## Progress and evidence

P1: implemented versioned in-memory normalization and shared early validation,
standalone CLI, safe names, references, action/value/size checks, managed path
containment and symlink rejection. RED: `node --test tests/spec.test.mjs` failed
with missing spec module. GREEN: `npm.cmd test` passes normalizer tests; junction
case explicitly skips when sandbox refuses EPERM. Existing dosis-compras example
normalizes successfully. `npm` PowerShell shim is blocked; use `npm.cmd` on this
host. No browser/provider side effects during validation. Schema is an editor
aid; runtime semantic validation is authoritative. P1 closure remains subject to
later qualification and independent audit.

## Next step

P1 commit: `2f7f21f`. P2 implemented exact per-phase request authorization,
context-wide routing, blocked service workers/websockets/WebRTC, ephemeral auth,
trusted-eval opt-in, declarative toast, prefix-constrained storage and finally
cleanup. RED: policy tests failed missing module. GREEN: `npm.cmd test` 5 pass,
1 sandbox junction skip. Local server network proof follows in P6; P2 not yet
qualified against browser integration. Migration documents GET side effects and
isolation as primary protection. RDD remains off.

P2 commit: `5f1ebaa`. P3: added protected asset inlining, stylesheet base handling,
ordered per-state CSS, live form serialization, default/custom redaction, inert
redacted screenshots and shadow-root state isolation preserving IDs/references.
RED: `node --test tests/capture.integration.mjs` missing capture-state module.
GREEN: same command with host-browser permission passed 1/1. Sandbox browser
lookup has no installed Chromium; host run uses installed Chromium, no download.
Unsupported native shadow/canvas/media and inaccessible CSS are diagnostics;
compound :root selectors remain a documented fidelity limitation. Actual build
and HyperFrames qualification pending P6.

P3 commit: `2e8db6e`. P4 adds asynchronous subprocess launch/status/signal/
timeout/cancel checks, privacy environment preserved on one recognized GPU-startup
retry, ffprobe-validated staged video publication and staged build rollback.
Build backups are retained, never recursively deleted. Narration writes staged
WAVs, validates duration/hash, atomically updates cache and supports cancellation.
Provider error bodies are suppressed. RED: process tests missing module; GREEN:
`npm.cmd test` 8 pass and 1 sandbox junction skip. Render qualification pending.

P4 commit: `a9bd329`. Host-permission `npm.cmd test` also passed 9/9 including
junction containment. P5 adds dry-run/resume with v1 atomic manifests, canonical
input hashes, verified output hashes, tool/installed-dependency fingerprints,
phase dependencies and explicit failed-capture replay/paid-call consent flags.
Auth secrets are excluded rather than hashed; reusable auth requires nonsecret
authRevision. RED: run tests missing module. GREEN: `npm.cmd test` 10 pass,
1 sandbox junction skip. Full dry-run/resume fixture execution follows in P6.

Parent independently verifies and mirrors this full document to Engram. All six
implementation phases are locally qualified; no push, PR or merge.

## Final qualification evidence

- P5 commit: `80d9cfd`. P6 route: delegated direct, same single writer; no new
  dependencies, no real app capture, provider calls or publishing.
- `npm.cmd test`: 14/14 pass under host permissions, including actual junction
  containment, process launch/status/timeout/abort, policy, manifest and legacy
  normalization. Sandbox-only runs may explicitly skip junction creation EPERM.
- Final semantic hardening rejects malformed narration/card/provider/replacement
  shapes before any phase. Observed RED from missing expected validation, then
  GREEN in the full unit suite. A Windows staged-directory rename returned EPERM
  during one smoke; publication now retries only bounded sharing-lock error codes
  (five attempts maximum), with a deterministic RED/GREEN regression test. The
  cause of that transient OS denial was not established; no data was deleted.
- `npm.cmd run test:integration`: 2/2 pass. Browser exports preserve live forms,
  ID relationships and redactions; POST /write does not reach the local server;
  unchanged mock voice reuses WAVs; failed build preserves existing composition.
- Query-token privacy regression: observed RED when Playwright's uncaught
  navigation failure printed a fixture query secret; GREEN after suppressing raw
  browser exceptions at the capture boundary. Policy diagnostics contain no URLs.
- `npm.cmd run test:visual`: 1/1 pass on generated composition; separate state
  colors, forms and SVG/ARIA/label references verified. Frames were inspected.
  Observed RED for check-times sampling caption fade-out on short beats; GREEN
  after clamping QA times before fade-out. A returned GSAP timeline is thenable;
  Playwright seeks must return void rather than await a paused timeline.
- Smoke `smoke-0AAr1z`: lint 0 errors / 7 non-blocking nested-structure warnings,
  2 HyperFrames snapshots, validated 9.1-second draft MP4 (1.2 MB, 32.3 s render),
  verified full resume without HTTP replay and corrupted-output rejection.
- Final frozen-source closure: `npm.cmd test` 14/14, `npm.cmd run
  test:integration` 2/2, `npm.cmd run test:visual` 1/1 and `npm.cmd run smoke`
  exit 0. Latest smoke `tests/artifacts/smoke-s5KtwU` passed lint, both snapshots,
  validated a 9.1-second draft MP4 (1.2 MB; 55.6 seconds render), resumed all phases
  without HTTP replay and refused tampered capture outputs. Final visual frames
  `tests/artifacts/visual-e9xGbZ/next-frame.png` and `done-frame.png` were inspected:
  readable captions/badges, redacted fixture fields, stable form/ID relationships.
- `git diff --check` passed; both existing and safe-local examples normalized.
  Final check failures/skips: none under host permission. Paid providers and forced
  GPU startup failure are deliberately not exercised beyond local mocks/unit proof.

## Work-unit rollback boundary

The feature is local-only. Phase commits form a dependency sequence; revert newest
first to remove qualification/run/runtime/capture/spec behavior without touching
the pre-existing untracked `.codegraph/`, `AGENTS.md` or `output/`. No generated
fixture artifacts or credentials belong to the commits. Do not recursively delete
the retained output/staging directories as part of rollback.
- An early smoke unexpectedly fetched Google Fonts through HyperFrames system
  font normalization. Subsequent fixtures use an already installed bundled font,
  explicit local asset rules and a test-only Node HTTP/fetch loopback guard.
  Offline-guarded smoke passed without any denied external request marker.
- Host Chromium is required here because the sandbox points to a different empty
  browser cache. No browser download or package install was performed.

## Remaining limitations

- Native shadow DOM, canvas/media/embeds and compound root selectors are reported
  or documented unsupported fidelity cases, not claimed pixel-exact.
- Custom PII needs explicit selectors; binary images cannot be auto-redacted.
  Request interception is not a universal no-write guarantee; isolation is primary.
- Generic/system fonts can trigger HyperFrames external font localization outside
  the controlled fixture. Supply a captured local face when offline is required.
- HyperFrames reports three optional emoji font failures on this Windows host and
  sometimes forcibly closes its own browser after a shutdown timeout. Draft video
  validation succeeds. CPU fallback recognition is unit-tested, not forced against
  actual GPU hardware. Paid providers deliberately remain uncalled.
- A single run per project is required. Build backups are deliberately retained.
- Independent verification and the Engram full-document mirror are parent-owned.
