/* Lesson: camera follow — naive Update vs LateUpdate vs Cinemachine (damping, dead zone, look-ahead, confiner). */
U101.defineLesson('cinemachine-camera', {
  lead: 'Camera bám theo player nghe đơn giản, nhưng sai thứ tự cập nhật sẽ gây giật (jitter). Cinemachine thêm damping, dead zone, look-ahead và confiner mà không cần viết code camera.',
  hint: 'Nhấn giữ và kéo trên Scene để điều khiển player · đổi "Cách follow" và xem biểu đồ jitter phía dưới',
  overview: `
    <p>Cách viết đơn giản nhất là <code>camera.position = player.position</code>. Nếu đặt dòng này trong <b>Update</b>, Unity không đảm bảo camera chạy trước hay sau player. Có frame camera đọc vị trí cũ, có frame đọc vị trí mới, nên player bị <b>rung</b> trên màn hình.</p>
    <ul>
      <li><b>LateUpdate</b>: chạy sau mọi Update, nên camera luôn đọc vị trí cuối cùng của frame. Nếu player di chuyển bằng Rigidbody, hãy bật <i>Interpolate</i>.</li>
      <li><b>Cinemachine</b>: bạn tạo một <i>CinemachineCamera</i> (virtual camera) với <code>Follow = player</code>. Camera thật có <i>CinemachineBrain</i>, mặc định cập nhật ở LateUpdate.</li>
      <li><b>Damping</b>: thời gian camera đuổi kịp mục tiêu. <b>Dead Zone</b>: vùng player di chuyển mà camera đứng yên. <b>Look-ahead</b>: camera nhìn về phía player sắp đi tới.</li>
      <li><b>Confiner 2D/3D</b>: giữ khung hình trong biên của level, không lộ khoảng trống bên ngoài map.</li>
    </ul>
    <p class="callout">Biểu đồ dưới cùng vẽ <b>độ lệch của player so với tâm màn hình</b>. Ở Update thì đường răng cưa, ở LateUpdate thì phẳng, còn với Cinemachine là đường cong mượt có chủ đích.</p>`,
  keyPoints: [
    'Code camera follow đặt trong LateUpdate, không đặt trong Update.',
    'Damping tạo độ trễ mềm, dead zone giảm rung khi player chỉ nhích nhẹ.',
    'Look-ahead giúp người chơi thấy nhiều hơn theo hướng di chuyển.',
    'Confiner giữ camera trong biên level.',
  ],
  code: [{
    title: 'SimpleCameraFollow.cs',
    source: `
using UnityEngine;

public class SimpleCameraFollow : MonoBehaviour
{
    [SerializeField] private Transform target;
    [SerializeField] private Vector3 offset = new Vector3(0f, 0f, -10f);
    [SerializeField] private float smoothTime = 0.2f;
    private Vector3 velocity;

    // LateUpdate: mọi Update (kể cả player) đã chạy xong
    void LateUpdate()
    {
        Vector3 goal = target.position + offset;
        transform.position = Vector3.SmoothDamp(transform.position, goal, ref velocity, smoothTime);
    }
}`,
    note: 'Đây là damping tự viết bằng SmoothDamp. Đổi LateUpdate thành Update là thấy player rung ngay.',
  }, {
    title: 'CameraSetup.cs (Cinemachine 3)',
    source: `
using UnityEngine;
using Unity.Cinemachine;

public class CameraSetup : MonoBehaviour
{
    [SerializeField] private CinemachineCamera vcam;
    [SerializeField] private Transform player;

    void Start()
    {
        vcam.Follow = player;
        var composer = vcam.GetComponent<CinemachinePositionComposer>();
        composer.Damping = new Vector3(0.5f, 0.5f, 0f);
        composer.Composition.DeadZone.Enabled = true;
        composer.Composition.DeadZone.Size = new Vector2(0.2f, 0.2f);
        composer.Lookahead.Enabled = true;
        composer.Lookahead.Time = 0.3f;
        // CinemachineConfiner2D + PolygonCollider2D giới hạn biên level
    }
}`,
    note: 'Thực tế bạn chỉnh các giá trị này trong Inspector. Code chỉ để thấy tên thuộc tính tương ứng với các slider trong mô phỏng.',
  }],
  tryIt: [
    'Chọn "Update (naive)" và nhìn biểu đồ: vì sao đường bị răng cưa?',
    'Chuyển sang LateUpdate: đường jitter phẳng, nhưng camera có cảm giác cứng.',
    'Với Cinemachine, tăng Dead Zone lên 0.4 rồi kéo player nhích nhẹ. Camera có di chuyển không?',
    'Tăng Look-ahead lên 0.8s: chấm cam (điểm nhìn) nằm ở đâu so với player?',
    'Tắt Confiner rồi kéo player ra mép map: khoảng trống ngoài level lộ ra.',
  ],
  links: [
    { label: 'Cinemachine 3 manual', url: 'https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/index.html' },
    { label: 'Cinemachine Position Composer', url: 'https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/CinemachinePositionComposer.html' },
    { label: 'Order of execution (LateUpdate)', url: 'https://docs.unity3d.com/Manual/ExecutionOrder.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const W = 2400, H = 1400, GRAPH = 70;
    let mode = 'cm', damping = 0.5, dzW = 0.2, dzH = 0.2, look = 0.3, confine = true, vmax = 340, pathT = 0.6;
    const pl = { x: 700, y: 900, vx: 0, vy: 0 }, cam = { x: 700, y: 900 }, la = { x: 0, y: 0 }, hist = [];
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const props = Array.from({ length: 70 }, () => ({ x: 60 + rnd() * (W - 120), y: 60 + rnd() * (H - 120), r: 14 + rnd() * 22, tree: rnd() < 0.65 }));
    let V = { gw: 0, gh: 0, z: 1 };
    const MODES = { cm: 'Cinemachine (Position Composer)', late: 'Script trong LateUpdate', update: 'Script trong Update (naive)' };

    stage.ui.group('Follow');
    stage.ui.select('Cách follow', Object.entries(MODES).map(([value, label]) => ({ value, label })), mode, (v) => {
      mode = v; hist.length = 0;
      stage.log({ cm: 'Cinemachine: damping + dead zone + look-ahead, CinemachineBrain cập nhật trong LateUpdate.', late: 'LateUpdate: camera = player sau khi mọi Update chạy xong → không rung, nhưng cứng.', update: 'Update: thứ tự camera/player không xác định → frame đọc vị trí cũ, frame đọc vị trí mới → jitter!' }[v], v === 'update' ? 'warn' : 'info');
    });
    stage.ui.group('Cinemachine');
    stage.ui.slider('Damping', { min: 0, max: 2, step: 0.1, value: damping, unit: 's' }, (v) => (damping = v));
    stage.ui.slider('Dead Zone W', { min: 0, max: 0.6, step: 0.05, value: dzW, format: (v) => v.toFixed(2) }, (v) => (dzW = v));
    stage.ui.slider('Dead Zone H', { min: 0, max: 0.6, step: 0.05, value: dzH, format: (v) => v.toFixed(2) }, (v) => (dzH = v));
    stage.ui.slider('Look-ahead Time', { min: 0, max: 1, step: 0.05, value: look, unit: 's' }, (v) => (look = v));
    stage.ui.toggle('Confiner 2D', confine, (v) => { confine = v; stage.log(v ? 'Confiner bật: khung hình bị giới hạn trong biên level.' : 'Confiner tắt: camera có thể lộ vùng ngoài map.', v ? 'info' : 'warn'); });
    stage.ui.group('Player');
    stage.ui.slider('Tốc độ', { min: 120, max: 600, step: 10, value: vmax, unit: ' u/s' }, (v) => (vmax = v));
    const rOff = stage.ui.readout('Lệch tâm màn hình', '0 px');
    stage.log('Player tự chạy theo đường số 8. Nhấn giữ trên Scene để tự điều khiển.');

    const inGame = () => stage.pointer.down && stage.pointer.y < V.gh;
    stage.onPointer('down', () => { if (inGame()) stage.log('Điều khiển tay: player chạy về phía con trỏ'); });

    function movePlayer(dt) {
      let tx, ty;
      if (inGame()) { tx = cam.x + (stage.pointer.x - V.gw / 2) / V.z; ty = cam.y + (stage.pointer.y - V.gh / 2) / V.z; }
      else { pathT += dt * vmax / 1250; tx = W / 2 + Math.cos(pathT) * (W / 2 - 90); ty = H / 2 + Math.sin(pathT * 2) * (H / 2 - 110); }
      const dx = tx - pl.x, dy = ty - pl.y, dist = Math.hypot(dx, dy), sp = Math.min(vmax, dist * 3);
      const k = 1 - Math.exp(-dt * 6);
      pl.vx += ((dist ? dx / dist * sp : 0) - pl.vx) * k; pl.vy += ((dist ? dy / dist * sp : 0) - pl.vy) * k;
      pl.x = U.clamp(pl.x + pl.vx * dt, 20, W - 20); pl.y = U.clamp(pl.y + pl.vy * dt, 20, H - 20);
    }
    function cinemachine(dt) {
      const vw = V.gw / V.z, vh = V.gh / V.z, s = 1 - Math.exp(-dt * 5);
      la.x += (pl.vx * look - la.x) * s; la.y += (pl.vy * look - la.y) * s;
      const tx = pl.x + la.x, ty = pl.y + la.y, hw = dzW * vw / 2, hh = dzH * vh / 2;
      const gx = tx - cam.x > hw ? tx - hw : tx - cam.x < -hw ? tx + hw : cam.x;
      const gy = ty - cam.y > hh ? ty - hh : ty - cam.y < -hh ? ty + hh : cam.y;
      const k = damping > 0 ? 1 - Math.exp((-4.6 * dt) / damping) : 1; // ~99% in `damping` seconds
      cam.x += (gx - cam.x) * k; cam.y += (gy - cam.y) * k;
      cam.x = U.clamp(cam.x, pl.x - vw * 0.45, pl.x + vw * 0.45); cam.y = U.clamp(cam.y, pl.y - vh * 0.45, pl.y + vh * 0.45); // hard limit
      if (confine) { cam.x = vw >= W ? W / 2 : U.clamp(cam.x, vw / 2, W - vw / 2); cam.y = vh >= H ? H / 2 : U.clamp(cam.y, vh / 2, H - vh / 2); }
    }

    stage.onFrame((dt) => {
      const camFirst = Math.random() < 0.5; // script execution order is undefined
      if (mode === 'update' && camFirst) { cam.x = pl.x; cam.y = pl.y; } // reads last frame's position
      movePlayer(dt);
      if (mode === 'update' && !camFirst) { cam.x = pl.x; cam.y = pl.y; }
      if (mode === 'late') { cam.x = pl.x; cam.y = pl.y; }
      if (mode === 'cm' && V.gw) cinemachine(dt);
      const off = (pl.x - cam.x) * V.z;
      hist.push(off); if (hist.length > 180) hist.shift();
      rOff.set(`${off.toFixed(1)} px`);
      render();
    });

    function render() {
      const { w, h } = stage, gw = w, gh = h - GRAPH, z = U.clamp(gw / 1000, 0.42, 1);
      V = { gw, gh, z };
      const ctx = d.ctx, SX = (x) => (x - cam.x) * z + gw / 2, SY = (y) => (y - cam.y) * z + gh / 2;
      d.clear(w, h, '#e6d9c5');
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, gw, gh); ctx.clip();
      for (let i = -20; i < 40; i++) d.line(SX(i * 120), SY(-600), SX(i * 120 + 600), SY(H + 600), { stroke: 'rgba(173,162,147,0.35)', lw: 1 });
      d.rect(SX(0), SY(0), W * z, H * z, { fill: C.paper, stroke: C.navy, lw: 3, r: 0 });
      for (let x = 100; x < W; x += 100) d.line(SX(x), SY(0), SX(x), SY(H), { stroke: 'rgba(206,192,173,0.45)', lw: 1 });
      for (let y = 100; y < H; y += 100) d.line(SX(0), SY(y), SX(W), SY(y), { stroke: 'rgba(206,192,173,0.45)', lw: 1 });
      props.forEach((p) => {
        const x = SX(p.x), y = SY(p.y);
        if (x < -50 || y < -50 || x > gw + 50 || y > gh + 50) return;
        if (p.tree) { d.circle(x, y + 3, p.r * z, { fill: 'rgba(24,33,61,0.08)' }); d.circle(x, y, p.r * z, { fill: '#8cc49b', stroke: C.green, lw: 2 }); }
        else d.rect(x - p.r * z * 0.6, y - p.r * z * 0.45, p.r * z * 1.2, p.r * z * 0.9, { fill: C.lineSoft, stroke: C.faint, lw: 1.5, r: 5 });
      });
      const px = SX(pl.x), py = SY(pl.y), a = Math.atan2(pl.vy, pl.vx);
      if (mode === 'cm' && look > 0) { d.line(px, py, SX(pl.x + la.x), SY(pl.y + la.y), { stroke: C.orange, lw: 1.5, dash: [4, 3] }); d.circle(SX(pl.x + la.x), SY(pl.y + la.y), 6, { stroke: C.orange, lw: 2.5 }); }
      d.circle(px, py, 15, { fill: C.teal, stroke: '#fff', lw: 3, shadow: 8 });
      d.poly([[px + Math.cos(a) * 22, py + Math.sin(a) * 22], [px + Math.cos(a + 2.5) * 10, py + Math.sin(a + 2.5) * 10], [px + Math.cos(a - 2.5) * 10, py + Math.sin(a - 2.5) * 10]], { fill: C.navy, close: true });
      ctx.restore();
      // Screen-space composer overlay
      if (mode === 'cm') {
        const dw = dzW * gw, dh = dzH * gh, x0 = (gw - dw) / 2, y0 = (gh - dh) / 2, tint = 'rgba(42,86,163,0.07)';
        d.rect(0, 0, gw, y0, { fill: tint, r: 0 }); d.rect(0, y0 + dh, gw, gh - y0 - dh, { fill: tint, r: 0 });
        d.rect(0, y0, x0, dh, { fill: tint, r: 0 }); d.rect(x0 + dw, y0, gw - x0 - dw, dh, { fill: tint, r: 0 });
        d.rect(x0, y0, dw, dh, { stroke: C.blue, lw: 1.5, dash: [6, 4], r: 2 });
        if (dw > 70) d.text('Dead Zone', x0 + 6, y0 + 10, { font: 'mono', size: 11, color: C.blue, weight: 600 });
      }
      d.line(gw / 2 - 7, gh / 2, gw / 2 + 7, gh / 2, { stroke: C.red, lw: 1.5 }); d.line(gw / 2, gh / 2 - 7, gw / 2, gh / 2 + 7, { stroke: C.red, lw: 1.5 });
      d.pill({ cm: 'Cinemachine', late: 'LateUpdate', update: 'Update (naive)' }[mode], 12, 20, { fill: mode === 'update' ? C.red : mode === 'late' ? C.navy : C.blue, size: 11 });
      // Minimap
      const mw = U.clamp(w * 0.26, 110, 200), mh = mw * H / W, mx = gw - mw - 12, my = 12, ms = mw / W;
      d.rect(mx - 4, my - 4, mw + 8, mh + 8, { fill: 'rgba(255,250,241,0.92)', stroke: C.line, lw: 1.5, r: 6, shadow: 6 });
      d.rect(mx, my, mw, mh, { fill: C.bg, stroke: confine ? C.green : C.navy, lw: confine ? 2 : 1, r: 2 });
      const vw = gw / z, vh = gh / z;
      d.rect(mx + (cam.x - vw / 2) * ms, my + (cam.y - vh / 2) * ms, vw * ms, vh * ms, { stroke: C.red, lw: 1.5, r: 1 });
      d.circle(mx + pl.x * ms, my + pl.y * ms, 3.5, { fill: C.teal });
      // Jitter graph
      d.rect(0, gh, w, GRAPH, { fill: C.paper, r: 0 }); d.line(0, gh, w, gh, { stroke: C.line, lw: 1.5 });
      const amp = Math.max(6, ...hist.map(Math.abs)) * 1.15, mid = gh + GRAPH / 2 + 6, gx0 = 12, gx1 = w - 12;
      d.text(`player lệch tâm X (px) · thang ±${amp.toFixed(0)}`, 12, gh + 11, { font: 'mono', size: 11, color: C.muted });
      d.line(gx0, mid, gx1, mid, { stroke: C.lineSoft, lw: 1 });
      if (hist.length > 1) d.poly(hist.map((v, i) => [gx0 + (i / 179) * (gx1 - gx0), mid - (v / amp) * (GRAPH / 2 - 12)]), { stroke: mode === 'update' ? C.red : C.blue, lw: 2 });
    }
  },
});
