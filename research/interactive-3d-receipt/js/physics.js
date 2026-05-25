import { CONFIG } from './config.js?v=5';

export class PhysicsEngine {
  constructor() {
    this.particles = [];
    this.constraints = [];
    this.grab = null;
    this.time = 0;
    this.cols = CONFIG.COLS;
    this.rows = CONFIG.ROWS;
    this.invCols = 1 / Math.max(1, this.cols - 1);
    this.invRows = 1 / Math.max(1, this.rows - 1);
    this.selfCollisionRadius = Math.min(CONFIG.W / (CONFIG.COLS - 1), CONFIG.H / (CONFIG.ROWS - 1)) * 0.86;
    this.selfCollisionRadiusSq = this.selfCollisionRadius * this.selfCollisionRadius;
    this.cellSize = this.selfCollisionRadius * 1.7;
    this.surfaceCollisionMode = 'off';
    this.surfaceCollisionEnabled = false;
    this.surfaceCollisionRadius = Math.min(CONFIG.W / (CONFIG.COLS - 1), CONFIG.H / (CONFIG.ROWS - 1)) * 0.42;
    this.surfaceCellSize = this.surfaceCollisionRadius * 3.5;
    this.collisionPasses = 0;
    this.collisionPairs = 0;
    this.surfacePasses = 0;
    this.vertexTriPairs = 0;
    this.edgeEdgePairs = 0;
    this.persistedSurfaceContacts = 0;
    this.surfaceTriangleCandidates = 0;
    this.surfaceEdgeCandidates = 0;
    this.acceptedVertexTriContacts = 0;
    this.acceptedEdgeEdgeContacts = 0;
    this.surfaceCacheHits = 0;
    this.surfaceCacheMisses = 0;
    this.surfaceCacheWrites = 0;
    this.surfaceCacheRefreshes = 0;
    this.surfaceCacheNewEntries = 0;
    this.surfaceCacheSizeBeforeDecay = 0;
    this.surfaceCacheSizeAfterDecay = 0;
    this.surfaceCacheAgeEvictions = 0;
    this.surfaceCacheCapEvictions = 0;
    this.surfacePersistenceSkips = 0;
    this.surfacePersistenceBudgetPressure = 0;
    this.surfaceTriangleGridEntries = 0;
    this.surfaceEdgeGridEntries = 0;
    this.surfacePersistencePolicy = {
      baseRetentionAge: 3,
      maxCacheSize: 200,
      pressureStartsAt: 120,
      pressureFullAt: 200,
      pressureDecayExtraAge: 1,
      pressureRefreshAge: 2,
      minRetentionAge: 1
    };
    this.surfaceContactCache = new Map();
    this.edgeMap = new Map();
    this.activeMaterial = 'receipt';
    this.material = this.makeMaterialPreset('receipt');
  }

  makeMaterialPreset(name) {
    const presets = {
      receipt: {
        label: 'Receipt',
        gravity: 1.0,
        damping: 1.0,
        air: 1.0,
        foldMemory: 1.0,
        flutter: 1.0,
        structural: 1.0,
        shear: 1.0,
        bendX: 1.0,
        bendY: 1.0,
        bendMemory: 1.0,
        selfCollision: 1.0,
        collisionStiffness: 0.78,
        contactDamping: 0.18,
        grabPull: 1.0,
        releaseImpulse: 1.0
      },
      thin: {
        label: 'Thin',
        gravity: 0.86,
        damping: 0.997,
        air: 1.002,
        foldMemory: 0.72,
        flutter: 1.45,
        structural: 1.35,
        shear: 1.28,
        bendX: 1.45,
        bendY: 1.55,
        bendMemory: 0.78,
        selfCollision: 0.92,
        collisionStiffness: 0.64,
        contactDamping: 0.12,
        grabPull: 0.92,
        releaseImpulse: 0.86
      },
      crisp: {
        label: 'Crisp',
        gravity: 0.98,
        damping: 0.992,
        air: 0.996,
        foldMemory: 1.16,
        flutter: 0.75,
        structural: 0.78,
        shear: 0.82,
        bendX: 0.62,
        bendY: 0.68,
        bendMemory: 1.24,
        selfCollision: 1.08,
        collisionStiffness: 0.92,
        contactDamping: 0.24,
        grabPull: 1.06,
        releaseImpulse: 0.92
      },
      creased: {
        label: 'Creased',
        gravity: 1.03,
        damping: 0.988,
        air: 0.994,
        foldMemory: 1.65,
        flutter: 0.92,
        structural: 1.02,
        shear: 0.95,
        bendX: 1.20,
        bendY: 1.36,
        bendMemory: 1.58,
        selfCollision: 1.04,
        collisionStiffness: 0.86,
        contactDamping: 0.28,
        grabPull: 0.96,
        releaseImpulse: 0.82
      },
      heavy: {
        label: 'Heavy',
        gravity: 1.26,
        damping: 0.976,
        air: 0.984,
        foldMemory: 0.88,
        flutter: 0.38,
        structural: 0.68,
        shear: 0.72,
        bendX: 0.54,
        bendY: 0.60,
        bendMemory: 0.86,
        selfCollision: 1.16,
        collisionStiffness: 0.96,
        contactDamping: 0.34,
        grabPull: 1.10,
        releaseImpulse: 0.70
      }
    };
    return presets[name] || presets.receipt;
  }

