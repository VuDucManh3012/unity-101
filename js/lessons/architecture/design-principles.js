/* Lesson: SOLID / KISS / DRY / YAGNI — god-class vs small classes, a change request ripples through touched files. */
U101.defineLesson('design-principles', {
  lead: 'Nguyên tắc thiết kế không làm game chạy nhanh hơn, nhưng làm code dễ sửa hơn. Thước đo đơn giản nhất: một yêu cầu thay đổi phải động vào bao nhiêu file?',
  hint: 'Chọn một yêu cầu thay đổi rồi bấm Gửi yêu cầu · đổi nguyên tắc để xem phần được tô sáng · bật Over-engineer để thấy cái giá của YAGNI',
  overview: `
    <p>Bên trái là <b>god class</b>: một <code>Player.cs</code> làm tất cả (input, di chuyển, bắn, máu, âm thanh, lưu game). Bên phải là cùng tính năng đó được tách thành các class nhỏ nói chuyện qua interface.</p>
    <ul>
      <li><b>S</b>ingle Responsibility: mỗi class chỉ có một lý do để thay đổi.</li>
      <li><b>O</b>pen/Closed: thêm tính năng bằng cách <i>thêm</i> class mới, không sửa class cũ.</li>
      <li><b>L</b>iskov: mọi <code>IWeapon</code> phải thay thế được cho nhau mà không làm hỏng <code>WeaponHolder</code>.</li>
      <li><b>I</b>nterface Segregation: interface nhỏ, đúng việc. Đừng ép class implement hàm nó không cần.</li>
      <li><b>D</b>ependency Inversion: phụ thuộc vào abstraction (<code>ISaveService</code>), không vào class cụ thể.</li>
      <li><b>DRY</b>: một kiến thức chỉ nằm ở một chỗ. <b>KISS</b>: giải pháp đơn giản nhất chạy được. <b>YAGNI</b>: chưa cần thì chưa viết.</li>
    </ul>
    <p class="callout">SOLID quá đà cũng là bệnh: factory của factory, interface chỉ có một implementation. Bật <b>Over-engineer</b> và gửi yêu cầu "Thêm vũ khí" để thấy số file phải sửa tăng lại.</p>
    <p><b>Clean Code</b> ở mức nhỏ: tên biến nói lên ý nghĩa, hàm ngắn và làm một việc, không có magic number, xóa code chết thay vì comment nó lại.</p>`,
  keyPoints: [
    'Đo thiết kế bằng số file phải chạm khi có yêu cầu thay đổi.',
    'SRP + OCP: thêm vũ khí mới = thêm một file, không sửa file cũ.',
    'DRY: công thức sát thương nằm ở một chỗ, sửa một lần là đủ.',
    'KISS/YAGNI: abstraction chỉ đáng giá khi có ít nhất hai cách dùng thật.',
  ],
  code: [{
    title: 'IWeapon.cs',
    source: `
public interface IWeapon { void Fire(Vector3 origin, Vector3 dir); }

public class Shotgun : MonoBehaviour, IWeapon
{
    [SerializeField] private int pellets = 6;
    public void Fire(Vector3 origin, Vector3 dir) { /* bắn 6 viên tỏa ra */ }
}

// Thêm vũ khí mới = thêm file mới. Không sửa WeaponHolder (Open/Closed).
public class LaserGun : MonoBehaviour, IWeapon
{
    public void Fire(Vector3 origin, Vector3 dir) { /* raycast liên tục */ }
}`,
    note: 'Interface nhỏ với một hàm Fire() là đủ. Đừng thêm Reload(), Overheat() vào IWeapon nếu chỉ một loại súng cần.',
  }, {
    title: 'WeaponHolder.cs',
    source: `
public class WeaponHolder : MonoBehaviour
{
    [SerializeField] private MonoBehaviour weaponBehaviour; // kéo Shotgun/LaserGun vào
    private IWeapon weapon;

    void Awake() => weapon = (IWeapon)weaponBehaviour;

    public void Shoot(Vector3 dir) => weapon.Fire(transform.position, dir);
}

// Trước đây (god class):
// switch (weaponType) { case Pistol: ... case Shotgun: ... case Laser: ... }
// Mỗi loại súng mới phải sửa Player, HUD và SaveSystem.`,
    note: 'WeaponHolder chỉ biết IWeapon (Dependency Inversion), nên mọi loại súng đều cắm vào được (Liskov).',
  }],
  tryIt: [
    'Gửi yêu cầu "Thêm vũ khí mới": bên trái phải sửa mấy file? Bên phải thì sao?',
    'Chọn "Sửa công thức sát thương": vì sao god class phải sửa 2 chỗ (vi phạm DRY)?',
    'Bật Over-engineer rồi gửi lại yêu cầu thêm vũ khí. Số file chạm tăng lên bao nhiêu?',
    'Chọn từng nguyên tắc SOLID và đọc chú thích dưới Scene.',
    'Chọn "Hỗ trợ gamepad": ở god class, sửa input có nguy cơ làm hỏng phần nào khác?',
  ],
  links: [
    { label: 'Unity e-book: Level up your code with game programming patterns', url: 'https://unity.com/resources/level-up-your-code-with-game-programming-patterns' },
    { label: 'C# coding conventions', url: 'https://learn.microsoft.com/dotnet/csharp/fundamentals/coding-style/coding-conventions' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const ROWS = [0, 0.33, 0.66, 1];
    // n: [label, col, row, kind]; kind: 'iface' | 'new' | 'oe' (over-engineered)
    const AFTER = {
      player: ['Player', 0.5, 0], enemy: ['Enemy', 1, 0],
      input: ['PlayerInput', 0, 1], mover: ['PlayerMover', 0.25, 1], health: ['Health', 0.5, 1], weapon: ['WeaponHolder', 0.75, 1], dmg: ['DamageCalc', 1, 1],
      isave: ['ISaveService', 0.125, 2, 'iface'], hud: ['HealthBarUI', 0.5, 2], iweapon: ['IWeapon', 0.75, 2, 'iface'],
      json: ['JsonSave', 0, 3], cloud: ['CloudSave', 0.25, 3, 'new'], pistol: ['Pistol', 0.5, 3], shotgun: ['Shotgun', 0.75, 3], laser: ['LaserGun', 1, 3, 'new'],
      factory: ['WeaponFactory', 0.75, 0, 'oe'], registry: ['WeaponRegistry', 1, 2, 'oe'], ilocator: ['ServiceLocator', 0, 0, 'oe'],
    };
    const AFTER_EDGES = [['player', 'input'], ['player', 'mover'], ['player', 'health'], ['player', 'weapon'], ['player', 'isave'], ['hud', 'health'],
      ['weapon', 'iweapon'], ['pistol', 'iweapon', 1], ['shotgun', 'iweapon', 1], ['laser', 'iweapon', 1], ['json', 'isave', 1], ['cloud', 'isave', 1],
      ['weapon', 'dmg'], ['enemy', 'dmg'], ['weapon', 'factory'], ['factory', 'registry'], ['player', 'ilocator']];
    const BEFORE = { player: ['Player.cs', 0.5, 0.5], hud: ['HUD', 0.12, 0], enemy: ['Enemy', 0.88, 0], save: ['SaveSystem', 0.12, 1], audio: ['AudioManager', 0.88, 1] };
    const CHANGES = {
      weapon: { label: 'Thêm vũ khí mới (Laser)', before: [['player', 'sửa'], ['hud', 'sửa'], ['save', 'sửa']], after: [['laser', 'mới'], ['factory', 'sửa', 1], ['registry', 'sửa', 1], ['ilocator', 'sửa', 1]] },
      damage: { label: 'Sửa công thức sát thương', before: [['player', 'sửa'], ['enemy', 'sửa']], after: [['dmg', 'sửa']] },
      save: { label: 'Đổi lưu game sang Cloud', before: [['player', 'sửa'], ['save', 'sửa'], ['hud', 'sửa']], after: [['cloud', 'mới']] },
      input: { label: 'Hỗ trợ gamepad', before: [['player', 'sửa']], after: [['input', 'sửa']] },
    };
    const PRINCIPLES = {
      SRP: { b: ['player'], a: ['input', 'mover', 'health', 'weapon'], t: 'SRP: Player.cs có 6 lý do để thay đổi. Bên phải mỗi class chỉ có một.' },
      OCP: { b: ['player'], a: ['iweapon', 'laser', 'cloud'], t: 'OCP: thêm LaserGun/CloudSave là thêm file mới, không mở file cũ ra sửa.' },
      LSP: { b: [], a: ['pistol', 'shotgun', 'laser'], t: 'LSP: Pistol, Shotgun, Laser thay nhau được. WeaponHolder không cần biết loại súng.' },
      ISP: { b: ['player'], a: ['iweapon', 'isave'], t: 'ISP: IWeapon chỉ có Fire(), ISaveService chỉ có Save/Load. Không có hàm thừa.' },
      DIP: { b: ['save'], a: ['player', 'isave', 'weapon', 'iweapon'], t: 'DIP: Player phụ thuộc ISaveService, không phụ thuộc JsonSave cụ thể.' },
      DRY: { b: ['player', 'enemy'], a: ['dmg'], t: 'DRY: công thức sát thương bị chép ở Player và Enemy. Bên phải chỉ nằm trong DamageCalc.' },
      KISS: { b: [], a: ['factory', 'registry', 'ilocator'], t: 'KISS: bật Over-engineer. Factory + Registry + Locator cho 3 khẩu súng là quá phức tạp.' },
      YAGNI: { b: [], a: ['factory', 'registry', 'ilocator'], t: 'YAGNI: "sau này có thể cần mod súng" chưa phải yêu cầu thật. Chưa cần thì chưa viết.' },
    };
    let change = 'weapon', principle = 'SRP', overEng = false;
    const rip = { t: 99 };

    const touched = (side) => CHANGES[change][side].filter((it) => !it[2] || overEng);
    const send = () => {
      rip.t = 0;
      const b = touched('before'), a = touched('after');
      const sum = (l) => `${l.filter((i) => i[1] === 'sửa').length} sửa, ${l.filter((i) => i[1] === 'mới').length} mới`;
      stage.log(`Yêu cầu: "${CHANGES[change].label}"`, 'info');
      stage.log(`God class: ${sum(b)} → ${b.map((i) => BEFORE[i[0]][0]).join(', ')}`, b.length > 1 ? 'warn' : 'info');
      stage.log(`Tách nhỏ: ${sum(a)} → ${a.map((i) => AFTER[i[0]][0]).join(', ')}`, 'info');
      countB.set(sum(b)); countA.set(sum(a));
    };

    stage.ui.group('Yêu cầu thay đổi');
    stage.ui.select('Yêu cầu', Object.entries(CHANGES).map(([v, c]) => ({ value: v, label: c.label })), change, (v) => { change = v; send(); });
    stage.ui.button('Gửi yêu cầu', send, { variant: 'primary' });
    stage.ui.group('Nguyên tắc');
    stage.ui.select('Tô sáng', Object.keys(PRINCIPLES), principle, (v) => { principle = v; stage.log(PRINCIPLES[v].t); });
    stage.ui.toggle('Over-engineer (vi phạm KISS/YAGNI)', overEng, (v) => { overEng = v; stage.log(v ? 'Thêm Factory, Registry, ServiceLocator "cho chắc"...' : 'Bỏ các lớp trừu tượng thừa.', v ? 'warn' : 'info'); send(); });
    const countB = stage.ui.readout('God class', '—');
    const countA = stage.ui.readout('Tách nhỏ', '—');
    send();
    rip.t = 99; // start in "done" state so the result is visible immediately

    stage.onFrame((dt) => { rip.t += dt; render(); });

    function nodeState(side, id) {
      const list = touched(side), i = list.findIndex((it) => it[0] === id);
      if (i < 0) return null;
      const delay = 0.5 + i * 0.45;
      return { kind: list[i][1], delay, hit: rip.t >= delay, age: rip.t - delay };
    }

    function panel(px, py, pw, ph, side) {
      const after = side === 'after';
      d.rect(px, py, pw, ph, { fill: 'rgba(249,242,229,0.6)', stroke: C.lineSoft, r: 12 });
      d.text(after ? 'SAU: class nhỏ + interface' : 'TRƯỚC: god class', px + 12, py + 14, { font: 'cond', weight: 700, size: 14, color: after ? C.teal : C.red });
      const head = [px + pw - 12, py + 14];
      const pad = 8, top = py + 30, nh = U.clamp(ph * 0.13, 22, 34), nw = (pw - pad * 2) * 0.17;
      const P = {}, N = after ? AFTER : BEFORE;
      for (const id in N) {
        const [, fx, fy] = N[id];
        const rowY = after ? ROWS[fy] : fy;
        P[id] = [px + pad + nw / 2 + fx * (pw - pad * 2 - nw), top + nh / 2 + rowY * (ph - 42 - nh)];
      }
      const visible = (id) => {
        const k = N[id][3];
        if (k === 'oe') return overEng;
        if (k === 'new') { const s = nodeState(side, id); return s && s.hit; }
        return true;
      };
      // edges
      const edges = after ? AFTER_EDGES : Object.keys(BEFORE).filter((k) => k !== 'player').map((k) => ['player', k]);
      edges.forEach(([a, b, impl]) => {
        if (!visible(a) || !visible(b)) return;
        d.line(P[a][0], P[a][1], P[b][0], P[b][1], { stroke: impl ? C.purple : C.trace, lw: after ? 1.5 : 3, dash: impl ? [5, 4] : null });
      });
      // request pulses
      const hl = PRINCIPLES[principle][after ? 'a' : 'b'];
      for (const id in N) {
        const s = nodeState(side, id);
        if (s && s.age > -0.45 && s.age < 0) {
          const k = U.ease.inOutQuad(1 + s.age / 0.45);
          d.circle(U.lerp(head[0] - 40, P[id][0], k), U.lerp(head[1], P[id][1], k), 5, { fill: s.kind === 'mới' ? C.green : C.red, stroke: '#fff', lw: 1.5 });
        }
      }
      // nodes
      for (const id in N) {
        if (!visible(id)) continue;
        const [label, , , kind] = N[id], s = nodeState(side, id), big = !after && id === 'player';
        const w = big ? (pw - pad * 2) * 0.62 : nw, h = big ? (ph - 42) * 0.4 : nh, x = P[id][0] - w / 2, y = P[id][1] - h / 2;
        if (hl.includes(id)) d.rect(x - 4, y - 4, w + 8, h + 8, { stroke: C.purple, lw: 2.5, r: 12, fill: 'rgba(138,115,224,0.12)' });
        const hot = s && s.hit, col = hot ? (s.kind === 'mới' ? C.green : C.red) : kind === 'oe' ? C.yellow : kind === 'iface' ? C.purple : C.line;
        d.node(x, y, w, h, null, { accent: col, fill: hot ? (s.kind === 'mới' ? '#e3f3e8' : '#fbe6df') : C.card, shadow: 4 });
        if (big) {
          const lines = ['Input · Move · Shoot', 'Health · Audio · Save · UI', 'switch (weaponType) {…}'];
          const ls = U.clamp(Math.min(h / 6, w / 17), 10, 13);
          const ty = P[id][1] - ls * 2.3;
          d.text(label + '  (1 200 dòng)', P[id][0], ty, { align: 'center', font: 'cond', weight: 700, size: ls + 2, color: C.navy });
          lines.forEach((l, i) => d.text(l, P[id][0], ty + ls * (1.6 + i * 1.35), { align: 'center', font: 'mono', size: ls - 1, color: C.muted }));
        } else {
          d.text(kind === 'iface' ? '«' + label + '»' : label, P[id][0], P[id][1], { align: 'center', font: 'cond', weight: 600, size: U.clamp((w - 8) / (label.length * 0.5), 10, 13), color: kind === 'iface' ? C.purple : C.navy });
        }
        if (hot) {
          d.pill(s.kind, x + w - 4, y, { size: 10, align: 'center', fill: s.kind === 'mới' ? C.green : C.red });
          if (s.age < 0.7) d.circle(P[id][0], P[id][1], w * 0.4 + s.age * 60, { stroke: s.kind === 'mới' ? C.green : C.red, lw: 2 * (1 - s.age / 0.7) + 0.1 });
        }
      }
      const done = touched(side).filter((it) => nodeState(side, it[0]).hit).length;
      d.text(`${done} file bị chạm`, head[0], head[1], { align: 'right', font: 'mono', weight: 700, size: 13, color: done > 1 ? C.red : C.green });
    }

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      const capH = 40, wide = w >= 640, g = 12;
      if (wide) {
        const pw = (w - g * 3) / 2;
        panel(g, g, pw * 0.9, h - capH - g * 2, 'before');
        panel(g * 2 + pw * 0.9, g, pw * 1.1, h - capH - g * 2, 'after');
      } else {
        const ph = (h - capH - g * 3) / 2;
        panel(g, g, w - g * 2, ph, 'before');
        panel(g, g * 2 + ph, w - g * 2, ph, 'after');
      }
      const pr = PRINCIPLES[principle];
      d.rect(g, h - capH - 2, w - g * 2, capH - 6, { fill: C.navy, r: 8 });
      const ts = U.clamp(w / 70, 10, 13);
      const lines = [''];
      pr.t.split(' ').forEach((wd) => { const l = lines[lines.length - 1]; if (d.measure(l + ' ' + wd, { font: 'mono', size: ts }) > w - g * 2 - 24 && l) lines.push(wd); else lines[lines.length - 1] = l ? l + ' ' + wd : wd; });
      lines.slice(0, 2).forEach((l, i) => d.text(l, g + 12, h - capH / 2 - 5 + (i - (Math.min(lines.length, 2) - 1) / 2) * (ts + 3), { font: 'mono', size: ts, color: '#fff' }));
    }
  },
});
