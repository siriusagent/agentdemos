# EXPERIMENTS.md

## 2026-05-29 — rectify pass (verification channel + composition)
### Objective
Close the loop on defects left open after the initial bootstrap: (a) no reliable automated-verification channel (isolated-world `browser_use_eval` could not read `window.__TC`), and (b) the art-direction issues vision flagged — empty space, subject too low/right, faint wireframe, panel dominating first load.

### What I changed
- **Verification channel.** Mirrored render liveness into `document.body.dataset` each FPS tick. Isolated-world automation reads `document.body.dataset.tcReady/tcGl/tcCards/...` instead of the cross-world `window.__TC`. Confirmed `tcReady=1, tcGl=ok, tcCards=7, tcSceneChildren=3`.
- **Framing.** Replaced hardcoded constants with aspect-aware framing: `frameScale = clamp(0.98 + (aspect-1)*0.10, 0.92, 1.3)`, portrait `distFit=1.22`, formation lifted to `y=0.5`, target `y=0.28`, eye `y=1.25`. Iterated three times against vision feedback (initial overcorrection pushed the pyramid base below the bottom edge; final values keep it fully contained).
- **Wireframe.** `ghostOpacity` 0.5 → 0.6.
- **Panel on load.** Started the panel collapsed in markup (`class="panel hidden"`) and made JS open it only for shared `?s=` links — eliminates a JS-after-module-load race that left the panel open at 390px.

### Verification method (note for future passes)
- `browser_use_screenshot` returned a PNG-encode error and `canvas.toDataURL()` from the automation world returned empty (`data:,`) — isolated-world GL readback isn't shared.
- `browser_verify` with Playwright failed (browser binary version mismatch); per workspace constraint I did not install Chromium.
- Working path: drive the already-installed Playwright Chromium `headless_shell-1223` directly (`--headless --use-gl=angle --use-angle=metal --window-size=W,H --virtual-time-budget=6000 --screenshot=...`), then `vision_analyze` the PNGs. Captured 1440x900 and 390x844.

### Result
Final `vision_analyze` (desktop4.png + mobile4.png): both viewports YES on all three checks — pyramid fully in frame and balanced, wireframe visible vs nodes, Controls panel collapsed/unobstructed.

## 2026-05-28 — initial clone-and-exceed bootstrap

### Prompt / objective
Create a new research demo that clones and exceeds:
- <https://experiments.thisiswhitespace.com/trace-cards>

### Source review
Observed the reference via `web_read` and live browser inspection.

Reference characteristics captured:
- dark premium control-lab UI
- stacked card planes in depth
- wireframe geometric structures (`Pyramid`, `Diamond`)
- animated orbital trace behavior
- substantial live control surface for camera, motion, planes, and lighting
- dark background with teal/green accents

### Implementation direction chosen
Instead of reverse-engineering minified Next.js bundles, built a fresh self-contained static implementation that preserves the visual idea and exceeds it by adding:
- additional pattern families
- post-processing bloom/vignette/grain
- snapshot + share-link workflow
- audio reactivity
- randomization and preset system

### Resulting pattern set
- `Pyramid`
- `Diamond`
- `Helix`
- `Torus`
- `Lissajous`
- `Galaxy`

### Verification performed
- Local static server check returned HTTP `200` for `index.html` and `src/main.js`.
- Browser load confirmed live control panel and animated render loop.
- Canvas readback confirmed non-blank rendered output.
- Headless module check confirmed all six sculpture generators produce valid geometry/orbit data.

## 2026-05-28 — visual review and composition correction

### Review method
Ran screenshot-based visual review on the first local render.

### Weaknesses identified
- too much empty black space
- subject composition too low / too far right
- slight clipping/cropping feel near the bottom
- wireframe read weaker than glowing nodes
- panel density visually dominated the artwork

### Corrective changes applied
- lifted the formation upward
- scaled the formation larger
- nudged camera/target upward for better framing
- increased skeleton/wireframe visibility

### Outcome
The render remained visually strong and technically live after the adjustment pass, but the artifact still needs a dedicated art-direction polish pass to become a true flagship demo rather than a strong first prototype.
