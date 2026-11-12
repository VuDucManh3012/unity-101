/* Lesson: Coroutines vs async/await vs UniTask — time-axis lanes showing where code resumes on the main thread. */
U101.defineLesson('coroutines-async', {
  lead: 'Coroutine, async/await và UniTask đều giúp viết code "chờ" mà không chặn game. Chúng không chạy song song: phần tiếp theo vẫn được Unity gọi lại trên main thread, ở một frame sau.',
  hint: 'Bấm StartCoroutine, await Task.Delay, await UniTask.Delay · thử Thread.Sleep để thấy game đứng hình · Destroy khi đang chờ',
  overview: `
    <p>Unity chạy game loop trên <b>main thread</b>. Nếu một hàm chạy lâu, frame đó kéo dài và game <b>đứng hình</b>. Ba cách để "chờ" mà không chặn:</p>
    <ul>
      <li><b>Coroutine</b> (<code>IEnumerator</code> + <code>yield return</code>): Unity kiểm tra coroutine mỗi frame, sau Update. <code>yield return null</code> = tiếp tục ở frame sau; <code>WaitForSeconds</code> = sau ít nhất N giây; <code>WaitUntil</code> = kiểm tra điều kiện mỗi frame. Coroutine <b>tự dừng khi GameObject bị Destroy/tắt</b>.</li>
      <li><b>async/await với Task</b>: <code>Task.Delay</code> đếm giờ ngoài main thread, phần sau <code>await</code> được đưa về main thread (UnitySynchronizationContext). Task <b>không biết</b> GameObject đã bị hủy: cần <code>CancellationToken</code>.</li>
      <li><b>UniTask</b> (thư viện Cysharp): async/await chạy theo PlayerLoop của Unity, gần như <b>0 GC alloc</b>, có sẵn <code>destroyCancellationToken</code>, <code>UniTask.Yield()</code>, <code>WaitUntil</code>…</li>
      <li><b>Thread.Sleep</b> trên main thread: chặn toàn bộ game. Không bao giờ dùng.</li>
    </ul>
    <p class="callout">Unity API (transform, GameObject…) chỉ được gọi từ main thread. <code>Task.Run</code> chạy trên thread khác, nên chỉ dùng cho tính toán thuần.</p>`,
  keyPoints: [
    'Coroutine/async không phải đa luồng: phần tiếp theo chạy lại trên main thread ở frame sau.',
    'WaitForSeconds/Task.Delay chờ "ít nhất" N giây, phần tiếp theo luôn rơi vào đầu một frame.',
    'Thread.Sleep hoặc vòng lặp nặng trên main thread làm đứng hình toàn bộ game.',
    'Hủy async khi object bị Destroy bằng CancellationToken (destroyCancellationToken).',
  ],
  code: [{
    title: 'Blinker.cs (Coroutine)',
    source: `
using System.Collections;
using UnityEngine;

public class Blinker : MonoBehaviour
{
    Coroutine routine;
    void OnEnable()  { routine = StartCoroutine(Blink()); }
    void OnDisable() { if (routine != null) StopCoroutine(routine); }

    IEnumerator Blink()
    {
        while (true)
        {
            GetComponent<Renderer>().material.color = Random.ColorHSV();
            yield return new WaitForSeconds(0.5f);   // hoặc: yield return null;
            // yield return new WaitUntil(() => isReady);
        }
    }
}`,
    note: 'Coroutine gắn với MonoBehaviour: Destroy hoặc SetActive(false) sẽ dừng nó.',
  }, {
    title: 'Loader.cs (async/await + UniTask)',
    source: `
using System.Threading;
using System.Threading.Tasks;
using Cysharp.Threading.Tasks;
using UnityEngine;

public class Loader : MonoBehaviour
{
    async Task LoadWithTask(CancellationToken ct)
    {
        await Task.Delay(1000, ct);            // timer ngoài main thread
        transform.localScale = Vector3.one * 2; // quay về main thread
    }

    async UniTaskVoid LoadWithUniTask()
    {
        var ct = destroyCancellationToken;      // tự hủy khi Destroy
        await UniTask.Delay(1000, cancellationToken: ct); // 0 alloc
        transform.localScale = Vector3.one * 2;
    }
}`,
    note: 'Không có token, phần sau await vẫn chạy dù object đã bị Destroy → MissingReferenceException.',
  }],
  tryIt: [
    'Chọn yield return null: coroutine chạy lại ở mấy frame liên tiếp?',
    'Chọn WaitUntil, bấm "isReady = true": coroutine chạy tiếp ở frame nào?',
    'Bấm await Task.Delay rồi ngay lập tức Thread.Sleep(500): timer xong giữa chừng nhưng code tiếp tục lúc nào?',
    'Bấm await Task.Delay rồi Destroy khi chưa xong (tắt CancellationToken): xem lỗi ở Console.',
    'Bật CancellationToken và lặp lại: Task bị hủy gọn gàng.',
  ],
  links: [
    { label: 'Coroutines (Manual)', url: 'https://docs.unity3d.com/Manual/Coroutines.html' },
    { label: 'Await support in Unity', url: 'https://docs.unity3d.com/Manual/async-await-support.html' },
    { label: 'UniTask (GitHub)', url: 'https://github.com/Cysharp/UniTask' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const LANES = [
      { k: 'main', name: 'Main thread', color: C.navy }, { k: 'co', name: 'Coroutine', color: C.teal },
      { k: 'task', name: 'async Task', color: C.purple }, { k: 'uni', name: 'UniTask', color: C.orange },
    ];
    const WIN = 2.4;
    let fps = 30, speed = 0.35, now = 0, frameStart = 0, frameDur = 1 / fps, frameNo = 0, sleepNext = false;
    let frames = [], marks = [], spans = [], jobs = [], useToken = false;
    const co = { running: false, mode: 'wfs', resumeAt: 0, ready: false };
    const obj = { alive: true, hue: 170, angle: 0 };

    const mark = (lane, t, label, kind = 'run') => marks.push({ lane, t, label, kind });
    function startCo() {
      if (!obj.alive) return stage.log('Không thể StartCoroutine: object đã bị Destroy.', 'error');
      if (co.running) return stage.log('Coroutine Blink đang chạy rồi.', 'warn');
      Object.assign(co, { running: true, resumeAt: now + 0.5, ready: false }); mark('co', now, 'Start'); stage.log('StartCoroutine(Blink()) → chạy tới yield đầu tiên.');
    }
    function startJob(kind) {
      if (!obj.alive) return stage.log('Object đã bị Destroy.', 'warn');
      const j = { kind, lane: kind, t0: now, done: now + 1, timerFired: false, finished: false };
      jobs.push(j); mark(kind, now, 'await');
      stage.log(kind === 'task' ? 'await Task.Delay(1000): tạo Task (GC alloc), timer chạy ngoài main thread.' : 'await UniTask.Delay(1000): chờ theo PlayerLoop, 0 alloc.');
    }

    function beginFrame() {
      frameNo++; frameStart = now;
      frameDur = 1 / fps + (sleepNext ? 0.5 : 0);
      frames.push({ t0: now, dur: frameDur, sleep: sleepNext, no: frameNo });
      if (sleepNext) { mark('main', now, 'Sleep'); sleepNext = false; }
      if (obj.alive) obj.angle += 0.35;
      // async continuations run on the main thread at the start of the frame
      jobs.forEach((j) => {
        if (j.finished || now < j.done) return;
        j.finished = true; spans.push({ lane: j.lane, t0: j.t0, t1: now });
        if (obj.alive) { mark(j.lane, now, 'tiếp tục'); obj.hue = j.kind === 'task' ? 265 : 25; stage.log(`${j.kind === 'task' ? 'Task' : 'UniTask'}: chạy phần sau await ở frame ${frameNo} (main thread).`); }
        else if (useToken) { mark(j.lane, now, 'hủy', 'cancel'); }
        else { mark(j.lane, now, 'lỗi!', 'error'); stage.log("MissingReferenceException: The object of type 'Loader' has been destroyed but you are still trying to access it.", 'error'); }
      });
      if (!co.running || !obj.alive) return;
      const resume = () => { mark('co', now, '▶'); obj.hue = (obj.hue + 70) % 360; };
      if (co.mode === 'null') resume();
      else if (co.mode === 'wfs' && now >= co.resumeAt) { resume(); co.resumeAt = now + 0.5; }
      else if (co.mode === 'until') { if (co.ready) { resume(); co.ready = false; stage.log(`WaitUntil thỏa → coroutine chạy tiếp ở frame ${frameNo}.`); } else mark('co', now, '', 'check'); }
    }
    function step(dt) {
      now += dt;
      jobs.forEach((j) => { if (j.kind === 'task' && !j.timerFired && now >= j.done) { j.timerFired = true; mark('task', j.done, 'timer', 'timer'); } });
      while (now >= frameStart + frameDur) { now = Math.max(now, frameStart + frameDur); beginFrame(); break; }
      const cut = now - WIN - 1;
      frames = frames.filter((f) => f.t0 + f.dur > cut); marks = marks.filter((m) => m.t > cut);
      spans = spans.filter((s) => s.t1 > cut); jobs = jobs.filter((j) => !j.finished || j.done > cut);
    }

    // Inspector
    stage.ui.group('Coroutine');
    stage.ui.select('yield', [{ value: 'null', label: 'yield return null' }, { value: 'wfs', label: 'WaitForSeconds(0.5f)' }, { value: 'until', label: 'WaitUntil(() => isReady)' }], co.mode, (v) => { co.mode = v; co.resumeAt = now + 0.5; stage.log(`Đổi sang ${v === 'null' ? 'yield return null: chạy lại mỗi frame' : v === 'wfs' ? 'WaitForSeconds: chạy lại ở frame đầu tiên sau 0.5s' : 'WaitUntil: kiểm tra điều kiện mỗi frame'}.`); });
    stage.ui.button('StartCoroutine', startCo, { variant: 'primary' });
    stage.ui.button('StopCoroutine', () => { if (co.running) { co.running = false; mark('co', now, 'Stop', 'cancel'); stage.log('StopCoroutine: coroutine dừng, không chạy tiếp nữa.'); } });
    stage.ui.button('isReady = true', () => { co.ready = true; stage.log('isReady = true (WaitUntil sẽ thấy ở lần kiểm tra kế tiếp).'); });
    stage.ui.group('async / await');
    stage.ui.button('await Task.Delay', () => startJob('task'), { variant: 'accent' });
    stage.ui.button('await UniTask.Delay', () => startJob('uni'), { variant: 'accent' });
    stage.ui.toggle('Dùng CancellationToken', useToken, (v) => (useToken = v));
    stage.ui.group('Main thread');
    stage.ui.button('Thread.Sleep(500)', () => { sleepNext = true; stage.log('Thread.Sleep(500) trên main thread: frame kế tiếp kéo dài 500ms, game đứng hình!', 'error'); }, { variant: 'danger' });
    stage.ui.button('Destroy', () => {
      if (!obj.alive) return; obj.alive = false; mark('main', now, 'Destroy', 'error');
      if (co.running) { co.running = false; mark('co', now, 'dừng', 'cancel'); stage.log('Destroy: coroutine tự dừng theo GameObject.', 'warn'); }
      if (useToken) jobs.forEach((j) => { if (!j.finished) { j.finished = true; spans.push({ lane: j.lane, t0: j.t0, t1: now }); mark(j.lane, now, 'hủy', 'cancel'); } });
      if (jobs.some((j) => !j.finished) || useToken) stage.log(useToken ? 'Token bị cancel → các await đang chờ sẽ bị hủy (OperationCanceledException).' : 'Task KHÔNG biết object đã bị hủy, nó vẫn chờ…', useToken ? 'info' : 'warn');
    }, { variant: 'danger' });
    stage.ui.button('Respawn', () => { if (!obj.alive) { obj.alive = true; stage.log('Instantiate lại object.'); } });
    stage.ui.slider('FPS game', { min: 10, max: 60, value: fps, unit: ' fps' }, (v) => (fps = v));
    stage.ui.slider('Tốc độ xem', { min: 0.1, max: 1, step: 0.05, value: speed, unit: '×' }, (v) => (speed = v));

    // Prefill so the timeline is meaningful immediately
    startCo(); for (let i = 0; i < 40; i++) step(0.02); startJob('task');
    for (let i = 0; i < 25; i++) step(0.02); startJob('uni'); for (let i = 0; i < 60; i++) step(0.02);

    stage.onFrame((dt) => { step(dt * speed); render(); });

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      // Object card
      const narrow = w < 560, cw = narrow ? w - 32 : 320;
      d.node(16, 14, cw, 60, null, { accent: obj.alive ? C.teal : C.lineSoft });
      const bx = 50, by = 44, s = 15;
      if (obj.alive) {
        d.ctx.save(); d.ctx.translate(bx, by); d.ctx.rotate(obj.angle);
        d.rect(-s, -s, s * 2, s * 2, { fill: `hsl(${obj.hue},55%,52%)`, r: 4 }); d.ctx.restore();
      } else d.text('✕', bx, by, { align: 'center', size: 22, color: C.red, weight: 700 });
      d.text(obj.alive ? 'Enemy (Blinker, Loader)' : 'Destroyed', 80, 34, { font: 'cond', weight: 700, size: 15, color: obj.alive ? C.navy : C.red });
      d.text(obj.alive ? (narrow ? 'đổi màu khi resume' : 'xoay mỗi frame · đổi màu khi resume') : 'coroutine đã dừng', 80, 54, { font: 'mono', size: 11, color: C.muted });
      const last = frames[frames.length - 1];
      d.text(`frame #${frameNo}`, narrow ? w - 30 : w - 16, 32, { align: 'right', font: 'mono', size: 13, weight: 600, color: C.navy });
      if (!narrow) d.text(`frame cuối: ${Math.round((last ? last.dur : 0) * 1000)}ms`, w - 16, 52, { align: 'right', font: 'mono', size: 11, color: last && last.sleep ? C.red : C.muted });

      // Lanes (x = time)
      const top = 92, left = Math.min(110, w * 0.24), right = w - 14, laneH = (h - top - 30) / LANES.length;
      const X = (t) => right - ((now - t) / WIN) * (right - left);
      const LY = (k) => top + LANES.findIndex((l) => l.k === k) * laneH + laneH / 2;
      LANES.forEach((ln, i) => {
        const y = top + i * laneH;
        if (i % 2 === 0) d.rect(8, y, w - 16, laneH, { fill: 'rgba(233,220,202,0.35)', r: 6 });
        d.text(ln.name, left - 10, y + laneH / 2, { align: 'right', font: 'mono', size: 11, weight: 600, color: ln.color });
      });
      d.ctx.save(); d.ctx.beginPath(); d.ctx.rect(left, top - 4, right - left, h - top); d.ctx.clip();
      const mh = Math.min(26, laneH * 0.5), my = LY('main');
      frames.forEach((f) => {
        const x0 = X(f.t0), x1 = X(Math.min(now, f.t0 + f.dur));
        d.rect(x0 + 1, my - mh / 2, Math.max(2, x1 - x0 - 2), mh, { fill: f.sleep ? 'rgba(214,90,74,0.85)' : 'rgba(36,48,74,0.82)', r: 3 });
        if (f.sleep && x1 - x0 > 60) d.text('ĐỨNG HÌNH 500ms', (x0 + x1) / 2, my, { align: 'center', font: 'mono', size: 11, weight: 700, color: '#fff' });
        d.line(x0, top, x0, h - 30, { stroke: 'rgba(206,192,173,0.55)', lw: 1 });
      });
      spans.concat(jobs.filter((j) => !j.finished).map((j) => ({ lane: j.lane, t0: j.t0, t1: now, live: true }))).forEach((sp) => {
        const y = LY(sp.lane), col = LANES.find((l) => l.k === sp.lane).color;
        d.line(X(sp.t0), y, X(sp.t1), y, { stroke: col, lw: 2, dash: [5, 4] });
        if (sp.live) d.text('đang chờ…', X(sp.t1) - 4, y - 14, { align: 'right', font: 'mono', size: 10, color: col });
      });
      marks.forEach((m) => {
        const x = X(m.t), y = LY(m.lane), ln = LANES.find((l) => l.k === m.lane);
        if (m.kind === 'check') return d.circle(x + 3, y, 3, { stroke: ln.color, lw: 1.5 });
        const col = m.kind === 'error' ? C.red : m.kind === 'cancel' ? C.faint : m.kind === 'timer' ? C.pink : ln.color;
        if (m.kind === 'timer') { d.line(x, y - 12, x, y + 12, { stroke: col, lw: 2 }); d.text('⏱ timer', x + 4, y + 18, { font: 'mono', size: 10, color: col }); return; }
        if (m.lane === 'main') { d.pill(m.label, x + 4, y - mh / 2 - 12, { size: 10, fill: col === ln.color ? C.red : col }); return; }
        d.circle(x + 4, y, 6, { fill: col, stroke: '#fff', lw: 1.5 });
        if (m.label && m.label !== '▶') d.text(m.label, x + 4, y - 15, { align: 'center', font: 'mono', size: 10, weight: 600, color: col });
      });
      d.ctx.restore();
      d.text(`← ${WIN}s trước`, left, h - 14, { font: 'mono', size: 10, color: C.faint });
      d.text('bây giờ →', right, h - 14, { align: 'right', font: 'mono', size: 10, color: C.faint });
      if (!narrow) d.text('mỗi khối = 1 frame trên main thread', (left + right) / 2, h - 14, { align: 'center', font: 'mono', size: 10, color: C.muted });
    }
  },
});
