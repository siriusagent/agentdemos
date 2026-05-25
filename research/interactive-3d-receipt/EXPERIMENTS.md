# EXPERIMENTS.md

## 2026-05-24 — Bootstrap docs after WebGL renderer recovery

### Objective
Create the missing repo bootstrap documentation and record the current architecture, validation workflow, and known renderer/physics constraints.

### Current observed state
- Project directory: `research/interactive-3d-receipt`
- Git branch: `main`
- Demo files are modular HTML/CSS/JS, not a single-file page.
- Runtime is intended to be served by a simple static HTTP server.

### Architecture notes
- `js/renderer.js` uses a layered rendering model:
  - background 2D canvas for shadows
  - WebGL canvas for textured receipt mesh
  - foreground 2D canvas for interaction indicator and pointer events
- `js/physics.js` uses XPBD-style distance constraints with a pinned top row, bending memory, and self-collision.
- `js/texture.js` procedurally generates front/back thermal receipt textures.

### Validation performed before docs
- Verified the expected bootstrap docs were missing: `AGENTS.md`, `README.md`, `plan.md`, `EXPERIMENTS.md`, `changelog.md`, `bugfix.md`.
- Inspected current source file structure and key runtime constants.
- Ran JavaScript syntax validation with `node --check js/*.js` after writing docs.
- Prior browser recovery in this pass showed the receipt visible and the FPS badge reaching roughly 60 FPS after renderer syntax/cache issues were fixed.

### Decision
Bootstrap docs are required so future work does not repeat the trainwreck pattern: undocumented debug files, stale cache assumptions, and visual claims without live browser verification.

## 2026-05-25 — URL-gated diagnostics and shadow measurement flags

### Objective
Extend the experiment harness before changing fragile physics or material behavior. The goal was to make frame cost measurable while keeping the normal receipt demo clean and unchanged.

### Changed files
- `style.css`
  - Added `.debug-panel` styles for a non-interactive diagnostics overlay.
  - Overlay uses `pointer-events: none` so it cannot block receipt dragging or the Light Dir knob.
- `js/main.js`
  - Added URL parsing for `?debug=1` and `?shadow=`.
  - Creates the diagnostics panel only when `debug=1` is present.
  - Measures and reports FPS, frame time, physics time, render time, `dt`, mesh size, triangle count, constraint count, iteration count, grab state, light angle, active shadow mode, and DPR.
  - Removed the old commented red profiler block.
  - Bumped the `renderer.js` module import cache string to `?v=6`.
- `js/renderer.js`
  - Added `setShadowQuality('off'|'low'|'medium'|'high')`.
  - Gated the existing shadow path so `?shadow=off` skips shadows, `low` uses a cheaper contact-only shadow, `medium` uses reduced blur, and default `high` preserves the prior look.

### URL flags
- Normal/default: `http://127.0.0.1:8024/index.html`
- Diagnostics only: `http://127.0.0.1:8024/index.html?debug=1`
- Shadow measurements:
  - `?debug=1&shadow=off`
  - `?debug=1&shadow=low`
  - `?debug=1&shadow=medium`
  - `?debug=1&shadow=high`

### Validation
- Ran `node --check js/*.js` successfully.
- Confirmed server on port `8024` and HTTP `200` responses for:
  - `/`
  - `/index.html`
  - `/js/main.js?v=7`
  - `/js/renderer.js?v=6`
- Browser normal URL check:
  - `http://127.0.0.1:8024/index.html?run=validate1`
  - No debug panel present.
  - Three layered canvases present.
  - FPS badge updated to about `60 FPS`.
  - Light Dir knob center hit-tested to `#knobDial`.
- Browser debug/shadow-low check:
  - `http://127.0.0.1:8024/index.html?debug=1&shadow=low&run=validate2`
  - Diagnostics panel appeared and reported `mesh 22×48`, `tris 1,974`, `constraints 7,868`, `iterations 10`, `light 315°`, `shadow low`, and live timing values.
  - Debug panel computed `pointer-events: none`.
  - Reachability probe confirmed the Light Dir knob was reachable at `5/5` sampled points.
