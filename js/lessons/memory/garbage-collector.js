/* Lesson: Garbage Collector — per-frame allocations fill the managed heap, mark & sweep, frame-time spikes. */
U101.defineLesson('garbage-collector', {
  lead: 'Mỗi lần new một class, string hay mảng là một lần cấp phát trên managed heap. Khi heap đầy, Garbage Collector dừng game để đánh dấu object còn dùng và quét bỏ phần còn lại. Đó là lý do frame bị giật.',
  hint: 'Quan sát heap đầy dần rồi GC quét · tắt "String concat" và bật "Cache List" để GC Alloc về 0 · bật Incremental GC để san phẳng spike',
  overview: `
    <p>Unity (Mono và IL2CPP) dùng <b>Boehm GC</b>: một bộ thu gom kiểu <b>mark & sweep</b>, <b>không generational</b> và <b>không compact</b>.</p>
    <ul>
      <li><b>Mark</b>: bắt đầu từ các <b>root</b> (biến static, biến local trên stack, object Unity đang sống), lần theo mọi reference và đánh dấu object còn với tới được.</li>
      <li><b>Sweep</b>: object không được đánh dấu là <b>unreachable</b>. Vùng nhớ của chúng được trả lại cho heap.</li>
      <li>GC mặc định là <b>stop-the-world</b>: main thread dừng cho tới khi xong. Heap càng nhiều object, càng tốn thời gian và tạo <b>spike</b> trên Profiler.</li>
      <li><b>Incremental GC</b> (Player Settings → Use incremental GC, bật mặc định từ 2019.1) chia công việc thành nhiều lát nhỏ qua nhiều frame. Tổng chi phí không giảm nhưng không còn một frame bị giật lớn.</li>
    </ul>
    <p class="callout">Cách tốt nhất để GC không gây giật là <b>không tạo rác</b> trong vòng lặp game. Mở Profiler → CPU Usage → cột <b>GC Alloc</b>, mục tiêu là 0 B mỗi frame ở gameplay.</p>`,
  keyPoints: [
    'Rác = object trên heap không còn reference nào từ root tới.',
    'GC chạy khi heap không đủ chỗ cho lần cấp phát tiếp theo, không phải theo lịch.',
    'Nguồn rác hay gặp: nối string trong Update, new List/mảng mỗi frame, LINQ, boxing, closure.',
    'Incremental GC san phẳng spike nhưng không thay được việc giảm GC Alloc.',
  ],
  code: {
    title: 'ScoreHud.cs',
    source: `
using System.Collections.Generic;
using System.Text;
using TMPro;
using UnityEngine;

public class ScoreHud : MonoBehaviour
{
    [SerializeField] private TMP_Text label;
    private readonly List<Enemy> nearby = new List<Enemy>(64); // tạo 1 lần, tái sử dụng
    private readonly StringBuilder sb = new StringBuilder(32);
    private int lastScore = -1;

    void Update()
    {
        // ✗ label.text = "Score: " + GameState.Score;  → string mới mỗi frame
        if (GameState.Score != lastScore)            // chỉ cập nhật khi giá trị đổi
        {
            lastScore = GameState.Score;
            sb.Clear().Append("Score: ").Append(lastScore);
            label.SetText(sb);
        }

        // ✗ var nearby = new List<Enemy>();  → rác mỗi frame
        nearby.Clear();
        EnemyRegistry.FindNearby(transform.position, 10f, nearby);
    }
}`,
    note: 'Hai thay đổi trên tương ứng với hai toggle trong mô phỏng: bỏ nối string trong Update, và cache List thay vì new mỗi frame.',
  },
  tryIt: [
    'Để mặc định và đếm: bao nhiêu frame thì heap đầy và GC chạy? Spike cao bao nhiêu ms?',
    'Tắt "String concat" và bật "Cache List". GC Alloc/frame còn bao nhiêu?',
    'Bật lại rác rồi bật Incremental GC: spike đỏ biến thành nhiều cột tím thấp.',
    'Bấm GC.Collect() khi heap mới đầy một nửa. Spike ngắn hơn hay dài hơn?',
    'Nhìn các ô xanh (Enemy sống lâu): GC không xóa chúng vì còn nối với root.',
  ],
  links: [
    { label: 'Unity Manual: Garbage collector overview', url: 'https://docs.unity3d.com/Manual/performance-garbage-collector.html' },
    { label: 'Unity Manual: Incremental garbage collection', url: 'https://docs.unity3d.com/Manual/performance-incremental-garbage-collection.html' },
    { label: 'Fundamentals of garbage collection (.NET)', url: 'https://learn.microsoft.com/dotnet/standard/garbage-collection/fundamentals' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const COLS = 20, ROWS = 7, N = COLS * ROWS, HIST = 60, ROOTS = ['static', 'stack', 'Scene'];
    const KIND = [{ name: 'string', col: C.orange, bytes: 58 }, { name: 'List<Enemy>', col: C.blue, bytes: 152 }, { name: 'Enemy', col: C.green, bytes: 96 }];
    const cells = Array.from({ length: N }, () => ({ s: 0, kind: 0, life: 0, root: 0, born: -9, mark: false })); // s: 0 free · 1 live · 2 garbage
    let concat = true, cached = false, incremental = false, speed = 10;
    let frames = [], frameNo = 0, timer = 0, gcCount = 0, gc = null, allocBytes = 0, prefill = true, t = 0;

    const used = () => cells.filter((c) => c.s).length;
    function startGC(inc, reason) {
      if (gc) return;
      cells.forEach((c) => (c.mark = false));
      gc = { inc, t: 0, cursor: 0, phase: 'mark', ms: 4 + used() * 0.22 };
      if (!prefill) stage.log(`${reason} → ${inc ? 'Incremental GC bắt đầu (chia lát qua nhiều frame)' : 'GC stop-the-world: main thread dừng'}`, inc ? 'info' : 'warn');
    }
    function finishGC() {
      let freed = 0;
      cells.forEach((c) => { if (c.s === 2) { c.s = 0; freed++; } c.mark = false; });
      gcCount++;
      if (!gc.inc) frames.push({ ms: gc.ms, gc: true });
      if (!prefill) stage.log(`GC xong: giải phóng ${freed} object${gc.inc ? '' : ` · frame này mất ${gc.ms.toFixed(1)} ms`}`, gc.inc ? 'info' : 'warn');
      gc = null; readouts();
    }
    function alloc(kind, life) {
      let i = cells.findIndex((c) => c.s === 0);
      if (i < 0) {
        if (gc && gc.inc) { stage.log('Heap đầy giữa chừng incremental → phải chạy full GC', 'error'); gc = null; }
        startGC(false, 'Heap đầy'); if (prefill) finishGC(); return false;
      }
      Object.assign(cells[i], { s: 1, kind, life, root: Math.floor(Math.random() * 3), born: t, mark: !!gc });
      allocBytes += KIND[kind].bytes; return true;
    }
    function stepFrame() {
      frameNo++; allocBytes = 0;
      let ms = 6.5 + Math.random() * 2;
      cells.forEach((c) => { if (c.s === 1 && --c.life <= 0) c.s = 2; }); // temps die after their frame
      const jobs = [];
      if (concat) jobs.push([0, 1], [0, 1], [0, 1]);
      if (!cached) jobs.push([1, 1], [1, 1]);
      if (Math.random() < 0.12) jobs.push([2, 40 + Math.floor(Math.random() * 80)]);
      for (const [k, life] of jobs) if (!alloc(k, life) && !prefill) return; // world stopped
      if (gc && gc.inc) { // one time slice per frame
        gc.cursor += 28; ms += 1.6;
        if (gc.phase === 'mark') { cells.forEach((c, i) => { if (i < gc.cursor && c.s === 1) c.mark = true; }); if (gc.cursor >= N) { gc.phase = 'sweep'; gc.cursor = 0; } }
        else { cells.forEach((c, i) => { if (i < gc.cursor && c.s === 2) c.s = 0; }); if (gc.cursor >= N) finishGC(); }
      } else if (incremental && !gc && used() > N * 0.7) startGC(true, 'Heap dùng > 70%');
      frames.push({ ms, inc: gc && gc.inc });
      if (frames.length > HIST) frames.splice(0, frames.length - HIST);
    }

    stage.ui.group('Code trong Update()');
    stage.ui.toggle('String concat mỗi frame', concat, (v) => { concat = v; stage.log(v ? '"HP: " + hp → 3 string mới mỗi frame' : 'Đã bỏ nối string trong Update'); });
    stage.ui.toggle('Cache List (tái sử dụng)', cached, (v) => { cached = v; stage.log(v ? 'List được tạo 1 lần, mỗi frame chỉ Clear()' : 'new List<Enemy>() mỗi frame → 2 object rác'); });
    stage.ui.group('Garbage Collector');
    stage.ui.toggle('Incremental GC', incremental, (v) => { incremental = v; stage.log(v ? 'Incremental: GC chạy từng lát ~1.6 ms mỗi frame' : 'Stop-the-world: GC chạy trọn trong 1 frame'); });
    stage.ui.slider('Tốc độ xem', { min: 2, max: 30, value: speed, unit: ' frame/s' }, (v) => (speed = v));
    stage.ui.button('GC.Collect()', () => startGC(false, 'Gọi GC.Collect() thủ công'), { variant: 'danger' });
    const rAlloc = stage.ui.readout('GC Alloc/frame', '—'), rHeap = stage.ui.readout('Heap dùng', '—'), rCount = stage.ui.readout('Số lần GC', '0');
    function readouts() { rAlloc.set(`${allocBytes} B`); rHeap.set(`${Math.round((used() / N) * 100)}%`); rCount.set(String(gcCount)); }

    for (let i = 0; i < 70; i++) { stepFrame(); t += 0.1; } // history so the first paint already tells the story
    prefill = false; readouts();

    stage.onFrame((dt) => {
      t += dt;
      if (gc && !gc.inc) { // stop-the-world animation (slowed down to be visible)
        gc.t += dt; gc.phase = gc.t < 0.6 ? 'mark' : 'sweep';
        if (gc.phase === 'mark') cells.forEach((c) => c.s === 1 && (c.mark = true));
        gc.cursor = gc.phase === 'mark' ? N * (gc.t / 0.6) : N * ((gc.t - 0.6) / 0.6);
        if (gc.phase === 'sweep') cells.forEach((c, i) => { if (i < gc.cursor && c.s === 2) c.s = 0; });
        if (gc.t >= 1.2) finishGC();
      } else if ((timer += dt) >= 1 / speed) { timer = 0; stepFrame(); readouts(); }
      render();
    });

    function render() {
      const { w, h } = stage, pad = 14;
      d.clear(w, h); d.grid(w, h);
      const gh = Math.max(110, h * 0.32), top = h - gh - pad;
      // Roots
      const rootW = Math.min(92, w * 0.18), rootY = (i) => pad + 30 + i * ((top - pad - 40) / 3) + 18;
      d.text('ROOTS', pad, pad + 10, { font: 'mono', size: 11, weight: 700, color: C.tealDeep });
      ROOTS.forEach((r, i) => d.node(pad, rootY(i) - 15, rootW, 30, r, { accent: C.teal, size: 13, shadow: 4 }));
      // Heap grid
      const hx = pad + rootW + 24, hw = w - hx - pad, cs = Math.min(hw / COLS, (top - pad - 40) / ROWS), gx = hx + (hw - cs * COLS) / 2, gy = pad + 30;
      d.text(`MANAGED HEAP · ${used()}/${N}`, hx, pad + 10, { font: 'mono', size: 11, weight: 700, color: C.purple });
      if (gc) d.pill(gc.phase === 'mark' ? 'MARK' : 'SWEEP', w - pad, pad + 10, { fill: gc.phase === 'mark' ? C.teal : C.red, size: 11, align: 'center' });
      const cx = (i) => gx + (i % COLS) * cs, cy = (i) => gy + Math.floor(i / COLS) * cs;
      cells.forEach((c, i) => { // reference lines for long-lived objects
        if (c.s === 1 && c.kind === 2) d.line(pad + rootW, rootY(c.root), cx(i) + cs / 2, cy(i) + cs / 2, { stroke: gc && gc.phase === 'mark' ? 'rgba(26,163,161,0.7)' : 'rgba(63,168,107,0.28)', lw: 1.2 });
      });
      cells.forEach((c, i) => {
        const x = cx(i) + 1.5, y = cy(i) + 1.5, s = cs - 3;
        if (c.s === 0) return d.rect(x, y, s, s, { stroke: C.lineSoft, lw: 1, r: 3 });
        const fresh = U.clamp(1 - (t - c.born) / 0.5, 0, 1);
        if (c.s === 2) d.rect(x, y, s, s, { fill: 'rgba(173,162,147,0.45)', stroke: KIND[c.kind].col, lw: 1, r: 3, dash: [2, 2] });
        else d.rect(x - fresh, y - fresh, s + fresh * 2, s + fresh * 2, { fill: KIND[c.kind].col, stroke: fresh > 0 ? C.paper : null, lw: 1, r: 3 });
        if (c.mark && c.s === 1) d.rect(x - 2, y - 2, s + 4, s + 4, { stroke: C.teal, lw: 2, r: 4 });
      });
      if (gc) { const i = Math.min(N - 1, Math.floor(gc.cursor)); d.rect(cx(i), cy(i), cs, cs, { stroke: gc.phase === 'mark' ? C.teal : C.red, lw: 2.5, r: 4 }); }
      // Legend
      const ly = gy + ROWS * cs + 14; let lx = gx;
      [[C.orange, 'string'], [C.blue, 'List'], [C.green, 'Enemy (sống lâu)'], [C.faint, 'rác']].forEach(([col, lab]) => {
        d.rect(lx, ly - 5, 10, 10, { fill: col, r: 2 }); d.text(lab, lx + 15, ly, { font: 'mono', size: 11, color: C.muted }); lx += d.measure(lab, { font: 'mono', size: 11 }) + 32;
      });
      // Frame-time graph
      const gx0 = pad + 34, gw = w - gx0 - pad, gy0 = top + 16, gH = gh - 22, maxMs = 40, yOf = (ms) => gy0 + gH - (Math.min(ms, maxMs) / maxMs) * gH;
      d.rect(pad, top, w - pad * 2, gh, { fill: 'rgba(255,255,255,0.55)', stroke: C.line, r: 10 });
      d.text('CPU ms/frame', pad + 10, top + 12, { font: 'mono', size: 11, weight: 700, color: C.navy });
      [[16.7, '60fps', C.green], [33.3, '30fps', C.red]].forEach(([ms, lab, col]) => {
        d.line(gx0, yOf(ms), gx0 + gw, yOf(ms), { stroke: col, lw: 1, dash: [4, 4] }); d.text(lab, gx0 - 4, yOf(ms), { align: 'right', font: 'mono', size: 10, color: col });
      });
      const bw = gw / HIST;
      frames.forEach((f, i) => {
        const col = f.gc ? C.red : f.inc ? C.purple : f.ms > 16.7 ? C.yellow : C.green;
        d.rect(gx0 + i * bw + 1, yOf(f.ms), Math.max(1, bw - 2), gy0 + gH - yOf(f.ms), { fill: col, r: 2 });
        if (f.gc && bw > 6) d.text(`${f.ms.toFixed(0)}ms`, gx0 + i * bw + bw / 2, yOf(f.ms) - 8, { align: 'center', font: 'mono', size: 10, weight: 700, color: C.red });
      });
    }
  },
});