  applyMaterialPreset(name) {
    const allowed = new Set(['receipt', 'thin', 'crisp', 'creased', 'heavy']);
    this.activeMaterial = allowed.has(name) ? name : 'receipt';
    this.material = this.makeMaterialPreset(this.activeMaterial);
    this.updateConstraintMaterials();
    return this.activeMaterial;
  }

  updateConstraintMaterials() {
    const m = this.material;
    for (const c of this.constraints) {
      const base = c.baseCompliance ?? c.compliance;
      c.baseCompliance = base;
      const multiplier = c.kind === 'struct' ? m.structural
        : c.kind === 'shear' ? m.shear
        : c.kind === 'bendX' ? m.bendX
        : c.kind === 'bendY' ? m.bendY
        : c.kind === 'bendXLong' ? m.bendX * 1.12
        : c.kind === 'bendYLong' ? m.bendY * 1.12
        : 1;
      c.compliance = base * multiplier;
    }
  }

  setSurfaceCollisionEnabled(enabled) {
    this.setSurfaceCollisionMode(enabled ? 'vt' : 'off');
  }

  setSurfaceCollisionMode(mode) {
    const allowed = new Set(['off', 'vt', 'full']);
    this.surfaceCollisionMode = allowed.has(mode) ? mode : 'off';
    this.surfaceCollisionEnabled = this.surfaceCollisionMode !== 'off';
    if (!this.surfaceCollisionEnabled) {
      this.surfaceContactCache.clear();
    }
  }

  reset(prewarmSteps = 80) {
    const material = this.activeMaterial;
    this.grab = null;
    this.time = 0;
    this.initMesh();
    this.applyMaterialPreset(material);
    for (let i = 0; i < prewarmSteps; i++) {
      this.step(1.0);
    }
  }

  idx(x, y) {
    return y * this.cols + x;
  }

  coords(index) {
    return { x: index % this.cols, y: Math.floor(index / this.cols) };
  }

  rand(n) {
    const s = Math.sin(n * 127.1) * 43758.5453123;
    return s - Math.floor(s);
  }

  clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  makeParticle(px, py, pz, u, v, pinned, edgeFlex) {
    return {
      x: px, y: py, z: pz,
      ox: px, oy: py, oz: pz,
      ix: px, iy: py, iz: pz,
      pinned,
      u, v,
      invMass: pinned ? 0 : 1,
      edgeFlex,
      bendBias: 0,
      collisionHits: 0,
      grabBias: 0
    };
  }

  addConstraint(a, b, compliance, kind) {
    const pa = this.particles[a];
    const pb = this.particles[b];
    const rest = Math.hypot(pa.ix - pb.ix, pa.iy - pb.iy, pa.iz - pb.iz);
    this.constraints.push({ a, b, rest, compliance, baseCompliance: compliance, lambda: 0, kind });
  }

  linkEdge(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    this.edgeMap.set(`${lo}:${hi}`, true);
  }

  areNeighbors(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return this.edgeMap.has(`${lo}:${hi}`);
  }

  areTopologicallyNear(a, b, radius = 1) {
    const ac = this.coords(a);
    const bc = this.coords(b);
    return Math.abs(ac.x - bc.x) <= radius && Math.abs(ac.y - bc.y) <= radius;
  }


  edgeKey(a, b) {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return `${lo}:${hi}`;
  }

  clamp01(v) {
    return this.clamp(v, 0, 1);
  }

  triangleList(stride = 1) {
    const tris = [];
    for (let y = 0; y < this.rows - 1; y += stride) {
      for (let x = 0; x < this.cols - 1; x += stride) {
        tris.push([this.idx(x, y), this.idx(x + 1, y), this.idx(x, y + 1)]);
        tris.push([this.idx(x + 1, y), this.idx(x + 1, y + 1), this.idx(x, y + 1)]);
      }
    }
    return tris;
  }

  structuralEdgeList(stride = 1) {
    const edges = [];
    for (let y = 0; y < this.rows; y += stride) {
      for (let x = 0; x < this.cols; x += stride) {
        if (x < this.cols - 1) edges.push([this.idx(x, y), this.idx(x + 1, y)]);
        if (y < this.rows - 1) edges.push([this.idx(x, y), this.idx(x, y + 1)]);
      }
    }
    return edges;
  }

  surfaceKey(x, y, z) {
    return `${Math.floor(x / this.surfaceCellSize)},${Math.floor(y / this.surfaceCellSize)},${Math.floor(z / this.surfaceCellSize)}`;
  }

  surfaceRange(min, max) {
    const lo = Math.floor(min / this.surfaceCellSize);
    const hi = Math.floor(max / this.surfaceCellSize);
    const values = [];
    for (let i = lo; i <= hi; i++) values.push(i);
    return values;
  }

