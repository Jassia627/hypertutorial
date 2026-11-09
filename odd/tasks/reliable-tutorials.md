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

- [ ] P1 — Validate and normalize a versioned spec before side effects; add a standalone validation command, path containment and legacy compatibility tests.
- [ ] P2 — Enforce explicit application policies, separate authentication, constrain scripts/storage, safely cancel and redact policy diagnostics.
- [ ] P3 — Preserve per-state CSS, form state and ID relationships; report resource failures, redact HTML/screenshots and make exports inert.
- [ ] P4 — Handle subprocess launch errors, exit codes, signals and output validation correctly; retain last successful outputs and bounded GPU fallback.
- [ ] P5 — Add dry-run/resumable orchestration with input/output invalidation and no unsafe action or paid-call replay.
- [ ] P6 — Qualify with local fixtures, mock voice, deterministic and visual checks; update user documentation and migration examples.

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

Implement P1 on the feature branch, then proceed in order and record phase outcomes, commands, limitations and commit identities below. Do not mark a phase complete merely because files exist.
