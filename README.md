# hypertutorial

A [Claude](https://claude.com) skill that turns a flow of your web app into an animated tutorial video.

It does **not** record the screen. It captures each state of the real page (HTML, CSS and fonts) and animates a cursor, typing, camera zoom, dropdowns, dialogs and toasts over exact copies of your app with [HyperFrames](https://hyperframes.heygen.com). The video also gets AI narration, captions, step badges, an intro and an outro.

- **Uses your app's markup and styles**, with per-state isolation; inspect frames for unsupported content and layout differences.
- **Explicit capture policy, not a no-write guarantee.** Use isolated data and server-side read-only permissions. Even a GET can have side effects.
- **Renders a 100-second video in about 3 minutes**, using the GPU when one is available.
- **Optional background music:** 8 built-in royalty-free tracks (calm, upbeat, corporate, tech, lo-fi, inspiring, minimal, acoustic) plus any song you drop into `music/`, lowered automatically under the narration. `node scripts/music.mjs list` shows the repertoire.
- **Narration:** Speko, ElevenLabs or OpenAI, plus a free placeholder tone (not speech) for timing tests.

## Install

Requires Node.js 22 or newer.

```bash
git clone https://github.com/Jassia627/hypertutorial ~/.claude/skills/hypertutorial
cd ~/.claude/skills/hypertutorial
npm install
npm run setup
```

`npm run setup` asks first for the voice: the provider, its API key, the language, and one of its 3 most natural voices (for Speko it ranks its measured catalog, e.g. ElevenLabs v3 Latin American voices). Then it asks for the test account of the app you will film. They are saved in `.env` next to the skill, which is not committed.

If FFmpeg is missing after installing (newer npm versions block install scripts), approve the blocked scripts and install again:

```bash
npm install-scripts approve ffmpeg-static esbuild
```

```bash
npm install
```

## Use

With the app running (e.g. `npm run dev`), ask Claude:

> Make a hypertutorial of how to register a purchase in my app

Claude follows `SKILL.md`:
1. Explores the screens.
2. Writes `hypertutorial.json`, which describes the states to capture and what the cursor does.
3. Captures the states.
4. Generates the voice.
5. Builds the composition.
6. Checks frames and renders the video.

You can also run each step by hand:

| Step | Command |
|---|---|
| Validate without browser/voice artifacts | `node scripts/validate.mjs <project>` |
| Preview the phase plan without side effects | `node scripts/run.mjs <project> --dry-run` |
| Capture, voice, build, lint and snapshots | `node scripts/run.mjs <project>` |
| Reuse hash-verified phases | `node scripts/run.mjs <project> --resume` |
| Capture the app states | `node scripts/capture.mjs <project>` |
| Generate the narration | `node scripts/voice.mjs <project> [--provider mock]` |
| Build the composition | `node scripts/build.mjs <project>` |
| Check for errors | `node scripts/hf.mjs <project> lint` |
| Capture frames to review | `node scripts/hf.mjs <project> snapshot --at 10,20` |
| Render the video | `node scripts/hf.mjs <project> render [--draft]` |

The spec format is described in [`references/spec.md`](references/spec.md), with a complete example in [`examples/dosis-compras.json`](examples/dosis-compras.json).

## Safer capture and compatibility

Start new isolated projects from [`examples/safe-local.json`](examples/safe-local.json),
copying it to `<project>/hypertutorial.json` and adjusting exact request rules.
Versionless legacy specs load without rewriting. Legacy capture now requires
explicit `capturePolicy`: authentication and capture authorize separate exact
origin/path/method operations. Unknown routes, service workers, websockets and
WebRTC/WebTransport are blocked. Use a declarative simulated toast, not app eval.
Passwords, tokens and configured PII selectors are redacted before HTML/screenshots.
Assets must also be authorized; failures appear in captured-state diagnostics.
See the [migration and limitations guide](references/migration.md) before capture.

Resume is phase-level. Invalid capture requires `--refresh-capture` to authorize
replay from the start. Paid narration requires `--allow-paid` when running the
orchestrator; it is never retried automatically. `--render --draft` adds a bounded
preview render. Last valid build/video remains on failure; project-local staging
and build backups are retained for inspection. Use one process per project.

HyperFrames may automatically localize system fonts using Google Fonts. To avoid
that external fetch and font substitution, capture an explicit local `@font-face`
with approved asset rules and use that family for captions. The qualification
fixture uses the already installed HyperFrames bundled font and a Node network
guard; mock voice alone does NOT imply an offline run.

## Local qualification

```bash
npm test                  # Node deterministic unit tests
npm run test:integration  # local Playwright fixture, no real app or .env
npm run test:visual       # generated composition assertions and PNGs
npm run smoke             # mock tone, lint, snapshots, draft MP4, resume/tamper checks
```

On Windows with a blocked PowerShell npm shim, use `npm.cmd`. Chromium and
FFmpeg must already be installed. Tests use `HT_NO_ENV=1` and explicit mock
narration, excluding credential environment variables. Fixture child HTTP/fetch
is loopback-only. Generated evidence is retained under ignored `tests/artifacts/`.
Visual tests verify styles/forms/ID references and emit frames for human review;
they do not promise portable pixel equality across operating systems. Canvas,
native shadow content, embeds and compound `:root` selectors need manual review.

## License

MIT
