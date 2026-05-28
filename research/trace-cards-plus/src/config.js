// config.js — central reactive state, schema, presets, URL (de)serialization.

export const PATTERNS = ['Pyramid', 'Diamond', 'Helix', 'Torus', 'Lissajous', 'Galaxy'];

// The single source of truth. Mutated live by the panel; read by the renderer.
export const state = {
  // Camera
  fov: 49, distance: 9.4,
  // Layout
  cardCount: 7, gap: 1.05, cardSize: 4.4, planeOpacity: 0.42,
  // Motion
  pattern: 'Pyramid',
  elementCount: 6,
  orbitRadius: 0.8, orbitSpeed: 1.2, orbitDepth: 0.18,
  trailSegments: 22, trailWidth: 1.0,
  overallSpeed: 1.0,
  // Formation
  formationRotate: true, formationSpin: 18,
  tiltAmount: 0.5, tiltLerp: 0.12, autoSpinX: 2, autoSpinY: 6,
  // Visual
  bgColor: '#070708',
  lineOpacity: 0.92, ghostOpacity: 0.5, noise: 0.18,
  glowStrength: 0.85, glowRadius: 0.55, glowThreshold: 0.18,
  showCards: true, showTrails: true, showNodes: true, showStatic: true,
  colorA: '#0BE0A0', colorB: '#00A8A5',
  hueShift: 0, saturation: 1.0,
  // Lighting / mood
  vignette: 0.55, grain: 0.06,
  // FX
  audioReactive: false, audioGain: 1.4,
};

// Schema drives the panel + URL packing. type: range|seg|select|color
export const SCHEMA = [
  { group: 'Camera', items: [
    { k: 'fov', label: 'Field of View', min: 20, max: 90, step: 1 },
    { k: 'distance', label: 'Distance', min: 4, max: 22, step: 0.1 },
  ]},
  { group: 'Pattern', items: [
    { k: 'pattern', label: 'Trace Pattern', type: 'select', options: PATTERNS },
    { k: 'elementCount', label: 'Element Count', min: 1, max: 16, step: 1 },
    { k: 'orbitRadius', label: 'Orbit Radius', min: 0, max: 2.5, step: 0.01 },
    { k: 'orbitSpeed', label: 'Orbit Speed', min: 0, max: 4, step: 0.01 },
    { k: 'orbitDepth', label: 'Orbit Depth', min: 0, max: 1.5, step: 0.01 },
    { k: 'overallSpeed', label: 'Overall Speed', min: 0, max: 3, step: 0.01 },
  ]},
  { group: 'Trails', items: [
    { k: 'showTrails', label: 'Show Trails', type: 'seg' },
    { k: 'trailSegments', label: 'Trail Segments', min: 2, max: 64, step: 1 },
    { k: 'trailWidth', label: 'Trail Width', min: 0.3, max: 4, step: 0.1 },
    { k: 'showNodes', label: 'Show Nodes', type: 'seg' },
  ]},
  { group: 'Cards', items: [
    { k: 'showCards', label: 'Show Cards', type: 'seg' },
    { k: 'cardCount', label: 'Card Count', min: 1, max: 16, step: 1 },
    { k: 'cardSize', label: 'Card Size', min: 2, max: 8, step: 0.1 },
    { k: 'gap', label: 'Card Gap', min: 0.2, max: 3, step: 0.01 },
    { k: 'planeOpacity', label: 'Plane Opacity', min: 0, max: 1, step: 0.01 },
    { k: 'showStatic', label: 'Static Mesh', type: 'seg' },
  ]},
  { group: 'Formation', items: [
    { k: 'formationRotate', label: 'Auto Rotate', type: 'seg' },
    { k: 'formationSpin', label: 'Spin Speed', min: 0, max: 90, step: 1 },
    { k: 'tiltAmount', label: 'Pointer Tilt', min: 0, max: 2, step: 0.01 },
    { k: 'tiltLerp', label: 'Tilt Lerp', min: 0.02, max: 0.4, step: 0.01 },
  ]},
  { group: 'Color', items: [
    { k: 'colorA', label: 'Primary', type: 'color' },
    { k: 'colorB', label: 'Secondary', type: 'color' },
    { k: 'hueShift', label: 'Hue Shift', min: -180, max: 180, step: 1 },
    { k: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.01 },
  ]},
  { group: 'Render', items: [
    { k: 'lineOpacity', label: 'Line Opacity', min: 0, max: 1, step: 0.01 },
    { k: 'ghostOpacity', label: 'Ghost Opacity', min: 0, max: 1, step: 0.01 },
    { k: 'glowStrength', label: 'Bloom', min: 0, max: 2.5, step: 0.01 },
    { k: 'glowRadius', label: 'Bloom Radius', min: 0, max: 1.5, step: 0.01 },
    { k: 'glowThreshold', label: 'Bloom Thresh', min: 0, max: 1, step: 0.01 },
    { k: 'noise', label: 'Noise Drift', min: 0, max: 1, step: 0.01 },
    { k: 'vignette', label: 'Vignette', min: 0, max: 1.5, step: 0.01 },
    { k: 'grain', label: 'Film Grain', min: 0, max: 0.3, step: 0.005 },
  ]},
  { group: 'Audio', items: [
    { k: 'audioReactive', label: 'Reactive (mic)', type: 'seg' },
    { k: 'audioGain', label: 'Audio Gain', min: 0.2, max: 4, step: 0.1 },
  ]},
];

