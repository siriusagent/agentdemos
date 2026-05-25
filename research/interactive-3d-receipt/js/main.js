import { CONFIG } from './config.js?v=5';
import { makeReceiptTexture } from './texture.js?v=5';
import { PhysicsEngine } from './physics.js?v=14';
import { Renderer } from './renderer.js?v=6';
import { UI } from './ui.js?v=5';

const params = new URLSearchParams(window.location.search);
const debugEnabled = params.get('debug') === '1';
const shadowParam = params.get('shadow');
const materialParam = params.get('material');
const surfaceParam = params.get('surface');
const logEnabled = params.get('log') === '1' || params.get('debug') === '1';

const canvas = document.getElementById('scene');
const renderer = new Renderer(canvas);
renderer.setShadowQuality(shadowParam || 'high');
const physics = new PhysicsEngine();
physics.setSurfaceCollisionMode(surfaceParam === 'full' ? 'full' : surfaceParam === 'vt' ? 'vt' : 'off');
const ui = new UI(renderer);
const statsBadge = document.getElementById('statsBadge');

const textures = {
  front: makeReceiptTexture(false),
  back: makeReceiptTexture(true)
};

const debugPanel = debugEnabled ? createDebugPanel() : null;
const debugMetrics = {
  fps: 0,
  frameMs: 0,
  physicsMs: 0,
  renderMs: 0,
  dt: 1,
  frames: 0,
  lastUpdate: 0
};

physics.applyMaterialPreset(materialParam || 'receipt');
physics.reset(80);
const interactionLogger = createInteractionLogger();
document.documentElement.dataset.receiptLogger = logEnabled ? 'enabled' : 'off';

window.addEventListener('resize', () => renderer.resize(), { passive: true });
renderer.resize();
setupLabControls();


