---
name: hypertutorial
description: Produce tutorial videos of a web app as a HyperFrames animation built from the app's real page (captured HTML + CSS), not a screen recording. A cursor, typing, camera zoom, dropdowns, dialogs and toasts are animated over pixel-exact copies of each screen state, with AI narration (Speko, ElevenLabs, OpenAI), captions, step badges, intro and outro. Use it whenever the user asks for a "hypertutorial", an animated or HyperFrames tutorial or walkthrough of their app, or a tutorial "exactly like the app" that must not save real data.
---

# hypertutorial

You turn a flow of a web app into an animated video. The app is never recorded: you capture each **state** of the page (static HTML + CSS + fonts), then HyperFrames animates a cursor and the UI changes between those states. The result looks exactly like the app, renders in minutes, and does not need the final action to touch the database.

Scripts live in `scripts/` next to this file (`<skill>` below) and use the skill's own `node_modules` (Playwright, HyperFrames, GSAP, FFmpeg).

## 0. Requirements (check before anything else)

- **Dependencies installed**: `<skill>/node_modules` exists. If not, run `npm install` in `<skill>` (Node 22+). If FFmpeg is missing afterwards, run `npm install-scripts approve ffmpeg-static esbuild` and `npm install` again.
- **The app is running** (e.g. `npm run dev`). Note its URL.
- **Credentials and API keys** live in `<skill>/.env` (never committed). Ask the user to run `npm run setup` in `<skill>`. It asks for the voice first (provider, API key, language, and a choice among the provider's 3 most natural voices, ranked from Speko's measured catalog), then the app's test account. Never ask for them in chat and never write them in the spec: use `${APP_USER}` / `${APP_PASSWORD}`.
- **Voice provider**: `speko`, `elevenlabs`, `openai`, or `mock` (free tone, for timing tests), chosen in setup. `voice.provider` in the spec, or `--provider` on the voice command, overrides it.
- **Which database the app uses.** If the dev server points to production, tell the user before capturing. Capturing clicks and fills real forms, so stop at confirmation dialogs (see §3).

## 1. Brief

Ask only what you cannot infer, in one message:
- the flow to teach (one goal per video),
- the sample data,
- the language,
- the login form,
- **background music** — always ask, showing the repertoire from `node <skill>/scripts/music.mjs list`: 8 built-in royalty-free tracks (calma, alegre, corporativo, tecnologia, lofi, inspirador, minimalista, acustico) plus every song the user dropped into `<skill>/music/`, or no music. Offer previews with `node <skill>/scripts/music.mjs preview <track> <out.wav> 20`. If they want a song they don't have yet, point them to `<skill>/music/README.md` (free libraries and their license terms). Set it as `"music": { "track": "<id>" }` in the spec.

Then create a project folder anywhere (e.g. `tutoriales/<name>`) with a `hypertutorial.json`. Start from `examples/dosis-compras.json`. The full field reference is in `references/spec.md`.

## 2. Explore the screens

You need the exact visible texts, placeholders and labels, because selectors are text based (`text:`, `button:`, `placeholder:`, `after:<label>`, `date:<n>`, `option:`, `combobox:`, `css:`, plus `dialog>> …`, `… << li`, `…^`).

You can find them in several ways:
- **The browser pane** (read_page / screenshots).
- **The app's source code**: page components, placeholders and labels.

Walk the whole flow and list every field and button. Decide with the user what happens with optional controls: fill them, explain them without touching them (`hover`), or skip them.

## 3. Write `states` (what to capture)

A **state** is one screen of the flow. `actions` run in order against the live app, starting from the previous state, and then the page is snapshotted. Rules:

