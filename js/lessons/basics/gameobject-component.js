/* Lesson: GameObject & Component — hierarchy, local vs world Transform, components that add behaviour. */
U101.defineLesson('gameobject-component', {
  lead: 'Mọi thứ trong scene là một GameObject: một cái "vỏ" rỗng chỉ có Transform. Hành vi đến từ các Component gắn lên nó: SpriteRenderer để hiển thị, Rigidbody2D để rơi, Collider để va chạm, script để tự viết logic.',
  hint: 'Kéo Player hoặc Weapon trong Scene · bật/tắt component ở Inspector · bấm vào Hierarchy để chọn object',
  overview: `
    <p><b>GameObject</b> không tự làm gì cả. Nó là nơi chứa <b>Component</b>. Muốn object hiện lên, rơi xuống hay di chuyển, bạn gắn thêm component tương ứng.</p>
    <ul>
      <li><b>Transform</b>: component bắt buộc, lưu position, rotation, scale. Không thể xóa.</li>
      <li><b>Hierarchy</b>: object con (child) đi theo object cha (parent). <code>localPosition</code> tính theo cha, <code>position</code> tính theo world.</li>
      <li><b>Rigidbody2D</b> cho object chịu trọng lực. Thiếu <b>Collider</b> thì nó rơi xuyên qua mặt đất.</li>
      <li>Script của bạn cũng là Component (kế thừa <code>MonoBehaviour</code>). Lấy component khác bằng <code>GetComponent&lt;T&gt;()</code>.</li>
    </ul>
    <p class="callout">Thử xoay Player: Weapon là con nên quay theo. <code>localPosition</code> của Weapon không đổi, nhưng <code>position</code> (world) thay đổi liên tục.</p>`,
  keyPoints: [
    'GameObject = Transform + danh sách Component. Hành vi nằm trong Component.',
    'Child lưu localPosition theo parent. World position = vị trí parent + rotation parent × localPosition.',
    'GetComponent<T>() trả về null nếu không có component đó. Hãy gọi trong Awake và cache lại.',
    'Rigidbody cần Collider để va chạm. Thiếu một trong hai là lỗi thường gặp.',
  ],
  code: {
    title: 'PlayerSetup.cs',
    source: `
using UnityEngine;

public class PlayerSetup : MonoBehaviour
{
    [SerializeField] private Transform weapon;   // kéo object con vào Inspector
    private Rigidbody2D rb;

    void Awake()
    {
        rb = GetComponent<Rigidbody2D>();          // null nếu chưa gắn
        if (rb == null) rb = gameObject.AddComponent<Rigidbody2D>();

        if (!TryGetComponent(out BoxCollider2D col))
            Debug.LogWarning("Thiếu Collider: Player sẽ rơi xuyên Ground!");
    }

    void Update()
    {
        transform.Rotate(0, 0, 90f * Time.deltaTime);  // quay parent
        Debug.Log($"local {weapon.localPosition}  world {weapon.position}");
    }

    public void DropWeapon() => weapon.SetParent(null, true); // giữ world position
}`,
    note: 'SetParent(null, true) tách object con ra ngoài nhưng giữ nguyên vị trí world. localPosition lúc đó bằng world position.',
  },
  tryIt: [
    'Bật script Spinner (hoặc kéo Rotation Z): xem localPosition và world position của Weapon.',
    'Tắt BoxCollider2D trên Player: chuyện gì xảy ra với Rigidbody2D?',
    'Tắt SpriteRenderer: object vẫn tồn tại và vẫn rơi, chỉ là không được vẽ.',
    'Bấm SetParent(null) rồi xoay Player: Weapon còn quay theo không?',
    'Tắt Rigidbody2D rồi bấm GetComponent: Console in ra gì?',
  ],
  links: [
    { label: 'GameObjects (Manual)', url: 'https://docs.unity3d.com/Manual/GameObjects.html' },
    { label: 'Transform API', url: 'https://docs.unity3d.com/ScriptReference/Transform.html' },
    { label: 'GameObject.GetComponent', url: 'https://docs.unity3d.com/ScriptReference/GameObject.GetComponent.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const ctx = d.ctx;
    const comps = { SpriteRenderer: true, Rigidbody2D: true, BoxCollider2D: true, Spinner: false };
    const player = { x: -1.5, y: 0.5, vy: 0, rot: 20 };
    const weapon = { lx: 1.1, ly: 0.2, parented: true, wx: 0, wy: 0 };
    let selected = 'Player', drag = null, flash = 0, layout = {}, fellLogged = false;

    const rotV = (x, y, deg) => { const a = deg * Math.PI / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
    const weaponWorld = () => { if (!weapon.parented) return [weapon.wx, weapon.wy]; const [rx, ry] = rotV(weapon.lx, weapon.ly, player.rot); return [player.x + rx, player.y + ry]; };
    const f2 = (v) => v.toFixed(2);

    // Inspector
    stage.ui.group('Components trên Player');
    Object.keys(comps).forEach((k) => stage.ui.toggle(k === 'Spinner' ? 'Spinner (script)' : k, comps[k], (v) => {
      comps[k] = v; flash = 1; fellLogged = false;
      stage.log(v ? `Player.AddComponent<${k}>()` : `Destroy(Player.GetComponent<${k}>())`, v ? 'info' : 'warn');
      if (k === 'Rigidbody2D' && v) player.vy = 0;
    }));
    stage.ui.group('Transform');
    const rotS = stage.ui.slider('Player Rotation Z', { min: -180, max: 180, value: player.rot, unit: '°' }, (v) => (player.rot = v));
    stage.ui.slider('Weapon localPosition.x', { min: 0.6, max: 2.5, step: 0.1, value: weapon.lx }, (v) => { if (weapon.parented) weapon.lx = v; else stage.log('Weapon không còn parent: localPosition chính là world position', 'warn'); });
    const localR = stage.ui.readout('Weapon localPosition', '');
    const worldR = stage.ui.readout('Weapon position (world)', '');
    stage.ui.group('Script');
    stage.ui.button('GetComponent<T>()', () => {
      ['SpriteRenderer', 'Rigidbody2D', 'BoxCollider2D'].forEach((k) => stage.log(`GetComponent<${k}>() → ${comps[k] ? k + ' (Player)' : 'null'}`, comps[k] ? 'info' : 'error'));
    }, { variant: 'primary' });
    stage.ui.button('weapon.SetParent(...)', () => {
      const [wx, wy] = weaponWorld();
      if (weapon.parented) { Object.assign(weapon, { parented: false, wx, wy }); stage.log(`Weapon.SetParent(null): world giữ (${f2(wx)}, ${f2(wy)})`); }
      else { const [lx, ly] = rotV(wx - player.x, wy - player.y, -player.rot); Object.assign(weapon, { parented: true, lx, ly }); stage.log(`Weapon.SetParent(Player): local tính lại = (${f2(lx)}, ${f2(ly)})`); }
    });

    // World <-> screen
    const toS = (x, y) => [layout.ox + x * layout.s, layout.oy - y * layout.s];
    const toW = (sx, sy) => [(sx - layout.ox) / layout.s, (layout.oy - sy) / layout.s];

    stage.onPointer('down', (x, y) => {
      const L = layout;
      if (x < L.hw + 12) { (L.rows || []).forEach((r) => { if (y > r.y - 11 && y < r.y + 11) { selected = r.name; stage.log(`Chọn ${r.name} trong Hierarchy`); } }); return; }
      const [px, py] = toW(x, y), [wx, wy] = weaponWorld();
      if (U.dist(px, py, wx, wy) < 0.5) { drag = 'Weapon'; selected = 'Weapon'; }
      else if (U.dist(px, py, player.x, player.y) < 0.8) { drag = 'Player'; selected = 'Player'; }
    });
    stage.onPointer('move', (x, y) => {
      if (!drag) return;
      const [px, py] = toW(x, y);
      if (drag === 'Player') { player.x = U.clamp(px, -layout.xMax, layout.xMax); player.y = U.clamp(py, -1, 5); player.vy = 0; }
      else if (weapon.parented) { [weapon.lx, weapon.ly] = rotV(px - player.x, py - player.y, -player.rot); }
      else { weapon.wx = px; weapon.wy = py; }
    });
    stage.onPointer('up', () => { if (drag) stage.log(`${drag} thả tại world (${f2(drag === 'Player' ? player.x : weaponWorld()[0])}, ${f2(drag === 'Player' ? player.y : weaponWorld()[1])})`); drag = null; });

    stage.onFrame((dt) => {
      if (comps.Spinner) { player.rot = ((player.rot + 90 * dt + 180) % 360) - 180; rotS.set(Math.round(player.rot)); }
      if (comps.Rigidbody2D && drag !== 'Player') {
        player.vy -= 9.81 * dt; player.y += player.vy * dt;
        if (comps.BoxCollider2D && player.y < 0.5 && player.y > -0.3) { player.y = 0.5; player.vy = 0; }
        if (player.y < -4) { if (!fellLogged) stage.log('Player rơi xuyên Ground vì thiếu BoxCollider2D! (mô phỏng đặt lại vị trí)', 'warn'); fellLogged = true; player.y = 4; player.vy = 0; }
      }
      flash = Math.max(0, flash - dt * 2);
      const [wx, wy] = weaponWorld();
      localR.set(weapon.parented ? `(${f2(weapon.lx)}, ${f2(weapon.ly)})` : `(${f2(wx)}, ${f2(wy)})`);
      worldR.set(`(${f2(wx)}, ${f2(wy)})`);
      render();
    });

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      const hw = U.clamp(w * 0.3, 128, 230); layout.hw = hw;
      // Hierarchy panel
      d.node(12, 12, hw, h - 24, null, { accent: C.line, shadow: 4 });
      d.text('HIERARCHY', 24, 30, { font: 'mono', size: 11, weight: 700, color: C.muted });
      const rows = [{ name: 'Main Camera', depth: 0 }, { name: 'Ground', depth: 0 }, { name: 'Player', depth: 0 }, { name: 'Weapon', depth: weapon.parented ? 1 : 0 }];
      layout.rows = rows;
      rows.forEach((r, i) => {
        r.y = 52 + i * 24;
        if (r.name === selected) d.rect(18, r.y - 11, hw - 12, 22, { fill: 'rgba(42,86,163,0.14)', r: 5 });
        if (r.depth) d.line(30, r.y - 12, 30, r.y, { stroke: C.line, lw: 1.5 }), d.line(30, r.y, 38, r.y, { stroke: C.line, lw: 1.5 });
        d.text((r.depth ? '' : '▸ ') + r.name, 26 + r.depth * 16, r.y, { font: 'mono', size: 12, weight: r.name === selected ? 700 : 500, color: r.name === selected ? C.blue : C.navy });
      });
      // Component list of selected object
      const list = { 'Main Camera': ['Transform', 'Camera', 'AudioListener'], Ground: ['Transform', 'SpriteRenderer', 'BoxCollider2D'], Weapon: ['Transform', 'SpriteRenderer'],
        Player: ['Transform', ...Object.keys(comps).filter((k) => comps[k])] }[selected];
      let cy = 52 + rows.length * 24 + 14;
      d.text('INSPECTOR · ' + selected, 24, cy, { font: 'mono', size: 11, weight: 700, color: C.muted }); cy += 16;
      list.forEach((k) => {
        const col = { Transform: C.navy, SpriteRenderer: C.pink, Rigidbody2D: C.orange, BoxCollider2D: C.green, Spinner: C.purple, Camera: C.teal, AudioListener: C.teal }[k];
        if (cy + 24 > h - 16) return;
        d.rect(20, cy, hw - 16, 22, { fill: C.paper, stroke: col, lw: selected === 'Player' && flash > 0 && k !== 'Transform' ? 1.5 + flash * 2 : 1.5, r: 5 });
        d.rect(20, cy, 5, 22, { fill: col, r: 2 });
        d.text(k + (k === 'Spinner' ? ' (Script)' : ''), 32, cy + 11, { font: 'mono', size: 11, color: C.navy });
        cy += 27;
      });
      // Scene view
      const sx = hw + 24, sw = w - sx - 12, sh = h - 24;
      d.rect(sx, 12, sw, sh, { fill: 'rgba(255,250,241,0.6)', stroke: C.lineSoft, r: 10 });
      d.text('SCENE', sx + 12, 30, { font: 'mono', size: 11, weight: 700, color: C.muted });
      layout.s = Math.min(sw / 9, sh / 6.5); layout.ox = sx + sw / 2; layout.oy = 12 + sh * 0.74; layout.xMax = sw / 2 / layout.s - 0.6;
      const s = layout.s;
      // axes + ground
      const [ax, ay] = toS(0, 0);
      d.line(sx + 8, ay, sx + sw - 8, ay, { stroke: 'rgba(214,90,74,0.25)', lw: 1 }); d.line(ax, 20, ax, 12 + sh - 8, { stroke: 'rgba(63,168,107,0.25)', lw: 1 });
      d.rect(sx + 14, ay, sw - 28, Math.min(s * 0.6, 12 + sh - ay - 6), { fill: '#d9c6a8', stroke: C.trace, r: 4 });
      d.text('Ground', sx + 22, ay + 12, { font: 'mono', size: 11, color: C.muted });
      // Player (rotated)
      const [px, py] = toS(player.x, player.y), half = s * 0.5;
      ctx.save(); ctx.translate(px, py); ctx.rotate(-player.rot * Math.PI / 180);
      if (comps.SpriteRenderer) d.rect(-half, -half, half * 2, half * 2, { fill: C.blue, r: 6, shadow: 6 });
      else d.rect(-half, -half, half * 2, half * 2, { stroke: C.faint, dash: [4, 4], r: 6 });
      if (comps.SpriteRenderer) { d.circle(-half * 0.35, -half * 0.2, s * 0.08, { fill: '#fff' }); d.circle(half * 0.35, -half * 0.2, s * 0.08, { fill: '#fff' }); }
      if (comps.BoxCollider2D) d.rect(-half - 2, -half - 2, half * 2 + 4, half * 2 + 4, { stroke: C.green, lw: 1.5, r: 2 });
      d.line(0, 0, s * 0.8, 0, { stroke: C.red, lw: 2 }); d.line(0, 0, 0, -s * 0.8, { stroke: C.green, lw: 2 });
      ctx.restore();
      if (selected === 'Player') d.circle(px, py, half * 1.6, { stroke: C.blue, lw: 1.5, dash: [3, 4] });
      // Weapon
      const [wxw, wyw] = weaponWorld(), [wx, wy] = toS(wxw, wyw);
      if (weapon.parented) d.line(px, py, wx, wy, { stroke: C.purple, lw: 1.5, dash: [5, 4] });
      ctx.save(); ctx.translate(wx, wy); ctx.rotate(-(weapon.parented ? player.rot : 0) * Math.PI / 180);
      d.rect(-s * 0.3, -s * 0.1, s * 0.6, s * 0.2, { fill: C.orange, r: 3, shadow: 4 });
      ctx.restore();
      if (selected === 'Weapon') d.circle(wx, wy, s * 0.45, { stroke: C.orange, lw: 1.5, dash: [3, 4] });
      d.text('Player', px - half * 1.6, py, { align: 'right', font: 'mono', size: 11, weight: 600, color: C.navy });
      d.text('Weapon', wx, wy - s * 0.35, { align: 'center', font: 'mono', size: 11, weight: 600, color: C.orange });
      // Rigidbody velocity hint
      if (comps.Rigidbody2D && Math.abs(player.vy) > 0.5) d.arrow(px + half + 10, py, px + half + 10, py + U.clamp(-player.vy * 6, -60, 60), { stroke: C.orange, lw: 2 });
      // readout card
      const info = `local (${f2(weapon.parented ? weapon.lx : wxw)}, ${f2(weapon.parented ? weapon.ly : wyw)})   world (${f2(wxw)}, ${f2(wyw)})`;
      const label = sw > 400 ? 'Weapon ' + info : `Weapon world (${f2(wxw)}, ${f2(wyw)})`, iw = d.measure(label, { font: 'mono', size: 11 }) + 20;
      d.rect(sx + sw - iw - 12, 22, iw, 26, { fill: C.card, stroke: C.purple, lw: 1.5, r: 6 });
      d.text(label, sx + sw - iw - 2, 35, { font: 'mono', size: 11, color: C.navy });
    }
  },
});
