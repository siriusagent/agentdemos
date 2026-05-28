# Trace Cards+

A zero-dependency static WebGL research demo inspired by the visual language of Whitespace's trace-cards experiment, then extended into a broader trace-sculpture playground.

## What it is

`Trace Cards+` renders stacked translucent 3D cards with:

- static skeleton wireframes embedded through the stack
- animated traced orbit paths across each card layer
- bloom, vignette, and film-grain post effects
- pointer tilt and orbit camera controls
- presets, randomization, snapshots, and shareable URL state
- optional microphone-driven audio reactivity

It is intentionally self-contained and runs from a simple static HTTP server with no build step.

## Run locally

From this directory:

```bash
python3 -m http.server 8777
```

Then open:

```text
http://127.0.0.1:8777/index.html?v=local
```

Change the query string when testing JS edits to avoid browser cache confusion.

## Current stack

- Plain HTML/CSS/JavaScript
- ES modules
- Three.js via import map CDN
- WebGL rendering
- Three.js postprocessing passes for bloom + final film pass
- No npm, bundler, framework, or local build tool

## File map

- `index.html` — stage markup, visual shell, controls host, import map, module entry
- `src/config.js` — live state, control schema, presets, URL encode/decode
- `src/sculptures.js` — trace-sculpture generators (`Pyramid`, `Diamond`, `Helix`, `Torus`, `Lissajous`, `Galaxy`)
- `src/panel.js` — dynamic control-panel builder and bindings
- `src/main.js` — scene setup, cards/trails, post FX, interaction, animation loop

## Validation

Recommended quick checks:

```bash
python3 -m http.server 8777
node --input-type=module -e "import('./src/sculptures.js').then(m=>console.log(Object.keys(m.Sculptures)))"
```

Browser acceptance criteria:

- Page loads from a static server with no visible runtime failure.
- The scene renders animated wireframe/card geometry, not a blank canvas.
- The control panel is visible and interactive.
- Presets and Randomize change the scene.
- FPS updates live in the HUD.
- Snapshot and share-link controls remain available.

## Current visual direction

The baseline scene is a dark neon trace-sculpture composition with a premium control panel on the right. Relative to the reference inspiration, this version exceeds it by broadening the pattern vocabulary and adding a richer interaction/FX surface.

Current patterns:

- `Pyramid`
- `Diamond`
- `Helix`
- `Torus`
- `Lissajous`
- `Galaxy`

## Notes

- This is a research/demo artifact, not a packaged app.
- Audio reactivity requires microphone permission and gracefully disables itself if permission is denied.
- Browser module caching is real; bump query strings when validating edits.
