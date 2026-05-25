# plan.md

## Goal
Maintain a polished, smooth, zero-dependency interactive 3D hanging receipt demo with believable paper motion and readable procedural receipt rendering.

## Current state
- Modular app exists in `index.html`, `style.css`, and `js/*.js`.
- Mesh resolution is currently `22 × 48` via `js/config.js`.
- Renderer uses layered canvases:
  - shadow Canvas 2D layer
  - WebGL textured mesh layer
  - top Canvas 2D interaction layer
- Physics uses XPBD-style distance constraints, bending memory, self-collision, pinned top row, and pointer grabbing.
- Recent repair restored visible WebGL receipt rendering after the prior session left the page effectively blank.
- Diagnostics mode is available behind `?debug=1`; normal runtime remains clean.
- Shadow experiment flags are available via `?shadow=off|low|medium|high`, with default `high` preserving the prior look.
- Grab physics now smooths pointer targets, clamps/reduces impulse, uses a wider cubic falloff, and damps local chatter around the grabbed region.
- The normal UI now includes a compact skeuomorphic `Receipt Lab` panel with material presets, shadow controls, reset behavior, and a live readout.
- Material presets are live via `?material=receipt|thin|crisp|creased|heavy` or the panel buttons; shadow controls still support `?shadow=off|low|medium|high`.
- Self-contact now has material-specific collision radius, stiffness, and contact damping, with diagnostics reporting contact pairs/passes behind `?debug=1`.
- Important caveat: default contact remains particle/vertex-neighborhood self-contact; `?surface=vt` and `?surface=full` are experimental surface-collision modes. `full` adds vertex-triangle, edge-edge, swept broadphase candidate bounds, and lightweight contact persistence, but it is still not a production-grade continuous collision solver.
- Full-mode persistence is now explicitly policy-driven rather than hidden behind a single hard-coded cap. The current experimental policy adds pressure instrumentation, starts pressure response before saturation, and records candidate/contact/cache churn metrics so future tuning can distinguish broadphase pressure from accepted-contact or cache-eviction pressure.

## Immediate priorities
1. Keep the WebGL renderer stable and documented.
2. Preserve smooth FPS while improving visual fidelity incrementally.
3. Remove/avoid transient debug files and catch-all overlays.
4. Improve drag stability without hiding physics behind pure visual hacks.
5. Keep bootstrap docs current after each meaningful change.

## Acceptance criteria
- `node --check js/*.js` passes.
- Served page loads from a local static HTTP server.
- Browser shows a visible, upright, readable receipt.
- FPS badge updates and remains near real-time on target hardware.
- Pointer drag works from the rendered mesh.
- No stale debug artifacts (`catch_errors.js`, temporary WebGL test files, profiler overlays) are part of normal runtime unless documented.

## Known risks
- Browser module cache can mask changes; bump query strings when editing modules.
- Canvas `clip()`/`drawImage()` per triangle is too slow for the full mesh.
- Dynamic blur filters can affect frame time and should be validated live.
- Self-collision and bending settings can quickly destabilize or over-stiffen the paper; current contact is still particle-based and can still tunnel between vertices under aggressive folds. True paper impenetrability requires vertex-triangle and edge-edge collision, preferably with substepping or continuous checks for fast motion.

## Next good work items
- The follow-up stressed full-mode log showed the new persistence policy stopped the old `persistedContacts=240` blind saturation pattern; peak persisted contacts were `136`, while candidate pressure still spiked to roughly `42k` VT and `77k` EE candidates. The next tuning target should therefore be broadphase/query selectivity first, not more blind cache-cap retuning.
- Manually feel-test the stronger particle self-contact pass across all five material presets; tune collision stiffness/damping if Heavy feels too rigid or Thin still ghosts too much.
- Add one or two compact physical faders for continuous `crease` and `flutter` control if preset-only interaction feels too coarse.
- Use `?debug=1&shadow=off|low|medium|high` plus material presets to record a short baseline table for shadow/material cost.
- Keep adding a reproducible browser smoke-test note in `EXPERIMENTS.md` after each rendering/physics change.
