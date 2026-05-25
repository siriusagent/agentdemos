
import { normalize } from './math.js?v=1';

export class UI {
  constructor(renderer) {
    this.renderer = renderer;
    this.dial = document.getElementById('lightKnob');
    this.dialInner = document.getElementById('knobDial');
    this.dialActive = false;
    this.lightAngle = 315;
    
    this.setupDial();
    this.setLightAngle(this.lightAngle);
  }

  setLightAngle(deg) {
    this.lightAngle = ((deg % 360) + 360) % 360;
    this.dialInner.style.setProperty('--light-angle', `${this.lightAngle}deg`);
    const rad = (this.lightAngle - 90) * Math.PI / 180;
    const v = normalize({ x: Math.cos(rad) * 0.78, y: Math.sin(rad) * 0.78, z: 0.75 });
    this.renderer.light = v;
  }

  setupDial() {
    const handleDial = (e) => {
      const rect = this.dial.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      let deg = Math.round(angle * 180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      this.setLightAngle(deg);
    };
    
    this.dial.addEventListener('pointerdown', e => {
      e.preventDefault();
      e.stopPropagation();
      this.dialActive = true;
      try { this.dial.setPointerCapture(e.pointerId); } catch (_) {}
      handleDial(e);
    });
    
    this.dial.addEventListener('pointermove', e => {
      if (!this.dialActive) return;
      e.preventDefault();
      e.stopPropagation();
      handleDial(e);
    });

    const stopDial = (e) => {
      if (!this.dialActive) return;
      this.dialActive = false;
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
      try { this.dial.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    this.dial.addEventListener('pointerup', stopDial);
    this.dial.addEventListener('pointercancel', stopDial);
    this.dial.addEventListener('lostpointercapture', () => { this.dialActive = false; });
  }
}
