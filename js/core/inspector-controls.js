/* Inspector = Unity-like control panel under the stage.
 * Every control returns a small handle { el, get(), set(v) }. */
window.U101 = window.U101 || {};

U101.createInspector = function (root) {
  let current = root; // controls go into the last opened group

  function row(label, cls) {
    const el = document.createElement('label');
    el.className = 'ctl ' + (cls || '');
    if (label) {
      const l = document.createElement('span');
      l.className = 'ctl-label'; l.textContent = label;
      el.appendChild(l);
    }
    current.appendChild(el);
    return el;
  }

  return {
    group(title) {
      const g = document.createElement('div');
      g.className = 'ctl-group';
      if (title) g.innerHTML = `<div class="ctl-group-title"></div>`, (g.firstChild.textContent = title);
      root.appendChild(g); current = g;
      return g;
    },
    slider(label, opt, cb) {
      const el = row(label, 'ctl-slider');
      const input = Object.assign(document.createElement('input'), { type: 'range', min: opt.min, max: opt.max, step: opt.step ?? 1, value: opt.value });
      const out = document.createElement('output');
      const fmt = (v) => (opt.format ? opt.format(+v) : (+v) + (opt.unit || ''));
      const sync = () => { out.textContent = fmt(input.value); input.style.setProperty('--fill', ((input.value - opt.min) / (opt.max - opt.min)) * 100 + '%'); };
      input.addEventListener('input', () => { sync(); cb && cb(+input.value); });
      el.append(input, out); sync();
      return { el, get: () => +input.value, set: (v) => { input.value = v; sync(); } };
    },
    toggle(label, value, cb) {
      const el = row(label, 'ctl-toggle');
      const input = Object.assign(document.createElement('input'), { type: 'checkbox', checked: !!value });
      const sw = document.createElement('span'); sw.className = 'switch';
      input.addEventListener('change', () => cb && cb(input.checked));
      el.append(input, sw);
      return { el, get: () => input.checked, set: (v) => { input.checked = !!v; } };
    },
    select(label, options, value, cb) {
      const el = row(label, 'ctl-select');
      const sel = document.createElement('select');
      options.forEach((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        sel.appendChild(Object.assign(document.createElement('option'), { value: opt.value, textContent: opt.label }));
      });
      sel.value = value;
      sel.addEventListener('change', () => cb && cb(sel.value));
      el.appendChild(sel);
      return { el, get: () => sel.value, set: (v) => { sel.value = v; } };
    },
    button(label, cb, opt = {}) {
      let bar = current.lastElementChild;
      if (!bar || !bar.classList.contains('ctl-buttons')) { bar = document.createElement('div'); bar.className = 'ctl-buttons'; current.appendChild(bar); }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn ' + (opt.variant ? 'btn-' + opt.variant : ''); b.textContent = label;
      b.addEventListener('click', () => cb && cb());
      bar.appendChild(b);
      return { el: b, get: () => label, set: (t) => { b.textContent = t; } };
    },
    readout(label, value) {
      const el = row(label, 'ctl-readout');
      const v = document.createElement('span'); v.className = 'readout-value'; v.textContent = value ?? '—';
      el.appendChild(v);
      return { el, get: () => v.textContent, set: (t) => { v.textContent = t; } };
    },
  };
};