- Browser shadow-off check:
  - `http://127.0.0.1:8024/index.html?debug=1&shadow=off&run=validate3`
  - Diagnostics panel reported `shadow off` and the FPS badge continued updating.

### Observations
- Normal runtime remains visually clean; diagnostics are URL-gated.
- The first measurement pass showed near-real-time behavior, with normal URL around `60 FPS`; debug shadow-low/off runs continued to update around real-time, though visible FPS fluctuated during browser-tool observation.
- Physics timing remains the dominant reported cost in the debug overlay on this pass; render timing was near zero in sampled browser eval output, likely because the WebGL draw path is cheap relative to XPBD constraints and browser timing granularity.

### Decision / next recommendation
Use this harness before the next physics changes. The next best experiment is grab physics refinement: tune grab falloff, release impulse, and local damping while recording before/after debug readings and confirming the Light Dir control remains reachable.

## 2026-05-25 — Grab physics refinement

### Objective
Make pointer dragging feel more like light paper and less like elastic rubber by reducing snap, spreading drag energy through a smoother local field, and damping chatter near the grabbed particle without hiding the XPBD simulation behind a pure visual hack.

### Changed files
- `js/physics.js`
  - Added `grab.smoothedTarget` to smooth pointer targets in world space.
  - Reduced direct grabbed-particle pull from `0.62` to `0.48`.
  - Reduced and clamped drag impulse injection.
  - Reduced release impulse from `0.6` to `0.34` to prevent rubber-band snap after pointer release.
  - Widened grab influence radius from `1.5` to `2.15` and changed the falloff from quadratic to cubic for a softer edge.
  - Reduced torsion/lift/in-plane pull and added local velocity damping around the grabbed region.
- `js/main.js`
  - Bumped `physics.js` module import cache string to `?v=6`.

### Validation
- Committed the previous diagnostics harness first: `abba4e3` (`Add receipt diagnostics experiment harness`).
- Ran `node --check js/*.js` successfully after the grab refinement.
- Confirmed HTTP `200` responses from port `8024` for:
  - `/index.html?debug=1&shadow=low&grabtest=1`
  - `/js/main.js?v=7`
  - `/js/physics.js?v=6`
- Browser debug grab test:
  - `http://127.0.0.1:8024/index.html?debug=1&shadow=low&grabtest=1`
  - Synthetic pointer drag updated diagnostics from `grab none` to `grab #450` during drag.
  - After release, diagnostics returned to `grab none` and the canvas class returned to clean state.
  - FPS recovered to about `60 FPS` after release.
- Browser normal URL check:
  - `http://127.0.0.1:8024/index.html?grabtest=normal`
  - No debug panel present.
  - Three canvases present.
  - FPS badge updated around `54 FPS` during observation.
  - Light Dir knob center still hit-tested to `#knobDial`.

### Observations
- The debug harness now verifies grab state directly during pointer interaction.
- The normal runtime still remains clean after the physics change.
- This pass avoided mesh/config changes; it only refines grab coupling, release impulse, and local damping.

### Decision / next recommendation
Manually feel-test drag on the rendered receipt. If it feels stable, the next experiment should record a small shadow baseline table with `?debug=1&shadow=off|low|medium|high`, then move to paper-material presets for crease memory and anisotropic stiffness.

## 2026-05-25 — Skeuomorphic receipt lab controls

### Objective
Add user-facing controls that feel like physical lab equipment rather than flat web form inputs. The panel should let users play with paper material presets, shadow quality, and reset behavior while preserving the receipt drag interaction, Light Dir knob, URL flags, and debug harness.

