/* Lesson: Prefabs — asset → instances, overrides, Apply/Revert, nested prefab, prefab variant. */
U101.defineLesson('prefabs', {
  lead: 'Prefab là một GameObject được lưu thành asset để dùng lại. Sửa prefab asset thì mọi instance trong scene cập nhật theo, trừ những thuộc tính mà instance đã override.',
  hint: 'Đổi màu/scale của Enemy.prefab và xem instance cập nhật · bấm vào một instance rồi override, Apply hoặc Revert',
  overview: `
    <p>Kéo một GameObject từ Hierarchy vào cửa sổ Project là tạo ra <b>Prefab asset</b>. Mỗi bản kéo vào scene là một <b>instance</b> liên kết với asset đó (tên hiện màu xanh trong Hierarchy).</p>
    <ul>
      <li><b>Override</b>: instance đổi một giá trị khác asset. Inspector hiện giá trị đó <b>in đậm</b> kèm vạch xanh bên trái.</li>
      <li><b>Apply</b>: đẩy override ngược lên asset, mọi instance khác nhận giá trị mới. <b>Revert</b>: bỏ override, quay về giá trị của asset.</li>
      <li><b>Nested Prefab</b>: prefab nằm bên trong prefab khác (HealthBar trong Enemy). Sửa HealthBar thì mọi Enemy đều đổi theo.</li>
      <li><b>Prefab Variant</b>: kế thừa một prefab gốc và chỉ lưu phần khác biệt. EnemyBoss = Enemy + scale to hơn + màu riêng.</li>
    </ul>
    <p class="callout">Thứ tự ưu tiên: <b>override của instance</b> → <b>Variant</b> → <b>Prefab gốc</b> → <b>Nested prefab</b>. Giá trị gần instance nhất sẽ thắng.</p>`,
  keyPoints: [
    'Sửa Prefab asset thì mọi instance cập nhật, trừ thuộc tính đang bị override.',
    'Override hiện in đậm và có vạch xanh. Apply đẩy lên asset, Revert bỏ override.',
    'Variant kế thừa prefab gốc. Sửa gốc thì Variant cũng đổi, trừ phần Variant đã override.',
    'Instantiate(prefab) lúc runtime tạo bản sao mới từ asset.',
  ],
  code: {
    title: 'EnemySpawner.cs',
    source: `
using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    [SerializeField] private Enemy enemyPrefab;      // kéo Enemy.prefab vào đây
    [SerializeField] private Enemy bossPrefab;       // EnemyBoss.prefab (Variant)
    [SerializeField] private Transform[] spawnPoints;

    void Start()
    {
        foreach (var point in spawnPoints)
        {
            Enemy e = Instantiate(enemyPrefab, point.position, Quaternion.identity);
            e.name = $"Enemy ({point.name})";
        }
        Instantiate(bossPrefab, transform.position, Quaternion.identity);
    }
}`,
    note: 'Khai báo field kiểu component (Enemy) thay vì GameObject: Instantiate trả về luôn component đó, khỏi phải GetComponent.',
  },
  tryIt: [
    'Đổi màu Enemy.prefab: những instance nào đổi theo, instance nào giữ nguyên?',
    'Chọn Enemy (2), override màu, rồi bấm Apply: các Enemy khác thay đổi ra sao?',
    'Đổi màu HealthBar.prefab (nested): cả Boss cũng đổi theo không?',
    'Tắt override Scale trên Variant EnemyBoss: Boss giờ lấy scale từ đâu?',
    'Chọn Boss, override màu rồi Apply: thay đổi đi vào Enemy.prefab hay EnemyBoss.prefab?',
  ],
  links: [
    { label: 'Prefabs (Manual)', url: 'https://docs.unity3d.com/Manual/Prefabs.html' },
    { label: 'Nested Prefabs', url: 'https://docs.unity3d.com/Manual/NestedPrefabs.html' },
    { label: 'Prefab Variants', url: 'https://docs.unity3d.com/Manual/PrefabVariants.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const COLORS = { red: C.red, blue: C.blue, green: C.green, purple: C.purple, orange: C.orange };
    const COLOR_OPTS = Object.keys(COLORS);
    const healthBar = { hpColor: 'green' };
    const enemy = { color: 'red', scale: 1 };
    const boss = { overrides: { color: 'purple', scale: 1.6 } };
    const insts = ['Enemy (1)', 'Enemy (2)', 'Enemy (3)', 'EnemyBoss (1)'].map((name, i) => ({ name, isBoss: i === 3, overrides: {}, flash: 0, phase: i * 1.7 }));
    insts[2].overrides.color = 'blue';
    let sel = insts[2], layout = {};

    // Value resolution: instance override → variant override → base prefab → nested prefab
    const assetVal = (inst, k) => (inst.isBoss && k in boss.overrides ? boss.overrides[k] : k === 'hpColor' ? healthBar.hpColor : enemy[k]);
    const val = (inst, k) => (k in inst.overrides ? inst.overrides[k] : assetVal(inst, k));
    const reaches = (it, src, k) => (src === 'EnemyBoss' ? it.isBoss : src === 'Enemy' ? !(it.isBoss && k in boss.overrides) : true);
    function propagate(src, k) {
      const hit = insts.filter((it) => reaches(it, src, k) && !(k in it.overrides));
      hit.forEach((it) => (it.flash = 1));
      stage.log(`${src}.prefab: ${k} thay đổi → ${hit.length} instance cập nhật`);
      insts.filter((it) => !hit.includes(it) && (src !== 'EnemyBoss' || it.isBoss)).forEach((it) =>
        stage.log(`  ${it.name} giữ nguyên vì ${k in it.overrides ? 'instance' : 'Variant EnemyBoss'} đang override ${k}`, 'warn'));
    }

    stage.ui.group('Enemy.prefab (asset gốc)');
    stage.ui.select('Color', COLOR_OPTS, enemy.color, (v) => { enemy.color = v; propagate('Enemy', 'color'); });
    stage.ui.slider('Scale', { min: 0.6, max: 1.4, step: 0.1, value: enemy.scale }, (v) => { enemy.scale = v; propagate('Enemy', 'scale'); });
    stage.ui.group('HealthBar.prefab (nested trong Enemy)');
    stage.ui.select('Bar color', COLOR_OPTS, healthBar.hpColor, (v) => { healthBar.hpColor = v; propagate('HealthBar', 'hpColor'); });
    stage.ui.group('EnemyBoss.prefab (Variant của Enemy)');
    stage.ui.toggle('Override Scale = 1.6', true, (v) => { if (v) boss.overrides.scale = 1.6; else delete boss.overrides.scale; insts[3].flash = 1; stage.log(v ? 'Variant override scale = 1.6' : 'Variant bỏ override scale → lấy scale từ Enemy.prefab'); });
    stage.ui.toggle('Override Color = purple', true, (v) => { if (v) boss.overrides.color = 'purple'; else delete boss.overrides.color; insts[3].flash = 1; stage.log(v ? 'Variant override color = purple' : 'Variant bỏ override color → lấy màu từ Enemy.prefab'); });
    stage.ui.group('Instance đang chọn');
    const selR = stage.ui.readout('Đang chọn', sel.name);
    const ovSel = stage.ui.select('Override Color', [{ value: '', label: '(theo prefab)' }, ...COLOR_OPTS], sel.overrides.color || '', (v) => {
      if (v) sel.overrides.color = v; else delete sel.overrides.color;
      sel.flash = 1; stage.log(v ? `${sel.name}: override color = ${v} (in đậm trong Inspector)` : `${sel.name}: dùng màu của prefab`);
    });
    stage.ui.button('Apply', () => {
      const keys = Object.keys(sel.overrides);
      if (!keys.length) return stage.log(`${sel.name} không có override nào để Apply`, 'warn');
      keys.forEach((k) => { if (sel.isBoss) boss.overrides[k] = sel.overrides[k]; else enemy[k] = sel.overrides[k]; delete sel.overrides[k]; });
      const target = sel.isBoss ? 'EnemyBoss' : 'Enemy';
      stage.log(`Apply to Prefab '${target}': ${keys.join(', ')} ghi vào asset`);
      keys.forEach((k) => propagate(target, k)); syncSel();
    }, { variant: 'primary' });
    stage.ui.button('Revert', () => {
      const keys = Object.keys(sel.overrides);
      if (!keys.length) return stage.log(`${sel.name} không có override nào để Revert`, 'warn');
      sel.overrides = {}; sel.flash = 1; stage.log(`Revert ${sel.name}: bỏ override ${keys.join(', ')}`); syncSel();
    }, { variant: 'danger' });
    function syncSel() { selR.set(sel.name); ovSel.set(sel.overrides.color || ''); }

    stage.onPointer('down', (x, y) => {
      (layout.hits || []).forEach((hit) => { if (U.dist(x, y, hit.x, hit.y) < hit.r) { sel = hit.inst; syncSel(); stage.log(`Chọn ${sel.name} trong Scene`); } });
    });

    stage.onFrame((dt, t) => { insts.forEach((it) => (it.flash = Math.max(0, it.flash - dt * 1.5))); render(t); });

    function render(t) {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      const pw = U.clamp(w * 0.34, 150, 270), px = 12;
      // Project panel: asset graph
      d.text('PROJECT · Assets/Prefabs', px + 4, 22, { font: 'mono', size: 11, weight: 700, color: C.muted });
      const cardH = 46, gap = 16;
      const asset = (y, name, sub, col, accent) => {
        d.node(px, y, pw, cardH, null, { accent, shadow: 4 });
        d.rect(px + 10, y + 12, 22, 22, { fill: COLORS[col], r: 5 });
        d.text(name, px + 42, y + 17, { font: 'cond', size: 14, weight: 700, color: C.navy });
        d.text(sub, px + 42, y + 33, { font: 'mono', size: 11, color: C.muted });
      };
      const y1 = 36, y2 = y1 + cardH + gap, y3 = y2 + cardH + gap;
      asset(y1, 'HealthBar.prefab', 'nested', healthBar.hpColor, C.green);
      asset(y2, 'Enemy.prefab', `scale ${enemy.scale.toFixed(1)}`, enemy.color, C.blue);
      asset(y3, 'EnemyBoss.prefab', 'Variant · ' + (Object.keys(boss.overrides).join(', ') || 'không override'), assetVal(insts[3], 'color'), C.purple);
      d.arrow(px + pw - 24, y1 + cardH, px + pw - 24, y2, { stroke: C.green, lw: 1.5, head: 7 });
      d.arrow(px + 24, y2 + cardH, px + 24, y3, { stroke: C.purple, lw: 1.5, head: 7 });
      d.text('lồng vào', px + pw - 30, y1 + cardH + gap / 2, { align: 'right', font: 'mono', size: 11, color: C.green });
      d.text('kế thừa', px + 32, y2 + cardH + gap / 2, { font: 'mono', size: 11, color: C.purple });

      // Inspector card for selected instance
      const iy = y3 + cardH + 22, rows = [['Color', 'color'], ['Scale', 'scale'], ['HealthBar.color', 'hpColor']];
      d.text('INSPECTOR · ' + sel.name, px + 4, iy, { font: 'mono', size: 11, weight: 700, color: C.blue });
      rows.forEach(([label, k], i) => {
        const ry = iy + 14 + i * 26, ov = k in sel.overrides;
        if (ry + 22 > h - 6) return;
        d.rect(px, ry, pw, 22, { fill: ov ? 'rgba(42,86,163,0.10)' : C.paper, stroke: C.lineSoft, lw: 1, r: 4 });
        if (ov) d.rect(px, ry, 4, 22, { fill: C.blue, r: 2 });
        const v = val(sel, k);
        d.text(label, px + 12, ry + 11, { font: 'mono', size: 11, weight: ov ? 800 : 500, color: ov ? C.navy : C.muted });
        d.text(typeof v === 'number' ? v.toFixed(1) : v, px + pw - 10, ry + 11, { align: 'right', font: 'mono', size: 11, weight: ov ? 800 : 500, color: typeof v === 'number' ? C.navy : COLORS[v] });
      });

      // Scene with instances
      const sx = px + pw + 18, sw = w - sx - 12, sy = 12, sh = h - 24;
      d.rect(sx, sy, sw, sh, { fill: 'rgba(255,250,241,0.6)', stroke: C.lineSoft, r: 10 });
      d.text('SCENE', sx + 12, sy + 16, { font: 'mono', size: 11, weight: 700, color: C.muted });
      const groundY = sy + sh * 0.72, base = Math.min(sw / 7.5, sh / 4.5);
      d.line(sx + 12, groundY, sx + sw - 12, groundY, { stroke: C.trace, lw: 2 });
      layout.hits = [];
      insts.forEach((it, i) => {
        const cx = sx + sw * (0.14 + i * 0.24), sc = val(it, 'scale'), r = base * 0.5 * sc;
        const bob = Math.abs(Math.sin(t * 2.4 + it.phase)) * 4, cy = groundY - r - bob;
        layout.hits.push({ x: cx, y: cy, r: r + 8, inst: it });
        if (it.flash > 0) d.circle(cx, cy, r + 6 + (1 - it.flash) * 18, { stroke: C.yellow, lw: 3 * it.flash });
        if (it === sel) d.circle(cx, cy, r + 6, { stroke: C.blue, lw: 1.5, dash: [4, 4] });
        d.rect(cx - r, cy - r, r * 2, r * 2, { fill: COLORS[val(it, 'color')], r: r * 0.45, shadow: 6 });
        d.circle(cx - r * 0.35, cy - r * 0.15, r * 0.16, { fill: '#fff' }); d.circle(cx + r * 0.35, cy - r * 0.15, r * 0.16, { fill: '#fff' });
        if (it.isBoss) d.poly([[cx - r * 0.6, cy - r], [cx - r * 0.4, cy - r * 1.35], [cx, cy - r * 1.05], [cx + r * 0.4, cy - r * 1.35], [cx + r * 0.6, cy - r]], { fill: C.yellow, close: true });
        // nested HealthBar
        const bw = r * 2, by = cy - r - (it.isBoss ? r * 0.55 : 0) - 14;
        d.rect(cx - bw / 2, by, bw, 6, { fill: C.lineSoft, r: 3 });
        d.rect(cx - bw / 2, by, bw * (0.55 + 0.4 * ((i * 37) % 10) / 10), 6, { fill: COLORS[val(it, 'hpColor')], r: 3 });
        const ov = Object.keys(it.overrides).length > 0;
        const ly = groundY + 16 + (sw < 460 && i % 2 ? 30 : 0);
        d.text(it.name, cx, ly, { align: 'center', font: 'mono', size: 11, weight: ov ? 800 : 600, color: C.blue });
        if (ov) d.text('override: ' + Object.keys(it.overrides).join(','), cx, ly + 15, { align: 'center', font: 'mono', size: 11, color: C.muted });
      });
    }
  },
});
