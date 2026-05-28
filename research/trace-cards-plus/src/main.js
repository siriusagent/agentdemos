// main.js — Three.js renderer for Trace Cards+.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { state, loadFromURL, encodeState } from './config.js';
import { getSculpture } from './sculptures.js';
import { buildPanel } from './panel.js';

// ---------- boot / state ----------
loadFromURL();

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(new THREE.Color(state.bgColor), 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(state.fov, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 1.5, state.distance);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 30;
controls.target.set(0, 0.2, 0);

// group that holds the whole formation (cards + traces) so we can spin/tilt it
const formation = new THREE.Group();
scene.add(formation);

// soft fill lights (cards catch a bit of light when visible)
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const key = new THREE.PointLight(0xffffff, 18, 60); key.position.set(4, 8, 6); scene.add(key);

// ---------- color helpers ----------
const cA = new THREE.Color(), cB = new THREE.Color(), tmpCol = new THREE.Color();
function refreshColors() {
  cA.set(state.colorA); cB.set(state.colorB);
  applyHueSat(cA); applyHueSat(cB);
}
function applyHueSat(c) {
  const hsl = {}; c.getHSL(hsl);
  hsl.h = (hsl.h + state.hueShift / 360 + 1) % 1;
  hsl.s = Math.min(1, hsl.s * state.saturation);
  c.setHSL(hsl.h, hsl.s, hsl.l);
}
function mixColor(t) { return tmpCol.copy(cA).lerp(cB, t); }

// ---------- card / trace builders ----------
let cards = [];          // { z, t, cardMesh, skel(LineSegments), trails:[{line,positions,colors,hist}], nodes(Points) }
const TRAIL_MAX = 64;

function clearFormation() {
  for (const c of cards) {
    c.cardMesh && formation.remove(c.cardMesh);
    c.skel && formation.remove(c.skel);
    c.trails.forEach(tr => formation.remove(tr.line));
    c.nodes && formation.remove(c.nodes);
  }
  cards = [];
}

function buildCards() {
  clearFormation();
  refreshColors();
  const n = Math.round(state.cardCount);
  const span = (n - 1) * state.gap;
  const sc = getSculpture(state.pattern);
  const skeleton = sc.skeleton(state);
  const sz = state.cardSize;

  for (let ci = 0; ci < n; ci++) {
    const z = -span / 2 + ci * state.gap;
    const t = n === 1 ? 0.5 : ci / (n - 1);
    const col = mixColor(t).clone();
    const card = { z, t, trails: [], col };

    // --- card plane (translucent) ---
    const cardGeo = new THREE.PlaneGeometry(sz, sz, 1, 1);
    const cardMat = new THREE.MeshBasicMaterial({
      color: 0x101216, transparent: true, opacity: state.planeOpacity,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardMesh.position.z = z;
    // border frame
    const edges = new THREE.EdgesGeometry(cardGeo);
    const frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: col, transparent: true, opacity: state.ghostOpacity * 0.6,
    }));
    cardMesh.add(frame);
    card.frameMat = frame.material;
    card.cardMat = cardMat;
    formation.add(cardMesh);
    card.cardMesh = cardMesh;

    // --- static skeleton wireframe on this card ---
    const sg = new THREE.BufferGeometry();
    const sverts = [];
    const scl = sz * 0.34;
    for (const [a, b] of skeleton.edges) {
      const pa = skeleton.points[a], pb = skeleton.points[b];
      sverts.push(pa.x * scl, pa.y * scl, pa.z * scl + z, pb.x * scl, pb.y * scl, pb.z * scl + z);
    }
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sverts, 3));
    const skel = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({
      color: col, transparent: true, opacity: Math.min(1, state.ghostOpacity * 1.55),
    }));
    card.skel = skel; card.skelMat = skel.material; card.skelScale = scl;
    formation.add(skel);

    // --- trace trails (one per element) ---
    const ne = Math.round(state.elementCount);
    for (let e = 0; e < ne; e++) {
      const g = new THREE.BufferGeometry();
      const positions = new Float32Array(TRAIL_MAX * 3);
      const colors = new Float32Array(TRAIL_MAX * 3);
      g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      g.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: state.lineOpacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const line = new THREE.Line(g, mat);
      formation.add(line);
      card.trails.push({ line, positions, colors, mat, hist: [], elem: e });
    }

    // --- node points at current head positions ---
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ne * 3), 3));
    ng.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ne * 3), 3));
    const nodes = new THREE.Points(ng, new THREE.PointsMaterial({
      size: sz * 0.03, vertexColors: true, transparent: true, opacity: state.lineOpacity,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    card.nodes = nodes; card.nodeMat = nodes.material;
    formation.add(nodes);

    cards.push(card);
  }
}

// ---------- post processing ----------
let composer, bloom, fxPass;
function buildComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight),
    state.glowStrength, state.glowRadius, state.glowThreshold);
  composer.addPass(bloom);

  fxPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uTime: { value: 0 },
      uVignette: { value: state.vignette },
      uGrain: { value: state.grain },
      uRes: { value: new THREE.Vector2(innerWidth, innerHeight) },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tDiffuse;
      uniform float uTime, uVignette, uGrain;
      float rand(vec2 c){ return fract(sin(dot(c,vec2(12.9898,78.233)))*43758.5453); }
      void main(){
        vec3 col = texture2D(tDiffuse, vUv).rgb;
        // vignette
        vec2 q = vUv - 0.5;
        float vig = smoothstep(0.85, 0.25, length(q));
        col *= mix(1.0, vig, clamp(uVignette,0.0,1.5));
        // film grain
        float g = (rand(vUv + fract(uTime)) - 0.5) * uGrain;
        col += g;
        // subtle chromatic edge
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  fxPass.renderToScreen = true;
  composer.addPass(fxPass);
}
buildComposer();
buildCards();

