/* Lesson: Managed vs unmanaged resources — C# wrappers holding native memory, Dispose, using, leaks. */
U101.defineLesson('idisposable', {
  lead: 'GC chỉ biết dọn managed heap. NativeArray, RenderTexture, FileStream giữ bộ nhớ native hoặc handle của hệ điều hành mà GC không quản lý. Phải trả lại bằng Dispose() (hoặc Release/Destroy), nếu không sẽ rò rỉ.',
  hint: 'Tạo vài tài nguyên → bấm "Gán null" rồi GC.Collect() để thấy native bị bỏ rơi · click vào thẻ bên trái để Dispose · bật using { }',
  overview: `
    <p>Một object C# có thể chỉ là <b>vỏ bọc</b> (wrapper) nhỏ trên managed heap, còn dữ liệu thật nằm ở <b>native memory</b> (C++ engine, GPU, OS):</p>
    <ul>
      <li><b>NativeArray / NativeList</b> (Unity.Collections): struct chỉ chứa con trỏ. Mất struct mà chưa <code>Dispose()</code> thì không còn cách nào free, Unity báo <i>"A Native Collection has not been disposed"</i>.</li>
      <li><b>RenderTexture, Texture2D, Mesh</b> tạo bằng code: là <code>UnityEngine.Object</code>, phần native chỉ mất khi gọi <code>Release()</code>/<code>Destroy()</code> hoặc <code>Resources.UnloadUnusedAssets()</code>.</li>
      <li><b>FileStream, Socket</b>: giữ handle của OS. Có <b>finalizer</b> làm lưới an toàn, nhưng finalizer chạy lúc nào là không xác định. Trong lúc chờ, file vẫn bị khóa.</li>
    </ul>
    <p>Interface <code>IDisposable</code> chuẩn hóa việc này bằng một hàm <code>Dispose()</code>. Câu lệnh <code>using</code> bảo đảm <code>Dispose()</code> được gọi khi ra khỏi scope, kể cả khi có exception.</p>
    <p class="callout">Quy tắc: ai tạo tài nguyên native thì người đó chịu trách nhiệm giải phóng. Tạo trong <code>OnEnable</code>/<code>Awake</code> thì giải phóng ở <code>OnDisable</code>/<code>OnDestroy</code>.</p>`,
  keyPoints: [
    'GC thu gom wrapper, không thu gom bộ nhớ native phía sau.',
    'Dùng using cho tài nguyên sống ngắn (file, stream, NativeArray Allocator.Temp/TempJob).',
    'Tài nguyên sống lâu: tạo ở OnEnable, Dispose ở OnDisable.',
    'Finalizer chỉ là lưới an toàn: chậm, không xác định thời điểm, NativeArray không có.',
  ],
  code: [{
    title: 'NativeResourcesDemo.cs',
    source: `
using System.IO;
using Unity.Collections;
using UnityEngine;

public class NativeResourcesDemo : MonoBehaviour
{
    private NativeArray<float> samples;
    private RenderTexture minimapRT;

    void OnEnable()
    {
        samples = new NativeArray<float>(1_000_000, Allocator.Persistent); // ~4 MB native
        minimapRT = new RenderTexture(1024, 1024, 24);                     // VRAM
    }

    void OnDisable()
    {
        if (samples.IsCreated) samples.Dispose();          // trả bộ nhớ native
        if (minimapRT != null) { minimapRT.Release(); Destroy(minimapRT); }
    }

    public string LoadSave(string path)
    {
        using (var stream = File.OpenRead(path))           // Dispose() khi ra khỏi scope
        using (var reader = new StreamReader(stream))
            return reader.ReadToEnd();                     // kể cả khi có exception
    }
}`,
    note: 'Cặp OnEnable/OnDisable cho tài nguyên sống lâu, using cho tài nguyên chỉ dùng trong một hàm.',
  }, {
    title: 'PathBuffer.cs',
    source: `
using System;
using Unity.Collections;
using UnityEngine;

public sealed class PathBuffer : IDisposable
{
    public NativeList<Vector3> Points;

    public PathBuffer(int capacity) =>
        Points = new NativeList<Vector3>(capacity, Allocator.Persistent);

    public void Dispose()
    {
        if (Points.IsCreated) Points.Dispose();
    }
}

// C# 8: using declaration, Dispose() khi hết hàm
// using var path = new PathBuffer(256);`,
    note: 'Class của bạn giữ tài nguyên native thì cũng nên implement IDisposable để người dùng có thể dùng using.',
  }],
  tryIt: [
    'Bấm "Gán null" rồi GC.Collect(). Wrapper biến mất nhưng khối native nào vẫn còn?',
    'Bấm UnloadUnusedAssets(): RenderTexture được dọn, NativeArray thì không.',
    'Tạo FileStream, gán null, GC.Collect(): handle chỉ đóng khi finalizer chạy.',
    'Click vào một thẻ bên trái để Dispose() thủ công, rồi xem thanh Native giảm.',
    'Bật using { } và tạo vài tài nguyên: chúng tự Dispose khi hết scope.',
  ],
  links: [
    { label: 'Implement a Dispose method (.NET)', url: 'https://learn.microsoft.com/dotnet/standard/garbage-collection/implementing-dispose' },
    { label: 'using statement (C#)', url: 'https://learn.microsoft.com/dotnet/csharp/language-reference/statements/using' },
    { label: 'NativeArray<T> (Unity)', url: 'https://docs.unity3d.com/ScriptReference/Unity.Collections.NativeArray_1.html' },
    { label: 'RenderTexture.Release', url: 'https://docs.unity3d.com/ScriptReference/RenderTexture.Release.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const KINDS = {
      na: { name: 'NativeArray<float>', native: '1M float · Persistent', mb: 4, col: C.blue },
      rt: { name: 'RenderTexture', native: '1024² ARGB32 + depth', mb: 8, col: C.purple },
      fs: { name: 'FileStream', native: 'OS file handle (khóa file)', mb: 0.5, col: C.orange },
    };
    let objs = [], nextId = 1, t = 0, usingMode = false;
    const hits = [];
    const live = () => objs.filter((o) => o.nat !== 'freed' || o.wrap === 'alive');

    function create(k, quiet) {
      if (live().length >= 6) return stage.log('Tối đa 6 tài nguyên trong mô phỏng. Hãy giải phóng bớt (leak NativeArray thì chỉ Reset mới xóa được).', 'warn');
      const o = { id: nextId++, k, ref: true, disposed: false, wrap: 'alive', nat: 'alive', t0: t, tNat: -9, tGone: -9, scopeEnd: usingMode ? t + 2 : null };
      objs.push(o);
      if (!quiet) stage.log(`${usingMode ? 'using (' : ''}new ${KINDS[k].name}${usingMode ? ')' : ''} → cấp ${KINDS[k].mb} MB native`);
      return o;
    }
    function dispose(o, via) {
      if (o.disposed || o.wrap === 'gone') return;
      Object.assign(o, { disposed: true, nat: 'freed', tNat: t });
      stage.log(`${KINDS[o.k].name}.Dispose()${via ? ' · ' + via : ''} → trả ${KINDS[o.k].mb} MB native`);
    }
    function gcCollect() {
      const victims = objs.filter((o) => !o.ref && o.wrap === 'alive');
      if (!victims.length) return stage.log('GC.Collect(): mọi wrapper vẫn còn reference, không thu gom gì');
      victims.forEach((o) => {
        o.wrap = 'gone'; o.tGone = t;
        if (o.disposed) return;
        o.tNat = t;
        if (o.k === 'na') { o.nat = 'leak'; stage.log('A Native Collection has not been disposed, resulting in a memory leak (4 MB mất vĩnh viễn)', 'error'); }
        if (o.k === 'rt') { o.nat = 'leak'; stage.log('RenderTexture: wrapper mất nhưng 8 MB VRAM còn đó, chờ Destroy/UnloadUnusedAssets', 'warn'); }
        if (o.k === 'fs') { o.nat = 'final'; stage.log('FileStream vào finalizer queue: file còn bị khóa tới khi finalizer chạy', 'warn'); }
      });
      stage.log(`GC.Collect(): thu gom ${victims.length} wrapper trên managed heap`);
    }

    // Initial scene: two healthy resources + one leaked NativeArray
    create('na', true); create('rt', true);
    Object.assign(create('na', true), { ref: false, wrap: 'gone', nat: 'leak' });
    objs.forEach((o) => (o.t0 = -9));

    stage.ui.group('Tạo tài nguyên');
    stage.ui.button('NativeArray', () => create('na'), { variant: 'primary' });
    stage.ui.button('RenderTexture', () => create('rt'), { variant: 'primary' });
    stage.ui.button('FileStream', () => create('fs'), { variant: 'primary' });
    stage.ui.toggle('Bọc trong using { }', usingMode, (v) => { usingMode = v; stage.log(v ? 'Tài nguyên mới sẽ tự Dispose() khi ra khỏi scope' : 'Tắt using: bạn tự chịu trách nhiệm Dispose()'); });
    stage.ui.group('Giải phóng');
    stage.ui.button('Dispose() tất cả', () => objs.forEach((o) => o.ref && dispose(o)), { variant: 'accent' });
    stage.ui.button('Gán null (quên Dispose)', () => { const n = objs.filter((o) => o.ref).length; objs.forEach((o) => (o.ref = false)); stage.log(`${n} biến = null. Wrapper thành rác, native vẫn giữ nguyên`, 'warn'); });
    stage.ui.button('GC.Collect()', gcCollect, { variant: 'danger' });
    stage.ui.button('UnloadUnusedAssets()', () => {
      const rts = objs.filter((o) => o.k === 'rt' && o.nat === 'leak');
      rts.forEach((o) => Object.assign(o, { nat: 'freed', tNat: t }));
      stage.log(rts.length ? `Resources.UnloadUnusedAssets(): dọn ${rts.length} RenderTexture mồ côi` : 'UnloadUnusedAssets(): không có UnityEngine.Object mồ côi. NativeArray không thuộc phạm vi này');
    });
    const rNat = stage.ui.readout('Native đang dùng', '—'), rLeak = stage.ui.readout('Native rò rỉ', '—');

    stage.onPointer('down', (x, y) => { const h = hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); if (h) dispose(h.o, 'click'); });

    stage.onFrame((dt) => {
      t += dt;
      objs.forEach((o) => {
        if (o.scopeEnd && t >= o.scopeEnd && o.ref) { dispose(o, 'hết scope using'); o.ref = false; }
        if (o.nat === 'final' && t - o.tNat > 1.5) { o.nat = 'freed'; o.tNat = t; stage.log('Finalizer thread chạy ~FileStream() → đóng file handle (trễ, không đoán trước được)'); }
      });
      objs = objs.filter((o) => !(o.wrap === 'gone' && o.nat === 'freed' && t - Math.max(o.tNat, o.tGone) > 1.2));
      const mb = (st) => objs.filter((o) => st.includes(o.nat)).reduce((s, o) => s + KINDS[o.k].mb, 0);
      rNat.set(`${mb(['alive', 'leak', 'final'])} MB`); rLeak.set(`${mb(['leak'])} MB`);
      render(mb);
    });

    function render(mb) {
      const { w, h } = stage, pad = 14, meterH = 58, mid = w * 0.5;
      d.clear(w, h); d.grid(w, h); hits.length = 0;
      const top = pad + 26, bottom = h - meterH - pad * 2, rh = Math.min(64, (bottom - top) / 6);
      [[pad, mid - pad * 1.5, 'MANAGED HEAP (C#) · GC dọn', C.purple], [mid + pad / 2, w - mid - pad * 1.5, 'NATIVE (C++ / GPU / OS) · GC không thấy', C.orange]].forEach(([x, pw, label, col]) => {
        d.rect(x, pad, pw, bottom - pad + 8, { fill: 'rgba(255,255,255,0.45)', stroke: C.line, dash: [5, 4], r: 12 });
        d.text(label, x + 12, pad + 14, { font: 'mono', size: 11, weight: 700, color: col });
      });
      objs.forEach((o, i) => {
        const K = KINDS[o.k], y = top + i * rh + 4, ch = rh - 12, cw = mid - pad * 4, cx = pad + 12;
        const appear = U.ease.outCubic(U.clamp((t - o.t0) / 0.4, 0, 1));
        // Wrapper card
        if (o.wrap === 'alive') {
          d.ctx.globalAlpha = appear * (o.ref ? 1 : 0.6);
          d.node(cx, y, cw, ch, null, { accent: o.disposed ? C.faint : K.col, shadow: o.ref ? 6 : 0 });
          d.text(K.name, cx + 12, y + ch * 0.36, { font: 'cond', weight: 700, size: 14, color: C.navy });
          const st = o.disposed ? 'Disposed · IsCreated = false' : o.ref ? (o.scopeEnd ? 'trong using { }' : 'đang dùng · click để Dispose') : 'null → rác, chờ GC';
          d.text(st, cx + 12, y + ch * 0.72, { font: 'mono', size: 11, color: o.ref ? C.muted : C.red });
          if (o.scopeEnd && o.ref) { const k = U.clamp((o.scopeEnd - t) / 2, 0, 1); d.rect(cx + 8, y + ch - 5, (cw - 16) * k, 3, { fill: C.teal, r: 2 }); }
          if (!o.disposed) hits.push({ x: cx, y, w: cw, h: ch, o });
          d.ctx.globalAlpha = 1;
        } else d.rect(cx, y, cw, ch, { stroke: C.lineSoft, dash: [4, 4], r: 10 }), d.text('(wrapper đã bị GC thu gom)', cx + 12, y + ch / 2, { font: 'mono', size: 11, color: C.faint });
        // Native block
        const fade = o.nat === 'freed' ? U.clamp(1 - (t - o.tNat) / 0.8, 0, 1) : 1;
        if (fade <= 0) return;
        const nx = mid + pad / 2 + 12, nmax = (w - mid - pad * 4) * 0.55, nw = Math.max(84, nmax * (K.mb / 8)) * (o.nat === 'freed' ? fade : 1);
        d.ctx.globalAlpha = appear * fade;
        const leak = o.nat === 'leak', fin = o.nat === 'final';
        d.rect(nx, y, nw, ch, { fill: leak ? 'rgba(214,90,74,0.16)' : fin ? 'rgba(226,169,59,0.25)' : K.col, stroke: leak ? C.red : fin ? C.yellow : null, lw: 2, dash: leak ? [5, 3] : null, r: 8 });
        d.text(leak ? `LEAK ${K.mb} MB` : fin ? 'finalizer…' : `${K.mb} MB`, nx + 10, y + ch / 2, { font: 'mono', size: 12, weight: 700, color: leak ? C.red : fin ? C.navy : '#fff' });
        const desc = leak ? 'không ai giữ con trỏ' : fin ? 'chờ finalizer đóng handle' : K.native, dx = nx + nw + 8;
        if (dx + d.measure(desc, { font: 'mono', size: 11 }) < w - pad * 2) d.text(desc, dx, y + ch / 2, { font: 'mono', size: 11, color: leak ? C.red : C.muted });
        if (o.wrap === 'alive' && o.nat !== 'freed') d.line(cx + cw, y + ch / 2, nx, y + ch / 2, { stroke: o.ref ? K.col : C.faint, lw: 2, dash: o.ref ? null : [4, 4] });
        d.ctx.globalAlpha = 1;
      });
      // Native memory meter
      const my = h - meterH - pad, mw = w - pad * 2, MAX = 48, used = mb(['alive', 'final']), leaked = mb(['leak']);
      d.node(pad, my, mw, meterH, null, { accent: leaked ? C.red : C.line, shadow: 4 });
      d.text(`Native memory: ${used + leaked} MB${leaked ? ` · rò rỉ ${leaked} MB` : ''}`, pad + 12, my + 16, { font: 'mono', size: 12, weight: 700, color: leaked ? C.red : C.navy });
      const bx = pad + 12, bw = mw - 24, by = my + 32;
      d.rect(bx, by, bw, 14, { fill: C.bgDeep, r: 7 });
      d.rect(bx, by, bw * Math.min(1, used / MAX), 14, { fill: C.teal, r: 7 });
      if (leaked) d.rect(bx + bw * Math.min(1, used / MAX), by, bw * Math.min(1, leaked / MAX), 14, { fill: C.red, r: 7 });
    }
  },
});
