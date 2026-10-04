# The LED matrix display

**Date:** 2026-10-03
**Status:** Approved (2026-10-03, owner) — consolidated after seven revisions and five independent reviews; implementation plan: `docs/superpowers/plans/2026-10-03-led-matrix-display-implementation.md`
**Branch:** `feat/led-matrix-display` (FiestaUI)
**Repos:** FiestaUI (renderer, fonts, framebuffer, transitions, device and character-set contract, editor pickers); FiestaBoard core (Python port of layout/raster/flip in `src/led/`, parser parity); FiestaBoard output plugins (device data and transport)

## 1. The problem

Every board FiestaUI can draw today is a split-flap board: `BoardDisplay`,
`StaticBoardDisplay`, `ScaledBoardDisplay` and `BoardTeaser` all render a grid
of _character tiles_. FiestaBoard wants to drive cheap LED matrices as well —
an Ulanzi pixel clock on a desk, a Divoom Pixoo on a shelf, a HUB75 panel in a
hallway — and it needs a preview that shows what one of those will actually
look like, an editor that knows what each one can draw, and a contract that a
Python backend and third-party output plugins can implement without guessing.

An LED matrix is not a smaller Vestaboard. It has no character cells. It has
`width × height` pixels, and text exists only because something drew a bitmap
font into them. So the preview cannot reuse the tile renderer with smaller
tiles. It needs a renderer for pixels — and, because FiestaBoard's unit of
exchange is the message string, that renderer has to take the same message a
flap board takes and degrade gracefully in both directions.

## 2. The hardware landscape

| Device                   | Pixels               | Colour | Raw frame in?                    | Animation                                 |
| ------------------------ | -------------------- | ------ | -------------------------------- | ----------------------------------------- |
| Divoom Pixoo 64          | 64×64                | RGB    | yes (base64 RGB888 per frame)    | single frames only — it snaps (measured)  |
| AWTRIX 3 / Ulanzi TC001  | 32×8                 | RGB    | yes (`draw`/`db`, RGB565)        | no measured frame rate — treated as none  |
| HUB75 (Pi / ESP32)       | 64×32, 64×64, 128×64 | RGB    | via a small daemon               | stream, 30–60 fps pushed                  |
| WLED 2D (ESP32 + WS2812) | 16×16 … 32×32+       | RGB    | yes (DDP, E1.31, `seg.i`)        | stream, 25–40 fps                         |
| Tidbyt / Tronbyt         | 64×32                | RGB    | yes (WebP push)                  | sequence, ~20 fps                         |
| MAX7219 chains           | 32×8, 64×8           | 1-bit  | via custom firmware              | host-driven stream, hundreds of fps local |
| P10 HUB12 modules        | 32×16                | 1-bit  | via custom firmware              | host-driven stream                        |
| LaMetric Time            | 37×8                 | RGB    | **no** — icon + text frames only | not a preset; text-only adapter later     |

The common denominator is a **row-major RGB888 framebuffer**. Every device but
LaMetric can take one after a cheap transform: RGB565, base64, WebP,
serpentine reorder, or a 1-bit threshold.

**Researched animation limits** (the sources are also in
`DEVICE_MODELS[*].animation.sources`):

- **Pixoo 64.** `Draw/SendHttpGif` takes one POST per frame (`PicNum`,
  `PicOffset`, `PicSpeed` ms, `PicData` base64 RGB888, `PicWidth` 64) and the
  device plays the animation locally. **Measured** (hardware test on a Pixoo
  64, FiestaBoard program, 2026-10-04): an uploaded animation **loops
  forever** — there is no play-once; more than ~3 uploaded frames first show
  a ~6 s "LOADING…" overlay; landing on a still after an animation glitches
  for ~5 s; a single-frame push is clean in ~0.5 s; 40 frames play and ~55 is
  the most it takes. Applying the owner's rule (flip only when the device is
  fast enough): **the Pixoo snaps** — `{ delivery: "stream", maxFps: 2 }`,
  one frame per change, the default transition `none`, and the adapter never
  uploads a sequence. The earlier community figures (a 32-frame cap, a ~300-
  push freeze, a ~5 s overlay — pixoo-toolkit, pixoo-homeassistant PR #158,
  SomethingWithComputers/pixoo, Grayda/pixoo_api) are superseded by the
  measurement and kept in the sources for reference.
