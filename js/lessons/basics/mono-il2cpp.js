/* Lesson: Mono vs IL2CPP — animated compile pipeline (C# → IL → JIT vs AOT C++) + platform constraints + tradeoff bars. */
U101.defineLesson('mono-il2cpp', {
  lead: 'C# không chạy trực tiếp trên CPU. Nó được compile ra IL, rồi Unity biến IL thành mã máy bằng một trong hai Scripting Backend: Mono (JIT lúc chạy game) hoặc IL2CPP (AOT: dịch sang C++ lúc build).',
  hint: 'Chọn Backend + Platform, bấm Build rồi Run · Mono: lần Run đầu phải dừng ở JIT · thử Mono với iOS / WebGL',
  overview: `
    <p>Cả hai backend đều bắt đầu giống nhau: compiler <b>Roslyn</b> biến file <code>.cs</code> thành <b>IL</b> (Intermediate Language) trong các file <code>.dll</code>. Khác nhau ở chỗ IL được biến thành mã máy <b>khi nào</b>.</p>
    <ul>
      <li><b>Mono (JIT, Just-In-Time)</b>: build chỉ đóng gói IL + máy ảo Mono. Lúc chơi, hàm nào được gọi lần đầu mới được compile ra mã máy. Build nhanh, hợp để lặp khi phát triển.</li>
      <li><b>IL2CPP (AOT, Ahead-Of-Time)</b>: lúc build, <code>il2cpp.exe</code> dịch IL sang <b>C++</b>, rồi compiler native (Clang/MSVC) dịch ra mã máy. Build chậm hơn nhiều, nhưng code chạy nhanh hơn và khó dịch ngược hơn.</li>
      <li><b>Giới hạn nền tảng</b>: iOS và console cấm sinh mã thực thi lúc runtime, nên không có JIT. WebGL dùng IL2CPP để ra WebAssembly. Android muốn build ARM64 (bắt buộc trên Google Play) thì cần IL2CPP.</li>
      <li>AOT không cho phép <code>System.Reflection.Emit</code>. Generic tạo ra bằng reflection lúc runtime có thể thiếu code.</li>
    </ul>
    <p class="callout"><b>Managed Code Stripping</b> xóa code không dùng để build nhỏ hơn. Code chỉ được gọi qua reflection có thể bị xóa nhầm, nên cần <code>[Preserve]</code> hoặc <code>link.xml</code>.</p>`,
  keyPoints: [
    'C# → (Roslyn) → IL là bước chung. Backend quyết định IL → mã máy lúc nào.',
    'Mono = JIT lúc runtime: build nhanh, có chi phí compile ở lần gọi đầu.',
    'IL2CPP = AOT qua C++: build chậm, chạy nhanh, bắt buộc với iOS/WebGL/console.',
    'Thường dùng Mono khi phát triển trên Editor/PC, IL2CPP cho bản phát hành mobile.',
  ],
  code: [{
    title: 'BackendInfo.cs',
    source: `
using UnityEngine;
using UnityEngine.Scripting;

public class BackendInfo : MonoBehaviour
{
    void Start()
    {
#if ENABLE_IL2CPP
        Debug.Log("IL2CPP: code đã được dịch AOT sang C++");
#elif ENABLE_MONO
        Debug.Log("Mono: IL được JIT lúc runtime");
#endif
    }

    // Chỉ gọi qua reflection → giữ lại để stripping không xóa
    [Preserve] void CalledByReflection() { }
}`,
    note: 'ENABLE_IL2CPP / ENABLE_MONO là scripting define có sẵn của Unity.',
  }, {
    title: 'Editor/BuildSettingsTool.cs',
    source: `
using UnityEditor;
using UnityEditor.Build;

public static class BuildSettingsTool
{
    [MenuItem("Tools/Android Release Settings")]
    static void Apply()
    {
        var target = NamedBuildTarget.Android;
        PlayerSettings.SetScriptingBackend(target, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        PlayerSettings.SetManagedStrippingLevel(target, ManagedStrippingLevel.Medium);
    }
}`,
    note: 'Đặt trong thư mục Editor. Cùng thiết lập với Project Settings → Player → Other Settings → Configuration.',
  }],
  tryIt: [
    'Chọn Mono, bấm Build rồi Run hai lần. Vì sao lần đầu dừng lâu ở JIT còn lần sau thì không?',
    'Chuyển sang IL2CPP và Build. Thanh tiến độ chạy lâu hơn bao nhiêu?',
    'Chọn iOS với Mono rồi Build. Đọc lỗi trong Console.',
    'Chọn Android + Mono: cảnh báo gì về ARM64?',
    'Bật Stripping High và xem thanh Dung lượng thay đổi.',
  ],
  links: [
    { label: 'Unity Manual: Scripting backends', url: 'https://docs.unity3d.com/Manual/scripting-backends.html' },
    { label: 'Unity Manual: IL2CPP', url: 'https://docs.unity3d.com/Manual/IL2CPP.html' },
    { label: 'Unity Manual: Managed code stripping', url: 'https://docs.unity3d.com/Manual/ManagedCodeStripping.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    let backend = 'mono', platform = 'win', strip = false;
    let anim = null, built = null, jitWarm = false, fail = 0, buildPct = 0;
    const PLAT = { win: 'Windows', android: 'Android', ios: 'iOS', webgl: 'WebGL' };
    // Nodes in (col, row) units. row 0 = Mono lane, 1 = shared, 2 = IL2CPP lane. Build zone: cols 0–3, runtime: 4–5.
    const NODES = [
      { c: 0, r: 1, t: 'C# .cs', s: 'source', col: C.blue, lane: 'all' },
      { c: 1, r: 1, t: 'IL .dll', s: 'Roslyn', col: C.purple, lane: 'all' },
      { c: 2, r: 0, t: 'IL + VM', s: 'đóng gói', col: C.green, lane: 'mono' },
      { c: 4, r: 0, t: 'JIT', s: 'lần gọi đầu', col: C.orange, lane: 'mono', jit: true },
      { c: 5, r: 0, t: 'Mã máy', s: 'trong RAM', col: C.navy, lane: 'mono' },
      { c: 2, r: 2, t: 'C++', s: 'il2cpp.exe', col: C.teal, lane: 'il2cpp' },
      { c: 3, r: 2, t: 'Native', s: 'Clang/MSVC', col: C.tealDeep, lane: 'il2cpp' },
      { c: 5, r: 2, t: 'Mã máy', s: 'chạy ngay', col: C.navy, lane: 'il2cpp' },
    ];
    const PATHS = {
      buildmono: [[0, 1, 0], [1, 1, 1], [2, 0, 1], [3.5, 0, 1]],
      buildil2cpp: [[0, 1, 0], [1, 1, 1], [2, 2, 2], [3, 2, 3], [3.5, 2, 1.5]],
      runmono: [[3.5, 0, 0], [4, 0, 1], [4, 0, 4], [5, 0, 1]],
      runmonowarm: [[3.5, 0, 0], [4, 0, 1], [5, 0, 1]],
      runil2cpp: [[3.5, 2, 0], [5, 2, 1.5]],
    };
    const METRICS = [
      { name: 'Thời gian build', mono: 0.25, il2cpp: 0.85 },
      { name: 'Dung lượng build', mono: 0.5, il2cpp: 0.62, size: true },
      { name: 'Hiệu năng CPU', mono: 0.55, il2cpp: 0.88 },
      { name: 'Tốc độ lặp (dev)', mono: 0.9, il2cpp: 0.3 },
    ];

    stage.ui.group('Player Settings');
    stage.ui.select('Scripting Backend', [{ value: 'mono', label: 'Mono (JIT)' }, { value: 'il2cpp', label: 'IL2CPP (AOT)' }], backend, (v) => { backend = v; built = null; });
    stage.ui.select('Platform', Object.entries(PLAT).map(([value, label]) => ({ value, label })), platform, (v) => { platform = v; built = null; });
    stage.ui.toggle('Managed Stripping: High', strip, (v) => (strip = v));
    stage.ui.group('Thao tác');
    stage.ui.button('Build', build, { variant: 'primary' });
    stage.ui.button('Run (gọi Update lần đầu)', run, { variant: 'accent' });
    const status = stage.ui.readout('Trạng thái', 'chưa build');

    function build() {
      if (anim) return;
      if (backend === 'mono' && (platform === 'ios' || platform === 'webgl')) {
        fail = 1;
        return stage.log(platform === 'ios' ? 'Build failed: iOS cấm sinh mã thực thi lúc runtime (không có JIT) → bắt buộc IL2CPP' : 'Build failed: WebGL chỉ hỗ trợ IL2CPP (IL → C++ → WebAssembly)', 'error');
      }
      if (backend === 'mono' && platform === 'android') stage.log('Mono trên Android chỉ build ARMv7. Google Play yêu cầu ARM64 → nên dùng IL2CPP', 'warn');
      const secs = backend === 'mono' ? 1.6 : 4.5;
      stage.log(`Build ${PLAT[platform]} · ${backend === 'mono' ? 'Mono' : 'IL2CPP'}${backend === 'il2cpp' ? ': IL → C++ → native, sẽ lâu hơn…' : ': chỉ đóng gói IL'}`);
      anim = { path: PATHS['build' + backend], t: 0, dur: secs, done: () => { built = backend; jitWarm = false; stage.log(`Build xong sau ~${backend === 'mono' ? '40 giây' : '3 phút'} (minh họa)`); } };
    }
    function run() {
      if (anim) return;
      if (built !== backend) return stage.log('Chưa có bản build cho cấu hình này. Bấm Build trước', 'warn');
      if (backend === 'mono') {
        const cold = !jitWarm;
        if (cold) stage.log('JIT: compile Enemy.Update() từ IL ra mã máy… (gây khựng nhẹ lần gọi đầu)', 'warn');
        anim = { path: PATHS[cold ? 'runmono' : 'runmonowarm'], t: 0, dur: cold ? 2 : 0.8, done: () => { jitWarm = true; stage.log(cold ? 'Update() chạy. Mã máy đã được cache cho lần sau' : 'Update() chạy ngay: đã JIT từ trước'); } };
      } else {
        anim = { path: PATHS.runil2cpp, t: 0, dur: 0.7, done: () => stage.log('Update() chạy ngay: mã máy đã có sẵn từ lúc build (AOT)') };
      }
    }
    // Position along a weighted polyline at progress p (0..1)
    function along(path, p) {
      const total = path.reduce((s, q) => s + q[2], 0); let acc = 0;
      for (let i = 1; i < path.length; i++) {
        const seg = path[i][2] / total;
        if (p <= acc + seg || i === path.length - 1) { const k = seg ? U.clamp((p - acc) / seg, 0, 1) : 1; return { c: U.lerp(path[i - 1][0], path[i][0], k), r: U.lerp(path[i - 1][1], path[i][1], k), stall: path[i][0] === path[i - 1][0] && path[i][1] === path[i - 1][1] }; }
        acc += seg;
      }
    }

    stage.onFrame((dt) => {
      fail = Math.max(0, fail - dt * 0.4);
      if (anim) {
        anim.t += dt / anim.dur;
        if (anim.path[0][0] === 0) buildPct = Math.min(1, anim.t);
        if (anim.t >= 1) { const f = anim.done; anim = null; f(); }
      }
      status.set(anim ? (anim.path[0][0] === 0 ? `building ${Math.round(buildPct * 100)}%` : 'running') : built === backend ? 'đã build ✓' : 'chưa build');
      render();
    });

    function render() {
      const { w, h } = stage, pad = 14;
      d.clear(w, h); d.grid(w, h);
      const dH = Math.max(170, h * 0.56), colW = (w - pad * 2) / 6, bx = pad + colW * 4;
      const nw = Math.min(118, colW - 8), nh = Math.min(50, (dH - 40) / 3 - 6), small = colW < 92;
      const X = (c) => pad + colW * (c + 0.5), Y = (r) => 36 + nh / 2 + r * ((dH - 38 - nh) / 2);
      // Zones
      d.rect(pad, 8, colW * 4 - 4, dH, { fill: 'rgba(42,86,163,0.05)', r: 10 });
      d.rect(bx + 4, 8, colW * 2 - 4, dH, { fill: 'rgba(192,101,45,0.06)', r: 10 });
      d.line(bx, 8, bx, dH + 8, { stroke: C.line, lw: 1.5, dash: [5, 5] });
      d.text('BUILD TIME (máy dev)', pad + 10, 22, { font: 'mono', size: 11, weight: 700, color: C.blue });
      d.text(w < 520 ? 'RUNTIME' : 'RUNTIME (máy người chơi)', w - pad - 10, 22, { align: 'right', font: 'mono', size: 11, weight: 700, color: C.orange });
      const on = (lane) => lane === 'all' || lane === backend;
      // Edges
      const edge = (a, b, lane) => d.line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), { stroke: on(lane) ? C.trace : C.lineSoft, lw: on(lane) ? 3 : 2, dash: on(lane) ? null : [4, 4] });
      edge([0, 1], [1, 1], 'all'); edge([1, 1], [2, 0], 'mono'); edge([2, 0], [5, 0], 'mono'); edge([1, 1], [2, 2], 'il2cpp'); edge([2, 2], [5, 2], 'il2cpp');
      d.text('Mono', X(1), Y(0), { align: 'center', font: 'cond', size: 15, weight: 700, color: backend === 'mono' ? C.green : C.faint });
      d.text('IL2CPP', X(1), Y(2), { align: 'center', font: 'cond', size: 15, weight: 700, color: backend === 'il2cpp' ? C.teal : C.faint });
      const cur = anim && along(anim.path, U.clamp(anim.t, 0, 1));
      NODES.forEach((n) => {
        const active = on(n.lane), x = X(n.c) - nw / 2, y = Y(n.r) - nh / 2;
        const busy = cur && cur.stall && n.jit, warm = n.jit && jitWarm && built === 'mono';
        let label = n.t; if (n.t === 'Native' && platform === 'webgl') label = 'Wasm';
        d.node(x, y, nw, nh, null, { accent: busy ? C.orange : active ? n.col : C.lineSoft, lw: busy ? 3 + Math.sin(stage.time * 20) : 2, fill: active ? C.card : 'rgba(249,242,229,0.5)', shadow: active ? 8 : 0 });
        d.text(label, X(n.c), Y(n.r) - (small ? 0 : 7), { align: 'center', font: 'cond', size: small ? 12 : 14, weight: 700, color: active ? C.navy : C.faint });
        if (!small) d.text(warm ? 'đã cache ✓' : n.s, X(n.c), Y(n.r) + 11, { align: 'center', font: 'mono', size: 11, color: warm ? C.green : C.muted });
      });
      // Packet
      if (cur) {
        const px = X(cur.c), py = Y(cur.r);
        d.circle(px, py, 11 + Math.sin(stage.time * 10) * 2, { fill: 'rgba(226,169,59,0.35)' });
        d.circle(px, py, 7, { fill: C.yellow, stroke: '#fff', lw: 2 });
      }
      // Build progress / fail marker
      if (anim && anim.path[0][0] === 0) {
        const px0 = pad + 20 + d.measure('BUILD TIME (máy dev)', { font: 'mono', size: 11, weight: 700 }), pw = Math.max(20, bx - px0 - 12);
        d.rect(px0, 18, pw, 8, { fill: C.lineSoft, r: 4 });
        d.rect(px0, 18, pw * buildPct, 8, { fill: C.blue, r: 4 });
      }
      if (fail > 0) {
        d.circle(bx, Y(0), 16, { fill: `rgba(214,90,74,${fail})` });
        d.text('✗', bx, Y(0) + 1, { align: 'center', size: 18, weight: 700, color: '#fff' });
        d.text(`${PLAT[platform]} không có JIT`, bx, Y(0) + 30, { align: 'center', font: 'mono', size: 11, weight: 700, color: C.red });
      }
      // Tradeoff bars
      const top = dH + 36, rowH = Math.min(38, (h - top - 10) / METRICS.length), lw = Math.min(140, w * 0.32), barW = w - pad * 2 - lw - 10;
      d.text('So sánh tương đối (minh họa)', pad, top - 8, { font: 'mono', size: 11, color: C.muted });
      METRICS.forEach((m, i) => {
        const y = top + i * rowH + 4, k = m.size && strip ? 0.7 : 1;
        d.text(m.name, pad, y + rowH / 2 - 2, { font: 'cond', size: 13, weight: 600, color: C.navy });
        ['mono', 'il2cpp'].forEach((b, j) => {
          const bh = (rowH - 12) / 2, by = y + 2 + j * (bh + 3), sel = b === backend;
          d.rect(pad + lw, by, barW, bh, { fill: 'rgba(226,215,199,0.5)', r: 3 });
          d.rect(pad + lw, by, barW * m[b] * k, bh, { fill: sel ? (b === 'mono' ? C.green : C.teal) : C.line, r: 3 });
          if (bh >= 10) d.text(b === 'mono' ? 'Mono' : 'IL2CPP', pad + lw + 6, by + bh / 2 + 0.5, { font: 'mono', size: Math.min(11, bh), weight: 700, color: '#fff' });
        });
      });
    }
    render();
  },
});
