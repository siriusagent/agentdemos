# changelog.md

## 2026-05-29 — rectify (verification channel + composition)
- Added an automated-verification channel: `src/main.js` now mirrors render liveness into `document.body.dataset` each FPS tick (`tcReady`, `tcGl`, `tcCards`, `tcSceneChildren`, `tcFps`, `tcPattern`), so isolated-world browser automation can read real state without sharing the page's JS world. Confirmed `tcReady=1`, `tcGl=ok`, `tcCards=7`.
- Reworked framing to be aspect-aware (`src/main.js`): `frameScale = clamp(0.98 + (aspect-1)*0.10, 0.92, 1.3)`, portrait `distFit=1.22`, formation lifted (`position.y → 0.5`), `controls.target.y → 0.28`, `camera.position.y → 1.25`. Resolves the empty-space / subject-too-low / bottom-clip issues; verified pyramid fully in frame at 1440x900 and 390x844.
- Raised default skeleton visibility: `config.js` `ghostOpacity` 0.5 → 0.6 (skeleton material opacity = `min(1, ghostOpacity*1.55)`), so the wireframe reads clearly against bright nodes.
- Fixed the control panel dominating first load. Root cause: collapsing via JS after module load raced the first paint (reproduced as panel-open at 390px). Fix: panel now starts `class="panel hidden"` in `index.html` markup (no race), and `src/main.js` only *removes* `hidden` when a shared `?s=` link is present.
- Verified with installed Chromium `headless_shell-1223` (`--use-gl=angle --use-angle=metal`) at desktop + mobile, then `vision_analyze`: all four flagged issues resolved on both viewports.

## 2026-05-28

- Bootstrapped `Trace Cards+` as a new static WebGL research demo inspired by Whitespace's trace-cards experiment.
- Built the demo as a zero-build HTML/CSS/JavaScript ES-module app served from a simple static HTTP server.
- Added modular source files:
  - `index.html`
  - `src/config.js`
  - `src/sculptures.js`
  - `src/panel.js`
  - `src/main.js`
- Implemented six trace-sculpture pattern families:
  - `Pyramid`
  - `Diamond`
  - `Helix`
  - `Torus`
  - `Lissajous`
  - `Galaxy`
- Added a polished right-side control panel, preset system, randomization, snapshots, share-link export, orbit controls, pointer tilt, and optional microphone-driven audio reactivity.
- Added bloom, vignette, and film-grain post-processing for a darker premium render style.
- Performed a visual review and then improved composition by lifting/scaling the formation, nudging framing upward, and increasing skeleton visibility.
- Migrated the demo from an incorrect ad hoc home-directory location into the proper workspace at `research/trace-cards-plus/`.
- Added local project docs for this research artifact:
  - `AGENTS.md`
  - `README.md`
  - `plan.md`
  - `EXPERIMENTS.md`
  - `changelog.md`
