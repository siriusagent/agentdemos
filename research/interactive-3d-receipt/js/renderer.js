import { CONFIG } from './config.js?v=5';
import { getNormal, dot, normalize } from './math.js?v=1';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true }); // Used for top layer (grab UI)
    
    // Bottom layer: soft receipt shadow.
    this.bgCanvas = document.createElement('canvas');
    this.bgCtx = this.bgCanvas.getContext('2d', { alpha: true });
    
    // Middle layer: textured WebGL receipt mesh.
    this.glCanvas = document.createElement('canvas');
    
    // Insert canvases
    const parent = this.canvas.parentNode;
    [this.bgCanvas, this.glCanvas, this.canvas].forEach((c, i) => {
      if(c !== this.canvas) parent.insertBefore(c, this.canvas);
      c.style.position = 'absolute';
      c.style.top = '0';
      c.style.left = '0';
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.zIndex = i.toString();
      if(c !== this.canvas) c.style.pointerEvents = 'none';
    });
    
    // Set up WebGL
    this.gl = this.glCanvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
    this.initGL();

    this.camera = { d: 45.0, scale: 500, cx: 0, cy: 0 };
    this.light = { x: 0, y: 0, z: 0 };
    this.projected = new Array(CONFIG.COLS * CONFIG.ROWS);
    this.shadowQuality = 'high';
    this.width = 0;
    this.height = 0;
  }

  setShadowQuality(value) {
    const allowed = new Set(['off', 'low', 'medium', 'high']);
    this.shadowQuality = allowed.has(value) ? value : 'high';
  }

  initGL() {
    const gl = this.gl;
    if (!gl) throw new Error('WebGL is unavailable; cannot render the receipt mesh.');
    const vs = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec3 a_shading; // x=shade, y=spec, z=dark
      
      uniform vec2 u_resolution;
      
      varying vec2 v_texCoord;
      varying vec3 v_shading;
      
      void main() {
         vec2 zeroToOne = a_position / u_resolution;
         vec2 zeroToTwo = zeroToOne * 2.0;
         vec2 clipSpace = zeroToTwo - 1.0;
         gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
         
         v_texCoord = a_texCoord;
         v_shading = a_shading;
      }
    `;
    
    const fs = `
      precision mediump float;
      uniform sampler2D u_image;
      
      varying vec2 v_texCoord;
      varying vec3 v_shading;
      
      void main() {
         vec4 color = texture2D(u_image, v_texCoord);
         float shade = v_shading.x;
         float spec = v_shading.y;
         float dark = v_shading.z;
         
         if (shade < 0.95) {
             float intensity = min(0.5, (0.95 - shade) * 0.65);
             color.rgb = mix(color.rgb, vec3(38.0/255.0, 34.0/255.0, 26.0/255.0), intensity);
         } else {
             float intensity = min(0.3, (shade - 0.95) * 0.45);
             color.rgb = mix(color.rgb, vec3(1.0, 1.0, 1.0), intensity);
         }
         
         if (spec > 0.02) {
             color.rgb = mix(color.rgb, vec3(1.0, 1.0, 1.0), spec);
         }
         if (dark > 0.0) {
             color.rgb = mix(color.rgb, vec3(60.0/255.0, 50.0/255.0, 35.0/255.0), 0.15);
         }
         
         // WebGL expects premultiplied alpha or manual blending. Since textures are opaque, we just set alpha to 1.
         // If there are transparent edges, keep original alpha.
         gl_FragColor = vec4(color.rgb, 1.0);
      }
    `;
    
    const compile = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    
    this.program = gl.createProgram();
    gl.attachShader(this.program, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(this.program, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error(`WebGL program link failed: ${gl.getProgramInfoLog(this.program)}`);
    }
    
    this.posLoc = gl.getAttribLocation(this.program, "a_position");
    this.texLoc = gl.getAttribLocation(this.program, "a_texCoord");
    this.shadeLoc = gl.getAttribLocation(this.program, "a_shading");
    this.resLoc = gl.getUniformLocation(this.program, "u_resolution");
    this.imageLoc = gl.getUniformLocation(this.program, "u_image");
    
    this.buffer = gl.createBuffer();
    this.glTex = gl.createTexture();
    this.glTexLoaded = false;
    
    // Source textures are opaque canvas images. Use normal alpha blending for the
    // transparent WebGL canvas itself; do not use premultiplied-alpha blending here.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  checkTexture(textures) {
    if (this.glTexLoaded) return;
    const atlas = document.createElement('canvas');
    atlas.width = textures.front.width * 2;
    atlas.height = textures.front.height;
    const ctx = atlas.getContext('2d');
    ctx.drawImage(textures.front, 0, 0);
    ctx.drawImage(textures.back, textures.front.width, 0);
    
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.glTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.glTexLoaded = true;
  }

  resize() {
    const r = this.canvas.parentNode.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(r.width * CONFIG.DPR));
    this.height = Math.max(1, Math.floor(r.height * CONFIG.DPR));
    
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.bgCanvas.width = this.width;
    this.bgCanvas.height = this.height;
    this.glCanvas.width = this.width;
    this.glCanvas.height = this.height;
    
    this.ctx.setTransform(1,0,0,1,0,0);
    this.bgCtx.setTransform(1,0,0,1,0,0);
    
    this.camera.cx = this.width / 2;
    this.camera.cy = this.height * 0.47;
    this.camera.scale = Math.min(this.width / 8.2, this.height / 7.2);
  }

  project(p) {
    const f = this.camera.scale * this.camera.d / (this.camera.d - p.z);
    return { x: this.camera.cx + p.x * f, y: this.camera.cy + p.y * f, f, z: p.z };
  }

  unproject(sx, sy, z) {
    const f = this.camera.scale * this.camera.d / (this.camera.d - z);
    return { x: (sx - this.camera.cx)/f, y: (sy - this.camera.cy)/f, z };
  }

  render(physics, textures) {
    const { COLS, ROWS, DPR } = CONFIG;
    
    // Clear layers
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.bgCtx.clearRect(0, 0, this.width, this.height);
    
    for (let i = 0; i < physics.particles.length; i++) {
      this.projected[i] = this.project(physics.particles[i]);
    }
    
    this.drawShadow(physics);
    
    const tris = [];
    const idx = (x,y) => y * COLS + x;
    for (let y = 0; y < ROWS-1; y++) {
      for (let x = 0; x < COLS-1; x++) {
        const a = idx(x,y), b = idx(x+1,y), c = idx(x,y+1), d = idx(x+1,y+1);
        this.pushTri(tris, physics.particles, a, b, c);
        this.pushTri(tris, physics.particles, b, d, c);
      }
    }
    
    tris.sort((m,n) => m.depth - n.depth);
    this.drawWebGL(tris, physics.particles, textures);
    this.drawGrabIndicator(physics.grab);
  }

  pushTri(arr, particles, ia, ib, ic) {
    const A = particles[ia], B = particles[ib], C = particles[ic];
    const n = getNormal(A, B, C);
    
    // True perspective view-vector facing check
    const cx = (A.x + B.x + C.x) / 3;
    const cy = (A.y + B.y + C.y) / 3;
    const cz = (A.z + B.z + C.z) / 3;
    const viewVec = { x: cx, y: cy, z: cz - this.camera.d };
    const facing = dot(n, viewVec) < 0;
    
    const renderNormal = facing ? n : { x: -n.x, y: -n.y, z: -n.z };
    const diffuse = Math.max(0, dot(renderNormal, this.light));
    const h = normalize({ x: this.light.x, y: this.light.y, z: this.light.z + 1.0 });
    const spec = Math.pow(Math.max(0, dot(renderNormal, h)), 24) * 0.35;
    const rim = Math.pow(Math.max(0, 1 - Math.abs(n.z)), 1.8) * 0.30;
    
    arr.push({ ia, ib, ic, n: renderNormal, facing, shade: 0.45 + diffuse*0.55 + rim, spec, depth: (A.z+B.z+C.z)/3 });
  }

  drawWebGL(tris, particles, textures) {
    this.checkTexture(textures);
    const gl = this.gl;
    
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(this.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.glTex);
    gl.uniform1i(this.imageLoc, 0);
    gl.uniform2f(this.resLoc, this.width, this.height);
    
    const floatsPerVert = 7;
    const numTris = tris.length;
    if (!this.vData || this.vData.length < numTris * 3 * floatsPerVert) {
      this.vData = new Float32Array(numTris * 3 * floatsPerVert);
    }
    
    let offset = 0;
    for (let i = 0; i < numTris; i++) {
      const t = tris[i];
      const pa = particles[t.ia], pb = particles[t.ib], pc = particles[t.ic];
      const A = this.projected[t.ia], B = this.projected[t.ib], C = this.projected[t.ic];
      
      const uOffset = t.facing ? 0 : 0.5;
      const dark = t.facing ? 0.0 : 1.0;
      
      // Canvas textures upload with the receipt's header at v=0. Keep the mesh
      // UVs in that same orientation; flipping v makes the receipt read upside-down.
      this.writeVertex(A, pa, uOffset, t.shade, t.spec, dark, this.vData, offset); offset += floatsPerVert;
      this.writeVertex(B, pb, uOffset, t.shade, t.spec, dark, this.vData, offset); offset += floatsPerVert;
      this.writeVertex(C, pc, uOffset, t.shade, t.spec, dark, this.vData, offset); offset += floatsPerVert;
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vData, gl.DYNAMIC_DRAW);
    
    const stride = floatsPerVert * 4;
    gl.enableVertexAttribArray(this.posLoc);
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(this.texLoc);
    gl.vertexAttribPointer(this.texLoc, 2, gl.FLOAT, false, stride, 2 * 4);
    
    gl.enableVertexAttribArray(this.shadeLoc);
    gl.vertexAttribPointer(this.shadeLoc, 3, gl.FLOAT, false, stride, 4 * 4);
    
    gl.drawArrays(gl.TRIANGLES, 0, numTris * 3);
  }

  writeVertex(screenPoint, particle, uOffset, shade, spec, dark, target, offset) {
    target[offset] = screenPoint.x;
    target[offset + 1] = screenPoint.y;
    target[offset + 2] = particle.u * 0.5 + uOffset;
    target[offset + 3] = particle.v;
    target[offset + 4] = shade;
    target[offset + 5] = spec;
    target[offset + 6] = dark;
  }

  drawShadow(physics) {
    if (this.shadowQuality === 'off' || !this.projected[0]) return;

    const settings = {
      low: { broadAlpha: 0.09, broadBlur: 10, contactAlpha: 0.10, contactBlur: 3, skipBroad: true },
      medium: { broadAlpha: 0.12, broadBlur: 16, contactAlpha: 0.12, contactBlur: 5, skipBroad: false },
      high: { broadAlpha: 0.16, broadBlur: 24, contactAlpha: 0.14, contactBlur: 8, skipBroad: false }
    }[this.shadowQuality] || { broadAlpha: 0.16, broadBlur: 24, contactAlpha: 0.14, contactBlur: 8, skipBroad: false };

    const outline = [];
    for (let x=0; x<CONFIG.COLS; x++) outline.push(x);
    for (let y=1; y<CONFIG.ROWS; y++) outline.push(y * CONFIG.COLS + (CONFIG.COLS-1));
    for (let x=CONFIG.COLS-2; x>=0; x--) outline.push((CONFIG.ROWS-1) * CONFIG.COLS + x);
    for (let y=CONFIG.ROWS-2; y>0; y--) outline.push(y * CONFIG.COLS);

    this.bgCtx.save();

    if (!settings.skipBroad) {
      // Broad area shadow
      this.bgCtx.globalAlpha = settings.broadAlpha;
      this.bgCtx.filter = `blur(${settings.broadBlur * CONFIG.DPR}px)`;
      this.bgCtx.fillStyle = '#221e16';
      this.bgCtx.beginPath();
      for (let i=0; i<outline.length; i++) {
        const p = this.projected[outline[i]];
        const part = physics.particles[outline[i]];
        const depth = Math.max(0, part.v * 45 + part.z * 25);
        const wallDist = (12 + depth) * CONFIG.DPR;
        const sx = p.x - this.light.x * wallDist * 1.5;
        const sy = p.y - this.light.y * wallDist * 1.5 + (part.v * 10 * CONFIG.DPR);
        if (i === 0) this.bgCtx.moveTo(sx, sy); else this.bgCtx.lineTo(sx, sy);
      }
      this.bgCtx.closePath();
      this.bgCtx.fill();
    }

    // Contact shadow
    this.bgCtx.globalAlpha = settings.contactAlpha;
    this.bgCtx.filter = `blur(${settings.contactBlur * CONFIG.DPR}px)`;
    this.bgCtx.fillStyle = '#18120a';
    this.bgCtx.beginPath();
    for (let i=0; i<outline.length; i++) {
      const p = this.projected[outline[i]];
      const part = physics.particles[outline[i]];
      const depth = Math.max(0, part.v * 15 + part.z * 8);
      const wallDist = (4 + depth) * CONFIG.DPR;
      const sx = p.x - this.light.x * wallDist;
      const sy = p.y - this.light.y * wallDist;
      if (i === 0) this.bgCtx.moveTo(sx, sy); else this.bgCtx.lineTo(sx, sy);
    }
    this.bgCtx.closePath();
    this.bgCtx.fill();

    this.bgCtx.restore();
  }

  drawGrabIndicator(grab) {
    if (!grab) return;
    const p = this.projected[grab.index];
    this.ctx.save();
    this.ctx.globalAlpha = 0.85;
    this.ctx.strokeStyle = 'rgba(70,90,110,.6)'; this.ctx.lineWidth = 2 * CONFIG.DPR;
    this.ctx.fillStyle = 'rgba(120,160,200,.15)';
    this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 22 * CONFIG.DPR, 0, Math.PI*2); this.ctx.fill(); this.ctx.stroke();
    this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 4 * CONFIG.DPR, 0, Math.PI*2); this.ctx.fillStyle='rgba(60,85,110,.7)'; this.ctx.fill();
    this.ctx.restore();
  }
}