// ---------- audio reactivity ----------
let audioCtx, analyser, freqData, audioLevel = 0, audioReady = false;
async function initAudio() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    freqData = new Uint8Array(analyser.frequencyBinCount);
    audioReady = true;
    toast('Mic connected · audio reactive ON');
  } catch (e) {
    state.audioReactive = false;
    toast('Mic denied — audio off');
  }
}
function sampleAudio() {
  if (!audioReady || !state.audioReactive) { audioLevel += (0 - audioLevel) * 0.1; return; }
  analyser.getByteFrequencyData(freqData);
  let sum = 0;
  for (let i = 0; i < 32; i++) sum += freqData[i];
  const lvl = (sum / 32 / 255) * state.audioGain;
  audioLevel += (lvl - audioLevel) * 0.3;
}

// ---------- interaction: pointer tilt ----------
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', (e) => {
  pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
  pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
});

// ---------- panel ----------
const panelEl = document.getElementById('panel');
let needRebuild = false;
const REBUILD_KEYS = new Set(['cardCount', 'gap', 'cardSize', 'pattern', 'elementCount']);
const ui = buildPanel(panelEl,
  (k) => { // onChange
    if (REBUILD_KEYS.has(k)) needRebuild = true;
    if (k === 'bgColor') renderer.setClearColor(new THREE.Color(state.bgColor), 1);
    if (k === 'audioReactive' && state.audioReactive && !audioReady) initAudio();
    if (['colorA','colorB','hueShift','saturation'].includes(k)) recolor();
  },
  () => { ui.sync(); fullApply(); } // onPreset
);

function recolor() {
  refreshColors();
  for (const c of cards) {
    c.col.copy(mixColor(c.t));
    c.frameMat.color.copy(c.col);
    c.skelMat.color.copy(c.col);
  }
  renderer.setClearColor(new THREE.Color(state.bgColor), 1);
}

function fullApply() {
  camera.fov = state.fov; camera.updateProjectionMatrix();
  renderer.setClearColor(new THREE.Color(state.bgColor), 1);
  needRebuild = true;
}

