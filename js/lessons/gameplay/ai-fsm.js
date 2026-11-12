/* Lesson: Finite State Machine — a guard enemy (Patrol/Chase/Attack/Search) with a live state diagram. */
U101.defineLesson('ai-fsm', {
  lead: 'Finite State Machine (FSM) chia hành vi AI thành các trạng thái rời rạc. Tại mỗi thời điểm NPC chỉ ở đúng một state, và chuyển sang state khác khi một điều kiện (transition) thỏa mãn.',
  hint: 'Di chuột trong sân để điều khiển Player · đi vào nón nhìn (FOV) của lính gác rồi chạy ra xa',
  overview: `
    <p>Lính gác trong game stealth là ví dụ kinh điển của FSM. Mỗi state chỉ lo <b>một việc</b>, còn các transition quyết định khi nào đổi việc:</p>
    <ul>
      <li><b>Patrol</b>: đi vòng qua các waypoint. Thấy Player → <b>Chase</b>.</li>
      <li><b>Chase</b>: chạy về phía Player. Đủ gần → <b>Attack</b>. Mất dấu → <b>Search</b>.</li>
      <li><b>Attack</b>: đứng lại và bắn. Player chạy ra xa → quay lại <b>Chase</b>.</li>
      <li><b>Search</b>: đi tới vị trí cuối cùng nhìn thấy Player rồi nhìn quanh. Hết giờ → <b>Patrol</b>.</li>
    </ul>
    <p>"Thấy" ở đây gồm 2 phép thử: khoảng cách &lt; <code>viewRange</code> và góc giữa hướng nhìn với Player &lt; <code>FOV/2</code> (dùng <code>Vector3.Angle</code> hoặc Dot product). Game thật còn bắn thêm <code>Physics.Raycast</code> để kiểm tra tường che.</p>
    <p class="callout">Để ý vùng đệm: vào Attack khi khoảng cách &lt; attackRange, nhưng chỉ quay lại Chase khi &gt; attackRange × 1.3. Không có vùng đệm (hysteresis), AI sẽ giật qua lại giữa 2 state mỗi frame.</p>
    <p><b>Decision Tree</b> là cách khác để ra quyết định: mỗi frame đi từ gốc qua các câu hỏi có/không (<i>thấy Player?</i> → <i>đủ gần?</i>) tới một lá là hành động. Cây không nhớ state cũ; FSM thì nhớ, nên dễ làm các hành vi kéo dài như Search. Animator Controller của Unity cũng chính là một FSM.</p>`,
  keyPoints: [
    'FSM = tập state + transition. Tại một thời điểm chỉ có một state đang chạy.',
    'Mỗi state có Enter / Update / Exit, giúp code của từng hành vi tách riêng, dễ debug.',
    'Dùng hysteresis hoặc thời gian chờ để transition không bị giật qua lại.',
    'Khi số state tăng nhiều, cân nhắc Hierarchical FSM hoặc Behaviour Tree.',
  ],
  code: [{
    title: 'GuardAI.cs',
    source: `
using UnityEngine;

public class GuardAI : MonoBehaviour
{
    enum State { Patrol, Chase, Attack, Search }

    [SerializeField] private Transform player;
    [SerializeField] private Transform[] waypoints;
    [SerializeField] private float viewRange = 10f, fov = 90f, attackRange = 2f;
    private State state = State.Patrol;
    private Vector3 lastKnownPos;
    private float stateTime;

    void Update()
    {
        stateTime += Time.deltaTime;
        bool sees = CanSee();
        if (sees) lastKnownPos = player.position;
        float dist = Vector3.Distance(transform.position, player.position);

        switch (state)
        {
            case State.Patrol: Patrol(); if (sees) ChangeState(State.Chase); break;
            case State.Chase:  MoveTo(player.position);
                if (!sees) ChangeState(State.Search);
                else if (dist < attackRange) ChangeState(State.Attack); break;
            case State.Attack: Shoot(); if (dist > attackRange * 1.3f) ChangeState(State.Chase); break;
            case State.Search: MoveTo(lastKnownPos);
                if (sees) ChangeState(State.Chase);
                else if (stateTime > 3f) ChangeState(State.Patrol); break;
        }
    }

    bool CanSee()
    {
        Vector3 toPlayer = player.position - transform.position;
        return toPlayer.magnitude < viewRange
            && Vector3.Angle(transform.forward, toPlayer) < fov * 0.5f
            && !Physics.Raycast(transform.position, toPlayer, toPlayer.magnitude, LayerMask.GetMask("Wall"));
    }

    void ChangeState(State next) { Debug.Log($"{state} → {next}"); state = next; stateTime = 0f; }
    void Patrol() { /* đi lần lượt qua waypoints */ }
    void MoveTo(Vector3 p) { /* NavMeshAgent.SetDestination(p) */ }
    void Shoot() { /* cooldown + bắn */ }
}`,
    note: 'Cách đơn giản nhất: enum + switch. ChangeState là nơi duy nhất đổi state nên dễ log và reset stateTime.',
  }, {
    title: 'IState.cs',
    source: `
public interface IState
{
    void Enter();
    void Tick();
    void Exit();
}

public class StateMachine
{
    public IState Current { get; private set; }

    public void ChangeState(IState next)
    {
        Current?.Exit();   // dọn dẹp state cũ
        Current = next;
        Current.Enter();   // khởi tạo state mới
    }

    public void Tick() => Current?.Tick();
}`,
    note: 'State pattern: mỗi state là một class riêng. Phù hợp khi state có nhiều logic Enter/Exit (bật animation, âm thanh...).',
  }],
  tryIt: [
    'Bước vào nón nhìn: transition Patrol → Chase sáng lên trên sơ đồ.',
    'Để lính gác lại gần: nó chuyển sang Attack. Chạy ra xa để quay về Chase.',
    'Chạy ra ngoài tầm nhìn khi đang bị đuổi và xem dấu X (lastKnownPos) trong state Search.',
    'Giảm FOV xuống 40° rồi thử lẻn ra sau lưng lính gác.',
    'Kéo Chase speed lên 160: còn thoát được không?',
  ],
  links: [
    { label: 'Game Programming Patterns: State', url: 'https://gameprogrammingpatterns.com/state.html' },
    { label: 'Unity Learn: Finite State Machines', url: 'https://learn.unity.com/search?k=%5B%22q%3Astate+machine%22%5D' },
    { label: 'Animator Controller (một FSM có sẵn)', url: 'https://docs.unity3d.com/Manual/class-AnimatorController.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const WW = 600, WH = 400, WP = [[90, 80], [510, 80], [510, 320], [90, 320]];
    const COL = { Patrol: C.green, Chase: C.orange, Attack: C.red, Search: C.purple };
    const EDGES = [
      { from: 'Patrol', to: 'Chase', label: 'thấy player' }, { from: 'Chase', to: 'Attack', label: 'd < atk' },
      { from: 'Attack', to: 'Chase', label: 'd > atk×1.3' }, { from: 'Chase', to: 'Search', label: 'mất dấu' },
      { from: 'Search', to: 'Chase', label: 'thấy lại' }, { from: 'Search', to: 'Patrol', label: 'hết 3s' },
    ];
    const g = { x: 90, y: 80, a: 0, wp: 1, state: 'Patrol', t: 0, cd: 0, flash: 0 };
    const pl = { x: 420, y: 230 };
    let viewRange = 170, fov = 80, attackRange = 55, chaseSpeed = 95, auto = true, lastKnown = null, fired = null, firedT = 0, autoT = 0;

    stage.ui.group('Cảm biến');
    stage.ui.slider('View range', { min: 80, max: 260, value: viewRange, unit: 'u' }, (v) => (viewRange = v));
    stage.ui.slider('FOV', { min: 30, max: 180, step: 5, value: fov, unit: '°' }, (v) => (fov = v));
    stage.ui.slider('Attack range', { min: 30, max: 100, value: attackRange, unit: 'u' }, (v) => (attackRange = v));
    stage.ui.group('Di chuyển');
    stage.ui.slider('Chase speed', { min: 50, max: 160, value: chaseSpeed, unit: 'u/s' }, (v) => (chaseSpeed = v));
    const autoTog = stage.ui.toggle('Player tự di chuyển', auto, (v) => (auto = v));
    const stateRO = stage.ui.readout('State', g.state);
    stage.log('Guard bắt đầu ở state Patrol');

    const layout = () => {
      const { w, h } = stage, side = w >= 640;
      const panel = side ? { x: w - Math.min(340, w * 0.4) - 12, y: 12, w: Math.min(340, w * 0.4), h: h - 24 } : { x: 12, y: h - 182, w: w - 24, h: 170 };
      const area = side ? { x: 12, y: 12, w: panel.x - 24, h: h - 24 } : { x: 12, y: 12, w: w - 24, h: h - 206 };
      const s = Math.min(area.w / WW, area.h / WH);
      return { panel, area, s, ox: area.x + (area.w - WW * s) / 2, oy: area.y + (area.h - WH * s) / 2 };
    };
    stage.onPointer('move', (x, y) => {
      const L = layout(), wx = (x - L.ox) / L.s, wy = (y - L.oy) / L.s;
      if (wx < 0 || wy < 0 || wx > WW || wy > WH) return;
      if (auto) { auto = false; autoTog.set(false); }
      pl.x = wx; pl.y = wy;
    });

    const canSee = () => {
      const dx = pl.x - g.x, dy = pl.y - g.y, dist = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - g.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      return dist < viewRange && Math.abs(da) * 180 / Math.PI < fov / 2;
    };
    const change = (next, why) => {
      stage.log(`Guard: ${g.state} → ${next}  (${why})`, next === 'Attack' ? 'warn' : 'info');
      fired = g.state + '>' + next; firedT = 1.6; g.state = next; g.t = 0; stateRO.set(next);
    };
    const turnTo = (ang, rate, dt) => { let da = Math.atan2(Math.sin(ang - g.a), Math.cos(ang - g.a)); g.a += U.clamp(da, -rate * dt, rate * dt); };
    const moveTo = (tx, ty, speed, dt) => {
      const dx = tx - g.x, dy = ty - g.y, dist = Math.hypot(dx, dy);
      if (dist < 2) return true;
      turnTo(Math.atan2(dy, dx), 5, dt);
      const step = Math.min(dist, speed * dt); g.x += (dx / dist) * step; g.y += (dy / dist) * step;
      return false;
    };

    stage.onFrame((dt) => {
      if (auto) { autoT += dt; pl.x = 300 + 230 * Math.sin(autoT * 0.33 + 0.5); pl.y = 200 + 150 * Math.sin(autoT * 0.51 + 1.2); }
      g.t += dt; firedT = Math.max(0, firedT - dt); g.flash = Math.max(0, g.flash - dt * 3);
      const sees = canSee(), dist = U.dist(g.x, g.y, pl.x, pl.y);
      if (sees) lastKnown = { x: pl.x, y: pl.y };
      if (g.state === 'Patrol') {
        if (moveTo(WP[g.wp][0], WP[g.wp][1], 60, dt)) g.wp = (g.wp + 1) % WP.length;
        if (sees) change('Chase', `thấy player, d=${dist.toFixed(0)}`);
      } else if (g.state === 'Chase') {
        moveTo(pl.x, pl.y, chaseSpeed, dt);
        if (!sees) change('Search', 'mất dấu → đi tới lastKnownPos');
        else if (dist < attackRange) change('Attack', `d=${dist.toFixed(0)} < ${attackRange}`);
      } else if (g.state === 'Attack') {
        turnTo(Math.atan2(pl.y - g.y, pl.x - g.x), 6, dt);
        g.cd -= dt; if (g.cd <= 0) { g.cd = 0.6; g.flash = 1; }
        if (dist > attackRange * 1.3) change('Chase', `d=${dist.toFixed(0)} > ${(attackRange * 1.3).toFixed(0)}`);
      } else {
        if (moveTo(lastKnown.x, lastKnown.y, 70, dt)) g.a += Math.sin(g.t * 2.2) * 2.4 * dt;
        if (sees) change('Chase', 'thấy lại player');
        else if (g.t > 3) change('Patrol', 'hết 3s không thấy ai');
      }
      render(sees);
    });

    function render(sees) {
      const { w, h } = stage, L = layout(), { s, ox, oy } = L;
      const P = (x, y) => [ox + x * s, oy + y * s], col = COL[g.state];
      d.clear(w, h); d.grid(w, h);
      d.rect(ox, oy, WW * s, WH * s, { fill: 'rgba(239,227,209,0.6)', stroke: C.line, lw: 1.5, r: 10 });
      d.poly(WP.map(([x, y]) => P(x, y)), { close: true, stroke: C.trace, lw: 1.5, dash: [5, 5] });
      WP.forEach(([x, y], i) => { const [a, b] = P(x, y); d.rect(a - 5, b - 5, 10, 10, { fill: i === g.wp && g.state === 'Patrol' ? C.green : C.trace, r: 2 }); });
      const [gx, gy] = P(g.x, g.y), [px, py] = P(pl.x, pl.y), half = (fov / 2) * Math.PI / 180, cone = [[gx, gy]];
      for (let i = 0; i <= 24; i++) { const a = g.a - half + (2 * half * i) / 24; cone.push([gx + Math.cos(a) * viewRange * s, gy + Math.sin(a) * viewRange * s]); }
      d.poly(cone, { close: true, fill: sees ? 'rgba(214,90,74,0.18)' : 'rgba(226,169,59,0.16)', stroke: sees ? C.red : C.yellow, lw: 1.2 });
      d.circle(gx, gy, attackRange * s, { stroke: C.red, lw: 1.2, dash: [3, 4] });
      if (g.state === 'Search' && lastKnown) { const [lx, ly] = P(lastKnown.x, lastKnown.y); d.line(lx - 7, ly - 7, lx + 7, ly + 7, { stroke: C.purple, lw: 3 }); d.line(lx - 7, ly + 7, lx + 7, ly - 7, { stroke: C.purple, lw: 3 }); d.text('lastKnownPos', lx + 10, ly - 12, { font: 'mono', size: 11, color: C.purple }); }
      if (g.flash > 0) d.line(gx, gy, px, py, { stroke: `rgba(214,90,74,${g.flash})`, lw: 3 });
      d.circle(px, py, 9, { fill: C.blue, stroke: '#fff', lw: 2, shadow: 6 });
      d.text('Player', px, py - 18, { align: 'center', font: 'mono', size: 11, color: C.blue, weight: 600 });
      d.circle(gx, gy, 13, { fill: col, stroke: '#fff', lw: 2.5, shadow: 8 });
      d.line(gx, gy, gx + Math.cos(g.a) * 18, gy + Math.sin(g.a) * 18, { stroke: C.navy, lw: 3 });
      d.pill(g.state, gx, gy + 28, { align: 'center', fill: col, size: 11 });
      drawDiagram(L.panel);
    }

    function drawDiagram(p) {
      d.node(p.x, p.y, p.w, p.h, null, { fill: C.paper, accent: C.line, shadow: 4 });
      d.text('State Machine', p.x + 14, p.y + 18, { font: 'cond', weight: 700, size: 15, color: C.navy });
      d.text(`${g.state} · ${g.t.toFixed(1)}s`, p.x + p.w - 14, p.y + 18, { align: 'right', font: 'mono', size: 11, color: COL[g.state] });
      const nw = Math.min(104, p.w * 0.36), nh = 34, top = p.y + 40, ih = p.h - 52;
      const tall = p.h > p.w * 1.2, pos = tall ? { Patrol: [0.25, 0.08], Chase: [0.72, 0.36], Attack: [0.72, 0.92], Search: [0.25, 0.64] } : { Patrol: [0.2, 0.18], Chase: [0.62, 0.18], Attack: [0.62, 0.84], Search: [0.2, 0.84] };
      const ctr = (n) => [p.x + p.w * pos[n][0], top + ih * pos[n][1]];
      EDGES.forEach((e) => {
        const [ax, ay] = ctr(e.from), [bx, by] = ctr(e.to), L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy * 7, ny = ux * 7;
        const clip = Math.min(nw / 2 / (Math.abs(ux) || 1e-6), nh / 2 / (Math.abs(uy) || 1e-6)) + 4;
        const hot = fired === e.from + '>' + e.to && firedT > 0, c = hot ? COL[e.to] : C.faint;
        d.arrow(ax + ux * clip + nx, ay + uy * clip + ny, bx - ux * clip + nx, by - uy * clip + ny, { stroke: c, lw: hot ? 3 : 1.6, head: 8 });
        const mx = ax + (bx - ax) * 0.42 + nx * 1.8, my = ay + (by - ay) * 0.42 + ny * 1.8, al = nx > 3 ? 'left' : nx < -3 ? 'right' : 'center', tw = d.measure(e.label, { font: 'mono', size: 11 }) + 8;
        d.rect(al === 'left' ? mx - 4 : al === 'right' ? mx - tw + 4 : mx - tw / 2, my - 9, tw, 18, { fill: 'rgba(255,250,241,0.92)', r: 4 });
        d.text(e.label, mx, my, { align: al, font: 'mono', size: 11, weight: hot ? 700 : 500, color: hot ? COL[e.to] : C.muted });
      });
      Object.keys(pos).forEach((n) => {
        const [cx, cy] = ctr(n), on = n === g.state;
        d.node(cx - nw / 2, cy - nh / 2, nw, nh, n, { accent: on ? COL[n] : C.line, lw: on ? 3 : 1.5, fill: on ? '#fff' : C.card, color: on ? COL[n] : C.navy, shadow: on ? 12 : 3 });
      });
    }
  },
});
