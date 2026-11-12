/* Lesson: Vector math — draggable vectors A/B showing magnitude, dot (FOV cone), cross (left/right), Lerp vs Slerp. */
U101.defineLesson('vector-math', {
  lead: 'Gần như mọi thứ trong gameplay là phép tính vector: hướng nhìn, khoảng cách, "kẻ địch có thấy mình không", "mục tiêu ở bên trái hay phải". Ba công cụ cần thuộc lòng là Dot, Cross và Lerp.',
  hint: 'Kéo đầu mũi tên A (xanh) và B (cam) · đổi Chế độ để xem Dot, Cross, Lerp/Slerp',
  overview: `
    <p>Trong Unity, <code>Vector3</code> vừa là <b>vị trí</b> vừa là <b>hướng</b>. Hai thuộc tính dùng hằng ngày: <code>magnitude</code> (độ dài) và <code>normalized</code> (cùng hướng, độ dài = 1).</p>
    <ul>
      <li><b>Dot(a, b)</b> = |a|·|b|·cos θ. Với hai vector đã normalize: 1 là cùng hướng, 0 là vuông góc, −1 là ngược hướng. Dùng để kiểm tra "mục tiêu ở trước hay sau", "có nằm trong góc nhìn (FOV) không". Dot của <code>b</code> với <code>a.normalized</code> cũng là <b>độ dài hình chiếu</b> của b lên a.</li>
      <li><b>Cross(a, b)</b> trả về vector vuông góc với cả hai. Dấu của nó cho biết b nằm <b>bên trái hay bên phải</b> a. Trên mặt phẳng XY (game 2D): <code>z &gt; 0</code> là b ở bên trái (ngược chiều kim đồng hồ). Trên mặt đất XZ (game 3D): <code>Cross(forward, toTarget).y &gt; 0</code> là mục tiêu ở bên phải.</li>
      <li><b>Lerp(a, b, t)</b> nội suy theo đường thẳng. <b>Slerp</b> nội suy theo cung tròn: góc thay đổi đều, độ dài nội suy tuyến tính. Slerp hợp để xoay hướng.</li>
      <li>Phép xoay dùng <b>Quaternion</b>, không cộng trừ góc Euler: <code>Quaternion.LookRotation</code>, <code>Quaternion.Slerp</code>, <code>Quaternion.RotateTowards</code>.</li>
    </ul>
    <p class="callout">So sánh khoảng cách thì dùng <code>sqrMagnitude</code> (bỏ phép căn bậc hai). So góc nhìn thì so <code>Dot</code> với <code>cos(fov/2)</code> thay vì gọi <code>Vector3.Angle</code> mỗi frame.</p>`,
  keyPoints: [
    'normalized giữ hướng, bỏ độ dài. Normalize trước khi dùng Dot để so góc.',
    'Dot > 0 là phía trước, Dot < 0 là phía sau. So với cos(fov/2) để làm hình nón tầm nhìn.',
    'Dấu của Cross cho biết trái hay phải. Đây là cách AI quyết định quay về phía nào.',
    'Lerp đi đường thẳng, Slerp đi cung tròn. Phép xoay dùng Quaternion.Slerp/RotateTowards.',
  ],
  code: {
    title: 'EnemyVision.cs',
    source: `
using UnityEngine;

public class EnemyVision : MonoBehaviour
{
    [SerializeField] private Transform player;
    [SerializeField, Range(1f, 180f)] private float fovAngle = 90f;
    [SerializeField] private float viewDistance = 8f;
    [SerializeField] private float turnSpeed = 4f;

    bool CanSeePlayer()
    {
        Vector3 toPlayer = player.position - transform.position;
        if (toPlayer.sqrMagnitude > viewDistance * viewDistance) return false; // quá xa
        float dot = Vector3.Dot(transform.forward, toPlayer.normalized);     // cos θ
        return dot >= Mathf.Cos(fovAngle * 0.5f * Mathf.Deg2Rad);
    }

    bool PlayerOnRight()   // mặt đất XZ, Unity là hệ tay trái
    {
        Vector3 cross = Vector3.Cross(transform.forward, player.position - transform.position);
        return cross.y > 0f;
    }

    void Update()
    {
        if (!CanSeePlayer()) return;
        Quaternion look = Quaternion.LookRotation(player.position - transform.position);
        // Slerp có hệ số độc lập frame-rate
        transform.rotation = Quaternion.Slerp(transform.rotation, look, 1f - Mathf.Exp(-turnSpeed * Time.deltaTime));
    }
}`,
    note: 'Dot + cos(fov/2) thay cho Vector3.Angle; sqrMagnitude thay cho Distance. Cả hai đều rẻ hơn và cho kết quả như nhau.',
  },
  tryIt: [
    'Chế độ Dot: kéo B vuông góc với A. Dot bằng bao nhiêu? Kéo B ra phía sau A thì sao?',
    'Chế độ FOV: giảm góc nhìn xuống 40° rồi đưa B (player) ra mép hình nón. Xem Console báo "phát hiện" hoặc "mất dấu".',
    'Chế độ Cross: kéo B vòng quanh A và xem dấu của z đổi đúng lúc B đi qua đường thẳng của A.',
    'Chế độ Lerp/Slerp: đặt |A| khác |B| rồi so hai đường đi. Điểm Slerp có luôn nằm trên cung không?',
    'Kéo A rất ngắn: normalized vẫn có độ dài 1 (chấm trên vòng tròn đơn vị).',
  ],
  links: [
    { label: 'Vector3 API', url: 'https://docs.unity3d.com/ScriptReference/Vector3.html' },
    { label: 'Vector3.Dot', url: 'https://docs.unity3d.com/ScriptReference/Vector3.Dot.html' },
    { label: 'Vector3.Cross', url: 'https://docs.unity3d.com/ScriptReference/Vector3.Cross.html' },
    { label: 'Quaternion API', url: 'https://docs.unity3d.com/ScriptReference/Quaternion.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const A = { x: 3, y: 1 }, B = { x: 1.6, y: 2.6 };
    let mode = 'dot', fov = 90, t = 0.5, animT = true, drag = null, prev = {};
    const len = (v) => Math.hypot(v.x, v.y), dot = (a, b) => a.x * b.x + a.y * b.y, crossZ = (a, b) => a.x * b.y - a.y * b.x;
    const f2 = (n) => (n >= 0 ? ' ' : '') + n.toFixed(2);

    function layout() {
      const { w, h } = stage, wide = w >= 640, cardW = wide ? Math.min(290, w * 0.34) : w - 24, cardH = wide ? 196 : 112;
      const pw = wide ? w - cardW - 24 : w, top = wide ? 0 : cardH + 16;
      const unit = Math.min(pw, h - top) / 9;
      return { wide, cardW, cardH, ox: pw / 2, oy: top + (h - top) * 0.58, unit, cx: wide ? w - cardW - 12 : 12, cy: 12 };
    }
    const toPx = (L, v) => [L.ox + v.x * L.unit, L.oy - v.y * L.unit];

    function report(key, val, msg, lvl) { if (prev[key] !== undefined && prev[key] !== val) stage.log(msg, lvl); prev[key] = val; }

    stage.ui.group('Chế độ');
    stage.ui.select('Hiển thị', [
      { value: 'dot', label: 'Dot · hình chiếu' }, { value: 'fov', label: 'Dot · tầm nhìn kẻ địch' },
      { value: 'cross', label: 'Cross · trái / phải' }, { value: 'lerp', label: 'Lerp vs Slerp' },
    ], mode, (v) => { mode = v; stage.log(`Chế độ: ${v}`); });
    stage.ui.slider('Góc nhìn (FOV)', { min: 10, max: 180, step: 5, value: fov, unit: '°' }, (v) => (fov = v));
    stage.ui.slider('t (Lerp/Slerp)', { min: 0, max: 1, step: 0.01, value: t, format: (v) => v.toFixed(2) }, (v) => { t = v; animT = false; animToggle.set(false); });
    const animToggle = stage.ui.toggle('Tự chạy t', animT, (v) => (animT = v));
    stage.ui.button('Đặt lại A, B', () => { Object.assign(A, { x: 3, y: 1 }); Object.assign(B, { x: 1.6, y: 2.6 }); });
    const roDot = stage.ui.readout('Dot(Â, B̂)', '—'), roAng = stage.ui.readout('Góc A→B', '—');

    stage.onPointer('down', (x, y) => {
      const L = layout(), [ax, ay] = toPx(L, A), [bx, by] = toPx(L, B);
      const da = U.dist(x, y, ax, ay), db = U.dist(x, y, bx, by);
      drag = da < 28 && da < db ? A : B;
      moveTo(x, y);
    });
    const moveTo = (x, y) => {
      if (!drag) return;
      const L = layout(), lim = 4.2;
      drag.x = U.clamp((x - L.ox) / L.unit, -lim, lim); drag.y = U.clamp((L.oy - y) / L.unit, -lim, lim);
      if (len(drag) < 0.3) { drag.x = 0.3; }
    };
    stage.onPointer('move', moveTo);
    stage.onPointer('up', () => (drag = null));

    stage.onFrame((dt, time) => { if (animT && mode === 'lerp') t = (Math.sin(time * 1.2) + 1) / 2; render(); });
    stage.onResize(() => render());

    function render() {
      const { w, h } = stage, L = layout();
      d.clear(w, h); d.grid(w, h);
      const [ox, oy] = [L.ox, L.oy], [ax, ay] = toPx(L, A), [bx, by] = toPx(L, B);
      const la = len(A), lb = len(B), na = { x: A.x / la, y: A.y / la }, nb = { x: B.x / lb, y: B.y / lb };
      const dn = dot(na, nb), ang = Math.acos(U.clamp(dn, -1, 1)) * 180 / Math.PI, cz = crossZ(A, B);
      const aA = Math.atan2(A.y, A.x), aB = Math.atan2(B.y, B.x), ctx = d.ctx;
      // axes + unit circle
      d.line(ox - L.unit * 4.4, oy, ox + L.unit * 4.4, oy, { stroke: C.line, lw: 1 });
      d.line(ox, oy - L.unit * 4.4, ox, oy + L.unit * 4.4, { stroke: C.line, lw: 1 });
      d.text('x', ox + L.unit * 4.4, oy + 12, { font: 'mono', size: 11, color: C.faint }); d.text('y', ox + 8, oy - L.unit * 4.4, { font: 'mono', size: 11, color: C.faint });
      d.circle(ox, oy, L.unit, { stroke: C.lineSoft, lw: 1.5, dash: [4, 4] });
      const lines = [];

      if (mode === 'dot') {
        const proj = dot(B, na), px = ox + na.x * proj * L.unit, py = oy - na.y * proj * L.unit;
        d.line(ox - na.x * L.unit * 4.4, oy + na.y * L.unit * 4.4, ox + na.x * L.unit * 4.4, oy - na.y * L.unit * 4.4, { stroke: C.lineSoft, lw: 1, dash: [3, 5] });
        d.line(bx, by, px, py, { stroke: C.faint, lw: 1.5, dash: [5, 4] });
        d.line(ox, oy, px, py, { stroke: proj >= 0 ? C.green : C.red, lw: 6 });
        d.pill(`B·Â = ${proj.toFixed(2)}`, px, py + 18, { align: 'center', fill: proj >= 0 ? C.green : C.red, size: 11 });
        ctx.beginPath(); ctx.arc(ox, oy, L.unit * 0.55, -aA, -aB, crossZ(A, B) > 0); ctx.strokeStyle = C.purple; ctx.lineWidth = 2; ctx.stroke();
        lines.push(['Dot(A,B)', f2(dot(A, B))], ['Dot(Â,B̂) = cos θ', f2(dn)], ['θ', ang.toFixed(1) + '°'], ['B·Â (hình chiếu)', f2(dot(B, na))], ['→', dn > 0.01 ? 'B ở PHÍA TRƯỚC A' : dn < -0.01 ? 'B ở PHÍA SAU A' : 'B vuông góc A']);
        report('front', dn >= 0, dn >= 0 ? 'Dot > 0 → B đã ra phía trước A' : 'Dot < 0 → B đã ra phía sau A');
      } else if (mode === 'fov') {
        const half = fov * Math.PI / 360, R = L.unit * 4.2, see = dn >= Math.cos(half);
        d.poly([[ox, oy], ...Array.from({ length: 21 }, (_, i) => { const a = aA - half + (2 * half * i) / 20; return [ox + Math.cos(a) * R, oy - Math.sin(a) * R]; })], { close: true, fill: see ? 'rgba(214,90,74,0.16)' : 'rgba(42,86,163,0.10)', stroke: see ? C.red : C.blue, lw: 1.5 });
        d.circle(bx, by, 13, { fill: see ? C.red : C.green, stroke: '#fff', lw: 2 });
        d.text(see ? '!' : 'P', bx, by + 1, { align: 'center', font: 'cond', weight: 700, size: 14, color: '#fff' });
        d.circle(ox, oy, 15, { fill: C.navy }); d.text('Enemy', ox, oy + 28, { align: 'center', font: 'mono', size: 11, color: C.navy });
        lines.push(['forward = Â', `(${na.x.toFixed(2)}, ${na.y.toFixed(2)})`], ['Dot(fwd, toPlayer)', f2(dn)], ['cos(fov/2)', f2(Math.cos(half))], ['so sánh', `${dn.toFixed(2)} ${see ? '≥' : '<'} ${Math.cos(half).toFixed(2)}`], ['→', see ? 'THẤY player' : 'không thấy']);
        report('see', see, see ? `Enemy phát hiện Player (dot ${dn.toFixed(2)} ≥ cos(${fov / 2}°))` : 'Enemy mất dấu Player', see ? 'warn' : 'info');
      } else if (mode === 'cross') {
        const left = cz > 0;
        d.poly([[ox, oy], [ox + Math.cos(aA) * L.unit * 4.3, oy - Math.sin(aA) * L.unit * 4.3], [ox + Math.cos(aA + Math.PI / 2) * L.unit * 4.3, oy - Math.sin(aA + Math.PI / 2) * L.unit * 4.3]], { close: true, fill: 'rgba(63,168,107,0.10)' });
        d.poly([[ox, oy], [ox + Math.cos(aA) * L.unit * 4.3, oy - Math.sin(aA) * L.unit * 4.3], [ox + Math.cos(aA - Math.PI / 2) * L.unit * 4.3, oy - Math.sin(aA - Math.PI / 2) * L.unit * 4.3]], { close: true, fill: 'rgba(192,101,45,0.10)' });
        d.text('TRÁI (z > 0)', ox + Math.cos(aA + 0.8) * L.unit * 2.6, oy - Math.sin(aA + 0.8) * L.unit * 2.6, { align: 'center', font: 'mono', size: 11, weight: 600, color: C.green });
        d.text('PHẢI (z < 0)', ox + Math.cos(aA - 0.8) * L.unit * 2.6, oy - Math.sin(aA - 0.8) * L.unit * 2.6, { align: 'center', font: 'mono', size: 11, weight: 600, color: C.orange });
        d.circle(ox, oy, 12, { fill: left ? C.green : C.orange, stroke: '#fff', lw: 2 });
        d.text(left ? '⊙' : '⊗', ox, oy + 1, { align: 'center', size: 15, weight: 700, color: '#fff' });
        lines.push(['Cross(A,B)', `(0, 0, ${cz.toFixed(2)})`], ['z = Ax·By − Ay·Bx', f2(cz)], ['|z| = |A||B|sin θ', Math.abs(cz).toFixed(2)], ['→', left ? 'B ở BÊN TRÁI A' : 'B ở BÊN PHẢI A'], ['Z hướng', left ? 'ra khỏi màn hình' : 'vào màn hình']);
        report('left', left, left ? 'Cross.z > 0 → B chuyển sang bên trái A' : 'Cross.z < 0 → B chuyển sang bên phải A');
      } else {
        let da = aB - aA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const sl = (k) => { const a = aA + da * k, m = U.lerp(la, lb, k); return [ox + Math.cos(a) * m * L.unit, oy - Math.sin(a) * m * L.unit]; };
        const lp = (k) => [U.lerp(ax, bx, k), U.lerp(ay, by, k)];
        d.poly(Array.from({ length: 31 }, (_, i) => sl(i / 30)), { stroke: C.purple, lw: 2, dash: [6, 4] });
        d.line(ax, ay, bx, by, { stroke: C.teal, lw: 2, dash: [6, 4] });
        for (let i = 1; i < 10; i++) { d.circle(...lp(i / 10), 2.5, { fill: C.teal }); d.circle(...sl(i / 10), 2.5, { fill: C.purple }); }
        const [lx, ly] = lp(t), [sx, sy] = sl(t);
        d.arrow(ox, oy, lx, ly, { stroke: C.teal, lw: 1.5, head: 7, dash: [2, 3] }); d.arrow(ox, oy, sx, sy, { stroke: C.purple, lw: 1.5, head: 7, dash: [2, 3] });
        d.circle(lx, ly, 8, { fill: C.teal, stroke: '#fff', lw: 2 }); d.circle(sx, sy, 8, { fill: C.purple, stroke: '#fff', lw: 2 });
        const lv = { x: U.lerp(A.x, B.x, t), y: U.lerp(A.y, B.y, t) };
        lines.push(['t', t.toFixed(2)], ['Lerp |v|', len(lv).toFixed(2)], ['Slerp |v|', U.lerp(la, lb, t).toFixed(2)], ['Lerp', 'đường thẳng (teal)'], ['Slerp', 'cung tròn (tím)']);
      }
      // vectors A, B + normalized dots
      d.arrow(ox, oy, ax, ay, { stroke: C.blue, lw: 3, head: 12 }); d.arrow(ox, oy, bx, by, { stroke: C.orange, lw: 3, head: 12 });
      d.circle(ox + na.x * L.unit, oy - na.y * L.unit, 4, { fill: C.blue }); d.circle(ox + nb.x * L.unit, oy - nb.y * L.unit, 4, { fill: C.orange });
      d.pill(mode === 'fov' ? 'A · forward' : 'A', ax + na.x * 18, ay - na.y * 18, { align: 'center', fill: C.blue, size: 11 });
      d.pill(mode === 'fov' ? 'B · player' : 'B', bx + nb.x * 22, by - nb.y * 22 - (mode === 'fov' ? 10 : 0), { align: 'center', fill: C.orange, size: 11 });
      // info card
      const { cx, cy, cardW, cardH, wide } = L;
      d.node(cx, cy, cardW, cardH, null, { accent: C.purple });
      const base = [['A', `(${A.x.toFixed(1)}, ${A.y.toFixed(1)})  |A| ${la.toFixed(2)}`], ['B', `(${B.x.toFixed(1)}, ${B.y.toFixed(1)})  |B| ${lb.toFixed(2)}`]];
      const all = wide ? [...base, ...lines] : [...base, ...lines.slice(-3)], rowH = (cardH - 16) / all.length;
      all.forEach(([k, v], i) => {
        const y = cy + 8 + rowH * (i + 0.5), hl = k === '→';
        d.text(k, cx + 12, y, { font: 'mono', size: 11, color: i < 2 ? (i ? C.orange : C.blue) : C.muted, weight: 600 });
        d.text(v, cx + cardW - 12, y, { align: 'right', font: hl ? 'cond' : 'mono', size: hl ? 14 : 11, weight: hl ? 700 : 500, color: hl ? C.navy : C.ink });
      });
      roDot.set(dn.toFixed(3)); roAng.set(ang.toFixed(1) + '°');
    }
    render();
  },
});