function createInteractionLogger() {
  const maxEvents = 600;
  const samples = [];
  const startedAt = performance.now();
  let lastSampleAt = 0;
  let sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  function snapshot(type, extra = {}) {
    const now = performance.now();
    const entry = {
      t: Number((now - startedAt).toFixed(1)),
      type,
      mode: physics.surfaceCollisionMode || 'off',
      material: physics.activeMaterial || 'receipt',
      shadow: renderer.shadowQuality || 'high',
      fps: debugMetrics.fps,
      frameMs: Number(debugMetrics.frameMs.toFixed(2)),
      physicsMs: Number(debugMetrics.physicsMs.toFixed(2)),
      contactPairs: physics.collisionPairs || 0,
      contactPasses: physics.collisionPasses || 0,
      vertexTriPairs: physics.vertexTriPairs || 0,
      edgeEdgePairs: physics.edgeEdgePairs || 0,
      surfacePasses: physics.surfacePasses || 0,
      persistedContacts: physics.persistedSurfaceContacts || 0,
      surfaceTriangleCandidates: physics.surfaceTriangleCandidates || 0,
      surfaceEdgeCandidates: physics.surfaceEdgeCandidates || 0,
      acceptedVertexTriContacts: physics.acceptedVertexTriContacts || 0,
      acceptedEdgeEdgeContacts: physics.acceptedEdgeEdgeContacts || 0,
      surfaceCacheHits: physics.surfaceCacheHits || 0,
      surfaceCacheMisses: physics.surfaceCacheMisses || 0,
      surfaceCacheWrites: physics.surfaceCacheWrites || 0,
      surfaceCacheRefreshes: physics.surfaceCacheRefreshes || 0,
      surfaceCacheNewEntries: physics.surfaceCacheNewEntries || 0,
      surfaceCacheSizeBeforeDecay: physics.surfaceCacheSizeBeforeDecay || 0,
      surfaceCacheSizeAfterDecay: physics.surfaceCacheSizeAfterDecay || 0,
      surfaceCacheAgeEvictions: physics.surfaceCacheAgeEvictions || 0,
      surfaceCacheCapEvictions: physics.surfaceCacheCapEvictions || 0,
      surfacePersistenceSkips: physics.surfacePersistenceSkips || 0,
      surfacePersistenceBudgetPressure: physics.surfacePersistenceBudgetPressure || 0,
      surfaceTriangleGridEntries: physics.surfaceTriangleGridEntries || 0,
      surfaceEdgeGridEntries: physics.surfaceEdgeGridEntries || 0,
      grab: physics.grab ? physics.grab.index : null,
      ...extra
    };
    samples.push(entry);
    if (samples.length > maxEvents) samples.shift();
    return entry;
  }

  function maybeSample(now) {
    if (!logEnabled) return;
    const active = physics.grab || physics.vertexTriPairs || physics.edgeEdgePairs || physics.persistedSurfaceContacts;
    const interval = active ? 160 : 1000;
    if (now - lastSampleAt < interval) return;
    lastSampleAt = now;
    snapshot('sample');
  }

  function record(type, extra = {}) {
    if (!logEnabled) return null;
    return snapshot(type, extra);
  }

  function recordMove(extra = {}) {
    if (!logEnabled) return null;
    const now = performance.now();
    if (now - lastSampleAt < 120) return null;
    lastSampleAt = now;
    return snapshot('grab-move', extra);
  }

  function write() {
    const blob = new Blob([JSON.stringify({
      sessionId,
      url: location.href,
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString(),
      events: samples
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = URL.createObjectURL(blob);
    a.download = `receipt-surface-log-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return samples.length;
  }

  document.receiptSurfaceLog = {
    record,
    recordMove,
    write,
    samples,
    clear() { samples.length = 0; sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
  };

  if (logEnabled) {
    window.addEventListener('keydown', e => {
      if (e.key.toLowerCase() === 'l') {
        record('manual-mark', { key: 'l' });
      }
      if (e.key.toLowerCase() === 's') {
        record('manual-save', { key: 's' });
        write();
      }
    });
    window.addEventListener('beforeunload', () => record('beforeunload'));
    record('session-start', { logEnabled });
  }

  return { record, recordMove, maybeSample, write };
}

function createDebugPanel() {
  const panel = document.createElement('div');
  panel.className = 'debug-panel';
  panel.id = 'debugPanel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = '<b>Diagnostics</b><div class="debug-grid" id="debugGrid"></div>';
  canvas.parentNode.appendChild(panel);
  return panel;
}

function debugRow(label, value) {
  return `<span class="debug-key">${label}</span><span class="debug-value">${value}</span>`;
}

function updateDebugPanel(now) {
  if (!debugPanel || now - debugMetrics.lastUpdate < 160) return;
  debugMetrics.lastUpdate = now;

  const grid = debugPanel.querySelector('#debugGrid');
  const grab = physics.grab ? `#${physics.grab.index}` : 'none';
  const light = `${Math.round(ui.lightAngle)}°`;
  const shadow = renderer.shadowQuality || 'high';
  const material = physics.material?.label || physics.activeMaterial || 'receipt';
  const tris = Math.max(0, (CONFIG.COLS - 1) * (CONFIG.ROWS - 1) * 2);

  grid.innerHTML = [
    debugRow('fps', `${debugMetrics.fps}`),
    debugRow('frame', `${debugMetrics.frameMs.toFixed(2)} ms`),
    debugRow('physics', `${debugMetrics.physicsMs.toFixed(2)} ms`),
    debugRow('render', `${debugMetrics.renderMs.toFixed(2)} ms`),
    debugRow('dt', `${debugMetrics.dt.toFixed(2)}×`),
    debugRow('mesh', `${CONFIG.COLS}×${CONFIG.ROWS}`),
    debugRow('tris', tris.toLocaleString()),
    debugRow('constraints', physics.constraints.length.toLocaleString()),
    debugRow('iterations', CONFIG.ITERATIONS),
    debugRow('contact', `${physics.collisionPairs || 0}/${physics.collisionPasses || 0}`),
    debugRow('surface', physics.surfaceCollisionEnabled ? `${physics.vertexTriPairs || 0}/${physics.edgeEdgePairs || 0}/${physics.surfacePasses || 0}` : 'off'),
    debugRow('cand vt/ee', physics.surfaceCollisionEnabled ? `${physics.surfaceTriangleCandidates || 0}/${physics.surfaceEdgeCandidates || 0}` : 'off'),
    debugRow('accept vt/ee', physics.surfaceCollisionEnabled ? `${physics.acceptedVertexTriContacts || 0}/${physics.acceptedEdgeEdgeContacts || 0}` : 'off'),
    debugRow('persist', physics.surfaceCollisionEnabled ? `${physics.persistedSurfaceContacts || 0}` : 'off'),
    debugRow('cache b→a', physics.surfaceCollisionEnabled ? `${physics.surfaceCacheSizeBeforeDecay || 0}→${physics.surfaceCacheSizeAfterDecay || 0}` : 'off'),
    debugRow('cache hit/miss', physics.surfaceCollisionEnabled ? `${physics.surfaceCacheHits || 0}/${physics.surfaceCacheMisses || 0}` : 'off'),
    debugRow('cache wr/rf/new', physics.surfaceCollisionEnabled ? `${physics.surfaceCacheWrites || 0}/${physics.surfaceCacheRefreshes || 0}/${physics.surfaceCacheNewEntries || 0}` : 'off'),
    debugRow('evict age/cap', physics.surfaceCollisionEnabled ? `${physics.surfaceCacheAgeEvictions || 0}/${physics.surfaceCacheCapEvictions || 0}` : 'off'),
    debugRow('budget', physics.surfaceCollisionEnabled ? `${physics.surfacePersistenceBudgetPressure || 0}/${physics.surfacePersistenceSkips || 0}` : 'off'),
    debugRow('grid tri/edge', physics.surfaceCollisionEnabled ? `${physics.surfaceTriangleGridEntries || 0}/${physics.surfaceEdgeGridEntries || 0}` : 'off'),
    debugRow('mode', physics.surfaceCollisionMode || 'off'),
    debugRow('material', material),
    debugRow('grab', grab),
    debugRow('light', light),
    debugRow('shadow', shadow),
    debugRow('dpr', CONFIG.DPR.toFixed(2))
  ].join('');
}

function setupLabControls() {
  const materialButtons = [...document.querySelectorAll('[data-material]')];
  const shadowButtons = [...document.querySelectorAll('[data-shadow]')];
  const resetButton = document.getElementById('resetPaper');

  const setActive = (buttons, attr, value) => {
    buttons.forEach(button => button.classList.toggle('active', button.dataset[attr] === value));
  };

  materialButtons.forEach(button => {
    button.addEventListener('click', () => {
      const material = physics.applyMaterialPreset(button.dataset.material);
      interactionLogger.record('material-change', { material });
      setActive(materialButtons, 'material', material);
    });
  });

  shadowButtons.forEach(button => {
    button.addEventListener('click', () => {
      renderer.setShadowQuality(button.dataset.shadow);
      interactionLogger.record('shadow-change', { shadow: renderer.shadowQuality });
      setActive(shadowButtons, 'shadow', renderer.shadowQuality);
    });
  });

  resetButton?.addEventListener('click', () => {
    pointerDown = false;
    canvas.classList.remove('grabbing');
    physics.reset(80);
    interactionLogger.record('reset');
  });

  setActive(materialButtons, 'material', physics.activeMaterial || 'receipt');
  setActive(shadowButtons, 'shadow', renderer.shadowQuality || 'high');
}

// Pointer interaction
let pointerDown = false;

function nearestParticle(x, y) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < renderer.projected.length; i++) {
    const p = renderer.projected[i];
    if (!p) continue;
    const dx = p.x - x, dy = p.y - y, d = dx*dx + dy*dy;
    if (d < bd) { bd = d; best = i; }
  }
  return bd < Math.pow(90 * CONFIG.DPR, 2) ? best : -1;
}

canvas.addEventListener('pointerdown', e => {
  if (e.target !== canvas) return;
  const r = canvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * CONFIG.DPR;
  const py = (e.clientY - r.top) * CONFIG.DPR;

  const n = nearestParticle(px, py);
  if (n >= 0) {
    physics.setGrab(n, 0.55, physics.particles[n].z);
    physics.updateGrabTarget(renderer.unproject(px, py, physics.particles[n].z));
    canvas.classList.add('grabbing');
    canvas.setPointerCapture(e.pointerId);
    pointerDown = true;
    interactionLogger.record('grab-start', { index: n, x: Number(px.toFixed(1)), y: Number(py.toFixed(1)) });
  }
});

canvas.addEventListener('pointermove', e => {
  if (!pointerDown || !physics.grab) return;
  const r = canvas.getBoundingClientRect();
  const px = (e.clientX - r.left) * CONFIG.DPR;
  const py = (e.clientY - r.top) * CONFIG.DPR;
  physics.updateGrabTarget(renderer.unproject(px, py, physics.grab.grabZ));
  interactionLogger.recordMove({ index: physics.grab.index, x: Number(px.toFixed(1)), y: Number(py.toFixed(1)) });
});

function release(e) {
  pointerDown = false;
  const released = physics.grab ? physics.grab.index : null;
  physics.releaseGrab();
  interactionLogger.record('grab-end', { index: released });
  canvas.classList.remove('grabbing');
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
}

canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// Render loop
let last = performance.now();
let frames = 0;
let lastFpsTime = last;

function frame(now) {
  const frameStart = performance.now();
  const dt = Math.min(2.5, Math.max(0.35, (now - last) / 16.67));
  last = now;

  const startP = performance.now();
  physics.step(dt);
  const startR = performance.now();
  renderer.render(physics, textures);
  const endR = performance.now();

  debugMetrics.dt = dt;
  debugMetrics.physicsMs = startR - startP;
  debugMetrics.renderMs = endR - startR;
  debugMetrics.frameMs = endR - frameStart;

  frames++;
  if (now - lastFpsTime >= 500) {
    const fps = Math.round((frames * 1000) / (now - lastFpsTime));
    statsBadge.innerText = `${fps} FPS`;
    debugMetrics.fps = fps;
    frames = 0;
    lastFpsTime = now;
  }

  interactionLogger.maybeSample(now);
  updateDebugPanel(now);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
