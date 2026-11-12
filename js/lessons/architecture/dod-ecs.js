/* Lesson: OOP vs DOD/ECS — memory layout, cache-line fetches and a simple per-frame cost model. */
U101.defineLesson('dod-ecs', {
  lead: 'OOP gom dữ liệu và hành vi vào từng object nằm rải rác trên heap. Data-Oriented Design (DOD) xếp cùng một loại dữ liệu sát nhau để CPU đọc một cache line là dùng được hết. ECS của Unity DOTS được xây trên ý tưởng đó.',
  hint: 'Xem CPU nạp từng cache line 64 byte · kéo số entity lên 100k · bật Burst và Jobs',
  overview: `
    <p>CPU không đọc RAM từng byte. Mỗi lần thiếu dữ liệu (<b>cache miss</b>), nó nạp cả một <b>cache line 64 byte</b> và phải chờ cỡ ~100 ns. Vì vậy cách bạn xếp dữ liệu quan trọng không kém thuật toán.</p>
    <ul>
      <li><b>OOP / Array of Objects</b>: mỗi <code>Enemy</code> là một object trên heap gồm header, position, velocity, health, reference... Hệ thống di chuyển chỉ cần <b>P</b> và <b>V</b>, nhưng mỗi object lại nằm một chỗ khác, nên gần như mỗi entity là một lần miss.</li>
      <li><b>DOD / Structure of Arrays</b>: <code>Position[]</code>, <code>Velocity[]</code> là mảng liên tục. Một cache line chứa 8 phần tử kế nhau, và prefetcher đoán trước được dòng tiếp theo.</li>
      <li><b>ECS</b>: <b>Entity</b> chỉ là một ID. <b>Component</b> là struct dữ liệu thuần (<code>IComponentData</code>). <b>System</b> chạy logic trên mọi entity có đủ các component cần thiết. Entity cùng archetype nằm chung một <b>chunk 16 KB</b>, mỗi component là một mảng con.</li>
      <li><b>Unity DOTS</b> = Entities + <b>C# Job System</b> (chạy đa luồng an toàn) + <b>Burst</b> (biên dịch HPC# ra mã máy SIMD).</li>
    </ul>
    <p class="callout">Số ms trên mô phỏng là <b>mô hình ước lượng</b> để thấy xu hướng, không phải benchmark. Hãy luôn đo bằng Profiler trên máy thật.</p>`,
  keyPoints: [
    'Cache miss tốn gấp hàng chục lần một phép tính. Dữ liệu nằm liên tục giúp CPU dùng trọn mỗi cache line.',
    'ECS: Entity = ID, Component = dữ liệu thuần, System = logic duyệt theo chunk.',
    'Burst + Jobs nhân hiệu năng: SIMD trên một core và song song trên nhiều core.',
    'DOD đáng dùng khi có hàng nghìn thứ giống nhau. UI hay gameplay ít object thì MonoBehaviour vẫn đơn giản hơn.',
  ],
  code: [
    {
      title: 'MoveSystem.cs (Entities 1.x)',
      source: `
using Unity.Burst;
using Unity.Entities;
using Unity.Mathematics;
using Unity.Transforms;

public struct Velocity : IComponentData { public float3 Value; }   // dữ liệu thuần, không logic

[BurstCompile]
public partial struct MoveJob : IJobEntity
{
    public float DeltaTime;
    // chỉ đọc/ghi đúng 2 mảng component cần dùng trong chunk
    void Execute(ref LocalTransform transform, in Velocity velocity)
    {
        transform.Position += velocity.Value * DeltaTime;
    }
}

[BurstCompile]
public partial struct MoveSystem : ISystem
{
    [BurstCompile]
    public void OnUpdate(ref SystemState state)
    {
        new MoveJob { DeltaTime = SystemAPI.Time.DeltaTime }.ScheduleParallel(); // chia chunk cho các worker
    }
}`,
      note: 'IJobEntity duyệt mọi chunk có LocalTransform + Velocity. ScheduleParallel chia chunk cho nhiều core, Burst vector hóa phép cộng.',
    },
    {
      title: 'Enemy.cs (OOP truyền thống)',
      source: `
public class Enemy : MonoBehaviour
{
    public Vector3 velocity;
    public int health;
    public string displayName;      // dữ liệu "lạnh" nằm chung với dữ liệu "nóng"

    void Update()                   // 10.000 enemy = 10.000 lần gọi native → managed
    {
        transform.position += velocity * Time.deltaTime;
    }
}`,
      note: 'Mỗi Enemy là một object riêng trên heap. Duyệt 10k object nghĩa là nhảy 10k chỗ trong bộ nhớ.',
    },
  ],
  tryIt: [
    'Đếm số cache miss sau một lượt 16 entity: OOP so với DOD.',
    'Xem cột "dùng được": OOP nạp 64 byte nhưng chỉ dùng P và V, còn DOD dùng gần như toàn bộ.',
    'Kéo số entity lên 100k: OOP có còn vừa ngân sách 16.7 ms (60 FPS) không?',
    'Bật Burst rồi bật Jobs: thời gian DOD giảm bao nhiêu lần?',
    'Chuyển layout sang "ECS chunk": Entity ID nằm đâu, và MoveSystem có đọc Health không?',
  ],
  links: [
    { label: 'Entities overview (DOTS)', url: 'https://docs.unity3d.com/Packages/com.unity.entities@1.3/manual/index.html' },
    { label: 'Burst compiler', url: 'https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html' },
    { label: 'C# Job System', url: 'https://docs.unity3d.com/Manual/JobSystem.html' },
    { label: 'Unity e-book: Introduction to DOD', url: 'https://unity.com/resources/introduction-to-dots-ebook' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const COLS = 32, LINE = 8, ROWS = 6, E = 16, CACHE = 4;
    const FIELD = { H: [C.lineSoft, 'H'], P: [C.blue, 'P'], V: [C.orange, 'V'], hp: ['#e9a99f', 'h'], M: ['#c4b8ef', 'M'], N: ['#e6d3b4', 'N'], X: ['#ddd2c2', ''], id: ['#9ad6c9', 'E'] };
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // OOP heap: 16 objects of 6 fields placed with gaps (other allocations) between them, in random order
    const heap = new Array(COLS * ROWS).fill(null), oopSlots = [];
    const order = [...Array(E).keys()].sort(() => rnd() - 0.5);
    let p = 1;
    order.forEach((ent) => {
      for (let g = 0, n = 1 + Math.floor(rnd() * 5); g < n; g++) heap[p++] = { f: 'X' };
      ['H', 'P', 'V', 'hp', 'M', 'N'].forEach((f, k) => (heap[p + k] = { f, ent }));
      oopSlots[ent] = [p + 1, p + 2]; p += 6;
    });
    let layout = 'soa', burst = false, jobs = false, count = 10000, speed = 1;
    function dodHeap() {
      const m = new Array(COLS * ROWS).fill(null), base = layout === 'ecs' ? LINE * 2 : 0, pos = [];
      const arrs = layout === 'ecs' ? ['id', 'P', 'V', 'hp'] : ['P', 'V', 'hp'];
      arrs.forEach((f, a) => { for (let i = 0; i < E; i++) m[a * E + i] = { f, ent: i }; });
      for (let i = 0; i < E; i++) pos[i] = [base + i, base + E + i];
      return { m, slots: pos };
    }
    let dod = dodHeap();
    const sides = [
      { key: 'oop', title: 'OOP · Array of Objects (heap rải rác)', mem: () => heap, slots: () => oopSlots, color: C.red },
      { key: 'dod', title: '', mem: () => dod.m, slots: () => dod.slots, color: C.green },
    ];
    sides.forEach((s) => Object.assign(s, { cache: [], miss: 0, fetched: 0, anims: [], lastMiss: 0 }));
    let cursor = 0, timer = 0;

    function step(animate = true) {
      sides.forEach((s) => {
        const need = s.slots()[cursor];
        new Set(need.map((x) => Math.floor(x / LINE))).forEach((ln) => {
          const hit = s.cache.indexOf(ln);
          if (hit >= 0) { s.cache.splice(hit, 1); s.cache.push(ln); return; }
          s.cache.push(ln); if (s.cache.length > CACHE) s.cache.shift();
          s.miss++; s.fetched += 64; if (animate) s.anims.push({ ln, t: 0 });
        });
      });
      cursor++;
      if (cursor >= E) {
        const [o, dd] = sides;
        stage.log(`Hết lượt ${E} entity · OOP: ${o.miss} miss (${o.fetched} B nạp, dùng ${E * 16} B) · DOD: ${dd.miss} miss (${dd.fetched} B nạp)`, o.miss > dd.miss * 2 ? 'warn' : 'info');
        sides.forEach((s) => { s.lastMiss = s.miss; s.miss = 0; s.fetched = 0; s.cache = []; });
        cursor = 0;
      }
    }
    // cost model (µs per entity) → ms per frame
    const msOOP = () => count * (0.12 + 0.15) / 1000;            // cache miss + Update() call overhead
    function msDOD() {
      let ms = count * 0.012 / 1000;                             // contiguous managed loop
      if (burst) ms *= 0.25;                                     // SIMD + native code
      if (jobs) ms = ms / 6 + 0.03;                              // 8 workers, scheduling overhead
      return ms;
    }
    function updateReadouts() { roOop.set(msOOP().toFixed(2) + ' ms'); roDod.set(msDOD().toFixed(2) + ' ms'); }

    stage.ui.group('Dữ liệu');
    stage.ui.slider('Số entity', { min: 2, max: 5, step: 0.1, value: 4, format: (v) => Math.round(10 ** v).toLocaleString('vi-VN') }, (v) => { count = Math.round(10 ** v); updateReadouts(); });
    stage.ui.select('Layout DOD', [{ value: 'soa', label: 'SoA (mảng component)' }, { value: 'ecs', label: 'ECS chunk (archetype)' }], layout, (v) => {
      layout = v; dod = dodHeap(); sides[1].cache = []; stage.log(v === 'ecs' ? 'Chunk ECS: [Entity | Position | Velocity | Health]. MoveSystem bỏ qua cột Health và Entity' : 'SoA: Position[], Velocity[], Health[] liên tục');
    });
    stage.ui.slider('Tốc độ xem', { min: 0.5, max: 6, step: 0.5, value: speed, unit: '×' }, (v) => (speed = v));
    stage.ui.group('DOTS');
    stage.ui.toggle('Burst compile', burst, (v) => { burst = v; updateReadouts(); stage.log(v ? 'Burst: HPC# → mã máy LLVM, vector hóa SIMD (float4)' : 'Tắt Burst: chạy bằng Mono/IL2CPP thường'); });
    stage.ui.toggle('Job System (8 core)', jobs, (v) => { jobs = v; updateReadouts(); stage.log(v ? 'ScheduleParallel: mỗi worker xử lý một nhóm chunk, không cần lock' : 'Chạy trên main thread'); });
    const roOop = stage.ui.readout('OOP / frame', ''), roDod = stage.ui.readout('DOD / frame', '');
    updateReadouts();

    stage.onFrame((dt) => {
      timer += dt * speed;
      if (timer > 0.4) { timer = 0; step(); }
      sides.forEach((s) => { s.anims.forEach((a) => (a.t += dt * speed * 1.6)); s.anims = s.anims.filter((a) => a.t < 1); });
      render();
    });

    function panel(s, x, y, w, h) {
      const gridW = w - Math.min(150, w * 0.26) - 12, sw = Math.min(20, gridW / COLS), sh = Math.min(22, (h - 44) / ROWS);
      const title = s.key === 'oop' ? s.title : layout === 'ecs' ? 'DOD · ECS chunk (Entity | Pos | Vel | Health)' : 'DOD · Structure of Arrays (liên tục)';
      d.rect(x, y, w, h, { fill: 'rgba(249,242,229,0.85)', stroke: s.color, lw: 1.5, r: 10 });
      d.text(title, x + 12, y + 16, { font: 'cond', weight: 700, size: w < 520 ? 12 : 14, color: C.navy });
      const gx = x + 12, gy = y + 32, mem = s.mem(), cur = s.slots()[cursor] || [];
      for (let i = 0; i < COLS * ROWS; i++) {
        const c = mem[i], sx = gx + (i % COLS) * sw, sy = gy + Math.floor(i / COLS) * sh;
        const f = c ? FIELD[c.f] : null;
        d.rect(sx + 0.5, sy + 0.5, sw - 1, sh - 1, { fill: f ? f[0] : C.paper, r: 2, stroke: cur.includes(i) ? C.navy : null, lw: 2 });
        if (f && f[1] && sw >= 12) d.text(f[1], sx + sw / 2, sy + sh / 2 + 0.5, { align: 'center', font: 'mono', size: 9, color: c.f === 'P' || c.f === 'V' ? '#fff' : C.muted });
      }
      for (let r = 0; r < ROWS; r++) for (let l = 1; l < COLS / LINE; l++) d.line(gx + l * LINE * sw, gy + r * sh, gx + l * LINE * sw, gy + (r + 1) * sh, { stroke: C.navy2, lw: 1 });
      // cache box
      const cx = gx + COLS * sw + 14, cw = x + w - cx - 10, ch = U.clamp((h - 66) / CACHE - 4, 5, 18);
      d.text(`L1 (${CACHE} line)`, cx, y + 16, { font: 'mono', size: 11, weight: 600, color: C.navy2 });
      s.cache.forEach((ln, k) => {
        d.rect(cx, gy + k * (ch + 4), cw, ch, { fill: C.card, stroke: C.line, r: 4 });
        if (ch >= 12) d.text(`line ${ln}`, cx + 6, gy + k * (ch + 4) + ch / 2, { font: 'mono', size: 10, color: C.ink });
      });
      d.text(`miss: ${s.miss} · trước: ${s.lastMiss}`, cx, gy + CACHE * (ch + 4) + 8, { font: 'mono', size: 11, weight: 600, color: s.color });
      d.text(`dùng được: ${s.fetched ? Math.round(Math.min(cursor, E) * 16 / s.fetched * 100) : 0}%`, cx, gy + CACHE * (ch + 4) + 26, { font: 'mono', size: 11, color: C.muted });
      // cache line fetch animation: highlight line in RAM and fly a copy into L1
      s.anims.forEach((a) => {
        const lx = gx + (a.ln * LINE % COLS) * sw, ly = gy + Math.floor(a.ln * LINE / COLS) * sh, e = U.ease.outCubic(a.t);
        d.rect(lx - 1, ly - 1, LINE * sw + 2, sh + 2, { stroke: C.yellow, lw: 3, r: 3 });
        d.rect(U.lerp(lx, cx, e), U.lerp(ly, gy + (CACHE - 1) * (ch + 4), e), U.lerp(LINE * sw, cw, e), sh, { fill: 'rgba(226,169,59,0.55)', r: 3 });
      });
    }

    function render() {
      const { w, h } = stage, pad = 12, barsH = Math.min(118, h * 0.26), ph = (h - barsH - pad * 3) / 2;
      d.clear(w, h); d.grid(w, h);
      panel(sides[0], pad, pad, w - 2 * pad, ph);
      panel(sides[1], pad, pad * 2 + ph, w - 2 * pad, ph);
      // per-frame cost bars
      const by = h - barsH - 2, lx = pad + 8, labelW = Math.min(150, w * 0.3), bw = w - 2 * pad - labelW - 70;
      const items = [['OOP + Update()', msOOP(), C.red], [`DOD${burst ? ' + Burst' : ''}${jobs ? ' + Jobs' : ''}`, msDOD(), C.green]];
      const scale = Math.max(20, msOOP() * 1.05), bx = lx + labelW;
      d.text(`${count.toLocaleString('vi-VN')} entity · MoveSystem / frame (ước lượng)`, lx, by + 10, { font: 'mono', size: 11, weight: 600, color: C.navy2 });
      items.forEach(([label, ms, col], i) => {
        const y = by + 26 + i * (barsH - 30) / 2, bh = Math.min(26, (barsH - 40) / 2);
        d.text(label, lx, y + bh / 2, { font: 'mono', size: w < 520 ? 10 : 12, color: C.ink });
        d.rect(bx, y, bw, bh, { fill: C.bgDeep, r: 5 });
        d.rect(bx, y, Math.max(3, bw * ms / scale), bh, { fill: col, r: 5 });
        d.text(ms.toFixed(ms < 1 ? 3 : 1) + ' ms', bx + bw + 6, y + bh / 2, { font: 'mono', size: 11, weight: 600, color: col });
      });
      const budX = bx + bw * 16.7 / scale;
      d.line(budX, by + 20, budX, h - 6, { stroke: C.navy, lw: 1.5, dash: [4, 4] });
      d.text('16.7 ms', budX + 4, by + 20, { font: 'mono', size: 10, color: C.navy });
    }

    for (let i = 0; i < 6; i++) step(i >= 5); // start mid-pass so the first frame already tells the story
    stage.log('Mỗi tick, MoveSystem xử lý 1 entity: cần P và V. Ô viền đậm = dữ liệu đang đọc');
  },
});
