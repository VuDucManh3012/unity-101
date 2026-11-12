/* Lesson: Shaders & Shader Graph — per-pixel playground + mini node graph with live node previews. */
U101.defineLesson('shaders', {
  lead: 'Shader là chương trình chạy trên GPU: vertex shader đặt từng đỉnh lên màn hình, fragment shader tô màu từng pixel. Shader Graph cho bạn ghép các node thay vì viết HLSL.',
  hint: 'Chọn hiệu ứng trong Inspector · kéo Threshold / Scale / Power · rê chuột lên preview để đọc UV và giá trị từng pixel',
  overview: `
    <p>Mỗi frame, GPU chạy shader theo hai giai đoạn chính:</p>
    <ul>
      <li><b>Vertex shader</b>: chạy một lần cho mỗi đỉnh của mesh. Biến đổi vị trí từ object space sang clip space, truyền UV, normal xuống dưới.</li>
      <li><b>Rasterizer</b>: phần cứng nội suy dữ liệu giữa các đỉnh cho từng pixel mà tam giác phủ lên.</li>
      <li><b>Fragment (pixel) shader</b>: chạy một lần cho <b>mỗi pixel</b>, trả về màu. Quad trong mô phỏng chỉ có 4 đỉnh nhưng hàng nghìn pixel, nên mọi phép tính trong fragment đều phải rẻ.</li>
    </ul>
    <p><b>Shader Graph</b> (URP/HDRP) là trình soạn shader dạng node: <code>UV</code> → <code>Simple Noise</code> → <code>Step</code> → <code>Alpha Clip Threshold</code>. Unity sinh HLSL từ đồ thị. Mỗi node có ô preview giống các ô nhỏ trong mô phỏng.</p>
    <p class="callout"><code>_Time</code> là biến built-in (giây kể từ khi chạy). Cộng nó vào UV là cách đơn giản nhất để làm nước chảy, dung nham, băng chuyền mà không cần script.</p>`,
  keyPoints: [
    'Vertex shader: mỗi đỉnh một lần. Fragment shader: mỗi pixel một lần, đây là phần đắt.',
    'UV (0..1) là tọa độ trên bề mặt; hầu hết hiệu ứng bắt đầu từ UV.',
    'Dissolve = Noise + Step + clip(): pixel có noise < Threshold bị bỏ đi.',
    'Đặt thuộc tính trong CBUFFER UnityPerMaterial để tương thích SRP Batcher.',
  ],
  code: [
    {
      title: 'URPDissolve.shader',
      source: `
Shader "Custom/URPDissolve"
{
    Properties
    {
        _BaseMap ("Base Map", 2D) = "white" {}
        _NoiseMap ("Noise", 2D) = "gray" {}
        _Threshold ("Threshold", Range(0, 1)) = 0.4
        _EdgeWidth ("Edge Width", Range(0, 0.2)) = 0.05
        [HDR] _EdgeColor ("Edge Color", Color) = (4, 1.5, 0.3, 1)
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="AlphaTest" "RenderType"="TransparentCutout" }
        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings   { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; };

            TEXTURE2D(_BaseMap);  SAMPLER(sampler_BaseMap);
            TEXTURE2D(_NoiseMap); SAMPLER(sampler_NoiseMap);
            CBUFFER_START(UnityPerMaterial)          // SRP Batcher compatible
                float4 _BaseMap_ST; float _Threshold; float _EdgeWidth; half4 _EdgeColor;
            CBUFFER_END

            Varyings vert (Attributes IN)            // chạy cho mỗi ĐỈNH
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target     // chạy cho mỗi PIXEL
            {
                half n = SAMPLE_TEXTURE2D(_NoiseMap, sampler_NoiseMap, IN.uv).r;
                clip(n - _Threshold);                // n < Threshold → bỏ pixel
                half4 col = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv);
                half edge = 1 - step(_Threshold + _EdgeWidth, n);
                col.rgb = lerp(col.rgb, _EdgeColor.rgb, edge); // viền phát sáng
                return col;
            }
            ENDHLSL
        }
    }
}`,
      note: 'Shader Graph tương đương: Sample Texture 2D (Noise) → Alpha, Threshold → Alpha Clip Threshold, Step + Lerp cho viền → Emission.',
    },
    {
      title: 'DissolveController.cs',
      source: `
using UnityEngine;

public class DissolveController : MonoBehaviour
{
    static readonly int ThresholdId = Shader.PropertyToID("_Threshold");
    [SerializeField] private float duration = 1.5f;
    private Material mat;
    private float t;

    void Awake() { mat = GetComponent<Renderer>().material; } // bản sao riêng
    void Update()
    {
        t += Time.deltaTime / duration;
        mat.SetFloat(ThresholdId, Mathf.Clamp01(t)); // 0 → 1: tan biến dần
        if (t >= 1f) Destroy(gameObject);
    }
}`,
      note: 'Cache ID bằng Shader.PropertyToID thay vì truyền string mỗi frame. Lưu ý: MaterialPropertyBlock làm object mất tương thích SRP Batcher.',
    },
  ],
  tryIt: [
    'Chọn Dissolve, kéo Threshold từ 0 lên 1 và quan sát viền cam bám theo ranh giới noise.',
    'Chọn Noise và tăng Scale: UV được nhân lên nên noise "dày" hơn.',
    'Chọn Fresnel, tăng Power: viền sáng mỏng lại, chỉ còn ở rìa nơi N vuông góc với hướng nhìn.',
    'Chọn Scroll và bật Animate: UV cộng _Time × Speed làm dung nham chảy.',
    'Rê chuột lên preview: đọc UV và giá trị fragment tại pixel đó.',
  ],
  links: [
    { label: 'Shader Graph manual', url: 'https://docs.unity3d.com/Packages/com.unity.shadergraph@latest' },
    { label: 'Writing shaders for URP', url: 'https://docs.unity3d.com/Manual/urp/writing-custom-shaders-urp.html' },
    { label: 'Built-in shader variables (_Time)', url: 'https://docs.unity3d.com/Manual/SL-UnityShaderVariables.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U, ctx } = stage;
    const BW = 120, BH = 120, TS = 28;
    const mk = (n) => { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); return { c, x, img: x.createImageData(n, n) }; };
    const main = mk(BW), thumb = mk(TS);
    const P = { effect: 'dissolve', threshold: 0.45, scale: 6, power: 2.5, speed: 0.25, animate: true, time: 0 };
    let hover = null;

    const fract = (x) => x - Math.floor(x);
    const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
    function vnoise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const a = U.lerp(hash(ix, iy), hash(ix + 1, iy), fx), b = U.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), fx);
      return U.lerp(a, b, fy);
    }
    const noise = (u, v) => (vnoise(u * P.scale, v * P.scale) * 0.57 + vnoise(u * P.scale * 2, v * P.scale * 2) * 0.29 + vnoise(u * P.scale * 4, v * P.scale * 4) * 0.14);
    const g = (k) => [k, k, k];
    const mix = (a, b, t) => [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t)];
    const TEAL = [0.1, 0.64, 0.63], ORANGE = [0.95, 0.5, 0.18], NAVY = [0.09, 0.13, 0.24], GLOW = [1, 0.62, 0.2];
    const brick = (u, v) => mix([0.12, 0.42, 0.5], TEAL, v * 0.7 + 0.3 * u);
    const sph = (u, v) => { const x = u * 2 - 1, y = v * 2 - 1, r2 = x * x + y * y; return r2 > 1 ? null : Math.sqrt(1 - r2); }; // N.z = N·V
    const scrollN = (u, v) => noise(u + P.time * P.speed, v + P.time * P.speed * 0.4);

    // Each effect = a chain of nodes; every node is a per-pixel function (u, v) → [r, g, b, a?].
    const FX = {
      gradient: [{ n: 'UV', f: (u, v) => [u, v, 0] }, { n: 'Split · R', f: (u) => g(u) }, { n: 'Lerp(A, B)', f: (u) => mix(NAVY, ORANGE, u) }, { n: 'Base Color', f: (u, v) => mix(mix(NAVY, ORANGE, u), TEAL, v * 0.35) }],
      noise: [{ n: 'UV', f: (u, v) => [u, v, 0] }, { n: 'Tiling ×Scale', f: (u, v) => [fract(u * P.scale), fract(v * P.scale), 0] }, { n: 'Simple Noise', f: (u, v) => g(noise(u, v)) }, { n: 'Base Color', f: (u, v) => mix(NAVY, TEAL, noise(u, v)) }],
      step: [{ n: 'UV', f: (u, v) => [u, v, 0] }, { n: 'Simple Noise', f: (u, v) => g(noise(u, v)) }, { n: 'Step(Thr)', f: (u, v) => g(noise(u, v) >= P.threshold ? 1 : 0) }, { n: 'Base Color', f: (u, v) => (noise(u, v) >= P.threshold ? TEAL : NAVY) }],
      dissolve: [{ n: 'Simple Noise', f: (u, v) => g(noise(u, v)) }, { n: 'Step(Thr)', f: (u, v) => g(noise(u, v) >= P.threshold ? 1 : 0) }, { n: 'Edge Glow', f: (u, v) => { const n = noise(u, v); return n >= P.threshold && n < P.threshold + 0.05 ? GLOW : NAVY; } },
        { n: 'Alpha Clip', f: (u, v) => { const n = noise(u, v); if (n < P.threshold) return [0, 0, 0, 0]; return n < P.threshold + 0.05 ? GLOW : brick(u, v); } }],
      fresnel: [{ n: 'Normal · View', f: (u, v) => { const z = sph(u, v); return z === null ? NAVY : g(z); } }, { n: 'One Minus', f: (u, v) => { const z = sph(u, v); return z === null ? NAVY : g(1 - z); } },
        { n: 'Power(P)', f: (u, v) => { const z = sph(u, v); return z === null ? NAVY : g(Math.pow(1 - z, P.power)); } }, { n: '× Rim + Base', f: (u, v) => { const z = sph(u, v); if (z === null) return [0, 0, 0, 0]; return mix(mix(NAVY, TEAL, 0.45 * z), GLOW, Math.pow(1 - z, P.power)); } }],
      scroll: [{ n: 'UV', f: (u, v) => [u, v, 0] }, { n: '+ _Time×Speed', f: (u, v) => [fract(u + P.time * P.speed), fract(v + P.time * P.speed * 0.4), 0] }, { n: 'Simple Noise', f: (u, v) => g(scrollN(u, v)) },
        { n: 'Color Ramp', f: (u, v) => { const n = scrollN(u, v); return n < 0.5 ? mix([0.25, 0.05, 0.05], [0.85, 0.2, 0.08], n * 2) : mix([0.85, 0.2, 0.08], [1, 0.85, 0.3], (n - 0.5) * 2); } }],
    };

    function paint(buf, n, f) {
      const data = buf.img.data;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, v = 1 - (j + 0.5) / n, c = f(u, v), a = c[3] ?? 1, o = (j * n + i) * 4;
        const bg = (Math.floor(i / (n / 8)) + Math.floor(j / (n / 8))) % 2 ? 0.95 : 0.87; // transparency checker
        for (let k = 0; k < 3; k++) data[o + k] = U.clamp(U.lerp(bg, c[k], a), 0, 1) * 255;
        data[o + 3] = 255;
      }
      buf.x.putImageData(buf.img, 0, 0);
    }

    stage.ui.group('Shader');
    stage.ui.select('Hiệu ứng', [{ value: 'gradient', label: 'UV → Gradient' }, { value: 'noise', label: 'Noise' }, { value: 'step', label: 'Noise → Step' }, { value: 'dissolve', label: 'Dissolve' }, { value: 'fresnel', label: 'Fresnel (rim)' }, { value: 'scroll', label: 'Scroll by _Time' }], P.effect, (v) => {
      P.effect = v; stage.log(`Graph: ${FX[v].map((x) => x.n).join(' → ')}`);
    });
    const thrUI = stage.ui.slider('Threshold', { min: 0, max: 1, step: 0.01, value: P.threshold }, (v) => { P.threshold = v; P.animate = false; animUI.set(false); });
    stage.ui.slider('Noise Scale', { min: 2, max: 16, step: 0.5, value: P.scale }, (v) => (P.scale = v));
    stage.ui.slider('Fresnel Power', { min: 0.5, max: 8, step: 0.1, value: P.power }, (v) => (P.power = v));
    stage.ui.slider('Scroll Speed', { min: 0, max: 1, step: 0.05, value: P.speed }, (v) => (P.speed = v));
    const animUI = stage.ui.toggle('Animate (_Time)', P.animate, (v) => (P.animate = v));
    stage.ui.readout('Fragment / frame', `${BW * BH} (preview) · ~2.07M @1080p`);
    const probeUI = stage.ui.readout('Pixel', 'rê chuột lên preview');
    stage.log('Fragment shader chạy cho từng pixel; quad chỉ có 4 đỉnh cho vertex shader.');
    stage.log(`Graph: ${FX[P.effect].map((x) => x.n).join(' → ')}`);

    let box = { x: 0, y: 0, s: 1 };
    stage.onPointer('move', (x, y) => {
      if (x < box.x || y < box.y || x > box.x + box.s || y > box.y + box.s) { hover = null; return; }
      hover = { u: (x - box.x) / box.s, v: 1 - (y - box.y) / box.s };
      const c = FX[P.effect].at(-1).f(hover.u, hover.v);
      probeUI.set(`uv(${hover.u.toFixed(2)}, ${hover.v.toFixed(2)}) → rgb(${c.slice(0, 3).map((k) => k.toFixed(2)).join(', ')})${c[3] === 0 ? ' · clipped' : ''}`);
    });

    stage.onFrame((dt) => {
      if (P.animate) {
        P.time += dt;
        if (P.effect === 'dissolve' || P.effect === 'step') { P.threshold = 0.5 + 0.42 * Math.sin(P.time * 0.9); thrUI.set(+P.threshold.toFixed(2)); }
      }
      render();
    });

    function render() {
      const { w, h } = stage, chain = FX[P.effect], wide = w >= 620;
      d.clear(w, h); d.grid(w, h);
      const s = Math.floor(wide ? Math.min(h - 70, w * 0.44) : Math.min(w - 40, h - 200));
      box = { x: 20, y: 46, s };
      d.text('Fragment output', 20, 24, { font: 'cond', size: 15, weight: 700, color: C.navy });
      if (s >= 180) d.text(`${BW}×${BH} px`, 20 + s, 24, { align: 'right', font: 'mono', size: 11, color: C.muted });
      paint(main, BW, chain.at(-1).f);
      d.rect(box.x - 4, box.y - 4, s + 8, s + 8, { fill: C.card, stroke: C.line, lw: 2, r: 10, shadow: 8 });
      ctx.drawImage(main.c, box.x, box.y, s, s);
      // the 4 quad vertices the vertex shader sees
      [[0, 0], [1, 0], [1, 1], [0, 1]].forEach(([a, b], k) => {
        d.circle(box.x + a * s, box.y + b * s, 5, { fill: C.navy, stroke: '#fff', lw: 2 });
        if (wide) d.text(`v${k}`, box.x + a * s + (a ? 8 : -8), box.y + b * s + (b ? 10 : -10), { align: a ? 'left' : 'right', font: 'mono', size: 11, color: C.navy });
      });
      d.text(`4 vertex · ${BW * BH} fragment`, 20, box.y + s + 18, { font: 'mono', size: 11, color: C.muted });
      if (hover) {
        const hx = box.x + hover.u * s, hy = box.y + (1 - hover.v) * s;
        d.circle(hx, hy, 6, { stroke: '#fff', lw: 3 }); d.circle(hx, hy, 6, { stroke: C.navy, lw: 1.5 });
      }
      // mini Shader Graph
      const gx = wide ? box.x + s + 30 : 20, gy = wide ? 0 : box.y + s + 26, gh = h - gy, gw = w - gx - 16, n = chain.length, G = wide ? 26 : 12, cols = wide ? U.clamp(Math.floor((gw + G) / 116), 1, n) : n, rows = Math.ceil(n / cols);
      const nw = Math.min(150, (gw - G * (cols - 1)) / cols), nh = wide ? Math.min(nw * 0.75 + 32, (gh - 96 - 24 * (rows - 1)) / rows) : Math.min(nw + 30, gh - 50);
      const top = wide ? Math.max(42, (gh - rows * nh - (rows - 1) * 24) / 2 - 10) : gy + 40;
      const pos = chain.map((_, i) => ({ x: gx + (i % cols) * (nw + G), y: top + Math.floor(i / cols) * (nh + 24) }));
      d.text('Shader Graph', gx, gy + 24, { font: 'cond', size: 15, weight: 700, color: C.navy });
      chain.forEach((nd, i) => {
        const p = pos[i], last = i === n - 1;
        if (i > 0) {
          const q = pos[i - 1];
          const qy = q.y + nh / 2, py = p.y + nh / 2, my = q.y + nh + 12;
          if (q.y === p.y) { ctx.beginPath(); ctx.moveTo(q.x + nw, qy); ctx.bezierCurveTo(q.x + nw + G / 2, qy, p.x - G / 2, py, p.x, py); ctx.strokeStyle = C.teal; ctx.lineWidth = 2.5; ctx.stroke(); }
          else d.poly([[q.x + nw, qy], [q.x + nw + 12, qy], [q.x + nw + 12, my], [p.x - 12, my], [p.x - 12, py], [p.x, py]], { stroke: C.teal, lw: 2.5 });
        }
        d.node(p.x, p.y, nw, nh, null, { accent: last ? C.orange : C.line });
        d.rect(p.x, p.y, nw, 22, { fill: last ? C.orange : C.navy2, r: 9 });
        ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y, nw - 4, 22); ctx.clip();
        d.text(nd.n, p.x + 8, p.y + 11, { font: 'mono', size: 11, weight: 600, color: '#fff' }); ctx.restore();
        const ts = Math.min(nw - 16, nh - 32);
        paint(thumb, TS, nd.f); ctx.drawImage(thumb.c, p.x + (nw - ts) / 2, p.y + 26, ts, ts);
        d.circle(p.x, p.y + nh / 2, 4, { fill: C.teal }); d.circle(p.x + nw, p.y + nh / 2, 4, { fill: C.teal });
      });
      const par = { dissolve: `Threshold = ${P.threshold.toFixed(2)}`, step: `Threshold = ${P.threshold.toFixed(2)}`, fresnel: `Power = ${P.power.toFixed(1)}`, scroll: `_Time = ${P.time.toFixed(1)}s`, noise: `Scale = ${P.scale}`, gradient: 'lerp(A, B, uv.x)' }[P.effect];
      if (wide) d.pill(par, gx, h - 24, { fill: C.navy, size: 11 });
      if (wide) d.text('Mỗi ô nhỏ = preview đầu ra của node, như trong Shader Graph', gx, top + rows * (nh + 24) + 6, { font: 'mono', size: 11, color: C.muted });
    }
  },
});
