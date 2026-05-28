# plan.md

## Goal
Build and maintain a polished static WebGL trace-sculpture demo that captures the appeal of the reference trace-cards piece while clearly exceeding it in pattern range, interaction surface, and presentational polish.

## Current state
- Demo exists as a static HTML + ES-module app.
- Scene renders stacked translucent cards, static skeleton wireframes, and animated trace trails.
- Current pattern set includes `Pyramid`, `Diamond`, `Helix`, `Torus`, `Lissajous`, and `Galaxy`.
- Control surface includes presets, sliders/toggles, randomization, snapshot, share-link export, and optional audio reactivity.
- Post-processing includes bloom, vignette, and film grain.
- A visual review already identified composition weaknesses in the initial pass: too much empty space, subject placement too low/right, and wireframe visibility too faint relative to nodes.
- A follow-up pass partially corrected composition by lifting/scaling the formation and strengthening skeleton visibility.

## Immediate priorities
1. Finish migrating the prototype into the correct research workspace and keep docs aligned.
2. Push the visual composition from “working experiment” to “hero demo.”
3. Improve the balance between wireframe structure, nodes, glow, and negative space.
4. Establish one or two flagship presets that feel unmistakably stronger than the source inspiration.
5. Preserve the zero-build static workflow while validating changes live.

## Acceptance criteria
- Served page loads cleanly from a local static HTTP server.
- Canvas shows animated geometry and not a blank/failing render.
- Controls work and update the scene.
- The demo lives in its own organized research subdirectory.
- Repo docs in this subdirectory describe how to run, validate, and extend it.
- No stray temporary files or out-of-workspace copies remain part of the intended handoff.

## Next good work items
- Add a composition-focused “hero preset” tuned for stronger silhouette and better screen ownership.
- Add selective line emphasis or depth cueing so the structure reads at a glance.
- Consider reducing first-load panel dominance on narrower layouts.
- Add a compact experiment log of what visual changes improved or hurt the composition.