### External design references used
- Web research was performed before implementation rather than relying on model memory.
- Mockplus described skeuomorphic UI as using realistic textures, lights, shadows, dimensions, and real-world familiarity, while warning against clutter.
- Justinmind search results emphasized toggles, sliders, and dials as familiar physical controls that reduce learning cost.
- Speckyboy emphasized that modern CSS/JS skeuomorphism works best when realistic appearance is paired with realistic interaction, and when used in moderation.

### Changed files
- `index.html`
  - Replaced the tiny Light Dir-only panel with a compact `Receipt Lab` control panel.
  - Preserved existing `#lightKnob` and `#knobDial` IDs.
  - Added material preset buttons: `receipt`, `thin`, `crisp`, `creased`, `heavy`.
  - Added shadow buttons: `off`, `low`, `medium`, `high`.
  - Added `#resetPaper` and live `#labReadout`.
  - Bumped app script to `js/main.js?v=8`.
- `style.css`
  - Added a restrained skeuomorphic enamel/plastic lab panel with bevels, inset shadows, highlights, active red indicator dots, tactile keys, segmented shadow switch, and reset button.
- `js/physics.js`
  - Added runtime material presets and methods: `makeMaterialPreset(name)`, `applyMaterialPreset(name)`, `updateConstraintMaterials()`, and `reset(prewarmSteps)`.
  - Material presets update gravity, damping, air drag, fold memory, flutter, constraint compliances, bend memory, self-collision radius, grab pull, and release impulse.
  - Constraint objects now keep `baseCompliance` so presets can change compliance safely without losing defaults.
- `js/main.js`
  - Added optional `?material=` URL initialization.
  - Bumped `physics.js` import to `?v=7`.
  - Wires material buttons to `physics.applyMaterialPreset()`.
  - Wires shadow buttons to `renderer.setShadowQuality()`.
  - Wires reset to `physics.reset(80)`.
  - Updates `#labReadout` and active button classes.
  - Adds active material to diagnostics output.

### Controls
- Material presets:
  - `Receipt`: default behavior.
  - `Thin`: lighter, flutterier, more compliant.
  - `Crisp`: tighter/stiffer with stronger bend memory.
  - `Creased`: stronger fold memory and softer release.
  - `Heavy`: heavier, more damped, less fluttery.
- Shadow quality:
  - `Off`, `Low`, `Med`, `High` map to the existing renderer shadow modes.
- Reset:
  - Rebuilds and prewarms the mesh while preserving the active material and shadow choice.

### Validation
- Ran `node --check js/*.js` successfully.
- Confirmed server on port `8024` and HTTP `200` responses for:
  - `/index.html`
  - `/style.css`
  - `/js/main.js?v=8`
  - `/js/physics.js?v=8`
  - `/js/renderer.js?v=6`
- Browser normal URL check:
  - `http://127.0.0.1:8024/index.html?controls=final-normal`
  - No debug panel present.
  - Three canvases present.
  - FPS badge updated around `57–60 FPS` during observation.
  - Active material was `receipt`, active shadow was `high`, readout was `RECEIPT · HIGH`.
  - Ten buttons were present for materials, shadows, and reset.
- Browser control interaction check:
  - Clicking `Creased` updated active material and readout to `CREASED · HIGH`.
  - Clicking `Low` updated active shadow and readout to `CREASED · LOW`.
  - Clicking `Reset Paper` preserved `creased` and `low`, cleared canvas grab class, and continued rendering.
- Browser debug/material URL check:
  - `http://127.0.0.1:8024/index.html?debug=1&material=heavy&shadow=off&controls=debug`
  - Initialized `HEAVY · OFF` correctly.
  - Diagnostics reported `material Heavy` and `shadow off`.
  - Synthetic drag showed `grab #428` during drag and `grab none` after release.
  - Debug panel remained `pointer-events: none`.
- Light Dir reachability:
  - Center hit-test returned `#knobDial`.
  - `#lightKnob`/`#knobDial` remained in the `elementsFromPoint` stack above the canvas.

