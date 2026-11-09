# hypertutorial

A [Claude](https://claude.com) skill that turns a flow of your web app into an animated tutorial video.

It does **not** record the screen. It captures each state of the real page (HTML, CSS and fonts) and animates a cursor, typing, camera zoom, dropdowns, dialogs and toasts over exact copies of your app with [HyperFrames](https://hyperframes.heygen.com). The video also gets AI narration, captions, step badges, an intro and an outro.

- **Looks exactly like your app**, because it is built from your app's own markup and styles.
- **Never saves real data.** Capture stops at the confirmation dialog, and the success toast is raised with your app's own toast function.
- **Renders a 100-second video in about 3 minutes**, using the GPU when one is available.
- **Optional background music:** 8 built-in royalty-free tracks (calm, upbeat, corporate, tech, lo-fi, inspiring, minimal, acoustic) plus any song you drop into `music/`, lowered automatically under the narration. `node scripts/music.mjs list` shows the repertoire.
- **Narration:** Speko, ElevenLabs or OpenAI, plus a free placeholder voice for timing tests.

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
| Capture the app states | `node scripts/capture.mjs <project>` |
| Generate the narration | `node scripts/voice.mjs <project> [--provider mock]` |
| Build the composition | `node scripts/build.mjs <project>` |
| Check for errors | `node scripts/hf.mjs <project> lint` |
| Capture frames to review | `node scripts/hf.mjs <project> snapshot --at 10,20` |
| Render the video | `node scripts/hf.mjs <project> render [--draft]` |

The spec format is described in [`references/spec.md`](references/spec.md), with a complete example in [`examples/dosis-compras.json`](examples/dosis-compras.json).

## License

MIT
