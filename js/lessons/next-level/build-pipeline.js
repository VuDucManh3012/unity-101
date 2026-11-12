/* Lesson: Build Pipeline — animated per-platform build stages + build size breakdown reacting to settings. */
U101.defineLesson('build-pipeline', {
  lead: 'Bấm Build không chỉ là "xuất file". Unity compile C#, chuyển code qua IL2CPP hoặc Mono, nén asset, đóng gói content, rồi giao cho Gradle (Android) hoặc Xcode (iOS) để ký và tạo file cài đặt.',
  hint: 'Chọn nền tảng rồi bấm Build · đổi Scripting Backend, Stripping, nén texture, Addressables để xem dung lượng thay đổi',
  overview: `
    <p>Mỗi nền tảng có chuỗi build riêng, nhưng phần đầu luôn giống nhau: <b>compile script → chuyển đổi code → xử lý asset → đóng gói</b>.</p>
    <ul>
      <li><b>Scripting Backend</b>: <b>Mono</b> giữ nguyên .dll và chạy JIT, build nhanh, hợp khi dev trên PC. <b>IL2CPP</b> dịch IL sang C++ rồi compile ra mã máy: chạy nhanh hơn, bắt buộc với iOS, WebGL và Android 64-bit (ARM64).</li>
      <li><b>Managed Stripping Level</b>: linker cắt bỏ code không dùng. Mức cao giảm dung lượng nhưng có thể cắt nhầm code chỉ gọi qua reflection, khi đó cần file <code>link.xml</code>.</li>
      <li><b>Texture compression</b>: ASTC (mobile hiện đại) nhỏ và đẹp hơn ETC2. Desktop dùng DXT/BC7. Texture không nén (RGBA32) thường chiếm phần lớn build.</li>
      <li><b>Scriptable Build Pipeline (SBP)</b> là nền của <b>Addressables</b>: đóng asset thành bundle, có thể đặt trên CDN để app tải về sau thay vì nhét hết vào file cài.</li>
      <li><b>Android</b>: Unity sinh project <b>Gradle</b>, ký bằng <b>keystore</b>, ra <code>.aab</code> (Google Play) hoặc <code>.apk</code> (test). <b>iOS</b>: Unity sinh <b>Xcode project</b>; Xcode lo signing (certificate + provisioning profile) và Archive ra <code>.ipa</code>.</li>
    </ul>
    <p class="callout">Đừng build tay mỗi lần release. Viết script gọi <code>BuildPipeline.BuildPlayer</code>, rồi cho CI chạy: <b>Unity Build Automation</b> (trước gọi là Unity Cloud Build) hoặc <b>GameCI</b> trên GitHub Actions/GitLab. Mỗi lần push là có build mới, đúng cấu hình, không phụ thuộc máy ai.</p>`,
  keyPoints: [
    'IL2CPP bắt buộc với iOS, WebGL và Android ARM64; Mono build nhanh, hợp lúc dev.',
    'Texture thường là phần nặng nhất: chọn ASTC/ETC2 trên mobile, BC7/DXT trên PC.',
    'Addressables (dựa trên SBP) tách asset ra bundle tải từ CDN, giảm dung lượng file cài.',
    'Android: Gradle + keystore → .aab. iOS: Xcode project → signing + Archive → .ipa. Tự động hóa bằng CI.',
  ],
  code: {
    title: 'Editor/BuildScript.cs',
    source: `
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.AddressableAssets.Settings;
using UnityEngine;

public static class BuildScript
{
    [MenuItem("Build/Android AAB")]
    public static void BuildAndroid() // CI gọi: -executeMethod BuildScript.BuildAndroid
    {
        var target = NamedBuildTarget.Android;
        PlayerSettings.SetScriptingBackend(target, ScriptingImplementation.IL2CPP);
        PlayerSettings.SetManagedStrippingLevel(target, ManagedStrippingLevel.Medium);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
        EditorUserBuildSettings.buildAppBundle = true;           // .aab cho Google Play

        // Ký bằng keystore, mật khẩu lấy từ biến môi trường (secret của CI)
        PlayerSettings.Android.useCustomKeystore = true;
        PlayerSettings.Android.keystoreName = "Keys/release.keystore";
        PlayerSettings.Android.keystorePass = System.Environment.GetEnvironmentVariable("KEYSTORE_PASS");
        PlayerSettings.Android.keyaliasName = "release";
        PlayerSettings.Android.keyaliasPass = System.Environment.GetEnvironmentVariable("KEY_PASS");

        AddressableAssetSettings.BuildPlayerContent();            // build bundle (SBP) trước

        var options = new BuildPlayerOptions
        {
            scenes = new[] { "Assets/Scenes/Boot.unity", "Assets/Scenes/Game.unity" },
            locationPathName = "Builds/Android/game.aab",
            target = BuildTarget.Android,
            options = BuildOptions.None,
        };
        BuildReport report = BuildPipeline.BuildPlayer(options);
        Debug.Log($"Build {report.summary.result}: {report.summary.totalSize / (1024 * 1024)} MB");
        if (report.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1); // để CI báo đỏ
    }
}`,
    note: 'Không hardcode mật khẩu keystore trong repo. CI (GameCI, Unity Build Automation) truyền secret qua biến môi trường rồi chạy Unity -batchmode -executeMethod BuildScript.BuildAndroid.',
  },
  tryIt: [
    'Bấm Build với Android và đọc Console: Gradle làm gì ở bước ký keystore?',
    'Đổi texture sang RGBA32 (không nén): build vượt mốc 200 MB của Google Play không?',
    'Chọn iOS hoặc WebGL rồi chọn Mono: chuyện gì xảy ra?',
    'Tắt Addressables: phần texture/audio "Remote (CDN)" quay về file cài như thế nào?',
    'Kéo Stripping từ Disabled lên High và so phần Code. Rủi ro của mức High là gì?',
    'Bật "Chạy trên CI" và đọc trigger mới ở góc phải.',
  ],
  links: [
    { label: 'BuildPipeline.BuildPlayer', url: 'https://docs.unity3d.com/ScriptReference/BuildPipeline.BuildPlayer.html' },
    { label: 'IL2CPP overview', url: 'https://docs.unity3d.com/Manual/IL2CPP.html' },
    { label: 'Managed code stripping', url: 'https://docs.unity3d.com/Manual/ManagedCodeStripping.html' },
    { label: 'GameCI (Unity CI/CD)', url: 'https://game.ci/' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const S = { plat: 'android', backend: 'il2cpp', strip: 'medium', tex: 'astc', addr: true, ci: false };
    const STRIP = { disabled: 1, minimal: 0.9, low: 0.75, medium: 0.6, high: 0.5 };
    const BPP = { rgba32: 32, etc2: 8, astc: 3.56 };
    const PLAT = {
      android: { label: 'Android', engine: 14, limit: 200, limitLabel: 'Google Play base 200 MB', pack: ['Gradle', 'keystore ký .aab'], out: ['game.aab', '(.apk để test)'] },
      ios: { label: 'iOS', engine: 18, limit: 200, limitLabel: 'tải qua 4G ~200 MB', pack: ['Xcode', 'signing + Archive'], out: ['game.ipa', 'TestFlight / Store'] },
      webgl: { label: 'WebGL', engine: 5, limit: 50, limitLabel: 'web nên < 50 MB', pack: ['Brotli', 'nén + HTML template'], out: ['index.html', 'Build/*.wasm'] },
      pc: { label: 'PC', engine: 30, limit: 0, pack: ['Player', 'UnityPlayer.dll'], out: ['Game.exe', '+ Game_Data/'] },
    };
    let prog = -1, lastStage = -1, packetT = 0;

    const texName = () => (S.tex === 'rgba32' ? 'RGBA32' : S.plat === 'pc' ? 'BC7/DXT' : S.tex === 'astc' ? 'ASTC 6x6' : 'ETC2');
    function sizes() {
      const p = PLAT[S.plat];
      const code = (S.backend === 'il2cpp' ? 16 : 22) * STRIP[S.strip];
      const tex = (140 * (S.tex === 'rgba32' ? 32 : S.plat === 'pc' ? 8 : BPP[S.tex])) / 32, audio = 9;
      const segs = [
        { name: 'Engine', v: p.engine, c: C.navy2 }, { name: 'Code', v: code, c: C.purple },
        { name: 'Texture', v: S.addr ? tex * 0.3 : tex, c: C.orange }, { name: 'Audio', v: S.addr ? audio * 0.4 : audio, c: C.teal },
        { name: 'Mesh/khác', v: 7, c: C.yellow },
      ];
      return { segs, base: segs.reduce((a, s) => a + s.v, 0), remote: S.addr ? tex * 0.7 + audio * 0.6 : 0 };
    }
    function stages() {
      const p = PLAT[S.plat], il = S.backend === 'il2cpp';
      return [
        ['Compile C#', 'Roslyn → .dll', C.blue],
        S.plat === 'webgl' ? ['IL2CPP', 'C++ → .wasm', C.purple] : il ? ['IL2CPP', 'IL → C++ → native', C.purple] : ['Mono', 'giữ .dll, chạy JIT', C.purple],
        ['Asset import', 'Texture → ' + texName(), C.orange],
        S.addr ? ['Addressables', 'SBP → .bundle (CDN)', C.teal] : ['Content', 'SBP → sharedassets', C.teal],
        [p.pack[0], p.pack[1], C.yellow],
        [p.out[0], p.out[1], C.green],
      ];
    }
    const LOGS = [
      () => 'Compile C#: Assembly-CSharp.dll + các .asmdef (lỗi compile sẽ dừng build tại đây)',
      () => (S.backend === 'il2cpp' ? `IL2CPP: dịch IL → C++, stripping ${S.strip}, rồi compile native${S.plat === 'webgl' ? ' bằng Emscripten → .wasm' : ''}` : 'Mono: copy .dll đã strip, runtime JIT dịch lúc chạy'),
      () => `Import asset: nén texture sang ${texName()}, audio Vorbis, mesh compression`,
      () => (S.addr ? 'Addressables: Scriptable Build Pipeline đóng bundle + catalog.json để upload lên CDN' : 'Đóng content vào sharedassets/resources nằm trong file cài'),
      () => ({ android: 'Gradle: build project Android, ký bằng release.keystore (zipalign + apksigner)', ios: 'Unity xuất Xcode project. Xcode: signing (certificate + provisioning profile) → Archive', webgl: 'Nén Brotli/Gzip, chép vào HTML template', pc: 'Chép UnityPlayer.dll, Game_Data/, MonoBleedingEdge hoặc GameAssembly.dll' })[S.plat],
      () => `Artifact: ${PLAT[S.plat].out[0]} · ${sizes().base.toFixed(0)} MB${S.addr ? ` (+${sizes().remote.toFixed(0)} MB bundle trên CDN)` : ''}`,
    ];

    function validate() {
      if (S.backend === 'mono' && (S.plat === 'ios' || S.plat === 'webgl')) {
        stage.log(`${PLAT[S.plat].label} chỉ hỗ trợ IL2CPP. Đã chuyển Scripting Backend về IL2CPP.`, 'warn');
        S.backend = 'il2cpp'; backendSel.set('il2cpp');
      }
      if (S.backend === 'mono' && S.plat === 'android') stage.log('Mono trên Android chỉ build ARMv7 (32-bit). Google Play bắt buộc ARM64 → cần IL2CPP khi release.', 'warn');
      if (S.plat === 'pc' && S.tex !== 'rgba32') stage.log('PC không hỗ trợ ASTC/ETC2 bằng phần cứng: Unity dùng BC7/DXT.', 'info');
      updateReadout();
    }
    function updateReadout() {
      const s = sizes(), lim = PLAT[S.plat].limit;
      sizeOut.set(`${s.base.toFixed(0)} MB${S.addr ? ` + ${s.remote.toFixed(0)} CDN` : ''}`);
      if (lim && s.base > lim) stage.log(`Cảnh báo: ${s.base.toFixed(0)} MB vượt mốc ${PLAT[S.plat].limitLabel}`, 'warn');
    }
    const startBuild = () => { prog = 0; lastStage = -1; stage.clearLog(); stage.log(`▶ Build ${PLAT[S.plat].label} · trigger: ${S.ci ? 'git push → GameCI runner (batchmode)' : 'File ▸ Build Settings'}`); };

    stage.ui.group('Build Settings');
    stage.ui.select('Platform', [{ value: 'android', label: 'Android' }, { value: 'ios', label: 'iOS' }, { value: 'webgl', label: 'WebGL' }, { value: 'pc', label: 'PC (Windows)' }], S.plat, (v) => { S.plat = v; prog = -1; validate(); });
    stage.ui.button('Build', startBuild, { variant: 'primary' });
    stage.ui.group('Player Settings');
    const backendSel = stage.ui.select('Scripting Backend', [{ value: 'il2cpp', label: 'IL2CPP' }, { value: 'mono', label: 'Mono' }], S.backend, (v) => { S.backend = v; validate(); });
    stage.ui.select('Stripping Level', ['disabled', 'minimal', 'low', 'medium', 'high'], S.strip, (v) => { S.strip = v; validate(); if (v === 'high') stage.log('Stripping High: nhớ thêm link.xml cho type chỉ dùng qua reflection (JSON, DI…)', 'warn'); });
    stage.ui.select('Texture compression', [{ value: 'astc', label: 'ASTC 6x6' }, { value: 'etc2', label: 'ETC2' }, { value: 'rgba32', label: 'RGBA32 (không nén)' }], S.tex, (v) => { S.tex = v; validate(); });
    stage.ui.toggle('Addressables (remote)', S.addr, (v) => { S.addr = v; validate(); });
    stage.ui.toggle('Chạy trên CI (GameCI)', S.ci, (v) => { S.ci = v; });
    const sizeOut = stage.ui.readout('Dung lượng', '');
    updateReadout();
    startBuild();

    stage.onFrame((dt) => {
      packetT += dt;
      if (prog >= 0 && prog < 6) {
        prog = Math.min(6, prog + dt * 0.75);
        const i = Math.min(5, Math.floor(prog));
        if (i !== lastStage) { lastStage = i; stage.log(LOGS[i]()); }
        if (prog >= 6) stage.log('✔ Build succeeded', 'info');
      }
      render();
    });

    function render() {
      const { w, h } = stage, st = stages(), p = PLAT[S.plat];
      d.clear(w, h); d.grid(w, h);
      // Header
      const hw = Math.min(330, w - 40);
      d.node(20, 14, hw, 52, null, { accent: C.navy });
      d.text(`Build Settings ▸ ${p.label}`, 34, 32, { font: 'cond', weight: 700, size: 16, color: C.navy });
      d.text(`${S.backend.toUpperCase()} · strip ${S.strip} · ${texName()}`, 34, 52, { font: 'mono', size: 11, color: C.muted });
      if (w > 560) {
        const status = prog < 0 ? 'chưa build' : prog >= 6 ? 'Build succeeded' : `Đang build… ${Math.floor(prog) + 1}/6`;
        d.text(status, w - 20, 32, { align: 'right', font: 'mono', size: 13, weight: 600, color: prog >= 6 ? C.green : C.navy });
        d.text(S.ci ? 'trigger: git push → GameCI runner' : 'trigger: Editor (thủ công)', w - 20, 52, { align: 'right', font: 'mono', size: 11, color: S.ci ? C.teal : C.muted });
      }
      // Pipeline (snake layout when narrow)
      const per = w >= 760 ? 6 : 3, gap = per === 6 ? 22 : 26, top = h < 420 ? 80 : 92, rowGap = h < 420 ? 22 : 34, rws = 6 / per;
      const nh = U.clamp((h - top - 150) / rws - rowGap, 42, 92);
      const nw = (w - 40 - gap * (per - 1)) / per;
      const pos = st.map((_, i) => {
        const row = Math.floor(i / per), col = row % 2 ? per - 1 - (i % per) : i % per;
        return { x: 20 + col * (nw + gap), y: top + row * (nh + rowGap) };
      });
      pos.forEach((a, i) => {
        if (i === 5) return;
        const b = pos[i + 1], done = prog > i + 1 || prog >= 6, col = done ? C.green : C.line;
        if (a.y === b.y) { const dir = b.x > a.x ? 1 : -1; d.arrow(dir > 0 ? a.x + nw + 2 : a.x - 2, a.y + nh / 2, dir > 0 ? b.x - 2 : b.x + nw + 2, b.y + nh / 2, { stroke: col, head: 7 }); }
        else d.arrow(a.x + nw / 2, a.y + nh + 2, b.x + nw / 2, b.y - 2, { stroke: col, head: 7 });
      });
      st.forEach(([title, sub, color], i) => {
        const { x, y } = pos[i], active = prog >= i && prog < i + 1 && prog < 6, done = prog >= i + 1;
        d.node(x, y, nw, nh, null, { accent: active || done ? color : C.lineSoft, lw: active ? 3 : 2, fill: active ? C.paper : C.card });
        if (active) d.rect(x + 6, y + nh - 8, (nw - 12) * (prog - i), 3, { fill: color, r: 2 });
        const fs = U.clamp(nw / 9, 11, 14);
        d.text(`${i + 1}. ${title}`, x + 10, y + nh / 2 - 9, { font: 'cond', weight: 700, size: fs, color: done || active ? C.navy : C.faint });
        d.text(fit(sub, nw - 16), x + 10, y + nh / 2 + 11, { font: 'mono', size: 11, color: C.muted });
        d.circle(x + nw - 12, y + 14, 5, { fill: done ? C.green : active ? color : C.lineSoft });
      });
      if (prog >= 0 && prog < 6) { // packet travelling between stages
        const i = Math.floor(prog), f = U.ease.inOutQuad(prog - i), a = pos[i], b = pos[Math.min(5, i + 1)];
        const px = U.lerp(a.x, b.x, f) + nw / 2, py = U.lerp(a.y, b.y, f) + nh / 2 + (a.y === b.y ? -nh / 2 - 6 : 0);
        d.circle(px, py, 6 + Math.sin(packetT * 8), { fill: st[i][2], stroke: '#fff', lw: 2 });
      }
      // Size breakdown
      const sy = top + rws * (nh + rowGap) + 6, s = sizes();
      const barX = 20, barW = w - 40, barH = U.clamp(h - sy - 110, 30, 46), by = sy + 30;
      const scale = Math.max(s.base + s.remote, p.limit * 1.15, 120);
      d.text('Build size (ước tính)', barX, sy + 10, { font: 'cond', weight: 700, size: 15, color: C.navy });
      d.text(`${s.base.toFixed(0)} MB trong file cài${s.remote ? ` · ${s.remote.toFixed(0)} MB tải từ CDN` : ''}`, w - 20, sy + 10, { align: 'right', font: 'mono', size: 11, color: C.muted });
      d.rect(barX, by, barW, barH, { fill: C.bgDeep, r: 6 });
      let x = barX;
      s.segs.forEach((g) => {
        const sw = (g.v / scale) * barW;
        d.rect(x, by, Math.max(1, sw - 2), barH, { fill: g.c, r: 4 });
        if (sw > 44) d.text(`${g.v.toFixed(0)}`, x + sw / 2, by + barH / 2, { align: 'center', font: 'mono', size: 11, weight: 600, color: '#fff' });
        x += sw;
      });
      if (s.remote) {
        const rw = (s.remote / scale) * barW;
        d.rect(x + 4, by, rw - 4, barH, { fill: 'rgba(26,163,161,0.12)', stroke: C.teal, dash: [5, 4], r: 4 });
        if (rw > 70) d.text(`CDN ${s.remote.toFixed(0)}`, x + rw / 2 + 2, by + barH / 2, { align: 'center', font: 'mono', size: 11, color: C.tealDeep });
      }
      if (p.limit) {
        const lx = barX + (p.limit / scale) * barW, over = s.base > p.limit;
        d.line(lx, by - 8, lx, by + barH + 8, { stroke: over ? C.red : C.navy, lw: 2, dash: [4, 3] });
        d.text(p.limitLabel, U.clamp(lx, barX + 60, w - 70), by + barH + 18, { align: 'center', font: 'mono', size: 11, color: over ? C.red : C.muted });
      }
      // Legend
      let lx = barX; const ly = by + barH + (p.limit ? 40 : 22);
      [...s.segs, ...(s.remote ? [{ name: 'Remote (CDN)', c: C.teal }] : [])].forEach((g) => {
        const lw = d.measure(g.name, { font: 'mono', size: 11 }) + 26;
        if (lx + lw > w - 10) return;
        d.rect(lx, ly - 5, 10, 10, { fill: g.c, r: 2 }); d.text(g.name, lx + 15, ly, { font: 'mono', size: 11, color: C.ink });
        lx += lw;
      });
    }
    function fit(str, maxW) {
      if (d.measure(str, { font: 'mono', size: 11 }) <= maxW) return str;
      while (str.length > 3 && d.measure(str + '…', { font: 'mono', size: 11 }) > maxW) str = str.slice(0, -1);
      return str + '…';
    }
  },
});