- **AWTRIX 3.** `draw` ops over HTTP/MQTT; a full 8×32 `db` bitmap returned
  `ErrorParsingJson` (issue #214); `TSPEED` 500 ms, `ATIME` 7 s; no documented
  push rate and none measured. Modelled as UNMEASURED → "none" until a client
  proves more. — github.com/Blueforcer/awtrix3 docs/api.md, issue #214.
- **WLED.** DDP on UDP 4048, 480 RGB pixels per datagram, 25–40 fps on an
  ESP32; E1.31 "25 ms (40 fps)" for ≤ 510 LEDs; `WLED_FPS` 42. The JSON
  `seg.i` route is not for this. — kno.wled.ge/interfaces/ddp/, e1.31-dmx/,
  udp-realtime/, wled.discourse.group/t/esp32-288leds-fps/3046.
- **HUB75.** rpi-rgb-led-matrix refreshes "typically in the hundreds of
  Hertz" (3× 128×64: 410 Hz); a network daemon holds 30–60 fps. —
  github.com/hzeller/rpi-rgb-led-matrix.
- **Tronbyt.** One WebP per push (`POST /v0/devices/{id}/push`), looped by
  the device; Pixlet `render.Root(delay=ms)` sets the frame time (50 ms
  default, unverified). Modelled as a 20 fps sequence → coarse flip. —
  github.com/tronbyt/server API.md, github.com/tidbyt/pixlet docs/widgets.md.
- **MAX7219 / P10.** Hundreds of fps locally (SPI, 32 bytes a frame;
  MD_Parola `setSpeed()`), but no standard host bridge, so 50 fps assumes you
  own it (unverified figure). luma.led_matrix treats any non-black as white
  (`dither=True` optional); MD_Parola / MD_MAX72xx are 1-bit with a 5x7
  default font; P10 HUB12 DMD panels are single-colour 1 bpp. —
  luma-led-matrix.readthedocs.io, github.com/MajicDesigns/MD_Parola/wiki,
  github.com/board707/DMD_STM32.

Precedents for text and effects: AWTRIX 3's custom-app API carries text as a
fragment array `[{t, c}]`, `textCase` 0/1/2, global transitions `TEFF` 0–10
(Random, Slide, Dim, Zoom, Rotate, Pixelate, Curtain, Ripple, Blink, Reload,
Fade) with `TSPEED` — github.com/Blueforcer/awtrix3 docs/api.md, effects.md;
AWTRIX NG: `textCase: inherit|upper|asTyped`, `font: small|large`, a `scroll`
object — blueforcer.github.io/awtrix-ng/reference/payload/. Pixlet:
`render.Text(content, font, color)`, fonts `tb-8`, `5x8`, `6x10`, `6x13`,
`10x20`, `tom-thumb`, `CG-pixel-3x5-mono`; `render.Marquee`,
`render.Animation`; colour per widget, no inline markup —
github.com/tidbyt/pixlet docs/widgets.md, docs/fonts.md. WLED 2D Scrolling
Text: text from the segment name, primary colour = text, font sizes 4x6 /
5x8 / 6x8 / 7x9 / 5x12 — kno.wled.ge/features/effects/. Fonts: hzeller's
`fonts/` ships 4x6 … 10x20 BDF (public domain) plus tom-thumb (MIT); Tom Thumb
is a 4×6 cell with 3×5 usable, lowercase included —
robey.lag.net/2010/01/23/tiny-monospace-font.html (the descender detail is
from memory, unverified). LaMetric icons are 8×8, `i<id>`/`a<id>` —
developer.lametric.com/icons. No LED product has a split-flap or typewriter
transition; the closest are MD_Parola's `PA_WIPE_CURSOR` and AWTRIX NG's
`scroll.entry: offscreen`. Nobody in matrix land uses inline colour tags; the
precedents are AWTRIX's fragment arrays and Pixlet's per-widget `color`.

## 3. Decisions

1. **The framebuffer is the contract, and the preview paints the
   framebuffer.** `message → layoutLedMessage → LedLayout → rasterizeLedLayout → LedFrame (RGB888)`;
   the canvas paints that frame and a device adapter sends it. There is no
   second renderer to drift (the split-flap renderer needed #176 and #179 to
   keep CSS and hardware in step).
2. **The message string stays canonical.** An LED matrix gets the same
   message a split-flap board gets, laid out on a derived character grid.
   Extended markup — `{colour:TEXT}`, `{fg/bg:TEXT}`, `{icon:name}` — is
   parsed in the shared parser behind `extendedMarkup`, on for LED layout
   and off for split-flap previews until the Python parser has parity.
3. **Long lines clip**, as a split-flap board does; scrolling is deferred.
4. **`{red:HOT}` is a supported feature**, including `{black:TEXT}` (unlit
   letters on an LED — "all forms of expression"); `{red}HOT` is still a tile
   then `HOT` on every board.
5. **Block / inverse colour is `{fg/bg:TEXT}`**; on a monochrome panel a
   block is always inverse video.
6. **Character sets and device models are first-class, open JSON data** with
   validators and schemas, so output plugins can declare their own; an
   unknown id never silently becomes a Vestaboard.
7. **Transitions are a menu** with "None" as a first-class entry; the device
   model decides the default (flip when it can show it, else none), an
   explicit choice wins when the device can run it, and device budgets are
   hard: a change is compressed to fit, never cut.
8. **The LED flip is FiestaBoard's own** — a deterministic, seeded scramble
   through the device's own character set — and does not copy Vestaboard's
   character order. The split-flap `BoardDisplay` keeps that order because it
   imitates real hardware.
9. **The Pixoo 64 is the first test device**: 3×5 face by default (10 × 16
   cells). The hardware spike (2026-10-04) found that uploaded animations
   loop and show a "LOADING…" overlay while single frames are clean, so the
   Pixoo snaps: one frame per change, no sequence budget, default
   transition `none` (section 2). The 32-frame sequence machinery stays,
   pinned on a generic sequence-capable fixture device, for the plugins
   that can play one.
10. **Monochrome is a layout option, tinting is not.** `monochrome: "#rrggbb"`
    is in the frame (every lit pixel takes the panel colour); brightness and
    gamma are preview-only and deferred.
11. **Icons are characters** that degrade to tiles or text on a flap, named
    in the accessible text, aligned with FiestaBoard's legacy shortcuts by
    aliases; sixteen in all.
12. **The accessible name is what the matrix shows** (the clipped grid), not
    the whole message.

## 4. Content model and markup grammar

An LED matrix gets the **same message string** a split-flap board gets: lines
split on `\n`, colour tiles, and by default uppercase. It is laid out on a
_derived_ character grid:

```
cols = floor((width  + spacingX) / (glyphW + spacingX))
rows = floor((height + spacingY) / (glyphH + spacingY))
```

| Font             | 32×8  | 64×32  | 64×64   | 128×64  |
| ---------------- | ----- | ------ | ------- | ------- |
| `3x5` (cell 4×6) | 8 × 1 | 16 × 5 | 16 × 10 | 32 × 10 |
| `5x7` (cell 6×8) | 5 × 1 | 10 × 4 | 10 × 8  | 21 × 8  |

Leftover pixels are split evenly as a margin around the text block. A line
longer than the grid **clips**; the editor's template-level wrap
(`WrappedTextView`) is where a long line is handled today.

Why keep the character grid rather than go pixel-native: every existing
plugin, template and preview manifest produces this markup, and a 64×32
panel in the 3×5 face is a 5 × 16 "board" those plugins can target today
through `messageToGrid`; `messageToGrid` / `messageToText` already decide
parsing, uppercasing, colour tiles and the accessible name, so a split-flap
and an LED preview of one message describe it identically (#205);
pixel-native content (8×8 icons, sparklines, bars) is wanted but fits _on top
of_ this as a later layer, and leaving it out of the first contract is cheap
where taking it back out would not be.

### 4.1 The grammar

All of it lives in the shared parser, `src/lib/board-characters.ts`
(`parseLine`, `messageToGrid`, `messageToText`), so a flap board and an LED
board parse one string the same way.

| Marker                   | Meaning                                                                                                                                                                            | Split-flap                                   | LED RGB                               | LED monochrome                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| `{red}`, `{63}` … `{71}` | A colour **tile**: one cell                                                                                                                                                        | the tile                                     | the glyph box filled (not the gutter) | a lit block; `{black}`/`{70}`/`{71}` unlit |
| `{red:HOT}`              | A colour **span**: the letters in the colour. `<colour>` is a board colour name, a tile code `63`–`70` or `#rrggbb`; content parses recursively and braces nest (`{red:HOT {66}}`) | `HOT` in the flap colour                     | red letters                           | lit letters                                |
| `{black/white:OPEN}`     | A **block span**: background `bg`, glyph `fg`; both board colours, codes or hex                                                                                                    | `OPEN` uncoloured                            | white field, unlit glyph (inverse)    | field in the panel colour, glyph unlit     |
| `{icon:sun}`             | An **icon**: one cell, a character not an image                                                                                                                                    | its fallback: a tile, a character or a blank | the glyph in the icon's colour        | the lit glyph                              |
| `{/}` , `{/red}`         | End tags                                                                                                                                                                           | —                                            | —                                     | —                                          |
| anything else in braces  | literal text                                                                                                                                                                       | literal                                      | literal                               | literal                                    |

Tokens are `BoardToken`s: `{ type: "char", value, color?, background?, icon? }`
or `{ type: "color", code, color?, background?, icon? }`. A char inside a
span carries `color`; a char inside a block carries `color` and
`background`. An icon's token carries the same span fields whether its
fallback is a character or a tile (B1 finding 5), so a per-output projection
still knows what the author asked for. A block head `fg/bg` sits beside
`{colour:…}` without ambiguity because a lone colour never contains `/`, and
`{/}` / `{/<colour>}` remain the only end tags, so a block span always names
both colours (`{/red:A}` and `{red/:A}` are literal). A span or block colour
is a board colour name (`red` … `black`, `purple`), a tile code `63`–`70` or
`#rrggbb`; `filled` / `71` names a flap, not a hue, so `{filled:x}` is
literal while `{filled}` stays a tile. Anything else before the colon
(`{foo:bar}`) is literal text, like every unknown marker today.

**Nesting depth.** Spans nest at most **8** deep (`MAX_SPAN_DEPTH`). A span
opened outside any span is depth 1 and a span inside it is depth 2; an
opener that would open depth 9 is not a marker: its `{`, head and `:` are
ordinary characters of the depth-8 span, and its `}` is an ordinary `}`
when the parse reaches it. Only parsed spans (colour and block) count — a
literal `{foo:…}` wrapper uses no level — and tiles, icons and end tags are
not spans, so they parse at every depth, including inside a literal
ninth-level opener. A span's extent is unchanged by the cap: it still ends
at the brace that balances its own `{`, counting every brace between them.
So `{red:`×8 + `{blue:X}` + `}`×8 is eight red spans around the literal
red text `{BLUE:X}`, and `{red:`×7 + `{blue:X}` + `}`×7 is a blue `X`. The
cap bounds the parser's recursion; with brace matches found in one pass
per line, a line of any length parses in linear time. The Python parser
mirrors the cap exactly (parity fixtures in
`scripts/ci/tests/board-characters.test.mjs`).

Why not reuse `{red}…{/red}` for spans: it already parses — tile, text,
nothing — and tens of plugin previews contain it. Reinterpreting it on LEDs
would make one message mean different things on the two boards and break
the #205 rule. The flap degradation — letters survive, colour drops — is the
only thing a flap can do, and it is what AWTRIX's own API expresses as a
fragment array (`"text": [{"t": "HOT", "c": "FF0000"}]`): a span serialises
to one fragment, which is what the AWTRIX adapter will emit.

**Case.** `letterCase: "mixed"` keeps the message's case
(`parseLine(..., { preserveCase: true })`); default `"upper"`, the flap's
only case, so nothing changes unless asked. The accessible name follows the
case drawn.

**Code 62 and the heart.** A split-flap board draws code 62 as the glyph its
flap carries (`code62Glyph`, degree by default; a Note's set fixes heart). An
LED has no code 62: it draws `°` and `♥` as written, and `layoutLedMessage`
takes no `code62Glyph`. `♥` draws in red, the same treatment as the flap;
`{icon:heart}` is the ♥ **character**, not an icon, and a span's colours
carry onto it. `extendedMarkup` changes nothing about a typed heart: the
token keeps its Unicode identity in every mode (`❤` normalised to `♥`), and
only the split-flap projection (`getCharIndex`, `applyCode62Glyph` in
`messageToGrid` / `messageToText`) collapses `♥` and `°` to code 62, drawn as
the board's flap glyph in both directions.

**Icons.** Sixteen (`src/lib/board-icons.ts`): weather (`sun`, `cloud`,
`rain`, `snow`, `bolt`, `fog`, `partly`), status (`check`, `cross`, `up`,
`down`, `bell`, `music`), transit (`bus`, `train`) and `heart` (→ ♥). Each
carries a label, a colour and a split-flap **fallback** that means the same
thing in the board's colour language — sun → yellow tile, rain → blue, snow
→ violet ("very cold"; the LED glyph itself is white, because meaning on a
flap and look on an LED are different questions), check → green, cross →
red, bolt → orange, fog → `-`, partly → yellow — a character where one fits
(up → `+`, down → `-`), or a blank (bus, train, music, bell). The 3×5 face
cannot say anything with six of them (snow, bus, train, music, bell, partly)
and draws the fallback. Aliases align with FiestaBoard's legacy
single-brace shortcuts: `{icon:storm}` is `bolt`, `{icon:x}` is `cross`
(`BOARD_ICON_ALIASES`, `resolveBoardIconName`). This is the FiestaBoard
answer to AWTRIX/LaMetric's 8×8 icon library: theirs sits _beside_ text in
a pixel layout; ours sits _in_ the message and degrades.

### 4.2 The parity contract: `extendedMarkup`

`parseLine` is a parity contract with FiestaBoard's Python renderer, which
does not yet know spans, blocks or icons: today the hardware draws
`{red:HOT}` as the literal characters `{RED:HOT}` (braces as blanks) and
`{icon:sun}` as `ICON:SUN`. So the three markers are parsed only behind
`ParseLineOptions.extendedMarkup`: the LED layout sets it; `BoardDisplay`,
`StaticBoardDisplay` and `BoardTeaser` take it and default it off
(`ScaledBoardDisplay` passes it through via its props spread; it needs no
prop of its own), so a split-flap preview keeps showing what the hardware
shows (a story can show the future state explicitly, captioned —
`TodaysSplitFlap` shows both). Split-flap boards get the new markup — the
degradation above — only once the Python parser has parity, flipped in one
coordinated release with the shared fixtures both parsers are checked
against (section 14). That flip changes what existing literal text such as
`{red:HOT}` draws on a flap, so it ships as a deliberate major
(`feat(board)!`) in the same window as FiestaBoard's parser parity, after
FiestaBoard's upgrade fixtures are scanned for affected strings
(implementation plan, Task 12).

## 5. Character sets

`src/lib/character-sets.ts` makes "what can this board show" a value, not a
rule spread over renderers.

```ts
interface CharacterSet {
  id: string;
  label: string;
  version: number;
  extends?: string; // lineage: vestaboard_v1 → vestaboard_v2 → led_5x7 → led_3x5
  chars: readonly string[]; // every printable glyph, incl. ° and/or ♥
  tiles: boolean;
  icons: readonly BoardIconName[];
  mixedCase: boolean;
  colorSpans: boolean;
  blockSpans: boolean;
  code62Glyph?: Code62Glyph; // fixed by hardware (flap sets); unset = caller's choice (LED)
  font?: LedFontId; // the face an LED set is drawn with
  glyphs?: Record<string, readonly string[]>; // a plugin's own bitmaps, `#`/`.` rows in the face's size; wins over the face's glyph for the same char
}
```

Built-ins: `vestaboard_v1` (degree), `vestaboard_v2` (heart) — two versions
of one lineage, so `characterSetForDevice(deviceType, code62Glyph)` is
`resolveCode62Glyph` expressed as a set; `led_5x7` (the flap set plus both
code-62 glyphs, a–z and all sixteen icons); `led_3x5` (extends `led_5x7`,
lacks six icons). Every existing prop and caller is untouched by the sets'
existence.

Queries: `charsetSupports(set, token)`, `charsetIssue(set, token) → null |
"char" | "case" | "tile" | "icon" | "colorSpan" | "blockSpan"`,
`charsetFallback(set, token)` (what the set draws instead — the renderers'
rules, carrying `color`/`background` through an icon's fallback),
`validateMessage(message, set) → { ok, issues: [{ row, col, token, reason,
fallback }] }`, `charsetHasChar`, `charsetHasIcon`, `iconsInSet`,
`charsInSet`, `charsetDiff(set, base)`, `charsetLineage(set)`.

Sets are **open data** (section 6): `resolveCharacterSet(idOrObject)` throws
on an unknown id with the list of built-ins, `tryResolveCharacterSet` returns
the reason, `materializeCharacterSet(input, known?)` resolves `extends`
(fields left out are inherited; `chars`, `icons`, `glyphs` given replace the
parent's), and `validateCharacterSet(json) → { ok, errors[] }` never throws
and accepts a partial declaration when it `extends` a known set. Both
reject a key that is not a set field, partial declaration or not — the
schema's `additionalProperties: false`, and a typo is a field the author
meant; `materializeCharacterSet` validates the declaration as given before
it inherits anything, and the whole result after.

**The `extends` merge rule** (Task 2, mirrored in the schema's description):

- A field the declaration gives **replaces** the parent's, per field. The
  arrays (`chars`, `icons`) and `glyphs` are replaced **wholesale**, never
  merged: a set that says `chars: ["A", "B"]` over `led_3x5` draws A and B.
- A field left out is **inherited** from the parent (a built-in, or one of
  the `known` sets passed in).
- `version` is **never inherited**: it is the declaration's own, default 1.
  A plugin must bump `version` whenever its set's content changes, because
  consumers cache by (`id`, `version`).
- A set that extends nothing must be complete; the schema enforces the same
  with `if`/`else` on `extends`.
- A key that is not a set field is an **error**, never dropped — in a
  partial declaration too (`materializeCharacterSet` throws, the schema's
  `additionalProperties: false` agrees).

**Glyph precedence.** A set's own `glyphs` entry **wins** over the shared
face's glyph for the same character (FiestaBoard D17 rule 5): a sign that
redraws `0` gets its zero, and the face still draws everything the set
leaves alone. The `acme_sign_v2` golden pins it.

**Tile spelling.** Tokens are never rewritten in FiestaUI: a colour tile
keeps the spelling it was parsed with (`"red"` stays `"red"`, `"63"` stays
`"63"`), through `charsetFallback`, `validateMessage` and the layout. The
LED glyph table gives `{red}` and `{63}` one glyph (identity, not
normalisation), and FiestaBoard core normalises at its CellFrame boundary.
The golden fixtures pin the parsed spelling.

## 6. Device taxonomy and plugin-declared devices

`src/lib/devices.ts`: technology → family (the **protocol** an adapter
speaks) → model.

```ts
type DisplayTechnology = "split_flap" | "led_matrix";
DEVICE_FAMILIES: vestaboard · divoom · awtrix · hub75 · wled · max7219 · p10 · tronbyt
interface DeviceModel {
  id: string; label: string; technology: DisplayTechnology; family: DeviceFamilyId;
  geometry: { kind: "cells", rows, cols } | { kind: "note_array" } | { kind: "panel" } | { kind: "pixels", width, height };
  color: { kind: "rgb", bitDepth: 24 } | { kind: "monochrome", color: "#rrggbb", bitDepth: 1 | 8 } | { kind: "tiles" };
  charset: CharacterSetId | CharacterSet;    // a built-in id or an embedded set
  charsetByCode62?: Record<Code62Glyph, …>;  // a Flagship's set follows its flap: characterSetForModel(model, code62Glyph)
  animation: { delivery: "stream" | "sequence" | "none"; maxFps; maxFrames?; minFrameMs?; notes?; sources? };
                                             // notes/sources: research prose, in the fixture and plugin data only
  font?: LedFontId;
  appearance?: {                             // preview-only; never reaches device bytes (Task 2)
    pixelShape?: "round" | "square"; dotRatio?; offColor?; substrateColor?; bezel?; boardColors?;
    options?: Record<string, readonly string[]>;  // fields a board may override, e.g. { board_color: ["black", "white"] }
  };
  legacy?: { deviceType?; preset? };         // built-ins only: every DeviceType and LED preset maps to one model
}
```

Built-in models are manufacturer-qualified: `divoom_pixoo64`,
`ulanzi_tc001_awtrix`, `max7219_4in1`, `p10_hub12_32x16`, `tidbyt_tronbyt`,
generic `hub75_64x32` / `hub75_64x64` / `hub75_128x64` and `wled_32x32`, and
the four Vestaboard models (flagship, note, note_array, panel). `DeviceType`
is kept and maps 1:1; the LED preset ids (`pixoo64`, `awtrix`, …) still
resolve through `legacy.preset`, so `preset="pixoo64"` is the model. The
Pixoo entry carries the researched constraints (sequence delivery,
`maxFrames: 32`, `minFrameMs: 80`, sources), the `led_3x5` face by default,
square diffused pixels and the risk notes; the AWTRIX entry is marked
"UNMEASURED (no test device)".

### 6.1 Plugin-declared devices

FiestaBoard is extracting its output paths — device transports and adapters
— into **output plugins**. A Pixoo 64 adapter will be one; so will a plugin
for a sign nobody here has heard of. Therefore device models and character
sets are **open data**, not closed registries:

- **FiestaUI owns the contract and the rendering**: the `DeviceModel` and
  `CharacterSet` shapes, their validators, the two JSON Schemas
  (`scripts/ci/tests/fixtures/device-model.schema.json`,
  `character-set.schema.json`), the layout → raster → transition pipeline,
  the transition menu, the glyph renderer and the pickers. **An output
  plugin declares data and owns transport**: its models (and, if it needs
  one, a character set) in `output/device-models.json`, and the code that
  turns `LedFrame`s or `ledTransitionFrames` into bytes on a wire.
  Transport-only facts (push vs. pull, minimum interval, read-back, native
  transitions) stay in the plugin's manifest, not in the model.
- **FiestaUI consumes plugin device data as devDependencies** — for Storybook
  stories of real plugin devices and for contract tests that validate each
  plugin's `device-models.json` against the schemas at a pinned version.
- Both shapes are **plain JSON**: arrays and strings, no functions or class
  instances. A set that adds characters its face does not have carries their
  bitmaps in `glyphs`, exactly like `led-fonts.ts`; `layoutLedMessage`,
  `renderLedGlyph` and `CharacterGlyph` draw them. `validateDeviceModel(json)`
  and `validateCharacterSet(json)` return `{ ok, errors[] }`.
- **Every API takes the object as well as the id** (`DeviceModelRef =
DeviceModelId | DeviceModel`): `LedMatrixDisplay.model`,
  `CharacterGlyph.model` / `charset`, `CharacterSetSpecimen.charset`,
  `LedTransitionPicker.model`, the editor pickers' `charset`,
  `transitionsForModel`, `defaultTransitionIdForModel`,
  `resolveLedTransition`, `characterSetForModel`, `ledSpecForModel`.
- **An unknown id is never silently a Vestaboard.** `resolveDeviceModel`
  throws with the list of built-ins; `tryResolveDeviceModel` returns the
  reason; components render without a device and report the id on
  `data-unknown-model`.
- **`appearance` and `appearance.options` (PR 2, preview-only):** how a
  plugin's device should _look_ in a preview (pixel shape, dot ratio,
  off-LED and substrate colours, bezel, board colours) and which of those a
  board may override (`options`, e.g. `{ board_color: ["black", "white"] }`).
  The plugin owns the defaults. A board-level override is honoured only for
  a field `options` lists. Nothing here ever reaches the device bytes: font,
  letter case and monochrome are layout options, not appearance. The
  prototype's top-level `pixelShape` moved into `appearance.pixelShape` in
  Task 2, with no alias (it had never been published; the validators reject
  the old field), and the LED presets carry no appearance at all — a
  consumer reads it from `deviceModelForPreset(preset).appearance`. Every
  built-in is filled in: the Pixoo is square dots at 0.82 of pitch, off LED
  `#171717` on a `#0a0a0a` substrate (TC001 and Tidbyt the same; bare-LED
  panels round at 0.72); the Vestaboard models offer
  `boardColors: ["black", "white"]` with `options: { board_color: […] }`.
  The Pixoo plugin's `output/device-models.json` is updated to match before
  its v0.1.0 tag.
- Tested end to end with a plugin-declared 48×12 amber one-colour sign
  (`src/lib/plugin-device.test.ts`): a 3×5 set of its own with a `€` bitmap
  and three icons, a 12-frame sequence API → validation, layout with its
  glyph and fallbacks, a budgeted flip that scrambles only its characters and
  lands in ≤ 12 one-colour frames, the menu with the budget on every entry,
  the glyph drawn on its own.

How the pieces are owned: `BoardPreviewEntry` adopts this by growing an
optional `model?: DeviceModelId` beside `device_type`; `previewLabel` reads
the model's label; `BoardShowcase` renders `LedMatrixDisplay` for a
`led_matrix` model and `StaticBoardDisplay` otherwise, with the model's
charset deciding `code62Glyph` and `extendedMarkup`. That is deferred
(section 18) with its shape decided.

## 7. LED rendering

### 7.1 Fonts

Two faces (`src/lib/led-fonts.ts`), `3x5` (cell 4×6) and `5x7` (cell 6×8),
as `#`/`.` rows; each covers the whole split-flap set, both code-62 glyphs,
a–z and the icons. The 5×7 lowercase is the HD44780 ROM's; the 3×5 follows
Tom Thumb's idea (x-height one row under the caps, descenders folded into
the box, because a 5-row cell has nowhere below the baseline). In 3×5, M, N
and W carry at most one horizontal bar, because two adjacent `###` rows fuse
into a block on a lit panel; three columns cannot give `N` a diagonal, so it
is the Tom-Thumb-style ⊓ with a tail and lowercase `n` is the same shape two
rows shorter; `°` is a 2×2 block, because a 3-wide ring reads as a caret and
a single pixel as an apostrophe (`"` is two separate columns — the
distinction at this size). Glyphs were checked at 1× without glow after the
first screenshots (`sun`, `y`, `rain`, `snow`, `cloud`, `bolt`, `bus`,
`train` were redrawn).