// ---------- toolbar ----------
let paused = false, uiHidden = false;
const $ = (id) => document.getElementById(id);
$('btnPause').onclick = () => { paused = !paused; $('btnPause').textContent = paused ? 'Play' : 'Pause'; $('btnPause').classList.toggle('active', paused); };
$('btnReset').onclick = () => { controls.reset(); camera.position.set(0, 1.5, state.distance); controls.target.set(0, 0.2, 0); };
$('btnAudio').onclick = () => {
  state.audioReactive = !state.audioReactive;
  $('btnAudio').textContent = 'Audio · ' + (state.audioReactive ? 'On' : 'Off');
  $('btnAudio').classList.toggle('active', state.audioReactive);
  if (state.audioReactive && !audioReady) initAudio();
  ui.sync();
};
$('btnShot').onclick = () => {
  renderer.render(scene, camera); composer.render();
  const a = document.createElement('a');
  a.download = `trace-cards-${Date.now()}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
  toast('Snapshot saved');
};
$('btnShare').onclick = async () => {
  const url = location.origin + location.pathname + '?s=' + encodeState();
  try { await navigator.clipboard.writeText(url); toast('Shareable link copied'); }
  catch { history.replaceState(null, '', url); toast('Link in address bar'); }
};
$('btnRandom').onclick = randomize;
$('togglePanel').onclick = () => panelEl.classList.toggle('hidden');

function randomize() {
  const P = ['Pyramid', 'Diamond', 'Helix', 'Torus', 'Lissajous', 'Galaxy'];
  state.pattern = P[(Math.random() * P.length) | 0];
  state.elementCount = 3 + (Math.random() * 12 | 0);
  state.orbitRadius = +(Math.random() * 2).toFixed(2);
  state.orbitSpeed = +(0.4 + Math.random() * 2.5).toFixed(2);
  state.orbitDepth = +(Math.random() * 1.2).toFixed(2);
  state.trailSegments = 8 + (Math.random() * 50 | 0);
  state.glowStrength = +(0.4 + Math.random() * 1.6).toFixed(2);
  const h = Math.random(), h2 = (h + 0.2 + Math.random() * 0.4) % 1;
  state.colorA = '#' + new THREE.Color().setHSL(h, 0.8, 0.6).getHexString();
  state.colorB = '#' + new THREE.Color().setHSL(h2, 0.8, 0.55).getHexString();
  state.formationSpin = (Math.random() * 60) | 0;
  ui.sync(); fullApply();
  toast('Randomized · ' + state.pattern);
}

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') { e.preventDefault(); $('btnPause').click(); }
  else if (e.key === 'h' || e.key === 'H') {
    uiHidden = !uiHidden;
    document.querySelectorAll('.brand,.hud,.toolbar,.hint,.panel,.toggle-panel')
      .forEach(el => el.style.opacity = uiHidden ? '0' : '');
  }
  else if (e.key === 'r' || e.key === 'R') randomize();
});

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- resize ----------
function onResize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  fxPass.uniforms.uRes.value.set(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', onResize);
onResize();

// ---------- animation loop ----------
const clock = new THREE.Clock();
let simTime = 0, frames = 0, fpsAcc = 0, lastFps = performance.now();

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!paused) simTime += dt * state.overallSpeed;

  if (needRebuild) { needRebuild = false; buildCards(); }

  sampleAudio();
  const pulse = 1 + audioLevel * 0.8;

  // camera distance ease toward state
  controls.update();

  // formation spin + pointer tilt
  if (state.formationRotate && !paused) formation.rotation.y += dt * (state.formationSpin * Math.PI / 180);
  pointer.x += (pointer.tx - pointer.x) * state.tiltLerp;
  pointer.y += (pointer.ty - pointer.y) * state.tiltLerp;
  formation.rotation.x = pointer.y * state.tiltAmount * 0.35;
  formation.rotation.z = -pointer.x * state.tiltAmount * 0.12;
  formation.position.x += (0 - formation.position.x) * 0.08;
  formation.position.y += (0.38 - formation.position.y) * 0.08;
  formation.scale.setScalar(1.22);
  controls.target.y += (0.28 - controls.target.y) * 0.08;
  camera.position.z += (state.distance - camera.position.z) * 0.08;
  camera.position.y += (1.65 - camera.position.y) * 0.08;
  controls.update();

  const sc = getSculpture(state.pattern);
  const segN = Math.round(state.trailSegments);
  const scl = cards.length ? cards[0].skelScale : 1.5;

  for (const card of cards) {
    // visibility
    card.cardMesh.visible = state.showCards;
    card.skel.visible = state.showStatic;
    card.skelMat.opacity = state.ghostOpacity;
    card.frameMat.opacity = state.ghostOpacity * 0.6;
    card.cardMat.opacity = state.planeOpacity;

    const nodePos = card.nodes.geometry.attributes.position.array;
    const nodeCol = card.nodes.geometry.attributes.color.array;
    card.nodes.visible = state.showNodes;
    card.nodeMat.opacity = state.lineOpacity;
    card.nodeMat.size = state.cardSize * 0.03 * (1 + audioLevel);

    for (let ti = 0; ti < card.trails.length; ti++) {
      const tr = card.trails[ti];
      tr.line.visible = state.showTrails;
      tr.mat.opacity = state.lineOpacity;
      tr.mat.linewidth = state.trailWidth;

      // compute head position in formation space
      const p = sc.orbit(tr.elem, simTime + card.t * 1.5, state);
      const hx = p.x * scl * pulse;
      const hy = p.y * scl * pulse;
      const hz = p.z * scl * pulse + card.z;

      // push to history
      tr.hist.push(hx, hy, hz);
      const maxLen = segN * 3;
      while (tr.hist.length > maxLen) tr.hist.shift();

      // write into buffers with fade
      const count = tr.hist.length / 3;
      const positions = tr.positions, colors = tr.colors;
      for (let k = 0; k < count; k++) {
        positions[k*3] = tr.hist[k*3];
        positions[k*3+1] = tr.hist[k*3+1];
        positions[k*3+2] = tr.hist[k*3+2];
        const f = k / Math.max(1, count - 1); // 0 tail -> 1 head
        const cc = mixColor((card.t + ti / card.trails.length * 0.4) % 1);
        colors[k*3] = cc.r * f;
        colors[k*3+1] = cc.g * f;
        colors[k*3+2] = cc.b * f;
      }
      tr.line.geometry.setDrawRange(0, count);
      tr.line.geometry.attributes.position.needsUpdate = true;
      tr.line.geometry.attributes.color.needsUpdate = true;

      // node head
      nodePos[ti*3] = hx; nodePos[ti*3+1] = hy; nodePos[ti*3+2] = hz;
      const hc = mixColor(card.t);
      nodeCol[ti*3] = hc.r; nodeCol[ti*3+1] = hc.g; nodeCol[ti*3+2] = hc.b;
    }
    card.nodes.geometry.attributes.position.needsUpdate = true;
    card.nodes.geometry.attributes.color.needsUpdate = true;
  }

  // sync post params live
  bloom.strength = state.glowStrength * (1 + audioLevel * 0.5);
  bloom.radius = state.glowRadius;
  bloom.threshold = state.glowThreshold;
  fxPass.uniforms.uTime.value = simTime;
  fxPass.uniforms.uVignette.value = state.vignette;
  fxPass.uniforms.uGrain.value = state.grain;

  // camera fov/distance follow (smooth)
  if (Math.abs(camera.fov - state.fov) > 0.01) { camera.fov += (state.fov - camera.fov) * 0.1; camera.updateProjectionMatrix(); }

  composer.render();

  // fps
  frames++; const now = performance.now();
  if (now - lastFps > 500) {
    const fps = Math.round(frames / ((now - lastFps) / 1000)) || 0;
    lastFps = now;
    $('fps').textContent = Math.min(fps, 120);
    $('info').textContent = `${state.pattern} · ${Math.round(state.cardCount)}×${Math.round(state.elementCount)} traces`;
    frames = 0;
  }
}
tick();
recolor();
ui.sync();

// expose for debugging / automated checks
window.__TC = { state, scene, cards, camera, renderer };
