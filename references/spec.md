# hypertutorial.json reference

A complete working example is `examples/dosis-compras.json`.

## Top level

| field | meaning |
|---|---|
| `title` | video title (also the window title if `windowTitle` is missing) |
| `windowTitle` | text in the fake browser bar |
| `language` | narration language, e.g. `es` |
| `output` | output file name without `.mp4` (default `tutorial`) |
| `theme` | `{ bg, accent, glow }` colors for background, cursor ripple, badges and highlight |
| `font` | font family for captions and cards; use one the app already loads (it is captured) |
| `music` | optional background music: `{ "track": "<id>" }` where the id is a built-in track (`calma`, `alegre`, `corporativo`, `tecnologia`, `lofi`, `inspirador`, `minimalista`, `acustico`), a song file in `<skill>/music/`, or a path to any audio file (looped to the video length); plus `"volume"` (default 0.16). `node scripts/music.mjs list` prints the repertoire. It fades in and out and drops to 40 % under every narration line. Omit it for no music |
| `voice` | optional override: `{ provider, voice, model, style, options }` (Speko: `options.routing` pins a provider/model) |
| `app` | `{ url, start, width (1440), captureHeight (1500), viewportHeight (810), locale }` |
| `login` | `{ url, steps: [actions] }`, run only when the saved session no longer works |
| `intro` / `outro` | `{ kicker, title, subtitle, narration }` |
| `states` | screens to capture, in order |
| `steps` | what the cursor does, in order |

`captureHeight` is how tall each snapshot is, so lower content can be reached by the camera without scrolling. `viewportHeight` is the real visible height of the app, used for `fixed` states.

## Selectors

The same syntax is used in capture actions and steps:

| form | finds |
|---|---|
| `text:Total Compra:` | the smallest element whose text contains it |
| `button:Guardar` | a button, `[role=button]` or link containing the text |
| `option:Proveedor X` | a `[role=option]` (open dropdown item) |
| `combobox:Selecciona un proveedor` | a `[role=combobox]` containing the text |
| `placeholder:Ej: LOTE123` | an input or textarea with exactly that placeholder |
| `after:Costo Compra` | the first input after a `span`/`label` whose text is exactly that |
| `date:2` | the third `input[type=date]` on the page |
| `css:[role=dialog]` | any CSS selector |
| `dialog>> button:Confirmar` | search only inside the open dialog |
| `text:Compra registrada << li` | climb to the closest `li` ancestor |
| `text:Total Compra:^` | climb one parent (`^^` = two) |

Text matching uses the DOM text, before CSS `text-transform`.

## State actions

Each action is an object with one of these keys:

| action | effect |
|---|---|
| `{ "goto": "/ruta" }` | navigate inside the app |
| `{ "click": sel }` | click (add `"optional": true` to ignore if missing) |
| `{ "fill": sel, "value": "..." }` | fill an input; `${VAR}` reads the skill's `.env` (e.g. `${APP_USER}`) |
| `{ "press": "Enter" }` | press a key |
| `{ "waitFor": sel }` | wait up to 20 s for an element |
| `{ "wait": 1.5 }` | wait seconds |
| `{ "eval": "js" }` | run async JS in the page (e.g. call the app's own toast) |
| `{ "clearSessionStorage": "prefix" }` | remove sessionStorage keys starting with the prefix (resets drafts) |

A state with `"fixed": true` is laid out at `viewportHeight` so modals and toasts appear where the user sees them.

## Steps

| field | meaning |
|---|---|
| `id` | unique id; it is also the audio file name |
| `title` | badge text: "N · title" |
| `narration` | spoken line and caption |
| `state` | captured state shown during the step |
| `kind` | `none` · `click` · `type` · `date` · `hover` |
| `sel` | target inside `state` (not needed for `none`) |
| `value` | text to type, or an ISO date |
| `next` | state that replaces the current one right after the action |
| `after` | camera target after `next` appears: a selector inside `next`, or `"all"` |
| `highlight` | selector framed with an accent box during the step |
| `set` | `{ match, text }`: leaf elements whose text equals `match` change to `text` after the action |
| `reveal` | element of `next` that slides in, e.g. a toast |
| `zoom` | maximum zoom (default 1.9; 1.6 for hover) |
| `camera` | `"all"` to keep the full view |

## Timing

Each step lasts the longer of its narration + 0.6 s and its action:
- the cursor travels and the action fires 1 s after the step starts;
- typing takes about 0.07 s per character (at most 1.5 s);
- a `reveal` adds 2.2 s.

`build.mjs` writes `times.json` with each step's start, action time and a `check` time for snapshots.