- **Order:** one state per visible change the viewer must see, such as a dropdown opening, a product row appearing or a dialog. Typing into fields does not need its own state, because the composition animates typing.
- **Next state:** fill the fields of a state in the actions of the *next* state, so it is captured already filled. Example: `e-proveedores` fills the row and then opens the supplier list.
- **Overlays:** mark states that show a modal, dialog or toast with `"fixed": true`, so those overlays sit inside the real visible viewport (`viewportHeight`).
- **Never click the final irreversible button** (save, pay, send, confirm). Capture the confirmation dialog and stop there. For the "after" screen, reset the page (`clearSessionStorage`, `goto`). If you want a success toast, raise it with the app's own toast function through `eval`, for example `const m = await import('/src/hooks/use-toast.ts'); m.toast({...})` in a Vite app. Then nothing is saved.

Capture, then **look at every `states/*.png`** to check that each screen is the one you expect:

```bash
node <skill>/scripts/capture.mjs <project>            # all states
node <skill>/scripts/capture.mjs <project> d-producto # re-capture one (the earlier actions still run)
```

## 4. Write `steps` (what the cursor does) and the narration

One step = one action + one or two short sentences of narration (8–20 words; say *why*, name the UI as written, and spell out amounts as they are spoken: "doce mil pesos"). Each step has a `state` (the layer shown), a `kind`, a `sel` (selector inside that state) and optionally a `next` (the state shown right after the click). The `kind` is one of:

- `none` — overview, camera shows the whole screen;
- `click` — the cursor goes to `sel`, clicks, and `next` appears;
- `type` — types `value` letter by letter into `sel`;
- `date` — sets a date input to `value` (ISO `YYYY-MM-DD`);
- `hover` — points at `sel` and explains it, plus an optional `highlight`.

Extras:
- `set` — replaces text after the action, e.g. recomputed totals: `{ "match": "$ 12.000", "text": "$ 119.000" }`;
- `after` — moves the camera once `next` shows, to a selector or to `"all"`;
- `reveal` — slides in an element of `next`, such as a toast;
- `zoom` — maximum camera zoom;
- `camera: "all"` — no zoom.

## 5. Voice, build and check

```bash
node <skill>/scripts/voice.mjs <project> [--provider mock]     # cached: only changed lines are regenerated
node <skill>/scripts/build.mjs <project>                        # writes hf/index.html and times.json
node <skill>/scripts/hf.mjs <project> lint                      # must say 0 error(s); warnings are expected
node <skill>/scripts/hf.mjs <project> snapshot --at <times>     # use the "check" times in times.json
```

**Look at the snapshots** before rendering. Check that:
- each typed value is right;
- the camera frames the action;
- dialogs are centered and nothing important sits under the caption;
- the final toast is visible.

Shots taken mid-movement look cropped, so check a second later before changing anything. Fix the spec and rebuild: the build is instant and the voice is cached.

## 6. Render and deliver

```bash
node <skill>/scripts/hf.mjs <project> render          # high quality, GPU when available (~3 min for 100 s)
node <skill>/scripts/hf.mjs <project> render --draft  # fast preview
```

The video is `<project>/<output>.mp4`. If it is over 30 MB and the user is on their phone, also make a lighter copy:

```bash
<skill>/node_modules/ffmpeg-static/ffmpeg -i in.mp4 -c:v libx264 -crf 26 -c:a copy out.mp4
```

Deliver the file, its duration, and what was simulated, such as the success toast or the confirmation that was never clicked.

## Troubleshooting

- **`No encontré: …` in build or capture:** the text differs, for example with extra spaces, an accent or a different case set by CSS `uppercase`. The DOM keeps the original case: copy the text from the source code or the captured HTML, not from the screenshot.
- **Typed value looks wrong at the end:** the step's `state` is captured with a stale value. Check that the state before the typing step was captured before that field was filled.
- **Modal or toast off screen:** the state needs `"fixed": true`.
- **Session expired:** delete `<project>/.auth.json` and capture again (it logs in with `login.steps`).
- **Fonts look generic:** check `fuentes: N` in the capture output, and that the app's fonts load from a reachable URL.
