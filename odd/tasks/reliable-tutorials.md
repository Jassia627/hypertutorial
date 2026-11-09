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
- [x] P3 — Fix entity-aware secret redaction and preserve inert styling data attributes; C2/C3 regressions and existing fidelity tests pass.
- [x] P4 — Handle subprocess launch errors, exit codes, signals and output validation correctly; retain last successful outputs and bounded GPU fallback.
- [x] P5 — Retain replay-consent evidence across repeated failed resumes, verified by the C1 regression; existing orchestrator work is retained.
- [ ] P6 — Reopened for regression coverage and independent re-verification of the three findings; earlier qualification evidence is retained below.

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

P6 implementation and qualification commit: `9f6fef3`. The five preceding phase
commits are `2f7f21f`, `5f1ebaa`, `2e8db6e`, `a9bd329` and `80d9cfd` in order.

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

## Independent verification corrections (required before final delivery)

- [x] C1: Preserve capture replay consent across repeated failed `--resume` attempts. Prior phase records now survive every earlier phase save; two refusals send zero new requests, explicit refresh replays, unchanged resume reuses, and failed-capture history also survives a later spec change.
- [x] C2: Redact known secrets in decoded DOM text and attribute values before serialization, retaining browser escaping and markup structure. Tests cover ampersands, angle brackets, both quote types, text, title/ARIA/form attributes and a credential matching an HTML tag name.
- [x] C3: Preserve inert `data-state`, `data-side` and other styling attributes while removing sensitive named attributes and redacting known values. Attribute-selector computed foreground/background styles now survive alongside redaction and event-handler removal.
- [ ] C4: Add deterministic regressions, rerun all checks, independently re-verify and update final evidence.

Independent baseline checks: 14 unit, 2 integration, 1 visual passed and local mock smoke rendered a validated 9.1-second MP4. Those tests did not cover the three regressions above; prior completion claims are provisional until these corrections pass.

C1 RED: `node --test --test-name-pattern='repeated refused' tests/pipeline.integration.mjs`
failed because the capture record disappeared after validation. GREEN: the same
host-permission command passed 1/1 (19.5 seconds), covering repeated refusals,
zero network replay, explicit refresh, unchanged reuse and failed capture.
Route: delegated direct, bounded correction writer. Rollback scope: manifest
initialization in `scripts/run.mjs` and its pipeline regression; unrelated phase
implementations remain unchanged. Independent correction verification is pending.

C1 commit: `6032833`. C2/C3 RED: `node --test tests/capture.integration.mjs`
passed the existing test and failed both new regressions (encoded secrets remained
visible; `data-state` was absent). GREEN: the same host-permission command passed
3/3 after decoded-DOM redaction and targeted attribute removal. A final rerun
after robust artifact-directory creation also passed 3/3. The screenshot
`tests/artifacts/redaction-yuA7yc/redacted.png` contains redaction placeholders;
the earlier equivalent screenshot `redaction-b5LIf2/redacted.png` was visually
inspected. Route: delegated direct, same bounded writer. Rollback scope:
`scripts/capture-state.mjs` and its two capture regression tests; no unrelated
capture, process or rendering logic changed. Writer qualification is not an
independent approval; C4 and P6 remain pending parent-owned re-verification.

Correction writer final checks (host permissions; local fixtures and mock voice):
- `npm.cmd test`: 14 passed, 0 failed, 0 skipped.
- `npm.cmd run test:integration`: 5 passed, 0 failed, 0 skipped, including C1-C3.
- `npm.cmd run test:visual`: 1 passed, 0 failed, 0 skipped. Both frames in
  `tests/artifacts/visual-47VeM2` were visually inspected; captions and badges
  remain legible and fixture redactions are retained.
- `npm.cmd run smoke`: exit 0. `tests/artifacts/smoke-JRj8XX` contains the
  validated 9.1-second, 1.2 MB draft MP4 (68.9-second render), two snapshots and
  verified unchanged resume/corrupted-capture refusal. Lint: 0 errors, 7 existing
  warnings. Three optional system fonts failed and HyperFrames forcibly closed
  timed-out browser shutdowns; the final video still validated successfully.
- Final capture-only rerun after artifact-directory hardening: 3/3 passed.
- `git diff --check`: passed. No installs, external app captures, paid calls,
  remote operations or changes to the baseline untracked directories occurred.

The bounded source corrections and their deterministic regressions are complete.
Next step: parent spot check plus fresh independent correction verification;
then complete C4/P6 and synchronize the full Engram mirror. RDD remains off.

Final bounded comment-only correction: fresh independent verification confirmed
C1-C3 but found that DOM `SHOW_TEXT` redaction omitted comment nodes. The exact
`<!-- fixture-comment-secret -->` regression failed before the fix. Export now
removes comment nodes from the clone before serialization; visible elements and
text are unchanged, and both sensitive and harmless comments are omitted.
`node --test --test-name-pattern='omit comments' tests/capture.integration.mjs`
observed RED. After correction, host-permission `npm.cmd test` passed 14/14 and
`npm.cmd run test:integration` passed 6/6, with zero failures or skips.
No new video render was needed for this nonvisual removal; the parent reports
fresh independent visual/smoke qualification at `tests/artifacts/smoke-rUX4Fw`
with the already documented warnings. Rollback scope: comment removal in
`scripts/capture-state.mjs` and its exact capture integration regression.
Independent recheck of this final correction remains pending; C4/P6 stay open.

## Documented platform and fidelity limitations

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
