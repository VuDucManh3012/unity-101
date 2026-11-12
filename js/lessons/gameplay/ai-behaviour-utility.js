/* Lesson: Behaviour Tree & Utility AI — same NPC needs, two decision makers side by side (select mode). */
U101.defineLesson('ai-behaviour-utility', {
  lead: 'Behaviour Tree chọn hành động bằng cách duyệt một cây ưu tiên từ trái sang phải. Utility AI thì chấm điểm mọi hành động rồi chọn cái có điểm cao nhất.',
  hint: 'Đổi chế độ ở Inspector · kéo các nhu cầu (Đói, Mệt, Nguy hiểm, HP) hoặc bấm "Địch xuất hiện" để xem NPC đổi quyết định',
  overview: `
    <p>Khi AI có nhiều hành vi, FSM bắt đầu rối vì số transition tăng rất nhanh. Hai cách phổ biến để thay thế:</p>
    <ul>
      <li><b>Behaviour Tree (BT)</b>: mỗi lần <i>tick</i>, cây được duyệt từ gốc. Mỗi node trả về <b style="color:#3fa86b">Success</b>, <b style="color:#d65a4a">Failure</b> hoặc <b style="color:#c99a2e">Running</b>.</li>
      <li><b>Selector (?)</b>: thử từng con từ trái sang phải, dừng ở con đầu tiên <i>không</i> Failure. Giống phép OR, và thứ tự chính là độ ưu tiên.</li>
      <li><b>Sequence (→)</b>: chạy lần lượt các con, dừng khi có con Failure. Giống phép AND, thường là "Condition rồi Action".</li>
      <li><b>Condition / Action</b>: lá của cây. Condition kiểm tra nhanh; Action làm việc và trả về Running khi chưa xong.</li>
      <li><b>Utility AI</b>: mỗi hành động có một hàm điểm (response curve) từ 0 đến 1 dựa trên nhu cầu. NPC chọn điểm cao nhất, nên hành vi mềm và tự nhiên hơn, không cần sắp thứ tự cứng.</li>
    </ul>
    <p class="callout">Thử đặt Đói = 65 và Nguy hiểm = 55. BT luôn chọn <b>Fight</b> vì nhánh Fight đứng trước nhánh Eat. Utility AI cân cả hai con số rồi mới quyết định.</p>`,
  keyPoints: [
    'Selector = OR theo thứ tự ưu tiên; Sequence = AND. Kết quả chảy ngược lên gốc.',
    'Running cho phép một Action kéo dài qua nhiều tick (đi tới, ăn, ngủ...).',
    'Utility AI: điểm = hàm của nhu cầu, chọn max. Cộng thêm chút điểm "quán tính" cho hành động hiện tại để NPC không đổi ý liên tục.',
    'Unity có package Behavior (com.unity.behavior) với editor dạng đồ thị cho BT.',
  ],
  code: [{
    title: 'BehaviourTree.cs',
    source: `
public enum Status { Success, Failure, Running }

public abstract class Node { public abstract Status Tick(); }

public class Selector : Node            // OR: con đầu tiên không Failure
{
    private readonly Node[] children;
    public Selector(params Node[] c) => children = c;
    public override Status Tick()
    {
        foreach (var child in children)
        {
            var s = child.Tick();
            if (s != Status.Failure) return s;
        }
        return Status.Failure;
    }
}

public class Sequence : Node            // AND: dừng ở con đầu tiên không Success
{
    private readonly Node[] children;
    public Sequence(params Node[] c) => children = c;
    public override Status Tick()
    {
        foreach (var child in children)
        {
            var s = child.Tick();
            if (s != Status.Success) return s;
        }
        return Status.Success;
    }
}

// Dựng cây (trong NPC.Awake):
// root = new Selector(
//     new Sequence(new Condition(() => hp < 30), new FleeAction(this)),
//     new Sequence(new Condition(() => threat > 50), new FightAction(this)),
//     new Sequence(new Condition(() => hunger > 60), new EatAction(this)),
//     new WanderAction(this));`,
    note: 'Gọi root.Tick() trong Update hoặc theo chu kỳ (ví dụ 5 lần/giây) để tiết kiệm CPU.',
  }, {
    title: 'UtilityBrain.cs',
    source: `
using UnityEngine;

public class UtilityBrain : MonoBehaviour
{
    [SerializeField] private AnimationCurve eatCurve;   // vẽ curve ngay trong Inspector
    [Range(0, 1)] public float hunger, tiredness, threat, health = 1f;

    string Decide()
    {
        float eat    = eatCurve.Evaluate(hunger);
        float sleep  = tiredness * 0.9f;
        float fight  = threat * health;
        float flee   = threat * (1f - health) * (1f - health) * 1.6f;
        float wander = 0.2f;   // điểm nền: không có gì gấp thì đi dạo

        string best = "Wander"; float max = wander;
        if (eat > max)   { max = eat;   best = "Eat"; }
        if (sleep > max) { max = sleep; best = "Sleep"; }
        if (fight > max) { max = fight; best = "Fight"; }
        if (flee > max)  { max = flee;  best = "Flee"; }
        return best;
    }
}`,
    note: 'AnimationCurve là cách rất "Unity" để chỉnh response curve bằng mắt thay vì viết công thức.',
  }],
  tryIt: [
    'Ở chế độ Behaviour Tree, bấm "Tick" và đọc màu: node nào Failure, node nào Running?',
    'Kéo HP xuống 20 khi Nguy hiểm cao: nhánh Flee đứng đầu nên thắng ngay.',
    'Đặt Đói = 65, Nguy hiểm = 55 rồi so sánh quyết định của BT và Utility AI.',
    'Bật "Nhu cầu tự thay đổi" và quan sát NPC tự xoay vòng Eat → Sleep → Wander.',
    'Ở Utility AI, tìm giá trị HP mà Fight và Flee có điểm bằng nhau.',
  ],
  links: [
    { label: 'Unity Behavior package', url: 'https://docs.unity3d.com/Packages/com.unity.behavior@latest' },
    { label: 'Behavior trees for AI (Game Developer)', url: 'https://www.gamedeveloper.com/programming/behavior-trees-for-ai-how-they-work' },
    { label: 'AnimationCurve API', url: 'https://docs.unity3d.com/ScriptReference/AnimationCurve.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const N = { hunger: 30, tired: 25, threat: 10, health: 90 };
    const ACT_COL = { Flee: C.purple, Fight: C.red, Eat: C.orange, Sleep: C.blue, Wander: C.teal };
    const ST_COL = { Success: C.green, Failure: C.red, Running: C.yellow };
    const seq = (cond, f, act) => ({ t: 'seq', n: 'Sequence', c: [{ t: 'cond', n: cond, f }, { t: 'act', n: act }] });
    const tree = { t: 'sel', n: 'Selector', c: [
      seq('hp < 30', () => N.health < 30, 'Flee'), seq('threat>50', () => N.threat > 50, 'Fight'),
      seq('hunger>60', () => N.hunger > 60, 'Eat'), seq('tired>70', () => N.tired > 70, 'Sleep'), { t: 'act', n: 'Wander' }] };
    const UTIL = [
      { n: 'Eat', f: (h, ti, th) => Math.pow(h, 1.5), txt: 'hunger^1.5' },
      { n: 'Sleep', f: (h, ti) => ti * 0.9, txt: 'tired × 0.9' },
      { n: 'Fight', f: (h, ti, th, hp) => th * hp, txt: 'threat × hp' },
      { n: 'Flee', f: (h, ti, th, hp) => th * (1 - hp) * (1 - hp) * 1.6, txt: 'threat × (1−hp)² × 1.6' },
      { n: 'Wander', f: () => 0.2, txt: 'hằng số 0.2' },
    ];
    let mode = 'bt', auto = true, tickEvery = 1.2, tickT = 0, tickNo = 0, visits = [], reveal = 0, revealT = 0, action = 'Wander', syncT = 0;
    const bars = UTIL.map(() => 0);

    function tickNode(node) {
      let s;
      if (node.t === 'cond') s = node.f() ? 'Success' : 'Failure';
      else if (node.t === 'act') s = 'Running';
      else {
        s = node.t === 'sel' ? 'Failure' : 'Success';
        for (const ch of node.c) { const r = tickNode(ch); if (node.t === 'sel' ? r !== 'Failure' : r !== 'Success') { s = r; break; } }
      }
      visits.push({ node, s }); return s;
    }
    function btTick(instant) {
      visits = []; tickNo++; tickNode(tree); reveal = instant ? visits.length : 0; revealT = 0;
      setAction(visits.find((v) => v.node.t === 'act').node.n, `BT tick #${tickNo}`);
    }
    function scores() { return UTIL.map((u) => U.clamp(u.f(N.hunger / 100, N.tired / 100, N.threat / 100, N.health / 100), 0, 1)); }
    function setAction(a, why) { if (a !== action) stage.log(`${why}: ${action} → ${a}`, a === 'Flee' || a === 'Fight' ? 'warn' : 'info'); action = a; }

    stage.ui.group('Bộ ra quyết định');
    const modeSel = stage.ui.select('Chế độ', [{ value: 'bt', label: 'Behaviour Tree' }, { value: 'util', label: 'Utility AI' }], mode, (v) => { mode = v; stage.log(v === 'bt' ? 'Chuyển sang Behaviour Tree' : 'Chuyển sang Utility AI'); if (v === 'bt') btTick(true); });
    stage.ui.slider('Tick mỗi', { min: 0.4, max: 3, step: 0.1, value: tickEvery, unit: 's' }, (v) => (tickEvery = v));
    stage.ui.button('Tick', () => { mode = 'bt'; modeSel.set('bt'); btTick(false); }, { variant: 'primary' });
    stage.ui.button('Địch xuất hiện', () => { N.threat = 85; stage.log('Một kẻ địch xuất hiện! threat = 85', 'warn'); }, { variant: 'danger' });
    stage.ui.group('Nhu cầu NPC');
    const sl = {
      hunger: stage.ui.slider('Đói', { min: 0, max: 100, value: N.hunger }, (v) => (N.hunger = v)),
      tired: stage.ui.slider('Mệt', { min: 0, max: 100, value: N.tired }, (v) => (N.tired = v)),
      threat: stage.ui.slider('Nguy hiểm', { min: 0, max: 100, value: N.threat }, (v) => (N.threat = v)),
      health: stage.ui.slider('HP', { min: 0, max: 100, value: N.health }, (v) => (N.health = v)),
    };
    stage.ui.toggle('Nhu cầu tự thay đổi', auto, (v) => (auto = v));
    btTick(true);
    stage.log(`BT tick #1: Selector duyệt từ trái sang phải → ${action} (Running)`);

    const EFFECT = { Eat: { hunger: -22 }, Sleep: { tired: -18 }, Fight: { threat: -12, health: -9 }, Flee: { threat: -20 }, Wander: { threat: -2 } };
    stage.onFrame((dt) => {
      if (auto) {
        N.hunger += 4 * dt; N.tired += 3 * dt; if (action !== 'Fight') N.health += 2.5 * dt;
        Object.entries(EFFECT[action]).forEach(([k, v]) => (N[k] += v * dt));
        Object.keys(N).forEach((k) => (N[k] = U.clamp(N[k], 0, 100)));
        if ((syncT += dt) > 0.2) { syncT = 0; Object.keys(sl).forEach((k) => sl[k].set(Math.round(N[k]))); }
      }
      const sc = scores();
      sc.forEach((v, i) => (bars[i] = U.lerp(bars[i], v, Math.min(1, dt * 8))));
      if (mode === 'bt') {
        if ((revealT += dt) > 0.12 && reveal < visits.length) { reveal++; revealT = 0; }
        if ((tickT += dt) >= tickEvery) { tickT = 0; btTick(false); }
      } else { const pick = sc.map((v, i) => v + (UTIL[i].n === action ? 0.05 : 0)); setAction(UTIL[pick.indexOf(Math.max(...pick))].n, 'Utility'); }
      render(sc);
    });

    function render(sc) {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      const cardW = Math.min(190, w * 0.36), col = ACT_COL[action];
      d.node(14, 14, cardW, 62, null, { accent: col, lw: 2.5 });
      d.circle(40, 45, 14 + Math.sin(stage.time * 6) * 1.5, { fill: col, stroke: '#fff', lw: 2 });
      d.text('NPC', 62, 33, { font: 'cond', weight: 700, size: 16, color: C.navy });
      d.pill(action, 62, 56, { fill: col, size: 11 });
      const mx = cardW + 28, mw = (w - mx - 14) / 4;
      [['Đói', 'hunger', C.orange], ['Mệt', 'tired', C.blue], ['Nguy hiểm', 'threat', C.red], ['HP', 'health', C.green]].forEach(([lb, k, c], i) => {
        const x = mx + i * mw;
        d.text(`${lb} ${Math.round(N[k])}`, x, 30, { font: 'mono', size: 11, color: C.muted });
        d.rect(x, 44, mw - 12, 10, { fill: C.lineSoft, r: 5 });
        d.rect(x, 44, Math.max(10, (mw - 12) * N[k] / 100), 10, { fill: c, r: 5 });
      });
      if (mode === 'bt') drawTree(w, h); else drawUtility(w, h, sc);
    }

    function drawTree(w, h) {
      const top = 104, status = new Map(), cursor = visits[reveal - 1];
      visits.slice(0, reveal).forEach((v) => status.set(v.node, v.s));
      d.text(`Behaviour Tree · tick #${tickNo}`, 16, top - 12, { font: 'mono', size: 11, color: C.muted });
      const boxes = new Map(), wide = w >= 640;
      if (wide) {
        let leaf = 0; const colW = (w - 28) / 9, lvH = Math.min(130, (h - top - 56) / 2);
        const place = (n, dep) => {
          const x = n.c ? (n.c.map((ch) => place(ch, dep + 1)).reduce((a, b) => a + b) / n.c.length) : 14 + colW * (leaf++ + 0.5);
          boxes.set(n, { x: x - Math.min(colW - 8, 120) / 2, y: top + dep * lvH, w: Math.min(colW - 8, 120), h: 44 }); return x;
        };
        place(tree, 0);
      } else {
        let row = 0; const rh = Math.min(30, (h - top - 8) / 14);
        const place = (n, dep) => { boxes.set(n, { x: 14 + dep * 20, y: top + row++ * rh, w: Math.min(200, w - 40 - dep * 20), h: rh - 5, dep }); (n.c || []).forEach((ch) => place(ch, dep + 1)); };
        place(tree, 0);
      }
      boxes.forEach((b, n) => (n.c || []).forEach((ch) => {
        const cb = boxes.get(ch), c = status.has(ch) ? ST_COL[status.get(ch)] : C.line;
        if (wide) d.line(b.x + b.w / 2, b.y + b.h, cb.x + cb.w / 2, cb.y, { stroke: c, lw: status.has(ch) ? 2.5 : 1.5 });
        else d.poly([[b.x + 8, b.y + b.h], [b.x + 8, cb.y + cb.h / 2], [cb.x, cb.y + cb.h / 2]], { stroke: c, lw: 1.5 });
      }));
      boxes.forEach((b, n) => {
        const s = status.get(n), acc = s ? ST_COL[s] : C.line, sym = { sel: '? ', seq: '→ ', cond: '', act: '▶ ' }[n.t];
        const fill = n.t === 'cond' ? '#fff' : n.t === 'act' ? (n.n === action && s ? 'rgba(226,169,59,0.14)' : C.card) : C.paper;
        d.node(b.x, b.y, b.w, b.h, null, { accent: acc, lw: cursor && cursor.node === n ? 3.5 : 2, fill, shadow: s ? 8 : 2, r: n.t === 'cond' ? 18 : 8 });
        const lbl = sym + n.n, fs = wide ? 12 : 11;
        d.text(lbl, b.x + (wide ? b.w / 2 : 10), b.y + (wide ? 16 : b.h / 2), { align: wide ? 'center' : 'left', font: n.t === 'cond' ? 'mono' : 'cond', weight: 600, size: n.t === 'cond' ? 11 : fs, color: n.t === 'act' ? ACT_COL[n.n] : C.navy });
        if (s) d.text(s, wide ? b.x + b.w / 2 : b.x + b.w - 8, b.y + (wide ? 32 : b.h / 2), { align: wide ? 'center' : 'right', font: 'mono', size: 11, weight: 700, color: acc });
      });
    }

    function drawUtility(w, h, sc) {
      const top = 104, best = UTIL.findIndex((u) => u.n === action), rh = Math.min(72, (h - top - 10) / UTIL.length);
      const lx = 16, bx = Math.min(130, w * 0.24), bw = w - bx - 70;
      d.text('Utility AI · điểm (0 → 1) · hành động đang làm được +0.05 quán tính', lx, top - 12, { font: 'mono', size: 11, color: C.muted });
      UTIL.forEach((u, i) => {
        const y = top + i * rh, on = i === best, c = ACT_COL[u.n];
        if (on) d.rect(8, y, w - 16, rh - 6, { fill: 'rgba(255,255,255,0.7)', stroke: c, lw: 2, r: 10 });
        d.text(u.n, lx + 4, y + rh * 0.36, { font: 'cond', weight: 700, size: 15, color: c });
        d.text(u.txt, lx + 4, y + rh * 0.36 + 17, { font: 'mono', size: 11, color: C.muted });
        d.rect(bx, y + rh * 0.36 - 9, bw, 18, { fill: C.lineSoft, r: 9 });
        d.rect(bx, y + rh * 0.36 - 9, Math.max(18, bw * bars[i]), 18, { fill: c, r: 9 });
        d.text(sc[i].toFixed(2), w - 20, y + rh * 0.36, { align: 'right', font: 'mono', size: 13, weight: on ? 700 : 500, color: on ? c : C.ink });
        if (on) d.pill('MAX → chọn', Math.min(w - 110, bx + Math.max(18, bw * bars[i]) - 40), y + rh * 0.36 + 18, { fill: c, size: 11 });
      });
    }
  },
});
