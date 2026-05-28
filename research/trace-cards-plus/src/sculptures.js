// sculptures.js — pattern definitions.
// Each pattern provides:
//   skeleton(state) -> { points:[Vec3], edges:[[i,j]] }  the static wireframe formation
//   orbit(i, t, state) -> {x,y,z}  the live traced position of element i at time t
// All coordinates are in "formation space" (unit-ish), scaled by renderer.

const TAU = Math.PI * 2;
const v = (x, y, z) => ({ x, y, z });

// helper: regular polygon ring on XZ plane at height y
function ring(n, r, y) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    pts.push(v(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return pts;
}

export const Sculptures = {
  Pyramid: {
    skeleton() {
      const base = ring(4, 1.0, -0.8).map(p => v(p.x, p.y, p.z));
      const apex = v(0, 1.0, 0);
      const points = [...base, apex];
      const edges = [[0,1],[1,2],[2,3],[3,0], [0,4],[1,4],[2,4],[3,4]];
      // tiered inner pyramids
      const t1 = ring(4, 0.6, -0.2);
      const o = points.length;
      points.push(...t1, v(0, 0.6, 0));
      edges.push([o,o+1],[o+1,o+2],[o+2,o+3],[o+3,o],[o,o+4],[o+1,o+4],[o+2,o+4],[o+3,o+4]);
      return { points, edges };
    },
    orbit(i, t, s) {
      const n = s.elementCount;
      const layer = i / Math.max(1, n - 1);          // 0..1 up the pyramid
      const y = -0.8 + layer * 1.8;
      const r = (1 - layer) * (0.7 + s.orbitRadius * 0.5);
      const a = t * s.orbitSpeed + i * (TAU / n);
      return v(Math.cos(a) * r, y + Math.sin(t * 0.8 + i) * s.orbitDepth * 0.3, Math.sin(a) * r);
    },
  },

  Diamond: {
    skeleton() {
      const girdle = ring(6, 1.0, 0);
      const top = v(0, 0.7, 0), bot = v(0, -1.1, 0);
      const points = [...girdle, top, bot];
      const edges = [];
      const g = 6;
      for (let i = 0; i < g; i++) edges.push([i, (i+1)%g]);
      for (let i = 0; i < g; i++) { edges.push([i, g]); edges.push([i, g+1]); }
      return { points, edges };
    },
    orbit(i, t, s) {
      const n = s.elementCount;
      const phase = i / n;
      const a = t * s.orbitSpeed + phase * TAU;
      // bipyramid sweep: radius pinches at poles
      const yPhase = Math.sin(t * 0.6 + phase * TAU);
      const y = yPhase * (1.0 + s.orbitDepth);
      const r = (1 - Math.abs(yPhase) * 0.85) * (0.9 + s.orbitRadius * 0.4);
      return v(Math.cos(a) * r, y * 0.9, Math.sin(a) * r);
    },
  },

  Helix: {
    skeleton() {
      const points = [], edges = [];
      const turns = 3, seg = 24;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * TAU * turns;
        const y = -1.1 + (i / seg) * 2.2;
        points.push(v(Math.cos(a) * 0.8, y, Math.sin(a) * 0.8));
        if (i > 0) edges.push([i - 1, i]);
      }
      return { points, edges };
    },
    orbit(i, t, s) {
      const n = s.elementCount;
      const phase = i / n;
      const a = t * s.orbitSpeed + phase * TAU * 3;
      const y = -1.1 + ((phase + t * 0.1) % 1) * 2.2;
      const r = 0.8 + s.orbitRadius * 0.4 * Math.sin(t + i);
      return v(Math.cos(a) * r, y, Math.sin(a) * r);
    },
  },

  Torus: {
    skeleton() {
      const points = [], edges = [];
      const R = 1.0, rr = 0.4, rings = 8, tube = 6;
      for (let i = 0; i < rings; i++) {
        const u = (i / rings) * TAU;
        for (let j = 0; j < tube; j++) {
          const vv = (j / tube) * TAU;
          const x = (R + rr * Math.cos(vv)) * Math.cos(u);
          const z = (R + rr * Math.cos(vv)) * Math.sin(u);
          const y = rr * Math.sin(vv);
          points.push(v(x, y, z));
          const idx = i * tube + j;
          edges.push([idx, i * tube + (j + 1) % tube]);
          edges.push([idx, ((i + 1) % rings) * tube + j]);
        }
      }
      return { points, edges };
    },
    orbit(i, t, s) {
      const n = s.elementCount;
      const u = t * s.orbitSpeed + (i / n) * TAU;
      const vv = t * s.orbitSpeed * 1.7 + (i / n) * TAU * 2;
      const R = 1.0 + s.orbitRadius * 0.2;
      const rr = 0.4 + s.orbitDepth * 0.3;
      const x = (R + rr * Math.cos(vv)) * Math.cos(u);
      const z = (R + rr * Math.cos(vv)) * Math.sin(u);
      const y = rr * Math.sin(vv);
      return v(x, y, z);
    },
  },

  Lissajous: {
    skeleton() {
      const points = [], edges = [];
      const seg = 80, A = 3, B = 2, C = 4, d = Math.PI / 2;
      for (let i = 0; i <= seg; i++) {
        const t = (i / seg) * TAU;
        points.push(v(Math.sin(A * t + d) * 1.1, Math.sin(B * t) * 1.1, Math.sin(C * t) * 0.9));
        if (i > 0) edges.push([i - 1, i]);
      }
      return { points, edges };
    },
    orbit(i, t, s) {
      const n = s.elementCount;
      const ph = (i / n) * TAU;
      const tt = t * s.orbitSpeed + ph;
      const A = 3, B = 2, C = 4;
      const sc = 1.0 + s.orbitRadius * 0.3;
      return v(
        Math.sin(A * tt + Math.PI / 2) * 1.1 * sc,
        Math.sin(B * tt) * 1.1 * sc,
        Math.sin(C * tt) * 0.9 * (1 + s.orbitDepth)
      );
    },
  },

  Galaxy: {
    skeleton() {
      const points = [], edges = [];
      const arms = 3, perArm = 14;
      for (let aArm = 0; aArm < arms; aArm++) {
        const base = (aArm / arms) * TAU;
        let prev = -1;
        for (let i = 0; i < perArm; i++) {
          const tt = i / perArm;
          const a = base + tt * 3.2;
          const r = tt * 1.4;
          const idx = points.length;
          points.push(v(Math.cos(a) * r, (Math.random() - 0.5) * 0.1 + Math.sin(tt * 6) * 0.15, Math.sin(a) * r));
          if (prev >= 0) edges.push([prev, idx]);
          prev = idx;
        }
      }
      return { points, edges };
    },
    orbit(i, t, s) {
      const n = s.elementCount;
      const arm = i % 3;
      const tt = ((i / n) + t * 0.04 * s.orbitSpeed) % 1;
      const a = (arm / 3) * TAU + tt * 3.2 + t * 0.1 * s.orbitSpeed;
      const r = tt * (1.4 + s.orbitRadius * 0.4);
      return v(Math.cos(a) * r, Math.sin(tt * 6 + t) * 0.2 * (1 + s.orbitDepth), Math.sin(a) * r);
    },
  },
};

export function getSculpture(name) {
  return Sculptures[name] || Sculptures.Pyramid;
}
