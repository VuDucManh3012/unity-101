/* Lesson: Rigidbody & Collider — tiny 2D impulse-based physics sandbox with fixed timestep, trigger zone and collision logs. */
U101.defineLesson('rigidbody-colliders', {
  lead: 'Collider cho object một hình dạng để va chạm. Rigidbody giao object cho bộ máy vật lý: trọng lực, khối lượng, lực cản, độ nảy. Hai thứ này luôn đi cùng nhau.',
  hint: 'Click vào Scene để thả vật · đổi Mass, Drag, Bounciness trước khi thả · bật isKinematic để tạo vật do script điều khiển',
  overview: `
    <p><b>Collider</b> (BoxCollider, SphereCollider, CapsuleCollider, MeshCollider) chỉ mô tả <b>hình dạng</b>. <b>Rigidbody</b> làm object chuyển động theo vật lý. Object chỉ có Collider mà không có Rigidbody là <b>static collider</b>, ví dụ sàn và tường.</p>
    <ul>
      <li><b>mass</b>: khối lượng. Không làm vật rơi nhanh hơn (mọi vật rơi như nhau khi không có drag), nhưng quyết định ai đẩy ai khi va chạm.</li>
      <li><b>drag</b> (Unity 6: <code>linearDamping</code>): lực cản làm vận tốc giảm dần theo thời gian.</li>
      <li><b>PhysicMaterial.bounciness</b> (0–1): độ nảy. Kết hợp giữa hai vật theo <code>bounceCombine</code>, mặc định là Average.</li>
      <li><b>isKinematic</b>: vật không chịu lực và trọng lực, chỉ di chuyển khi script gọi <code>MovePosition</code>, nhưng vẫn đẩy được vật dynamic.</li>
      <li><b>isTrigger</b> trên Collider: không chặn vật, chỉ báo <code>OnTriggerEnter/Exit</code>. Va chạm thật thì báo <code>OnCollisionEnter/Stay/Exit</code>.</li>
    </ul>
    <p class="callout">Vật lý chạy theo <b>Fixed Timestep</b> (mặc định 0.02s = 50 bước/giây), không theo FPS. Muốn callback va chạm được gọi thì ít nhất một trong hai object phải có Rigidbody.</p>`,
  keyPoints: [
    'Collider = hình dạng. Rigidbody = chuyển động vật lý. Không có Rigidbody thì là static.',
    'Đặt lực và vận tốc trong FixedUpdate. Đừng sửa transform.position của Rigidbody dynamic.',
    'Trigger chỉ phát hiện (OnTriggerEnter), Collision mới chặn và nảy (OnCollisionEnter).',
    'Kinematic: script điều khiển, không chịu lực. Dùng cho thang máy, cửa, nền di động.',
  ],
  code: {
    title: 'Crate.cs',
    source: `
using UnityEngine;

[RequireComponent(typeof(Rigidbody))]
public class Crate : MonoBehaviour
{
    [SerializeField] private float jumpForce = 6f;
    private Rigidbody rb;

    void Awake() { rb = GetComponent<Rigidbody>(); rb.mass = 2f; }

    void FixedUpdate()   // nhịp vật lý: Time.fixedDeltaTime = 0.02
    {
        if (Input.GetKey(KeyCode.Space)) rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse);
    }

    void OnCollisionEnter(Collision c)   // va chạm thật (không phải trigger)
    {
        float impact = c.relativeVelocity.magnitude;
        Debug.Log($"Chạm {c.gameObject.name}, lực va {impact:F1}, normal {c.GetContact(0).normal}");
    }

    void OnTriggerEnter(Collider other)  // collider kia có isTrigger = true
    {
        if (other.CompareTag("Goal")) Debug.Log("Vào vùng đích!");
    }
}`,
    note: 'OnCollisionEnter nhận Collision (có điểm chạm, normal, relativeVelocity). OnTriggerEnter chỉ nhận Collider của vật kia.',
  },
  tryIt: [
    'Thả một quả bóng Bounciness 0.9 và một hộp Bounciness 0: vật nào nảy lâu hơn?',
    'Đặt Mass 10 rồi thả lên chồng vật Mass 1: vật nặng đẩy vật nhẹ ra sao?',
    'Tăng Drag lên 5: vật rơi chậm như trong nước. Mass có làm vật rơi nhanh hơn không?',
    'Bật isKinematic rồi click: vật trôi qua lại, không rơi, nhưng đẩy được vật khác.',
    'Kéo Fixed Timestep lên 0.06: va chạm trở nên "giật" và vật nhanh dễ xuyên qua nhau (tunneling).',
    'Thả vật vào vùng vàng TriggerZone và xem Console báo OnTriggerEnter / OnTriggerExit.',
  ],
  links: [
    { label: 'Rigidbody (Manual)', url: 'https://docs.unity3d.com/Manual/rigidbody-physics-section.html' },
    { label: 'Colliders overview', url: 'https://docs.unity3d.com/Manual/collider-types-introduction.html' },
    { label: 'OnCollisionEnter', url: 'https://docs.unity3d.com/ScriptReference/Collider.OnCollisionEnter.html' },
    { label: 'Physic Material', url: 'https://docs.unity3d.com/Manual/class-PhysicsMaterial.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const PPM = 40; // pixel mỗi mét
    let gravity = 9.81, mass = 1, drag = 0.2, bounce = 0.4, shape = 'ball', kinematic = false, fixedDt = 0.02;
    let bodies = [], acc = 0, simTime = 0, id = 0, contacts = new Set(), inside = new Set(), logBudget = 4, stepsLast = 0;
    const statics = () => {
      const { w, h } = stage;
      return [
        { name: 'Ground', box: true, x: w / 2, y: h - 14, hw: w / 2 + 40, hh: 18, inv: 0, e: 0, vx: 0, vy: 0, static: true },
        { name: 'WallL', box: true, x: -10, y: h / 2, hw: 12, hh: h, inv: 0, e: 0, vx: 0, vy: 0, static: true },
        { name: 'WallR', box: true, x: stage.w + 10, y: h / 2, hw: 12, hh: h, inv: 0, e: 0, vx: 0, vy: 0, static: true },
      ];
    };
    const zone = () => ({ x: stage.w * 0.7, y: stage.h - 32 - stage.h * 0.16, hw: Math.min(110, stage.w * 0.14), hh: stage.h * 0.16 });

    function spawn(x, y, o = {}) {
      const m = o.mass ?? mass, sh = o.shape ?? shape, kin = o.kin ?? kinematic, s = 13 + Math.sqrt(m) * 4;
      const b = { name: `${sh === 'ball' ? 'Ball' : 'Box'}_${++id}`, box: sh === 'box', x, y, r: s, hw: s, hh: s, vx: o.vx ?? U.rand(-40, 40), vy: 0,
        m, inv: kin ? 0 : 1 / m, e: o.bounce ?? bounce, drag: o.drag ?? drag, kin, ox: x, phase: simTime, flash: 0 };
      bodies.push(b); if (bodies.length > 40) bodies.shift();
      return b;
    }

    function collide(a, b) { // returns {nx, ny, pen} with normal from a → b, or null
      if (a.box && b.box) {
        const dx = b.x - a.x, dy = b.y - a.y, px = a.hw + b.hw - Math.abs(dx), py = a.hh + b.hh - Math.abs(dy);
        if (px <= 0 || py <= 0) return null;
        return px < py ? { nx: Math.sign(dx) || 1, ny: 0, pen: px } : { nx: 0, ny: Math.sign(dy) || 1, pen: py };
      }
      if (!a.box && !b.box) {
        const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy), pen = a.r + b.r - dd;
        return pen > 0 ? { nx: dd ? dx / dd : 0, ny: dd ? dy / dd : 1, pen } : null;
      }
      const flip = !a.box, bx = flip ? b : a, c = flip ? a : b; // bx = box, c = circle
      const qx = U.clamp(c.x, bx.x - bx.hw, bx.x + bx.hw), qy = U.clamp(c.y, bx.y - bx.hh, bx.y + bx.hh);
      let dx = c.x - qx, dy = c.y - qy, dd = Math.hypot(dx, dy), res;
      if (dd > 0) { if (dd >= c.r) return null; res = { nx: dx / dd, ny: dy / dd, pen: c.r - dd }; }
      else { const ex = bx.hw - Math.abs(c.x - bx.x), ey = bx.hh - Math.abs(c.y - bx.y); res = ex < ey ? { nx: Math.sign(c.x - bx.x) || 1, ny: 0, pen: ex + c.r } : { nx: 0, ny: Math.sign(c.y - bx.y) || 1, pen: ey + c.r }; }
      return flip ? { nx: -res.nx, ny: -res.ny, pen: res.pen } : res;
    }

    function step(dt) {
      simTime += dt;
      bodies.forEach((b) => {
        if (b.kin) { const nx = b.ox + Math.sin((simTime - b.phase) * 1.5) * 80; b.vx = (nx - b.x) / dt; b.vy = 0; b.x = nx; return; } // MovePosition
        b.vy += gravity * PPM * dt;
        const k = Math.max(0, 1 - b.drag * dt); b.vx *= k; b.vy *= k;
        b.x += b.vx * dt; b.y += b.vy * dt;
      });
      const all = [...statics(), ...bodies], now = new Set();
      for (let it = 0; it < 4; it++) for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j]; if (a.inv + b.inv === 0) continue;
        const c = collide(a, b); if (!c) continue;
        const key = a.name + '|' + b.name, invSum = a.inv + b.inv;
        const corr = Math.max(0, c.pen - 0.5) / invSum * 0.8;
        a.x -= c.nx * corr * a.inv; a.y -= c.ny * corr * a.inv; b.x += c.nx * corr * b.inv; b.y += c.ny * corr * b.inv;
        const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * c.nx + rvy * c.ny;
        if (vn < 0) {
          const e = vn < -2 * PPM ? (a.e + b.e) / 2 : 0, jn = -(1 + e) * vn / invSum;
          a.vx -= jn * c.nx * a.inv; a.vy -= jn * c.ny * a.inv; b.vx += jn * c.nx * b.inv; b.vy += jn * c.ny * b.inv;
          const tx = -c.ny, ty = c.nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty, jt = U.clamp(-vt / invSum, -0.4 * jn, 0.4 * jn); // ma sát
          a.vx -= jt * tx * a.inv; a.vy -= jt * ty * a.inv; b.vx += jt * tx * b.inv; b.vy += jt * ty * b.inv;
          if (it === 0 && !contacts.has(key) && -vn > 60) {
            [a, b].forEach((o) => (o.flash = 1));
            if (logBudget-- > 0) stage.log(`OnCollisionEnter: ${a.name} ↔ ${b.name} · relativeVelocity ${(-vn / PPM).toFixed(1)} m/s`);
          }
        }
        now.add(key);
      }
      contacts = now;
      const z = zone();
      bodies.forEach((b) => {
        const inZ = Math.abs(b.x - z.x) < z.hw + (b.box ? b.hw : b.r) && Math.abs(b.y - z.y) < z.hh + (b.box ? b.hh : b.r);
        if (inZ && !inside.has(b)) { inside.add(b); stage.log(`OnTriggerEnter: ${b.name} vào TriggerZone`, 'warn'); }
        if (!inZ && inside.has(b)) { inside.delete(b); stage.log(`OnTriggerExit: ${b.name} rời TriggerZone`); }
      });
      bodies = bodies.filter((b) => b.y < stage.h + 200);
    }

    stage.ui.group('Rigidbody cho vật mới');
    stage.ui.select('Collider', [{ value: 'ball', label: 'SphereCollider (bóng)' }, { value: 'box', label: 'BoxCollider (hộp)' }], shape, (v) => (shape = v));
    stage.ui.slider('Mass', { min: 0.5, max: 10, step: 0.5, value: mass, unit: ' kg' }, (v) => (mass = v));
    stage.ui.slider('Drag', { min: 0, max: 5, step: 0.1, value: drag }, (v) => (drag = v));
    stage.ui.slider('Bounciness', { min: 0, max: 1, step: 0.05, value: bounce }, (v) => (bounce = v));
    stage.ui.toggle('isKinematic', kinematic, (v) => { kinematic = v; stage.log(v ? 'isKinematic = true: vật mới chỉ di chuyển bằng MovePosition, không rơi.' : 'isKinematic = false: vật mới chịu trọng lực và lực va chạm.'); });
    stage.ui.group('Physics (Project Settings)');
    stage.ui.slider('Gravity', { min: 0, max: 20, step: 0.5, value: gravity, unit: ' m/s²' }, (v) => (gravity = v));
    stage.ui.slider('Fixed Timestep', { min: 0.005, max: 0.06, step: 0.005, value: fixedDt, unit: 's' }, (v) => (fixedDt = v));
    stage.ui.button('Thả 5 vật', () => { for (let i = 0; i < 5; i++) spawn(U.rand(40, stage.w - 40), U.rand(30, 90), { shape: Math.random() < 0.5 ? 'ball' : 'box' }); }, { variant: 'primary' });
    stage.ui.button('Xóa tất cả', () => { bodies = []; inside.clear(); }, { variant: 'danger' });
    const roSteps = stage.ui.readout('FixedUpdate/frame', '—'), roCount = stage.ui.readout('Rigidbody', '0');

    stage.onPointer('down', (x, y) => { const b = spawn(x, y); stage.log(`Instantiate ${b.name}: mass ${b.m}kg, bounciness ${b.e}${b.kin ? ', isKinematic' : ''}`); });
    stage.onFrame((dt) => {
      acc += dt; stepsLast = 0;
      while (acc >= fixedDt && stepsLast < 8) { acc -= fixedDt; step(fixedDt); stepsLast++; }
      logBudget = Math.min(4, logBudget + dt * 3);
      bodies.forEach((b) => (b.flash = Math.max(0, b.flash - dt * 3)));
      roSteps.set(String(stepsLast)); roCount.set(String(bodies.length));
      render();
    });
    stage.onResize(() => render());

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      const z = zone();
      d.rect(z.x - z.hw, z.y - z.hh, z.hw * 2, z.hh * 2, { fill: 'rgba(226,169,59,0.16)', stroke: C.yellow, lw: 2, dash: [6, 5], r: 6 });
      d.text('TriggerZone', z.x, z.y - z.hh + 14, { align: 'center', font: 'mono', size: 11, weight: 600, color: C.orange });
      d.text(`isTrigger · ${inside.size} bên trong`, z.x, z.y - z.hh + 29, { align: 'center', font: 'mono', size: 11, color: C.muted });
      d.rect(0, h - 32, w, 32, { fill: C.bgDeep, r: 0 }); d.line(0, h - 32, w, h - 32, { stroke: C.trace, lw: 2 });
      d.text('Ground · BoxCollider (static, không Rigidbody)', 12, h - 16, { font: 'mono', size: 11, color: C.muted });
      bodies.forEach((b) => {
        const col = b.kin ? C.purple : b.box ? C.blue : C.teal, fill = b.flash > 0 ? C.red : col;
        const o = { fill: b.kin ? 'rgba(138,115,224,0.25)' : fill, stroke: b.kin ? C.purple : '#fff', lw: 2, dash: b.kin ? [4, 3] : null, shadow: 4 };
        b.box ? d.rect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2, { ...o, r: 4 }) : d.circle(b.x, b.y, b.r, o);
        d.text(b.kin ? 'K' : `${b.m}`, b.x, b.y + 1, { align: 'center', font: 'mono', size: 11, weight: 700, color: b.kin ? C.purple : '#fff' });
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > 25) { const ux = b.vx / sp, uy = b.vy / sp, r0 = (b.box ? b.hw : b.r) + 3, L = Math.min(60, sp * 0.1) + 8; d.arrow(b.x + ux * r0, b.y + uy * r0, b.x + ux * (r0 + L), b.y + uy * (r0 + L), { stroke: C.navy, lw: 1.5, head: 6 }); }
      });
      const cw = Math.min(250, w - 24);
      d.node(12, 12, cw, 54, null, { accent: C.teal });
      d.text(`fixedDeltaTime = ${fixedDt.toFixed(3)}s`, 24, 31, { font: 'mono', size: 12, weight: 600, color: C.navy });
      d.text(`gravity ${gravity} m/s² · ${bodies.length} Rigidbody`, 24, 50, { font: 'mono', size: 11, color: C.muted });
      if (!bodies.length) d.text('Click để thả vật', w / 2, h / 2, { align: 'center', font: 'cond', size: 18, weight: 600, color: C.faint });
    }

    // Cảnh khởi đầu: vài vật đang rơi + một nền kinematic
    const w0 = stage.w;
    [[0.15, 0.3, 'ball', 1, 0.8], [0.3, 0.15, 'box', 4, 0.1], [0.45, 0.35, 'ball', 2, 0.5], [0.62, 0.1, 'box', 1, 0.3], [0.78, 0.25, 'ball', 0.5, 0.9]]
      .forEach(([fx, fy, sh, m, e]) => spawn(w0 * fx, stage.h * fy, { shape: sh, mass: m, bounce: e, vx: 0 }));
    spawn(w0 * 0.35, stage.h * 0.62, { shape: 'box', kin: true, mass: 2 });
    for (let i = 0; i < 40; i++) step(fixedDt);
    stage.clearLog(); stage.log('Scene có 5 Rigidbody dynamic + 1 kinematic (K). Click để thả thêm.');
    render();
  },
});