The Pixoo 64 defaults to the **3×5 face**: 10 × 16 cells clears FiestaBoard's
3 × 15 platform floor for page content, where 5×7 gives only 8 × 10;
`font="5x7"` stays an override.

### 7.2 Layout → raster → frame

```
message ──► layoutLedMessage ──► LedLayout { grid, cells, options, ops, text } ──► rasterizeLedLayout ──► LedFrame (RGB888) ──► <canvas>
 (board markup)   (font + grid)      (cells for transitions, draw ops, a11y text)                                │
                                                                                                                └──► device adapters
```

Layout and raster are separate stages so that everything planned for later
(proportional fonts, a marquee, a pixel layer) is a new _layout_ while
`rasterizeLedLayout`, the preview and every adapter stay as they are.
`renderLedFrame` is the two composed. `LedFrame.pixels` is a
`Uint8ClampedArray` of `width × height × 3` bytes, row-major, origin
top-left, no serpentine order; a 128×64 frame is 24.6 KB.

Each `LedCell` is `{ glyph, color, background? }`. **`glyph` is a stable
key**, a string that means the same thing in every process — the browser
preview, a second browser session, FiestaBoard's Python port — so any two of
them agree on which cells changed and (section 8.2) seed a flip the same
way:

| Glyph         | Key           | Rule                                                                                                                                                       |
| ------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| blank         | `" "`         | An unlit cell; also every character nothing can draw.                                                                                                      |
| a character   | the character | One Unicode character, exactly as spelled (`"A"`, `"€"`, `"♥"`, `"°"`). It is itself when the face has it **or** the layout's own set has a bitmap for it. |
| a colour tile | `tile:<code>` | The canonical **numeric** code: `{red}` and `{63}` are `tile:63`; `{black}`, `{70}` and `{71}` are `tile:70`. The token keeps its spelling.                |
| an icon       | `icon:<name>` | The canonical name after alias resolution (`{icon:storm}` is `icon:bolt`).                                                                                 |

Nothing is numbered. `LED_GLYPHS` (internal) is a **frozen membership
table** of the keys the built-in faces draw — nothing reads meaning into its
order, and nothing is ever added to it. **Custom glyphs are per layout**: a
plugin set's own bitmaps (`CharacterSet.glyphs`, section 5) travel on the
layout as its own table, `LedLayout.options.glyphs`, which is the only
place a character beyond the face is resolved and drawn from. There is no
process-global registry of custom glyphs, so a layout drawn without a set
(or with another set) after one drew `€` still has a blank `€` cell — a
cell that is blank, not a non-blank glyph that happens to draw nothing —
and laying out A, then B, then A again gives identical cells, ops and
frames (tested). The face tables (`LED_FONTS`) are frozen for the same
reason. Precedence is unchanged: a set's bitmap wins over the face's for
the same character. A cell with no glyph draws blank. Text is one colour per board
(`textColor`, default `#ffffff`, AWTRIX's own default, not tinted in the
frame). `textColor` and `monochrome` are normalised to lowercase `#rrggbb` —
trimmed, the `#` optional, so a settings screen's `FFB000` and a picker's
`#ffb000` are one colour in the cells and in `LedLayout.options` — and
anything that is not six hex digits (`#fff`, `rgba(…)`, a colour name) is
the fallback: the default text colour, or unset for `monochrome`, rather
than rasterising to invisible black.

**Identity, not projection.** The layout parses each line with `parseLine`
(extended markup on, case per `letterCase`) and fills the grid itself; it
does not go through `messageToGrid`, whose `applyCode62Glyph` is the
split-flap projection. So a typed `°` draws a degree sign and a typed `♥`,
`❤` or `{icon:heart}` draws the red heart, whatever board the message was
written for — the panel can draw both, and FiestaBoard core hands LED
outputs rich cells with their identity intact. There is no `code62Glyph`
layout option; `LedLayout.options` carries only `monochrome`, a plugin
set's `glyphs`, which win over the face's for the same character (section 5),
and the `charset` the layout was drawn with, when one was given — the pool
a flip's scramble draws from (section 8.2).

