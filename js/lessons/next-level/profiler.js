/* Lesson: Profiler — stacked frame-time chart with toggleable problems/fixes and a hierarchy breakdown. */
U101.defineLesson('profiler', {
  lead: 'Đừng đoán vì sao game giật. Unity Profiler đo thời gian từng frame và chia nhỏ theo Scripts, Rendering, Physics, GC… để bạn thấy đúng thủ phạm trước khi tối ưu.',
  hint: 'Bật/tắt các "vấn đề" và "cách sửa" ở Inspector · bấm vào một cột frame để xem Hierarchy · đổi thiết bị sang Android low-end',
  overview: `
    <p>Mỗi frame có một <b>ngân sách thời gian</b>: 60 FPS nghĩa là mỗi frame chỉ được <b>16.6ms</b>, 30 FPS là <b>33.3ms</b>. Vượt ngân sách là người chơi thấy giật.</p>
    <ul>
      <li><b>CPU Usage</b>: biểu đồ cột chồng theo nhóm (Scripts, Rendering, Physics, GC, UI…). Bấm một frame để xem <b>Hierarchy</b>: hàm nào tốn bao nhiêu ms và <b>GC Alloc</b> bao nhiêu.</li>
      <li><b>Spike GC</b>: cấp phát rác (new, string nối, LINQ, Instantiate liên tục) làm Garbage Collector thỉnh thoảng dọn dẹp, gây gai nhọn trên biểu đồ.</li>
      <li><b>Draw calls / Batches</b>: quá nhiều material khác nhau làm CPU tốn thời gian gửi lệnh vẽ. Dùng SRP Batcher, atlas, GPU instancing.</li>
      <li><b>Thiết bị thật</b>: Editor chạy trên PC mạnh. Hãy build <b>Development Build</b> + <b>Autoconnect Profiler</b> để đo trên Android/iOS. Máy yếu có thể chậm gấp 3–4 lần.</li>
      <li><b>Memory Profiler</b> (package riêng): chụp snapshot bộ nhớ để tìm texture quá lớn, asset bị load trùng, object bị leak.</li>
    </ul>
    <p class="callout">Quy trình đúng: <b>đo → tìm điểm nóng → sửa → đo lại</b>. Tối ưu thứ không xuất hiện trong Profiler là phí thời gian.</p>`,
  keyPoints: [
    '60 FPS = 16.6ms/frame, 30 FPS = 33.3ms/frame. Mọi hệ thống chia nhau ngân sách này.',
    'Không gọi Find/GetComponent trong Update: cache reference ở Awake/Start.',
    'GC Alloc mỗi frame dẫn tới spike GC.Collect. Dùng object pool, tránh tạo rác trong vòng lặp.',
    'Luôn profile trên thiết bị đích (Development Build), không chỉ trong Editor.',
  ],
  code: [{
    title: 'EnemyAI.cs (trước khi sửa)',
    source: `
void Update()
{
    // ✗ Tìm trong toàn scene MỖI FRAME
    var player = FindObjectOfType<Player>();
    // ✗ Nối string tạo rác (GC Alloc) mỗi frame
    label.text = "HP: " + hp;
    // ✗ Instantiate/Destroy liên tục
    if (shoot) Instantiate(bulletPrefab, muzzle.position, muzzle.rotation);
}`,
    note: 'Ba lỗi kinh điển: tìm kiếm tốn kém trong Update, cấp phát rác mỗi frame, tạo/hủy object liên tục.',
  }, {
    title: 'EnemyAI.cs (sau khi sửa)',
    source: `
using UnityEngine;
using UnityEngine.Profiling;

private Player player;
void Awake() { player = FindObjectOfType<Player>(); } // ✓ cache 1 lần

void Update()
{
    Profiler.BeginSample("EnemyAI.Think");   // nhãn riêng trong Hierarchy
    if (hpChanged) { label.SetText("HP: {0}", hp); hpChanged = false; } // ✓ chỉ cập nhật khi đổi
    if (shoot) bulletPool.Get();             // ✓ lấy từ ObjectPool<T>
    Profiler.EndSample();
}`,
    note: 'Profiler.BeginSample/EndSample giúp đoạn code của bạn hiện rõ tên trong Hierarchy.',
  }],
  tryIt: [
    'Bấm vào cột cao nhất (spike) và tìm GC.Collect trong Hierarchy.',
    'Bật "Object Pool": spike GC biến mất chưa? GC Alloc mỗi frame còn bao nhiêu?',
    'Bật "Quá nhiều draw calls" rồi bật "SRP Batcher + Atlas": Batches giảm bao nhiêu?',
    'Chuyển sang Android low-end: frame nào vượt vạch 33.3ms?',
    'Bật hết các cách sửa: game có giữ được 60 FPS trên máy yếu không?',
  ],
  links: [
    { label: 'Profiler overview', url: 'https://docs.unity3d.com/Manual/Profiler.html' },
    { label: 'Memory Profiler package', url: 'https://docs.unity3d.com/Packages/com.unity.memoryprofiler@latest' },
    { label: 'Profiling on a target device', url: 'https://docs.unity3d.com/Manual/profiler-profiling-applications.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const CATS = [
      { k: 'scripts', name: 'Scripts', color: C.blue }, { k: 'render', name: 'Rendering', color: C.green },
      { k: 'physics', name: 'Physics', color: C.orange }, { k: 'gc', name: 'GC', color: C.yellow },
      { k: 'ui', name: 'UI', color: C.purple }, { k: 'other', name: 'Other', color: C.faint },
    ];
    const N = 120, DEV = { pc: 1, android: 3.4 };
    const prob = { find: true, draw: false, gc: true, phys: false };
    const fix = { find: false, draw: false, gc: false, phys: false };
    let device = 'pc', recording = true, frames = [], frameNo = 0, acc = 0, selected = null, sinceGC = 0, chart = null;

    function makeFrame() {
      const m = DEV[device], j = () => U.rand(0.88, 1.12), it = [];
      const add = (cat, name, ms, depth, gc = 0) => {
        const x = { cat, name, ms: ms * m * j(), depth, gc }; it.push(x);
        if (depth === 2) { const p = it.filter((q) => q.depth === 1 && q.cat === cat).pop(); p.ms += x.ms; p.gc += gc; }
      };
      add('scripts', 'PlayerController.Update()', 0.5, 1); add('scripts', 'EnemyAI.Update() ×40', 1.0, 1);
      if (prob.find) add('scripts', fix.find ? '└ cached player (Awake)' : '└ GameObject.FindObjectOfType()', fix.find ? 0.04 : 5.2, 2);
      if (prob.gc) {
        add('scripts', fix.gc ? '└ ObjectPool.Get()' : '└ Instantiate + string concat', fix.gc ? 0.1 : 0.9, 2, fix.gc ? 0 : 48);
        sinceGC += fix.gc ? 0 : 1;
        if (sinceGC > 22 + Math.random() * 8) { sinceGC = 0; add('gc', 'GC.Collect', 11, 1); }
      }
      add('gc', 'GC.Alloc (khác)', 0.05, 1);
      const batches = prob.draw ? (fix.draw ? 210 : 1850) : 120;
      add('render', `Camera.Render · ${batches} batches`, 2.6 + (prob.draw ? (fix.draw ? 0.9 : 7.5) : 0), 1);
      add('physics', 'Physics.Simulate', 0.7 + (prob.phys ? (fix.phys ? 0.7 : 5.5) : 0), 1);
      if (prob.phys) add('physics', fix.phys ? '└ Layer Collision Matrix' : '└ 300 MeshCollider va chạm', fix.phys ? 0.2 : 1.8, 2);
      add('ui', 'Canvas.SendWillRenderCanvases', 0.6, 1); add('other', 'PlayerLoop overhead', 0.9, 1);
      const sum = {}; CATS.forEach((c) => (sum[c.k] = 0));
      it.forEach((x) => { if (x.depth === 1) sum[x.cat] += x.ms; });
      const total = CATS.reduce((a, c) => a + sum[c.k], 0);
      return { no: ++frameNo, items: it, sum, total, gc: it.reduce((a, x) => a + (x.depth === 1 ? x.gc : 0), 0), batches };
    }
    function push() { frames.push(makeFrame()); if (frames.length > N) frames.shift(); }
    for (let i = 0; i < N; i++) push();
    selected = frames.reduce((a, f) => (f.total > a.total ? f : a), frames[0]);

    // Inspector
    const say = (on, a, b) => stage.log(on ? a : b, on ? 'warn' : 'info');
    stage.ui.group('Vấn đề (gây chậm)');
    stage.ui.toggle('FindObjectOfType trong Update', prob.find, (v) => { prob.find = v; say(v, 'Scripts tăng ~5ms: tìm khắp scene mỗi frame.', 'Bỏ FindObjectOfType khỏi Update.'); });
    stage.ui.toggle('Quá nhiều draw calls', prob.draw, (v) => { prob.draw = v; say(v, 'Rendering tăng: 1850 batches, CPU bận gửi lệnh vẽ.', 'Draw calls về mức bình thường.'); });
    stage.ui.toggle('GC Alloc mỗi frame', prob.gc, (v) => { prob.gc = v; say(v, '48KB rác mỗi frame → thỉnh thoảng GC.Collect gây spike.', 'Không còn tạo rác mỗi frame.'); });
    stage.ui.toggle('Physics nặng', prob.phys, (v) => { prob.phys = v; say(v, 'Physics.Simulate tăng: quá nhiều MeshCollider va chạm nhau.', 'Physics nhẹ trở lại.'); });
    stage.ui.group('Cách sửa');
    stage.ui.toggle('Cache reference ở Awake', fix.find, (v) => { fix.find = v; if (v) stage.log('✓ FindObjectOfType chỉ chạy 1 lần trong Awake.'); });
    stage.ui.toggle('SRP Batcher + Atlas', fix.draw, (v) => { fix.draw = v; if (v) stage.log('✓ Gộp material/texture: batches giảm mạnh.'); });
    stage.ui.toggle('Object Pool', fix.gc, (v) => { fix.gc = v; if (v) stage.log('✓ Tái sử dụng object: GC Alloc ≈ 0, hết spike.'); });
    stage.ui.toggle('Layer Matrix + collider đơn giản', fix.phys, (v) => { fix.phys = v; if (v) stage.log('✓ Ít cặp va chạm hơn, dùng Box/Sphere thay Mesh.'); });
    stage.ui.group('Profiling');
    stage.ui.select('Thiết bị đích', [{ value: 'pc', label: 'PC / Editor' }, { value: 'android', label: 'Android low-end (×3.4)' }], device, (v) => {
      device = v; stage.log(v === 'pc' ? 'Đo trên PC: nhanh nhưng không phản ánh máy người chơi.' : 'Android low-end: cùng code nhưng mọi thứ chậm hơn ~3.4 lần!', v === 'pc' ? 'info' : 'warn');
    });
    const recT = stage.ui.toggle('Record', recording, (v) => (recording = v));
    const roAvg = stage.ui.readout('Trung bình', '—'), roGc = stage.ui.readout('GC Alloc/frame', '—');
    stage.log('Profiler đang ghi. Bấm vào một cột để xem chi tiết frame.');

    stage.onPointer('down', (x) => {
      if (!chart || x < chart.x || x > chart.x + chart.w) return;
      const i = Math.floor((x - chart.x) / (chart.w / N)), f = frames[U.clamp(i, 0, frames.length - 1)];
      selected = f; recording = false; recT.set(false);
      stage.log(`Frame #${f.no}: ${f.total.toFixed(1)}ms (${Math.round(1000 / f.total)} FPS) · GC Alloc ${f.gc}KB. Record tạm dừng.`, f.total > 33.3 ? 'error' : f.total > 16.6 ? 'warn' : 'info');
    });

    let tick = 0;
    stage.onFrame((dt) => {
      if (recording) { acc += dt; while (acc > 1 / 20) { acc -= 1 / 20; push(); } }
      if ((tick += dt) > 0.4) {
        tick = 0; const last = frames.slice(-30), avg = last.reduce((a, f) => a + f.total, 0) / last.length;
        roAvg.set(`${avg.toFixed(1)}ms · ${Math.round(1000 / avg)} FPS`); roGc.set(`${Math.round(last.reduce((a, f) => a + f.gc, 0) / last.length)} KB`);
      }
      render();
    });

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      // Legend
      let lx = 16;
      d.text('CPU Usage', lx, 18, { font: 'cond', weight: 700, size: 15, color: C.navy }); lx += 86;
      CATS.forEach((c) => {
        if (lx + 80 > w) return;
        d.rect(lx, 12, 11, 11, { fill: c.color, r: 2 }); d.text(c.name, lx + 15, 18, { font: 'mono', size: 11, color: C.ink });
        lx += 26 + d.measure(c.name, { font: 'mono', size: 11 });
      });
      d.text(device === 'pc' ? 'PC' : 'Android', w - 16, 18, { align: 'right', font: 'mono', size: 11, weight: 700, color: device === 'pc' ? C.tealDeep : C.red });
      // Chart
      const cx = 46, cy = 34, cw = w - cx - 14, ch = Math.max(120, h * 0.5 - 30);
      chart = { x: cx, w: cw };
      const yMax = Math.max(40, ...frames.map((f) => f.total)) * 1.08, Y = (ms) => cy + ch - (ms / yMax) * ch;
      d.rect(cx, cy, cw, ch, { fill: 'rgba(255,250,241,0.9)', stroke: C.lineSoft, r: 6 });
      const bw = cw / N;
      frames.forEach((f, i) => {
        let acc2 = 0; const x = cx + i * bw;
        CATS.forEach((c) => {
          const v = f.sum[c.k]; if (v <= 0) return;
          d.ctx.fillStyle = c.color; d.ctx.fillRect(x + 0.5, Y(acc2 + v), Math.max(1, bw - 1), Y(acc2) - Y(acc2 + v)); acc2 += v;
        });
        if (f === selected) d.rect(x - 1, cy + 2, bw + 2, ch - 4, { stroke: C.navy, lw: 2, r: 2 });
      });
      [[16.6, '16.6ms · 60 FPS', C.green], [33.3, '33.3ms · 30 FPS', C.red]].forEach(([ms, lbl, col]) => {
        if (ms > yMax) return;
        d.line(cx, Y(ms), cx + cw, Y(ms), { stroke: col, lw: 1.5, dash: [6, 4] });
        d.text(lbl, cx + 6, Y(ms) - 8, { font: 'mono', size: 11, weight: 600, color: col });
      });
      [0, Math.round(yMax / 2), Math.round(yMax)].forEach((v) => d.text(v + 'ms', cx - 6, Y(v), { align: 'right', font: 'mono', size: 10, color: C.muted }));
      if (!recording) d.pill('❚❚ PAUSED · bật Record để tiếp tục', cx + cw - 8 - 250, cy + 14, { size: 11, fill: C.navy2 });
      // Hierarchy
      const f = selected || frames[frames.length - 1];
      const hy = cy + ch + 14, hh = h - hy - 10;
      d.node(10, hy, w - 20, hh, null, { accent: f.total > 33.3 ? C.red : f.total > 16.6 ? C.yellow : C.green, shadow: 4 });
      d.text(`Hierarchy · frame #${f.no} · ${f.total.toFixed(1)}ms` + (w < 520 ? '' : ` · ${f.batches} batches`), 24, hy + 18, { font: 'cond', weight: 700, size: 14, color: C.navy });
      const cMs = w - 150, cPct = w - 92, cGc = w - 30;
      if (w >= 520) [['ms', cMs], ['%', cPct], ['GC', cGc]].forEach(([t, x]) => d.text(t, x, hy + 18, { align: 'right', font: 'mono', size: 11, color: C.muted }));
      const rows = [{ name: 'PlayerLoop', ms: f.total, depth: 0, gc: f.gc, cat: null }].concat(
        f.items.filter((x) => x.ms > 0.06));
      const rh = 19, maxRows = Math.floor((hh - 34) / rh);
      rows.slice(0, maxRows).forEach((r, i) => {
        const y = hy + 38 + i * rh, cat = CATS.find((c) => c.k === r.cat), hot = r.ms > 4;
        if (i % 2) d.rect(16, y - rh / 2, w - 32, rh, { fill: 'rgba(233,220,202,0.35)', r: 4 });
        if (cat) d.rect(24 + r.depth * 14, y - 4, 8, 8, { fill: cat.color, r: 2 });
        let name = r.name; const maxW = cMs - 50 - (36 + r.depth * 14);
        while (name.length > 4 && d.measure(name, { font: 'mono', size: 11 }) > maxW) name = name.slice(0, -2) + '…';
        d.text(name, 36 + r.depth * 14, y, { font: 'mono', size: 11, weight: hot ? 700 : 500, color: hot ? C.red : C.ink });
        d.text(r.ms.toFixed(2), cMs, y, { align: 'right', font: 'mono', size: 11, color: hot ? C.red : C.navy });
        d.text(Math.round((r.ms / f.total) * 100) + '%', cPct, y, { align: 'right', font: 'mono', size: 11, color: C.muted });
        d.text(r.gc ? r.gc + 'KB' : '0', cGc, y, { align: 'right', font: 'mono', size: 11, color: r.gc ? C.orange : C.faint });
      });
    }
  },
});
