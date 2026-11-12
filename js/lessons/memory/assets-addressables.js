/* Lesson: Resources vs AssetBundles vs Addressables — async loading, ref counting, unloading, remote CDN. */
U101.defineLesson('assets-addressables', {
  lead: 'Asset (texture, prefab, audio) chiếm phần lớn RAM của game. Resources load đồng bộ và khó giải phóng; AssetBundle cho tải theo gói nhưng bạn tự quản lý; Addressables lo dependency, tải từ CDN và đếm reference giúp bạn.',
  hint: 'Đổi "Hệ thống" để so sánh · Load Hero 2 lần rồi Release 1 lần · Load Boss để tải từ CDN, lần sau sẽ lấy từ cache',
  overview: `
    <p>Cả ba cách đều đưa asset từ đĩa (hoặc mạng) vào RAM. Khác nhau ở <b>khi nào tải</b>, <b>tải từ đâu</b> và <b>ai chịu trách nhiệm giải phóng</b>.</p>
    <ul>
      <li><b>Resources/</b>: mọi thứ trong thư mục này bị đóng vào build, kể cả khi không dùng. <code>Resources.Load</code> chạy đồng bộ (dễ gây giật). Không có Release theo từng asset, chỉ có <code>Resources.UnloadUnusedAssets()</code> quét toàn bộ. Unity khuyên chỉ dùng cho prototype.</li>
      <li><b>AssetBundle</b>: file chứa asset, tải từ đĩa hoặc server. Bạn phải tự tải dependency bundle và tự quyết định lúc <code>Unload(true/false)</code>. Unload sai lúc làm instance mất texture/material (màu hồng magenta).</li>
      <li><b>Addressables</b>: lớp bên trên AssetBundle. Gọi asset bằng <b>address</b> hoặc <code>AssetReference</code>, tự tải dependency, hỗ trợ <b>remote catalog/CDN</b> và <b>reference counting</b>: mỗi <code>LoadAssetAsync</code> tăng refCount, mỗi <code>Release</code> giảm, về 0 thì bundle được unload.</li>
    </ul>
    <p class="callout">Luôn ghép cặp: mỗi lần Load là một lần Release. Quên Release thì asset ở lại RAM mãi. Release dư thì asset bị unload khi người khác vẫn đang dùng.</p>`,
  keyPoints: [
    'Tải async (LoadAssetAsync) để không chặn main thread, hiện progress bằng PercentComplete.',
    'Addressables đếm reference: Load +1, Release −1, về 0 mới unload.',
    'Nội dung remote được tải về một lần và lưu cache trên máy.',
    'Resources tiện nhưng làm build nặng, startup chậm và khó kiểm soát bộ nhớ.',
  ],
  code: [{
    title: 'BossSpawner.cs',
    source: `
using System.Collections;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.UI;

public class BossSpawner : MonoBehaviour
{
    [SerializeField] private AssetReferenceGameObject bossRef; // kéo asset Addressable vào Inspector
    [SerializeField] private Image progressBar;
    private AsyncOperationHandle<GameObject> handle;
    private GameObject boss;

    public IEnumerator SpawnBoss()
    {
        handle = bossRef.LoadAssetAsync();          // refCount +1, tải bundle + dependency (CDN nếu remote)
        while (!handle.IsDone)
        {
            progressBar.fillAmount = handle.PercentComplete;
            yield return null;
        }
        if (handle.Status == AsyncOperationStatus.Succeeded)
            boss = Instantiate(handle.Result);
    }

    public void DespawnBoss()
    {
        if (boss != null) Destroy(boss);
        if (handle.IsValid()) Addressables.Release(handle); // refCount −1, về 0 thì unload
    }
}`,
    note: 'Mỗi LoadAssetAsync phải có đúng một Addressables.Release tương ứng. Lưu handle lại để Release sau.',
  }, {
    title: 'OldWays.cs',
    source: `
// Resources: đồng bộ, mọi thứ trong Resources/ nằm trong build
GameObject hero = Resources.Load<GameObject>("Characters/Hero");
Instantiate(hero);
Resources.UnloadUnusedAssets(); // cách duy nhất để trả RAM, quét toàn bộ

// AssetBundle: tự lo đường dẫn, dependency và vòng đời
string path = Path.Combine(Application.streamingAssetsPath, "characters");
AssetBundle bundle = AssetBundle.LoadFromFile(path);
GameObject prefab = bundle.LoadAsset<GameObject>("Hero");
bundle.Unload(false); // false: giữ asset đã load · true: hủy hết, instance mất texture`,
    note: 'Addressables vẫn build ra AssetBundle bên dưới, nhưng thay bạn quản lý đường dẫn, dependency và thời điểm Unload.',
  }],
  tryIt: [
    'Chế độ Addressables: Load Hero 2 lần. refCount bằng mấy? RAM có tăng gấp đôi không?',
    'Release Hero 1 lần: asset còn trong RAM không? Release lần nữa thì sao?',
    'Load Boss, đợi tải xong, Release, rồi Load lại. Lần hai có tải từ CDN nữa không?',
    'Chuyển sang AssetBundle, load Hero 2 lần rồi Release: chuyện gì xảy ra với instance còn lại?',
    'Chuyển sang Resources: Load Boss được không? Release xong RAM có giảm không?',
  ],
  links: [
    { label: 'Addressables package manual', url: 'https://docs.unity3d.com/Packages/com.unity.addressables@latest' },
    { label: 'Addressables: Memory management', url: 'https://docs.unity3d.com/Packages/com.unity.addressables@latest/index.html?subfolder=/manual/MemoryManagement.html' },
    { label: 'Unity Manual: AssetBundles', url: 'https://docs.unity3d.com/Manual/AssetBundlesIntro.html' },
    { label: 'Unity Manual: Loading resources at runtime', url: 'https://docs.unity3d.com/Manual/LoadingResourcesatRuntime.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const A = {
      hero: { name: 'Hero.prefab', deps: '+ Hero.mat, Hero_D.png', mb: 22, src: 'local', col: C.teal },
      boss: { name: 'Boss.prefab', deps: '+ Boss_D.png, Boss.anim', mb: 46, src: 'remote', col: C.purple },
    };
    const MODES = { res: 'Resources', bundle: 'AssetBundle', addr: 'Addressables' };
    let mode = 'addr', slowNet = false, t = 0, hitch = -9, st;
    const fresh = () => ({ loaded: false, refs: 0, op: null, cached: false, broken: false, flash: -9 });
    function resetState() { st = { hero: fresh(), boss: fresh() }; }
    resetState();
    Object.assign(st.hero, { loaded: true, refs: 2 }); st.boss.op = { p: 0.35, phase: 'download' }; // initial scene

    const api = (k) => (mode === 'res' ? `Resources.Load("${k}")` : mode === 'bundle' ? (A[k].src === 'remote' ? 'UnityWebRequestAssetBundle' : 'AssetBundle.LoadFromFileAsync') : `Addressables.LoadAssetAsync("${k}")`);
    function load(k) {
      const s = st[k];
      if (mode === 'res') {
        if (A[k].src === 'remote') return stage.log('Resources chỉ chứa asset đóng sẵn trong build, không tải từ CDN được', 'error');
        if (!s.loaded) { s.loaded = true; hitch = t; stage.log(`Resources.Load đồng bộ: main thread bị chặn ~180 ms để đọc ${A[k].mb} MB`, 'warn'); }
        s.refs++; s.flash = t; return stage.log(`Instantiate ${A[k].name} (instance #${s.refs})`);
      }
      if (s.op) return stage.log(`${A[k].name} đang tải, chờ handle hoàn tất`, 'warn');
      if (s.loaded && !s.broken) { s.refs++; s.flash = t; return stage.log(mode === 'addr' ? `Đã có trong RAM → refCount = ${s.refs}, không tải lại` : `Bundle đã load → Instantiate thêm (bạn phải tự nhớ có ${s.refs} instance)`); }
      s.broken = false; s.refs = 0;
      s.op = { p: 0, phase: A[k].src === 'remote' && !s.cached ? 'download' : 'load' };
      stage.log(`${api(k)} → ${s.op.phase === 'download' ? 'tải từ CDN' : A[k].src === 'remote' ? 'đọc từ cache trên máy' : 'đọc bundle local'}`);
    }
    function release(k) {
      const s = st[k];
      if (!s.refs) return stage.log(`Không còn instance/handle nào của ${A[k].name} để Release`, 'warn');
      if (mode === 'res') { s.refs--; return stage.log(`Destroy(instance). ${A[k].mb} MB vẫn trong RAM, Resources không đếm reference → cần UnloadUnusedAssets()`, 'warn'); }
      if (s.broken) { s.refs--; return stage.log('Destroy instance lỗi (đã mất asset)'); }
      if (mode === 'bundle') {
        s.refs--; s.loaded = false;
        if (s.refs > 0) { s.broken = true; stage.log(`bundle.Unload(true) trong khi còn ${s.refs} instance dùng → mất texture/material (magenta)`, 'error'); }
        else stage.log(`bundle.Unload(true) → trả ${A[k].mb} MB`);
        return;
      }
      s.refs--; s.flash = t;
      if (s.refs > 0) stage.log(`Addressables.Release → refCount = ${s.refs}, asset vẫn giữ trong RAM`);
      else { s.loaded = false; stage.log(`Release → refCount = 0 → unload bundle, trả ${A[k].mb} MB`); }
    }

    stage.ui.group('Hệ thống');
    stage.ui.select('Cách load', Object.entries(MODES).map(([value, label]) => ({ value, label })), mode, (v) => { mode = v; resetState(); stage.log(`Chuyển sang ${MODES[v]} (RAM được dọn sạch)`); });
    stage.ui.toggle('Mạng chậm (3G)', slowNet, (v) => (slowNet = v));
    stage.ui.group('Hero.prefab · local 22 MB');
    stage.ui.button('Load Hero', () => load('hero'), { variant: 'primary' });
    stage.ui.button('Release Hero', () => release('hero'));
    stage.ui.group('Boss.prefab · remote CDN 46 MB');
    stage.ui.button('Load Boss', () => load('boss'), { variant: 'primary' });
    stage.ui.button('Release Boss', () => release('boss'));
    stage.ui.group('Dọn dẹp');
    stage.ui.button('UnloadUnusedAssets()', () => {
      const ks = Object.keys(A).filter((k) => st[k].loaded && st[k].refs === 0);
      ks.forEach((k) => (st[k].loaded = false));
      stage.log(ks.length ? `Resources.UnloadUnusedAssets(): trả ${ks.reduce((s, k) => s + A[k].mb, 0)} MB (quét toàn bộ, tốn CPU)` : 'UnloadUnusedAssets(): không có asset nào hết người dùng');
    });
    stage.ui.button('Caching.ClearCache()', () => { Object.values(st).forEach((s) => (s.cached = false)); stage.log('Xóa cache bundle trên máy → lần sau phải tải lại từ CDN'); }, { variant: 'danger' });
    const rRam = stage.ui.readout('RAM asset', '—');

    stage.onFrame((dt) => {
      t += dt;
      Object.keys(A).forEach((k) => {
        const s = st[k], op = s.op; if (!op) return;
        op.p += dt * (op.phase === 'download' ? (slowNet ? 0.1 : 0.3) : 1.1);
        if (op.p < 1) return;
        if (op.phase === 'download') { s.cached = true; s.op = { p: 0, phase: 'load' }; return stage.log(`Tải ${A[k].mb} MB từ CDN xong → lưu vào cache`); }
        Object.assign(s, { op: null, loaded: true, refs: 1, flash: t });
        stage.log(`${A[k].name} Completed${mode === 'addr' ? ' → refCount = 1' : ''} · Instantiate`);
      });
      rRam.set(`${Object.keys(A).reduce((m, k) => m + (st[k].loaded ? A[k].mb : 0), 0)} MB`);
      render();
    });

    function render() {
      const { w, h } = stage, pad = 14, memH = 50;
      d.clear(w, h); d.grid(w, h);
      const sw = Math.min(170, w * 0.27), rw = Math.min(250, w * 0.34), rx = w - rw - pad, bot = h - memH - pad * 2;
      // Sources
      const srcs = [['Resources/', 'đóng trong build', 'res'], ['StreamingAssets', 'bundle local', 'local'], ['CDN', 'remote · https://', 'remote']];
      const srcH = Math.min(62, (bot - pad - 30) / 3 - 10), srcY = (i) => pad + 26 + i * (srcH + 14);
      d.text('NGUỒN', pad, pad + 10, { font: 'mono', size: 11, weight: 700, color: C.tealDeep });
      srcs.forEach(([n, sub, id], i) => {
        const on = mode === 'res' ? id === 'res' : id !== 'res';
        d.ctx.globalAlpha = on ? 1 : 0.35;
        d.node(pad, srcY(i), sw, srcH, n, { sub, accent: id === 'remote' ? C.blue : C.line, size: 14 });
        d.ctx.globalAlpha = 1;
      });
      const srcOf = (k) => (mode === 'res' ? 0 : A[k].src === 'remote' && !st[k].cached ? 2 : 1);
      const scX = pad + sw + 20, scW = rx - scX - 20, scY = pad + 120, scH = bot - scY;
      d.node(scX, scY, scW, scH, null, { accent: C.line, shadow: 3 });
      d.text('Scene', scX + 12, scY + 16, { font: 'mono', size: 11, weight: 700, color: C.muted });
      // RAM panel
      d.rect(rx, pad, rw, bot - pad, { fill: 'rgba(255,255,255,0.45)', stroke: C.line, dash: [5, 4], r: 12 });
      d.text('RAM · asset đã load', rx + 12, pad + 14, { font: 'mono', size: 11, weight: 700, color: C.purple });
      const cardY = (i) => pad + 30 + i * 84;
      Object.keys(A).forEach((k, i) => {
        const s = st[k], y = cardY(i), f = U.clamp(1 - (t - s.flash) / 0.8, 0, 1);
        d.ctx.globalAlpha = s.loaded ? 1 : 0.4;
        d.node(rx + 10, y, rw - 20, 70, null, { accent: s.broken ? C.pink : s.loaded ? A[k].col : C.lineSoft, lw: 2 + f * 2, dash: s.loaded ? null : [4, 4] });
        d.text(A[k].name, rx + 22, y + 18, { font: 'cond', weight: 700, size: 14, color: C.navy });
        d.text(A[k].deps, rx + 22, y + 37, { font: 'mono', size: 11, color: C.muted });
        d.text(s.loaded ? `${A[k].mb} MB` : s.broken ? 'đã unload!' : 'chưa load', rx + 22, y + 55, { font: 'mono', size: 11, weight: 600, color: s.broken ? C.red : C.ink });
        d.ctx.globalAlpha = 1;
        if (mode === 'addr') d.pill(`ref ${s.refs}`, rx + rw - 22 - d.measure(`ref ${s.refs}`, { font: 'mono', size: 11 }) - 16, y + 18, { size: 11, fill: s.refs ? A[k].col : C.faint });
        // In-flight load: progress bar + packet travelling from source to RAM
        if (s.op) {
          const sy = srcY(srcOf(k)) + srcH / 2, ex = rx + 10, ey = y + 35, e = U.ease.inOutQuad(s.op.p);
          d.line(pad + sw, sy, ex, ey, { stroke: C.line, lw: 1.5, dash: [5, 5] });
          d.circle(U.lerp(pad + sw, ex, e), U.lerp(sy, ey, e), 6, { fill: s.op.phase === 'download' ? C.blue : A[k].col, stroke: '#fff', lw: 2 });
          const mx = pad + sw + 20, mw = rx - mx - 20, my = pad + 24 + i * 46;
          d.text(`${s.op.phase === 'download' ? 'Download' : 'Load'} ${k} · ${Math.round(s.op.p * 100)}%`, mx, my, { font: 'mono', size: 11, weight: 600, color: C.navy });
          d.rect(mx, my + 10, mw, 8, { fill: C.bgDeep, r: 4 }); d.rect(mx, my + 10, mw * s.op.p, 8, { fill: s.op.phase === 'download' ? C.blue : A[k].col, r: 4 });
        }
      });
      // Scene instances
      Object.keys(A).forEach((k, row) => {
        const s = st[k], r = k === 'boss' ? 16 : 12;
        for (let i = 0; i < s.refs; i++) {
          const x = scX + 30 + i * (r * 2 + 12), y = scY + 50 + row * Math.min(60, (scH - 60) / 2);
          if (x > scX + scW - r) break;
          const pop = U.ease.outBack(U.clamp((t - s.flash) / 0.4, 0, 1)), last = i === s.refs - 1;
          d.circle(x, y, r * (last ? pop : 1), { fill: s.broken ? C.pink : A[k].col, stroke: '#fff', lw: 2 });
          if (s.broken) d.text('?', x, y + 1, { align: 'center', font: 'mono', size: 12, weight: 700, color: '#fff' });
        }
      });
      if (t - hitch < 1) d.text('⚠ main thread blocked', scX + scW / 2, scY + scH - 18, { align: 'center', font: 'mono', size: 12, weight: 700, color: C.red });
      // Memory bar
      const my = h - memH - pad, total = 100;
      d.node(pad, my, w - pad * 2, memH, null, { accent: C.line, shadow: 4 });
      let x = pad + 12; const bw = w - pad * 2 - 24;
      d.rect(x, my + 28, bw, 12, { fill: C.bgDeep, r: 6 });
      Object.keys(A).forEach((k) => { if (!st[k].loaded) return; const segW = bw * (A[k].mb / total); d.rect(x, my + 28, segW, 12, { fill: st[k].broken ? C.pink : A[k].col, r: 6 }); x += segW; });
      const used = Object.keys(A).reduce((m, k) => m + (st[k].loaded ? A[k].mb : 0), 0);
      d.text(`RAM asset: ${used} / ${total} MB · ${MODES[mode]}`, pad + 12, my + 14, { font: 'mono', size: 12, weight: 700, color: C.navy });
    }
  },
});
