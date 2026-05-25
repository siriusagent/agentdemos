# changelog.md

## 2026-05-24

- Added missing bootstrap documentation for the interactive receipt demo:
  - `AGENTS.md`
  - `README.md`
  - `plan.md`
  - `EXPERIMENTS.md`
  - `changelog.md`
  - `bugfix.md`
- Documented the current zero-dependency modular architecture, WebGL renderer path, XPBD-style physics path, validation checklist, and known performance hazards.
- Recorded the recent renderer recovery context: WebGL receipt rendering should be verified live with cache-busted URLs and the FPS badge.

## 2026-05-25

- Added URL-gated diagnostics mode for the receipt demo:
  - `?debug=1` creates a non-interactive diagnostics overlay.
  - Normal `index.html` remains clean with no debug panel.
  - Metrics include FPS, frame/physics/render timing, `dt`, mesh size, triangle count, constraint count, iterations, grab state, light angle, active shadow mode, and DPR.
- Added measured shadow experiment flags:
  - `?shadow=off`
  - `?shadow=low`
  - `?shadow=medium`
  - `?shadow=high`
- Updated `js/renderer.js` with `setShadowQuality()` and cache-busted its import from `js/main.js` to `?v=6`.
- Removed the stale commented red profiler block from `js/main.js`.
- Validated with `node --check js/*.js`, HTTP checks on port `8024`, browser normal/debug/shadow URL checks, and Light Dir knob reachability probing.
- Committed diagnostics/shadow harness as `abba4e3` (`Add receipt diagnostics experiment harness`).
- Refined grab physics in `js/physics.js`:
  - smoothed pointer targets,
  - reduced direct grab stiffness,
  - clamped drag impulse,
  - reduced release impulse,
  - widened/cubic-smoothed local falloff,
  - added local damping around the grabbed region.
- Bumped `physics.js` import in `js/main.js` to `?v=6`.
- Validated grab refinement with `node --check js/*.js`, HTTP checks, browser debug drag probe showing `grab #450` during drag and `grab none` after release, and normal URL check with no debug panel.
- Added a skeuomorphic `Receipt Lab` control panel:
  - material presets: `Receipt`, `Thin`, `Crisp`, `Creased`, `Heavy`,
  - shadow controls: `Off`, `Low`, `Med`, `High`,
  - `Reset Paper` button,
  - live material/shadow readout.
- Added runtime material APIs in `js/physics.js`: `applyMaterialPreset()`, `updateConstraintMaterials()`, and `reset()`.
- Added `?material=` URL initialization and diagnostics material reporting in `js/main.js`.
- Preserved existing Light Dir knob IDs/behavior and URL shadow/debug behavior.
- Validated with `node --check js/*.js`, HTTP checks on port `8024`, browser normal/control/debug-material checks, synthetic drag state, reset behavior, and Light Dir hit-testing.
- Strengthened material self-contact in `js/physics.js`:
  - base collision radius now derives from mesh spacing,
  - materials now include `collisionStiffness` and `contactDamping`,
  - self-collision runs on three solver passes with fresh spatial hashes,
  - collision response now damps closing velocity along the contact normal.
- Added diagnostics `contact pairs/passes` reporting in `js/main.js` behind `?debug=1`.
- Validated with `node --check js/*.js` and live browser debug URL `?debug=1&material=heavy&contact=1` showing active Heavy material, contact pass count `0/3` while idle, and continued rendering around `50–62 FPS`.

- Documented the self-contact caveat and next surface-collision experiment:
  - current behavior is particle/vertex-neighborhood self-contact, not full paper surface collision,
  - aggressive folds can still tunnel triangles between vertices,
  - true impenetrability requires vertex-triangle and edge-edge collision,
  - next measured experiment starts with a gated vertex-triangle prototype and separate surface-contact metrics.

- Added a gated vertex-triangle surface-collision prototype:
  - `?surface=vt` enables it; default mode remains particle self-contact,
  - debug now reports separate `surface pairs/passes`,
  - `js/main.js` imports `physics.js?v=9`,
  - validation showed normal URL clean and debug VT URL reporting `surface 0/1` with sampled physics timing around `8 ms` after throttling.

- Added experimental full surface collision mode:
  - `?surface=full` enables vertex-triangle plus edge-edge collision,
  - broadphase now indexes triangles and structural edges with swept current/previous-position bounds,
  - debug reports `surface vt/ee/passes`, `persist`, and `mode`,
  - `js/main.js` imports `physics.js?v=10`,
  - validation on port `8025` showed normal URL clean and full debug mode around `11–12 ms` sampled physics after optimization.

- Added written runtime interaction logging for manual surface-collision testing:
  - `?log=1` or `?debug=1` records bounded JSON event samples,
  - `l` adds a manual mark,
  - `s` downloads `receipt-surface-log-*.json`,
  - added `logs/README.md` with instructions for saving logs for later analysis,
  - app script bumped to `js/main.js?v=13`.
- Added full-mode surface persistence pressure instrumentation and tuning:
  - diagnosed the blind spot in the prior plan: `persistedContacts=240` proved cap saturation but did not by itself identify the dominant cause,
  - instrumented `js/physics.js` with candidate, accepted-contact, cache lookup/write, cache size, and eviction-reason metrics while preserving the older summary counters,
  - replaced hidden persistence literals with explicit `surfacePersistencePolicy` settings,
  - made full-mode persistence pressure-responsive instead of waiting for a blind hard-cap delete path,
  - extended `js/main.js` debug overlay and JSON runtime logging with the new pressure/cache metrics,
  - bumped `js/main.js` to import `physics.js?v=14`,
  - syntax-checked `js/main.js` and `js/physics.js`, verified HTTP `200` for `js/main.js?v=14` and `js/physics.js?v=14`, and smoke-checked default/off plus `?surface=vt&debug=1&log=1` mode behavior.
- Updated stale docs after reading the follow-up stressed full-mode runtime log `receipt-surface-log-2026-05-25T13-18-11-973Z.json`:
  - confirmed the new policy no longer pinned `persistedContacts` at `240`, with the stressed run peaking at `136`,
  - recorded that cache pressure still appears in bursts (`surfaceCacheSizeBeforeDecay` up to `290`, `surfaceCacheCapEvictions` up to `90`),
  - recorded that the dominant remaining stress signal is broadphase candidate growth (`surfaceTriangleCandidates` about `42k`, `surfaceEdgeCandidates` about `77k`) rather than blind cache saturation,
  - updated planning guidance so the next tuning pass targets broadphase/query selectivity before more cache-cap-only retuning.