**Block colour.** `{fg/bg:TEXT}` lights the glyph box in `bg` and draws the
glyph in `fg` over it; where the next cell is in the same block the column
gutter lights too, so a run reads as one pill, and two cells of one block
stacked vertically light the row gutter between them (a two-line pill reads
as one slab). Two stacked blocks of _different_ colours keep the gutter
unlit: the gutter is 1 px and cannot be split, lighting it in either colour
would claim a row the other block does not own, and an unlit line between
two differently coloured fields is what a split-flap board draws between any
two tiles. A tile inside a block on a mono panel draws as an unlit square
(inverse), not nothing. An **icon inside a block** is a block cell whatever
its split-flap fallback: `parseLine` keeps the span's colours on the tile
token it emits for `{black/white:{icon:sun}}` (section 15, 5), and the
layout reads them off any token type — the field lights first, gutter
joined, then the icon's glyph draws over it in its own colour, or, on a face
without the icon, its fallback tile fills the glyph box (an unlit square on
a mono panel). `ledBackgroundMask(layout)` reports the block fields so the
preview can keep its bloom off them.

**Monochrome.** `monochrome: "#rrggbb"` is a `LedLayoutOptions` field, so it
is in the frame: every lit pixel — text, spans, tiles, icons, the heart —
becomes the panel colour; `{black}`/`{70}`/`{71}` stay unlit; `textColor` is
ignored; a block is always inverse video. `frameToBits` is the adapter half
of the same rule (any channel lit → 1), and the bits of a monochrome layout
equal the bits of the RGB layout of the same message (tested). Presets
`max7219` and `p10_32x16` carry the colour; `LED_MONO_COLORS` names red /
amber / green / blue / white for a settings screen. What colour tiles become
on a mono panel: lit blocks — a tile bar graph still reads as a bar; a tile
that meant _which_ colour loses that meaning, exactly as on a monochrome
printout, which is why icons carry a text-ish fallback too. _Tinting_ (a
dimmed panel, warm white, gamma) is a preview property, not in the frame,
and deferred; Pimoroni's Scroll pHAT HD (white, 8-bit PWM per pixel) is the
one case between the two and would be `monochrome` plus brightness.

### 7.3 The canvas

A 128×64 panel is 8,192 pixels — as DOM nodes about 60× a flagship's tile
count — so the preview is one `<canvas>`:

- Backing store `width·pitch·dpr`, CSS size `width·pitch` with
  `max-width: 100%; height: auto`, so it fits narrow slots with no JS and
  there is no `ScaledBoardDisplay` equivalent to write. DPR is read at paint
  time, repainted on a `(resolution)` media change registered once per
  effect, and capped so the backing store stays under Safari's ~16.7M-pixel
  limit. Painting happens in a layout effect (no blank-panel frame) and the
  canvas carries its `width`/`height` attributes in SSR markup (no layout
  shift).
- Every pixel is drawn, off pixels as a faint dot (`#171717` on a `#0a0a0a`
  substrate), because the visible unlit grid is what says "LED matrix". Dots
  are 0.72 of pitch (round) or 0.82 (square, radius 0.15); under 4 device px
  a round dot draws square. `pixelShape` is `round` (bare SMD/WS2812) or
  `square` (diffused); AWTRIX and Pixoo are square.
- The "every LED off" grid is one cached `Path2D` per canvas size, refilled
  each frame; only _lit_ pixels are traced per frame, one `Path2D` per
  colour, so a 128×64 panel takes a handful of fills.
- **Bloom** (`glow`): the frame is drawn at one pixel per LED on a cached
  1-px canvas and stretched back with smoothing on, so bilinear upscaling
  _is_ the blur, composited once `lighter` at alpha 0.35. Canvas
  `filter: blur()` was rejected (partial Safari support, GPU blur differs run
  to run); the upscale gives the same pixels every run within one browser,
  so VRT baselines are per-browser. The bloom source is glyph and tile
  pixels only — block fields are masked out, in flight too — so inverse
  glyphs stay crisp at every pitch; a bolder face for block text was
  considered and rejected (a bolder 5×7 is a 7-wide face and a different
  grid, and the visible problem was the bloom, not the face).
