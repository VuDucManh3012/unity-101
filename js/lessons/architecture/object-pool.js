/* Lesson: Object Pool — Instantiate/Destroy churn (GC spikes) vs UnityEngine.Pool.ObjectPool<T> reuse. */
U101.defineLesson('object-pool', {
  lead: 'Mỗi lần Instantiate/Destroy đều tốn CPU và để lại rác cho Garbage Collector. Object Pool tạo sẵn object, tắt đi khi không dùng và bật lại khi cần, nên frame time phẳng hơn.',
  hint: 'Đổi chế độ Instantiate ↔ ObjectPool và nhìn biểu đồ frame time · kéo maxSize xuống 5 để thấy pool "tràn" · bấm Burst',
  overview: `
    <p>Súng bắn 20 viên/giây. Mỗi viên chỉ sống khoảng một giây.</p>
    <ul>
      <li><b>Instantiate/Destroy</b>: mỗi viên là object mới. Bộ nhớ managed tăng dần, đến ngưỡng thì <b>GC.Collect</b> chạy và gây <b>spike</b> (frame bị khựng).</li>
      <li><b>ObjectPool&lt;T&gt;</b> (<code>UnityEngine.Pool</code>): <code>Get()</code> lấy object đang nghỉ (hoặc tạo mới nếu pool trống), <code>Release()</code> trả object về và gọi <code>SetActive(false)</code>. Sau lúc khởi động, mức allocation gần như bằng 0.</li>
      <li><b>maxSize</b>: số object <i>nghỉ</i> tối đa mà pool giữ. Release khi pool đã đầy thì object bị <code>Destroy</code> (actionOnDestroy). Đặt quá nhỏ thì vẫn tạo/hủy liên tục.</li>
      <li><b>defaultCapacity</b>: kích thước ban đầu của danh sách nội bộ, không phải số object được tạo sẵn. Muốn có sẵn object thì phải tự Get rồi Release lúc loading (prewarm).</li>
    </ul>
    <p class="callout">Số KB và ms trong mô phỏng chỉ để minh họa. Hãy đo game thật bằng Profiler, cột <b>GC Alloc</b> trong CPU Usage.</p>`,
  keyPoints: [
    'Instantiate/Destroy liên tục = rác cho GC = spike frame time.',
    'ObjectPool<T>.Get/Release thay cho Instantiate/Destroy.',
    'Reset trạng thái object mỗi lần Get (vị trí, máu, timer).',
    'maxSize phải lớn hơn số object hoạt động cùng lúc, nếu không pool vẫn tạo/hủy liên tục.',
  ],
  code: [{
    title: 'Gun.cs',
    source: `
using UnityEngine;
using UnityEngine.Pool;

public class Gun : MonoBehaviour
{
    [SerializeField] private Bullet prefab;
    [SerializeField] private Transform muzzle;
    private ObjectPool<Bullet> pool;

    void Awake()
    {
        pool = new ObjectPool<Bullet>(
            createFunc:      () => { var b = Instantiate(prefab); b.Pool = pool; return b; },
            actionOnGet:     b => b.gameObject.SetActive(true),
            actionOnRelease: b => b.gameObject.SetActive(false),
            actionOnDestroy: b => Destroy(b.gameObject),   // khi vượt maxSize
            collectionCheck: true,                         // báo lỗi nếu Release 2 lần (Editor)
            defaultCapacity: 20,
            maxSize: 100);
    }

    public void Fire()
    {
        Bullet b = pool.Get();                             // thay cho Instantiate
        b.transform.SetPositionAndRotation(muzzle.position, muzzle.rotation);
    }
}`,
    note: 'Pool giữ object đang nghỉ trong một Stack. Get() pop ra, Release() push vào. Không có allocation khi pool còn hàng.',
  }, {
    title: 'Bullet.cs',
    source: `
using UnityEngine;
using UnityEngine.Pool;

public class Bullet : MonoBehaviour
{
    public IObjectPool<Bullet> Pool { get; set; }
    [SerializeField] private float speed = 30f, lifetime = 1.2f;
    private float timer;

    void OnEnable() => timer = lifetime;                   // reset mỗi lần Get

    void Update()
    {
        transform.position += transform.forward * speed * Time.deltaTime;
        if ((timer -= Time.deltaTime) <= 0f) Pool.Release(this); // thay cho Destroy
    }
}`,
    note: 'Object được tái sử dụng nên mọi trạng thái phải reset trong OnEnable hoặc actionOnGet.',
  }],
  tryIt: [
    'Ở chế độ Instantiate/Destroy: cột đỏ trên biểu đồ xuất hiện mấy giây một lần?',
    'Chuyển sang ObjectPool: sau vài giây, GC Alloc/frame còn bao nhiêu?',
    'Ở chế độ pool, kéo maxSize xuống 5 rồi bấm Burst vài lần: vì sao pool lại Destroy rồi tạo mới?',
    'Tăng tốc độ bắn lên 60: CountAll của pool dừng ở khoảng bao nhiêu?',
    'Bấm Burst 40 viên ở cả hai chế độ và so sánh frame time.',
  ],
  links: [
    { label: 'ObjectPool<T> API', url: 'https://docs.unity3d.com/ScriptReference/Pool.ObjectPool_1.html' },
    { label: 'Garbage collection best practices', url: 'https://docs.unity3d.com/Manual/performance-garbage-collection-best-practices.html' },
    { label: 'Game Programming Patterns: Object Pool', url: 'https://gameprogrammingpatterns.com/object-pool.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const ALLOC_KB = 1.6, GC_LIMIT = 64, BUDGET = 16.7, GRAPH_N = 110;
    let mode = 'inst', fireRate = 20, maxSize = 40, firing = true, silent = true;
    let bullets = [], spawnAcc = 0, nextId = 0, heap = 0, gcCount = 0, gcFlash = 0, allocFrame = 0, cost = 0, gcMs = 0;
    let all = [], inactive = [], frames = [], lastLog = {}, t = 0, recoil = 0;

    const say = (key, gap, msg, lvl) => { if (silent || t - (lastLog[key] ?? -99) < gap) return; lastLog[key] = t; stage.log(msg, lvl); };
    const create = () => { allocFrame += ALLOC_KB; cost += 0.22; return { id: ++nextId, active: false }; };

    function spawn() {
      let obj;
      if (mode === 'inst') obj = create();
      else if (inactive.length) { obj = inactive.pop(); cost += 0.01; }
      else { obj = create(); all.push(obj); say('grow', 2, `Pool trống → createFunc() tạo Bullet #${obj.id} (CountAll = ${all.length})`); }
      obj.active = true; recoil = 1;
      const a = U.rand(-0.16, 0.16);
      bullets.push({ obj, x: 0, y: 0, vx: Math.cos(a) * U.rand(0.8, 1), vy: Math.sin(a) });
    }
    function release(b) {
      b.obj.active = false;
      if (mode === 'inst') { cost += 0.08; return; } // Destroy: object becomes garbage
      if (inactive.length >= maxSize) {
        all = all.filter((o) => o !== b.obj); cost += 0.08;
        say('over', 2, `Release khi pool đã đầy (${maxSize}) → actionOnDestroy: Destroy(Bullet #${b.obj.id})`, 'warn');
      } else inactive.push(b.obj);
    }
    function step(dt) {
      t += dt; allocFrame = 0; cost = 0; gcMs = 0;
      if (firing) { spawnAcc += dt * fireRate; while (spawnAcc >= 1) { spawnAcc--; spawn(); } }
      bullets = bullets.filter((b) => { b.x += b.vx * dt; b.y += b.vy * dt * 0.5; if (b.x < 1 && Math.abs(b.y) < 0.5) return true; release(b); return false; });
      heap += allocFrame;
      if (heap >= GC_LIMIT) {
        gcMs = 10 + heap / 8; gcCount++; gcFlash = 1;
        say('gc', 1.2, `GC.Collect(): dọn ${heap.toFixed(0)} KB rác → frame ${(7 + gcMs).toFixed(1)} ms (spike!)`, 'error');
        heap = 0;
      }
      const ms = 6.5 + Math.random() * 1.2 + cost + gcMs;
      frames.push({ ms, gc: gcMs > 0 }); if (frames.length > GRAPH_N) frames.shift();
      gcFlash = Math.max(0, gcFlash - dt * 2); recoil = Math.max(0, recoil - dt * 10);
    }

    stage.ui.group('Spawning');
    stage.ui.select('Chế độ', [{ value: 'inst', label: 'Instantiate / Destroy' }, { value: 'pool', label: 'ObjectPool<Bullet>' }], mode, (v) => {
      mode = v; bullets.forEach((b) => (b.obj.active = false)); bullets = []; all = []; inactive = [];
      stage.log(v === 'pool' ? 'Dùng ObjectPool<Bullet>: Get() / Release()' : 'Dùng Instantiate() / Destroy() cho mỗi viên', 'info');
    });
    stage.ui.toggle('Bắn liên tục', firing, (v) => (firing = v));
    stage.ui.slider('Tốc độ bắn', { min: 5, max: 60, value: fireRate, unit: ' viên/s' }, (v) => (fireRate = v));
    stage.ui.button('Burst 40 viên', () => { for (let i = 0; i < 40; i++) spawn(); stage.log(`Burst: 40 lần ${mode === 'pool' ? 'pool.Get()' : 'Instantiate()'} trong 1 frame`, 'warn'); }, { variant: 'accent' });
    stage.ui.group('ObjectPool');
    stage.ui.slider('maxSize', { min: 5, max: 80, value: maxSize }, (v) => (maxSize = v));
    stage.ui.button('pool.Clear()', () => { const n = inactive.length; all = all.filter((o) => o.active); inactive = []; stage.log(`Clear(): Destroy ${n} object đang nghỉ`); });
    const rActive = stage.ui.readout('CountActive', '0');
    const rInactive = stage.ui.readout('CountInactive', '0');
    const rAlloc = stage.ui.readout('GC Alloc / frame', '0 KB');
    const rGc = stage.ui.readout('Số lần GC.Collect', '0');

    for (let i = 0; i < 260; i++) step(1 / 60); // pre-run so the graph already has history
    silent = false; gcCount = 0;
    stage.log('Đang bắn bằng Instantiate/Destroy. Để ý các cột đỏ (GC spike) trên biểu đồ.');

    stage.onFrame((dt) => {
      step(dt);
      rActive.set(String(bullets.length)); rInactive.set(mode === 'pool' ? String(inactive.length) : '— (không có pool)');
      rAlloc.set(`${allocFrame.toFixed(1)} KB`); rGc.set(String(gcCount));
      render();
    });

    function render() {
      const { w, h } = stage, g = 12;
      d.clear(w, h); d.grid(w, h);
      // play area
      const pa = { x: g, y: g, w: w - g * 2, h: h * 0.42 };
      d.rect(pa.x, pa.y, pa.w, pa.h, { fill: 'rgba(249,242,229,0.7)', stroke: C.lineSoft, r: 10 });
      const gx = pa.x + 18 - recoil * 4, gy = pa.y + pa.h / 2, sx = pa.x + 60, sw = pa.w - 80;
      d.rect(gx, gy - 12, 34, 24, { fill: C.navy, r: 5 }); d.rect(gx + 30, gy - 5, 16, 10, { fill: C.navy2, r: 2 }); d.rect(gx + 6, gy + 8, 10, 16, { fill: C.navy, r: 3 });
      if (recoil > 0.5) d.circle(gx + 50, gy, 6 * recoil, { fill: C.yellow });
      d.rect(pa.x + pa.w - 14, pa.y + 8, 6, pa.h - 16, { fill: C.line, r: 3 });
      bullets.forEach((b) => {
        const x = sx + b.x * sw, y = gy + b.y * pa.h;
        d.rect(x - 6, y - 2.5, 12, 5, { fill: C.orange, r: 2.5 });
      });
      d.text(mode === 'pool' ? 'ObjectPool<Bullet>.Get() / Release()' : 'Instantiate() / Destroy()', pa.x + pa.w - 24, pa.y + 16, { align: 'right', font: 'mono', size: 11, weight: 600, color: mode === 'pool' ? C.teal : C.red });

      // pool shelf + heap bar
      const sh = { x: g, y: pa.y + pa.h + 10, w: w - g * 2, h: h * 0.2 };
      d.node(sh.x, sh.y, sh.w, sh.h, null, { accent: mode === 'pool' ? C.teal : C.line, shadow: 4 });
      const title = mode === 'pool' ? `Pool shelf · CountAll ${all.length} · nghỉ ${inactive.length}/${maxSize}` : `Không có pool · đã tạo ${nextId} object`;
      d.text(title, sh.x + 12, sh.y + 14, { font: 'mono', size: 11, weight: 600, color: C.navy });
      const heapW = Math.min(200, sh.w * 0.32), hx = sh.x + sh.w - heapW - 12;
      d.text(`Managed heap ${heap.toFixed(0)}/${GC_LIMIT} KB`, hx, sh.y + 14, { font: 'mono', size: 10, color: C.muted });
      d.rect(hx, sh.y + 24, heapW, 10, { fill: C.lineSoft, r: 5 });
      d.rect(hx, sh.y + 24, Math.max(6, heapW * heap / GC_LIMIT), 10, { fill: gcFlash > 0 ? C.red : C.faint, r: 5 });
      const s = 11, gap = 3, cols = Math.max(1, Math.floor((sh.w - 24) / (s + gap))), rows = Math.max(1, Math.floor((sh.h - 44) / (s + gap)));
      const slots = mode === 'pool' ? all : bullets.map((b) => b.obj);
      slots.slice(0, cols * rows).forEach((o, i) => {
        const x = sh.x + 12 + (i % cols) * (s + gap), y = sh.y + 40 + Math.floor(i / cols) * (s + gap);
        d.rect(x, y, s, s, { fill: o.active ? C.orange : 'rgba(26,163,161,0.35)', stroke: o.active ? null : C.teal, lw: 1, r: 3 });
      });
      if (slots.length > cols * rows) d.text(`+${slots.length - cols * rows}`, sh.x + sh.w - 12, sh.y + sh.h - 10, { align: 'right', font: 'mono', size: 10, color: C.muted });

      // frame-time graph
      const gr = { x: g, y: sh.y + sh.h + 10, w: w - g * 2, h: h - (sh.y + sh.h + 10) - g };
      d.rect(gr.x, gr.y, gr.w, gr.h, { fill: C.navy, r: 10 });
      const top = gr.y + 24, gh = gr.h - 32, maxMs = 33, yOf = (ms) => top + gh - U.clamp(ms / maxMs, 0, 1) * gh;
      d.text('Frame time (ms)', gr.x + 12, gr.y + 12, { font: 'mono', size: 11, weight: 600, color: '#fff' });
      d.line(gr.x + 8, yOf(BUDGET), gr.x + gr.w - 8, yOf(BUDGET), { stroke: 'rgba(226,169,59,0.8)', lw: 1, dash: [4, 4] });
      d.text('16.7 ms = 60 FPS', gr.x + gr.w - 12, yOf(BUDGET) - 8, { align: 'right', font: 'mono', size: 10, color: C.yellow });
      const bw = (gr.w - 16) / GRAPH_N;
      frames.forEach((f, i) => {
        const x = gr.x + 8 + (GRAPH_N - frames.length + i) * bw, y = yOf(f.ms);
        d.rect(x, y, Math.max(1, bw - 1), top + gh - y, { fill: f.ms > BUDGET ? C.red : C.teal, r: 0 });
      });
      const last = frames[frames.length - 1];
      if (last) d.text(`${last.ms.toFixed(1)} ms`, gr.x + gr.w - 12, gr.y + 12, { align: 'right', font: 'mono', size: 11, weight: 700, color: last.ms > BUDGET ? C.red : '#9fe0c0' });
    }
  },
});
