/* Lesson: Command & State — queue Move commands with Undo/Redo stacks; the unit's behaviour is a State object (Idle/Moving/Stunned). */
U101.defineLesson('command-state', {
  lead: 'Command biến một hành động thành object (có Execute và Undo), nên bạn xếp hàng, hoàn tác, làm lại được. State tách mỗi trạng thái của nhân vật thành một class riêng có Enter/Update/Exit.',
  hint: 'Bấm mũi tên (hoặc phím ← ↑ → ↓) để thêm lệnh vào hàng đợi · Execute để chạy · Undo/Redo · Stun để chuyển sang StunnedState',
  overview: `
    <p><b>Command pattern</b>: thay vì gọi thẳng <code>unit.Move(dir)</code>, ta tạo <code>new MoveCommand(unit, dir)</code>. Object lệnh có <code>Execute()</code> và <code>Undo()</code>, nên có thể:</p>
    <ul>
      <li>Xếp hàng lệnh rồi chạy dần (game theo lượt, replay, AI lên kế hoạch).</li>
      <li>Hoàn tác: lệnh đã chạy được đẩy vào <b>Undo stack</b>. Undo lấy lệnh trên đỉnh ra, gọi <code>Undo()</code>, rồi đẩy sang <b>Redo stack</b>.</li>
      <li>Chạy một lệnh <b>mới</b> sẽ xóa sạch Redo stack, vì lịch sử đã rẽ nhánh.</li>
    </ul>
    <p><b>State pattern</b>: thay vì một <code>switch(state)</code> khổng lồ trong Update, mỗi trạng thái là một class implement <code>IState</code>. Unit chỉ gọi <code>currentState.Tick()</code>. Đổi trạng thái thì gọi <code>Exit()</code> của state cũ rồi <code>Enter()</code> của state mới.</p>
    <p class="callout">Hai pattern bổ trợ nhau: <b>StunnedState</b> từ chối mọi lệnh di chuyển. Hàng đợi vẫn còn đó và tiếp tục chạy khi unit quay về Idle.</p>`,
  keyPoints: [
    'Command = hành động đóng gói thành object: Execute + Undo.',
    'Undo stack và Redo stack. Lệnh mới thì xóa Redo.',
    'State = mỗi trạng thái một class, có Enter / Tick / Exit.',
    'State quyết định lệnh nào hợp lệ, không cần if-else rải rác.',
  ],
  code: [{
    title: 'MoveCommand.cs',
    source: `
public interface ICommand { bool Execute(); void Undo(); }

public class MoveCommand : ICommand
{
    private readonly GridUnit unit;
    private readonly Vector2Int dir;
    public MoveCommand(GridUnit unit, Vector2Int dir) { this.unit = unit; this.dir = dir; }

    public bool Execute() => unit.TryMove(dir);   // false nếu đụng tường
    public void Undo()    => unit.TryMove(-dir);
}

public class CommandInvoker
{
    private readonly Stack<ICommand> undo = new(), redo = new();

    public void Run(ICommand cmd)
    {
        if (!cmd.Execute()) return;
        undo.Push(cmd);
        redo.Clear();                                  // lịch sử rẽ nhánh
    }
    public void Undo() { if (undo.Count == 0) return; var c = undo.Pop(); c.Undo(); redo.Push(c); }
    public void Redo() { if (redo.Count == 0) return; var c = redo.Pop(); c.Execute(); undo.Push(c); }
}`,
    note: 'Lệnh lưu đủ dữ liệu để tự đảo ngược. Với lệnh phức tạp hơn (nhặt đồ, gây sát thương), hãy lưu trạng thái cũ trong lệnh.',
  }, {
    title: 'UnitStates.cs',
    source: `
public interface IState { void Enter(); void Tick(float dt); void Exit(); bool CanMove { get; } }

public class StunnedState : IState
{
    private readonly GridUnit unit; private float timer;
    public StunnedState(GridUnit unit) => this.unit = unit;

    public bool CanMove => false;
    public void Enter() { timer = 2f; unit.PlayVfx("stars"); }
    public void Tick(float dt) { if ((timer -= dt) <= 0) unit.ChangeState(unit.Idle); }
    public void Exit() => unit.StopVfx("stars");
}

// GridUnit:
public void ChangeState(IState next) { current?.Exit(); current = next; current.Enter(); }`,
    note: 'Muốn thêm trạng thái Frozen chỉ cần thêm class mới, không sửa Idle hay Moving.',
  }],
  tryIt: [
    'Bấm → → ↓ rồi Execute. Theo dõi lệnh chuyển từ Queue sang Undo stack.',
    'Undo hai lần rồi Redo một lần. Mỗi stack thay đổi thế nào?',
    'Undo một lần, sau đó chạy lệnh mới. Redo stack còn gì?',
    'Đẩy unit vào tường (ô tối): lệnh có được đưa vào Undo stack không?',
    'Xếp nhiều lệnh, Execute, rồi bấm Stun giữa chừng. Quan sát log Enter/Exit.',
  ],
  links: [
    { label: 'Game Programming Patterns: Command', url: 'https://gameprogrammingpatterns.com/command.html' },
    { label: 'Game Programming Patterns: State', url: 'https://gameprogrammingpatterns.com/state.html' },
    { label: 'Unity e-book: game programming patterns', url: 'https://unity.com/resources/level-up-your-code-with-game-programming-patterns' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const COLS = 8, ROWS = 6, WALLS = new Set(['3,1', '3,2', '3,3', '6,4', '5,4', '1,4']);
    const DIRS = { left: [-1, 0, '←'], up: [0, -1, '↑'], right: [1, 0, '→'], down: [0, 1, '↓'] };
    const unit = { x: 1, y: 1, fx: 1, fy: 1, anim: 1 };
    const queue = [], undoS = [], redoS = [];
    let running = false, immediate = false, stateT = 0;

    const blocked = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || WALLS.has(x + ',' + y);
    const move = (dx, dy) => {
      if (blocked(unit.x + dx, unit.y + dy)) return false;
      Object.assign(unit, { fx: unit.x, fy: unit.y, x: unit.x + dx, y: unit.y + dy, anim: 0 });
      changeState(STATES.Moving);
      return true;
    };
    const makeMove = (key) => { const [dx, dy, g] = DIRS[key]; return { label: `Move(${g})`, dx, dy, execute: () => move(dx, dy), undo: () => move(-dx, -dy) }; };

    // State pattern: each state is an object with enter/tick/exit + canMove
    const STATES = {
      Idle: { name: 'Idle', color: C.green, canMove: true, enter() {}, tick() { if (running && queue.length) runNext(); else if (running) { running = false; stage.log('Hàng đợi trống.'); } }, exit() {} },
      Moving: { name: 'Moving', color: C.blue, canMove: false, enter() {}, tick(dt) { unit.anim = Math.min(1, unit.anim + dt * 4.5); if (unit.anim >= 1) changeState(STATES.Idle); }, exit() {} },
      Stunned: { name: 'Stunned', color: C.yellow, canMove: false, enter() { this.timer = 2; }, tick(dt) { if ((this.timer -= dt) <= 0) changeState(STATES.Idle); }, exit() {} },
    };
    let state = STATES.Idle;
    function changeState(next) {
      if (next === state) return;
      const quiet = next === STATES.Moving || state === STATES.Moving; // avoid spamming a log per step
      if (!quiet) stage.log(`${state.name}State.Exit() → ${next.name}State.Enter()`, next === STATES.Stunned ? 'warn' : 'info');
      state.exit(); state = next; state.enter(); stateT = 0;
    }

    function runNext() {
      const cmd = queue.shift();
      if (cmd.execute()) { undoS.push(cmd); if (redoS.length) stage.log(`Lệnh mới → xóa Redo stack (${redoS.length} lệnh)`, 'warn'); redoS.length = 0; }
      else stage.log(`${cmd.label}.Execute() = false: đụng tường, không đưa vào Undo stack`, 'warn');
    }
    function enqueue(key) {
      const cmd = makeMove(key);
      if (immediate) { if (!state.canMove) return stage.log(`${state.name}State: bỏ qua ${cmd.label}`, 'warn'); queue.unshift(cmd); runNext(); return; }
      if (queue.length >= 12) return stage.log('Hàng đợi đầy (12 lệnh)', 'warn');
      queue.push(cmd);
    }
    function undo() {
      if (!state.canMove) return stage.log(`${state.name}State: chưa thể Undo`, 'warn');
      const c = undoS.pop(); if (!c) return;
      c.undo(); redoS.push(c); stage.log(`Undo ${c.label}`);
    }
    function redo() {
      if (!state.canMove) return stage.log(`${state.name}State: chưa thể Redo`, 'warn');
      const c = redoS.pop(); if (!c) return;
      c.execute(); undoS.push(c); stage.log(`Redo ${c.label}`);
    }

    stage.ui.group('Command');
    Object.keys(DIRS).forEach((k) => stage.ui.button(DIRS[k][2], () => enqueue(k)));
    stage.ui.button('Execute', () => { if (!queue.length) return stage.log('Queue trống. Bấm mũi tên trước.', 'warn'); running = true; stage.log(`Execute ${queue.length} lệnh`); }, { variant: 'primary' });
    stage.ui.button('Undo', undo);
    stage.ui.button('Redo', redo);
    stage.ui.button('Xóa queue', () => { queue.length = 0; running = false; });
    stage.ui.toggle('Chạy ngay (không xếp hàng)', immediate, (v) => (immediate = v));
    stage.ui.group('State');
    stage.ui.button('Stun (2s)', () => changeState(STATES.Stunned), { variant: 'danger' });
    const stRead = stage.ui.readout('currentState', 'Idle');

    const onKey = (e) => {
      const map = { ArrowLeft: 'left', ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down' };
      if (!map[e.key] || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      e.preventDefault(); enqueue(map[e.key]);
    };
    window.addEventListener('keydown', onKey);

    // Seed a small history so the initial frame already tells the story.
    ['right', 'down'].forEach((k) => { const c = makeMove(k); c.execute(); undoS.push(c); });
    unit.anim = 1; state = STATES.Idle;
    const r = makeMove('down'); r.execute(); r.undo(); redoS.push(r); unit.anim = 1; state = STATES.Idle;
    ['down', 'down', 'right'].forEach((k) => queue.push(makeMove(k)));
    stage.log('Đã có sẵn: 2 lệnh trong Undo stack, 1 trong Redo, 3 trong Queue. Bấm Execute.');

    stage.onFrame((dt) => { stateT += dt; state.tick(dt); stRead.set(state.name); render(); });

    function stack(x, y, w, h, title, items, color, topFirst) {
      d.rect(x, y, w, h, { fill: 'rgba(249,242,229,0.7)', stroke: C.lineSoft, r: 10 });
      d.text(`${title} (${items.length})`, x + 10, y + 14, { font: 'cond', weight: 700, size: 13, color });
      const ih = 22, max = Math.max(1, Math.floor((h - 34) / (ih + 4)));
      const list = topFirst ? items.slice().reverse() : items.slice();
      list.slice(0, max).forEach((c, i) => {
        const iy = y + 28 + i * (ih + 4);
        d.rect(x + 8, iy, w - 16, ih, { fill: i === 0 ? color : C.card, stroke: color, lw: 1.5, r: 6 });
        d.text(c.label, x + w / 2, iy + ih / 2, { align: 'center', font: 'mono', size: 11, weight: 600, color: i === 0 ? '#fff' : C.navy });
      });
      if (list.length > max) d.text(`+${list.length - max}`, x + w - 10, y + 14, { align: 'right', font: 'mono', size: 11, color: C.muted });
      if (!items.length) d.text('trống', x + w / 2, y + 40, { align: 'center', font: 'mono', size: 11, color: C.faint });
    }

    function render() {
      const { w, h } = stage, wide = w >= 640, g = 12;
      d.clear(w, h); d.grid(w, h);
      const gw = wide ? w * 0.5 : w - g * 2, gh = wide ? h - g * 2 : h * 0.46;
      const cell = Math.min((gw - 16) / COLS, (gh - 16) / ROWS), ox = g + (gw - cell * COLS) / 2, oy = g + (gh - cell * ROWS) / 2;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const wall = WALLS.has(x + ',' + y);
        d.rect(ox + x * cell + 2, oy + y * cell + 2, cell - 4, cell - 4, { fill: wall ? C.navy2 : C.card, stroke: wall ? null : C.lineSoft, r: 6 });
      }
      // ghost path of queued commands
      let px = unit.x, py = unit.y;
      queue.forEach((c, i) => {
        const { dx, dy } = c;
        if (blocked(px + dx, py + dy)) return;
        d.arrow(ox + (px + 0.5) * cell, oy + (py + 0.5) * cell, ox + (px + dx + 0.5) * cell, oy + (py + dy + 0.5) * cell, { stroke: i === 0 ? C.teal : 'rgba(26,163,161,0.45)', lw: 2, dash: [4, 4] });
        px += dx; py += dy;
      });
      const k = U.ease.outCubic(unit.anim), ux = ox + (U.lerp(unit.fx, unit.x, k) + 0.5) * cell, uy = oy + (U.lerp(unit.fy, unit.y, k) + 0.5) * cell;
      const shake = state === STATES.Stunned ? Math.sin(stateT * 40) * 2 : 0;
      d.circle(ux + shake, uy, cell * 0.32, { fill: state.color, stroke: C.navy, lw: 2.5, shadow: 6 });
      d.text('U', ux + shake, uy + 1, { align: 'center', font: 'cond', weight: 700, size: cell * 0.3, color: '#fff' });
      if (state === STATES.Stunned) for (let i = 0; i < 3; i++) { const a = stateT * 4 + i * 2.1; d.text('★', ux + Math.cos(a) * cell * 0.38, uy - cell * 0.38 + Math.sin(a) * 4, { align: 'center', size: 12, color: C.yellow }); }

      // right side (or bottom on narrow screens)
      const rx = wide ? g * 2 + gw : g, ry = wide ? g : g * 2 + gh, rw = wide ? w - rx - g : w - g * 2, rh = wide ? h - g * 2 : h - ry - g;
      const smH = Math.min(96, rh * 0.36), names = ['Idle', 'Moving', 'Stunned'], sw = (rw - 16) / 3;
      d.text('State machine', rx, ry + 8, { font: 'cond', weight: 700, size: 13, color: C.navy });
      names.forEach((n, i) => {
        const s = STATES[n], x = rx + i * (sw + 8), y = ry + 20, cur = s === state, bh = smH - 26;
        d.node(x, y, sw, bh, `${n}State`, { accent: cur ? s.color : C.line, fill: cur ? '#fff' : C.card, lw: cur ? 3 : 1.5, size: 13, sub: cur ? `● ${stateT.toFixed(1)}s` : (s.canMove ? 'nhận lệnh' : 'chặn lệnh') });
        if (i < 2) d.arrow(x + sw + 1, y + bh / 2, x + sw + 7, y + bh / 2, { stroke: C.faint, head: 6, lw: 1.5 });
      });
      const sy = ry + smH + 6, shH = rh - smH - 6, cw = (rw - 16) / 3;
      stack(rx, sy, cw, shH, 'Queue', queue, C.teal, false);
      stack(rx + cw + 8, sy, cw, shH, 'Undo stack', undoS, C.purple, true);
      stack(rx + (cw + 8) * 2, sy, cw, shH, 'Redo stack', redoS, C.orange, true);
    }

    return () => window.removeEventListener('keydown', onKey);
  },
});