### Observations
- The new panel is visible on normal runtime by design; it is not a debug-only overlay.
- URL flags still work: `?debug=1`, `?shadow=...`, and now `?material=...`.
- Defaults preserve the previous behavior: `receipt` material and `high` shadow.
- This pass intentionally avoided a full cockpit; controls are compact and limited to material, shadow, reset, and the existing Light Dir knob.

### Decision / next recommendation
Manual feel-testing should decide whether the material presets are distinct enough. If they are, the next experiment should add one or two physical faders for continuous `crease` and `flutter` tuning, or record a measured shadow/material baseline table using the debug panel.

## 2026-05-25 — Self-contact material pass
### Hypothesis
The material presets felt aesthetic rather than physical because self-collision only ran once at the end of each physics step, used a small fixed particle radius, and had no material-specific contact stiffness or damping. Running more frequent, fresher self-contact passes should make folds feel less ghost-like while keeping the existing mesh and renderer stable.
### Changed files
- `js/physics.js`
  - Derived the base self-collision radius from mesh spacing instead of a tiny fixed `0.07` world-unit value.
  - Added per-material contact parameters: `collisionStiffness` and `contactDamping`.
  - Rebuilt the spatial hash on collision passes so constraints do not move particles away from stale hash buckets before self-contact resolution.
  - Ran self-collision on solver iterations `2`, `5`, and final iteration instead of only the final iteration.
  - Added contact-normal damping so closing folds lose some relative velocity rather than sliding through each other.
  - Added frame-local `collisionPasses` and `collisionPairs` counters.
- `js/main.js`
  - Added diagnostics row `contact pairs/passes` behind `?debug=1`.
### Material contact intent
- `Thin`: lower collision radius/stiffness/damping; still the most permissive and fluttery.
- `Receipt`: default medium contact.
- `Crisp`: stronger contact and higher collision stiffness.
- `Creased`: strong damping so folds catch and settle.
- `Heavy`: largest contact radius, strongest push-out, and highest damping.
### Validation
- Ran `node --check js/*.js` successfully.
- Browser loaded `http://127.0.0.1:8024/index.html?debug=1&material=heavy&contact=1`.
- Confirmed `Heavy` material initialized active.
- Diagnostics reported `contact 0/3` while idle, confirming three contact passes per step.
- Synthetic drag/release completed without stuck `grabbing` class.
- Observed FPS around `50–62 FPS` in debug/heavy mode on the live browser run.
### Limitations
- This remains particle self-contact, not full paper surface collision. Triangle-triangle/edge-edge collision is still needed to fully prevent sheet tunneling between vertices.
- The pass improves resistance and damping, but it cannot guarantee no interpenetration during aggressive folds.


## 2026-05-25 — Surface collision experiment design

### Objective
Move from particle self-contact toward true paper surface collision without overstating the current implementation or destabilizing the default demo. The current pass is a practical midpoint: it makes folds feel more resistant and less ghost-like, but it is still particle/vertex-neighborhood contact. It cannot guarantee that triangles will not tunnel between vertices under aggressive folds.

### Current collision truth
- Current implementation: particle-particle self-contact only.
- Broadphase: particle spatial hash keyed by world-space cell coordinates.
- Narrowphase: non-neighbor particle pairs inside a material-scaled radius receive positional push-out and contact-normal damping.
- Diagnostics currently report particle contact pairs/passes as `contact pairs/passes`.
- Not implemented yet: vertex-triangle collision, edge-edge collision, continuous collision detection, or triangle/edge contact persistence.

### Hypothesis
A minimal, gated vertex-triangle collision pass should catch the most visible paper tunneling cases better than point-radius contact alone, especially where a vertex moves through a folded triangle whose vertices are not close enough to trigger particle-particle collision.