- Sizing: the housing is a flex item that can shrink (`min-w-0 max-w-full`);
  a box at the natural width is capped at 100% and the canvas fills it. A
  `fit-content` housing around a `max-width: 100%` canvas would resolve
  cyclically and overflow (#200/#203). The housing uses the
  `--color-board-bezel-dark` tokens and `StaticBoardDisplay`'s border and
  padding scale. The housing is marked `data-monochrome` on a mono panel.

Cost at 128×64, measured in headless Chromium at 2× DPR as JS time per
`requestAnimationFrame` callback (sampling, path building and canvas calls;
not the browser's raster): `dissolve` median 0.2 ms, p95 0.2 ms; `fade`
median 0.1 ms; `flip` median 0.1 ms with a 2.6 ms maximum on the first
frame, when the off-grid path is built.

### 7.4 The component

`<LedMatrixDisplay>` — one component, static unless `transition` is set.
Props fall into five groups, and the groups are the rule for where a future
prop goes: a prop that changes the bytes a device receives goes in
`LedLayoutOptions`; one that only changes the canvas does not.

| Group                      | Props                                                     | Lives in                              |
| -------------------------- | --------------------------------------------------------- | ------------------------------------- |
| What the panel **is**      | `model`, `preset`, `matrixWidth`, `matrixHeight`, `font`  | `DeviceModel` / `LedMatrixSpec`       |
| What the panel **draws**   | `textColor`, `monochrome`, `letterCase`                   | `LedLayoutOptions` — props extend it  |
| How the preview **paints** | `size` (`sm                                               | md                                    | lg`or px),`pixelShape`, `glow` | component only, never in the frame |
| How a change **arrives**   | `transition`, `announceUpdates`                           | component + the transition registry   |
| Naming                     | `previewLabel`, `messageLabel`, `emptyLabel`, `className` | same contract as `StaticBoardDisplay` |

`model` (a built-in id or a plugin's object) supplies geometry, face, colour,
pixel shape, charset and transition default; explicit props win over the
model's and the preset's. `matrixWidth`/`matrixHeight` (not `width`/`height`,
which read as CSS) match the manifest keys. Props stay flat because every
board renderer in the repo is flat. The housing exposes `data-model`,
`data-unknown-model`, `data-monochrome`, `data-transition-source`,
`data-transition-fallback` and `data-transition-frames`.

### 7.5 The television: `TvFrame`

FiestaPanel shows a board on a TV, so its preview sits on one. `TvFrame`
is an OLED set around any renderer — a thin bezel with a chin and a
standby LED, a centre stand or none, and a true-black screen — and
`DisplayPreview frame="tv"` wraps whichever renderer the model gets in it,
for any model (it is a preview frame, not a device). The set fills the
width it is given and the screen follows from the aspect; the board is laid
out at its natural size and scaled to fit the screen inside a small margin,
filling the width or the height as the aspect dictates. The frame is
preview-only in the sense of §3: nothing about it reaches device bytes.

Its inputs are what FiestaBoard's viewer knows about the panel
(`src/panels/models.py`), passed through `DisplayPreview`'s `tv` prop:

| FiestaBoard                           | `TvFrameOptions`              | Effect                                                                     |
| ------------------------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| `screen_diagonal_inches` (3–200)      | `diagonalInches` (default 55) | Bezel and stand proportions, subtly; never the board's size beyond the fit |
| `screen_aspect_w` / `screen_aspect_h` | `aspect` (number or `{w, h}`) | The screen's shape (default 16/9)                                          |
| the viewer's auto-dim overlay level   | `dimmed` (0–1)                | A veil over the screen only                                                |
| the viewer's frame-fetch failure      | `offline`                     | Screen off, standby LED amber, the board hidden, a status announced        |
| (viewer setting)                      | `stand`                       | `false` for a wall mount                                                   |
| `calibration_scale`                   | —                             | Physical-size calibration of the viewer; the frame does not read it        |

The chrome is `aria-hidden` and the board keeps its own `role="img"` and
name; offline, the board is hidden from everyone (nothing is showing) and
a `role="status"` region on the screen carries the status, so the frame
never names or re-names the board.

## 8. Transitions

### 8.1 The engine

`src/lib/led-transitions.ts` is pure: `planLedTransition(from, to, spec,
fromFrame?)` returns `{ durationMs, frameCount?, from, to, frameAt(t, out?),
frameAtIndex?(f), layoutAt(t) }`. `frameAt(0)` is the old frame;
`frameAt(durationMs)` is the new frame **byte for byte**, asserted for every
kind, so a transition always settles on exactly the static render.
`ledTransitionFrames(transition, fps?)` samples it into the sequence a device
receives (by `frameAtIndex` when the plan has a frame count, so the sequence
is exactly those frames). A retarget passes the frame on screen as
`fromFrame`, so an interrupted fade or slide continues from the blend.

| Kind       | Unit  | What happens                                                                                                                                                               |
| ---------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flip`     | cell  | FiestaBoard's own flip (8.2): each changed cell scrambles through glyphs from the device's set, then lands; half-turned flaps between glyphs.                              |
| `cascade`  | cell  | One half-flap per changed cell, in reading order, staggered evenly across `durationMs`, at least `MIN_CASCADE_SLOT_MS` (32 ms) each, so a board-wide change does not wipe. |
| `slide`    | pixel | The new frame pushes the old one up (AWTRIX's default).                                                                                                                    |
| `wipe`     | pixel | A left-to-right curtain.                                                                                                                                                   |
| `fade`     | pixel | A per-channel crossfade — a real brightness ramp on hardware.                                                                                                              |
| `dissolve` | pixel | Pixels switch in a fixed pseudo-random order (a hash of x,y; identical on every device and every run).                                                                     |

`flip` and `cascade` agree that a colour-only change snaps (a glyph change is
what turns). `tokensEqual` ignores `color`/`background`/`icon` on purpose,
because flap memo comparators must not re-render a tile whose flap didn't
change. `richTokensEqual(a, b)` (PR 1) is the colour-aware equality LED dedupe
needs, in FiestaUI and in FiestaBoard core alike. It is true only when the
type, the value/code, `color`, `background` and `icon` all match. An absent
field equals an absent field; an absent field never equals the default
colour.

### 8.2 FiestaBoard's own flip

The split-flap board's signature is that it does not _replace_ a message;
each changed tile turns until the new glyph comes round. The LED flip keeps
that feel without copying Vestaboard's character order — the owner's
requirement; the flip is FiestaBoard's, not an imitation:

- Each changing cell runs a short **scramble** of pseudo-random glyphs drawn
  from the **device's own character set** — uppercase, lowercase when the set
  has it, digits, punctuation, its icons and its colour tiles
  (`ledScramblePool(set)`; never blank, never anything the set cannot draw)
  — then lands on its target. The set is the one the layout was drawn with
  (`LedLayout.options.charset`, from the `charset` layout option — a plugin
  device's own, its custom glyphs drawn with their bitmaps), or, when none
  was given, the built-in set of the layout's face. A plugin sign with no
  lowercase never scrambles through lowercase; one with a `€` scrambles
  through it (golden: the ACME sign under its 12-frame budget).
- **The pool**, precisely: the set of glyph keys (section 7.2) of every
  entry in `chars` (a character is itself when the face or the set's
  `glyphs` draws it, else blank), of `tile:63` … `tile:69` when the set has
  `tiles`, and of `icon:<name>` for every entry in `icons`; blank removed;
  deduplicated; **sorted by key in code-point order** (the order of the
  keys' UTF-8 bytes — a port that sorts the encoded bytes gets it for
  free). So the pool is a function of the set's contents alone: not of the
  order a manifest lists its characters in, and not of anything laid out
  earlier in the process. `ledScramblePool` is exported so a port can
  compare its pool before it compares frames.
- It is **deterministic across processes**: each changing cell is seeded
  from its position and its change by **stable glyph key**, never by any
  per-process number. `ledFlipSeed(cellIndex, fromKey, toKey, cols, rows)`
  is FNV-1a (32-bit; offset basis `0x811c9dc5`, prime `0x01000193`, `h ^=
byte; h = (h × prime) mod 2³²` per byte) over exactly these bytes, in this
  order:

  ```
  u32le(cellIndex) ‖ u32le(cols) ‖ u32le(rows) ‖ utf8(fromKey) ‖ 0x00 ‖ utf8(toKey) ‖ 0x00
  ```

  — three unsigned 32-bit little-endian integers (`cellIndex` is row-major,
  `row × cols + col`), then each key as UTF-8 followed by one NUL byte (keys
  never contain NUL, so the layout is unambiguous). The seed feeds
  mulberry32 (`a += 0x6d2b79f5; t = imul(a ^ (a >>> 15), 1 | a); t = (t +
imul(t ^ (t >>> 7), 61 | t)) ^ t; (t ^ (t >>> 14)) >>> 0) / 2³²`), and the
  cell's plan is read from it in this order: its delay,
  `floor(r × (stagger + 1))` when `stagger > 0` (no draw otherwise, delay
  0); then, per scramble step, `pool[floor(r × n)]`, and if that glyph
  equals the previous one shown (the
  cell's old glyph for the first step) or the target, and `n > 2`, one more
  draw: `pool[(i + 1 + floor(r × (n − 1))) mod n]`where`i`is the first
  pick's index. Pinned seeds:`(0, "A", "B", 6, 1) = 3714565441`,
  `(3, "A", "€", 6, 2) = 990692943`, `(0, " ", "tile:63", 8, 1) =
2711017083`, `(5, "icon:sun", "¥", 12, 2) = 2318610564`— computed
  independently in Python and asserted in`led-transitions.test.ts`. So the
  preview, `ledTransitionFrames`, the frames a device receives and the
  Python port's are identical and repeatable; a different change scrambles
  differently (tested); laying out another set first changes nothing
  (golden: the ACME flip after another set's `¥€`, byte-identical to the
  standalone case; and a `vi.resetModules` test that a fresh module graph
  agrees with a primed one). Hashing glyph _keys_ is the point: an earlier
  revision hashed the glyph's index in a process-local table that custom
  glyphs were appended to on first sight (FiestaBoard #2170), so two
  processes could scramble a cell changing to or from a plugin's glyph
  differently.

- The run length is a **parameter**: `scrambleSteps` (default 6) and
  `stagger` (default up to 6 steps of seeded per-cell delay, so the board
  settles as a cascade; `0` runs every cell in step). Frames =
  `stagger + scrambleSteps + 2`; one glyph per `stepMs` (80,
  `FLAP_SPEED_PRESETS.standard`); A → B takes exactly as long as A → Z; the
  whole board settles in 1.1 s at the defaults.
- `halfFlap` (default on) shows, in the second half of each step, the next
  glyph's top rows over the current one's bottom rows — over the cell's lit
  block field, rasterised into a glyph-box-sized scratch, so inverse pills do
  not strobe. Off is the "coarse flip" a one-frame-per-step device gets.
- Intermediate tiles pass in their own colours (the rainbow is the charm);
  intermediate letters and icons take the target cell's colour; a
  monochrome panel stays monochrome throughout (tested).
- Under `maxFrames` the stagger is shortened first (it is the cascade; the
  scramble is the flip), then the scramble: `scrambleSteps = min(scrambleSteps,
maxFrames − 2)`, then `stagger = min(stagger, maxFrames − 2 −
scrambleSteps)`; the last frame is always the target. A 32-frame sequence
  budget holds the default flip whole (14 frames); a 62-frame request is
  compressed to exactly 32 (scramble 30, stagger 0). A set with an empty
  scramble pool (nothing drawable) runs `scrambleSteps = 0`.

The split-flap `BoardDisplay` is untouched: it imitates real Vestaboard
hardware and keeps Vestaboard's order. Nothing in the LED path depends on
`BOARD_CHARS` order (tested).

### 8.3 Device budgets

`LedTransitionSpec.maxFrames` is the whole transition, first frame to final
frame inclusive. A flip is shortened as above; a per-pixel kind and the
cascade are _quantised_ to N evenly spaced samples, the last being the
settled frame, with integer frame indexing (`frameOf(t) = floor(t·(N−1)/D +
ε)`, division last) so no float drift skips or doubles a frame (tested for
every kind at 777 ms into 3…32 frames). `frameCount` reports the exact count,
`ledTransitionFrames` returns precisely those frames, and the preview's
`frameAt` steps through the same ones — so "the preview shows exactly the
frames a sequence will contain" is true by construction. A sequence player
is judged by its budget, not by a frame rate; its `maxFps` is only the
cadence we author at, and `minFrameMs` floors `stepMs`.

### 8.4 The menu, defaults and precedence

`src/lib/led-transition-registry.ts` makes transitions a **menu**. "None —
change instantly" is a real first-class entry. Each entry carries `id`,
`label`, `description`, `requires { minFps, fullFps, minFrames }`,
`monochrome: true` and `budget` (`subsample` for flip, `quantise` for the
rest, `none`). The coarse, budgeted flip is _derived_ from "flip" by the
device (`transitionSpecForDevice`), never a separate entry: a user picks
Flip; the device decides how many frames that is.

| Capability                                 | Default                                               | Devices                                                                |
| ------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| stream at ≥ 25 fps, or sequence ≥ 8 frames | `flip`: 80 ms, half-flaps, budget applied             | HUB75 (60), WLED DDP (40), MAX7219 / P10 (50), Tronbyt (sequence)      |
| stream at 5–25 fps                         | coarse flip: `stepMs = max(80, frame)`, no half-flaps | —                                                                      |
| < 5 fps, unmeasured, or no frame interface | `none` (snap)                                         | Pixoo 64 (2 fps, measured — it snaps), AWTRIX (unmeasured), split-flap |

`transitionsForModel(ref)` lists the menu judged against a device — a
streamed device by push rate, a sequence player by its frame budget, a
device with no frame interface gives "None" only — with a `reason` for every
unavailable entry and a "runs as" note for every degraded one. A
`split_flap` model gives "None" only whatever its `animation` says (the
built-in Vestaboards stream at ~1 fps, written frame by frame by
FiestaBoard core; the virtual panel at 0.5): LED transitions do not apply
to a board whose own flap cascade animates every change, and the reason
says so rather than talking about push rates.
`defaultTransitionIdForModel(ref)` is flip when the device can show it, else
none. `resolveLedTransition(choice, ref)`: an explicit choice (a board or
page setting; later a plugin's request) wins over the model's default; an
explicit choice the device cannot run falls back to the default with
`source: "fallback"`, `requested` and `reason`; an explicit _spec_ keeps the
caller's timings but still respects the device (a slow stream drops the
half-flap, `minFrameMs` floors `stepMs`, the budget applies, and `reason`
says so). Without a model there is no device to ask and a change snaps.

Where the setting lives in the FiestaBoard app: **per board** as the default
(capability is a property of the board), **per page** as an override, and
**per plugin** only as a _request_ the board setting may deny.

### 8.5 In the component and the picker

`transition` accepts a registry id or a spec. Unset, it is the **device
default** (`resolveLedTransition(undefined, model)`: flip where the device
is fast enough, else none — the owner's rule in 8.4); `"none"` opts out.
Without a model or preset there is no device to ask and a change snaps, so
a dashboard of size-only thumbnails never schedules a frame. When a
transition runs, the layout effect plans a transition from what the
canvas currently shows to the new layout and runs one `requestAnimationFrame`
loop (one closure, which also serves DPR repaints); a message that lands
mid-transition retargets from `layoutAt(now)` / `frameAt(now)` rather than
from a frame never reached. `prefers-reduced-motion: reduce` snaps, with no
opt-out prop, for the reasons in `BoardDisplay` (#180): under `reduce`, a
strobe of scrambled glyphs is worse than the animation it replaces.

`LedTransitionPicker` is the settings control: a `ToggleCardGroup`
radiogroup, one card per entry with label, description, availability or
"runs as" note, the device default marked, and an optional tiny looping
`LedMatrixDisplay` preview of the whole device scaled to fit (pinned to the
card bottom; all previews tick on one shared clock; still under reduced
motion). Unavailable entries stay in the group as radios marked
`aria-disabled`, each with its reason in the card; the keyboard skips an
`aria-disabled` radio (Base UI's composite never focuses one), so every
reason is also listed under the group as a plain list the group is
`aria-describedby`. The picker refuses to select an unavailable entry and
keeps the current value; uncontrolled, it re-derives its value when the
model changes (an untouched default follows the new device, a choice the
new device cannot run gives way to its default).

## 9. `CharacterGlyph` and `CharacterSetSpecimen`

`CharacterGlyph` (`src/components/board/character-glyph.tsx`) draws one
token from a set on its own: `token` (a parsed token or a string — a
character, `63`/`red`/`{red}`, `sun`/`{icon:sun}`, `{red:A}`,
`{black/white:A}`; colour names and tile codes are looked up explicitly, so
`"black"` is the black tile), `charset` or `model` (+ `code62Glyph`), `size`
(`sm|md|lg`, matched to the tile scale through `TILE_BASE_HEIGHT` in
`board-metrics`) or an explicit `height` in px, `markUnsupported`,
`decorative`, `label`, LED look overrides. An LED set draws the glyph as an
inline SVG of its face's dots from `renderLedGlyph` (the panel's own bytes,
no canvas, no bloom); a Vestaboard set draws a tile with the board
renderers' metrics and surface. An unlit glyph (black text) draws its pixels
in a lighter "off" shade with a hairline so it stays visible. An unsupported
token draws the set's fallback and, when marked, a dashed outline and badge;
its name says "sun icon, not available — drawn as yellow tile". Names are
human: "capital A", "lowercase a", "digit 7", "degree sign", "red tile",
"sun icon", "capital A in red on white".

`CharacterSetSpecimen` shows a set — every character as LED dots or flap
tiles, the tiles, the icons, a plugin's added characters, the feature labels
— and with `compareTo` rings what it adds and lists what it lacks. It counts
"characters", names tiles by colour, renders each glyph as a list item with
its own text, and keys `data-section` on stable ids.

## 10. Editor integration

Done in FiestaUI, in two layers, both additive and default-off.

**The pickers (plan Task 6).** `DrawCharPickerContent` takes `charset` and
offers only the stamps the set draws (through `CharacterGlyph` for LED sets)
plus a lowercase row for a mixed-case set and, since Task 8, an icon row
for a set with icons; the code-62 stamp stays `°` and its glyph follows the
set. `ColorPickerContent` takes `charset`, `onInsertTextColor` (a text-colour
group for sets with colour spans, black labelled "Black (unlit on LEDs)"),
`onInsertBlockColor` (a block-colour group for sets with block spans) and
`onInsertIcon` (the set's icons). Those groups are `role="group"`s of plain
buttons outside the swatch listbox. Without `charset` both pickers are
byte-for-byte what they were.

**The editor (plan Task 8).** `TemplateEditor` takes `charset` (an id or a
`CharacterSet`) or `deviceModel` (an id or a `DeviceModel`, which implies the
set through `characterSetForModel` with `code62Glyph`, and the grid from the
model's geometry — an LED model's rows × cols are what its pixels fit in its
font). Unknown ids throw. With a set known:

- The template is parsed with the extended markup and the toolbar offers,
  through the pickers, only the forms the set supports. A colour span and a
  block span are one TipTap **mark** (`colorSpan`, attrs `color` /
  `background`) over a run of cells, toggled on the selection; an icon is an
  **atom node** (`icon`) drawn by `CharacterGlyph` with the target set, so a
  flap target shows the tile fallback, marked.
- Every cell the set cannot draw as written is decorated (`charsetIssue` /
  `charsetFallback` per cell): a wavy underline, a `title` naming what draws
  instead ("drawn as yellow tile", "drawn as blank", "drawn without the
  colour"), and a summary under the surface that is the textbox's accessible
  description. On a split-flap set the summary says spans and icons render
  literally until the coordinated release (Task 12). Nothing blocks typing,
  and reading the document never rewrites it.
- Draw mode gets an icon brush when the set has icons, colour swatches only
  when it has tiles, and its grid from the model. `{{icon:sun}}` is one cell
  and a span is one cell per character, so a line with either stays
  positional.
- Length counting treats a span as its content and an icon as one cell.
- Case follows the set. A mixed-case set (`CharacterSet.mixedCase`, the LED
  faces) draws lowercase as itself, so the editor keeps typed lowercase in
  the surface and in the serialised template, lowercase stamps paint
  lowercase, and no `case` warning is raised. Every other set, and no set,
  uppercases on serialize exactly as before.

Without `charset` / `deviceModel` the editor is byte-identical in value and
DOM to what shipped before Task 8 (pinned by snapshots generated at the parent
commit): the extended forms are not parsed, so a split-flap template
serializes exactly as before.

### 10.1 Template syntax

Template tokens are double-braced; FiestaBoard's engine normalises them to
the single-braced message markup of §4.1 when it renders:

| Authoring (template)   | Rendered (message)   | Meaning                                           |
| ---------------------- | -------------------- | ------------------------------------------------- |
| `{{red:HOT}}`          | `{red:HOT}`          | colour span; also `{{63:HOT}}`, `{{#ff8800:HOT}}` |
| `{{black/white:OPEN}}` | `{black/white:OPEN}` | block span, `fg/bg`                               |
| `{{icon:sun}}`         | `{icon:sun}`         | icon, by canonical name                           |

- **Closed head grammar.** A head is a colour name (red, orange, yellow,
  green, blue, violet, purple, white, black), a code 63–70, `#rrggbb`,
  `fg/bg` (both colours required), or the literal `icon`. Anything else
  before the colon — `{{weather:sf.temperature}}` — is a **variable**. Never
  `filled` / 71: a flap, not a hue, so `{{filled:x}}` is a variable too.
- **Reserved plugin ids.** FiestaBoard reserves those colour names, the
  codes and `icon` as plugin ids, so the two grammars cannot collide.
- **Nesting.** A variable, a formula, a tile or an icon inside a span body
  round-trips: `{{red:{{weather.temp}}°}}`. The span ends at the `}}` that
  balances its own `{{`. A span inside a span flattens to adjacent spans of
  the same cells.
- **When to emit.** The editor offers spans, blocks and icons only when the
  target set supports them (`colorSpans`, `blockSpans`, `icons`). Vestaboard
  sets support none, so a split-flap template serialises exactly as today. A
  template that already holds a span is never rewritten on load; the warning
  says what the board will do with it.
- **Icons.** The editor always writes `{{icon:…}}` with the canonical name
  (`{{icon:x}}` → `{{icon:cross}}`). The legacy `{sun}` shortcuts are
  read-only aliases (D16) and are never written back. `{{icon:heart}}` is the
  ♥ character, not an icon.
- **Mixed boards.** Until Task 12, a page shown on both a flap and an LED
  board renders the new forms literally on the flap; the editor's warnings
  surface that when the target is split-flap. FiestaBoard applies
  `TemplateEngine.render(..., extended_markup=False)` per flap output (B4
  #2161, B5 `feat/template-extended-syntax`).

### 10.2 Data is not markup — FiestaBoard's engine contract

There is NO literal-brace escape in `parseLine` or in the editor's parser.
Braces that arrive in **data** (substituted variable values) are the
engine's to neutralise, under this rule, agreed with FiestaBoard and
implemented in its engine and manifest (B5); the FiestaUI editor is
unaffected:

1. **Default.** A substituted variable value may contain exactly the BASE
   grammar: tile tokens `{63}`–`{71}` and the names red…black and filled, and
   the base end tags `{/}` and `{/<colour name>}`. Every other brace becomes
   `(` / `)`: the extended constructs, `{/63}`, `{/foo}`, `{icon:…}` and
   stray braces. So data cannot inject a span, a block or an icon, nor close
   a span the template opened. This keeps art plugins that emit tile rows
   (e.g. `fiestaboard-plugin--pride`'s `{red}` rows) working.
2. **Opt-in.** A plugin variable declared with `"format": "markup"` in its
   manifest variable metadata passes through un-neutralised, and the board's
   character set still governs projection. It is per variable, so user text
   such as calendar titles and RSS headlines is never markup.
3. **Applies to every output,** flap included.

## 11. Accessibility

The canvas is `aria-hidden`. The wrapper is `role="img"` with the same
`previewLabel` / `messageLabel` / `emptyLabel` contract as
`StaticBoardDisplay`. The name is **what the matrix shows**: `LedLayout.text`,
the clipped grid, with tiles and undrawable characters as blanks and icons by
their label ("sun 72°" — an icon is content, a tile is decoration). On a 32×8
clock clipping is normal, and naming text nobody can see would tell a
screen-reader user more than the board tells a sighted one; this departs
from the split-flap renderers on purpose.

`announceUpdates` adds the polite live region `BoardDisplay` has (#206),
outside the `role="img"` so it is exposed, armed empty on mount (mounting is
not news) and re-armed when the prop toggles, carrying the clipped grid text
on each change — when the change arrives, not when a transition settles,
because the announcement is the new message and nobody should wait out a
flip for it. Off by default. Reduced motion snaps every transition.
`CharacterGlyph` names every token; unavailable transition cards stay
focusable with their reason.

## 12. API

```ts
// src/lib/board-characters.ts  (shared with every split-flap renderer)
type BoardToken =
  | { type: "char"; value: string; color?: string; background?: string; icon?: BoardIconName }
  | { type: "color"; code: string; color?: string; background?: string; icon?: BoardIconName };
interface ParseLineOptions { extendedMarkup?: boolean; preserveCase?: boolean }
parseLine(line, maxTokens?, options?)
messageToGrid(message, rows, cols, deviceType?, code62Glyph?, options?)
messageToText(message, deviceType?, code62Glyph?, options?)
tokensEqual(a, b)       // colour-blind: value/code only, for flap memo comparators
richTokensEqual(a, b)   // type, value/code, color, background and icon all match (§8.1)

// src/lib/board-icons.ts
BOARD_ICONS: Record<BoardIconName, BoardIconSpec { label, color, fallback }>   // 16 icons
BOARD_ICON_NAMES, BOARD_ICON_ALIASES { storm: "bolt", x: "cross" }, isBoardIconName, resolveBoardIconName

// src/lib/led-fonts.ts
type LedFontId = "3x5" | "5x7";  LED_FONTS: Record<LedFontId, LedFont>

// src/lib/character-sets.ts
CHARACTER_SETS, CHARACTER_SET_IDS, type CharacterSet, CharacterSetId, CharacterSetInput, LOWERCASE_CHARS
isCharacterSetId, resolveCharacterSet, tryResolveCharacterSet, materializeCharacterSet, validateCharacterSet → ValidationResult
charsetSupports, charsetIssue, charsetFallback, charsetHasChar, charsetHasIcon, validateMessage
iconsInSet, charsInSet, charsetDiff, charsetLineage, characterSetForDevice

// src/lib/devices.ts
DEVICE_MODELS, DEVICE_MODEL_IDS, DEVICE_FAMILIES, type DeviceModel, DeviceModelId, DeviceModelRef, DisplayTechnology, DeviceAppearance, …
isDeviceModelId, resolveDeviceModel, tryResolveDeviceModel, validateDeviceModel
deviceModelForDeviceType, deviceModelForPreset, characterSetForModel(ref, code62Glyph?), ledSpecForModel, modelsByTechnology

// src/lib/led-matrix.ts
interface LedMatrixSpec { width; height; font? }
LED_MATRIX_PRESETS, LED_MONO_COLORS, MIN_MATRIX_SIZE, MAX_MATRIX_SIZE, DEFAULT_LED_TEXT_COLOR, parseHexColor
interface LedLayoutOptions { textColor?; monochrome?; letterCase?: "upper" | "mixed"; charset? }   // no code62Glyph: an LED draws ° and ♥ as written
ledGridLayout(spec) → LedGridLayout
layoutLedMessage(message, spec, options) → LedLayout { grid, cells: LedCell[], options, ops: LedDrawOp[], text }
rasterizeLedLayout(layout) → LedFrame;  renderLedFrame(message, spec, options) → LedFrame
renderLedGlyph(token, font, { textColor?, monochrome?, charset? }) → LedFrame
ledBackgroundMask(layout);  frameToAscii(frame);  frameToBits(frame)

// src/lib/led-transitions.ts
type LedTransitionKind = "flip" | "cascade" | "slide" | "wipe" | "fade" | "dissolve";  LED_TRANSITION_KINDS
interface LedTransitionSpec { kind; durationMs?; stepMs?; scrambleSteps?; stagger?; halfFlap?; maxFrames? }
DEFAULT_LED_TRANSITION_MS, DEFAULT_LED_FLIP_STEP_MS, DEFAULT_LED_SCRAMBLE_STEPS, DEFAULT_LED_FLIP_STAGGER, MIN_CASCADE_SLOT_MS
ledScramblePool(charset)
planLedTransition(from, to, spec, fromFrame?) → LedTransition { durationMs, frameCount?, from, to, frameAt, frameAtIndex?, layoutAt }
ledTransitionFrames(transition, fps?) → LedFrame[]

// src/lib/led-transition-registry.ts
LED_TRANSITIONS, LED_TRANSITION_IDS, type LedTransitionId ("none" | kind), LedTransitionEntry, LedTransitionAvailability, isLedTransitionId
transitionSpecForDevice(id, animation), transitionsForModel(ref), defaultTransitionIdForModel(ref)
resolveLedTransition(choice, ref) → ResolvedLedTransition { id, spec, source: "explicit" | "default" | "fallback", requested?, reason? }

// src/components/board
<LedMatrixDisplay message model? preset? matrixWidth? matrixHeight? font?
  textColor? monochrome? letterCase? size? pixelShape? glow?
  transition? announceUpdates? previewLabel? messageLabel? emptyLabel? className? />
<CharacterGlyph token charset?|model? code62Glyph? size?|height? markUnsupported? decorative? label? … />
<CharacterSetSpecimen charset compareTo? … />
<LedTransitionPicker model? value? defaultValue? onValueChange? … />
```

Not exported, deliberately: `LED_GLYPHS`, `ledGlyphKey`, `drawLedGlyph`,
`layoutLedCells`, `rasterizeLedOps`, `ledCellForToken` — renderer plumbing.

**Storybook coverage** (`App/Board/LedMatrixDisplay`, `CharacterGlyph`,
`CharacterSetSpecimen`, `LedTransitionPicker`; `Editor/*PickerContent`):
every preset, colour text and icons beside split-flap, mixed case,
monochrome, block text, each transition kind, `Pixoo64Featured`,
`SequenceDeviceBudget`, `DefaultTransitionByDevice`, `OnePluginEveryBoard`,
`OneMessageEveryCharset`, `SmallMatrixVsFlagship`, `TodaysSplitFlap`, the
specimen comparisons and the pickers with LED sets — 70 stories, all in the
component inventory.

## 13. Fixtures and golden files for the Python port

The contract is **exported as data** under `scripts/ci/tests/fixtures/`,
generated by `node scripts/ci/led-fixtures.mjs` (prettier-formatted) and
guarded by drift tests (`src/lib/led-fixtures.test.ts`, the set and model
tests) that fail when the TypeScript and the files disagree:

- `led-fonts.json` — both faces, every glyph, lowercase and icons.
- `board-icons.json` — names, labels, colours, flap fallbacks, aliases.
- `character-sets.json`, `device-models.json` — the built-ins. The models
  carry `animation.notes` / `sources`, merged in by the generator from
  `scripts/ci/device-model-notes.json`; the runtime built-ins omit both, so
  the bundle holds only what rendering needs.
- `character-set.schema.json`, `device-model.schema.json` — the shapes a
  plugin loader validates against (Draft 7). `src/lib/device-schemas.test.ts`
  validates every fixture and the fictional 48×12 amber sign with Ajv in
  strict mode, registering the schemas **by `$id` only**, and pins the
  hand-written validators to the schemas on a table of valid and invalid
  documents. `scripts/ci/tests/schema-refs.test.mjs` checks statically that
  every `$ref` resolves, per RFC 3986, to a shipped schema's `$id`.
- `led-golden.json` — **golden layout cases** (message + spec + options, or
  a plugin set → `LedLayout.text` + RGB888 frame as base64) covering both
  faces, mixed case, monochrome, spans, blocks, icons, aliases, the degree
  sign and typed hearts, the Pixoo grid, the ACME set's `€` glyph over
  `led_3x5`, the ACME v2 set's `0` **overriding the face's**, icon fallbacks
  **drawn** — tile fallbacks (snow, partly) and blank fallbacks (bus, bell)
  on the 3×5 face, each bare, in a colour span and in a block — a block
  behind a drawn icon, and the same fallbacks in a block on a monochrome
  panel. Frames are RGB888, row-major, origin top-left. The transition
  cases (a seeded-scramble flip, one with half-flaps sampled at 25 fps, the
  Pixoo 32-frame budget resolved through the model, the default flip whole
  on a Pixoo in monochrome, the ACME plugin sign under its 12-frame budget
  (`pluginModel`: the declaration with its set inline, so the scramble
  draws only the sign's characters, `€` included), the same ACME flip
  **after another plugin set was laid out first** (`before`: a `¥€` message
  in a set with its own `¥` — the frames are byte-identical to the standalone
  case, which is what proves glyph identity carries no process state), a fade quantised to 8
  frames over 777 ms, a continuous fade at 10 fps, a wipe quantised to 6
  frames and a continuous dissolve at 20 fps → the exact frame sequence,
  `ledTransitionFrames(plan, fps)`) land with Task 4. The cases
  are data (`src/lib/led-golden-cases.ts`); the generator and the drift test
  read one list.
- `charset-golden.json` — **golden character-set cases**
  (`src/lib/charset-golden-cases.ts`): four plugin-style sets as declared and
  as `materializeCharacterSet` makes them — `acme_sign_v1` **extends
  `led_3x5` and carries its own `€` bitmap** (FiestaBoard D17's required
  case), `acme_sign_v2` bumps `version` and **overrides the face's `0`**
  (`glyphs` replace wholesale, so it carries `€` again), `lobby_flap`
  extends `vestaboard_v2` (version 2) and says nothing else, so it inherits
  everything **except `version`** and is version 1, `ticker_mono_v2`
  extends nothing and has no tiles; a
  `charsetFallback` table with every branch (identity, uppercase, span
  colours kept or dropped, blocks kept without colour spans, `°` ↔ `♥`,
  icons to a tile or a character with their colours kept, tiles and icons
  on a set without tiles, blank); and `validateMessage` over whole messages
  with every issue's row, col, token, reason and fallback. Tokens keep the
  spelling they were parsed with (`"red"`, `"63"`).

The split-flap parser contract lives beside them in
`scripts/ci/tests/board-characters.test.mjs`.

## 14. Downstream alignment

FiestaBoard's **output-plugins program** (plan:
`~/.claude/plans/fiestaboard-output-plugins.md`, D15 and its revision-7
amendments) treats FiestaUI as the reference implementation and matches it,
never forks it:

- Core ports layout, raster and the seeded-scramble flip to Python
  `src/led/` (Node is not in the runtime image), exposed through the plugin
  API and versioned by `output_api`, verified against the golden fixtures
  above and pinned to the FiestaUI version they came from.
- Core parses the markup **once** into rich cells — FiestaUI's
  `BoardToken[][]` (char | colour tile | icon, with `color` and
  `background`) — and projects that grid per output from the output's
  charset with `charsetFallback` and the icon fallback table. Split-flap
  outputs receive the 0–71 projection; LED outputs receive rich cells; LED
  dedupe compares colour.
- Output plugins declare `output.device_models[]` (FiestaUI `DeviceModel`
  objects or built-in ids) and optional character sets, validated against
  FiestaUI's JSON Schemas vendored at a pinned version; board-level
  overrides (`font`, `letter_case`, `monochrome`) win over model defaults;
  transport-only fields stay backend-side; unknown ids never coerce to a
  flagship.
- For sequence devices the plugin renders the transition via `src/led/`
  and uploads it (Pixoo: ≤ 32 frames, 80 ms per step, landing on the final
  frame).

**Dependency map:**

| FiestaUI PR (plan task)                                              | Unblocks in FiestaBoard                                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Task 0: parser parity fixes (patch)                                  | B1 flips its five "board disagrees with preview" tests                                                                        |
| Task 1: gated markup + icons                                         | B1 parser parity, pinning the shared fixtures                                                                                 |
| Task 2: fonts, character sets, layout/raster, device models, schemas | schema vendoring, B3 rich-cell projection, manifest validation, Pixoo repo v0.1.0, layout goldens                             |
| Task 4: transitions + transition goldens                             | B2 `src/led/` port (needs Tasks 2 and 4, not the canvas in Task 3)                                                            |
| Task 7: cells-in + `DisplayPreview`                                  | app previews of rich cells                                                                                                    |
| Task 8: device-aware `TemplateEditor`                                | the app's editor, with `deviceModel` threaded from the board; B5 `feat/template-extended-syntax`                              |
| Task 9: `TvFrame` + `DisplayPreview frame="tv"`                      | the web viewer's panel preview on a TV, from `screen_diagonal_inches`, `screen_aspect_w/h`, auto-dim and fetch failure (§7.5) |
| Task 12: coordinated `extendedMarkup` default flip (major)           | released together with core parser parity                                                                                     |

Repos: `fiestaboard-output--divoom-pixoo` (first; a data-only skeleton to
start), `fiestaboard-output--vestaboard`, `fiestaboard-output--fiestapanel`.
Extended markup on split-flap previews ships only in a release coordinated
with core parser parity.

## 15. Known preview-vs-board parity gaps (fixed in plan Tasks 0 and 1)

From FiestaBoard B1's parity run of the Python parser against FiestaUI's
`parseLine`; 1–4 are fixed in plan Task 0 and 5 in Task 1 (it only arises
under `extendedMarkup`), so both parsers read the message the same way:

1. `{filled}` is tile **71**.
2. Only `{/}` and `{/<colour>}` are end tags; any other `{/…}` is literal
   text.
3. Iterate by **code point**, so an astral character or an emoji is one
   cell, not two.
4. A typed `♥` or `❤` is code **62**.
5. An icon whose fallback is a colour tile dropped the surrounding span's
   colours in the parser's emitted token; the colours now carry through on
   the tile token (`{ type: "color", code, icon, color?, background? }`), as
   they already did on a character fallback. `charsetFallback` (Task 2) keeps
   them too when it degrades an icon to a tile: the degraded tile carries
   the span's `color` / `background` as informational fields, as a parsed
   tile does, and the golden fixtures pin it.

From FiestaBoard #2165, the Python port of the Task 2 data layer, six more,
fixed on the Task 2 layer with a golden or a unit test each so no port can
miss them again:

6. A set's `glyphs` entry **wins** over the face's glyph for the same
   character (D17 rule 5). The code checked the face first; the docs were
   right. Golden: `plugin glyph overrides the face's` (`acme_sign_v2`).
7. Icon fallbacks were described but never **drawn** in a golden. Goldens
   now draw tile fallbacks and blank fallbacks bare, in a colour span and in
   a block, in colour and monochrome. (Both built-in faces carry every icon
   whose fallback is a character — `up`, `down`, `fog` — so that branch is
   pinned by a unit test against a face stripped of its icons.)
8. `{black/white:{icon:sun}}` drew **no block field**, while
   `{black/white:{icon:bus}}` did: the layout read a span's colours only off
   a `char` token, and a tile-fallback icon is a `color` token (5 above).
   It reads them off any token now; the field lights, gutter joined, and the
   icon or its tile draws over it. Goldens: `block behind a drawn icon`,
   `tile-fallback icons bare, in a colour span, in a block`, `icon fallbacks
in a block, monochrome`.
9. `textColor` / `monochrome` are **normalised**: trimmed, `#` optional,
   lowercase `#rrggbb`; anything else is the documented fallback. Before,
   `ffb000` passed validation but was carried unnormalised.
10. A partial `extends` declaration with an unknown key is **rejected**
    (`materializeCharacterSet` throws, as the schema's
    `additionalProperties: false` does); it used to be dropped silently. The
    device-model validator already rejected unknown keys, at the top level
    and in an embedded set; the agreement tables now say so.
11. `version` is **not inherited**: the `lobby_flap` golden materialises a
    child of `vestaboard_v2` (version 2) as version 1.

## 16. Risks

- **Pixoo push freeze and the "Loading.." overlay — resolved by the
  hardware test (2026-10-04).** Uploaded animations loop forever, more than
  ~3 frames show a ~6 s "LOADING…" overlay, a still after an animation
  glitches for ~5 s, and a single-frame push is clean in ~0.5 s. Decision:
  the Pixoo snaps (`stream`, nominal 2 fps, default `none`); the adapter
  pushes one frame per change and never uploads a sequence, so the push
  counter and reboot mitigations are moot. The earlier plan follows for the
  record: a push counter in the adapter that reboots or drops to single-frame
  pushes before ~250 pushes, animate only on a changed value, 32 frames
  kept; 16 frames (~18 changes between reboots, still a cascade — the menu's
  flip minimum is 8) is one number in the model if the spike says so. If the
  overlay also shows on single-frame pushes, static updates need a different
  command path. To be confirmed in a hardware spike.
- **`devices.py:201` flagship coercion.** FiestaBoard's Python coerces an
  unknown device type to a Flagship today; the port must adopt the
  fail-loudly rule or an output plugin's model will be drawn as a 6 × 22
  split-flap.
- **Legacy `{sun}` shortcut overlap.** FiestaBoard's single-brace shortcuts
  (`engine.py` SYMBOL_CHARS) expand `{sun}` to ASCII `*` on a flap, while
  `{icon:sun}` falls back to a yellow tile; the same word means two things
  until the owner decides (section 17).
- **Byte-identical guarantee at the parity flip.** Existing text containing
  `{<colour>:`, `{icon:` or `{x/y:` renders literally today and will change
  meaning when parity ships; upgrade fixtures are scanned and release notes
  carry the edge.
- **AWTRIX unmeasured.** Modelled as "none" until a push rate is measured on
  a TC001; a wrong guess either way is one number in the model.
- **Unverified figures** called out above: Tom Thumb's descender detail,
  Tronbyt's default delay, MAX7219/P10 host fps. (The Pixoo's frame cap was
  measured on 2026-10-04: 40 frames play, ~55 is the most it takes — moot
  now that it snaps.)

### Decided: legacy shortcuts become icon aliases (FiestaBoard plan D16)

The owner delegated this question with "whatever is best for scaling". The decision is a single registry. `src/lib/board-icons.ts` is the one source for each icon's name, its glyphs per font and its split-flap fallback.

- **Legacy shortcuts become aliases.** FiestaBoard's legacy single-brace shortcuts (`{sun}`, `{star}`, `{cloud}`, `{rain}`, `{snow}`, `{storm}`, `{fog}`, `{partly}`, `{check}`, `{x}`) resolve through the registry to the matching `{icon:…}`. There is no second table.
- **`{heart}` stays the ♥ character** (code 62).
- **The tile fallbacks win.** On a split-flap board `{sun}` changes from `*` to the yellow tile.
- **When it ships:** the visible change ships only in the coordinated Task 12 release. FiestaBoard's upgrade scanner flags shortcut usage, and the release notes call it out.
- **Where aliases resolve:** if a FiestaUI preview needs to resolve a shortcut (for example, a template that uses `{sun}`), it does so through `resolveBoardIconName`, never through a separate map.
- **Implementation:** FiestaBoard's side is Stack B layer B4, `feat/icon-shortcut-aliases`.

## 17. Open questions

- Should a long message on a small matrix scroll by default (as AWTRIX does)
  or clip (decided for now)? That decides whether scrolling is opt-in, and
  whether the 3 × 15 platform floor is relaxed for small matrices.
- Should FiestaBoard measure a frame-stream rate on a TC001 and promote the
  AWTRIX model from "none"?
- Which icons beyond the sixteen, and who may add one? Each needs a glyph in
  both faces (or a deliberate 3×5 fallback) and a flap fallback that means
  the same thing.
- Should a page-level transition override be allowed to pick an entry the
  board's model lists as degraded?

## 18. Deferred / later

1. **`device_type: "led_matrix"`** in `DeviceType` / `BoardPreviewEntry`
   (`model`, `matrix_width`, `matrix_height`, `font`, `monochrome`,
   `letter_case`), so `BoardShowcase` gets an LED tab; shape decided in
   section 6.
2. **Scrolling.** Per-row ticker vs whole-frame scroll, honouring reduced
   motion; `slide` with a horizontal axis and a hold is the seed.
3. **Pixel layer.** 8×8 icons beside text (AWTRIX/LaMetric-style) and
   primitives (bar, sparkline) composited over the text frame.
4. **Device adapters** in output plugins: RGB565 (AWTRIX, spans as `text`
   fragments), DDP (WLED), base64 (Pixoo), WebP (Tronbyt, from
   `ledTransitionFrames`), 1-bit (MAX7219 / P10, from `frameToBits`),
   text-only (LaMetric).
5. **More fonts** (4x6, 6x10 from hzeller's BDF set), perhaps a BDF parser.
6. **Brightness / gamma** in the preview (the "tint" half).
7. **A browser paint test** (backing-store size; `fill` at most
   2 + distinct colours) as a Storybook play function — jsdom has no
   `Path2D`.
8. **Loading state** (`isLoading`): a flip with no target.
9. **Template-editor nodes** for spans, blocks and icons (section 10).
10. **Per-device transition on a page**, `hardware`/`quick`/`relaxed`
    presets for `stepMs` shared with `FLAP_SPEED_PRESETS`, and plugin
    manifests declaring a preferred transition as a request.

---

## Appendix A — Design history

Seven revisions and five independent reviews. Every decision and its reason,
condensed; the body above is the result.

### Revisions 1–2 — the preview renderer

- **Framebuffer as contract**, layout and raster as separate stages, one
  `<canvas>` (8,192 DOM nodes rejected after `StaticBoardDisplay` had to cut
  nodes per tile), bloom by upscaling rather than `filter: blur()` (Safari,
  GPU nondeterminism), DPR capped for Safari's canvas limit, painting in a
  layout effect with SSR `width`/`height`.
- **Keep the board's message markup** on a derived grid rather than go
  pixel-native (plugins, `messageToGrid` parity with #205, cheap to add a
  layer later, costly to remove one).
- Colour tiles fill the glyph box, not the gutter; black is "off"; one
  `textColor` per board, untinted, unparseable colour → default; code 62
  per `code62Glyph`; ♥ red; `°` a 2×2 block; M/N/W single bars in 3×5.
- Accessible name = the clipped grid, on purpose; housing sizing fixed
  after #200/#203 (`fit-content` resolves cyclically).
- `matrixWidth`/`matrixHeight` naming; LaMetric is not a preset (no
  framebuffer in).

### Revision 3 — the owner's six questions

- **Q1 props:** grouped into is / draws / paints / arrives / naming;
  `LedMatrixDisplayProps extends LedLayoutOptions`; the rule for where a
  prop goes; `preset` stays a preset, `size` stays the shared scale, props
  stay flat.
- **Q2 tint vs force:** forcing is hardware (`monochrome` in the frame,
  `frameToBits` as the adapter rule, presets `max7219`/`p10_32x16`,
  `LED_MONO_COLORS`); tinting is preview-only and deferred; Scroll pHAT HD is
  the in-between case.
- **Q3 colour text and sets:** `{red:HOT}` spans with nesting and hex;
  `{red}…{/red}` not reused (would change existing messages); lowercase via
  `letterCase: "mixed"` with HD44780 / Tom-Thumb faces; icons as cells with
  tile/char/blank fallbacks (fourteen at the time); AWTRIX fragment arrays as
  the adapter target; the 8×8 pixel layer deferred.
- **Q4 transition:** pure `planLedTransition`, `frameAt(durationMs)` byte
  for byte the static render, six kinds, retarget from `layoutAt(now)`,
  reduced motion snaps with no opt-out (#180), `announceUpdates` live
  region (#206). The first flip walked a drum in Vestaboard's order — later
  replaced (revision 7).
- **Q5 what only FiestaBoard can do:** the flap cascade on LEDs; one
  message on every board (`OnePluginEveryBoard`); icons that degrade to the
  colour language; colour-tile art as mosaics; the honest small-matrix
  comparison. Proposed: loading drum, per-board page scheduling, scrolling
  as a transition, editor nodes.
- Research notes with sources (section 2).

### Revision 4 — first review

1. **Parser parity (must-fix):** the extended grammar gated behind
   `extendedMarkup`, default off; the claim that Python "renders fallback
   text" corrected; `StaticBoardDisplay` takes the flag for captioned
   future-state stories.
2. 3×5 `sun` (was `+`) and `y` (read as `4`) redrawn; 5×7 weather and
   transit icons redrawn; checked at 1× without glow.
3. 3×5 `N` and `°` documented (no diagonal in three columns; a 3-wide ring
   reads as a caret).
4. DPR query registered once; transition frames repaint through the same
   closure.
5. Retargeting takes the on-screen frame (`fromFrame`) so fades and slides
   continue from the blend.
6. Icons named in `LedLayout.text`.
7. Tests spy on `planLedTransition` (plan once, sample each tick, stop at
   settle, cancel on unmount, retarget mid-flight).
8. Monochrome story fits its eight cells. 9. Perf claim reworded as JS time
   per rAF. 10. `size` takes px; `pixelPitch` folded in. 11. `flip` and
   `cascade` both snap a colour-only change. 12. `MIN_CASCADE_SLOT_MS`. 13. `paintHalfFlap` into a glyph-box scratch. 14. `tokensEqual` documents
   ignoring colour. 15. Live region re-arms on toggle; announces on arrival,
   not on settle.

### Revision 5 — owner decisions, sets, taxonomy, Pixoo first

1. **Overflow: clip** (scrolling deferred). 2. **`{red:HOT}` supported,
   including `{black:TEXT}`.** 3. **Block colour `{fg/bg:TEXT}`**: inverse
   on mono, gutters join within a run, `frameToBits` equality tested, flap
   degradation behind the gate. 4. **Flip by device capability** with
   researched frame rates (Pixoo sequence ≤ 32 frames, AWTRIX unmeasured,
   WLED/HUB75/Tronbyt/MAX7219 figures and sources); `halfFlap` so a coarse
   preview matches the sequence. 5. **Character sets first-class** with
   lineage, queries, `validateMessage`, `CharacterSetSpecimen`; editor
   pickers take `charset`; the four-step app plan. 6. **Device taxonomy**
   technology → family → model with `legacy` mapping; `BoardPreviewEntry`
   adoption shape decided and deferred. 7. **Pixoo 64 first** with its
   constraints; `Pixoo64Featured` leads the report; `tronbyt` preset added.
   `OneMessageEveryCharset` story.

### Revision 6 — second review, budgets, menu, glyph

- **A.** AWTRIX stays on snap, marked UNMEASURED. **B.** Stacked block rows
  join only same-colour neighbours (1-px gutter cannot be split; an unlit
  line between colours is the split-flap reading). **C.** No bolder face for
  block text; the bloom was the problem — built from glyph and tile pixels
  only (`ledBackgroundMask`). **D.** Frame budgets are hard (`maxFrames`
  inclusive; compressed, never cut; `frameCount` and `ledTransitionFrames`
  exact; sequence players judged by budget, not fps). Pixoo risk stated
  plainly with three mitigations for the owner.
- Review fixes 1–18: half-flap rasterises the cell background (pills no
  longer strobe); capability tests not rate tests; picker key handling
  scoped to the swatch grid; text colours and icons as button groups;
  bloom mask; `charsetFallback` carries colours through icon fallbacks;
  lowercase heading; black offered as a text colour; manufacturer-qualified
  model ids with `legacy.preset`, family = protocol, "Tidbyt / Tronbyt";
  `character-sets.json` fixture; specimen a11y and stable keys; renderer
  plumbing `@internal`; `extendedMarkup` on every split-flap renderer;
  `CharacterSet.font` replaces `characterSetForFont`; Flagship
  `charsetByCode62` with `characterSetForModel` the only correct lookup;
  tile inside a mono block draws inverse; serialiser emits spans only when
  supported.
- **`CharacterGlyph`** introduced (replaces words in the pickers, builds the
  specimen). **Transitions as a menu** with "None" first-class, derived
  coarse flip, `transitionsForModel` with reasons, `resolveLedTransition`
  precedence explicit > default with fallback provenance,
  `LedTransitionPicker`; setting placement per board / page / plugin
  request. GIFs `block-flip` and `pixoo-flip`.

### Revision 7 — FiestaBoard's own flip, open data, last fixes

- **Owner:** the flip must not copy Vestaboard's character order → seeded
  scramble from the device's own set (`hash32` + mulberry32, `scrambleSteps`,
  `stagger`, budget shortens stagger then scramble, half-flap and block
  fields kept); `LED_DRUM`, drum distance and the 72-flap wrap removed;
  `BoardDisplay` untouched.
- **Must-fix:** integer budgeted frame indexing with `frameAtIndex`, tested
  at 777 ms into 3…32 frames for every kind; `characterGlyphToken("black")`
  explicit lookup; curated named exports in `src/index.ts`.
- **Should:** explicit specs respect device degradation; unavailable cards
  `aria-disabled` and refuse selection; `CharacterGlyph.height` with
  legible picker glyphs; `{black:TEXT}` kept and drawn visibly as "Black
  (unlit on LEDs)"; card bodies flex with `mt-auto` previews; the duplicate
  default-transition API removed from `devices.ts`; Pixoo previews scaled
  not cropped; spec hygiene (vertical-gutter and `{black:TEXT}` questions
  resolved). Nice: code-62 button via `CharacterGlyph`, `TILE_BASE_HEIGHT`,
  shared preview clock.
- **Decisions:** Pixoo 32-frame budget; adapter push counter (reboot or
  single frames before ~250 pushes) plus animate-on-change, to be confirmed
  in a hardware spike.
- **Addendum 1 (output plugins):** open JSON `DeviceModel` / `CharacterSet`,
  every API accepts objects, `validateDeviceModel` / `validateCharacterSet`,
  `extends` materialisation, JSON Schemas, unknown ids fail loudly,
  `devices.py:201` flagged, the 48×12 amber sign tested end to end.
- **Addendum 2 (Python port):** Pixoo default 3×5 (10 × 16 clears the 3 × 15
  floor); fonts, icons, sets, models and schemas exported as fixtures with
  drift tests; golden layout and transition fixtures with a generator;
  `storm`/`x` aliases, `fog`/`partly` icons (sixteen), `{icon:heart}` = ♥;
  legacy `{sun}` ASCII vs `{icon:sun}` tile recorded as open; snow → violet
  confirmed intentional.
- Consolidation into this document; `Pixoo64Budget` story flips real pages;
  the fixture generator writes prettier-formatted JSON.
