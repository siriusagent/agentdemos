# EXPERIMENTS.md

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