### Proposed prototype scope
- Keep default runtime unchanged unless an explicit experimental flag enables surface contact.
- Start with vertex-triangle contact, not full triangle-triangle collision.
- Reuse the existing grid mesh topology to generate two triangles per cell.
- Skip triangles that contain the tested vertex or are topologically adjacent to that vertex.
- Use a conservative distance threshold based on mesh spacing.
- Use closest-point-on-triangle narrowphase and push the vertex away from the triangle plane/closest point when it penetrates the threshold.
- Add diagnostics counters separate from particle contact, e.g. `surface vertexTriPairs/surfacePasses`.

### Broadphase / narrowphase plan
1. Build or reuse a spatial index that can find nearby triangles from particle positions.
2. For each non-pinned vertex, query nearby triangle candidates.
3. Reject same/adjacent topology to avoid fighting normal cloth constraints.
4. Compute the closest point on the candidate triangle.
5. If the vertex is within the surface threshold and moving into the triangle, apply a small positional correction to the vertex and distribute opposite correction across the triangle vertices by inverse mass/barycentric weights.
6. Apply modest normal damping to reduce immediate re-entry.

### Metrics
- `contact`: existing particle pairs/passes.
- `surface`: vertex-triangle correction pairs/passes.
- `physics ms`: watch for unacceptable frame cost increase.
- Visual smoke test: folded receipt should remain readable, upright, draggable, and not explode or over-stiffen.

### Pass / fail criteria
Pass if the gated surface mode reduces obvious sheet-through-sheet tunneling during aggressive drag while keeping the default URL unchanged and keeping debug mode near real-time. Fail if it introduces jitter, explosive correction, stuck folds, broken grab, unreadable geometry, or a large persistent physics-time increase.

### Rollback / no-regression rule
If the prototype destabilizes the simulation, keep the documentation and metrics design but leave default behavior on particle self-contact. Do not market the receipt as having full impenetrable paper until vertex-triangle and edge-edge collision are both implemented and validated.


## 2026-05-25 — Gated vertex-triangle prototype

### Objective
Implement the first surface-collision prototype behind an explicit debug URL flag while leaving the default particle self-contact behavior unchanged.

### Changed files
- `js/physics.js`
  - Added `surfaceCollisionEnabled`, `surfaceCollisionRadius`, `surfacePasses`, and `vertexTriPairs`.
  - Added `setSurfaceCollisionEnabled()`.
  - Added topology rejection helper `areTopologicallyNear()`.
  - Added closest-point-on-triangle narrowphase helper `pointTriangleClosest()`.
  - Added `solveVertexTriangleCollision()` as a gated vertex-triangle correction pass.
  - Runs the VT pass only on the final solver collision iteration and uses coarse sampling so debug mode remains near real-time.
- `js/main.js`
  - Added `?surface=vt` URL parsing.
  - Enables the prototype only when `surface=vt`.
  - Adds debug row `surface pairs/passes`; default/debug without the flag reports `surface off`.
  - Bumped `physics.js` import to `?v=9`.

### Validation
- Ran `node --check js/*.js` successfully.
- Confirmed HTTP `200` responses on port `8024` for `/index.html`, `/js/main.js?v=8`, `/js/physics.js?v=8`, and `/style.css`.
- Browser normal URL: `http://127.0.0.1:8024/index.html?vtvalidate=normal`
  - No debug panel present.
  - Three canvases present.
  - Active material `receipt`, active shadow `high`, ten buttons present.
  - FPS badge updated to about `60 FPS`.
- Browser debug VT URL: `http://127.0.0.1:8024/index.html?debug=1&surface=vt&material=heavy&shadow=off&vtvalidate=debug2`
  - Debug panel present.
  - `material Heavy`, `shadow off`, `contact 0/3`.
  - `surface 0/1`, confirming the gated VT pass is enabled and counted separately from particle contact.
  - Sampled frame/physics timing was around `8 ms` after throttling the prototype to one coarse final pass.

