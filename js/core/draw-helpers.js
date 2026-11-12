/* Canvas drawing helpers + theme colors + small math utils shared by every lesson. */
window.U101 = window.U101 || {};

U101.colors = {
  bg: '#f6eddd', bgDeep: '#efe3d1', card: '#f9f2e5', paper: '#fffaf1',
  ink: '#4f535b', navy: '#18213d', navy2: '#24304a', muted: '#696d74', faint: '#ada293',
  line: '#cec0ad', lineSoft: '#e2d7c7', trace: '#d3bea3',
  teal: '#1aa3a1', tealDeep: '#3f7f8e', orange: '#c0652d', blue: '#2a56a3',
  red: '#d65a4a', yellow: '#e2a93b', green: '#3fa86b', purple: '#8a73e0', pink: '#e066c0',
};

U101.util = {
  lerp: (a, b, t) => a + (b - a) * t,
  clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
  rand: (lo, hi) => lo + Math.random() * (hi - lo),
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  ease: {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => t * (2 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
    outBounce: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  },
};

/* Returns helpers bound to a 2D context. All sizes in CSS pixels. */
U101.createDraw = function (ctx) {
  const C = U101.colors;
  const FONTS = { sans: '"Barlow", system-ui, sans-serif', cond: '"Barlow Semi Condensed", "Barlow", sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };

  function roundRect(x, y, w, h, r) {
    r = Math.min(r || 0, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function paint(o) {
    if (o.shadow) { ctx.save(); ctx.shadowColor = 'rgba(24,33,61,0.16)'; ctx.shadowBlur = o.shadow; ctx.shadowOffsetY = o.shadow / 3; }
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.shadow) ctx.restore();
    if (o.stroke) { ctx.lineWidth = o.lw || 1.5; ctx.strokeStyle = o.stroke; ctx.setLineDash(o.dash || []); ctx.stroke(); ctx.setLineDash([]); }
  }

  const d = {
    ctx, C,
    clear(w, h, color) { ctx.fillStyle = color || C.paper; ctx.fillRect(0, 0, w, h); },
    grid(w, h, step = 24, color = 'rgba(206,192,173,0.45)') {
      ctx.fillStyle = color;
      for (let x = step / 2; x < w; x += step) for (let y = step / 2; y < h; y += step) ctx.fillRect(x - 1, y - 1, 2, 2);
    },
    rect(x, y, w, h, o = {}) { roundRect(x, y, w, h, o.r ?? 8); paint(o); },
    circle(x, y, r, o = {}) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); paint(o); },
    line(x1, y1, x2, y2, o = {}) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      paint({ stroke: o.stroke || C.ink, lw: o.lw || 2, dash: o.dash });
    },
    poly(points, o = {}) {
      ctx.beginPath(); points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (o.close) ctx.closePath(); paint(o);
    },
    arrow(x1, y1, x2, y2, o = {}) {
      const col = o.stroke || C.navy, head = o.head || 9, a = Math.atan2(y2 - y1, x2 - x1);
      d.line(x1, y1, x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6, { stroke: col, lw: o.lw || 2, dash: o.dash });
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
      ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    },
    text(str, x, y, o = {}) {
      ctx.font = `${o.weight || 500} ${o.size || 14}px ${FONTS[o.font || 'sans']}`;
      ctx.fillStyle = o.color || C.ink; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'middle';
      ctx.fillText(String(str), x, y);
    },
    measure(str, o = {}) { ctx.font = `${o.weight || 500} ${o.size || 14}px ${FONTS[o.font || 'sans']}`; return ctx.measureText(String(str)).width; },
    /* Card-like box (the "component" look used across lessons). */
    node(x, y, w, h, label, o = {}) {
      d.rect(x, y, w, h, { fill: o.fill || C.card, stroke: o.accent || C.line, lw: o.lw || 2, r: o.r ?? 10, shadow: o.shadow ?? 8 });
      if (label != null) d.text(label, x + w / 2, y + h / 2 + (o.sub ? -7 : 0), { align: 'center', size: o.size || 14, weight: 600, color: o.color || C.navy, font: o.font || 'cond' });
      if (o.sub) d.text(o.sub, x + w / 2, y + h / 2 + 10, { align: 'center', size: 11, color: C.muted, font: 'mono' });
    },
    pill(label, x, y, o = {}) {
      const size = o.size || 12, w = d.measure(label, { size, font: 'mono' }) + 16, h = size + 10;
      d.rect(x - (o.align === 'center' ? w / 2 : 0), y - h / 2, w, h, { fill: o.fill || C.navy, r: h / 2 });
      d.text(label, x + (o.align === 'center' ? 0 : w / 2), y + 0.5, { align: 'center', size, font: 'mono', color: o.color || '#fff' });
      return w;
    },
  };
  return d;
};
