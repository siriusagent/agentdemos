# AGENTS.md

## Project charter
This repo contains a zero-dependency browser prototype of a realistic interactive 3D hanging receipt. The demo is a modular HTML/CSS/JavaScript app using Canvas, WebGL, and a local XPBD-style cloth/receipt physics simulation.

## Current live artifact
- Entry point: `index.html`
- Styling: `style.css`
- JavaScript modules:
  - `js/main.js` — app bootstrap, pointer input, animation loop, FPS badge
  - `js/config.js` — mesh, physics, texture, and DPR constants
  - `js/physics.js` — XPBD-style mesh constraints, pinned top row, grabbing, self-collision, bending memory
  - `js/renderer.js` — layered renderer: shadow canvas, WebGL textured mesh, top interaction canvas
  - `js/texture.js` — procedural front/back receipt texture canvases
  - `js/ui.js` — light direction knob
  - `js/math.js` — vector helpers

## Non-negotiable constraints
- Keep the project zero-dependency: no React, npm build step, bundler, imported libraries, or framework rewrite.
- Preserve ES module separation; do not collapse this back into a single-file monolith.
- Keep `index.html` loadable from a simple static HTTP server.
- Prefer current live files and browser state over stale screenshots, stale attachment IDs, or memory.
- Treat browser/module caching as a real issue; bump cache-busting query strings when JS module behavior changes.
- Do not add debug overlays, catch-all error scripts, or test pages without removing them before handoff unless they are deliberately documented.

## Performance guardrails
- The target is smooth real-time interaction, not offline-perfect cloth simulation.
- Avoid 2D Canvas per-triangle `clip()` + `drawImage()` in the main frame path; it was a major FPS killer.
- Avoid expensive dynamic full-canvas blur filters unless validated against live FPS.
- WebGL texture rendering is the current performance path for the receipt mesh.
- Validate with actual browser state and the visible FPS badge after renderer or physics changes.

## Physics guardrails
- Preserve a pinned top row and draggable nearest-particle interaction.
- Keep structural/shear/bending constraints explicit and readable.
- Do not replace physics with purely visual fakes unless the tradeoff is documented in `plan.md` and `EXPERIMENTS.md`.
- Any change that affects stability, stretching, collision, or grabbing must be checked in the live browser.

## Documentation protocol
Update bootstrap docs in the same pass as meaningful changes:
- `README.md` — user/developer orientation and how to run
- `plan.md` — current state, priorities, acceptance criteria
- `EXPERIMENTS.md` — experiments, measurements, decisions
- `changelog.md` — user-visible/project changes by date
- `bugfix.md` — defects, root causes, fixes, verification
- `AGENTS.md` — repo operating rules when workflow or architecture changes

## Verification checklist before claiming success
1. Confirm repo root, branch, and working tree state.
2. Run JavaScript syntax checks where possible: `node --check js/*.js`.
3. Serve locally with `python3 -m http.server <port>` from this directory.
4. Open the page with a fresh cache-busting URL.
5. Verify the receipt is visible, upright/readable, interactive, and showing a reasonable FPS badge.
6. Check for leftover debug files/scripts and remove them unless intentionally documented.