### Limitations
- This is still a prototype, not full paper impenetrability.
- The pass is vertex-triangle only; edge-edge collision is not implemented.
- The broadphase is intentionally coarse/brute-force sampled for measurement and safety, not a complete production triangle spatial index.
- Aggressive folds may still tunnel, especially along edges or between sampled candidate triangles.


## 2026-05-25 — Full surface collision prototype

### Objective
Extend the prior `?surface=vt` experiment toward full surface collision by adding the missing edge-edge primitive, a real triangle/edge broadphase, swept candidate bounds for fast tunneling, and lightweight contact persistence while preserving the default particle self-contact runtime.

### Changed files
- `js/physics.js`
  - Added `surfaceCollisionMode` with modes `off`, `vt`, and `full`.
  - Added `setSurfaceCollisionMode()`.
  - Added triangle and structural-edge topology helpers.
  - Added `buildSurfaceBroadphase()` with separate triangle and edge grids.
  - Triangle/edge broadphase uses swept bounds from current and previous Verlet positions to catch fast folds that cross cells between frames.
  - Reworked vertex-triangle collision to query nearby triangles from the broadphase rather than scanning the sampled whole mesh.
  - Added `segmentSegmentClosest()` and `solveEdgeEdgeCollision()` for the new edge-edge primitive.
  - Added lightweight surface contact persistence via `surfaceContactCache`, `decaySurfaceContactCache()`, and `persistedSurfaceContacts`.
  - `full` mode uses one swept surface pass per frame; earlier two-pass brute mode measured around `80 ms` physics and was too slow.
- `js/main.js`
  - `?surface=full` enables vertex-triangle + edge-edge mode.
  - `?surface=vt` still enables vertex-triangle-only mode.
  - Debug panel now reports `surface vt/ee/passes`, `persist`, and `mode`.
  - Bumped physics import to `?v=10`.

### Validation
- Ran `node --check js/*.js` successfully.
- Served validation server on port `8025`.
- Confirmed HTTP `200` responses for `/index.html`, `/style.css`, `/js/main.js?v=10`, and `/js/physics.js?v=10`.
- Browser normal URL: `http://127.0.0.1:8025/index.html?normalsurface=1`
  - No debug panel.
  - Three canvases.
  - Ten buttons.
  - Active material `receipt`, active shadow `high`.
  - FPS badge around `55 FPS`.
- Browser full surface debug URL: `http://127.0.0.1:8025/index.html?surface=full&debug=1&material=heavy&shadow=off&fullsurface=2`
  - Debug panel present.
  - `mode full`, `material Heavy`, `shadow off`.
  - `contact 0/3`, `surface 0/0/1`, `persist 0` while idle/synthetic drag.
  - Synthetic drag showed `grab #540` during drag and `grab none` after release.
  - Sampled frame/physics around `11–12 ms` after optimizing from the rejected two-pass brute version.

### Limitations
- This is still an experimental approximation, not a production-grade continuous cloth collision solver.
- Swept bounds improve candidate discovery for fast motion, but narrowphase correction is still positional and does not solve exact time-of-impact.
- Contact persistence is lightweight age-based caching, not a full manifold solver.
- Debug sample did not produce active VT/EE contacts during the synthetic drag (`surface 0/0/1`), so manual aggressive-fold feel testing is still required.


## 2026-05-25 — Written runtime interaction logs

### Objective
Capture written logs during manual surface-collision feel testing so Sirius can inspect what happened after the user aggressively folds/drags the receipt.

### Changed files
- `js/main.js`
  - Added `?log=1` logging; `?debug=1` also enables logging.
  - Adds `createInteractionLogger()` with bounded in-memory event samples.
  - Captures `session-start`, periodic `sample`, throttled `grab-move`, `grab-start`, `grab-end`, `material-change`, `shadow-change`, `reset`, `manual-mark`, and `manual-save` events.
  - Event fields include surface mode, material, shadow, FPS/frame/physics timing, particle contact pairs/passes, vertex-triangle pairs, edge-edge pairs, surface passes, persisted contacts, and grab index.
  - Press `l` during testing to add a manual mark.
  - Press `s` during testing to download `receipt-surface-log-*.json`.
  - Bumped app import chain to `js/main.js?v=13` and `physics.js?v=13`.