// Curated presets — each exceeds a "look" from the original + adds new ones.
export const PRESETS = {
  'Pyramid Trace': { pattern: 'Pyramid', colorA: '#00A8A5', colorB: '#0BE0A0', orbitRadius: 0.8,
    orbitSpeed: 1.2, elementCount: 6, trailSegments: 18, glowStrength: 0.7, formationSpin: 18, distance: 9.4, fov: 49 },
  'Diamond Sculpt': { pattern: 'Diamond', colorA: '#0BE0A0', colorB: '#7df9ff', orbitRadius: 1.0,
    orbitSpeed: 0.9, elementCount: 8, orbitDepth: 0.45, trailSegments: 26, glowStrength: 0.9, distance: 10 },
  'Helix Bloom': { pattern: 'Helix', colorA: '#ff5db1', colorB: '#7b61ff', orbitRadius: 1.2, orbitSpeed: 1.6,
    orbitDepth: 0.9, elementCount: 10, trailSegments: 40, glowStrength: 1.4, glowRadius: 0.8, formationSpin: 26 },
  'Torus Field': { pattern: 'Torus', colorA: '#ffcf5b', colorB: '#ff5b5b', orbitRadius: 1.4, orbitSpeed: 1.0,
    orbitDepth: 0.6, elementCount: 12, trailSegments: 30, glowStrength: 1.1, distance: 12, fov: 56 },
  'Lissajous': { pattern: 'Lissajous', colorA: '#5bd1ff', colorB: '#0BE0A0', orbitRadius: 1.6, orbitSpeed: 2.0,
    orbitDepth: 1.0, elementCount: 7, trailSegments: 48, trailWidth: 1.4, glowStrength: 1.2, formationSpin: 10 },
  'Galaxy Drift': { pattern: 'Galaxy', colorA: '#a78bfa', colorB: '#22d3ee', orbitRadius: 2.0, orbitSpeed: 0.6,
    orbitDepth: 0.4, elementCount: 16, trailSegments: 22, glowStrength: 1.6, glowRadius: 0.9, noise: 0.4,
    showCards: false, distance: 14, fov: 62 },
};

// ---- URL state (compact) ----
const URLKEYS = Object.keys(state);
export function encodeState() {
  const o = {};
  for (const k of URLKEYS) o[k] = state[k];
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
export function decodeState(s) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(s))));
    Object.assign(state, o);
    return true;
  } catch (e) { return false; }
}
export function applyPreset(name) {
  const p = PRESETS[name];
  if (p) Object.assign(state, p);
}
export function loadFromURL() {
  const h = new URLSearchParams(location.search).get('s');
  if (h) return decodeState(h);
  return false;
}
