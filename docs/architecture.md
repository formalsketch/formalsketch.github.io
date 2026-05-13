# Architecture

A one-page tour of how the code is organized. The full app is a single bundle (`fsm.js`) built by concatenating files in `src/` in sorted order. There are no modules and no bundler; cross-file references go through globals.

## Module boundaries

```
src/_license.js                 MIT header prepended to the bundle

src/elements/
  node.js                       circle, label, accept ring, hit-testing
  link.js                       state-to-state arrow with bezier curve
  self_link.js                  loop on a single state
  start_link.js                 entry arrow ending at a state
  temporary_link.js             ghost link drawn while shift-dragging

src/export_as/
  svg.js                        ExportAsSVG; quacks like a 2D context
  latex.js                      ExportAsLaTeX; emits TikZ code

src/main/
  fsm.js                        canvas events, the global nodes / links
                                arrays, draw(), drawUsing(), keyboard
                                shortcuts, touch handlers
  math.js                       small geometry helpers (circle-arc math)
  save.js                       JSON serialize / deserialize, snapshot
                                JSON for history, FSM JSON envelope,
                                workspace backup, FSM summarizer
  history.js                    snapshot-based undo / redo stack
  theme.js                      light / dark / system theme manager
  workspace.js                  multi-FSM workspace + localStorage layout
  io.js                         toast, clipboard, blob & data-URL helpers
  ui.js                         everything DOM: sidebar, toolbar, modals,
                                panels; the binding glue
  simulate.js                   NFA simulation with epsilon-closure
  lint.js                       diagram-level checks
  share.js                      base64-url encode of snapshot JSON;
                                hash decode on load
  regex_to_nfa.js               recursive-descent parser + Thompson
  nfa_to_dfa.js                 subset construction with subset hashing
  minimize.js                   partition refinement
  layout.js                     Sugiyama-style layered placement
  nl.js                         natural-language helpers
  examples.js                   six pre-built demo FSMs
```

## The dual-canvas-context trick

The drawing code is written once. `drawUsing(c)` takes anything that exposes the subset of the canvas 2D context the elements actually use: `beginPath`, `moveTo`, `lineTo`, `arc`, `stroke`, `fill`, `fillStyle`, `strokeStyle`, `lineWidth`, `measureText`, `font`, `save`, `restore`, `translate`, `clearRect`, plus the custom `advancedFillText` for export targets.

- Screen render: `drawUsing(canvas.getContext('2d'))`. The browser handles vector primitives.
- SVG export: `drawUsing(new ExportAsSVG())`. The exporter records every call as SVG `<path>` / `<text>` markup and `toSVG()` emits the document.
- LaTeX export: `drawUsing(new ExportAsLaTeX())`. The exporter accumulates TikZ `\draw` commands and `toLaTeX(mode)` wraps them.

There is no abstraction layer: the exporters define methods with the same names and signatures the canvas provides. This is why every node and link only references `c.beginPath`, `c.arc`, etc., and never branches on "are we exporting?". Adding a new export format means writing a new exporter that implements the same surface.

## Globals and load order

`build.js` walks `src/` and concatenates files sorted by forward-slash relative path. `var` declarations at the top of each file become script-global properties, so any file can call into any other. The bundle is loaded once from `<script src="fsm.js">` at the top of `<head>`; the `window.onload` handler in `fsm.js` does the bootstrap:

1. `Theme.init()` applies the saved theme.
2. `Workspace.init()` migrates the legacy single-FSM key into the v2 multi-FSM layout if needed.
3. `restoreBackup()` deserializes the active FSM into the global `nodes` / `links` arrays.
4. `maybeLoadFromHash()` offers to replace the workspace if the URL has a share hash.
5. `History.reset(snapshotJSON())` seeds the undo stack with the loaded state.
6. `wireUI()` (in `ui.js`) binds every toolbar button, modal, and side panel.
7. `draw()` paints.

All algorithm modules (`regex_to_nfa`, `nfa_to_dfa`, `minimize`, `simulate`, `lint`) operate on FSM JSON, never on the live arrays. Their callers in `ui.js` use `applyFSMJsonAsNew(json)` to load the result into a fresh workspace entry through the same path as Import, so undo / redo and persistence all flow through one code path.

## Build

`build.js` is the source of truth; `build.py` is kept for Python-only setups and produces byte-identical output. Both walk `src/`, sort, normalize CRLF to LF, concatenate with `\n`, and write `fsm.js` at the repo root.

The deployed site is whatever ends up in the repo root: `index.html`, `fsm.js`, `.nojekyll`, and the `docs/` folder. GitHub Pages serves directly from `main`; the `Deploy to GitHub Pages` workflow is configured for the alternative "GitHub Actions" Pages source and stages a curated `_site/` if you ever flip the setting.

## Tests

Smoke tests live in `tests/` and run under Node by `eval`ing the built bundle with minimal browser globals stubbed. They cover the pure-logic modules: regex / Thompson, subset construction, minimization, simulation, lint, share encode/decode, JSON import validation, LaTeX escaping, model JSON parsing. There are two HTML harnesses: `tests/latex_escape.html` (manual visual confirmation) and `tests/a11y.html` (axe-core in an iframe).

The deploy workflow runs `node --check fsm.js` as a sanity gate; it does not run the smoke tests, because that's easy to add later and our changes are mostly additive over a known-good baseline.
