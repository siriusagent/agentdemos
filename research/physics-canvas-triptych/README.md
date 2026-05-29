# Physics Canvas Triptych

A zero-dependency raw HTML5 Canvas demo containing three real physics/probability simulations:

1. **Triple pendulum chaos** — RK4-integrated three-link pendulum with glowing tip trails.
2. **Pi collisions** — Galperin-style perfectly elastic block collisions: a 1 kg block bounces between a wall and a 100.000 kg block, yielding 31 collisions (`3.1`).
3. **Galton board** — balls fall through pegs and accumulate into a binomial / bell-curve pile.

## Run locally

```bash
cd "/Users/mikhutchinson/Documents/Market Research Demo"
python3 -m http.server 8788
# open http://127.0.0.1:8788/research/physics-canvas-triptych/
```

No build step, npm package, framework, WebGL, or external runtime is required.
