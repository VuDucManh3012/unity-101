/* Lesson: Algorithms & Big O — sorting visualizer, linear vs binary search, growth chart, hash table buckets. */
U101.defineLesson('algorithms-bigo', {
  lead: 'Big O mô tả số bước của thuật toán tăng thế nào khi dữ liệu n lớn lên. Chọn đúng cấu trúc dữ liệu (mảng đã sắp xếp, hash table...) thường quan trọng hơn mọi mẹo tối ưu nhỏ.',
  hint: 'Đổi Chế độ: Sắp xếp · Tìm kiếm · Biểu đồ Big O · Hash table, rồi bấm Chạy / Bước',
  overview: `
    <p>Trong game, mỗi frame chỉ có ~16 ms. Một vòng lặp <b>O(n²)</b> chạy ổn với 50 enemy có thể làm game giật khi lên 2000 enemy.</p>
    <ul>
      <li><b>Sắp xếp</b>: Bubble và Insertion là O(n²). Quick sort trung bình O(n log n) (xấu nhất O(n²)), Merge sort luôn O(n log n) nhưng tốn thêm bộ nhớ. <code>List.Sort</code> / <code>Array.Sort</code> của .NET dùng introsort.</li>
      <li><b>Tìm kiếm</b>: duyệt tuần tự là O(n). Trên mảng <b>đã sắp xếp</b>, binary search chia đôi mỗi bước nên là O(log n): 1 triệu phần tử chỉ cần ~20 bước.</li>
      <li><b>Hash table</b> (<code>Dictionary</code>, <code>HashSet</code>): hash key ra bucket, trung bình O(1). Hash tệ hoặc load factor cao gây <b>collision</b>, chuỗi dài ra và tệ dần về O(n).</li>
    </ul>
    <p class="callout">Big O bỏ qua hằng số. Với n nhỏ (vd 10 phần tử), một vòng lặp đơn giản có thể nhanh hơn Dictionary. Hãy đo bằng Profiler khi n thực sự lớn.</p>`,
  keyPoints: [
    'O(1) < O(log n) < O(n) < O(n log n) < O(n²): khác biệt bùng nổ khi n lớn.',
    'Binary search cần dữ liệu đã sắp xếp. Đổi lại, mỗi bước loại bỏ một nửa.',
    'Dictionary/HashSet tra cứu trung bình O(1). Dùng thay cho List.Contains trong vòng lặp.',
    'Tránh O(n²) mỗi frame (so mọi cặp object). Hãy dùng spatial hash, grid hoặc Physics.OverlapSphere.',
  ],
  code: {
    title: 'EnemyRegistry.cs',
    source: `
using System.Collections.Generic;
using UnityEngine;

public class EnemyRegistry : MonoBehaviour
{
    private readonly List<Enemy> list = new List<Enemy>();
    private readonly Dictionary<int, Enemy> byId = new Dictionary<int, Enemy>(); // hash table

    public void Register(Enemy e) { list.Add(e); byId[e.Id] = e; }

    // O(n): duyệt từng phần tử
    public Enemy FindSlow(int id) { foreach (var e in list) if (e.Id == id) return e; return null; }

    // O(1) trung bình: hash(id) → bucket
    public Enemy FindFast(int id) => byId.TryGetValue(id, out var e) ? e : null;

    // O(n log n) một lần, sau đó tìm theo máu bằng binary search O(log n)
    public int IndexByHealth(int hp)
    {
        list.Sort((a, b) => a.Health.CompareTo(b.Health));
        int lo = 0, hi = list.Count - 1;
        while (lo <= hi)
        {
            int mid = lo + (hi - lo) / 2;            // tránh tràn số
            if (list[mid].Health == hp) return mid;
            if (list[mid].Health < hp) lo = mid + 1; else hi = mid - 1;
        }
        return -1;
    }
}`,
    note: 'Gọi FindSlow trong Update cho 1000 enemy là 1 triệu phép so sánh mỗi frame. FindFast gần như không tốn gì.',
  },
  tryIt: [
    'Sắp xếp n = 40 bằng Bubble rồi bằng Merge: so số phép so sánh với n²/2 và n·log₂n.',
    'Chạy Quick sort trên mảng đã sắp xếp sẵn (bấm Chạy lần 2): vì sao chậm hẳn đi?',
    'Ở Tìm kiếm, binary search cần tối đa bao nhiêu bước với 31 phần tử? (gợi ý: log₂32)',
    'Ở Big O, kéo n lên 256 và bật thang log: O(n²) lớn hơn O(n log n) bao nhiêu lần?',
    'Ở Hash table, chọn "hash tệ (độ dài chuỗi)" rồi thêm key: collision xuất hiện thế nào?',
  ],
  links: [
    { label: 'Big-O Cheat Sheet', url: 'https://www.bigocheatsheet.com/' },
    { label: '.NET Dictionary<TKey,TValue>', url: 'https://learn.microsoft.com/dotnet/api/system.collections.generic.dictionary-2' },
    { label: 'VisuAlgo: sorting', url: 'https://visualgo.net/en/sorting' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    let mode = 'sort';
    const show = () => Object.entries(groups).forEach(([k, g]) => (g.style.display = k === mode ? '' : 'none'));
    // ---------- Sorting ----------
    const S = { algo: 'bubble', n: 24, arr: [], gen: null, cmp: 0, swp: 0, ev: null, run: false, rate: 20, acc: 0, done: false };
    const sw = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };
    const ALG = {
      *bubble(a) { for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length - 1 - i; j++) { yield { t: 'cmp', i: j, j: j + 1 }; if (a[j] > a[j + 1]) { sw(a, j, j + 1); yield { t: 'swap', i: j, j: j + 1 }; } } },
      *insertion(a) { for (let i = 1; i < a.length; i++) for (let j = i; j > 0; j--) { yield { t: 'cmp', i: j - 1, j }; if (a[j - 1] <= a[j]) break; sw(a, j - 1, j); yield { t: 'swap', i: j - 1, j }; } },
      *quick(a, lo = 0, hi = a.length - 1) {
        if (lo >= hi) return;
        let i = lo;
        for (let j = lo; j < hi; j++) { yield { t: 'cmp', i: j, j: hi, p: hi }; if (a[j] < a[hi]) { sw(a, i, j); yield { t: 'swap', i, j, p: hi }; i++; } }
        sw(a, i, hi); yield { t: 'swap', i, j: hi };
        yield* ALG.quick(a, lo, i - 1); yield* ALG.quick(a, i + 1, hi);
      },
      *merge(a, lo = 0, hi = a.length - 1) {
        if (lo >= hi) return;
        const mid = (lo + hi) >> 1; yield* ALG.merge(a, lo, mid); yield* ALG.merge(a, mid + 1, hi);
        const tmp = []; let i = lo, j = mid + 1;
        while (i <= mid && j <= hi) { yield { t: 'cmp', i, j }; tmp.push(a[i] <= a[j] ? a[i++] : a[j++]); }
        while (i <= mid) tmp.push(a[i++]); while (j <= hi) tmp.push(a[j++]);
        for (let k = 0; k < tmp.length; k++) { a[lo + k] = tmp[k]; yield { t: 'set', i: lo + k }; }
      },
    };
    function sortReset(shuffle) {
      if (shuffle) S.arr = Array.from({ length: S.n }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      Object.assign(S, { gen: ALG[S.algo](S.arr), cmp: 0, swp: 0, ev: null, done: false });
    }
    function sortStep() {
      if (S.done) return;
      const r = S.gen.next();
      if (r.done) { S.done = true; S.run = false; S.ev = null; const n = S.n; return stage.log(`${S.algo} xong: ${S.cmp} so sánh, ${S.swp} ghi/đổi chỗ · n²/2 = ${n * n / 2 | 0}, n·log₂n = ${Math.round(n * Math.log2(n))}`); }
      S.ev = r.value; if (S.ev.t === 'cmp') S.cmp++; else S.swp++;
    }
    // ---------- Search ----------
    const Q = { arr: [], target: 0, lin: 0, linDone: false, lo: 0, hi: 0, mid: -1, binDone: false, binSteps: 0, run: false, acc: 0 };
    function searchReset() {
      let v = 0; Q.arr = Array.from({ length: 31 }, () => (v += 1 + Math.floor(Math.random() * 4)));
      Q.target = Math.random() < 0.85 ? Q.arr[Math.floor(Math.random() * 31)] : Q.arr[30] + 2;
      Object.assign(Q, { lin: 0, linDone: false, lo: 0, hi: 30, mid: -1, binDone: false, binSteps: 0 });
      stage.log(`Tìm ${Q.target} trong mảng đã sắp xếp 31 phần tử`);
    }
    function searchStep() {
      if (!Q.linDone) { if (Q.arr[Q.lin] === Q.target || Q.lin === 30) { Q.linDone = true; stage.log(`Linear: ${Q.arr[Q.lin] === Q.target ? 'thấy' : 'không thấy'} sau ${Q.lin + 1} bước`); } else Q.lin++; }
      if (Q.binDone) return;
      if (Q.lo > Q.hi) { Q.binDone = true; Q.mid = -1; return stage.log(`Binary: không có ${Q.target}, chỉ tốn ${Q.binSteps} bước`, 'warn'); }
      Q.mid = (Q.lo + Q.hi) >> 1; Q.binSteps++; const m = Q.arr[Q.mid];
      if (m === Q.target) { Q.binDone = true; stage.log(`Binary: a[${Q.mid}] = ${m} → thấy sau ${Q.binSteps} bước`); }
      else if (m < Q.target) { stage.log(`Binary: a[${Q.mid}] = ${m} < ${Q.target} → bỏ nửa trái, lo = ${Q.mid + 1}`); Q.pend = () => (Q.lo = Q.mid + 1); }
      else { stage.log(`Binary: a[${Q.mid}] = ${m} > ${Q.target} → bỏ nửa phải, hi = ${Q.mid - 1}`); Q.pend = () => (Q.hi = Q.mid - 1); }
    }
    const searchTick = () => { if (Q.pend) { Q.pend(); Q.pend = null; } searchStep(); };
    // ---------- Big O ----------
    const G = { n: 64, log: false };
    const FN = [['O(1)', () => 1, C.green, 'Dictionary lookup'], ['O(log n)', (n) => Math.log2(Math.max(1, n)), C.teal, 'binary search'], ['O(n)', (n) => n, C.blue, 'foreach, FindObjectOfType'], ['O(n log n)', (n) => n * Math.log2(Math.max(1, n)), C.orange, 'List.Sort'], ['O(n²)', (n) => n * n, C.red, 'so mọi cặp object']];
    // ---------- Hash table ----------
    const POOL = ['sword', 'shield', 'potion', 'bow', 'arrow', 'helmet', 'boots', 'ring', 'amulet', 'gem', 'coin', 'key', 'scroll', 'torch', 'map', 'axe', 'staff', 'wand', 'cape', 'gloves'];
    const H = { m: 8, bad: false, keys: [], fly: null, find: null };
    const hash = (k) => (H.bad ? k.length : [...k].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261)) % H.m;
    const buckets = () => { const b = Array.from({ length: H.m }, () => []); H.keys.forEach((k) => b[hash(k)].push(k)); return b; };
    function hashAdd(log = true) {
      const k = POOL.find((x) => !H.keys.includes(x)); if (!k) return stage.log('Hết key mẫu', 'warn');
      const b = hash(k), coll = buckets()[b].length; H.keys.push(k); H.fly = { k, t: 0 }; H.find = null;
      if (log) stage.log(`Add("${k}") → hash % ${H.m} = ${b}${coll ? ` · collision! bucket đã có ${coll} key` : ''}`, coll ? 'warn' : 'info');
    }
    function hashFind() {
      if (!H.keys.length) return; const k = H.keys[Math.floor(Math.random() * H.keys.length)], b = hash(k), pos = buckets()[b].indexOf(k);
      H.find = { k, b, pos, t: 0 }; stage.log(`TryGetValue("${k}") → bucket ${b}, so sánh ${pos + 1} key trong chuỗi`);
    }

    // ---------- Inspector ----------
    stage.ui.group('Chế độ');
    stage.ui.select('Mô phỏng', [{ value: 'sort', label: 'Sắp xếp' }, { value: 'search', label: 'Tìm kiếm' }, { value: 'bigo', label: 'Biểu đồ Big O' }, { value: 'hash', label: 'Hash table' }], mode, (v) => { mode = v; show(); });
    const groups = {};
    groups.sort = stage.ui.group('Sắp xếp');
    stage.ui.select('Thuật toán', [{ value: 'bubble', label: 'Bubble O(n²)' }, { value: 'insertion', label: 'Insertion O(n²)' }, { value: 'quick', label: 'Quick O(n log n)' }, { value: 'merge', label: 'Merge O(n log n)' }], S.algo, (v) => { S.algo = v; sortReset(false); stage.log(`Thuật toán: ${v} (chạy trên mảng hiện tại)`); });
    stage.ui.slider('Số phần tử n', { min: 8, max: 60, value: S.n }, (v) => { S.n = v; sortReset(true); });
    stage.ui.slider('Bước/giây', { min: 2, max: 200, value: S.rate }, (v) => (S.rate = v));
    stage.ui.button('Chạy / Dừng', () => { if (S.done) sortReset(false); S.run = !S.run; }, { variant: 'primary' });
    stage.ui.button('Bước', () => { S.run = false; sortStep(); });
    stage.ui.button('Xáo trộn', () => { S.run = false; sortReset(true); });
    groups.search = stage.ui.group('Tìm kiếm');
    stage.ui.button('Chạy / Dừng', () => (Q.run = !Q.run), { variant: 'primary' });
    stage.ui.button('Bước', () => { Q.run = false; searchTick(); });
    stage.ui.button('Target mới', () => { Q.run = false; searchReset(); });
    groups.bigo = stage.ui.group('Big O');
    stage.ui.slider('n', { min: 2, max: 256, value: G.n }, (v) => (G.n = v));
    stage.ui.toggle('Thang log trục Y', G.log, (v) => (G.log = v));
    groups.hash = stage.ui.group('Hash table');
    stage.ui.slider('Số bucket m', { min: 4, max: 16, value: H.m }, (v) => { H.m = v; H.find = null; stage.log(`Rehash: ${H.keys.length} key chia lại vào ${v} bucket`); });
    stage.ui.toggle('Hash tệ (độ dài chuỗi)', H.bad, (v) => { H.bad = v; H.find = null; stage.log(v ? 'Hash = key.Length: nhiều key cùng độ dài → dồn vào cùng bucket' : 'Hash FNV-1a: phân bố đều'); });
    stage.ui.button('Thêm key', () => hashAdd(), { variant: 'primary' });
    stage.ui.button('Tìm key', hashFind);
    stage.ui.button('Xóa hết', () => { H.keys = []; H.find = null; });
    show();

    stage.onFrame((dt) => {
      if (S.run) { S.acc += dt * S.rate; while (S.acc >= 1 && !S.done) { S.acc--; sortStep(); } }
      if (Q.run) { Q.acc += dt * 2.5; if (Q.acc >= 1) { Q.acc = 0; searchTick(); if (Q.linDone && Q.binDone) Q.run = false; } }
      if (H.fly) { H.fly.t += dt * 1.8; if (H.fly.t >= 1) H.fly = null; }
      if (H.find) H.find.t += dt * 2;
      render();
    });

    // ---------- Render ----------
    function render() {
      const { w, h } = stage; d.clear(w, h); d.grid(w, h);
      ({ sort: drawSort, search: drawSearch, bigo: drawBig, hash: drawHash })[mode](w, h);
    }
    const label = (s, x, y, o = {}) => d.text(s, x, y, Object.assign({ font: 'mono', size: 12, color: C.navy2 }, o));
    function drawSort(w, h) {
      const n = S.arr.length, top = 56, bw = (w - 32) / n, ev = S.ev || {};
      label(`${S.algo}  ·  n = ${n}`, 16, 20, { size: 14, weight: 700, font: 'cond', color: C.navy });
      label(`so sánh ${S.cmp}  ·  ghi/đổi ${S.swp}  ·  n²/2 = ${n * n / 2 | 0}  ·  n·log₂n = ${Math.round(n * Math.log2(n))}`, 16, 40, { size: w < 560 ? 10 : 12 });
      S.arr.forEach((v, i) => {
        const bh = (h - top - 30) * v / n, x = 16 + i * bw;
        let col = S.done ? C.green : C.tealDeep;
        if (i === ev.p) col = C.purple;
        if (i === ev.i || i === ev.j) col = ev.t === 'cmp' ? C.yellow : ev.t === 'swap' ? C.red : C.orange;
        d.rect(x + 1, h - 22 - bh, Math.max(1, bw - 2), bh, { fill: col, r: Math.min(4, bw / 3) });
        if (bw >= 18) label(v, x + bw / 2, h - 11, { align: 'center', size: 10, color: C.muted });
      });
      const lg = [['so sánh', C.yellow], ['đổi chỗ', C.red], ['ghi (merge)', C.orange], ['pivot', C.purple]];
      let lx = w - 16; lg.slice().reverse().forEach(([t, c]) => { lx -= d.measure(t, { font: 'mono', size: 11 }) + 26; d.circle(lx + 6, 20, 5, { fill: c }); label(t, lx + 15, 20, { size: 11 }); });
    }
    function cells(y, ch, fn) { const cw = (w0 - 32) / 31; for (let i = 0; i < 31; i++) { const st = fn(i); d.rect(16 + i * cw + 1, y, cw - 2, ch, { fill: st.fill, stroke: st.stroke, lw: 2.5, r: 4 }); if (cw >= 20) label(Q.arr[i], 16 + i * cw + cw / 2, y + ch / 2, { align: 'center', size: 11, color: st.text || C.ink }); } return cw; }
    let w0 = 0;
    function drawSearch(w, h) {
      w0 = w; const ch = Math.min(44, h * 0.1), y1 = h * 0.2, y2 = h * 0.58;
      label(`Target = ${Q.target}`, w / 2, 22, { align: 'center', size: 15, weight: 700, font: 'cond', color: C.navy });
      const lc = Q.linDone ? Q.lin : Q.lin - 1;
      label(`Linear search O(n) · ${lc + 1} bước${Q.linDone ? ' ✓' : ''}`, 16, y1 - 16, { color: C.blue, weight: 600 });
      cells(y1, ch, (i) => (i === lc ? { fill: Q.arr[i] === Q.target ? C.green : C.yellow, text: '#fff' } : i < lc ? { fill: C.lineSoft, text: C.faint } : { fill: C.card, stroke: C.line }));
      label(`Binary search O(log n) · ${Q.binSteps} bước${Q.binDone ? ' ✓' : ''}`, 16, y2 - 16, { color: C.orange, weight: 600 });
      const cw = cells(y2, ch, (i) => (i === Q.mid ? { fill: Q.binDone ? C.green : C.yellow, text: '#fff' } : i < Q.lo || i > Q.hi ? { fill: C.lineSoft, text: C.faint } : { fill: C.card, stroke: C.orange }));
      if (Q.lo <= Q.hi) { label('lo', 16 + Q.lo * cw + cw / 2, y2 + ch + 12, { align: 'center', size: 11, color: C.orange }); label('hi', 16 + Q.hi * cw + cw / 2, y2 + ch + 26, { align: 'center', size: 11, color: C.orange }); }
      if (Q.mid >= 0) d.arrow(16 + Q.mid * cw + cw / 2, y2 - 34, 16 + Q.mid * cw + cw / 2, y2 - 4, { stroke: C.navy, head: 7 });
    }
    function drawBig(w, h) {
      const lw = w < 600 ? 0 : 250, x0 = 46, y0 = h - 30, cw = w - x0 - lw - 24, chh = h - 56, n = G.n;
      const yMax = G.log ? Math.log10(n * n) + 0.2 : Math.max(10, n * Math.log2(n) * 1.15);
      const Y = (v) => y0 - U.clamp((G.log ? Math.log10(Math.max(1, v)) : v) / yMax, 0, 1.04) * chh;
      d.line(x0, y0, x0 + cw, y0, { stroke: C.line }); d.line(x0, y0, x0, y0 - chh, { stroke: C.line });
      label(G.log ? 'số bước (log)' : 'số bước', x0, 22, { size: 11, color: C.muted }); label('n →', x0 + cw, y0 + 16, { align: 'right', size: 11, color: C.muted });
      FN.forEach(([name, f, col]) => {
        const pts = []; let out = false;
        for (let i = 0; i <= 80 && !out; i++) { const x = 1 + (n - 1) * i / 80, y = Y(f(x)); out = y <= y0 - chh * 1.03; pts.push([x0 + cw * i / 80, y]); }
        d.poly(pts, { stroke: col, lw: 2.5 });
        const [ex, ey] = pts[pts.length - 1];
        if (out) label(`${name} ↑ vượt khung`, ex + 6, ey + 10, { size: 10, color: col });
        else { d.circle(ex, ey, 4, { fill: col }); if (!lw) label(name, ex - 4, Math.max(14, ey - 10), { align: 'right', size: 10, color: col }); }
      });
      if (!lw) return;
      const lx = w - lw - 8; label(`n = ${n}`, lx, 30, { size: 15, weight: 700, font: 'cond', color: C.navy });
      label('thời gian nếu 1 bước = 1 µs', lx + lw, 30, { align: 'right', size: 10, color: C.muted });
      FN.forEach(([name, f, col, ex], i) => {
        const y = 62 + i * 52, v = Math.round(f(n)), us = v >= 1000 ? (v / 1000).toFixed(1) + ' ms' : v + ' µs';
        d.node(lx, y - 18, lw, 44, null, { accent: col, shadow: 4 });
        label(`${name} = ${v.toLocaleString('vi-VN')}`, lx + 10, y - 4, { weight: 700, color: col });
        label(us, lx + lw - 10, y - 4, { align: 'right', size: 11, color: C.navy2 });
        label(ex, lx + 10, y + 13, { size: 10, color: C.muted });
      });
    }
    function drawHash(w, h) {
      const b = buckets(), rh = Math.min(34, (h - 60) / H.m), top = 46, bx = 16, kw = Math.min(86, (w - 90) / 5);
      const maxLen = Math.max(0, ...b.map((x) => x.length)), coll = b.reduce((s, x) => s + Math.max(0, x.length - 1), 0);
      label(`n = ${H.keys.length}  ·  m = ${H.m}  ·  load factor α = ${(H.keys.length / H.m).toFixed(2)}  ·  chuỗi dài nhất ${maxLen}  ·  collision ${coll}`, 16, 20, { size: w < 600 ? 10 : 12, weight: 600 });
      b.forEach((chain, i) => {
        const y = top + i * rh;
        d.rect(bx, y + 2, 44, rh - 4, { fill: C.navy, r: 5 }); label(`[${i}]`, bx + 22, y + rh / 2, { align: 'center', size: 11, color: '#fff' });
        chain.forEach((k, j) => {
          const x = bx + 56 + j * (kw + 10), f = H.find, hit = f && f.b === i && j <= Math.min(f.pos, Math.floor(f.t * 2.5));
          if (H.fly && H.fly.k === k) return;
          if (j) d.arrow(x - 10, y + rh / 2, x - 1, y + rh / 2, { stroke: C.faint, head: 5, lw: 1.5 });
          d.rect(x, y + 3, kw, rh - 6, { fill: hit ? (j === f.pos ? C.green : C.yellow) : C.card, stroke: chain.length > 1 ? C.red : C.teal, lw: 1.5, r: 5 });
          label(k, x + kw / 2, y + rh / 2, { align: 'center', size: Math.min(11, rh * 0.4), color: hit ? '#fff' : C.ink });
        });
      });
      if (H.fly) {
        const i = hash(H.fly.k), j = b[i].indexOf(H.fly.k), e = U.ease.outCubic(H.fly.t);
        const x = U.lerp(w / 2, bx + 56 + j * (kw + 10), e), y = U.lerp(4, top + i * rh + 3, e);
        d.rect(x, y, kw, rh - 6, { fill: C.yellow, r: 5 }); label(H.fly.k, x + kw / 2, y + (rh - 6) / 2, { align: 'center', size: 11, color: '#fff' });
      }
    }

    // initial state: something already in motion for every mode
    sortReset(true); for (let i = 0; i < 30; i++) sortStep(); S.run = true;
    searchReset(); searchTick(); searchTick();
    for (let i = 0; i < 7; i++) hashAdd(false); H.fly = null;
    stage.clearLog(); stage.log('Bubble sort đang chạy: vàng = so sánh, đỏ = đổi chỗ. Đổi Chế độ để xem tìm kiếm, Big O, hash table');
  },
});
