/* Lesson: Multiplayer lag — client vs server views with latency/loss, prediction + reconciliation, interpolation, lag compensation. */
U101.defineLesson('netcode-prediction', {
  lead: 'Mạng luôn có độ trễ. Server giữ trạng thái "thật", còn client phải dùng vài kỹ thuật để game vẫn mượt: tự đoán chuyển động của mình, nội suy người chơi khác, và để server "tua lại thời gian" khi xử lý phát bắn.',
  hint: 'Click trong khung CLIENT để chọn điểm đến cho A · click trúng B (đỏ) để bắn hitscan · kéo Latency/Packet loss rồi bật tắt từng kỹ thuật',
  overview: `
    <p>Trong mô hình <b>server-authoritative</b> (Netcode for GameObjects, Photon Fusion, Mirror), client chỉ gửi <b>input</b>. Server mô phỏng rồi gửi lại <b>snapshot</b> trạng thái. Mỗi chiều mất khoảng RTT/2.</p>
    <ul>
      <li><b>Client-side prediction</b>: client áp dụng input của mình ngay lập tức, không chờ server. Nhân vật phản hồi tức thì.</li>
      <li><b>Server reconciliation</b>: khi snapshot về, client đặt lại vị trí theo server rồi <b>chạy lại các input server chưa xử lý</b> (pending). Thiếu bước này, nhân vật sẽ bị giật lùi (rubber-banding).</li>
      <li><b>Entity interpolation</b>: người chơi khác được vẽ <b>trễ khoảng 100ms</b>, nội suy giữa 2 snapshot. Bù lại thì chuyển động mượt dù snapshot chỉ tới 20 lần/giây.</li>
      <li><b>Lag compensation</b>: client bắn vào thứ nó <i>thấy</i>, tức là quá khứ. Server lưu lịch sử vị trí và <b>tua lại</b> mục tiêu về đúng thời điểm đó để kiểm tra trúng hay trật.</li>
    </ul>
    <p>Trong NGO: <code>NetworkVariable</code> do server ghi để đồng bộ trạng thái. <code>ServerRpc</code> (NGO 2.x: <code>[Rpc(SendTo.Server)]</code>) để client gửi input. <code>NetworkTransform</code> đã có sẵn interpolation. Photon Fusion có sẵn prediction và lag-compensated hitbox.</p>
    <p class="callout">Bóng nét đứt là <b>ghost</b>: ở khung client là vị trí server báo về gần nhất, ở khung server là cái client đang hiển thị. Khoảng cách giữa vật thật và ghost chính là độ trễ.</p>`,
  keyPoints: [
    'Client gửi input, server quyết định trạng thái. Đừng tin vị trí do client gửi.',
    'Prediction + Reconciliation: phản hồi tức thì nhưng vẫn khớp với server.',
    'Interpolation: vẽ người chơi khác ở quá khứ gần (~100ms) để mượt.',
    'Lag compensation: server tua lại hitbox về thời điểm client thấy khi bắn.',
  ],
  code: [{
    title: 'NetPlayer.cs',
    source: `
using System.Collections.Generic;
using Unity.Netcode;
using UnityEngine;

public struct MoveState : INetworkSerializable {
    public Vector2 Pos; public int LastInput;
    public void NetworkSerialize<T>(BufferSerializer<T> s) where T : IReaderWriter { s.SerializeValue(ref Pos); s.SerializeValue(ref LastInput); }
}

public class NetPlayer : NetworkBehaviour
{
    [SerializeField] private float speed = 3f;
    private readonly NetworkVariable<MoveState> state = new();   // chỉ server ghi
    private readonly List<(int seq, Vector2 dir)> pending = new();
    private int seq;
    private float Dt => 1f / NetworkManager.NetworkTickSystem.TickRate;

    public override void OnNetworkSpawn() { if (IsOwner) state.OnValueChanged += Reconcile; }
    public override void OnNetworkDespawn() { if (IsOwner) state.OnValueChanged -= Reconcile; }

    void FixedUpdate()   // giả sử fixed timestep = tick mạng
    {
        if (!IsOwner) return;
        Vector2 dir = Vector2.ClampMagnitude(new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical")), 1f);
        pending.Add((++seq, dir));
        transform.position += (Vector3)(dir * speed * Dt);   // 1. prediction
        MoveServerRpc(dir, seq);
    }

    [ServerRpc]   // 2. server mô phỏng với input đã kiểm tra
    void MoveServerRpc(Vector2 dir, int s)
    {
        var st = state.Value;
        st.Pos += Vector2.ClampMagnitude(dir, 1f) * speed * Dt; st.LastInput = s;
        state.Value = st;
    }

    void Reconcile(MoveState _, MoveState server)   // 3. reconciliation
    {
        pending.RemoveAll(p => p.seq <= server.LastInput);
        Vector2 pos = server.Pos;
        foreach (var p in pending) pos += p.dir * speed * Dt;   // chạy lại input chưa xác nhận
        transform.position = pos;
    }
}`,
    note: 'Server chỉ nhận hướng (đã clamp), không nhận vị trí nên client không thể "teleport". Reconcile = lấy trạng thái server rồi replay pending input.',
  }, {
    title: 'LagCompensation.cs',
    source: `
// Server lưu lịch sử vị trí hitbox để "tua lại" khi xử lý phát bắn
public class HitboxHistory : NetworkBehaviour
{
    private readonly List<(double t, Vector3 pos)> history = new();

    void FixedUpdate()
    {
        if (!IsServer) return;
        history.Add((NetworkManager.ServerTime.Time, transform.position));
        if (history.Count > 64) history.RemoveAt(0);   // ~1 giây
    }

    public Vector3 PositionAt(double t)
    {
        for (int i = history.Count - 1; i > 0; i--)
            if (history[i - 1].t <= t)
                return Vector3.Lerp(history[i - 1].pos, history[i].pos,
                    (float)((t - history[i - 1].t) / (history[i].t - history[i - 1].t)));
        return transform.position;
    }
}

// Trong vũ khí: client gửi thời điểm của khung hình nó nhìn thấy
[ServerRpc]
void FireServerRpc(Vector3 aimPoint, double viewTime)
{
    foreach (var target in targets)
        if (Vector3.Distance(target.PositionAt(viewTime), aimPoint) < hitRadius)
            target.ApplyDamage(25);
}`,
    note: 'viewTime ≈ thời gian server − RTT/2 − interpolation delay. Giới hạn số ms được tua lại để chống lạm dụng.',
  }],
  tryIt: [
    'Tắt Prediction với latency 300ms: A phản hồi chậm hẳn so với cú click.',
    'Bật Prediction nhưng tắt Reconciliation: A bị giật lùi mỗi khi snapshot về.',
    'Tăng Packet loss lên 20% khi bật Reconciliation. Console báo lệch bao nhiêu và đã sửa lại.',
    'Tắt Interpolation: B (người chơi khác) nhảy cóc theo từng snapshot 20Hz.',
    'Tắt Lag compensation rồi click bắn vào B: server báo trượt dù trên màn hình bạn bắn trúng.',
  ],
  links: [
    { label: 'Netcode for GameObjects', url: 'https://docs-multiplayer.unity3d.com/netcode/current/about/' },
    { label: 'NGO: Lag & packet loss', url: 'https://docs-multiplayer.unity3d.com/netcode/current/learn/lagandpacketloss/' },
    { label: 'Gabriel Gambetta: Fast-Paced Multiplayer', url: 'https://www.gabrielgambetta.com/client-server-game-architecture.html' },
    { label: 'Photon Fusion: Lag Compensation', url: 'https://doc.photonengine.com/fusion/current/manual/advanced/lag-compensation' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const WW = 10, WH = 6, SPEED = 3, IN_DT = 1 / 30, SNAP_DT = 1 / 20, INTERP = 0.1, HIT_R = 0.45;
    const WAYS = [[1.5, 1.2], [3.8, 4.8], [6.2, 1.2], [8.5, 4.8]];
    let rtt = 0.2, loss = 0, predict = true, reconcile = true, interp = true, lagComp = true, auto = true;
    let now = 0, inAcc = 0, snapAcc = 0, seq = 0, way = 0, target = { x: 1.5, y: 1.2 }, events = [], packets = [], logAt = {};
    const sv = { A: { x: 2, y: 3 }, B: { x: 5, y: 3 }, last: 0, hist: [] };
    const cl = { A: { x: 2, y: 3 }, pending: [], snapA: { x: 2, y: 3 }, buf: [], B: { x: 5, y: 3 }, viewT: 0 };
    let shotC = null, shotS = null;

    const say = (key, gap, msg, lvl) => { if ((logAt[key] ?? -9) + gap <= now) { logAt[key] = now; stage.log(msg, lvl); } };
    const later = (dt, fn) => events.push({ at: now + dt, fn });
    function send(kind, lossy, fn) {
      const lost = lossy && Math.random() < loss, p = { kind, t0: now, t1: now + rtt / 2, lost };
      packets.push(p); if (!lost) later(rtt / 2, fn);
    }
    const move = (p, dx, dy) => { p.x = U.clamp(p.x + dx * SPEED * IN_DT, 0.3, WW - 0.3); p.y = U.clamp(p.y + dy * SPEED * IN_DT, 0.3, WH - 0.3); };
    const botAt = (t) => ({ x: 5 + 3.6 * Math.sin(t * 0.9), y: 3 + 1.9 * Math.sin(t * 1.7) });

    function inputTick() {
      const dx0 = target.x - cl.A.x, dy0 = target.y - cl.A.y, dd = Math.hypot(dx0, dy0);
      if (dd < 0.15 && auto) { way = (way + 1) % WAYS.length; target = { x: WAYS[way][0], y: WAYS[way][1] }; }
      const k = dd < 0.08 ? 0 : 1 / Math.max(dd, 1e-6), inp = { seq: ++seq, dx: dx0 * k * Math.min(1, dd * 4), dy: dy0 * k * Math.min(1, dd * 4) };
      if (predict) { move(cl.A, inp.dx, inp.dy); cl.pending.push(inp); }
      send('in', true, () => { move(sv.A, inp.dx, inp.dy); sv.last = inp.seq; });
    }
    function serverTick() {
      sv.B = botAt(now); sv.hist.push({ t: now, ...sv.B }); if (sv.hist.length > 40) sv.hist.shift();
      const snap = { t: now, A: { ...sv.A }, last: sv.last, B: { ...sv.B } };
      send('snap', true, () => receive(snap));
    }
    function receive(s) {
      cl.snapA = s.A; cl.buf.push({ ...s.B, t: s.t, rt: now }); if (cl.buf.length > 30) cl.buf.shift();
      const before = { ...cl.A };
      Object.assign(cl.A, s.A);
      if (predict && reconcile) {
        cl.pending = cl.pending.filter((p) => p.seq > s.last);
        cl.pending.forEach((p) => move(cl.A, p.dx, p.dy));
        const err = U.dist(before.x, before.y, cl.A.x, cl.A.y);
        if (err > 0.12) say('rec', 1.5, `Reconcile: lệch ${err.toFixed(2)}u so với server → sửa, replay ${cl.pending.length} input`, 'warn');
      } else if (!predict) cl.pending = [];
      else if (U.dist(before.x, before.y, cl.A.x, cl.A.y) > 0.2) say('rub', 2, 'Không reconcile: A bị kéo lùi về vị trí cũ của server (rubber-banding)', 'warn');
    }
    function clientB() {
      const last = cl.buf[cl.buf.length - 1]; if (!last) return;
      if (!interp) { Object.assign(cl.B, { x: last.x, y: last.y }); cl.viewT = last.t; return; }
      const rt = now - INTERP;
      for (let i = cl.buf.length - 1; i > 0; i--) {
        const a = cl.buf[i - 1], b = cl.buf[i];
        if (a.rt <= rt) { const k = U.clamp((rt - a.rt) / (b.rt - a.rt || 1), 0, 1); Object.assign(cl.B, { x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k) }); cl.viewT = U.lerp(a.t, b.t, k); return; }
      }
    }
    function shoot(aim) {
      const viewT = cl.viewT; shotC = { ...aim, until: now + 1.2 };
      send('shot', false, () => {
        let tgt = sv.B, rew = null;
        if (lagComp) { const h = sv.hist, i = h.findIndex((e) => e.t >= viewT); if (i > 0) { const a = h[i - 1], b = h[i], k = (viewT - a.t) / (b.t - a.t); rew = tgt = { x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k) }; } }
        const hit = U.dist(aim.x, aim.y, tgt.x, tgt.y) < HIT_R;
        shotS = { ...aim, rew, hit, until: now + 1.4 };
        stage.log(`Server xử lý phát bắn: ${hit ? 'TRÚNG' : 'TRƯỢT'}${lagComp ? ` (tua lại ${((now - viewT) * 1000).toFixed(0)}ms)` : ' (so với vị trí B hiện tại)'}`, hit ? 'info' : 'error');
      });
    }

    function step(dt) {
      now += dt;
      for (inAcc += dt; inAcc >= IN_DT; inAcc -= IN_DT) inputTick();
      for (snapAcc += dt; snapAcc >= SNAP_DT; snapAcc -= SNAP_DT) serverTick();
      const due = events.filter((e) => e.at <= now); events = events.filter((e) => e.at > now); due.forEach((e) => e.fn());
      packets = packets.filter((p) => now < p.t1 + (p.lost ? 0.3 : 0));
      clientB();
    }

    stage.ui.group('Mạng');
    stage.ui.slider('Latency (RTT)', { min: 0, max: 600, step: 10, value: rtt * 1000, unit: ' ms' }, (v) => (rtt = v / 1000));
    stage.ui.slider('Packet loss', { min: 0, max: 40, value: 0, unit: '%' }, (v) => (loss = v / 100));
    stage.ui.group('Kỹ thuật');
    const tg = (label, val, fn, on, off) => stage.ui.toggle(label, val, (v) => { fn(v); stage.log(v ? on : off); });
    tg('Client-side prediction', predict, (v) => (predict = v), 'Prediction BẬT: A di chuyển ngay khi có input.', 'Prediction TẮT: A chỉ di chuyển khi snapshot server về (trễ 1 RTT).');
    tg('Server reconciliation', reconcile, (v) => (reconcile = v), 'Reconciliation BẬT: đặt theo server rồi replay pending input.', 'Reconciliation TẮT: snapshot ghi đè vị trí dự đoán.');
    tg('Entity interpolation', interp, (v) => (interp = v), `Interpolation BẬT: B được vẽ trễ ${INTERP * 1000}ms, nội suy giữa 2 snapshot.`, 'Interpolation TẮT: B nhảy theo từng snapshot.');
    tg('Lag compensation', lagComp, (v) => (lagComp = v), 'Lag compensation BẬT: server tua lại B khi xét phát bắn.', 'Lag compensation TẮT: server so với vị trí B hiện tại.');
    stage.ui.toggle('A tự di chuyển', auto, (v) => (auto = v));
    stage.ui.button('Bắn B (hitscan)', () => shoot({ ...cl.B }), { variant: 'accent' });
    const roPend = stage.ui.readout('Pending input', '0'), roErr = stage.ui.readout('Client A ↔ Server A', '—');

    function layout() { // chọn đặt cạnh nhau hay chồng lên nhau, cách nào cho khung lớn hơn
      const { w, h } = stage, pad = 14, head = 24, fit = (aw, ah) => Math.min(aw, ah * WW / WH);
      const vwW = fit((w - pad * 2 - 64) / 2, h - pad * 2 - head - 26), vwS = fit(w - pad * 2, (h - pad * 2 - 44 - head * 2 - 20) / 2);
      const wide = vwW >= vwS, vw = wide ? vwW : vwS, vh = vw * WH / WW, gap = wide ? 64 : 44;
      const cx = wide ? (w - vw * 2 - gap) / 2 : (w - vw) / 2, cy = pad + head;
      return { wide, vw, vh, c: { x: cx, y: cy }, s: wide ? { x: cx + vw + gap, y: cy } : { x: cx, y: cy + vh + gap + head }, k: vw / WW };
    }
    const P = (L, v, p) => [v.x + p.x * L.k, v.y + p.y * L.k];

    stage.onPointer('down', (x, y) => {
      const L = layout(), wx = (x - L.c.x) / L.k, wy = (y - L.c.y) / L.k;
      if (wx < 0 || wy < 0 || wx > WW || wy > WH) return;
      if (U.dist(wx, wy, cl.B.x, cl.B.y) < 0.6) return shoot({ x: wx, y: wy });
      auto = false; target = { x: wx, y: wy };
    });
    stage.onFrame((dt) => { step(dt); render(); });
    stage.onResize(() => render());

    function view(L, v, title, sub, accent) {
      d.text(title, v.x, v.y - 12, { font: 'cond', weight: 700, size: 15, color: accent });
      if (d.measure(title, { font: 'cond', weight: 700, size: 15 }) + d.measure(sub, { font: 'mono', size: 11 }) + 12 < L.vw) d.text(sub, v.x + L.vw, v.y - 12, { align: 'right', font: 'mono', size: 11, color: C.muted });
      d.rect(v.x, v.y, L.vw, L.vh, { fill: C.card, stroke: accent, lw: 2, r: 10, shadow: 8 });
    }
    function ent(L, v, p, col, label, ghost) {
      const [x, y] = P(L, v, p), r = 0.35 * L.k;
      if (ghost) return d.circle(x, y, r, { stroke: col, lw: 2, dash: [4, 3] });
      d.circle(x, y, r, { fill: col, stroke: '#fff', lw: 2, shadow: 5 });
      d.text(label, x, y + 1, { align: 'center', font: 'cond', weight: 700, size: Math.max(11, r), color: '#fff' });
    }
    function marker(L, v, s, col) { const [x, y] = P(L, v, s); d.line(x - 8, y, x + 8, y, { stroke: col, lw: 2 }); d.line(x, y - 8, x, y + 8, { stroke: col, lw: 2 }); d.circle(x, y, HIT_R * L.k, { stroke: col, lw: 1.5 }); }

    function render() {
      const { w, h } = stage, L = layout(), V = L.c, S = L.s;
      d.clear(w, h); d.grid(w, h);
      view(L, V, 'CLIENT · bạn điều khiển A', `RTT ${Math.round(rtt * 1000)}ms`, C.teal);
      view(L, S, 'SERVER · authoritative', `${Math.round(1 / SNAP_DT)} snapshot/s`, C.navy);
      // packets
      const a = L.wide ? [V.x + L.vw, V.y + L.vh / 2] : [V.x + L.vw / 2, V.y + L.vh], b = L.wide ? [S.x, S.y + L.vh / 2] : [S.x + L.vw / 2, S.y];
      const off = (s) => (L.wide ? [0, s] : [s, 0]);
      d.line(a[0] + off(-8)[0], a[1] + off(-8)[1], b[0] + off(-8)[0], b[1] + off(-8)[1], { stroke: C.lineSoft, lw: 2, dash: [3, 4] });
      d.line(a[0] + off(8)[0], a[1] + off(8)[1], b[0] + off(8)[0], b[1] + off(8)[1], { stroke: C.lineSoft, lw: 2, dash: [3, 4] });
      packets.forEach((p) => {
        const up = p.kind !== 'snap', k = U.clamp((now - p.t0) / Math.max(1e-3, p.t1 - p.t0), 0, 1) * (p.lost ? 0.5 : 1), [o1, o2] = off(up ? -8 : 8);
        const x = U.lerp(up ? a[0] : b[0], up ? b[0] : a[0], k) + o1, y = U.lerp(up ? a[1] : b[1], up ? b[1] : a[1], k) + o2;
        if (p.lost) { d.text('✕', x, y, { align: 'center', size: 13, weight: 700, color: C.red }); return; }
        d.circle(x, y, p.kind === 'shot' ? 6 : 3.5, { fill: p.kind === 'snap' ? C.teal : p.kind === 'shot' ? C.red : C.orange });
      });
      // client view
      const [tx, ty] = P(L, V, target);
      d.circle(tx, ty, 5, { stroke: C.teal, lw: 1.5 }); d.line(tx - 9, ty, tx + 9, ty, { stroke: C.teal, lw: 1 }); d.line(tx, ty - 9, tx, ty + 9, { stroke: C.teal, lw: 1 });
      ent(L, V, cl.snapA, C.blue, '', true); ent(L, V, cl.buf.length ? cl.buf[cl.buf.length - 1] : sv.B, C.red, '', true);
      ent(L, V, cl.B, C.red, 'B'); ent(L, V, cl.A, C.blue, 'A');
      if (shotC && now < shotC.until) marker(L, V, shotC, C.red);
      // server view
      ent(L, S, cl.A, C.blue, '', true); ent(L, S, cl.B, C.red, '', true);
      ent(L, S, sv.B, C.red, 'B'); ent(L, S, sv.A, C.blue, 'A');
      if (shotS && now < shotS.until) {
        if (shotS.rew) { const [rx, ry] = P(L, S, shotS.rew); d.circle(rx, ry, 0.35 * L.k, { fill: 'rgba(138,115,224,0.35)', stroke: C.purple, lw: 2 }); d.text('rewind', rx, ry - 0.35 * L.k - 9, { align: 'center', font: 'mono', size: 11, color: C.purple }); }
        marker(L, S, shotS, shotS.hit ? C.green : C.red);
        const [mx, my] = P(L, S, shotS); d.pill(shotS.hit ? 'HIT' : 'MISS', mx, my + HIT_R * L.k + 14, { align: 'center', fill: shotS.hit ? C.green : C.red, size: 11 });
      }
      const ly = L.wide ? V.y + L.vh + 16 : h - 10, err = U.dist(cl.A.x, cl.A.y, sv.A.x, sv.A.y);
      let lx = V.x;
      [['input', C.orange], ['snapshot', C.teal], ['shot', C.red], ['◌ ghost = vị trí ở phía bên kia', null]].forEach(([t, col]) => {
        if (col) { d.circle(lx + 4, ly, 4, { fill: col }); lx += 12; }
        d.text(t, lx, ly, { font: 'mono', size: 11, color: C.muted }); lx += d.measure(t, { font: 'mono', size: 11 }) + 14;
      });
      const side = Math.min(V.x, w - V.x - L.vw) - 24;
      if (!L.wide && side >= 150) { // thẻ trạng thái ở khoảng trống hai bên
        const rows = [['Prediction', predict], ['Reconcile', reconcile], ['Interpolation', interp], ['Lag comp', lagComp]];
        d.node(12, V.y, side, 30 + rows.length * 20 + 40, null, { accent: C.purple });
        rows.forEach(([k, on], i) => { d.circle(26, V.y + 22 + i * 20, 5, { fill: on ? C.green : C.line }); d.text(k, 38, V.y + 22 + i * 20, { font: 'mono', size: 11, color: on ? C.navy : C.faint }); });
        d.text(`pending ${cl.pending.length}`, 20, V.y + 30 + rows.length * 20, { font: 'mono', size: 11, color: C.muted });
        d.text(`lệch ${err.toFixed(2)}u`, 20, V.y + 50 + rows.length * 20, { font: 'mono', size: 11, color: C.muted });
      }
      roPend.set(String(cl.pending.length)); roErr.set(err.toFixed(2) + 'u');
    }

    for (let i = 0; i < 150; i++) { step(1 / 60); if (i === 120) shoot({ ...cl.B }); } // làm nóng để cảnh đầu có dữ liệu
    stage.log('Client A gửi input 30 lần/s, server gửi snapshot 20 lần/s. Chấm cam = input, chấm teal = snapshot.');
    render();
  },
});
