/* Lesson: Collections & LINQ — animated O(n) scan vs O(1) hash lookup, LINQ pipeline, GC alloc graph for LINQ in Update. */
U101.defineLesson('collections-linq', {
  lead: 'Chọn đúng collection quyết định code nhanh hay chậm: List phải duyệt từng phần tử để tìm, còn Dictionary/HashSet nhảy thẳng tới bucket nhờ hash. LINQ viết gọn nhưng cấp phát bộ nhớ, đặt trong Update sẽ gây GC spike.',
  hint: 'Đổi loại collection rồi bấm Add / Remove / Find để đếm số bước · bật "LINQ trong Update" và nhìn biểu đồ GC',
  overview: `
    <p>Mọi collection trong <code>System.Collections.Generic</code> đều chứa nhiều phần tử, nhưng tổ chức bên trong khác nhau:</p>
    <ul>
      <li><b>Array</b> <code>int[]</code>: kích thước cố định, truy cập theo index O(1). Không Add/Remove được.</li>
      <li><b>List&lt;T&gt;</b>: mảng tự giãn. Thêm cuối O(1), nhưng <code>Contains</code>/<code>Remove(value)</code> phải duyệt O(n), và xóa giữa phải dời các phần tử sau.</li>
      <li><b>Dictionary&lt;K,V&gt;</b> và <b>HashSet&lt;T&gt;</b>: tính <code>hash(key)</code> để biết bucket, tra cứu trung bình O(1). HashSet không chứa phần tử trùng.</li>
      <li><b>Queue&lt;T&gt;</b> (FIFO: vào trước ra trước) và <b>Stack&lt;T&gt;</b> (LIFO: vào sau ra trước): thêm/lấy ở đầu mút O(1).</li>
      <li><b>LINQ</b> (<code>using System.Linq</code>): <code>Where</code> lọc, <code>OrderBy</code> sắp xếp, <code>Select</code> biến đổi. Code dễ đọc, nhưng mỗi lần gọi tạo iterator, delegate và list mới trên heap.</li>
    </ul>
    <p class="callout">LINQ trong <code>Start</code> hay khi load màn chơi thì không sao. Trong <code>Update</code> (60 lần/giây), rác tích tụ và Garbage Collector sẽ dừng game để dọn, gây <b>khựng frame</b>. Hãy dùng vòng <code>for</code> và một List được tái sử dụng.</p>`,
  keyPoints: [
    'Cần tìm nhanh theo key → Dictionary/HashSet (O(1)). Duyệt tuần tự theo thứ tự → List/Array.',
    'Queue cho hàng đợi FIFO (lượt chơi, spawn), Stack cho LIFO (undo, màn hình UI).',
    'LINQ: Where / Select / OrderBy gọn và dễ đọc, nhưng có cấp phát heap.',
    'Trong Update: tránh LINQ, tái sử dụng List và gọi Clear() thay vì new.',
  ],
  code: {
    title: 'EnemyTracker.cs',
    source: `
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class EnemyTracker : MonoBehaviour
{
    private readonly Dictionary<int, Enemy> byId = new();   // tra cứu O(1)
    private readonly List<Enemy> alive = new();
    private readonly List<Enemy> weakBuffer = new();         // tái sử dụng

    void Start()  // LINQ ở đây: chạy 1 lần, ổn
    {
        var weakest = alive.Where(e => e.Hp < 50).OrderBy(e => e.Hp)
                           .Select(e => e.name).ToList();
        Debug.Log(string.Join(", ", weakest));
    }

    void Update() // mỗi frame: vòng for, không cấp phát
    {
        weakBuffer.Clear();
        for (int i = 0; i < alive.Count; i++)
            if (alive[i].Hp < 50) weakBuffer.Add(alive[i]);
    }

    public Enemy Find(int id) => byId.TryGetValue(id, out var e) ? e : null;
}`,
    note: 'Enemy là một MonoBehaviour có property Hp. new() rút gọn cần C# 9 (Unity 2021.2+).',
  },
  tryIt: [
    'Với List, bấm Find nhiều lần: số bước phụ thuộc vào vị trí phần tử.',
    'Chuyển sang HashSet và Find: luôn chỉ 1 bước. Vì sao phần tử 17 nằm ở bucket 1?',
    'Chọn int[] rồi bấm Add. Đọc lỗi trong Console.',
    'Queue: Add rồi Remove. Phần tử nào ra trước? So với Stack.',
    'Bấm "Chạy LINQ" để xem Where → OrderBy → Select.',
    'Bật "LINQ trong Update", tăng số enemy: GC spike xuất hiện dày hơn không?',
  ],
  links: [
    { label: 'Collections (Microsoft)', url: 'https://learn.microsoft.com/dotnet/standard/collections/' },
    { label: 'LINQ overview (Microsoft)', url: 'https://learn.microsoft.com/dotnet/csharp/linq/' },
    { label: 'Unity Manual: Garbage collection best practices', url: 'https://docs.unity3d.com/Manual/performance-garbage-collection-best-practices.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const T = {
      list: { label: 'List<int>', ops: ['Add', 'Remove(v)', 'Contains'], big: ['O(1)', 'O(n)', 'O(n)'] },
      array: { label: 'int[]', ops: ['Add', 'Remove', 'IndexOf'], big: ['—', '—', 'O(n)'] },
      dict: { label: 'Dictionary<int,int>', ops: ['Add', 'Remove(key)', 'TryGetValue'], big: ['O(1)', 'O(1)', 'O(1)'] },
      hash: { label: 'HashSet<int>', ops: ['Add', 'Remove', 'Contains'], big: ['O(1)', 'O(1)', 'O(1)'] },
      queue: { label: 'Queue<int>', ops: ['Enqueue', 'Dequeue', 'Contains'], big: ['O(1)', 'O(1)', 'O(n)'] },
      stack: { label: 'Stack<int>', ops: ['Push', 'Pop', 'Contains'], big: ['O(1)', 'O(1)', 'O(n)'] },
    };
    const BUCKETS = 8, MAX = 10;
    let type = 'list', items = [], nextId = 1, op = null, linq = null, gcOn = false, enemies = 200;
    let heap = 0, samples = new Array(120).fill(0), spikes = [], acc = 0, lastGcLog = -9;
    const isHash = () => type === 'dict' || type === 'hash';
    const rnd = () => Math.floor(U.rand(10, 99));
    const mk = (v) => ({ v, id: nextId++, px: null, py: null, a: 0, dead: false, hit: 0 });
    const keyOf = (it) => (type === 'dict' ? it.id : it.v);
    function fill() { items = []; nextId = 1; [42, 17, 73, 8, 56, 31].forEach((v) => items.push(mk(v))); if (type === 'array') items.push(mk(64), mk(25)); }

    stage.ui.group('Collection');
    stage.ui.select('Kiểu', Object.entries(T).map(([value, t]) => ({ value, label: t.label })), type, (v) => { type = v; op = null; fill(); relabel(); stage.log(`Đổi sang ${T[v].label}`); });
    const btns = [0, 1, 2].map((i) => stage.ui.button('', () => doOp(i), { variant: i === 2 ? 'primary' : undefined }));
    const steps = stage.ui.readout('Số bước · Big-O', '—');
    stage.ui.group('LINQ & GC');
    stage.ui.button('Chạy LINQ', runLinq, { variant: 'accent' });
    stage.ui.toggle('LINQ trong Update()', gcOn, (v) => { gcOn = v; stage.log(v ? 'Update(): enemies.Where(...).ToList() mỗi frame → rác trên heap' : 'Update(): vòng for + List tái sử dụng → 0 B/frame'); });
    stage.ui.slider('Số enemy', { min: 50, max: 1000, step: 50, value: enemies }, (v) => (enemies = v));
    const allocR = stage.ui.readout('GC Alloc / frame', '0 B');
    function relabel() { btns.forEach((b, i) => b.set(T[type].ops[i])); steps.set('—'); }

    function doOp(i) {
      if (op) return;
      const name = T[type].ops[i], live = items.filter((it) => !it.dead);
      if (type === 'array' && i < 2) return stage.log(`error: int[] có kích thước cố định, không có ${name}(). Dùng List<int> hoặc tạo mảng mới`, 'error');
      if (i === 0) {
        if (live.length >= MAX) return stage.log('Demo giới hạn 10 phần tử', 'warn');
        const v = type === 'hash' && live.length && Math.random() < 0.35 ? live[0].v : rnd();
        if (type === 'hash' && live.some((it) => it.v === v)) { live[0].hit = 1; return stage.log(`set.Add(${v}) → false: HashSet không chứa phần tử trùng`, 'warn'); }
        const it = mk(v); items.push(it); steps.set(`1 · ${T[type].big[0]}`);
        return stage.log(type === 'dict' ? `dict.Add(${it.id}, ${v}) → bucket ${it.id % BUCKETS}` : isHash() ? `set.Add(${v}) → hash ${v} % ${BUCKETS} = bucket ${v % BUCKETS}` : `${name}(${v})`);
      }
      if (!live.length) return stage.log('Collection đang rỗng', 'warn');
      let target;
      if (type === 'queue' && i === 1) target = live[0];
      else if (type === 'stack' && i === 1) target = live[live.length - 1];
      else target = live[Math.floor(Math.random() * live.length)];
      const scan = !isHash() && !((type === 'queue' || type === 'stack') && i === 1);
      op = { i, target, idx: scan ? 0 : live.indexOf(target), scan, t: 0, live };
      if (!scan) { op.idx = live.indexOf(target); target.hit = 1; }
    }
    function finishOp() {
      const { i, target, scan, live } = op, n = scan ? live.indexOf(target) + 1 : 1, k = keyOf(target);
      steps.set(`${n} · ${T[type].big[i]}`);
      if (i === 1) target.dead = true;
      const call = type === 'dict' ? `${T[type].ops[i].split('(')[0]}(${k})` : `${T[type].ops[i].split('(')[0]}(${(type === 'queue' || type === 'stack') && i === 1 ? '' : k})`;
      stage.log(`${call} → ${scan ? `duyệt ${n} phần tử` : isHash() ? `hash → bucket ${k % BUCKETS}, 1 bước` : 'lấy ở đầu mút, 1 bước'}${i === 1 ? ` · xóa ${target.v}` : ' · tìm thấy'}`, scan && n > 4 ? 'warn' : 'info');
      op = null;
    }
    function runLinq() {
      const src = items.filter((it) => !it.dead).map((it) => it.v);
      const w = src.filter((x) => x < 50), o = [...w].sort((a, b) => a - b), s = o.map((x) => x * 2);
      linq = { stages: [['Where(x => x < 50)', w], ['OrderBy(x => x)', o], ['Select(x => x * 2)', s]], t: 0 };
      stage.log(`LINQ: ${src.length} phần tử → Where ${w.length} → OrderBy → Select [${s.join(', ')}] · cấp phát iterator, delegate và List mới trên heap`);
    }

    stage.onFrame((dt) => {
      items.forEach((it) => { it.a = Math.min(1, it.a + dt * 4); it.hit = Math.max(0, it.hit - dt * 1.5); });
      items = items.filter((it) => !(it.dead && (it.a -= dt * 7) <= 0));
      if (op) { op.t += dt; if (op.scan && op.t > 0.16) { op.t = 0; const cur = op.live[op.idx]; cur.hit = 1; if (cur === op.target) finishOp(); else op.idx++; } else if (!op.scan && op.t > 0.45) finishOp(); }
      if (linq) linq.t += dt / 0.9;
      acc += dt;
      while (acc >= 1 / 30) { // 30 mẫu/giây, mỗi mẫu = 2 frame game
        acc -= 1 / 30;
        const alloc = gcOn ? 2 * (152 + enemies * 8) : 0;
        heap += alloc / 1024;
        if (heap > 160) { heap = 4; spikes.push(0); if (stage.time - lastGcLog > 3) { lastGcLog = stage.time; stage.log(`GC.Collect: dọn rác, frame bị khựng (~${(4 + enemies / 120).toFixed(1)} ms)`, 'warn'); } }
        samples.push(heap); if (samples.length > 120) samples.shift();
        spikes = spikes.map((s) => s + 1).filter((s) => s < 120);
        allocR.set(gcOn ? `${(152 + enemies * 8).toLocaleString('en')} B` : '0 B');
      }
      render();
    });

    function render() {
      const { w, h } = stage, pad = 16, live = items;
      d.clear(w, h); d.grid(w, h);
      const colH = Math.max(120, h * 0.42), gTop = colH + 24 + 76, gH = h - gTop - 12;
      d.text(T[type].label, pad, 18, { font: 'mono', size: 13, weight: 700, color: C.navy });
      d.text(isHash() ? `bucket = hash(key) % ${BUCKETS}` : type === 'queue' ? 'đầu ← Dequeue · Enqueue → cuối' : type === 'stack' ? 'Push / Pop ở đỉnh (bên phải)' : 'index 0 … n-1', w - pad, 18, { align: 'right', font: 'mono', size: 11, color: C.muted });
      // Target positions
      const cell = Math.min(isHash() ? 84 : 64, (w - pad * 2) / (isHash() ? BUCKETS : MAX)), bw = cell - 6;
      const counts = new Array(BUCKETS).fill(0), bh = Math.min(34, (colH - 60) / 4);
      if (isHash()) for (let b = 0; b < BUCKETS; b++) {
        d.rect(pad + b * cell + 2, 34, bw + 2, colH - 34, { fill: 'rgba(226,215,199,0.35)', r: 6 });
        d.text(b, pad + b * cell + cell / 2, colH - 10, { align: 'center', font: 'mono', size: 11, color: C.faint });
      }
      let li = 0;
      live.forEach((it) => {
        let tx, ty;
        if (isHash()) { const b = keyOf(it) % BUCKETS; tx = pad + b * cell + 3; ty = 42 + counts[b]++ * (bh + 4); }
        else { const i = it.dead ? li : li++; tx = pad + i * cell + 3; ty = colH / 2 - 4; }
        if (it.px == null) { it.px = tx; it.py = ty - 20; }
        it.px = U.lerp(it.px, tx, 0.18); it.py = U.lerp(it.py, ty, 0.18);
        const lift = it.hit * 6, scanning = op && op.target === it && it.hit > 0;
        stage.ctx.globalAlpha = it.a;
        d.node(it.px, it.py - lift, bw, bh, null, { accent: it.hit > 0 ? (scanning ? C.green : C.orange) : C.line, lw: 2 + it.hit * 2, shadow: 4 });
        d.text(type === 'dict' ? `${it.id}:${it.v}` : it.v, it.px + bw / 2, it.py - lift + bh / 2, { align: 'center', font: 'mono', size: bw < 44 ? 11 : 13, weight: 700, color: C.navy });
        stage.ctx.globalAlpha = 1;
        if ((type === 'list' || type === 'array') && !it.dead) d.text(li - 1, it.px + bw / 2, it.py + bh + 10, { align: 'center', font: 'mono', size: 11, color: C.faint });
      });
      if (type === 'stack' && live.length) { const t = live.filter((x) => !x.dead).pop(); if (t) d.pill('Top', t.px + bw / 2, t.py - 16, { align: 'center', fill: C.purple, size: 11 }); }
      if (op && op.scan) d.text(`đang duyệt… bước ${op.idx + 1}`, pad, colH + 4, { font: 'mono', size: 11, color: C.green });
      // LINQ pipeline row
      const lTop = colH + 24;
      d.rect(pad, lTop, w - pad * 2, gTop - lTop - 12, { fill: 'rgba(42,86,163,0.05)', stroke: C.lineSoft, r: 8 });
      if (!linq) d.text('Bấm "Chạy LINQ": items.Where(x => x < 50).OrderBy(x => x).Select(x => x * 2)', pad + 10, lTop + 18, { font: 'mono', size: 11, color: C.muted });
      else {
        const s = Math.min(2, Math.floor(linq.t)), [label, vals] = linq.stages[s];
        d.pill(`.${label}`, pad + 10, lTop + 18, { fill: [C.teal, C.blue, C.purple][s], size: 11 });
        vals.forEach((v, i) => { const x = pad + 10 + i * 44; if (x + 40 < w - pad) d.node(x, lTop + 32, 40, 24, String(v), { accent: [C.teal, C.blue, C.purple][s], size: 12, shadow: 2, font: 'mono' }); });
        if (!vals.length) d.text('(rỗng)', pad + 10, lTop + 44, { font: 'mono', size: 11, color: C.faint });
      }
      // GC graph
      d.text('Managed heap (KB) · minh họa', pad, gTop + 6, { font: 'mono', size: 11, color: C.muted });
      const gx = pad, gy = gTop + 16, gw = w - pad * 2, gh = Math.max(30, gH - 18);
      d.rect(gx, gy, gw, gh, { fill: C.card, stroke: C.lineSoft, r: 6 });
      spikes.forEach((s) => { const x = gx + gw - (s / 120) * gw; d.line(x, gy + 2, x, gy + gh - 2, { stroke: C.red, lw: 2 }); d.text('GC', x + 4, gy + 10, { font: 'mono', size: 11, weight: 700, color: C.red }); });
      if (!gcOn) d.text('Update() dùng vòng for + List tái sử dụng: 0 B/frame, heap đứng yên', gx + 10, gy + 16, { font: 'mono', size: 11, color: C.green });
      d.poly(samples.map((v, i) => [gx + gw - ((samples.length - 1 - i) / 120) * gw, gy + gh - 4 - (v / 170) * (gh - 8)]), { stroke: gcOn ? C.orange : C.green, lw: 2 });
    }
    fill(); relabel(); render();
  },
});
