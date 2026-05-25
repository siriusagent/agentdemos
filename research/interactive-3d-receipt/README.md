# Interactive 3D Hanging Receipt

A zero-dependency browser demo of a realistic hanging paper receipt with procedural receipt texture, draggable cloth-like behavior, a pinned top edge, front/back rendering, soft shadowing, and a light-direction control.

## Run locally

From this directory:

```bash
python3 -m http.server 8024
```

Then open:

```text
http://127.0.0.1:8024/index.html?v=local
```

Use a changed query string when testing module changes to avoid browser cache confusion.

## Current stack

- Plain HTML/CSS/JavaScript
- ES modules
- Canvas 2D for UI/shadow layers
- WebGL for the textured receipt mesh
- Procedural canvas-generated receipt textures
- XPBD-style mesh physics in `js/physics.js`

No npm, bundler, framework, external library, or build step is required.

## File map

- `index.html` — stage markup and module entry
- `style.css` — full-screen stage, controls, and presentation
- `js/config.js` — simulation constants (`22 × 48` mesh, gravity, damping, texture size, DPR clamp)
- `js/main.js` — startup, cache-busted imports, pointer interaction, render loop, FPS badge
- `js/physics.js` — mesh initialization, constraints, grab behavior, self-collision, integration
- `js/renderer.js` — layered Canvas/WebGL renderer and projection/unprojection helpers
- `js/texture.js` — procedural front/back receipt artwork
- `js/ui.js` — light-direction knob wiring
- `js/math.js` — vector math helpers

## Validation

Recommended quick checks:

```bash
node --check js/*.js
python3 -m http.server 8024
```

Browser acceptance criteria:

- Receipt is visible and upright/readable.
- FPS badge updates and remains smooth on the target machine.
- Dragging the receipt moves the mesh without catastrophic stretching/crumpling.
- Light direction knob changes shading.
- No debug overlays or accidental test scripts are visible.

## GitHub Pages deploy

This demo is configured to publish from the repository subdirectory via GitHub Actions:

- Workflow: `.github/workflows/interactive-3d-receipt-pages.yml`
- Publish source: `research/interactive-3d-receipt/`

After the workflow is pushed to GitHub, enable **Settings → Pages → Source: GitHub Actions** for the repository if it is not already enabled. Each push to `main` that changes this demo will publish an updated static site artifact.

Expected public URL pattern:

```text
https://siriusagent.github.io/agentdemos/research/interactive-3d-receipt/
```

If the repository uses a different Pages configuration or custom domain, the final URL will differ accordingly.
