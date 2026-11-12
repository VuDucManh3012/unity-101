/* Lesson: A* pathfinding — paintable grid, open/closed sets, g/h/f, heuristic comparison, NavMesh notes. */
U101.defineLesson('pathfinding-astar', {
  lead: 'A* tìm đường ngắn nhất trên đồ thị bằng cách luôn mở rộng ô có f = g + h nhỏ nhất: g là chi phí đã đi, h là ước lượng còn lại tới đích.',
  hint: 'Kéo trên lưới để vẽ / xóa tường · kéo ô S hoặc G để đổi điểm đầu, điểm cuối · bấm "Chạy A*" để xem từng bước',
  overview: `
    <p>Pathfinding là bài toán tìm đường đi trên một <b>đồ thị</b>. Ở đây mỗi ô lưới là một node, nối với các ô kề bên. A* quản lý hai tập:</p>
    <ul>
      <li><b>Open set</b> (vàng): các ô đã phát hiện nhưng chưa xét. Mỗi bước lấy ra ô có <code>f</code> nhỏ nhất.</li>
      <li><b>Closed set</b> (xanh): các ô đã xét xong, không cần quay lại.</li>
      <li><b>g</b> = chi phí thật từ Start; <b>h</b> = heuristic ước lượng tới Goal; <b>f = g + h</b>.</li>
      <li>Mỗi ô nhớ <b>parent</b> (gạch nhỏ trong ô). Tới Goal thì đi ngược theo parent để dựng đường.</li>
    </ul>
    <p><b>Heuristic</b> quyết định A* "thông minh" đến đâu. <code>h = 0</code> chính là thuật toán Dijkstra: loang đều mọi hướng, chắc chắn đúng nhưng xét rất nhiều ô. Manhattan hợp với lưới 4 hướng. Heuristic không được <i>vượt quá</i> chi phí thật (admissible) thì đường tìm được mới chắc chắn ngắn nhất.</p>
    <p class="callout">Trong Unity bạn hiếm khi tự viết A* cho nhân vật 3D. Hãy bake <b>NavMesh</b> (package AI Navigation, component <code>NavMeshSurface</code>) rồi gắn <b>NavMeshAgent</b> và gọi <code>SetDestination()</code>. Bên dưới, Unity chạy A* trên các đa giác của NavMesh thay vì ô lưới. Tự viết A* vẫn hữu ích cho game lưới 2D, tower defense, puzzle theo lượt.</p>`,
  keyPoints: [
    'A* luôn mở rộng ô có f = g + h nhỏ nhất trong open set.',
    'h = 0 → Dijkstra (chậm nhưng chắc). h tốt và admissible → nhanh mà vẫn tối ưu.',
    'Đi chéo mà vẫn dùng Manhattan thì h có thể vượt chi phí thật → nhanh hơn nhưng đường có thể không ngắn nhất.',
    'Unity: NavMesh + NavMeshAgent lo pathfinding, tránh vật cản và di chuyển cho bạn.',
  ],
  code: [{
    title: 'AStar.cs',
    source: `
using System.Collections.Generic;
using UnityEngine;

public static class AStar
{
    public static List<Vector2Int> FindPath(bool[,] walls, Vector2Int start, Vector2Int goal)
    {
        var open = new List<Vector2Int> { start };
        var closed = new HashSet<Vector2Int>();
        var g = new Dictionary<Vector2Int, float> { [start] = 0 };
        var parent = new Dictionary<Vector2Int, Vector2Int>();
        float H(Vector2Int p) => Mathf.Abs(p.x - goal.x) + Mathf.Abs(p.y - goal.y); // Manhattan

        while (open.Count > 0)
        {
            // lấy ô có f = g + h nhỏ nhất (game thật nên dùng priority queue / heap)
            var cur = open[0];
            foreach (var p in open) if (g[p] + H(p) < g[cur] + H(cur)) cur = p;
            if (cur == goal) return Rebuild(parent, cur);
            open.Remove(cur); closed.Add(cur);

            foreach (var dir in new[] { Vector2Int.up, Vector2Int.down, Vector2Int.left, Vector2Int.right })
            {
                var n = cur + dir;
                if (n.x < 0 || n.y < 0 || n.x >= walls.GetLength(0) || n.y >= walls.GetLength(1)) continue;
                if (walls[n.x, n.y] || closed.Contains(n)) continue;
                float newG = g[cur] + 1;
                if (!g.TryGetValue(n, out var oldG) || newG < oldG)
                {
                    g[n] = newG; parent[n] = cur;
                    if (!open.Contains(n)) open.Add(n);
                }
            }
        }
        return null; // không có đường
    }

    static List<Vector2Int> Rebuild(Dictionary<Vector2Int, Vector2Int> parent, Vector2Int cur)
    {
        var path = new List<Vector2Int> { cur };
        while (parent.TryGetValue(cur, out cur)) path.Add(cur);
        path.Reverse();
        return path;
    }
}`,
    note: 'Open set dùng List cho dễ đọc. Với bản đồ lớn, đổi sang binary heap để lấy min trong O(log n).',
  }, {
    title: 'ClickToMove.cs',
    source: `
using UnityEngine;
using UnityEngine.AI;

[RequireComponent(typeof(NavMeshAgent))]
public class ClickToMove : MonoBehaviour
{
    private NavMeshAgent agent;
    private Camera cam;

    void Awake() { agent = GetComponent<NavMeshAgent>(); cam = Camera.main; }

    void Update()
    {
        if (!Input.GetMouseButtonDown(0)) return;
        if (Physics.Raycast(cam.ScreenPointToRay(Input.mousePosition), out var hit))
            agent.SetDestination(hit.point);   // NavMesh tự chạy A* và lái agent

        // agent.pathStatus: PathComplete / PathPartial / PathInvalid
    }
}`,
    note: 'Cần bake NavMesh trước (NavMeshSurface → Bake). NavMeshObstacle với Carve để vật cản động khoét lỗ trên NavMesh.',
  }],
  tryIt: [
    'Bấm "Chạy A*" và quan sát open set (vàng) lan ra, closed set (xanh) theo sau.',
    'Đổi Heuristic sang Dijkstra (h=0): số ô đã xét tăng bao nhiêu? Độ dài đường có đổi không?',
    'Kéo G vào trong "cái cốc" tường: A* phải xét nhiều ô hơn hẳn vì heuristic bị đánh lừa.',
    'Bật đi chéo với Manhattan rồi so sánh cost với Euclid.',
    'Vẽ tường bịt kín Goal: open set cạn và A* báo không có đường.',
  ],
  links: [
    { label: 'Red Blob Games: Introduction to A*', url: 'https://www.redblobgames.com/pathfinding/a-star/introduction.html' },
    { label: 'Unity AI Navigation package', url: 'https://docs.unity3d.com/Packages/com.unity.ai.navigation@latest' },
    { label: 'NavMeshAgent API', url: 'https://docs.unity3d.com/ScriptReference/AI.NavMeshAgent.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C } = stage;
    const COLS = 26, ROWS = 15, N = COLS * ROWS, SQ2 = Math.SQRT2;
    const HEUR = { manhattan: (dx, dy) => dx + dy, euclid: (dx, dy) => Math.hypot(dx, dy), dijkstra: () => 0 };
    const HNAME = { manhattan: 'Manhattan', euclid: 'Euclid', dijkstra: 'Dijkstra (h=0)' };
    const walls = new Uint8Array(N), id = (x, y) => y * COLS + x;
    for (let y = 3; y <= 11; y++) walls[id(15, y)] = 1;
    for (let x = 10; x <= 15; x++) { walls[id(x, 3)] = 1; walls[id(x, 11)] = 1; }
    for (let y = 0; y <= 6; y++) walls[id(21, y)] = 1;
    let start = id(4, 7), goal = id(22, 9), heur = 'manhattan', diag = false, speed = 30, running = false, acc = 0;
    let S, compare = {}, drag = null, paintVal = 1, hover = -1;

    function makeSearch(hk) {
      const gx = goal % COLS, gy = (goal / COLS) | 0, hf = (i) => HEUR[hk](Math.abs(i % COLS - gx), Math.abs(((i / COLS) | 0) - gy));
      const s = { g: new Float64Array(N).fill(Infinity), par: new Int32Array(N).fill(-1), closed: new Uint8Array(N), inOpen: new Uint8Array(N), open: [start], h: hf, cur: -1, visited: 0, done: false, path: null };
      s.g[start] = 0; s.inOpen[start] = 1;
      s.step = () => {
        if (s.done) return;
        if (!s.open.length) { s.done = true; return; }
        let bi = 0;
        s.open.forEach((n, k) => { const f = s.g[n] + hf(n), bf = s.g[s.open[bi]] + hf(s.open[bi]); if (f < bf - 1e-9 || (Math.abs(f - bf) < 1e-9 && hf(n) < hf(s.open[bi]))) bi = k; });
        const c = s.open.splice(bi, 1)[0]; s.inOpen[c] = 0; s.closed[c] = 1; s.visited++; s.cur = c;
        if (c === goal) { s.done = true; s.path = []; for (let p = c; p !== -1; p = s.par[p]) s.path.unshift(p); return; }
        const cx = c % COLS, cy = (c / COLS) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || (!diag && dx && dy)) continue;
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          const n = id(nx, ny);
          if (walls[n] || s.closed[n] || (dx && dy && (walls[id(cx + dx, cy)] || walls[id(cx, cy + dy)]))) continue;
          const ng = s.g[c] + (dx && dy ? SQ2 : 1);
          if (ng < s.g[n]) { s.g[n] = ng; s.par[n] = c; if (!s.inOpen[n]) { s.inOpen[n] = 1; s.open.push(n); } }
        }
      };
      return s;
    }
    function solveAll() {
      compare = {};
      Object.keys(HEUR).forEach((k) => { const t = makeSearch(k); while (!t.done) t.step(); compare[k] = t; });
      S = compare[heur]; running = false; updateRO();
    }
    function updateRO() {
      roVisit.set(String(S.visited));
      roPath.set(S.path ? `${S.path.length - 1} bước · cost ${S.g[goal].toFixed(1)}` : S.done ? 'không có đường' : '...');
    }
    function report() {
      const r = compare[heur];
      if (r.path) stage.log(`${HNAME[heur]}: xét ${r.visited} ô, đường cost ${r.g[goal].toFixed(1)}`);
      else stage.log('Open set rỗng: không có đường tới Goal', 'error');
    }

    stage.ui.group('Thuật toán');
    stage.ui.select('Heuristic', Object.keys(HEUR).map((k) => ({ value: k, label: HNAME[k] })), heur, (v) => { heur = v; solveAll(); report(); });
    stage.ui.toggle('Cho đi chéo (cost √2)', diag, (v) => { diag = v; solveAll(); report(); });
    stage.ui.slider('Tốc độ chạy', { min: 2, max: 120, value: speed, unit: ' bước/s' }, (v) => (speed = v));
    stage.ui.button('Chạy A*', () => { S = makeSearch(heur); running = true; stage.log(`Bắt đầu A* với ${HNAME[heur]}`); }, { variant: 'primary' });
    stage.ui.button('Step', () => { if (S.done) S = makeSearch(heur); running = false; S.step(); updateRO(); if (S.cur >= 0) stage.log(`Lấy ô (${S.cur % COLS},${(S.cur / COLS) | 0}) f=${(S.g[S.cur] + S.h(S.cur)).toFixed(1)} · open=${S.open.length}`); });
    stage.ui.button('Xóa tường', () => { walls.fill(0); solveAll(); report(); }, { variant: 'danger' });
    stage.ui.button('Tường ngẫu nhiên', () => { for (let i = 0; i < N; i++) walls[i] = i !== start && i !== goal && Math.random() < 0.28 ? 1 : 0; solveAll(); report(); });
    const roVisit = stage.ui.readout('Ô đã xét', '0'), roPath = stage.ui.readout('Đường đi', '—');
    solveAll(); report();

    const geo = () => {
      const { w, h } = stage, cs = Math.max(8, Math.floor(Math.min((w - 24) / COLS, (h - 112) / ROWS)));
      return { cs, ox: Math.floor((w - cs * COLS) / 2), oy: 40 };
    };
    const cellAt = (x, y) => { const { cs, ox, oy } = geo(), cx = Math.floor((x - ox) / cs), cy = Math.floor((y - oy) / cs); return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS ? id(cx, cy) : -1; };
    stage.onPointer('down', (x, y) => {
      const c = cellAt(x, y); if (c < 0) return;
      drag = c === start ? 'start' : c === goal ? 'goal' : 'paint';
      if (drag === 'paint') { paintVal = walls[c] ? 0 : 1; walls[c] = paintVal; solveAll(); }
    });
    stage.onPointer('move', (x, y) => {
      const c = cellAt(x, y); hover = c;
      if (!drag || c < 0 || walls[c] && drag !== 'paint') return;
      if (drag === 'paint' && c !== start && c !== goal && walls[c] !== paintVal) { walls[c] = paintVal; solveAll(); }
      if (drag === 'start' && c !== goal && c !== start) { start = c; solveAll(); }
      if (drag === 'goal' && c !== start && c !== goal) { goal = c; solveAll(); }
    });
    stage.onPointer('up', () => { if (drag) report(); drag = null; });

    stage.onFrame((dt) => {
      if (running) {
        acc += dt * speed;
        while (acc >= 1 && !S.done) { acc -= 1; S.step(); }
        updateRO();
        if (S.done) { running = false; acc = 0; report(); }
      }
      render();
    });

    function render() {
      const { w, h } = stage, { cs, ox, oy } = geo();
      d.clear(w, h); d.grid(w, h);
      let lx = 14;
      [['Open set', 'rgba(226,169,59,0.45)', C.navy], ['Closed set', 'rgba(26,163,161,0.32)', C.navy], ['Path', C.orange, '#fff'], ['Tường', C.navy2, '#fff']].forEach(([t, f, c]) => (lx += d.pill(t, lx, 18, { fill: f, color: c, size: 11 }) + 8));
      if (w >= 640) d.text(`${HNAME[heur]}${diag ? ' · 8 hướng' : ' · 4 hướng'}`, w - 14, 18, { align: 'right', font: 'mono', size: 11, color: C.muted });
      d.rect(ox - 4, oy - 4, cs * COLS + 8, cs * ROWS + 8, { fill: C.card, stroke: C.line, lw: 1.5, r: 8 });
      const onPath = new Set(S.path || []);
      for (let i = 0; i < N; i++) {
        const x = ox + (i % COLS) * cs, y = oy + ((i / COLS) | 0) * cs;
        const fill = walls[i] ? C.navy2 : onPath.has(i) ? 'rgba(192,101,45,0.28)' : S.closed[i] ? 'rgba(26,163,161,0.22)' : S.inOpen[i] ? 'rgba(226,169,59,0.42)' : C.paper;
        d.rect(x + 1, y + 1, cs - 2, cs - 2, { fill, r: Math.min(4, cs / 5) });
        if (cs >= 18 && S.par[i] >= 0 && !walls[i]) {
          const p = S.par[i], px = ox + (p % COLS + 0.5) * cs, py = oy + (((p / COLS) | 0) + 0.5) * cs, mx = x + cs / 2, my = y + cs / 2;
          d.line(mx, my, mx + (px - mx) * 0.32, my + (py - my) * 0.32, { stroke: 'rgba(79,83,91,0.45)', lw: 1.5 });
        }
      }
      if (S.cur >= 0 && !S.done) d.rect(ox + (S.cur % COLS) * cs, oy + ((S.cur / COLS) | 0) * cs, cs, cs, { stroke: C.red, lw: 2.5, r: 4 });
      if (S.path) d.poly(S.path.map((p) => [ox + (p % COLS + 0.5) * cs, oy + (((p / COLS) | 0) + 0.5) * cs]), { stroke: C.orange, lw: Math.max(2.5, cs / 6) });
      [[start, 'S', C.green], [goal, 'G', C.red]].forEach(([p, t, c]) => {
        const x = ox + (p % COLS + 0.5) * cs, y = oy + (((p / COLS) | 0) + 0.5) * cs;
        d.circle(x, y, cs * 0.42, { fill: c, stroke: '#fff', lw: 2, shadow: 6 });
        d.text(t, x, y + 0.5, { align: 'center', font: 'cond', weight: 700, size: Math.max(11, cs * 0.5), color: '#fff' });
      });
      const by = oy + cs * ROWS + 22;
      if (hover >= 0 && isFinite(S.g[hover]) && !walls[hover]) {
        const gg = S.g[hover], hh = S.h(hover);
        d.text(`ô (${hover % COLS},${(hover / COLS) | 0})  g=${gg.toFixed(1)}  h=${hh.toFixed(1)}  f=${(gg + hh).toFixed(1)}`, 14, by, { font: 'mono', size: 12, weight: 600, color: C.navy });
      } else d.text('Rê chuột lên một ô đã khám phá để xem g / h / f', 14, by, { font: 'mono', size: 11, color: C.muted });
      let cx = 14, cy = by + 24;
      cx += d.pill('So sánh', cx, cy, { fill: C.navy, size: 11 }) + 8;
      Object.keys(HEUR).forEach((k) => {
        const r = compare[k], t = `${HNAME[k].split(' ')[0]}: ${r.visited} ô · ${r.path ? 'cost ' + r.g[goal].toFixed(1) : 'không có đường'}`;
        const tw = d.measure(t, { font: 'mono', size: 11 }) + 16;
        if (cx + tw > w - 8) { cx = 14; cy += 22; }
        cx += d.pill(t, cx, cy, { fill: k === heur ? C.teal : C.lineSoft, color: k === heur ? '#fff' : C.navy, size: 11 }) + 6;
      });
    }
  },
});
