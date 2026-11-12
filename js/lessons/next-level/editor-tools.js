/* Lesson: Editor customization — a fake Inspector reacting to attributes, plus Custom Editor, PropertyDrawer, EditorWindow and Gizmos. */
U101.defineLesson('editor-tools', {
  lead: 'Editor của Unity cũng là code C#. Bằng attribute, Custom Editor, PropertyDrawer, EditorWindow và Gizmos, bạn biến Inspector thành công cụ gọn gàng cho cả team.',
  hint: 'Bật/tắt từng attribute và công cụ ở Inspector bên dưới · kéo slider Radius trên canvas · rê chuột lên nhãn Radius · bấm Spawn Now · kéo object trong Scene',
  overview: `
    <p>Inspector mặc định vẽ mọi field được <b>serialize</b>. Bạn tùy biến nó theo ba mức:</p>
    <ul>
      <li><b>Attribute</b> (đặt ngay trên field, không cần code Editor): <code>[Header]</code> nhóm field, <code>[Range]</code> biến số thành slider, <code>[Tooltip]</code> hiện mô tả khi rê chuột, <code>[SerializeField]</code> hiện field private, <code>[HideInInspector]</code> ẩn field public.</li>
      <li><b>PropertyDrawer</b>: đổi cách vẽ <b>một kiểu dữ liệu</b> ở mọi nơi (ví dụ <code>MinMaxRange</code> vẽ thành thanh kéo hai đầu).</li>
      <li><b>Custom Editor</b> (<code>[CustomEditor(typeof(T))]</code>): viết lại toàn bộ Inspector của một component, thêm nút, cảnh báo, preview.</li>
      <li><b>EditorWindow</b> + <code>[MenuItem]</code>: cửa sổ công cụ riêng, mở từ menu.</li>
      <li><b>Gizmos</b> (<code>OnDrawGizmos</code>): vẽ hình hỗ trợ trong Scene view như vùng spawn, tầm nhìn, đường đi. Không xuất hiện trong bản build.</li>
    </ul>
    <p class="callout">Code dùng <code>UnityEditor</code> phải nằm trong thư mục <b>Editor/</b> (hoặc bọc <code>#if UNITY_EDITOR</code>), nếu không bản build sẽ lỗi.</p>`,
  keyPoints: [
    'Attribute là cách rẻ nhất: thêm 1 dòng, Inspector dễ dùng hơn hẳn.',
    'PropertyDrawer cho một kiểu dữ liệu, Custom Editor cho cả component, EditorWindow cho công cụ độc lập.',
    'Gizmos giúp nhìn thấy dữ liệu vô hình (bán kính, đường đi) ngay trong Scene.',
    'Script dùng UnityEditor phải đặt trong thư mục Editor.',
  ],
  code: [{
    title: 'EnemySpawner.cs',
    source: `
using UnityEngine;

public class EnemySpawner : MonoBehaviour
{
    [Header("Spawn")]
    [Tooltip("Bán kính vùng spawn (mét)")]
    [Range(1f, 10f)] public float radius = 4f;
    [SerializeField] private int maxEnemies = 6;   // private nhưng vẫn hiện
    [HideInInspector] public int spawnedCount;     // public nhưng bị ẩn
    public MinMaxRange interval;                   // vẽ bằng PropertyDrawer
    public Color gizmoColor = Color.cyan;

    public void SpawnNow() { /* Instantiate trong vòng tròn radius */ }

    void OnDrawGizmos()                            // chỉ chạy trong Editor
    {
        Gizmos.color = gizmoColor;
        Gizmos.DrawWireSphere(transform.position, radius);
    }
}`,
    note: 'Chỉ bằng attribute và OnDrawGizmos, component đã dễ chỉnh và dễ nhìn hơn nhiều.',
  }, {
    title: 'Editor/EnemySpawnerEditor.cs',
    source: `
using UnityEditor;
using UnityEngine;

[CustomEditor(typeof(EnemySpawner))]
public class EnemySpawnerEditor : Editor
{
    public override void OnInspectorGUI()
    {
        DrawDefaultInspector();                    // vẽ các field như bình thường
        var spawner = (EnemySpawner)target;
        EditorGUILayout.HelpBox($"Đã spawn {spawner.spawnedCount} enemy", MessageType.Info);
        if (GUILayout.Button("Spawn Now")) spawner.SpawnNow();
    }
}

public class SpawnerToolsWindow : EditorWindow
{
    [MenuItem("Tools/Spawner Tools")]
    static void Open() => GetWindow<SpawnerToolsWindow>("Spawner Tools");

    void OnGUI()
    {
        foreach (var s in FindObjectsByType<EnemySpawner>(FindObjectsSortMode.None))
            if (GUILayout.Button("Spawn " + s.name)) s.SpawnNow();
    }
}`,
    note: 'Custom Editor thêm nút vào Inspector. EditorWindow mở từ menu Tools/Spawner Tools.',
  }],
  tryIt: [
    'Tắt [Range]: Radius biến thành ô số. Bật lại và kéo slider, xem Gizmo thay đổi.',
    'Tắt [SerializeField]: field private maxEnemies biến mất khỏi Inspector (và không được lưu).',
    'Tắt [HideInInspector]: spawnedCount hiện ra. Vì sao nên ẩn field này?',
    'Bật Custom Editor rồi bấm Spawn Now nhiều lần.',
    'Bật EditorWindow và PropertyDrawer: Interval trông khác thế nào?',
  ],
  links: [
    { label: 'Custom Editors', url: 'https://docs.unity3d.com/Manual/editor-CustomEditors.html' },
    { label: 'PropertyDrawer', url: 'https://docs.unity3d.com/ScriptReference/PropertyDrawer.html' },
    { label: 'EditorWindow', url: 'https://docs.unity3d.com/ScriptReference/EditorWindow.html' },
    { label: 'Gizmos', url: 'https://docs.unity3d.com/ScriptReference/Gizmos.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const A = { header: true, range: true, tooltip: true, serialize: true, hide: true, drawer: false, custom: true, window: false, gizmos: true };
    const sp = { radius: 4, max: 6, spawned: 0, iMin: 1, iMax: 3, x: 0.5, y: 0.5 };
    let enemies = [], hits = [], drag = null, hover = null, pulse = 0;

    function spawn(n = 1) {
      for (let i = 0; i < n; i++) {
        if (enemies.length >= sp.max) { stage.log(`Đã đạt maxEnemies = ${sp.max}.`, 'warn'); break; }
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * sp.radius;
        enemies.push({ dx: Math.cos(a) * r, dy: Math.sin(a) * r, born: stage.time }); sp.spawned++;
      }
      pulse = 1;
    }
    spawn(3);

    const T = (k, label, on, off) => stage.ui.toggle(label, A[k], (v) => { A[k] = v; stage.log(v ? on : off); });
    stage.ui.group('Attribute');
    T('header', '[Header("Spawn")]', 'Header: thêm tiêu đề nhóm phía trên field.', 'Bỏ Header.');
    T('range', '[Range(1, 10)]', 'Range: float hiện thành slider, bị giới hạn 1–10.', 'Không có Range: chỉ còn ô nhập số, nhập gì cũng được.');
    T('tooltip', '[Tooltip]', 'Tooltip: rê chuột lên nhãn Radius để đọc mô tả.', 'Bỏ Tooltip.');
    T('serialize', '[SerializeField] maxEnemies', 'Field private được serialize → hiện trong Inspector và được lưu vào scene.', 'Field private không serialize → biến mất, giá trị không được lưu.');
    T('hide', '[HideInInspector] spawnedCount', 'HideInInspector: field public vẫn serialize nhưng bị ẩn.', 'spawnedCount hiện ra: designer có thể sửa nhầm giá trị runtime.');
    stage.ui.group('Công cụ Editor');
    T('drawer', 'PropertyDrawer (MinMaxRange)', 'PropertyDrawer: mọi field MinMaxRange đều vẽ thành thanh kéo hai đầu.', 'Không có drawer: vẽ mặc định từng field con.');
    T('custom', 'Custom Editor', 'Custom Editor: thêm HelpBox và nút Spawn Now dưới Inspector.', 'Quay về Inspector mặc định.');
    T('window', 'EditorWindow (Tools/Spawner Tools)', '[MenuItem("Tools/Spawner Tools")] mở EditorWindow.', 'Đóng EditorWindow.');
    T('gizmos', 'Gizmos (OnDrawGizmos)', 'OnDrawGizmos: vẽ vòng tròn bán kính spawn trong Scene view.', 'Tắt Gizmos: vùng spawn trở nên vô hình.');
    stage.ui.button('Clear enemies', () => { enemies = []; sp.spawned = 0; stage.log('Xóa toàn bộ enemy.'); });

    const hitAt = (x, y) => hits.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    stage.onPointer('down', (x, y) => {
      const r = hitAt(x, y); if (!r) return;
      if (r.id === 'spawn') { spawn(); stage.log(`Spawn Now → spawnedCount = ${sp.spawned}`); }
      else if (r.id === 'spawnAll') { spawn(2); stage.log('Spawner Tools: Spawn ×2 cho EnemySpawner.'); }
      else { drag = r; move(x, y); }
    });
    stage.onPointer('move', (x, y) => { hover = hitAt(x, y); if (drag) move(x, y); });
    stage.onPointer('up', () => { if (drag && drag.id !== 'obj') stage.log(`radius = ${sp.radius.toFixed(1)} · interval = ${sp.iMin.toFixed(1)}–${sp.iMax.toFixed(1)}s`); drag = null; });
    function move(x, y) {
      const t = U.clamp((x - drag.x) / drag.w, 0, 1);
      if (drag.id === 'radius') sp.radius = A.range ? 1 + t * 9 : U.clamp(sp.radius + (x - (drag.px ?? x)) * 0.05, 0, 30);
      if (drag.id === 'radius') drag.px = x;
      if (drag.id === 'iv') { const v = t * 10; if (Math.abs(v - sp.iMin) < Math.abs(v - sp.iMax)) sp.iMin = Math.min(v, sp.iMax); else sp.iMax = Math.max(v, sp.iMin); }
      if (drag.id === 'obj') { sp.x = U.clamp((x - drag.sx) / drag.sw, 0.1, 0.9); sp.y = U.clamp((y - drag.sy) / drag.sh, 0.15, 0.9); }
    }

    stage.onFrame((dt) => { pulse = Math.max(0, pulse - dt * 2); render(); });

    function render() {
      const { w, h } = stage, wide = w >= 640; hits = [];
      d.clear(w, h); d.grid(w, h);
      const iw = wide ? Math.min(360, w * 0.45) : w - 24, ih = wide ? h - 24 : Math.min(h * 0.64, 340);
      const sx = wide ? iw + 24 : 12, sy = wide ? 12 : ih + 22, sw = w - sx - 12, sh = h - sy - 12;
      // Inspector panel
      d.node(12, 12, iw, ih, null, { accent: A.custom ? C.teal : C.line, shadow: 4 });
      d.text('▾ # Enemy Spawner (Script)', 24, 30, { font: 'cond', weight: 700, size: 14, color: C.navy });
      if (A.custom) d.pill('CustomEditor', 12 + iw - 12 - d.measure('CustomEditor', { font: 'mono', size: 10 }) - 16, 30, { size: 10, fill: C.teal });
      let y = 56; const lx = 24, fx = 24 + iw * 0.42, fw = iw - (fx - 12) - 14, rowH = wide ? 26 : 21;
      const label = (t, col) => d.text(t, lx, y, { font: 'sans', size: 12, color: col || C.ink });
      const box = (t) => { d.rect(fx, y - 10, fw, 20, { fill: C.paper, stroke: C.line, lw: 1, r: 4 }); d.text(t, fx + 6, y, { font: 'mono', size: 11, color: C.navy }); };
      if (A.header) { d.text('Spawn', lx, y, { font: 'sans', size: 12, weight: 700, color: C.navy }); y += rowH; }
      label('Radius'); if (A.tooltip) d.text('ⓘ', lx + 46, y, { size: 11, color: C.teal });
      if (A.tooltip) hits.push({ id: 'tip', x: lx, y: y - 10, w: 60, h: 20 });
      if (A.range) {
        const tw = fw - 44, t = U.clamp((sp.radius - 1) / 9, 0, 1);
        d.line(fx, y, fx + tw, y, { stroke: C.line, lw: 4 }); d.line(fx, y, fx + tw * t, y, { stroke: C.teal, lw: 4 });
        d.circle(fx + tw * t, y, 7, { fill: '#fff', stroke: C.teal, lw: 2 });
        d.text(sp.radius.toFixed(1), fx + fw, y, { align: 'right', font: 'mono', size: 11, color: C.navy });
        hits.push({ id: 'radius', x: fx, y: y - 10, w: tw, h: 20 });
      } else { box(sp.radius.toFixed(1) + '   ↔ kéo'); hits.push({ id: 'radius', x: fx, y: y - 10, w: fw, h: 20 }); }
      y += rowH;
      if (A.serialize) { label('Max Enemies'); box(String(sp.max)); y += rowH; }
      if (!A.hide) { label('Spawned Count', C.orange); box(String(sp.spawned)); y += rowH; }
      label('Interval');
      if (A.drawer) {
        const X = (v) => fx + (v / 10) * (fw - 4);
        d.line(fx, y, fx + fw - 4, y, { stroke: C.line, lw: 4 }); d.line(X(sp.iMin), y, X(sp.iMax), y, { stroke: C.purple, lw: 6 });
        [sp.iMin, sp.iMax].forEach((v) => d.rect(X(v) - 4, y - 8, 8, 16, { fill: '#fff', stroke: C.purple, lw: 2, r: 3 }));
        d.text(`${sp.iMin.toFixed(1)}s – ${sp.iMax.toFixed(1)}s`, fx + fw / 2, y + 16, { align: 'center', font: 'mono', size: 10, color: C.purple });
        hits.push({ id: 'iv', x: fx, y: y - 10, w: fw - 4, h: 20 }); y += rowH + 8;
      } else { y += rowH; label('   Min'); box(sp.iMin.toFixed(1)); y += rowH; label('   Max'); box(sp.iMax.toFixed(1)); y += rowH; }
      label('Gizmo Color'); d.rect(fx, y - 9, fw, 18, { fill: C.teal, r: 4 }); y += rowH + 4;
      if (A.custom && y + 70 < ih + 12) {
        d.rect(lx, y - 10, iw - 24, 28, { fill: 'rgba(42,86,163,0.08)', stroke: C.blue, lw: 1, r: 5 });
        d.text(`ⓘ Đã spawn ${sp.spawned} enemy`, lx + 10, y + 4, { font: 'sans', size: 12, color: C.blue }); y += 36;
        d.rect(lx, y - 8, iw - 24, 28, { fill: pulse > 0 ? C.teal : C.navy2, r: 6 });
        d.text('Spawn Now', lx + (iw - 24) / 2, y + 6, { align: 'center', font: 'cond', weight: 700, size: 13, color: '#fff' });
        hits.push({ id: 'spawn', x: lx, y: y - 8, w: iw - 24, h: 28 });
      }
      // Scene view
      d.rect(sx, sy, sw, sh, { fill: '#e9e2d4', stroke: C.line, r: 10 });
      d.text('Scene', sx + 12, sy + 16, { font: 'mono', size: 11, weight: 700, color: C.muted });
      const ox = sx + sw * sp.x, oy = sy + sh * sp.y, ppm = Math.min(sw, sh) / 18;
      hits.push({ id: 'obj', x: ox - 16, y: oy - 16, w: 32, h: 32, sx, sy, sw, sh });
      d.ctx.save(); d.ctx.beginPath(); d.ctx.rect(sx, sy, sw, sh); d.ctx.clip();
      if (A.gizmos) {
        d.circle(ox, oy, sp.radius * ppm, { stroke: C.teal, lw: 2, fill: 'rgba(26,163,161,0.07)' });
        d.line(ox, oy, ox + sp.radius * ppm, oy, { stroke: C.teal, lw: 1, dash: [4, 3] });
        d.text(`r = ${sp.radius.toFixed(1)}`, ox + (sp.radius * ppm) / 2, oy - 9, { align: 'center', font: 'mono', size: 10, color: C.tealDeep });
      }
      enemies.forEach((e) => { const k = U.clamp((stage.time - e.born) * 4, 0, 1); d.circle(ox + e.dx * ppm, oy + e.dy * ppm, 6 * U.ease.outBack(k), { fill: C.red, stroke: '#fff', lw: 1.5 }); });
      d.rect(ox - 12, oy - 12, 24, 24, { fill: C.navy2, stroke: drag && drag.id === 'obj' ? C.yellow : '#fff', lw: 2, r: 4 });
      d.text('Spawner (kéo được)', ox, oy + 24, { align: 'center', font: 'mono', size: 10, color: C.navy });
      d.ctx.restore();
      if (A.window) {
        const ww = Math.min(200, sw - 24), wx = sx + sw - ww - 12, wy = sy + 30;
        d.node(wx, wy, ww, 92, null, { accent: C.purple });
        d.rect(wx, wy, ww, 22, { fill: C.purple, r: 10 }); d.text('Spawner Tools', wx + 10, wy + 11, { font: 'cond', weight: 700, size: 12, color: '#fff' });
        d.text(`EnemySpawner · ${enemies.length}/${sp.max}`, wx + 10, wy + 38, { font: 'mono', size: 10, color: C.ink });
        d.rect(wx + 10, wy + 54, ww - 20, 26, { fill: C.navy2, r: 6 }); d.text('Spawn ×2', wx + ww / 2, wy + 67, { align: 'center', font: 'cond', weight: 700, size: 12, color: '#fff' });
        hits.push({ id: 'spawnAll', x: wx + 10, y: wy + 54, w: ww - 20, h: 26 });
      }
      if (A.tooltip && hover && hover.id === 'tip') {
        const t = 'Bán kính vùng spawn (mét)', tw = d.measure(t, { size: 11 }) + 16;
        d.rect(hover.x + 10, hover.y + 22, tw, 22, { fill: C.navy, r: 4 }); d.text(t, hover.x + 18, hover.y + 33, { size: 11, color: '#fff' });
      }
    }
  },
});
