/* Lesson: RectTransform anchors & pivot — a resizable screen whose UI re-layouts per anchor preset + Canvas Scaler. */
U101.defineLesson('ui-rect-anchors', {
  lead: 'Mọi phần tử Unity UI (uGUI) dùng RectTransform: anchor quyết định phần tử bám vào đâu trên parent, pivot là điểm gốc để đặt vị trí, scale và xoay. Canvas Scaler giúp UI giữ tỉ lệ trên nhiều độ phân giải.',
  hint: 'Kéo chấm ở góc phải-dưới màn hình để đổi kích thước · bấm một phần tử để chọn rồi đổi Anchor preset',
  overview: `
    <p>Màn hình điện thoại có đủ loại tỉ lệ: 16:9, 20:9, 4:3, dọc hoặc ngang. Nếu chỉ đặt UI theo tọa độ cố định, nút Pause sẽ trôi khỏi góc hoặc tràn ra ngoài. <b>RectTransform</b> giải quyết bằng anchor.</p>
    <ul>
      <li><b>Anchor (anchorMin / anchorMax)</b>: hai điểm tính theo tỉ lệ 0–1 của parent. Nếu hai điểm trùng nhau, phần tử giữ nguyên kích thước và bám vào điểm đó. Nếu tách ra (<i>stretch</i>), phần tử co giãn theo parent.</li>
      <li><b>anchoredPosition</b>: khoảng cách từ điểm anchor tới <b>pivot</b>. <b>sizeDelta</b>: phần kích thước cộng thêm vào khoảng giữa hai anchor.</li>
      <li><b>Pivot</b>: điểm gốc của phần tử. Scale và rotation diễn ra quanh pivot.</li>
      <li><b>Canvas Scaler</b>: <code>Constant Pixel Size</code> giữ đúng số pixel, nên UI trông nhỏ xíu trên màn 4K. <code>Scale With Screen Size</code> phóng to hoặc thu nhỏ theo <i>Reference Resolution</i>, và <i>Match</i> chọn ưu tiên theo chiều rộng hay chiều cao.</li>
    </ul>
    <p>Chữ trong uGUI nên dùng <b>TextMeshPro</b> (<code>TMP_Text</code>) để chữ sắc nét ở mọi kích cỡ. Unity còn có <b>UI Toolkit</b> (UXML + USS, layout kiểu Flexbox). Hệ này dùng cho Editor tool và ngày càng nhiều cho runtime UI. uGUI vẫn phổ biến cho UI trong game.</p>
    <p class="callout">Bấm <b>"Neo tất cả về Center"</b> rồi xoay màn hình: HP Bar và Pause trôi vào giữa hoặc tràn ra ngoài. Đây là lỗi UI hay gặp nhất khi build lên điện thoại.</p>`,
  keyPoints: [
    'Anchor trùng nhau: giữ kích thước, bám một điểm. Anchor tách ra: co giãn theo parent.',
    'Pivot là gốc của anchoredPosition, scale và rotation.',
    'Dùng Scale With Screen Size + Reference Resolution cho game nhiều thiết bị.',
    'Dùng TextMeshPro cho chữ. UI Toolkit là hệ UI mới dựa trên UXML/USS.',
  ],
  code: [{
    title: 'HudLayout.cs',
    source: `
using UnityEngine;
using TMPro;

public class HudLayout : MonoBehaviour
{
    [SerializeField] private RectTransform hpBar;
    [SerializeField] private RectTransform skillBar;
    [SerializeField] private TMP_Text title;

    void Awake()
    {
        // HP Bar: neo + pivot ở góc trên-trái, cách mép 48px
        hpBar.anchorMin = hpBar.anchorMax = new Vector2(0f, 1f);
        hpBar.pivot = new Vector2(0f, 1f);
        hpBar.anchoredPosition = new Vector2(48f, -48f);
        hpBar.sizeDelta = new Vector2(420f, 56f);

        // Skill Bar: kéo giãn ngang, bám đáy
        skillBar.anchorMin = new Vector2(0f, 0f);
        skillBar.anchorMax = new Vector2(1f, 0f);
        skillBar.offsetMin = new Vector2(520f, 48f);    // (left, bottom)
        skillBar.offsetMax = new Vector2(-520f, 168f);  // (-right, top)

        title.text = "Level 1";
    }
}`,
    note: 'offsetMin/offsetMax là khoảng cách từ anchor tới các cạnh. Với anchor stretch, dùng chúng dễ hiểu hơn sizeDelta.',
  }, {
    title: 'CanvasSetup.cs',
    source: `
using UnityEngine;
using UnityEngine.UI;

[RequireComponent(typeof(CanvasScaler))]
public class CanvasSetup : MonoBehaviour
{
    void Awake()
    {
        var scaler = GetComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
        scaler.matchWidthOrHeight = 0.5f; // 0 = theo width, 1 = theo height
    }
}`,
    note: 'Thường bạn chỉnh các giá trị này trong Inspector của Canvas. Code ở đây chỉ để thấy rõ từng thuộc tính.',
  }],
  tryIt: [
    'Chọn thiết bị "1080×2400 (dọc)". Phần tử nào tràn ra ngoài? Xem cảnh báo trong Console.',
    'Đổi Canvas Scaler sang Constant Pixel Size rồi chọn 2560×1440: UI nhỏ đi thế nào?',
    'Chọn Skill Bar, đổi anchor từ stretch-bottom sang bottom rồi kéo rộng màn hình. Thanh còn giãn theo không?',
    'Chọn Pause, đổi Pivot rồi kéo Scale: phần tử phóng to quanh điểm nào?',
    'Bấm "Neo tất cả về Center" rồi xoay màn hình để thấy vì sao cần anchor.',
  ],
  links: [
    { label: 'Basic Layout (RectTransform)', url: 'https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/UIBasicLayout.html' },
    { label: 'Canvas Scaler', url: 'https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/script-CanvasScaler.html' },
    { label: 'TextMeshPro', url: 'https://docs.unity3d.com/Packages/com.unity.ugui@2.0/manual/TextMeshPro/index.html' },
    { label: 'UI Toolkit', url: 'https://docs.unity3d.com/Manual/UIElements.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const REF = { w: 1920, h: 1080 };
    const PRESETS = { // [minX, minY, maxX, maxY]
      'top-left': [0, 1, 0, 1], top: [0.5, 1, 0.5, 1], 'top-right': [1, 1, 1, 1], left: [0, 0.5, 0, 0.5],
      center: [0.5, 0.5, 0.5, 0.5], right: [1, 0.5, 1, 0.5], 'bottom-left': [0, 0, 0, 0], bottom: [0.5, 0, 0.5, 0],
      'bottom-right': [1, 0, 1, 0], 'stretch-top': [0, 1, 1, 1], 'stretch-middle': [0, 0.5, 1, 0.5], 'stretch-bottom': [0, 0, 1, 0], 'stretch-all': [0, 0, 1, 1],
    };
    const PIVOTS = ['0.5,0.5', '0,0', '1,1', '0,1', '1,0', '0.5,1', '0.5,0'];
    const scr = { w: 1920, h: 1080 };
    let scaleMode = 'scale', match = 0.5, sel = 0, drag = null, overflowKey = '', L = {};
    const mk = (name, color, preset, x, y, w, h, round, pivot = [0.5, 0.5]) => ({ name, color, preset, round, a: PRESETS[preset], pivot, scale: 1, pos: [0, 0], size: [0, 0], init: { x, y, w, h } });
    const items = [
      mk('HP Bar', C.green, 'top-left', 48, 976, 420, 56, false, [0, 1]), mk('Pause', C.red, 'top-right', 1772, 932, 100, 100, false, [1, 1]),
      mk('Title (TMP)', C.navy, 'stretch-top', 560, 952, 800, 80), mk('Dialog', C.purple, 'center', 610, 350, 700, 380),
      mk('Joystick', C.teal, 'bottom-left', 60, 60, 240, 240, true, [0, 0]), mk('Skill Bar', C.orange, 'stretch-bottom', 520, 48, 880, 120),
    ];
    const canvasSize = () => {
      const sf = scaleMode === 'constant' ? 1 : Math.pow(2, U.lerp(Math.log2(scr.w / REF.w), Math.log2(scr.h / REF.h), match));
      return { sf, cw: scr.w / sf, ch: scr.h / sf };
    };
    // Unity formula: pivot point = lerp(anchorMin, anchorMax, pivot) * parent + anchoredPosition
    function rectOf(it, cw, ch) {
      const [x0, y0, x1, y1] = [it.a[0] * cw, it.a[1] * ch, it.a[2] * cw, it.a[3] * ch];
      const w = x1 - x0 + it.size[0], h = y1 - y0 + it.size[1];
      const px = U.lerp(x0, x1, it.pivot[0]) + it.pos[0], py = U.lerp(y0, y1, it.pivot[1]) + it.pos[1];
      return { x: px - it.pivot[0] * w, y: py - it.pivot[1] * h, w, h, px, py };
    }
    function fromRect(it, r, cw, ch) { // keep the visual rect, recompute offsets (like the Inspector does)
      const [x0, y0, x1, y1] = [it.a[0] * cw, it.a[1] * ch, it.a[2] * cw, it.a[3] * ch];
      it.size = [r.w - (x1 - x0), r.h - (y1 - y0)];
      it.pos = [r.x + it.pivot[0] * r.w - U.lerp(x0, x1, it.pivot[0]), r.y + it.pivot[1] * r.h - U.lerp(y0, y1, it.pivot[1])];
    }
    items.forEach((it) => fromRect(it, it.init, REF.w, REF.h));
    const cur = () => items[sel];
    const fmt = (v) => `(${v[0].toFixed(1).replace('.0', '')}, ${v[1].toFixed(1).replace('.0', '')})`;
    function sync() {
      const it = cur();
      ui.preset.set(it.preset); ui.pivot.set(it.pivot.join(',')); ui.scale.set(it.scale);
      ui.anchors.set(`${fmt(it.a.slice(0, 2))} → ${fmt(it.a.slice(2))}`);
      ui.pos.set(fmt(it.pos)); ui.size.set(fmt(it.size));
    }
    function setAnchor(it, preset) {
      const { cw, ch } = canvasSize(), r = rectOf(it, cw, ch);
      it.preset = preset; it.a = PRESETS[preset]; fromRect(it, r, cw, ch);
    }
    function setScreen(w, h) { scr.w = w; scr.h = h; ui.sw.set(w); ui.sh.set(h); }

    // Inspector
    const ui = {};
    stage.ui.group('Screen');
    stage.ui.select('Thiết bị', ['1920×1080 (16:9)', '2400×1080 (20:9 ngang)', '1080×2400 (dọc)', '2048×1536 (iPad 4:3)', '2560×1440 (QHD)'], '1920×1080 (16:9)', (v) => {
      const [w, h] = v.split(' ')[0].split('×').map(Number); setScreen(w, h); stage.log(`Đổi màn hình → ${w}×${h}`);
    });
    ui.sw = stage.ui.slider('Width', { min: 480, max: 2560, step: 10, value: scr.w, unit: 'px' }, (v) => (scr.w = v));
    ui.sh = stage.ui.slider('Height', { min: 480, max: 2560, step: 10, value: scr.h, unit: 'px' }, (v) => (scr.h = v));
    stage.ui.button('Xoay màn hình', () => { setScreen(scr.h, scr.w); stage.log(`Xoay → ${scr.w}×${scr.h}`); });
    stage.ui.group('Canvas Scaler');
    stage.ui.select('UI Scale Mode', [{ value: 'scale', label: 'Scale With Screen Size' }, { value: 'constant', label: 'Constant Pixel Size' }], scaleMode, (v) => {
      scaleMode = v; stage.log(v === 'constant' ? 'Constant Pixel Size: 1 đơn vị UI = 1 pixel, màn càng lớn UI càng nhỏ.' : 'Scale With Screen Size: scale theo Reference Resolution 1920×1080.');
    });
    stage.ui.slider('Match W↔H', { min: 0, max: 1, step: 0.1, value: match, format: (v) => v.toFixed(1) }, (v) => (match = v));
    stage.ui.group('RectTransform');
    stage.ui.select('Phần tử', items.map((it, i) => ({ value: String(i), label: it.name })), '0', (v) => { sel = +v; sync(); });
    ui.preset = stage.ui.select('Anchor preset', Object.keys(PRESETS), cur().preset, (v) => {
      setAnchor(cur(), v); sync(); stage.log(`${cur().name}: anchor → ${v}. Vị trí giữ nguyên, anchoredPosition/sizeDelta được tính lại.`);
    });
    ui.pivot = stage.ui.select('Pivot', PIVOTS.map((p) => ({ value: p, label: `(${p.replace(',', ', ')})` })), '0.5,0.5', (v) => {
      const it = cur(), { cw, ch } = canvasSize(), r = rectOf(it, cw, ch);
      it.pivot = v.split(',').map(Number); fromRect(it, r, cw, ch); sync(); stage.log(`${it.name}: pivot → (${v}). Scale/rotation giờ quay quanh điểm này.`);
    });
    ui.scale = stage.ui.slider('localScale', { min: 0.5, max: 1.5, step: 0.05, value: 1, format: (v) => v.toFixed(2) }, (v) => (cur().scale = v));
    ui.anchors = stage.ui.readout('anchorMin → Max', '');
    ui.pos = stage.ui.readout('anchoredPosition', '');
    ui.size = stage.ui.readout('sizeDelta', '');
    stage.ui.button('Neo tất cả về Center', () => { items.forEach((it) => setAnchor(it, 'center')); sync(); stage.log('Mọi phần tử neo về center. Thử xoay màn hình xem!', 'warn'); }, { variant: 'danger' });
    sync();
    stage.log('Canvas Reference Resolution = 1920×1080. Mỗi phần tử có anchor preset riêng.');

    stage.onPointer('down', (x, y) => {
      if (L.hx != null && U.dist(x, y, L.hx, L.hy) < 22) { drag = { k: L.k }; return; }
      for (let i = items.length - 1; i >= 0; i--) {
        const b = L.boxes && L.boxes[i];
        if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { sel = i; sync(); stage.log(`Chọn ${items[i].name} (anchor ${items[i].preset})`); return; }
      }
    });
    stage.onPointer('move', (x, y) => {
      if (!drag) return;
      setScreen(Math.round(U.clamp((x - L.ox) / drag.k, 480, 2560) / 10) * 10, Math.round(U.clamp((y - L.oy) / drag.k, 480, 2560) / 10) * 10);
    });
    stage.onPointer('up', () => { if (drag) stage.log(`Kích thước màn hình: ${scr.w}×${scr.h}`); drag = null; });
    stage.onFrame(render);

    function render() {
      const { w, h } = stage, { sf, cw, ch } = canvasSize(), it = cur();
      d.clear(w, h); d.grid(w, h);
      d.text(`Screen ${scr.w}×${scr.h}`, 16, 18, { font: 'mono', size: 12, weight: 600, color: C.navy });
      d.text(`Canvas ${Math.round(cw)}×${Math.round(ch)} · ×${sf.toFixed(2)}`, w - 16, 18, { align: 'right', font: 'mono', size: 12, color: C.muted });
      const top = 42, fit = Math.min((w - 48) / scr.w, (h - top - 44) / scr.h), k = drag ? Math.min(drag.k, fit) : fit;
      const sw = scr.w * k, sh = scr.h * k, ox = (w - sw) / 2, oy = top + 8;
      d.rect(ox - 9, oy - 9, sw + 18, sh + 18, { fill: C.navy, r: 16, shadow: 12 });
      d.rect(ox, oy, sw, sh, { fill: C.bg, r: 4 });
      const X = (cx) => ox + cx * sf * k, Y = (cy) => oy + sh - cy * sf * k;
      const ctx = d.ctx; ctx.save(); ctx.beginPath(); ctx.rect(ox - 9, oy - 9, sw + 18, sh + 18); ctx.clip();
      const boxes = [], over = [];
      items.forEach((o, i) => {
        const r = rectOf(o, cw, ch), s = o.scale;
        const rx = r.px + (r.x - r.px) * s, ry = r.py + (r.y - r.py) * s, rw = r.w * s, rh = r.h * s;
        if (rx < -1 || ry < -1 || rx + rw > cw + 1 || ry + rh > ch + 1 || rw <= 0 || rh <= 0) over.push(o.name);
        const b = { x: X(rx), y: Y(ry + rh), w: rw * sf * k, h: rh * sf * k }; boxes.push(b);
        const on = i === sel, rad = o.round ? Math.min(b.w, b.h) / 2 : 6;
        d.rect(b.x, b.y, b.w, b.h, { fill: o.color + (on ? '40' : '26'), stroke: o.color, lw: on ? 2.5 : 1.5, r: rad, dash: on ? [] : [5, 3] });
        const fs = U.clamp(b.h * 0.32, 11, 15);
        if (b.w > 30) d.text(o.name, b.x + b.w / 2, b.y + b.h / 2, { align: 'center', font: 'cond', weight: 700, size: fs, color: o.color === C.navy ? C.navy : C.navy2 });
      });
      ctx.restore();
      // Selected: anchor "flower", anchoredPosition vector and pivot
      const ax = [X(it.a[0] * cw), X(it.a[2] * cw)], ay = [Y(it.a[1] * ch), Y(it.a[3] * ch)];
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([i, j]) => {
        const tx = ax[i], ty = ay[j], sx = i ? 1 : -1, sy = j ? -1 : 1;
        d.poly([[tx, ty], [tx + sx * 13, ty + sy * 5], [tx + sx * 5, ty + sy * 13]], { fill: '#fff', stroke: C.navy, lw: 1.5, close: true });
      });
      const r = rectOf(it, cw, ch), refX = X(U.lerp(it.a[0], it.a[2], it.pivot[0]) * cw), refY = Y(U.lerp(it.a[1], it.a[3], it.pivot[1]) * ch);
      if (U.dist(refX, refY, X(r.px), Y(r.py)) > 12) d.arrow(refX, refY, X(r.px), Y(r.py), { stroke: C.blue, lw: 1.5, dash: [4, 3], head: 8 });
      d.circle(X(r.px), Y(r.py), 6, { fill: '#fff', stroke: C.blue, lw: 2.5 });
      d.circle(X(r.px), Y(r.py), 2, { fill: C.blue });
      // Resize handle
      const hx = ox + sw + 9, hy = oy + sh + 9;
      d.circle(hx, hy, drag ? 10 : 8, { fill: C.orange, stroke: '#fff', lw: 2, shadow: 6 });
      d.text('⤡', hx, hy + 1, { align: 'center', size: 11, weight: 700, color: '#fff' });
      d.text(`chọn: ${it.name} · mũi tên xanh = anchoredPosition`, 16, h - 10, { font: 'mono', size: 11, color: C.muted });
      L = { ox, oy, k, hx, hy, boxes };
      const key = over.join(', ');
      if (key !== overflowKey) { overflowKey = key; if (key) stage.log(`Tràn ra ngoài màn hình: ${key}`, 'warn'); else stage.log('Mọi phần tử đều nằm gọn trong màn hình.'); }
    }
  },
});