- `index.html`
  - Bumped app script to `js/main.js?v=13`.
- `logs/README.md`
  - Added instructions for saving downloaded JSON logs into `logs/` for later analysis.

### Validation
- Ran `node --check js/*.js` successfully.
- Validation server on port `8025` served the log URL and cache-busted modules.
- Browser URL `?surface=full&debug=1&log=1&material=heavy&shadow=off` loaded and set `data-receipt-logger=enabled` on the document root.

### Note
The browser automation isolated-world bridge cannot directly read the page-world logger object, but the user-facing workflow does not depend on that bridge: manual testing uses keyboard `l`/`s` and the downloaded JSON file is the written artifact to inspect.


## 2026-05-25 — Surface persistence pressure instrumentation and tuning

### Objective
Revise the full surface-collision experiment so the next stressed run answers the real question: whether cost and saturation come primarily from broadphase candidate growth, accepted VT/EE contacts, cache churn, or the cache cap itself. The earlier stressed log proved the old cache saturated, but that single `persistedContacts=240` reading was a symptom, not a complete diagnosis.

### Diagnosis / blind spots addressed
- The stressed runtime log `receipt-surface-log-2026-05-25T12-21-06-324Z.json` confirmed full mode was active and the old persistence cache really saturated at `240`.
- Live code review showed the old behavior came from `surfaceContactCache.set(..., { age: 3 })` plus `decaySurfaceContactCache()` deleting when `age <= 0` or `surfaceContactCache.size > 240`.
- That evidence proved the cap existed, but not whether the dominant problem was:
  - too many broadphase candidates,
  - too many accepted VT/EE contacts,
  - unstable or redundant cache writes,
  - or the eviction policy itself.
- The main blind spot in the prior plan was treating `240` as the diagnosis instead of instrumenting the pressure pipeline first.

### Changed files
- `js/physics.js`
  - Added explicit full-mode pressure metrics:
    - `surfaceTriangleCandidates`,
    - `surfaceEdgeCandidates`,
    - `acceptedVertexTriContacts`,
    - `acceptedEdgeEdgeContacts`,
    - `surfaceCacheHits`, `surfaceCacheMisses`,
    - `surfaceCacheWrites`, `surfaceCacheRefreshes`, `surfaceCacheNewEntries`,
    - `surfaceCacheSizeBeforeDecay`, `surfaceCacheSizeAfterDecay`,
    - `surfaceCacheAgeEvictions`, `surfaceCacheCapEvictions`,
    - `surfacePersistenceSkips`,
    - `surfacePersistenceBudgetPressure`,
    - `surfaceTriangleGridEntries`, `surfaceEdgeGridEntries`.
  - Kept legacy summary counters intact for comparability: `vertexTriPairs`, `edgeEdgePairs`, `surfacePasses`, and `persistedSurfaceContacts`.
  - Replaced hidden persistence literals with explicit policy settings in `surfacePersistencePolicy`.
  - Tuned full-mode retention to respond before blind hard-cap saturation:
    - reduced `maxCacheSize` from the implicit `240` path to explicit `200`,
    - starts pressure response at `120`,
    - shortens retention age under pressure,
    - applies faster decay under pressure rather than waiting to delete only after saturation.
- `js/main.js`
  - Runtime logging now records the new pressure/candidate/cache lifecycle fields in each JSON event.
  - Debug overlay now reports compact pressure summaries:
    - candidate VT/EE,
    - accepted VT/EE,
    - cache before→after,
    - cache hit/miss,
    - cache write/refresh/new,
    - age/cap evictions,
    - budget pressure/skips,
    - grid tri/edge entries.
  - Bumped physics import to `physics.js?v=14`.

