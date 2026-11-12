/* Stage = the simulation sandbox handed to each lesson's mount(stage).
 * Owns: canvas (DPR-aware), RAF loop, pointer input, Inspector controls, Console log.
 * Everything registered through the stage is torn down on unmount. */
window.U101 = window.U101 || {};

U101.createStage = function (els) {
  const { canvas, inspector, consoleEl, hintEl } = els;
  const ctx = canvas.getContext('2d');
  const frameFns = [], resizeFns = [], pointerFns = { down: [], move: [], up: [] };
  let raf = 0, last = 0, alive = true;

  const stage = {
    canvas, ctx, w: 0, h: 0, colors: U101.colors, util: U101.util, paused: false, time: 0,
    draw: U101.createDraw(ctx),
    pointer: { x: 0, y: 0, down: false },
    onFrame: (fn) => frameFns.push(fn),
    onResize: (fn) => resizeFns.push(fn),
    onPointer: (type, fn) => pointerFns[type].push(fn),
    setHint: (text) => { hintEl.textContent = text || ''; hintEl.hidden = !text; },
    log(msg, level = 'info') {
      const row = document.createElement('div');
      row.className = 'log-row log-' + level;
      const t = new Date();
      row.innerHTML = `<span class="log-time">${t.toTimeString().slice(0, 8)}</span><span class="log-msg"></span>`;
      row.lastChild.textContent = msg;
      consoleEl.appendChild(row);
      while (consoleEl.children.length > 60) consoleEl.firstChild.remove();
      consoleEl.scrollTop = consoleEl.scrollHeight;
    },
    clearLog: () => { consoleEl.innerHTML = ''; },
    ui: U101.createInspector(inspector),
  };

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    stage.w = Math.max(200, Math.floor(r.width));
    stage.h = Math.max(200, Math.floor(r.height));
    canvas.width = stage.w * dpr; canvas.height = stage.h * dpr;
    canvas.style.width = stage.w + 'px'; canvas.style.height = stage.h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resizeFns.forEach((fn) => safe(fn, stage.w, stage.h));
  }
  function safe(fn, ...args) {
    try { fn(...args); } catch (err) { console.error(err); stage.log('Lỗi mô phỏng: ' + err.message, 'error'); }
  }
  function tick(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (!stage.paused) { stage.time += dt; frameFns.forEach((fn) => safe(fn, dt, stage.time)); }
    raf = requestAnimationFrame(tick);
  }
  function pt(e) {
    const r = canvas.getBoundingClientRect();
    stage.pointer.x = e.clientX - r.left; stage.pointer.y = e.clientY - r.top;
  }
  const handlers = {
    pointerdown: (e) => { pt(e); stage.pointer.down = true; canvas.setPointerCapture(e.pointerId); pointerFns.down.forEach((f) => safe(f, stage.pointer.x, stage.pointer.y, e)); },
    pointermove: (e) => { pt(e); pointerFns.move.forEach((f) => safe(f, stage.pointer.x, stage.pointer.y, e)); },
    pointerup: (e) => { pt(e); stage.pointer.down = false; pointerFns.up.forEach((f) => safe(f, stage.pointer.x, stage.pointer.y, e)); },
  };
  Object.entries(handlers).forEach(([k, fn]) => canvas.addEventListener(k, fn));
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  resize();

  stage.start = () => { raf = requestAnimationFrame(tick); };
  stage.destroy = () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect();
    Object.entries(handlers).forEach(([k, fn]) => canvas.removeEventListener(k, fn));
    inspector.innerHTML = ''; consoleEl.innerHTML = ''; stage.setHint('');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  return stage;
};
