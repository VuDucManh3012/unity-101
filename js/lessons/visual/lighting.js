/* Lesson: Lighting & normals — per-pixel Lambert (N·L) on a sphere + ground, draggable light, shadow ray test. */
U101.defineLesson('lighting', {
  lead: 'Độ sáng của một điểm trên bề mặt phụ thuộc góc giữa pháp tuyến N và hướng tới đèn L. Đó là định luật Lambert: diffuse = max(0, N·L) × màu đèn × cường độ.',
  hint: 'Kéo bóng đèn để di chuyển · rê chuột lên quả cầu để xem N, L và N·L · đổi loại đèn trong Inspector',
  overview: `
    <p>Mỗi đỉnh của mesh mang một <b>normal</b> (vector pháp tuyến, dài 1). Shader nội suy normal cho từng pixel, rồi tính tích vô hướng với hướng ánh sáng <code>L</code>.</p>
    <ul>
      <li><b>N·L = 1</b>: bề mặt nhìn thẳng vào đèn, sáng nhất. <b>N·L ≤ 0</b>: quay lưng với đèn, chỉ còn <b>ambient</b>.</li>
      <li><b>Directional Light</b> (mặt trời): cùng một hướng L cho mọi pixel, không có suy giảm theo khoảng cách.</li>
      <li><b>Point Light</b>: L đổi theo từng pixel, cường độ giảm dần và về 0 ở <code>Range</code>.</li>
      <li><b>Spot Light</b>: giống Point nhưng chỉ chiếu trong một hình nón (<code>Spot Angle</code>).</li>
      <li><b>Shadow</b>: kiểm tra xem tia từ điểm tới đèn có bị vật khác chắn không (Unity dùng shadow map thay vì tia, nhưng ý tưởng giống nhau).</li>
    </ul>
    <p class="callout"><b>Realtime vs Baked</b>: đèn Realtime tính lại mỗi frame, đắt nhưng di chuyển được. Đèn <b>Baked</b> được tính trước vào <b>Lightmap</b> (texture), gần như miễn phí lúc chạy nhưng không đổi được. <b>Mixed</b> kết hợp cả hai. Light Probe mang ánh sáng baked sang object động.</p>`,
  keyPoints: [
    'Diffuse Lambert = max(0, N·L): normal sai thì ánh sáng sai, dù đèn đúng.',
    'Directional: chỉ có hướng. Point/Spot: có vị trí, Range và suy giảm theo khoảng cách.',
    'Ambient giữ cho mặt tối không đen kịt; bóng đổ là phần bị che khỏi tia sáng.',
    'Baked lighting rẻ lúc runtime nhưng tĩnh; Realtime linh hoạt nhưng tốn GPU.',
  ],
  code: [
    {
      title: 'LambertLighting.hlsl',
      source: `
// Fragment shader (URP) — diffuse Lambert với main light
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

half4 frag (Varyings i) : SV_Target
{
    float3 N = normalize(i.normalWS);            // normal nội suy từ đỉnh
    Light light = GetMainLight(TransformWorldToShadowCoord(i.positionWS));
    float NdotL = saturate(dot(N, light.direction));
    half3 diffuse = _BaseColor.rgb * light.color * NdotL
                  * light.shadowAttenuation;      // 0 = trong bóng
    half3 ambient = _BaseColor.rgb * SampleSH(N);  // ambient / light probe
    return half4(diffuse + ambient, 1);
}`,
      note: 'saturate(dot(N, L)) chính là max(0, N·L) bị kẹp về [0,1]. shadowAttenuation đến từ shadow map.',
    },
    {
      title: 'FlickerLight.cs',
      source: `
using UnityEngine;

[RequireComponent(typeof(Light))]
public class FlickerLight : MonoBehaviour
{
    [SerializeField] private float baseIntensity = 2f;
    [SerializeField] private float flicker = 0.4f;
    private Light lamp;

    void Awake() { lamp = GetComponent<Light>(); } // Light phải là Realtime/Mixed
    void Update()
    {
        float n = Mathf.PerlinNoise(Time.time * 8f, 0f);
        lamp.intensity = baseIntensity + (n - 0.5f) * flicker;
        lamp.range = 6f;                       // chỉ có nghĩa với Point/Spot
    }
}`,
      note: 'Đổi intensity lúc runtime chỉ có tác dụng với đèn Realtime hoặc Mixed. Đèn Baked đã "đóng băng" trong lightmap.',
    },
  ],
  tryIt: [
    'Rê chuột quanh viền quả cầu: N·L giảm dần về 0 ở đường ranh sáng–tối (terminator).',
    'Chọn Directional rồi kéo đèn: vùng sáng đổi hướng nhưng nền đất sáng đều.',
    'Chọn Point, giảm Range: nền đất chỉ sáng một vùng tròn quanh đèn.',
    'Chọn Spot và thu nhỏ Spot Angle: chỉ phần trong nón được chiếu.',
    'Kéo Ambient về 0 và tắt Shadows: mặt tối đen hoàn toàn, bóng đổ biến mất.',
  ],
  links: [
    { label: 'Lighting overview', url: 'https://docs.unity3d.com/Manual/LightingOverview.html' },
    { label: 'Light types', url: 'https://docs.unity3d.com/Manual/Lighting.html' },
    { label: 'Lightmapping', url: 'https://docs.unity3d.com/Manual/Lightmappers.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U, ctx } = stage;
    const BW = 160, BH = 100;
    const off = document.createElement('canvas'); off.width = BW; off.height = BH;
    const octx = off.getContext('2d'), img = octx.createImageData(BW, BH);
    const S = { type: 'point', intensity: 1.4, range: 5, height: 2.6, ambient: 0.4, spot: 40, shadows: true, normals: false, orbit: true };
    const light = { x: 0, y: 0 }, probe = { x: 0, y: 0, set: false };
    let dragging = false, t0 = 0;
    const ALB_S = [26, 163, 161], ALB_G = [239, 227, 209], LC = [255, 240, 214];

    const geo = () => { const R = Math.min(stage.w, stage.h) * 0.2; return { cx: stage.w * 0.5, cy: stage.h * 0.52, R }; };
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    // Returns { L, atten } for a surface point P (world px, z = up from ground).
    function lightAt(P, g) {
      const Lp = [light.x, light.y, S.height * g.R];
      if (S.type === 'directional') return { L: norm([light.x - g.cx, light.y - g.cy, S.height * g.R]), atten: 1, dist: Infinity };
      const v = [Lp[0] - P[0], Lp[1] - P[1], Lp[2] - P[2]], dist = Math.hypot(v[0], v[1], v[2]), L = norm(v);
      let atten = U.clamp(1 - (dist / (S.range * g.R)) ** 2, 0, 1) ** 2;
      if (S.type === 'spot') {
        const dir = norm([g.cx - Lp[0], g.cy - Lp[1], g.R - Lp[2]]), c = -dot(L, dir);
        const outer = Math.cos((S.spot / 2) * Math.PI / 180), inner = Math.cos((S.spot / 2) * 0.75 * Math.PI / 180);
        atten *= U.clamp((c - outer) / (inner - outer), 0, 1);
      }
      return { L, atten, dist };
    }
    function shade(P, N, g) {
      const { L, atten, dist } = lightAt(P, g);
      const ndl = Math.max(0, dot(N, L));
      let vis = 1;
      if (S.shadows && P[2] < 0.5) { // ground point: does the ray to the light hit the sphere?
        const oc = [P[0] - g.cx, P[1] - g.cy, P[2] - g.R], b = dot(oc, L), c = dot(oc, oc) - g.R * g.R, disc = b * b - c;
        if (b < 0 && disc > 0 && -b - Math.sqrt(disc) < dist) vis = 0.08;
      }
      return { ndl, k: ndl * atten * S.intensity * vis, atten };
    }

    function renderBuffer(g) {
      const { w, h } = stage, data = img.data;
      for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
        const x = (i + 0.5) / BW * w, y = (j + 0.5) / BH * h, dx = x - g.cx, dy = y - g.cy, r2 = dx * dx + dy * dy;
        let P, N, alb;
        if (r2 < g.R * g.R) { const z = Math.sqrt(g.R * g.R - r2); P = [x, y, g.R + z]; N = [dx / g.R, dy / g.R, z / g.R]; alb = ALB_S; }
        else { P = [x, y, 0]; N = [0, 0, 1]; alb = ALB_G; }
        const k = shade(P, N, g).k, o = (j * BW + i) * 4;
        for (let c = 0; c < 3; c++) data[o + c] = Math.min(255, alb[c] * (S.ambient + k * LC[c] / 255));
        data[o + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
    }

    stage.ui.group('Light');
    stage.ui.select('Type', [{ value: 'directional', label: 'Directional' }, { value: 'point', label: 'Point' }, { value: 'spot', label: 'Spot' }], S.type, (v) => {
      S.type = v;
      stage.log({ directional: 'Directional: một hướng L chung cho mọi pixel, không có Range.', point: 'Point: L tính riêng từng pixel, cường độ về 0 tại Range.', spot: 'Spot: như Point nhưng bị giới hạn trong nón Spot Angle.' }[v]);
    });
    stage.ui.slider('Intensity', { min: 0, max: 3, step: 0.1, value: S.intensity }, (v) => (S.intensity = v));
    stage.ui.slider('Range', { min: 1.5, max: 10, step: 0.5, value: S.range, unit: ' ×R' }, (v) => (S.range = v));
    stage.ui.slider('Spot Angle', { min: 10, max: 120, value: S.spot, unit: '°' }, (v) => (S.spot = v));
    stage.ui.slider('Độ cao đèn', { min: 0.5, max: 5, step: 0.1, value: S.height, unit: ' ×R' }, (v) => (S.height = v));
    stage.ui.group('Môi trường');
    stage.ui.slider('Ambient', { min: 0, max: 0.6, step: 0.02, value: S.ambient }, (v) => (S.ambient = v));
    stage.ui.toggle('Shadows', S.shadows, (v) => { S.shadows = v; stage.log(v ? 'Bật shadow: điểm trên nền bị quả cầu che khỏi đèn sẽ tối.' : 'Tắt shadow: ánh sáng xuyên qua vật thể.', v ? 'info' : 'warn'); });
    stage.ui.toggle('Hiện normal', S.normals, (v) => (S.normals = v));
    stage.ui.toggle('Đèn tự quay', S.orbit, (v) => (S.orbit = v));
    const ndlOut = stage.ui.readout('N·L tại điểm dò', '—');

    stage.onPointer('down', (x, y) => {
      if (U.dist(x, y, light.x, light.y) < 28) { dragging = true; S.orbit = false; stage.log('Đang kéo đèn — Lambert tính lại cho mọi pixel.'); }
    });
    stage.onPointer('move', (x, y) => {
      if (dragging) { light.x = U.clamp(x, 10, stage.w - 10); light.y = U.clamp(y, 10, stage.h - 10); return; }
      const g = geo(); if (U.dist(x, y, g.cx, g.cy) < g.R) Object.assign(probe, { x, y, set: true });
    });
    stage.onPointer('up', () => (dragging = false));
    stage.log('Lambert: diffuse = max(0, N·L). Kéo đèn để thấy vùng sáng đổi theo hướng tới đèn.');

    stage.onFrame((dt) => {
      const g = geo();
      if (S.orbit) { t0 += dt * 0.6; light.x = g.cx + Math.cos(t0 - 2.3) * g.R * 1.9; light.y = g.cy + Math.sin(t0 - 2.3) * g.R * 1.3; }
      if (!probe.set) { probe.x = g.cx - g.R * 0.35; probe.y = g.cy - g.R * 0.3; }
      render(g);
    });

    function arrow3(x, y, v, len, col) { d.arrow(x, y, x + v[0] * len, y + v[1] * len, { stroke: 'rgba(255,250,241,0.85)', lw: 5, head: 12 }); d.arrow(x, y, x + v[0] * len, y + v[1] * len, { stroke: col, lw: 2.5 }); }
    function render(g) {
      const { w, h } = stage;
      if (light.x === 0 && light.y === 0) { light.x = g.cx - g.R * 1.3; light.y = g.cy - g.R * 1.1; }
      renderBuffer(g);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h);
      d.circle(g.cx, g.cy, g.R, { stroke: 'rgba(24,33,61,0.25)', lw: 1.5 });
      // light gizmos
      if (S.type === 'point') { const gr = g.R * Math.sqrt(Math.max(0, S.range ** 2 - S.height ** 2)); d.circle(light.x, light.y, gr, { stroke: C.yellow, lw: 1.5, dash: [6, 6] }); }
      if (S.type === 'spot') {
        const a = Math.atan2(g.cy - light.y, g.cx - light.x), half = (S.spot / 2) * Math.PI / 180, L = Math.hypot(g.cx - light.x, g.cy - light.y) + g.R * 1.4;
        [-half, half].forEach((s) => d.line(light.x, light.y, light.x + Math.cos(a + s) * L, light.y + Math.sin(a + s) * L, { stroke: C.yellow, lw: 1.5, dash: [6, 6] }));
      }
      if (S.type === 'directional') {
        const L = norm([light.x - g.cx, light.y - g.cy, 0]);
        for (let k = -1; k <= 1; k++) { const ox = -L[1] * k * 26, oy = L[0] * k * 26; d.arrow(light.x + ox, light.y + oy, light.x + ox - L[0] * 46, light.y + oy - L[1] * 46, { stroke: C.yellow, lw: 2 }); }
      }
      d.circle(light.x, light.y, 15, { fill: '#fff4dc', stroke: C.orange, lw: 2.5, shadow: 10 });
      d.text(S.type === 'directional' ? '☀' : '●', light.x, light.y + 1, { align: 'center', size: 13, color: C.orange, weight: 700 });
      // normals on the sphere
      if (S.normals) for (let a = 0; a < 12; a++) for (const rr of [0.45, 0.85]) {
        const px = g.cx + Math.cos(a * Math.PI / 6) * g.R * rr, py = g.cy + Math.sin(a * Math.PI / 6) * g.R * rr;
        arrow3(px, py, [(px - g.cx) / g.R, (py - g.cy) / g.R], 22, C.navy);
      }
      // probe: N, L and N·L
      const dx = probe.x - g.cx, dy = probe.y - g.cy, z = Math.sqrt(Math.max(0, g.R * g.R - dx * dx - dy * dy));
      const N = [dx / g.R, dy / g.R, z / g.R], P = [probe.x, probe.y, g.R + z], s = shade(P, N, g), L = lightAt(P, g).L;
      arrow3(probe.x, probe.y, L, 80, C.orange); arrow3(probe.x, probe.y, N, 80, C.navy);
      d.circle(probe.x, probe.y, 5, { fill: '#fff', stroke: C.navy, lw: 2 });
      ndlOut.set(`${s.ndl.toFixed(2)} · atten ${s.atten.toFixed(2)}`);
      // info card
      const cw = Math.min(230, w - 32);
      d.node(16, 14, cw, 64, null, { accent: s.ndl > 0 ? C.orange : C.line });
      d.text(`N·L = ${s.ndl.toFixed(2)}`, 30, 34, { font: 'mono', size: 15, weight: 700, color: C.navy });
      d.text(`diffuse = ${(s.k).toFixed(2)} + ambient ${S.ambient.toFixed(2)}`, 30, 58, { font: 'mono', size: 11, color: C.muted });
      d.rect(cw - 46, 26, 36, 8, { fill: C.lineSoft, r: 4 }); d.rect(cw - 46, 26, 36 * U.clamp(s.ndl, 0, 1), 8, { fill: C.orange, r: 4 });
      d.rect(12, h - 36, 236, 28, { fill: 'rgba(255,250,241,0.88)', r: 8 });
      d.pill('N', 26, h - 22, { fill: C.navy, size: 11 }); d.text('normal', 52, h - 22, { font: 'mono', size: 11, color: C.navy });
      d.pill('L', 112, h - 22, { fill: C.orange, size: 11 }); d.text('hướng tới đèn', 137, h - 22, { font: 'mono', size: 11, color: C.navy });
      if (w >= 480) { const pw = d.measure(`${S.type} light · realtime`, { size: 11, font: 'mono' }) + 16; d.pill(`${S.type} light · realtime`, w - 16 - pw, h - 22, { fill: C.navy2, size: 11 }); }
    }
  },
});
