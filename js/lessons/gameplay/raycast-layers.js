/* Lesson: Raycast, Overlap & Layer — ray from player to pointer, LayerMask filtering, RaycastHit info, OverlapCircle. */
U101.defineLesson('raycast-layers', {
  lead: 'Raycast bắn một tia vô hình và trả về collider đầu tiên nó chạm. Overlap hỏi "có gì trong vùng này". LayerMask quyết định tia và vùng đó nhìn thấy những layer nào.',
  hint: 'Di chuột để ngắm · click để bắn và log RaycastHit · kéo Player để di chuyển · bật/tắt layer trong LayerMask',
  overview: `
    <p><b>Physics.Raycast</b> (2D: <code>Physics2D.Raycast</code>) nhận điểm gốc, hướng, khoảng cách tối đa và <b>LayerMask</b>. Kết quả <code>RaycastHit</code> cho biết:</p>
    <ul>
      <li><code>point</code>: điểm chạm trong world. <code>normal</code>: hướng vuông góc với bề mặt tại điểm đó, dùng để đặt vết đạn hoặc tính hướng nảy.</li>
      <li><code>distance</code>: khoảng cách từ gốc tới điểm chạm. <code>collider</code> / <code>transform</code>: object bị trúng.</li>
      <li><b>RaycastAll</b> trả về mọi collider trên đường đi, <b>không theo thứ tự</b>, nên phải tự sắp xếp theo distance. Dùng bản <code>NonAlloc</code> hoặc bản nhận buffer để tránh GC.</li>
      <li><b>OverlapCircle / OverlapSphere / OverlapBox</b> trả về mọi collider nằm trong một vùng. Hợp cho đòn chém AoE, nhặt đồ, phát hiện kẻ địch gần.</li>
      <li><b>LayerMask</b> là bitmask 32 bit: <code>1 &lt;&lt; layer</code>, <code>LayerMask.GetMask("Enemy", "Wall")</code>, đảo bằng <code>~mask</code>. Layer <b>Ignore Raycast</b> bị loại khỏi mask mặc định.</li>
    </ul>
    <p class="callout"><b>Layer Collision Matrix</b> (Project Settings → Physics) quyết định layer nào <b>va chạm</b> với layer nào. LayerMask trong Raycast chỉ lọc cho <b>truy vấn</b> đó. Hai thứ độc lập nhau.</p>`,
  keyPoints: [
    'Raycast trả về hit gần nhất thuộc LayerMask. Collider ngoài mask bị bỏ qua như không tồn tại.',
    'RaycastHit: point, normal, distance, collider. Normal dùng để đặt decal, tính phản xạ.',
    'Overlap* để quét vùng (AoE, cảm biến). Dùng bản có buffer để không sinh rác.',
    'Collision Matrix lọc va chạm vật lý. LayerMask lọc từng truy vấn.',
  ],
  code: {
    title: 'PlayerAim.cs',
    source: `
using UnityEngine;

public class PlayerAim : MonoBehaviour
{
    [SerializeField] private LayerMask shootMask;   // tick Ground, Enemy, Wall trong Inspector
    [SerializeField] private LayerMask enemyMask;   // chỉ Enemy
    [SerializeField] private float range = 12f, senseRadius = 3f;
    private readonly Collider2D[] nearby = new Collider2D[16];  // buffer dùng lại, không GC
    private Camera cam;

    void Awake() { cam = Camera.main; }   // cache, không gọi Camera.main trong Update

    void Update()
    {
        Vector2 origin = transform.position;
        Vector2 dir = ((Vector2)cam.ScreenToWorldPoint(Input.mousePosition) - origin).normalized;

        RaycastHit2D hit = Physics2D.Raycast(origin, dir, range, shootMask);
        if (hit.collider != null && Input.GetMouseButtonDown(0))
            Debug.Log($"Trúng {hit.collider.name} tại {hit.point}, normal {hit.normal}, dist {hit.distance:F2}");

        var filter = new ContactFilter2D(); filter.SetLayerMask(enemyMask);
        int count = Physics2D.OverlapCircle(origin, senseRadius, filter, nearby);
        for (int i = 0; i < count; i++) nearby[i].SendMessage("OnSpotted", SendMessageOptions.DontRequireReceiver);
    }
}`,
    note: 'Bản 3D: Physics.Raycast(origin, dir, out RaycastHit hit, range, mask) và Physics.OverlapSphereNonAlloc(pos, r, buffer, mask).',
  },
  tryIt: [
    'Ngắm qua bức tường: tắt layer Wall trong LayerMask. Tia giờ xuyên tới kẻ địch phía sau.',
    'Ngắm vào vùng nước (Ignore Raycast): tia đi xuyên qua. Bật layer đó trong mask thì sao?',
    'Chuyển sang RaycastAll và đếm số hit. Thứ tự đánh số là theo distance đã sắp xếp.',
    'Click vào mặt nghiêng của quả cầu kẻ địch và so sánh normal với khi bắn thẳng vào tường.',
    'Kéo Player lại gần kẻ địch và tăng bán kính Overlap. Console báo khi số collider trong vùng thay đổi.',
  ],
  links: [
    { label: 'Physics.Raycast', url: 'https://docs.unity3d.com/ScriptReference/Physics.Raycast.html' },
    { label: 'Physics2D.OverlapCircle', url: 'https://docs.unity3d.com/ScriptReference/Physics2D.OverlapCircle.html' },
    { label: 'Layers & LayerMask', url: 'https://docs.unity3d.com/Manual/use-layers.html' },
    { label: 'Layer-based collision detection', url: 'https://docs.unity3d.com/Manual/LayerBasedCollision.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const LAYERS = { Ground: { bit: 6, color: C.orange, on: true }, Enemy: { bit: 7, color: C.red, on: true }, Wall: { bit: 8, color: C.navy2, on: true }, 'Ignore Raycast': { bit: 2, color: C.blue, on: false } };
    const OBJS = [ // tọa độ chuẩn hóa 0..1
      { name: 'Ground', layer: 'Ground', box: [0, 0.9, 1, 0.1] }, { name: 'Platform', layer: 'Ground', box: [0.5, 0.66, 0.2, 0.05] },
      { name: 'Wall_A', layer: 'Wall', box: [0.4, 0.28, 0.04, 0.4] }, { name: 'Wall_B', layer: 'Wall', box: [0.86, 0.34, 0.04, 0.4] },
      { name: 'Water', layer: 'Ignore Raycast', box: [0.2, 0.52, 0.12, 0.26] },
      { name: 'Enemy_1', layer: 'Enemy', c: [0.28, 0.32] }, { name: 'Enemy_2', layer: 'Enemy', c: [0.63, 0.42] },
      { name: 'Enemy_3', layer: 'Enemy', c: [0.74, 0.8] }, { name: 'Enemy_4', layer: 'Enemy', c: [0.95, 0.66] },
    ];
    const player = { x: 0.08, y: 0.8 };
    let aim = { x: 0.72, y: 0.36 }, mode = 'single', maxDist = 14, overlapOn = true, overlapR = 2.5, dragging = false;
    let lastHit = '', lastOverlap = -1, logT = 0, shot = null;

    const geo = () => { // world: 1 unit = ppu px, y hướng lên như Unity
      const { w, h } = stage, ppu = Math.min(w, h * 1.7) / 18, er = ppu * 0.5;
      return { w, h, ppu, er, objs: OBJS.map((o) => o.box ? { ...o, x0: o.box[0] * w, y0: o.box[1] * h, x1: (o.box[0] + o.box[2]) * w, y1: (o.box[1] + o.box[3]) * h } : { ...o, cx: o.c[0] * w, cy: o.c[1] * h, r: er }) };
    };
    const inMask = (o) => LAYERS[o.layer].on;
    const maskValue = () => Object.values(LAYERS).reduce((m, l) => (l.on ? m | (1 << l.bit) : m), 0);

    function intersect(o, ox, oy, dx, dy) { // trả về {t, nx, ny} hoặc null
      if (o.r) {
        const fx = ox - o.cx, fy = oy - o.cy, b = fx * dx + fy * dy, c = fx * fx + fy * fy - o.r * o.r, disc = b * b - c;
        if (c < 0 || disc < 0) return null; // gốc nằm trong collider → Unity không báo hit
        const t = -b - Math.sqrt(disc); if (t < 0) return null;
        return { t, nx: (ox + dx * t - o.cx) / o.r, ny: (oy + dy * t - o.cy) / o.r };
      }
      let tmin = -Infinity, tmax = Infinity, nx = 0, ny = 0;
      for (const [o0, d0, lo, hi, ax] of [[ox, dx, o.x0, o.x1, 'x'], [oy, dy, o.y0, o.y1, 'y']]) {
        if (Math.abs(d0) < 1e-9) { if (o0 < lo || o0 > hi) return null; continue; }
        let t1 = (lo - o0) / d0, t2 = (hi - o0) / d0, s = -1; if (t1 > t2) { [t1, t2] = [t2, t1]; s = 1; }
        if (t1 > tmin) { tmin = t1; nx = ax === 'x' ? s : 0; ny = ax === 'y' ? s : 0; }
        tmax = Math.min(tmax, t2);
      }
      return tmin <= tmax && tmin >= 0 ? { t: tmin, nx, ny } : null;
    }
    function overlaps(o, px, py, R) {
      if (o.r) return U.dist(px, py, o.cx, o.cy) < R + o.r;
      return U.dist(px, py, U.clamp(px, o.x0, o.x1), U.clamp(py, o.y0, o.y1)) < R;
    }
    function cast(G) {
      const px = player.x * G.w, py = player.y * G.h, ax = aim.x * G.w, ay = aim.y * G.h, L = Math.hypot(ax - px, ay - py) || 1;
      const dx = (ax - px) / L, dy = (ay - py) / L, maxPx = maxDist * G.ppu;
      const all = G.objs.map((o) => ({ o, h: intersect(o, px, py, dx, dy) })).filter((r) => r.h && r.h.t <= maxPx).sort((a, b) => a.h.t - b.h.t);
      return { px, py, dx, dy, maxPx, all, hits: all.filter((r) => inMask(r.o)) };
    }
    const toWorld = (G, x, y) => `(${(x / G.ppu).toFixed(1)}, ${((G.h - y) / G.ppu).toFixed(1)})`;

    stage.ui.group('Truy vấn');
    stage.ui.select('Kiểu', [{ value: 'single', label: 'Physics2D.Raycast' }, { value: 'all', label: 'Physics2D.RaycastAll' }], mode, (v) => (mode = v));
    stage.ui.slider('maxDistance', { min: 2, max: 24, step: 0.5, value: maxDist, unit: 'u' }, (v) => (maxDist = v));
    stage.ui.toggle('OverlapCircle', overlapOn, (v) => (overlapOn = v));
    stage.ui.slider('Bán kính Overlap', { min: 0.5, max: 6, step: 0.25, value: overlapR, unit: 'u' }, (v) => (overlapR = v));
    stage.ui.group('LayerMask');
    const roMask = stage.ui.readout('mask.value', '');
    Object.entries(LAYERS).forEach(([name, l]) => stage.ui.toggle(`${name} (layer ${l.bit})`, l.on, (v) => {
      l.on = v; roMask.set(String(maskValue())); stage.log(`LayerMask ${v ? '+' : '−'} ${name} → value = ${maskValue()} (bit ${l.bit} ${v ? 'bật' : 'tắt'})`);
    }));
    roMask.set(String(maskValue()));
    const roHit = stage.ui.readout('hit.collider', '—'), roDist = stage.ui.readout('hit.distance', '—');

    stage.onPointer('down', (x, y) => {
      const G = geo();
      if (U.dist(x, y, player.x * G.w, player.y * G.h) < G.er * 1.6) { dragging = true; return; }
      aim = { x: x / G.w, y: y / G.h };
      const r = cast(G), f = r.hits[0];
      shot = { t: 0.35 };
      if (!f) return stage.log(`Raycast: không trúng gì trong ${maxDist}u (mask ${maskValue()})`, 'warn');
      const hx = r.px + r.dx * f.h.t, hy = r.py + r.dy * f.h.t;
      stage.log(`RaycastHit → ${f.o.name} [${f.o.layer}] point ${toWorld(G, hx, hy)} normal (${f.h.nx.toFixed(2)}, ${(-f.h.ny).toFixed(2)}) distance ${(f.h.t / G.ppu).toFixed(2)}`);
    });
    stage.onPointer('move', (x, y) => {
      const G = geo();
      if (dragging) { player.x = U.clamp(x / G.w, 0.02, 0.98); player.y = U.clamp(y / G.h, 0.05, 0.86); } else aim = { x: x / G.w, y: y / G.h };
    });
    stage.onPointer('up', () => (dragging = false));
    stage.onFrame((dt) => { logT -= dt; if (shot) { shot.t -= dt; if (shot.t <= 0) shot = null; } render(); });
    stage.onResize(() => render());

    function render() {
      const G = geo(), { w, h } = G, r = cast(G), first = r.hits[0], ignored = new Set(r.all.filter((x) => !inMask(x.o)).map((x) => x.o.name));
      d.clear(w, h); d.grid(w, h);
      const R = overlapR * G.ppu, inside = overlapOn ? G.objs.filter((o) => inMask(o) && overlaps(o, r.px, r.py, R)) : [];
      if (overlapOn) d.circle(r.px, r.py, R, { fill: 'rgba(63,168,107,0.08)', stroke: C.green, lw: 1.5, dash: [5, 4] });
      G.objs.forEach((o) => {
        const L = LAYERS[o.layer], active = inMask(o), hot = inside.includes(o), col = L.color;
        const st = { fill: o.layer === 'Ignore Raycast' ? 'rgba(42,86,163,0.16)' : active ? col : 'rgba(173,162,147,0.35)', stroke: hot ? C.green : active ? '#fff' : C.faint, lw: hot ? 3 : 1.5, dash: active ? null : [4, 3] };
        if (o.r) { d.circle(o.cx, o.cy, o.r, st); d.text(o.name.slice(-1), o.cx, o.cy + 1, { align: 'center', font: 'mono', size: 11, weight: 700, color: '#fff' }); }
        else { d.rect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0, { ...st, r: 3 }); if (o.y1 - o.y0 > 30 && o.x1 - o.x0 > 40) d.text(o.layer, (o.x0 + o.x1) / 2, o.y0 + 14, { align: 'center', font: 'mono', size: 11, color: o.layer === 'Ignore Raycast' ? C.blue : '#fff' }); }
        if (hot) d.line(r.px, r.py, o.r ? o.cx : (o.x0 + o.x1) / 2, o.r ? o.cy : (o.y0 + o.y1) / 2, { stroke: C.green, lw: 1, dash: [2, 4] });
      });
      // tia
      const endT = mode === 'single' && first ? first.h.t : r.maxPx;
      d.line(r.px, r.py, r.px + r.dx * r.maxPx, r.py + r.dy * r.maxPx, { stroke: C.faint, lw: 1, dash: [3, 5] });
      d.line(r.px, r.py, r.px + r.dx * endT, r.py + r.dy * endT, { stroke: shot ? C.red : C.yellow, lw: shot ? 4 : 2.5 });
      r.all.forEach(({ o, h: hh }) => {
        const x = r.px + r.dx * hh.t, y = r.py + r.dy * hh.t;
        if (!inMask(o)) { if (hh.t <= endT) { d.line(x - 5, y - 5, x + 5, y + 5, { stroke: C.muted, lw: 2 }); d.line(x - 5, y + 5, x + 5, y - 5, { stroke: C.muted, lw: 2 }); } return; }
        const idx = r.hits.findIndex((q) => q.o === o);
        if (mode === 'single' && idx > 0) return;
        d.arrow(x, y, x + hh.nx * 34, y + hh.ny * 34, { stroke: C.purple, lw: 2, head: 7 });
        d.circle(x, y, 6, { fill: C.yellow, stroke: C.navy, lw: 2 });
        if (mode === 'all') d.pill(String(idx + 1), x + 12, y - 14, { align: 'center', size: 11, fill: C.navy });
      });
      d.circle(r.px, r.py, G.er * 0.9, { fill: C.teal, stroke: '#fff', lw: 2.5, shadow: 6 });
      d.text('P', r.px, r.py + 1, { align: 'center', font: 'cond', weight: 700, size: 14, color: '#fff' });
      // card
      const cw = Math.min(300, w - 24), cx = w - cw - 12, rows = [];
      if (first) { const fx = r.px + r.dx * first.h.t, fy = r.py + r.dy * first.h.t; rows.push(['collider', `${first.o.name} [${first.o.layer}]`], ['point', toWorld(G, fx, fy)], ['normal', `(${first.h.nx.toFixed(2)}, ${(-first.h.ny).toFixed(2)})`], ['distance', (first.h.t / G.ppu).toFixed(2)]); }
      else rows.push(['Raycast', 'false · không trúng'], ['', ''], ['', ''], ['', '']);
      rows.push([mode === 'all' ? 'RaycastAll' : 'bỏ qua (mask)', mode === 'all' ? `${r.hits.length} hit` : ignored.size ? [...ignored].join(', ') : '—']);
      if (overlapOn) rows.push(['Overlap', inside.length ? inside.map((o) => o.name).join(', ') : '0 collider']);
      d.node(cx, 12, cw, 22 + rows.length * 18, null, { accent: first ? C.yellow : C.line });
      rows.forEach(([k, v], i) => { d.text(k, cx + 12, 31 + i * 18, { font: 'mono', size: 11, weight: 600, color: C.muted }); d.text(v, cx + cw - 12, 31 + i * 18, { align: 'right', font: 'mono', size: 11, color: C.navy }); });
      roHit.set(first ? first.o.name : 'null'); roDist.set(first ? (first.h.t / G.ppu).toFixed(2) : '—');
      // log thay đổi (throttle)
      const key = first ? first.o.name : 'null';
      if (logT <= 0 && (key !== lastHit || inside.length !== lastOverlap)) {
        if (key !== lastHit && lastHit) stage.log(`Tia đang chạm: ${key}`);
        if (overlapOn && inside.length !== lastOverlap && lastOverlap >= 0) stage.log(`OverlapCircle(r=${overlapR}) → ${inside.length} collider`, 'warn');
        lastHit = key; lastOverlap = inside.length; logT = 0.4;
      }
    }
    stage.log(`LayerMask value = ${maskValue()} (Ground | Enemy | Wall). Ignore Raycast đang bị loại.`);
    render();
  },
});