  buildSurfaceBroadphase() {
    this.triangleGrid = new Map();
    this.edgeGrid = new Map();
    this.surfaceTriangleGridEntries = 0;
    this.surfaceEdgeGridEntries = 0;
    const triStride = this.surfaceCollisionMode === 'full' ? 2 : 4;
    const edgeStride = this.surfaceCollisionMode === 'full' ? 2 : 2;
    this.surfaceTriangles = this.triangleList(triStride);
    this.surfaceEdges = this.structuralEdgeList(edgeStride);
    const pad = this.surfaceCollisionRadius * (this.material.selfCollision || 1);

    const addToGrid = (grid, key, item, counterKey) => {
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(item);
      this[counterKey]++;
    };

    this.surfaceTriangles.forEach((tri, triIndex) => {
      const pts = tri.map(i => this.particles[i]);
      // Swept broadphase: include previous Verlet positions so fast-moving
      // folds still query candidate triangles crossed between frames.
      const xs = pts.flatMap(q => [q.x, q.ox]), ys = pts.flatMap(q => [q.y, q.oy]), zs = pts.flatMap(q => [q.z, q.oz]);
      for (const gx of this.surfaceRange(Math.min(...xs) - pad, Math.max(...xs) + pad)) {
        for (const gy of this.surfaceRange(Math.min(...ys) - pad, Math.max(...ys) + pad)) {
          for (const gz of this.surfaceRange(Math.min(...zs) - pad, Math.max(...zs) + pad)) {
            addToGrid(this.triangleGrid, `${gx},${gy},${gz}`, triIndex, 'surfaceTriangleGridEntries');
          }
        }
      }
    });

    this.surfaceEdges.forEach((edge, edgeIndex) => {
      const a = this.particles[edge[0]];
      const b = this.particles[edge[1]];
      // Swept broadphase for edge candidates as well; narrowphase remains
      // conservative positional correction rather than exact time-of-impact CCD.
      const xs = [a.x, a.ox, b.x, b.ox], ys = [a.y, a.oy, b.y, b.oy], zs = [a.z, a.oz, b.z, b.oz];
      for (const gx of this.surfaceRange(Math.min(...xs) - pad, Math.max(...xs) + pad)) {
        for (const gy of this.surfaceRange(Math.min(...ys) - pad, Math.max(...ys) + pad)) {
          for (const gz of this.surfaceRange(Math.min(...zs) - pad, Math.max(...zs) + pad)) {
            addToGrid(this.edgeGrid, `${gx},${gy},${gz}`, edgeIndex, 'surfaceEdgeGridEntries');
          }
        }
      }
    });
  }

  nearbyTrianglesForParticle(p) {
    const seen = new Set();
    const out = [];
    const pad = this.surfaceCollisionRadius * 1.35;
    for (const gx of this.surfaceRange(Math.min(p.x, p.ox) - pad, Math.max(p.x, p.ox) + pad)) {
      for (const gy of this.surfaceRange(Math.min(p.y, p.oy) - pad, Math.max(p.y, p.oy) + pad)) {
        for (const gz of this.surfaceRange(Math.min(p.z, p.oz) - pad, Math.max(p.z, p.oz) + pad)) {
          const bucket = this.triangleGrid?.get(`${gx},${gy},${gz}`);
          if (!bucket) continue;
          for (const triIndex of bucket) {
            if (seen.has(triIndex)) continue;
            seen.add(triIndex);
            out.push(this.surfaceTriangles[triIndex]);
          }
        }
      }
    }
    return out;
  }

  segmentSegmentClosest(a, b, c, d) {
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
    const vx = d.x - c.x, vy = d.y - c.y, vz = d.z - c.z;
    const wx = a.x - c.x, wy = a.y - c.y, wz = a.z - c.z;
    const aa = ux * ux + uy * uy + uz * uz;
    const bb = ux * vx + uy * vy + uz * vz;
    const cc = vx * vx + vy * vy + vz * vz;
    const dd = ux * wx + uy * wy + uz * wz;
    const ee = vx * wx + vy * wy + vz * wz;
    const denom = aa * cc - bb * bb;
    let s = denom > 1e-9 ? this.clamp01((bb * ee - cc * dd) / denom) : 0;
    let t = (bb * s + ee) / Math.max(cc, 1e-9);
    if (t < 0 || t > 1) {
      t = this.clamp01(t);
      s = this.clamp01((bb * t - dd) / Math.max(aa, 1e-9));
    }
    return {
      ax: a.x + ux * s,
      ay: a.y + uy * s,
      az: a.z + uz * s,
      bx: c.x + vx * t,
      by: c.y + vy * t,
      bz: c.z + vz * t,
      s,
      t
    };
  }


