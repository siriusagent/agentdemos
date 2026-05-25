# bugfix.md

## 2026-05-24 — Missing bootstrap docs after receipt renderer recovery

- **Issue:** The project directory had no bootstrap documentation files, so repo rules, validation steps, architecture, and recent failure modes were not durable.
- **Impact:** Future work could repeat known mistakes: stale browser cache, accidental debug scripts, unverified visual claims, and undocumented renderer/physics tradeoffs.
- **Root cause:** The prototype evolved quickly from single-file/demo work into a modular WebGL/XPBD app without the standard documentation scaffold being added.
- **Fix:** Added the standard docs: `AGENTS.md`, `README.md`, `plan.md`, `EXPERIMENTS.md`, `changelog.md`, and `bugfix.md`.
- **Verification:** Confirmed the docs were absent before creation, inspected current source structure, ran `node --check js/*.js`, and documented the expected browser validation flow.

## Prior known renderer failure context

- **Issue:** A prior WebGL renderer attempt left the page with the stage and controls visible but no receipt mesh.
- **Root causes found during recovery:** Invalid escaped template literals in `js/renderer.js`, stale module cache risk, and incomplete WebGL texture/sampler setup.
- **Fix direction:** Keep cache-busting imports current, bind the texture/sampler explicitly, use valid template literals for shadow filters, and verify in the browser rather than relying on static inspection.
- **Verification target:** Browser shows a visible, upright/readable receipt and an updating FPS badge.
