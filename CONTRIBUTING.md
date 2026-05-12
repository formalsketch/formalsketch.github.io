# Contributing

Thanks for taking the time to contribute! This project is a small, dependency-free fork of [evanw/fsm](https://github.com/evanw/fsm). Keep changes focused and the runtime footprint small.

## Requirements

- **Node.js 18+** (only for the build script; the shipped app is plain ES5 browser JS)
- **Python 3.7+** is supported as an alternative builder
- A modern browser to test against (Chrome, Firefox, Safari)

There are no runtime dependencies, and `package.json` only declares `prettier` as a dev dependency.

## Project layout

```
src/                Hand-written source, concatenated into www/fsm.js
  _license.js
  elements/         Node, Link, SelfLink, StartLink, TemporaryLink
  export_as/        SVG and LaTeX exporters
  main/             fsm, save, history, theme, workspace, io, ui, math
www/                What gets deployed to GitHub Pages
  index.html        Loads fsm.js
  fsm.js            Build output (gitignored)
build.js            Node builder
build.py            Python 3 builder (functionally identical)
```

Files in `src/` are concatenated in deterministic (sorted, forward-slash) order. There are no ES modules, no bundler, no transpiler.

## Build

```bash
node build.js            # one-shot build to www/fsm.js
node build.js --watch    # rebuild on source changes
npm run build            # same as `node build.js`
npm run watch            # same as `node build.js --watch`
python build.py          # alternative builder; same output bytes
```

Open `www/index.html` directly in a browser, or serve `www/` with any static server.

## Contribution flow

1. Fork and create a branch off `main`.
2. Make your change in `src/`. Do not edit `www/fsm.js` directly — it is regenerated.
3. Run `node build.js` and reload `www/index.html`. Verify in the browser that the four core gestures still work:
   - **Double-click** the canvas to add a state
   - **Shift-drag** to add an arrow
   - **Drag** to move
   - **Delete** key to remove the selected object
4. Run `npm run format` to apply Prettier (tabs, single quotes).
5. Run `npm run lint` (a Prettier `--check` pass) before pushing.
6. Open a pull request describing the change and the manual test you ran.

## Style

Prettier config lives in `.prettierrc`: tabs for indentation, single quotes, otherwise defaults. The shipped JS must stay browser-compatible ES5 — no `let`/`const`/arrow functions in `src/` outside the build scripts.

## Reporting bugs

File an issue with: browser + OS, steps to reproduce, expected vs. actual, and a screenshot if it is a rendering issue.