  initMesh() {
    this.particles = [];
    this.constraints = [];
    this.edgeMap = new Map();

    const { W, H } = CONFIG;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const u = x * this.invCols;
        const v = y * this.invRows;
        const seed = this.idx(x, y) + 1;
        const sideCurl = Math.sin((u - 0.5) * Math.PI) * 0.028;
        const microCurl = (this.rand(seed) - 0.5) * 0.008;
        const widthTaper = 1 - Math.abs(u - 0.5) * 1.18;
        const px = (u - 0.5) * W;
        let py = (v - 0.5) * H;
        if (y === this.rows - 1) py += this.rand(seed * 1.37) * 0.085;
        const pz = sideCurl + microCurl + Math.sin(u * Math.PI * 2.0 + v * 0.85) * 0.008 * widthTaper;
        const pinned = y === 0;
        const edgeFlex = 0.92 + (1 - widthTaper) * 0.12 + (v * 0.05);
        this.particles.push(this.makeParticle(px, py, pz, u, v, pinned, edgeFlex));
      }
    }

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const i = this.idx(x, y);
        if (x < this.cols - 1) {
          const j = this.idx(x + 1, y);
          this.addConstraint(i, j, 0.000001, 'struct'); // Stiff (low compliance)
          this.linkEdge(i, j);
        }
        if (y < this.rows - 1) {
          const j = this.idx(x, y + 1);
          this.addConstraint(i, j, 0.000001, 'struct'); // Stiff
          this.linkEdge(i, j);
        }
        if (x < this.cols - 1 && y < this.rows - 1) {
          this.addConstraint(i, this.idx(x + 1, y + 1), 0.00005, 'shear'); // Resist twist
          this.addConstraint(this.idx(x + 1, y), this.idx(x, y + 1), 0.00005, 'shear');
        }
        if (x < this.cols - 2) {
          this.addConstraint(i, this.idx(x + 2, y), 0.04, 'bendX');
        }
        if (y < this.rows - 2) {
          this.addConstraint(i, this.idx(x, y + 2), 0.07, 'bendY'); // Vert bends slightly easier
        }
        if (x < this.cols - 3) {
          this.addConstraint(i, this.idx(x + 3, y), 0.2, 'bendXLong');
        }
        if (y < this.rows - 4) {
          this.addConstraint(i, this.idx(x, y + 4), 0.4, 'bendYLong');
        }
      }
    }
    this.updateConstraintMaterials();
  }

  setGrab(index, zOffset, grabZ) {
    this.grab = {
      index,
      zOffset,
      grabZ,
      target: null,
      prevTarget: null,
      smoothedTarget: null,
      worldImpulse: { x: 0, y: 0, z: 0 }
    };
  }

  updateGrabTarget(target) {
    if (!this.grab) return;
    if (this.grab.target) {
      this.grab.prevTarget = { ...this.grab.target };
    }
    this.grab.target = target;
  }

  releaseGrab() {
    if (!this.grab) return;
    const p = this.particles[this.grab.index];
    if (this.grab.worldImpulse) {
      // Preserve release direction but cap the injected Verlet velocity so the
      // receipt peels away like light paper instead of snapping like rubber.
      const release = 0.34 * this.material.releaseImpulse;
      p.ox = p.x - this.grab.worldImpulse.x * release;
      p.oy = p.y - this.grab.worldImpulse.y * release;
      p.oz = p.z - this.grab.worldImpulse.z * release;
    }
    p.grabBias = 0;
    this.grab = null;
  }

  integrate(dt) {
    const { GRAVITY, DAMPING, AIR, FOLD_MEMORY } = CONFIG;
    const dtScale = this.clamp(dt, 0.6, 1.7);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.collisionHits = 0;
      p.bendBias = 0;

      if (p.pinned) {
        p.x = p.ix;
        p.y = p.iy;
        p.z = p.iz;
        p.ox = p.x;
        p.oy = p.y;
        p.oz = p.z;
        continue;
      }

      const vx = (p.x - p.ox) * (DAMPING * this.material.damping);
      const vy = (p.y - p.oy) * (DAMPING * this.material.damping);
      const vz = (p.z - p.oz) * (AIR * this.material.air);

      p.ox = p.x;
      p.oy = p.y;
      p.oz = p.z;

      const edgeFlutter = Math.sin(this.time * 0.0018 + p.v * 8.5 + p.u * 4.2) * 0.00016 * this.material.flutter * (0.25 + p.v) * p.edgeFlex;
      const curlMemory = (p.iz - p.z) * FOLD_MEMORY * this.material.foldMemory * (0.3 + p.v * 0.85);
      const verticalBias = (0.5 - Math.abs(p.u - 0.5)) * 0.00008;

      p.x += vx + edgeFlutter * 0.35;
      p.y += vy + GRAVITY * this.material.gravity * dtScale + verticalBias;
      p.z += vz + curlMemory + edgeFlutter;
    }
  }

  applyGrab(dt) {
    if (!this.grab || !this.grab.target) return;

    const p = this.particles[this.grab.index];
    const raw = this.grab.target;
    if (!this.grab.smoothedTarget) {
      this.grab.smoothedTarget = { ...raw };
    }

    // Smooth the pointer target in world space. This removes sub-frame jitter
    // from the browser pointer stream while still following decisive drags.
    const targetBlend = this.clamp(0.30 + dt * 0.10, 0.30, 0.48);
    this.grab.smoothedTarget.x += (raw.x - this.grab.smoothedTarget.x) * targetBlend;
    this.grab.smoothedTarget.y += (raw.y - this.grab.smoothedTarget.y) * targetBlend;
    this.grab.smoothedTarget.z += (raw.z - this.grab.smoothedTarget.z) * targetBlend;

    const t = this.grab.smoothedTarget;
    const prev = this.grab.prevTarget || t;
    const impulse = {
      x: this.clamp((t.x - prev.x) * 0.46, -0.18, 0.18),
      y: this.clamp((t.y - prev.y) * 0.46, -0.18, 0.18),
      z: this.clamp((t.z - prev.z) * 0.46, -0.16, 0.16)
    };
    this.grab.worldImpulse = impulse;
    this.grab.prevTarget = { ...t };

    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const dz = t.z + this.grab.zOffset - p.z;

    const grabPull = 0.48 * this.material.grabPull;
    p.x += dx * grabPull;
    p.y += dy * grabPull;
    p.z += dz * grabPull;
    p.ox = p.x - impulse.x * 0.24;
    p.oy = p.y - impulse.y * 0.24;
    p.oz = p.z - impulse.z * 0.24;
    p.grabBias = 1;

    const grabCx = this.grab.index % this.cols;
    const grabCy = Math.floor(this.grab.index / this.cols);
    const radiusSq = 2.15;

    for (let i = 0; i < this.particles.length; i++) {
      if (i === this.grab.index) continue;
      const q = this.particles[i];
      if (q.pinned) continue;

      const qx = i % this.cols;
      const qy = Math.floor(i / this.cols);
      const gridDx = (qx - grabCx) * this.invCols * CONFIG.W;
      const gridDy = (qy - grabCy) * this.invRows * CONFIG.H;
      const radialSq = gridDx * gridDx + gridDy * gridDy;
      if (radialSq > radiusSq) continue;

      // Wider cubic falloff spreads force into the receipt without a visible
      // hard ring around the grabbed particle.
      const falloff = Math.pow(1 - radialSq / radiusSq, 3);
      const lift = dz * 0.10 * falloff;
      const torsion = this.clamp((impulse.x * gridDy - impulse.y * gridDx) * 0.30, -0.10, 0.10) * falloff;
      const inPlanePull = 0.045 * falloff;

      q.x += impulse.x * inPlanePull;
      q.y += impulse.y * inPlanePull;
      q.z += lift + torsion;
      q.bendBias += torsion * 0.13;

      // Local damping around the grabbed area absorbs chatter but leaves the
      // rest of the receipt free to swing.
      const damping = 0.055 * falloff;
      q.ox += (q.x - q.ox) * damping;
      q.oy += (q.y - q.oy) * damping;
      q.oz += (q.z - q.oz) * damping;
    }
  }

  solveConstraintXPBD(c, dtSq) {
    const a = this.particles[c.a];
    const b = this.particles[c.b];
    const ax = a.x;
    const ay = a.y;
    const az = a.z;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    const len = Math.hypot(dx, dy, dz);
    if (len < 1e-9) return;

    const w1 = (!a.pinned && (!this.grab || this.grab.index !== c.a)) ? a.invMass : 0;
    const w2 = (!b.pinned && (!this.grab || this.grab.index !== c.b)) ? b.invMass : 0;
    const w = w1 + w2;
    if (w === 0) return;

    const C = len - c.rest;
    
    // XPBD Alpha tilde = compliance / dt^2
    const alphaTilde = c.compliance / dtSq;
    
    // Compute Lagrange multiplier increment
    const dLambda = (-C - alphaTilde * c.lambda) / (w + alphaTilde);
    c.lambda += dLambda;
    
    const px = (dx / len) * dLambda;
    const py = (dy / len) * dLambda;
    const pz = (dz / len) * dLambda;

    if (w1 > 0) {
      a.x += px * w1;
      a.y += py * w1;
      a.z += pz * w1;
    }
    if (w2 > 0) {
      b.x -= px * w2;
      b.y -= py * w2;
      b.z -= pz * w2;
    }
  }

  solveBendingMemory() {
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        const c = this.particles[this.idx(x, y)];
        if (c.pinned || c.grabBias > 0.5) continue;
        const left = this.particles[this.idx(x - 1, y)];
        const right = this.particles[this.idx(x + 1, y)];
        const up = this.particles[this.idx(x, y - 1)];
        const down = this.particles[this.idx(x, y + 1)];

        const avgZx = (left.z + right.z) * 0.5;
        const avgZy = (up.z + down.z) * 0.5;
        const targetZ = c.iz + (avgZx - c.iz) * 0.55 + (avgZy - c.iz) * 0.35 + c.bendBias;
        c.z += (targetZ - c.z) * 0.065 * this.material.bendMemory;

        const avgX = (left.x + right.x + up.x + down.x) * 0.25;
        c.x += (avgX - c.x) * 0.006 * this.material.bendMemory;
      }
    }
  }

  buildSpatialHash() {
    this.spatialGrid = new Map();
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.gx = Math.floor(p.x / this.cellSize);
      p.gy = Math.floor(p.y / this.cellSize);
      p.gz = Math.floor(p.z / this.cellSize);
      const key = `${p.gx},${p.gy},${p.gz}`;
      let bucket = this.spatialGrid.get(key);
      if (!bucket) {
        bucket = [];
        this.spatialGrid.set(key, bucket);
      }
      bucket.push(i);
    }
  }

  solveSelfCollision() {
    this.collisionPasses++;
    const collisionRadius = this.selfCollisionRadius * this.material.selfCollision;
    const collisionRadiusSq = collisionRadius * collisionRadius;
    const stiffness = this.clamp(this.material.collisionStiffness ?? 0.78, 0.2, 1.0);
    const damping = this.clamp(this.material.contactDamping ?? 0.18, 0, 0.6);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      for (let ix = -1; ix <= 1; ix++) {
        for (let iy = -1; iy <= 1; iy++) {
          for (let iz = -1; iz <= 1; iz++) {
            const bucket = this.spatialGrid.get(`${p.gx + ix},${p.gy + iy},${p.gz + iz}`);
            if (!bucket) continue;

            for (let k = 0; k < bucket.length; k++) {
              const j = bucket[k];
              if (j <= i) continue;
              if (this.areNeighbors(i, j)) continue;

              const aCoord = this.coords(i);
              const bCoord = this.coords(j);
              const topoDx = Math.abs(aCoord.x - bCoord.x);
              const topoDy = Math.abs(aCoord.y - bCoord.y);
              if (topoDx + topoDy < 4) continue;

              const q = this.particles[j];
              const dx = p.x - q.x;
              const dy = p.y - q.y;
              const dz = p.z - q.z;
              const distSq = dx * dx + dy * dy + dz * dz;
              if (distSq <= 1e-10 || distSq >= collisionRadiusSq) continue;

              const dist = Math.sqrt(distSq);
              const nx = dx / dist;
              const ny = dy / dist;
              const nz = dz / dist;
              const overlap = collisionRadius - dist;
              const push = overlap * stiffness;

              const pFree = p.pinned ? 0 : (this.grab && this.grab.index === i ? 0.35 : 1);
              const qFree = q.pinned ? 0 : (this.grab && this.grab.index === j ? 0.35 : 1);
              const total = pFree + qFree;
              if (total === 0) continue;

              const pa = pFree / total;
              const qa = qFree / total;
              const pushX = nx * push;
              const pushY = ny * push;
              const pushZ = nz * push;

              p.x += pushX * pa;
              p.y += pushY * pa;
              p.z += pushZ * pa;
              q.x -= pushX * qa;
              q.y -= pushY * qa;
              q.z -= pushZ * qa;

              // Contact friction: remove some closing velocity along the contact
              // normal so folded paper feels like it catches instead of ghosting.
              const pvx = p.x - p.ox;
              const pvy = p.y - p.oy;
              const pvz = p.z - p.oz;
              const qvx = q.x - q.ox;
              const qvy = q.y - q.oy;
              const qvz = q.z - q.oz;
              const relNormal = (pvx - qvx) * nx + (pvy - qvy) * ny + (pvz - qvz) * nz;
              if (relNormal < 0) {
                const damp = relNormal * damping;
                if (pFree > 0) {
                  p.ox += nx * damp * pa;
                  p.oy += ny * damp * pa;
                  p.oz += nz * damp * pa;
                }
                if (qFree > 0) {
                  q.ox -= nx * damp * qa;
                  q.oy -= ny * damp * qa;
                  q.oz -= nz * damp * qa;
                }
              }

              p.collisionHits++;
              q.collisionHits++;
              this.collisionPairs++;
            }
          }
        }
      }
    }
  }


  pointTriangleClosest(p, a, b, c) {
    const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
    const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
    const ap = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
    const d1 = ab.x * ap.x + ab.y * ap.y + ab.z * ap.z;
    const d2 = ac.x * ap.x + ac.y * ap.y + ac.z * ap.z;
    if (d1 <= 0 && d2 <= 0) return { x: a.x, y: a.y, z: a.z, u: 1, v: 0, w: 0 };

    const bp = { x: p.x - b.x, y: p.y - b.y, z: p.z - b.z };
    const d3 = ab.x * bp.x + ab.y * bp.y + ab.z * bp.z;
    const d4 = ac.x * bp.x + ac.y * bp.y + ac.z * bp.z;
    if (d3 >= 0 && d4 <= d3) return { x: b.x, y: b.y, z: b.z, u: 0, v: 1, w: 0 };

    const vc = d1 * d4 - d3 * d2;
    if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      const v = d1 / (d1 - d3);
      return { x: a.x + ab.x * v, y: a.y + ab.y * v, z: a.z + ab.z * v, u: 1 - v, v, w: 0 };
    }

    const cp = { x: p.x - c.x, y: p.y - c.y, z: p.z - c.z };
    const d5 = ab.x * cp.x + ab.y * cp.y + ab.z * cp.z;
    const d6 = ac.x * cp.x + ac.y * cp.y + ac.z * cp.z;
    if (d6 >= 0 && d5 <= d6) return { x: c.x, y: c.y, z: c.z, u: 0, v: 0, w: 1 };

    const vb = d5 * d2 - d1 * d6;
    if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      const w = d2 / (d2 - d6);
      return { x: a.x + ac.x * w, y: a.y + ac.y * w, z: a.z + ac.z * w, u: 1 - w, v: 0, w };
    }

    const va = d3 * d6 - d5 * d4;
    if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
      const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
      return { x: b.x + (c.x - b.x) * w, y: b.y + (c.y - b.y) * w, z: b.z + (c.z - b.z) * w, u: 0, v: 1 - w, w };
    }

    const denom = 1 / (va + vb + vc);
    const v = vb * denom;
    const w = vc * denom;
    return { x: a.x + ab.x * v + ac.x * w, y: a.y + ab.y * v + ac.y * w, z: a.z + ab.z * v + ac.z * w, u: 1 - v - w, v, w };
  }

  solveVertexTriangleCollision() {
    if (!this.surfaceCollisionEnabled) return;
    const policy = this.surfacePersistencePolicy;
    const cachePressure = this.clamp01((this.surfaceContactCache.size - policy.pressureStartsAt) / Math.max(1, policy.pressureFullAt - policy.pressureStartsAt));
    this.surfacePasses++;
    const threshold = this.surfaceCollisionRadius * this.material.selfCollision;
    const thresholdSq = threshold * threshold;
    const stiffness = this.clamp((this.material.collisionStiffness ?? 0.78) * 0.42, 0.18, 0.48);
    const damping = this.clamp((this.material.contactDamping ?? 0.18) * 0.55, 0, 0.28);
    const vertexStride = this.surfaceCollisionMode === 'full' ? 1 : 2;

    this.buildSurfaceBroadphase();

    for (let vi = 0; vi < this.particles.length; vi += vertexStride) {
      const p = this.particles[vi];
      if (p.pinned) continue;
      const candidates = this.nearbyTrianglesForParticle(p);
      this.surfaceTriangleCandidates += candidates.length;

      for (const tri of candidates) {
        if (tri.includes(vi) || tri.some(t => this.areTopologicallyNear(vi, t, 1))) continue;
        const a = this.particles[tri[0]], b = this.particles[tri[1]], c = this.particles[tri[2]];
        const closest = this.pointTriangleClosest(p, a, b, c);
        const dx = p.x - closest.x, dy = p.y - closest.y, dz = p.z - closest.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq <= 1e-10 || distSq >= thresholdSq) continue;
        const dist = Math.sqrt(distSq);
        const nx = dx / dist, ny = dy / dist, nz = dz / dist;
        const contactKey = `vt:${vi}:${tri[0]}:${tri[1]}:${tri[2]}`;
        const persisted = this.surfaceContactCache.get(contactKey);
        if (persisted) this.surfaceCacheHits++;
        else this.surfaceCacheMisses++;
        const persistBoost = persisted ? 1.18 : 1.0;
        const push = (threshold - dist) * stiffness * persistBoost;
        const pShare = 0.58;
        const tShare = 0.42;
        p.x += nx * push * pShare; p.y += ny * push * pShare; p.z += nz * push * pShare;
        const bary = [closest.u, closest.v, closest.w];
        [a, b, c].forEach((q, qi) => {
          if (q.pinned) return;
          const share = bary[qi] * tShare;
          q.x -= nx * push * share; q.y -= ny * push * share; q.z -= nz * push * share;
        });
        const pvx = p.x - p.ox, pvy = p.y - p.oy, pvz = p.z - p.oz;
        const triVx = (a.x - a.ox) * closest.u + (b.x - b.ox) * closest.v + (c.x - c.ox) * closest.w;
        const triVy = (a.y - a.oy) * closest.u + (b.y - b.oy) * closest.v + (c.y - c.oy) * closest.w;
        const triVz = (a.z - a.oz) * closest.u + (b.z - b.oz) * closest.v + (c.z - c.oz) * closest.w;
        const relNormal = (pvx - triVx) * nx + (pvy - triVy) * ny + (pvz - triVz) * nz;
        if (relNormal < 0) {
          const damp = relNormal * damping;
          p.ox += nx * damp * pShare; p.oy += ny * damp * pShare; p.oz += nz * damp * pShare;
        }
        p.collisionHits++;
        this.vertexTriPairs++;
        this.acceptedVertexTriContacts++;
        this.surfaceCacheWrites++;
        if (persisted) this.surfaceCacheRefreshes++;
        else this.surfaceCacheNewEntries++;
        const retentionAge = persisted
          ? Math.max(policy.minRetentionAge, policy.pressureRefreshAge - Math.round(cachePressure * policy.pressureDecayExtraAge))
          : Math.max(policy.minRetentionAge, policy.baseRetentionAge - Math.round(cachePressure * policy.pressureDecayExtraAge));
        this.surfaceContactCache.set(contactKey, { age: retentionAge });
      }
    }
  }

  solveEdgeEdgeCollision() {
    if (this.surfaceCollisionMode !== 'full') return;
    const policy = this.surfacePersistencePolicy;
    const cachePressure = this.clamp01((this.surfaceContactCache.size - policy.pressureStartsAt) / Math.max(1, policy.pressureFullAt - policy.pressureStartsAt));
    const threshold = this.surfaceCollisionRadius * 0.82 * this.material.selfCollision;
    const thresholdSq = threshold * threshold;
    const stiffness = this.clamp((this.material.collisionStiffness ?? 0.78) * 0.34, 0.12, 0.38);
    const seenPairs = new Set();

    for (let edgeIndex = 0; edgeIndex < this.surfaceEdges.length; edgeIndex++) {
      const edge = this.surfaceEdges[edgeIndex];
      const a = this.particles[edge[0]];
      const b = this.particles[edge[1]];
      const gx = Math.floor(((a.x + b.x) * 0.5) / this.surfaceCellSize);
      const gy = Math.floor(((a.y + b.y) * 0.5) / this.surfaceCellSize);
      const gz = Math.floor(((a.z + b.z) * 0.5) / this.surfaceCellSize);

      for (let ix = -1; ix <= 1; ix++) {
        for (let iy = -1; iy <= 1; iy++) {
          for (let iz = -1; iz <= 1; iz++) {
            const bucket = this.edgeGrid?.get(`${gx + ix},${gy + iy},${gz + iz}`);
            if (!bucket) continue;
            for (const otherIndex of bucket) {
              if (otherIndex <= edgeIndex) continue;
              this.surfaceEdgeCandidates++;
              const other = this.surfaceEdges[otherIndex];
              if (edge.some(i => other.includes(i))) continue;
              if (edge.some(i => other.some(j => this.areTopologicallyNear(i, j, 1)))) continue;
              const pairKey = `${edgeIndex}:${otherIndex}`;
              if (seenPairs.has(pairKey)) continue;
              seenPairs.add(pairKey);

              const c = this.particles[other[0]];
              const d = this.particles[other[1]];
              const closest = this.segmentSegmentClosest(a, b, c, d);
              const dx = closest.ax - closest.bx, dy = closest.ay - closest.by, dz = closest.az - closest.bz;
              const distSq = dx * dx + dy * dy + dz * dz;
              if (distSq <= 1e-10 || distSq >= thresholdSq) continue;
              const dist = Math.sqrt(distSq);
              const nx = dx / dist, ny = dy / dist, nz = dz / dist;
              const contactKey = `ee:${this.edgeKey(edge[0], edge[1])}:${this.edgeKey(other[0], other[1])}`;
              const persisted = this.surfaceContactCache.get(contactKey);
              if (persisted) this.surfaceCacheHits++;
              else this.surfaceCacheMisses++;
              const push = (threshold - dist) * stiffness * (persisted ? 1.12 : 1.0);
              const weights = [1 - closest.s, closest.s, 1 - closest.t, closest.t];
              const pts = [a, b, c, d];
              pts.forEach((q, qi) => {
                if (q.pinned) return;
                const sign = qi < 2 ? 1 : -1;
                const share = weights[qi] * 0.5;
                q.x += nx * push * share * sign;
                q.y += ny * push * share * sign;
                q.z += nz * push * share * sign;
              });
              this.edgeEdgePairs++;
              this.acceptedEdgeEdgeContacts++;
              this.surfaceCacheWrites++;
              if (persisted) this.surfaceCacheRefreshes++;
              else this.surfaceCacheNewEntries++;
              const retentionAge = persisted
                ? Math.max(policy.minRetentionAge, policy.pressureRefreshAge - Math.round(cachePressure * policy.pressureDecayExtraAge))
                : Math.max(policy.minRetentionAge, policy.baseRetentionAge - Math.round(cachePressure * policy.pressureDecayExtraAge));
              this.surfaceContactCache.set(contactKey, { age: retentionAge });
            }
          }
        }
      }
    }
  }

  decaySurfaceContactCache() {
    const policy = this.surfacePersistencePolicy;
    const pressureSpan = Math.max(1, policy.pressureFullAt - policy.pressureStartsAt);
    const cachePressure = this.clamp01((this.surfaceContactCache.size - policy.pressureStartsAt) / pressureSpan);
    this.persistedSurfaceContacts = 0;
    this.surfaceCacheSizeBeforeDecay = this.surfaceContactCache.size;
    this.surfaceCacheAgeEvictions = 0;
    this.surfaceCacheCapEvictions = 0;
    this.surfacePersistenceSkips = 0;
    this.surfacePersistenceBudgetPressure = Math.max(0, this.surfaceContactCache.size - policy.pressureStartsAt);
    const extraAgeDecay = Math.round(cachePressure * policy.pressureDecayExtraAge);
    for (const [key, contact] of this.surfaceContactCache) {
      contact.age -= 1 + extraAgeDecay;
      const expired = contact.age <= 0;
      const overCap = this.surfaceContactCache.size > policy.maxCacheSize;
      if (expired || overCap) {
        if (expired) this.surfaceCacheAgeEvictions++;
        if (overCap) {
          this.surfaceCacheCapEvictions++;
          this.surfacePersistenceSkips++;
        }
        this.surfaceContactCache.delete(key);
      } else {
        this.persistedSurfaceContacts++;
      }
    }
    this.surfaceCacheSizeAfterDecay = this.surfaceContactCache.size;
  }


  enforcePinnedRow() {
    for (let x = 0; x < this.cols; x++) {
      const p = this.particles[this.idx(x, 0)];
      p.x = p.ix;
      p.y = p.iy;
      p.z = p.iz;
      p.ox = p.x;
      p.oy = p.y;
      p.oz = p.z;
    }
  }

  step(dt) {
    // Run at effectively 2x speed to make up for only 1 step per frame
    const effectiveDt = dt * 1.6;
    this.time += effectiveDt;
    this.integrate(effectiveDt);
    this.applyGrab(effectiveDt);

    const dtScale = this.clamp(effectiveDt, 0.6, 2.5);
    const subDt = dtScale / CONFIG.ITERATIONS;
    const subDtSq = subDt * subDt;

    // Reset XPBD lambdas for this frame
    for (let c = 0; c < this.constraints.length; c++) {
      this.constraints[c].lambda = 0;
    }

    this.collisionPasses = 0;
    this.collisionPairs = 0;
    this.surfacePasses = 0;
    this.vertexTriPairs = 0;
    this.edgeEdgePairs = 0;
    this.acceptedVertexTriContacts = 0;
    this.acceptedEdgeEdgeContacts = 0;
    this.surfaceTriangleCandidates = 0;
    this.surfaceEdgeCandidates = 0;
    this.surfaceCacheHits = 0;
    this.surfaceCacheMisses = 0;
    this.surfaceCacheWrites = 0;
    this.surfaceCacheRefreshes = 0;
    this.surfaceCacheNewEntries = 0;
    this.surfaceTriangleGridEntries = 0;
    this.surfaceEdgeGridEntries = 0;
    this.surfacePersistenceBudgetPressure = 0;
    this.surfaceCacheSizeBeforeDecay = this.surfaceContactCache.size;
    this.surfaceCacheSizeAfterDecay = this.surfaceContactCache.size;
    this.surfaceCacheAgeEvictions = 0;
    this.surfaceCacheCapEvictions = 0;
    this.surfacePersistenceSkips = 0;
    this.persistedSurfaceContacts = this.surfaceContactCache.size;

    // Fast-tunneling mitigation is handled by swept surface broadphase bounds.
    // Keep one solver sweep per frame so the experimental full mode remains usable.
    const surfaceSubsteps = 1;
    for (let surfaceSubstep = 0; surfaceSubstep < surfaceSubsteps; surfaceSubstep++) {
      for (let iter = 0; iter < CONFIG.ITERATIONS; iter++) {
      for (let c = 0; c < this.constraints.length; c++) {
        this.solveConstraintXPBD(this.constraints[c], subDtSq);
      }
      this.solveBendingMemory();

      // Rebuild the spatial hash on collision passes. Constraints have moved
      // particles since the last pass, so a stale hash makes self-contact miss
      // exactly the close folds that need separation.
      if (iter === 2 || iter === 5 || iter === CONFIG.ITERATIONS - 1) {
        this.buildSpatialHash();
        this.solveSelfCollision();
        if (iter === CONFIG.ITERATIONS - 1) {
          this.solveVertexTriangleCollision();
          this.solveEdgeEdgeCollision();
        }
      }
        this.enforcePinnedRow();
      }
    }
    this.decaySurfaceContactCache();
  }
}