### Validation
- Ran `node --check js/physics.js` after instrumentation.
- Ran `node --check js/physics.js` again after policy refactor.
- Ran `node --check js/physics.js` again after pressure-responsive tuning.
- Ran `node --check js/main.js` and `node --check js/physics.js` after wiring the debug/log fields.
- Served the demo locally on port `8024`.
- Confirmed HTTP `200` for:
  - `/index.html`
  - `/style.css`
  - `/js/main.js?v=14`
  - `/js/physics.js?v=14`
- Browser default/off URL: `http://127.0.0.1:8024/index.html`
  - No debug panel.
  - Logger disabled.
  - Active material `Receipt`, active shadow `High`, mode `off`.
- Browser VT debug/log URL: `http://127.0.0.1:8024/index.html?surface=vt&debug=1&log=1&material=heavy&shadow=off`
  - Debug panel present.
  - Logger enabled.
  - Active material `Heavy`, active shadow `Off`, mode `vt`.
  - Debug text showed the new fields are gated cleanly rather than breaking VT mode, e.g. `cand vt/ee 1468/0`, `accept vt/ee 0/0`, `persist 0`, `cache b→a 0→0`, `evict age/cap 0/0`, `budget 0/0`.

### Follow-up stressed log read
A new full-mode stressed runtime log `receipt-surface-log-2026-05-25T13-18-11-973Z.json` was then analyzed using `?surface=full&debug=1&log=1&material=heavy&shadow=off&logvalidate=5`.

Key observed peaks from that follow-up log:
- `persistedContacts`: `136`
- `surfaceCacheSizeBeforeDecay`: `290`
- `surfaceCacheSizeAfterDecay`: `136`
- `surfaceCacheCapEvictions`: `90`
- `surfacePersistenceBudgetPressure`: `170`
- `acceptedVertexTriContacts`: `138`
- `acceptedEdgeEdgeContacts`: `37`
- `surfaceTriangleCandidates`: `42,267`
- `surfaceEdgeCandidates`: `76,908`
- `physicsMs`: about `22 ms`

### Updated interpretation
- The new instrumentation worked: the old blind `persistedContacts=240` saturation pattern no longer dominates the readout.
- The new persistence policy reduced the old hard-cap pinning behavior: the stressed run peaked at `persistedContacts=136`, not `240`.
- Cache pressure still exists in concentrated bursts, but the main remaining cost signal is now broadphase candidate explosion first, especially edge candidates, rather than simple cache saturation.
- Accepted VT/EE contacts clearly rise under stress, but they are still far smaller than the candidate counts, so narrowphase load appears secondary to candidate generation pressure.
- Cache churn is real and visible now, but it reads as a consequence to manage rather than the primary hidden bottleneck.

### Updated interpretation guidance for the next stressed log
- If `surfaceTriangleCandidates` or especially `surfaceEdgeCandidates` spike into the tens of thousands while accepted contacts stay much lower, the next tuning target should be broadphase/query selectivity rather than persistence budget alone.
- If accepted VT/EE contacts climb proportionally with only moderate candidate counts, narrowphase/correction cost becomes the dominant pressure.
- If `surfaceCacheWrites`, `surfaceCacheRefreshes`, and `surfaceCacheNewEntries` stay high while persisted cache stays modest, churn/rewrites are dominating.
- If `surfaceCacheAgeEvictions` dominates, the policy is aging contacts out naturally under pressure.
- If `surfaceCacheCapEvictions` or `surfacePersistenceSkips` dominate while candidate counts are otherwise reasonable, the persistence budget is still too small or too sticky.
- If budget pressure remains near zero while physics cost is still high, the main problem is elsewhere and lowering the cache further would be the wrong move.

### Current limitation
This is still experimental cloth surface contact, not a production continuous collision solver. The new instrumentation improved diagnosis and reduced silent saturation, but the follow-up stressed log indicates the next likely frontier is broadphase candidate reduction rather than more blind cache-cap retuning alone.
