/* Lesson: MonoBehaviour lifecycle — callbacks plotted per frame in a lane chart. */
U101.defineLesson('monobehaviour-lifecycle', {
  lead: 'Unity gọi các hàm của script theo một thứ tự cố định: Awake → OnEnable → Start, rồi mỗi frame là FixedUpdate → Update → LateUpdate. Bật, tắt hay phá hủy object sẽ gọi thêm các hàm khác.',
  hint: 'Bấm Instantiate rồi thử SetActive(false) / Destroy · đổi FPS để xem FixedUpdate chạy bao nhiêu lần mỗi frame',
  overview: `
    <p>Bạn không tự gọi <code>Update()</code>. Unity tìm các hàm có tên đặc biệt trong <b>MonoBehaviour</b> và gọi chúng vào đúng thời điểm.</p>
    <ul>
      <li><b>Awake</b>: chạy một lần khi object được tạo, kể cả khi component đang tắt. Dùng để lấy reference như <code>GetComponent</code>.</li>
      <li><b>OnEnable / OnDisable</b>: chạy mỗi lần object bật hoặc tắt. Đây là chỗ đăng ký và hủy đăng ký event.</li>
      <li><b>Start</b>: chạy một lần, ngay trước frame Update đầu tiên. Lúc này mọi Awake trong scene đã xong.</li>
      <li><b>FixedUpdate</b>: chạy theo nhịp vật lý cố định (mặc định 0.02s). Một frame có thể có 0, 1 hoặc nhiều lần FixedUpdate.</li>
      <li><b>Update / LateUpdate</b>: chạy mỗi frame. LateUpdate chạy sau tất cả Update, nên hợp với camera follow.</li>
    </ul>
    <p class="callout">Hãy để ý trên mô phỏng: khi FPS thấp, một frame chứa <b>nhiều chấm FixedUpdate</b>. Khi FPS cao, có frame <b>không có</b> chấm nào.</p>`,
  keyPoints: [
    'Awake → OnEnable → Start chỉ xảy ra khi object được tạo (Start chạy đúng 1 lần).',
    'Vật lý và lực (Rigidbody) đặt trong FixedUpdate. Input và logic đặt trong Update.',
    'Đăng ký event ở OnEnable, hủy ở OnDisable để tránh memory leak.',
  ],
  code: {
    title: 'PlayerController.cs',
    source: `
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private float speed = 5f;
    private Rigidbody rb;
    private Vector3 input;

    void Awake()     { rb = GetComponent<Rigidbody>(); }   // lấy reference
    void OnEnable()  { GameEvents.OnPause += HandlePause; } // đăng ký event
    void Start()     { Debug.Log("Sẵn sàng!"); }

    void Update()    // mỗi frame: đọc input
    {
        input = new Vector3(Input.GetAxis("Horizontal"), 0, Input.GetAxis("Vertical"));
    }

    void FixedUpdate() // nhịp vật lý cố định: di chuyển Rigidbody
    {
        rb.MovePosition(rb.position + input * speed * Time.fixedDeltaTime);
    }

    void OnDisable() { GameEvents.OnPause -= HandlePause; } // hủy đăng ký
    void HandlePause(bool paused) { enabled = !paused; }
}`,
    note: 'Đọc input trong Update (không bỏ sót phím bấm), di chuyển Rigidbody trong FixedUpdate (vật lý ổn định).',
  },
  tryIt: [
    'Bấm Instantiate và quan sát thứ tự Awake → OnEnable → Start trong Console.',
    'Kéo FPS xuống 15: mỗi frame có mấy lần FixedUpdate?',
    'Kéo FPS lên 120: tìm những frame không có FixedUpdate.',
    'Bấm SetActive(false) rồi bật lại. Start có chạy lại không?',
    'Bấm Destroy và xem OnDisable chạy trước OnDestroy.',
  ],
  links: [
    { label: 'Order of execution for event functions', url: 'https://docs.unity3d.com/Manual/ExecutionOrder.html' },
    { label: 'MonoBehaviour API', url: 'https://docs.unity3d.com/ScriptReference/MonoBehaviour.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C } = stage;
    const LANES = [
      { name: 'Awake', color: C.purple }, { name: 'OnEnable', color: C.teal }, { name: 'Start', color: C.blue },
      { name: 'FixedUpdate', color: C.orange }, { name: 'Update', color: C.green }, { name: 'LateUpdate', color: C.yellow },
      { name: 'OnDisable', color: C.pink }, { name: 'OnDestroy', color: C.red },
    ];
    const COLS = 18;
    const obj = { exists: false, active: false, started: false };
    let frames = [], pending = [], acc = 0, frameTimer = 0, frameNo = 0;
    let fps = 30, fixedDt = 0.02, viewSpeed = 4, logUpdate = false;

    const call = (name) => {
      pending.push(name);
      if (logUpdate || !/Update$/.test(name)) stage.log(`Player.${name}()  · frame ${frameNo}`, name === 'OnDestroy' ? 'warn' : 'info');
    };

    function stepFrame() {
      frameNo++;
      const running = obj.exists && obj.active;
      if (running && !obj.started) { call('Start'); obj.started = true; }
      acc += 1 / fps;
      while (acc >= fixedDt) { acc -= fixedDt; if (running) call('FixedUpdate'); }
      if (running) { call('Update'); call('LateUpdate'); }
      frames.push({ no: frameNo, calls: pending }); pending = [];
      if (frames.length > COLS) frames.shift();
      fixedCount.set(String(frames[frames.length - 1].calls.filter((c) => c === 'FixedUpdate').length));
    }

    // Inspector
    stage.ui.group('Vòng đời object');
    stage.ui.button('Instantiate', () => { if (obj.exists) return stage.log('Object đã tồn tại', 'warn'); Object.assign(obj, { exists: true, active: true, started: false }); call('Awake'); call('OnEnable'); }, { variant: 'primary' });
    stage.ui.button('SetActive(false)', () => { if (!obj.exists || !obj.active) return; obj.active = false; call('OnDisable'); });
    stage.ui.button('SetActive(true)', () => { if (!obj.exists || obj.active) return; obj.active = true; call('OnEnable'); });
    stage.ui.button('Destroy', () => { if (!obj.exists) return; if (obj.active) call('OnDisable'); call('OnDestroy'); Object.assign(obj, { exists: false, active: false }); }, { variant: 'danger' });
    stage.ui.group('Thời gian');
    stage.ui.slider('FPS game', { min: 10, max: 120, value: fps, unit: ' fps' }, (v) => (fps = v));
    stage.ui.slider('Fixed Timestep', { min: 0.01, max: 0.05, step: 0.005, value: fixedDt, unit: 's' }, (v) => (fixedDt = v));
    stage.ui.slider('Tốc độ xem', { min: 1, max: 12, value: viewSpeed, unit: ' frame/s' }, (v) => (viewSpeed = v));
    stage.ui.toggle('Log Update', logUpdate, (v) => (logUpdate = v));
    const fixedCount = stage.ui.readout('FixedUpdate/frame', '0');

    stage.onFrame((dt) => {
      frameTimer += dt;
      if (frameTimer >= 1 / viewSpeed) { frameTimer = 0; stepFrame(); }
      render();
    });

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      // GameObject card
      const cardW = Math.min(240, w * 0.4), cx = 20, cy = 18;
      d.node(cx, cy, cardW, 58, null, { accent: obj.exists ? (obj.active ? C.green : C.faint) : C.lineSoft });
      d.text(obj.exists ? '■ Player' : '□ (chưa có object)', cx + 14, cy + 20, { font: 'cond', weight: 700, size: 16, color: obj.exists ? C.navy : C.faint });
      d.text(obj.exists ? (obj.active ? 'activeSelf = true' : 'activeSelf = false') : 'bấm Instantiate', cx + 14, cy + 41, { font: 'mono', size: 11, color: C.muted });
      d.circle(cx + cardW - 18, cy + 20, 6, { fill: obj.exists && obj.active ? C.green : C.line });
      d.text(`frame #${frameNo}`, w - 20, cy + 20, { align: 'right', font: 'mono', size: 13, weight: 600, color: C.navy });
      d.text(`deltaTime ${(1 / fps).toFixed(3)}s · fixed ${fixedDt.toFixed(3)}s`, w - 20, cy + 41, { align: 'right', font: 'mono', size: 11, color: C.muted });

      // Lane chart
      const top = 96, left = Math.min(118, w * 0.26), laneH = (h - top - 26) / LANES.length;
      const colW = (w - left - 16) / COLS;
      LANES.forEach((ln, i) => {
        const y = top + i * laneH;
        if (i % 2 === 0) d.rect(8, y, w - 16, laneH, { fill: 'rgba(233,220,202,0.35)', r: 6 });
        d.text(ln.name, left - 10, y + laneH / 2, { align: 'right', font: 'mono', size: Math.min(12, laneH * 0.42), weight: 600, color: ln.color });
      });
      frames.forEach((f, ci) => {
        const x = left + ci * colW, isLast = ci === frames.length - 1;
        if (isLast) d.rect(x + 2, top - 6, colW - 4, h - top - 14, { fill: 'rgba(26,163,161,0.10)', stroke: C.teal, lw: 1.5, r: 6 });
        d.text(f.no, x + colW / 2, h - 12, { align: 'center', font: 'mono', size: 10, color: isLast ? C.teal : C.faint });
        LANES.forEach((ln, li) => {
          const n = f.calls.filter((c) => c === ln.name).length;
          for (let k = 0; k < n; k++) {
            const r = Math.min(laneH, colW) * 0.22, off = (k - (n - 1) / 2) * r * 1.6;
            d.circle(x + colW / 2 + off, top + li * laneH + laneH / 2, r, { fill: ln.color, stroke: '#fff', lw: 1.5 });
          }
        });
      });
    }
  },
});
