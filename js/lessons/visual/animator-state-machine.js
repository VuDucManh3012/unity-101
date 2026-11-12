/* Lesson: Animator state machine — live graph (Idle/Walk/Run/Jump) driven by parameters, with cross-fade blending on a stick figure. */
U101.defineLesson('animator-state-machine', {
  lead: 'Animator Controller là một state machine. Mỗi state phát một Animation Clip, và các transition chuyển state khi điều kiện trên parameter (float, bool, trigger) thỏa mãn. Script chỉ cần cập nhật parameter.',
  hint: 'Kéo Speed để đi/chạy · bấm Jump (trigger) · tăng Transition Duration để thấy rõ đoạn blend giữa 2 clip',
  overview: `
    <p>Animator không bắt bạn viết <code>if (speed &gt; 3) PlayRun()</code>. Bạn vẽ <b>state</b> và <b>transition</b> trong cửa sổ Animator. Code chỉ cần gọi <code>SetFloat</code>, <code>SetBool</code> và <code>SetTrigger</code>.</p>
    <ul>
      <li><b>Parameter</b>: <code>Speed</code> (float), <code>IsGrounded</code> (bool), <code>Jump</code> (trigger). Trigger tự tắt ngay khi một transition dùng nó.</li>
      <li><b>Transition</b>: có điều kiện (<i>Conditions</i>), <i>Transition Duration</i> để blend hai clip và <i>Has Exit Time</i> để chờ clip chạy đến một mốc mới chuyển. Với chuyển động phản hồi theo input, thường nên tắt Has Exit Time.</li>
      <li><b>Any State</b>: transition từ đây có thể xảy ra ở bất kỳ state nào. Rất hợp cho Jump, Hit, Die.</li>
      <li><b>Blend Tree</b>: thay vì 3 state Idle/Walk/Run, bạn có thể gộp chúng thành một Blend Tree theo Speed để chuyển động mượt liên tục.</li>
    </ul>
    <p>Với cutscene có kịch bản (camera, animation, âm thanh, sự kiện xếp theo thời gian), hãy dùng <b>Timeline</b> (PlayableDirector) thay vì nhồi vào Animator.</p>
    <p class="callout">Trong lúc transition, hai clip được <b>trộn (blend)</b> với trọng số tăng dần. Đặt Duration = 0.5s rồi đổi nhanh Speed để thấy dáng người chuyển dần.</p>`,
  keyPoints: [
    'Script điều khiển parameter, Animator tự chọn state theo điều kiện transition.',
    'Trigger tự reset khi được tiêu thụ. Bool giữ nguyên giá trị cho đến khi bạn đổi nó.',
    'Transition Duration là khoảng thời gian cross-fade giữa hai clip.',
    'Dùng Animator.StringToHash để tránh so sánh chuỗi mỗi frame.',
  ],
  code: {
    title: 'PlayerAnimation.cs',
    source: `
using UnityEngine;

public class PlayerAnimation : MonoBehaviour
{
    [SerializeField] private Animator animator;
    [SerializeField] private CharacterController controller;

    static readonly int SpeedHash    = Animator.StringToHash("Speed");
    static readonly int GroundedHash = Animator.StringToHash("IsGrounded");
    static readonly int JumpHash     = Animator.StringToHash("Jump");

    void Update()
    {
        Vector3 v = controller.velocity;
        v.y = 0f;
        // dampTime 0.1s: Speed thay đổi mượt, tránh giật state
        animator.SetFloat(SpeedHash, v.magnitude, 0.1f, Time.deltaTime);
        animator.SetBool(GroundedHash, controller.isGrounded);

        if (controller.isGrounded && Input.GetButtonDown("Jump"))
            animator.SetTrigger(JumpHash); // tự reset khi transition dùng nó
    }
}`,
    note: 'Script không biết state hiện tại là gì. Nó chỉ báo dữ liệu, còn Animator Controller quyết định.',
  },
  tryIt: [
    'Kéo Speed lên 2: Idle → Walk. Lên 5: Walk → Run. Quan sát mũi tên transition sáng lên.',
    'Bấm Jump khi đang chạy: transition đi từ Any State, và trigger Jump tắt ngay sau đó.',
    'Bấm Jump lần nữa khi đang trên không: vì sao script bỏ qua?',
    'Đặt Transition Duration = 0 rồi 0.5s: so sánh độ mượt khi đổi state.',
    'Kéo Speed qua lại quanh 3.5 thật nhanh. Speed (đã damp) có đổi kịp không?',
  ],
  links: [
    { label: 'Animator Controller', url: 'https://docs.unity3d.com/Manual/class-AnimatorController.html' },
    { label: 'Animation transitions', url: 'https://docs.unity3d.com/Manual/class-Transition.html' },
    { label: 'Animation Parameters', url: 'https://docs.unity3d.com/Manual/AnimationParameters.html' },
    { label: 'Timeline', url: 'https://docs.unity3d.com/Packages/com.unity.timeline@1.8/manual/index.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const N = { Entry: [0.1, 0.1], Any: [0.88, 0.1], Idle: [0.13, 0.55], Walk: [0.5, 0.88], Run: [0.87, 0.55], Jump: [0.42, 0.1] };
    const p = { target: 2, speed: 0, grounded: true, jump: false };
    const T = [
      { from: 'Entry', to: 'Idle', cond: () => false, label: '' },
      { from: 'Any', to: 'Jump', cond: () => p.jump, label: 'Jump', trig: true },
      { from: 'Idle', to: 'Walk', cond: () => p.speed > 0.1, label: 'Speed > 0.1' },
      { from: 'Walk', to: 'Idle', cond: () => p.speed < 0.1, label: 'Speed < 0.1' },
      { from: 'Walk', to: 'Run', cond: () => p.speed > 3.5, label: 'Speed > 3.5' },
      { from: 'Run', to: 'Walk', cond: () => p.speed < 3.5, label: 'Speed < 3.5' },
      { from: 'Jump', to: 'Idle', cond: () => p.grounded, label: 'IsGrounded' },
    ];
    let cur = 'Idle', trans = null, dur = 0.25, normT = 0, ph = 0, scroll = 0;
    const ch = { y: 0, vy: 0 };
    const G = 16;

    stage.ui.group('Parameters');
    stage.ui.slider('Speed (input)', { min: 0, max: 6, step: 0.1, value: p.target, unit: ' m/s' }, (v) => (p.target = v));
    stage.ui.button('Jump (SetTrigger)', () => {
      if (!p.grounded) return stage.log('Đang trên không: script kiểm tra isGrounded nên không gọi SetTrigger.', 'warn');
      p.jump = true; p.grounded = false; ch.vy = 6;
      stage.log('animator.SetTrigger("Jump") · IsGrounded = false');
    }, { variant: 'primary' });
    const rSpeed = stage.ui.readout('Speed (damped)', '0.00');
    stage.ui.group('Transition');
    stage.ui.slider('Transition Duration', { min: 0, max: 0.6, step: 0.05, value: dur, unit: 's' }, (v) => (dur = v));
    const rState = stage.ui.readout('Current state', cur);
    stage.log('Entry → Idle (default state, màu cam)');

    function animatorUpdate(dt) {
      if (trans) {
        trans.t += dt;
        if (trans.t >= trans.dur) { cur = trans.tr.to; normT = trans.nt; trans = null; rState.set(cur); }
        return;
      }
      const tr = T.find((x) => (x.from === cur || (x.from === 'Any' && cur !== x.to)) && x.cond());
      if (!tr) return;
      if (tr.trig) p.jump = false;
      stage.log(`${tr.from === 'Any' ? 'Any State' : cur} → ${tr.to}  [${tr.label}]${tr.trig ? ' · trigger Jump đã được tiêu thụ' : ''}`);
      trans = { tr, from: cur, t: 0, dur, nt: 0 }; rState.set(`${cur} → ${tr.to}`);
      if (dur === 0) animatorUpdate(0);
    }

    stage.onFrame((dt) => {
      p.speed += (p.target - p.speed) * (1 - Math.exp(-dt / 0.1)); // SetFloat with dampTime 0.1
      if (Math.abs(p.speed - p.target) < 0.01) p.speed = p.target;
      if (!p.grounded) {
        ch.vy -= G * dt; ch.y += ch.vy * dt;
        if (ch.y <= 0) { ch.y = 0; ch.vy = 0; p.grounded = true; stage.log('Chạm đất → IsGrounded = true'); }
      }
      animatorUpdate(dt);
      normT = (normT + dt * 0.9) % 1; if (trans) trans.nt = (trans.nt + dt * 0.9) % 1;
      ph += dt * Math.PI * 2 * (0.5 + p.speed * 0.3);
      scroll += p.speed * dt * 46;
      rSpeed.set(p.speed.toFixed(2));
      render();
    });

    function pose(s) {
      const sn = Math.sin(ph), cs = Math.cos(ph);
      if (s === 'Walk') return { hl: 0.45 * sn, hr: -0.45 * sn, kl: 0.5 * Math.max(0, -cs), kr: 0.5 * Math.max(0, cs), al: -0.45 * sn, ar: 0.45 * sn, el: 0.3, lean: 0.06, bob: 2 * Math.abs(cs) };
      if (s === 'Run') return { hl: 0.85 * sn, hr: -0.85 * sn, kl: 1.3 * Math.max(0, -cs) + 0.2, kr: 1.3 * Math.max(0, cs) + 0.2, al: -1 * sn, ar: 1 * sn, el: 1.4, lean: 0.25, bob: 5 * Math.abs(cs) };
      if (s === 'Jump') return { hl: 0.9, hr: 0.2, kl: 1.4, kr: 1.1, al: -2.5, ar: -2.2, el: 0.3, lean: 0.08, bob: 0 };
      return { hl: 0.04, hr: -0.04, kl: 0.05, kr: 0.05, al: 0.08 + 0.04 * sn, ar: -0.08 - 0.04 * sn, el: 0.15, lean: 0, bob: 1.5 * Math.sin(ph * 0.5) };
    }
    function blendedPose() {
      if (!trans) return pose(cur);
      const a = pose(trans.from), b = pose(trans.tr.to), w = U.clamp(trans.t / trans.dur, 0, 1), o = {};
      Object.keys(a).forEach((k) => (o[k] = U.lerp(a[k], b[k], w)));
      return o;
    }

    function drawFigure(x, y, s, P) {
      const ctx = d.ctx; ctx.save(); ctx.lineCap = 'round';
      const hipY = y - 46 * s - P.bob * s, shX = x + Math.sin(P.lean) * 34 * s, shY = hipY - Math.cos(P.lean) * 34 * s;
      const limb = (ox, oy, a1, l1, a2, l2, col) => {
        const kx = ox + Math.sin(a1) * l1 * s, ky = oy + Math.cos(a1) * l1 * s;
        d.line(ox, oy, kx, ky, { stroke: col, lw: 6 * s }); d.line(kx, ky, kx + Math.sin(a2) * l2 * s, ky + Math.cos(a2) * l2 * s, { stroke: col, lw: 6 * s });
      };
      limb(x, hipY, P.hr, 24, P.hr - P.kr, 24, C.faint); limb(shX, shY, P.ar, 18, P.ar + P.el, 16, C.faint);
      d.line(x, hipY, shX, shY, { stroke: C.navy, lw: 8 * s });
      limb(x, hipY, P.hl, 24, P.hl - P.kl, 24, C.navy2); limb(shX, shY, P.al, 18, P.al + P.el, 16, C.navy2);
      d.circle(shX + Math.sin(P.lean) * 13 * s, shY - 13 * s, 10 * s, { fill: C.orange, stroke: C.navy, lw: 2 });
      ctx.restore();
    }

    function render() {
      const { w, h } = stage, wide = w >= 680;
      d.clear(w, h); d.grid(w, h);
      const g = wide ? { x: 0, y: 0, w: w * 0.6, h } : { x: 0, y: 0, w, h: h * 0.62 };
      const c = wide ? { x: w * 0.6, y: 0, w: w * 0.4, h } : { x: 0, y: h * 0.62, w, h: h * 0.38 };
      // Graph
      d.text('Base Layer', g.x + 16, 18, { font: 'mono', size: 11, weight: 600, color: C.muted });
      const nw = Math.min(118, g.w * 0.22), nh = 36, P = (k) => [g.x + 14 + N[k][0] * (g.w - 28), g.y + 22 + N[k][1] * (g.h - 44)];
      T.forEach((tr) => {
        const [x1, y1] = P(tr.from), [x2, y2] = P(tr.to), len = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        const off = T.some((o) => o.from === tr.to && o.to === tr.from) ? 7 : 0;
        const a = [x1 + nx * off, y1 + ny * off], b = [x2 + nx * off, y2 + ny * off], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const active = trans && trans.tr === tr;
        const col = active ? C.blue : C.line;
        d.line(a[0], a[1], b[0], b[1], { stroke: col, lw: active ? 3.5 : 2 });
        d.arrow(m[0] - (x2 - x1) / len * 8, m[1] - (y2 - y1) / len * 8, m[0] + (x2 - x1) / len * 4, m[1] + (y2 - y1) / len * 4, { stroke: active ? C.blue : C.muted, head: 9 });
        if (active) { const k = U.clamp(trans.t / trans.dur, 0, 1); d.circle(U.lerp(a[0], b[0], k), U.lerp(a[1], b[1], k), 5, { fill: C.blue, stroke: '#fff', lw: 2 }); }
        if (tr.label) {
          const lx = m[0] + nx * (off ? 16 : 14), ly = m[1] + ny * (off ? 16 : 14), lw = d.measure(tr.label, { font: 'mono', size: 11 }) + 8;
          d.rect(lx - lw / 2, ly - 8, lw, 16, { fill: active ? C.blue : 'rgba(255,250,241,0.92)', r: 4 });
          d.text(tr.label, lx, ly, { align: 'center', font: 'mono', size: 11, color: active ? '#fff' : (tr.cond() ? C.green : C.muted), weight: 600 });
        }
      });
      Object.keys(N).forEach((k) => {
        const [x, y] = P(k), on = k === cur || (trans && trans.tr.to === k);
        const style = k === 'Entry' ? { fill: '#d8eedf', accent: C.green } : k === 'Any' ? { fill: '#d3ecea', accent: C.teal } : k === 'Idle' ? { fill: '#f6dcc8', accent: C.orange } : { fill: C.card, accent: C.line };
        d.node(x - nw / 2, y - nh / 2, nw, nh, k === 'Any' ? 'Any State' : k, { ...style, accent: on ? C.blue : style.accent, lw: on ? 3 : 2, size: 14 });
        const prog = k === cur ? (trans ? 1 - U.clamp(trans.t / trans.dur, 0, 1) : 1) : trans && trans.tr.to === k ? U.clamp(trans.t / trans.dur, 0, 1) : 0;
        if (prog > 0) {
          const t = k === cur ? normT : trans.nt;
          d.rect(x - nw / 2 + 6, y + nh / 2 - 7, nw - 12, 4, { fill: C.lineSoft, r: 2 });
          d.rect(x - nw / 2 + 6, y + nh / 2 - 7, (nw - 12) * t, 4, { fill: C.blue, r: 2 });
        }
      });
      // Character panel
      d.node(c.x + 10, c.y + 10, c.w - 20, c.h - 20, null, { fill: C.paper, accent: C.lineSoft, shadow: 4 });
      const gy = c.y + c.h - (wide ? 40 : 24), cx = c.x + c.w * (wide ? 0.5 : 0.68), s = U.clamp(Math.min(c.w / 200, c.h / 300), 0.6, 1.5);
      d.line(c.x + 22, gy, c.x + c.w - 22, gy, { stroke: C.navy, lw: 2 });
      for (let x = c.x + 22 - (scroll % 30); x < c.x + c.w - 22; x += 30) if (x > c.x + 22) d.line(x, gy + 4, x - 8, gy + 12, { stroke: C.trace, lw: 2 });
      d.circle(cx, gy, Math.max(4, 20 - ch.y * 6) * s, { fill: 'rgba(24,33,61,0.12)' });
      drawFigure(cx, gy - ch.y * 34 * s, s, blendedPose());
      d.pill(trans ? `${trans.from} → ${trans.tr.to} · ${Math.round(100 * U.clamp(trans.t / trans.dur, 0, 1))}%` : cur, Math.min(cx, c.x + c.w - 110), c.y + (wide ? 32 : 24), { align: 'center', fill: trans ? C.blue : C.navy });
      // Parameter list (Animator "Parameters" tab)
      const px = c.x + 26, py = c.y + (wide ? 64 : 30);
      d.text(`Speed  ${p.speed.toFixed(2)}`, px, py, { font: 'mono', size: 11, color: C.navy, weight: 600 });
      d.rect(px, py + 9, 90, 4, { fill: C.lineSoft, r: 2 });
      d.rect(px, py + 9, 90 * p.speed / 6, 4, { fill: C.teal, r: 2 });
      d.rect(px, py + 24, 12, 12, { fill: p.grounded ? C.green : '#fff', stroke: C.navy, lw: 1.5, r: 3 });
      d.text('IsGrounded', px + 18, py + 30, { font: 'mono', size: 11, color: C.navy });
      d.circle(px + 6, py + 52, 6, { fill: p.jump ? C.orange : '#fff', stroke: C.navy, lw: 1.5 });
      d.text('Jump (trigger)', px + 18, py + 52, { font: 'mono', size: 11, color: C.navy });
    }
  },
});
