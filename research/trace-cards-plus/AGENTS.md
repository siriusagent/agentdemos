# AGENTS.md

## Project charter
This directory contains a self-contained browser research demo for layered 3D trace-card sculptures. The goal is a polished, high-aesthetic WebGL artifact that clones the core appeal of the reference and exceeds it with broader pattern vocabulary, better interaction, and stronger presentation.

## Current live artifact
- Entry point: `index.html`
- JavaScript modules:
  - `src/main.js` — scene bootstrap, cards/trails, post FX, interaction, animation loop
  - `src/config.js` — live state, presets, schema, URL state packing
  - `src/sculptures.js` — procedural pattern definitions and orbit paths
  - `src/panel.js` — control-panel UI generation and binding

## Non-negotiable constraints
- Keep the demo simple to run: plain static files over a basic HTTP server.
- Keep the current modular ES-module structure; do not collapse to a monolith.
- Avoid npm, bundlers, or a framework rewrite unless explicitly requested.
- Prefer current live browser verification over assumptions or stale screenshots.
- Treat browser caching as real; use cache-busting query strings when validating module changes.
- Do not leave experimental junk, extra debug pages, or temporary scripts in the handoff tree.

## Design guardrails
- Preserve the premium dark-lab visual language.
- Prioritize a strong hero composition, not just feature count.
- New patterns should feel visually distinct, not like parameter-noise variants.
- Keep controls polished and dense, but readable.
- Any visual claim about composition, balance, or responsiveness should be checked live in the browser.

## Documentation protocol
Update docs in the same pass as meaningful changes:
- `README.md` — run instructions, architecture, validation, artifact orientation
- `plan.md` — current state, priorities, acceptance criteria
- `EXPERIMENTS.md` — visual experiments, findings, and rejected directions
- `changelog.md` — dated project changes
- `AGENTS.md` — project operating rules when workflow or architecture changes

## Verification checklist before claiming success
1. Confirm the working tree location and files are the intended research subdir.
2. Serve locally with `python3 -m http.server <port>` from this directory.
3. Open with a fresh cache-busting URL.
4. Confirm the canvas is rendering actual animated geometry.
5. Confirm the control panel, presets, and toolbar actions are reachable.
6. Check for stray temp files or accidental non-demo artifacts before handoff.
