/* Lesson: Render pipelines — one frame's passes, culling, and how batching options change Batches / SetPass calls. */
U101.defineLesson('render-pipelines', {
  lead: 'Render pipeline là chuỗi bước Unity dùng để vẽ một frame: cull → shadow → opaque → skybox → transparent → post-process. Unity có Built-in, URP và HDRP; chọn sai pipeline rất tốn công đổi lại.',
  hint: 'Đổi pipeline và bật/tắt Static Batching, GPU Instancing, SRP Batcher · xem Batches và SetPass thay đổi · camera tự quay để thấy culling',
  overview: `
    <p>Mỗi frame, camera đi qua cùng một chuỗi pass. Thanh trên cùng của mô phỏng là chuỗi đó; vùng dưới là scene nhìn từ trên xuống.</p>
    <ul>
      <li><b>Culling</b>: bỏ object nằm ngoài frustum camera (xám trên scene). Không vẽ thì không tốn gì.</li>
      <li><b>Shadows</b>: vẽ lại các shadow caster vào shadow map, mỗi cascade một lần.</li>
      <li><b>Opaque</b> vẽ từ gần ra xa (đỡ overdraw), <b>Skybox</b> lấp phần trống, <b>Transparent</b> vẽ từ xa vào gần nên khó gộp batch.</li>
      <li><b>Post-process</b>: Bloom, Tonemapping, Color Grading... chạy trên ảnh cuối.</li>
    </ul>
    <p><b>Draw call</b> là một lệnh CPU gửi GPU vẽ mesh. <b>SetPass call</b> là lần đổi shader/material, thường đắt hơn. Giảm cả hai bằng:</p>
    <ul>
      <li><b>Static Batching</b>: gộp mesh của object đánh dấu Static cùng material thành một khối lớn.</li>
      <li><b>GPU Instancing</b>: vẽ nhiều bản cùng mesh + material trong một draw call.</li>
      <li><b>SRP Batcher</b> (chỉ URP/HDRP): không giảm số draw call, nhưng giữ dữ liệu material trên GPU, nên mỗi draw call rất rẻ và SetPass chỉ còn theo <i>shader variant</i>. Object tương thích SRP Batcher sẽ không dùng GPU Instancing.</li>
    </ul>
    <p class="callout"><b>URP</b>: mobile, Switch, WebGL, VR, PC tầm trung; nhanh, linh hoạt, có 2D Renderer. <b>HDRP</b>: PC/console cao cấp, ánh sáng vật lý, volumetric, ray tracing; không chạy mobile. <b>Built-in</b>: pipeline cũ, không có Shader Graph đầy đủ hay SRP Batcher; dự án mới nên dùng URP.</p>`,
  keyPoints: [
    'Frame = Culling → Shadows → Opaque → Skybox → Transparent → Post-process.',
    'Static Batching và GPU Instancing giảm số Batches; SRP Batcher làm mỗi draw call rẻ hơn và giảm SetPass.',
    'Transparent sắp xếp xa→gần nên ít gộp được: hạn chế dùng nhiều.',
    'URP cho đa nền tảng/mobile, HDRP cho PC/console đồ họa cao; đổi pipeline giữa dự án rất tốn công.',
  ],
  code: {
    title: 'PipelineInfo.cs',
    source: `
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class PipelineInfo : MonoBehaviour
{
    void Start()
    {
        // null nghĩa là đang dùng Built-in Render Pipeline
        var rp = GraphicsSettings.currentRenderPipeline;
        Debug.Log(rp == null ? "Built-in" : rp.GetType().Name);

        // SRP Batcher bật/tắt toàn cục (thường chỉnh trong URP Asset)
        GraphicsSettings.useScriptableRenderPipelineBatching = true;

        if (rp is UniversalRenderPipelineAsset urp)
            urp.shadowCascadeCount = 2;   // ít cascade = ít shadow draw call
    }
}

// GPU Instancing: bật "Enable GPU Instancing" trên Material, hoặc vẽ thủ công:
// Graphics.RenderMeshInstanced(rparams, mesh, 0, matrices);`,
    note: 'Kiểm chứng bằng Frame Debugger (Window → Analysis) để xem từng pass, và cửa sổ Stats trong Game view để đọc Batches / SetPass calls.',
  },
  tryIt: [
    'Tắt hết tối ưu, tăng số object lên 300: Batches gần bằng số object nhìn thấy cộng shadow.',
    'Bật Static Batching: phần object Static (viền đậm) gộp lại theo material.',
    'Ở URP, bật GPU Instancing rồi bật SRP Batcher: Console giải thích vì sao instancing bị bỏ qua.',
    'Tăng số material từ 2 lên 8: batching kém hiệu quả hơn, SetPass tăng.',
    'Chọn Built-in rồi bật SRP Batcher: nó không có tác dụng.',
    'Chọn HDRP: post-process nhiều pass hơn, và nền tảng mobile biến mất.',
  ],
  links: [
    { label: 'Render pipelines introduction', url: 'https://docs.unity3d.com/Manual/render-pipelines-overview.html' },
    { label: 'SRP Batcher', url: 'https://docs.unity3d.com/Manual/SRPBatcher.html' },
    { label: 'Draw call batching', url: 'https://docs.unity3d.com/Manual/DrawCallBatching.html' },
    { label: 'Frame Debugger', url: 'https://docs.unity3d.com/Manual/FrameDebugger.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const MATC = [C.teal, C.orange, C.blue, C.green, C.purple, C.pink, C.yellow, C.red];
    const PIPES = {
      builtin: { name: 'Built-in', post: 3, cascades: 2, plat: 'Mọi nền tảng · legacy', note: 'Không có SRP Batcher, Shader Graph hạn chế', accent: C.faint },
      urp: { name: 'URP', post: 2, cascades: 2, plat: 'Mobile · PC · Console · WebGL · VR', note: 'Forward / Forward+ · 2D Renderer · SRP Batcher', accent: C.teal },
      hdrp: { name: 'HDRP', post: 7, cascades: 4, plat: 'PC · Console cao cấp (không mobile)', note: 'Deferred · ánh sáng vật lý · volumetric · DXR', accent: C.purple },
    };
    const S = { pipe: 'urp', count: 120, mats: 4, staticB: false, inst: false, srp: false };
    const STAGES = ['Culling', 'Shadows', 'Opaque', 'Skybox', 'Transparent', 'Post'], SHORT = ['Cull', 'Shadow', 'Opaque', 'Sky', 'Transp', 'Post'];
    const PASSC = [C.faint, C.navy2, C.teal, C.blue, C.pink, C.purple];
    const CAM = { x: 0.5, y: 0.98 }, HALF = 0.62, FAR = 0.75;
    let objs = [], cur = 0, timer = 0, camA = 0, stats = null;

    function build() {
      let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      objs = Array.from({ length: S.count }, () => ({ x: 0.04 + rnd() * 0.92, y: 0.04 + rnd() * 0.8, m: Math.floor(rnd() * 8), st: rnd() < 0.5, tr: rnd() < 0.15 }));
    }
    const mat = (o) => o.m % S.mats;
    const uniq = (list, key) => new Set(list.map(key)).size;

    function compute() {
      objs.forEach((o) => { // frustum test: inside the view angle and before the far plane
        const dx = o.x - CAM.x, dy = CAM.y - o.y, a = Math.atan2(dx, dy) - camA;
        o.vis = Math.abs(a) < HALF && dx * Math.sin(camA) + dy * Math.cos(camA) < FAR;
      });
      const P = PIPES[S.pipe], srpOn = S.srp && S.pipe !== 'builtin', instOn = S.inst && !srpOn;
      const vis = objs.filter((o) => o.vis), opq = vis.filter((o) => !o.tr), tr = vis.filter((o) => o.tr);
      const batches = (list) => {
        const st = S.staticB ? list.filter((o) => o.st) : [], dyn = S.staticB ? list.filter((o) => !o.st) : list;
        return uniq(st, mat) + (instOn ? uniq(dyn, mat) : dyn.length);
      };
      const per = [0, batches(opq) * P.cascades, batches(opq), 1, tr.length, P.post];
      const draws = opq.length * (P.cascades + 1) + tr.length + 1 + P.post;
      const total = per.reduce((a, b) => a + b, 0);
      const setpass = srpOn ? 2 + 2 + (tr.length ? 2 : 0) + 1 + P.post : uniq(opq, mat) * 2 + uniq(tr, mat) + 1 + P.post; // SRP: per shader variant (2), not per material
      const cpu = srpOn ? total * 0.012 + setpass * 0.1 : total * 0.03 + setpass * 0.12;
      stats = { P, vis: vis.length, culled: objs.length - vis.length, per, total, draws, setpass, cpu, srpOn, instOn };
      bR.set(String(total)); spR.set(String(setpass)); vR.set(`${vis.length} / ${objs.length}`);
    }

    stage.ui.group('Pipeline');
    stage.ui.select('Render Pipeline', [{ value: 'builtin', label: 'Built-in' }, { value: 'urp', label: 'URP (Universal)' }, { value: 'hdrp', label: 'HDRP (High Definition)' }], S.pipe, (v) => {
      S.pipe = v; const P = PIPES[v]; stage.log(`${P.name}: ${P.plat}. ${P.note}.`);
      if (v === 'builtin' && S.srp) stage.log('Built-in không hỗ trợ SRP Batcher: tùy chọn này bị bỏ qua.', 'warn');
    });
    stage.ui.slider('Số object', { min: 20, max: 300, step: 10, value: S.count }, (v) => { S.count = v; build(); });
    stage.ui.slider('Số material', { min: 1, max: 8, value: S.mats }, (v) => (S.mats = v));
    stage.ui.group('Batching');
    stage.ui.toggle('Static Batching', S.staticB, (v) => { S.staticB = v; stage.log(v ? 'Static Batching: object Static cùng material gộp thành một batch.' : 'Tắt Static Batching.'); });
    stage.ui.toggle('GPU Instancing', S.inst, (v) => {
      S.inst = v; if (!v) return stage.log('Tắt GPU Instancing.');
      stage.log(S.srp && S.pipe !== 'builtin' ? 'GPU Instancing bị bỏ qua: object tương thích SRP Batcher luôn ưu tiên SRP Batcher.' : 'GPU Instancing: object động cùng mesh + material vẽ chung một draw call.', S.srp && S.pipe !== 'builtin' ? 'warn' : 'info');
    });
    stage.ui.toggle('SRP Batcher', S.srp, (v) => {
      S.srp = v;
      if (v && S.pipe === 'builtin') return stage.log('SRP Batcher chỉ có trong URP/HDRP. Built-in bỏ qua.', 'warn');
      stage.log(v ? 'SRP Batcher: số draw call giữ nguyên nhưng mỗi call rẻ hơn, SetPass chỉ còn theo shader variant.' : 'Tắt SRP Batcher.');
    });
    const bR = stage.ui.readout('Batches', '—'), spR = stage.ui.readout('SetPass calls', '—'), vR = stage.ui.readout('Visible / tổng', '—');
    build(); compute();
    stage.log('Camera quay chậm: object ngoài frustum (xám) bị cull, không tốn draw call.');

    stage.onFrame((dt, t) => {
      camA = Math.sin(t * 0.35) * 0.5;
      timer += dt; if (timer > 0.8) { timer = 0; cur = (cur + 1) % STAGES.length; }
      compute(); render();
    });

    function render() {
      const { w, h } = stage, s = stats, P = s.P, wide = w >= 640;
      d.clear(w, h); d.grid(w, h);
      // pass chain
      const gap = wide ? 16 : 6, nw = (w - 32 - gap * 5) / 6, ny = 16, nh = 54;
      STAGES.forEach((name, i) => {
        const x = 16 + i * (nw + gap), on = i === cur;
        if (i) d.arrow(x - gap + 1, ny + nh / 2, x - 1, ny + nh / 2, { stroke: C.line, lw: 1.5, head: 5 });
        d.node(x, ny, nw, nh, null, { accent: on ? P.accent : C.line, fill: on ? C.paper : C.card, shadow: on ? 12 : 4 });
        d.text(wide ? name : SHORT[i], x + nw / 2, ny + 19, { align: 'center', font: 'cond', size: wide ? 14 : 12, weight: 700, color: C.navy });
        d.text(i === 0 ? `-${s.culled}` : `${s.per[i]} DC`, x + nw / 2, ny + 38, { align: 'center', font: 'mono', size: 11, color: on ? C.orange : C.muted });
      });
      // scene (top-down)
      const sx = 16, sy = ny + nh + 16, sw = wide ? w * 0.56 : w - 32, sh = h - sy - 16;
      d.node(sx, sy, sw, sh, null, { accent: C.line, fill: C.paper, shadow: 4 });
      const px = (o) => sx + 10 + o.x * (sw - 20), py = (o) => sy + 10 + o.y * (sh - 20) / 0.98;
      const cam = { x: px(CAM), y: py(CAM) }, L = FAR / Math.cos(HALF);
      const edge = (k) => { const a = camA + k * HALF; return [px({ x: CAM.x + Math.sin(a) * L }), py({ y: CAM.y - Math.cos(a) * L })]; };
      const ctx = d.ctx; ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
      d.poly([[cam.x, cam.y], edge(-1), edge(1)], { close: true, fill: 'rgba(26,163,161,0.08)', stroke: C.teal, lw: 1.5, dash: [5, 5] });
      const stg = STAGES[cur], sz = U.clamp(Math.min(sw, sh) / 34, 4, 9);
      objs.forEach((o) => {
        const x = px(o), y = py(o), col = MATC[mat(o)];
        if (!o.vis) return d.rect(x - sz / 2, y - sz / 2, sz, sz, { fill: C.lineSoft, r: 2 });
        const hl = (stg === 'Shadows' || stg === 'Opaque') ? !o.tr : stg === 'Transparent' ? o.tr : false;
        if (o.tr) d.circle(x, y, sz * 0.6, { fill: col + '88', stroke: hl ? C.navy : col, lw: hl ? 2 : 1 });
        else d.rect(x - sz / 2, y - sz / 2, sz, sz, { fill: stg === 'Shadows' ? C.navy2 : col, stroke: o.st ? C.navy : null, lw: hl ? 2 : 1.2, r: 2 });
      });
      ctx.restore(); d.circle(cam.x, cam.y, 7, { fill: C.navy, stroke: '#fff', lw: 2 });
      d.pill(`${stg}`, sx + 12, sy + 16, { fill: P.accent === C.faint ? C.navy2 : P.accent, size: 11 });
      // stats card
      if (!wide) { d.pill(`${P.name} · ${s.total} batches · ${s.setpass} SetPass`, sx + 12, sy + sh - 18, { fill: C.navy, size: 11 }); return; }
      const cx = sx + sw + 16, cw = w - cx - 16;
      d.node(cx, sy, cw, sh, null, { accent: P.accent });
      d.text(P.name, cx + 16, sy + 24, { font: 'cond', size: 22, weight: 700, color: C.navy });
      d.text(P.plat, cx + 16, sy + 46, { font: 'mono', size: 11, color: C.muted });
      const rows = [['Visible / culled', `${s.vis} / ${s.culled}`], ['Draw calls (thô)', s.draws], ['Batches', s.total], ['SetPass calls', s.setpass], ['Shadow cascades', P.cascades]];
      rows.forEach(([k, v], i) => {
        const y = sy + 76 + i * 22;
        d.text(k, cx + 16, y, { font: 'mono', size: 12, color: C.ink });
        d.text(v, cx + cw - 16, y, { align: 'right', font: 'mono', size: 13, weight: 700, color: k === 'Batches' ? C.orange : C.navy });
      });
      const by = sy + 76 + rows.length * 22 + 8, bw = cw - 32, frac = U.clamp(s.cpu / 16.6, 0, 1);
      d.text(`CPU render ≈ ${s.cpu.toFixed(1)} ms / 16.6 ms`, cx + 16, by, { font: 'mono', size: 11, color: C.muted });
      d.rect(cx + 16, by + 10, bw, 10, { fill: C.lineSoft, r: 5 });
      d.rect(cx + 16, by + 10, bw * frac, 10, { fill: frac > 0.7 ? C.red : frac > 0.4 ? C.yellow : C.green, r: 5 });
      const tags = [['Static', S.staticB], ['Instancing', s.instOn], ['SRP Batcher', s.srpOn]];
      let tx = cx + 16;
      if (by + 44 < sy + sh) tags.forEach(([n, on]) => { tx += d.pill(n, tx, by + 40, { fill: on ? C.green : C.lineSoft, color: on ? '#fff' : C.muted, size: 11 }) + 6; });
      P.note.split(' · ').forEach((ln, i) => { if (by + 66 + i * 16 < sy + sh - 74) d.text('• ' + ln, cx + 16, by + 66 + i * 16, { font: 'mono', size: 11, color: C.muted }); });
      const ky = sy + sh - 44; let kx = cx + 16; // batches per pass, stacked
      if (ky > by + 80) {
        d.text('Batches theo pass', cx + 16, ky - 10, { font: 'mono', size: 11, color: C.muted });
        s.per.forEach((v, i) => { const sw2 = (bw * v) / Math.max(1, s.total); if (sw2 > 0.5) d.rect(kx, ky, sw2, 14, { fill: PASSC[i], r: 3 }); kx += sw2; });
        let lx = cx + 16;
        SHORT.forEach((n, i) => { if (!i || lx + 22 + d.measure(n, { font: 'mono', size: 11 }) > cx + cw - 4) return; d.rect(lx, ky + 22, 8, 8, { fill: PASSC[i], r: 2 }); d.text(n, lx + 12, ky + 26, { font: 'mono', size: 11, color: C.ink }); lx += 22 + d.measure(n, { font: 'mono', size: 11 }); });
      }
    }
  },
});
