// panel.js — builds the live control panel from SCHEMA, wires two-way binding.
import { state, SCHEMA, PRESETS, applyPreset } from './config.js';

export function buildPanel(root, onChange, onPreset) {
  root.innerHTML = '';

  // Preset bar
  const pg = document.createElement('div');
  pg.className = 'grp';
  pg.innerHTML = `<h3>Presets</h3>`;
  const prow = document.createElement('div');
  prow.className = 'row';
  const sel = document.createElement('select');
  sel.style.maxWidth = '100%';
  sel.style.flex = '1';
  for (const name of Object.keys(PRESETS)) {
    const o = document.createElement('option');
    o.value = name; o.textContent = name; sel.appendChild(o);
  }
  sel.addEventListener('change', () => { applyPreset(sel.value); onPreset(); });
  prow.appendChild(sel);
  pg.appendChild(prow);
  root.appendChild(pg);

  const controls = {}; // k -> updater(value)

  for (const grp of SCHEMA) {
    const g = document.createElement('div');
    g.className = 'grp';
    const h = document.createElement('h3');
    h.textContent = grp.group;
    g.appendChild(h);

    for (const it of grp.items) {
      const row = document.createElement('div');
      row.className = 'row';
      const lab = document.createElement('label');
      lab.textContent = it.label;
      row.appendChild(lab);

      const type = it.type || 'range';

      if (type === 'range') {
        const val = document.createElement('span');
        val.className = 'val';
        const inp = document.createElement('input');
        inp.type = 'range';
        inp.min = it.min; inp.max = it.max; inp.step = it.step;
        inp.value = state[it.k];
        val.textContent = fmt(state[it.k], it.step);
        inp.addEventListener('input', () => {
          const num = parseFloat(inp.value);
          state[it.k] = num;
          val.textContent = fmt(num, it.step);
          onChange(it.k, num);
        });
        controls[it.k] = (vv) => { inp.value = vv; val.textContent = fmt(vv, it.step); };
        const wrap = document.createElement('div');
        wrap.style.display = 'flex'; wrap.style.alignItems = 'center';
        wrap.style.gap = '8px'; wrap.style.flex = '1'; wrap.style.maxWidth = '170px';
        wrap.appendChild(inp); wrap.appendChild(val);
        row.appendChild(wrap);
      }
      else if (type === 'seg') {
        const seg = document.createElement('div');
        seg.className = 'seg';
        const off = document.createElement('button'); off.textContent = 'Off';
        const on = document.createElement('button'); on.textContent = 'On';
        const sync = (b) => { on.classList.toggle('on', b); off.classList.toggle('on', !b); };
        sync(!!state[it.k]);
        off.addEventListener('click', () => { state[it.k] = false; sync(false); onChange(it.k, false); });
        on.addEventListener('click', () => { state[it.k] = true; sync(true); onChange(it.k, true); });
        controls[it.k] = (vv) => sync(!!vv);
        seg.appendChild(off); seg.appendChild(on);
        row.appendChild(seg);
      }
      else if (type === 'select') {
        const s = document.createElement('select');
        for (const opt of it.options) {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt; s.appendChild(o);
        }
        s.value = state[it.k];
        s.addEventListener('change', () => { state[it.k] = s.value; onChange(it.k, s.value); });
        controls[it.k] = (vv) => { s.value = vv; };
        row.appendChild(s);
      }
      else if (type === 'color') {
        const c = document.createElement('input');
        c.type = 'color'; c.value = state[it.k];
        c.addEventListener('input', () => { state[it.k] = c.value; onChange(it.k, c.value); });
        controls[it.k] = (vv) => { c.value = vv; };
        row.appendChild(c);
      }

      g.appendChild(row);
    }
    root.appendChild(g);
  }

  return {
    // refresh all controls from state (after preset/random/url load)
    sync() { for (const k in controls) if (state[k] !== undefined) controls[k](state[k]); },
  };
}

function fmt(n, step) {
  if (typeof n !== 'number') return String(n);
  if (step >= 1) return String(Math.round(n));
  if (step >= 0.1) return n.toFixed(1);
  if (step >= 0.01) return n.toFixed(2);
  return n.toFixed(3);
}
