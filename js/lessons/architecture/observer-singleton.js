/* Lesson: Singleton & Observer — GameManager.Instance fires OnScoreChanged, pulses travel along subscriber wires. */
U101.defineLesson('observer-singleton', {
  lead: 'Singleton cho bạn một điểm truy cập toàn cục (GameManager.Instance). Observer (C# event) cho phép UI, âm thanh, thành tích tự phản ứng khi điểm thay đổi mà GameManager không cần biết chúng là ai.',
  hint: 'Bấm AddScore để bắn event · Destroy một observer khi tắt "OnDisable gọi -=" để thấy MissingReferenceException · thử tạo GameManager thứ 2',
  overview: `
    <p><b>Singleton</b>: chỉ có một instance, truy cập qua <code>GameManager.Instance</code>. Trong Unity, instance được gán ở <code>Awake</code>. Nếu đã có instance khác thì tự <code>Destroy</code> bản trùng.</p>
    <p><b>Observer</b>: GameManager khai báo <code>event Action&lt;int&gt; OnScoreChanged</code>. Mỗi observer tự đăng ký (<code>+=</code>) và hủy đăng ký (<code>-=</code>). GameManager chỉ gọi <code>Invoke</code>, không phụ thuộc vào UI hay Audio.</p>
    <ul>
      <li>Đăng ký trong <code>OnEnable</code>, hủy trong <code>OnDisable</code>. Quên <code>-=</code> thì delegate vẫn giữ reference tới object đã Destroy.</li>
      <li>Khi event bắn tới object đã bị hủy, chỉ cần handler chạm vào thành phần Unity (<code>audioSource</code>, <code>transform</code>...) là ra <b>MissingReferenceException</b>. Object đó cũng không được GC thu hồi (leak).</li>
      <li>Với <code>DontDestroyOnLoad</code>, GameManager sống qua nhiều scene, nên handler bị rò rỉ cứ <b>tích lũy</b> sau mỗi lần load scene.</li>
    </ul>
    <p class="callout">Cạm bẫy của Singleton: phụ thuộc ẩn (class nào cũng gọi <code>Instance</code>), khó viết unit test, thứ tự khởi tạo (OnEnable của UI có thể chạy trước Awake của GameManager). Dùng cho dịch vụ thật sự toàn cục, đừng biến mọi Manager thành Singleton.</p>`,
  keyPoints: [
    'Singleton: Instance gán trong Awake, bản trùng tự Destroy.',
    'Observer: publisher không biết subscriber là ai, chỉ Invoke event.',
    'Luôn cặp += trong OnEnable với -= trong OnDisable.',
    'Handler quên hủy = leak + MissingReferenceException, càng tệ khi có DontDestroyOnLoad.',
  ],
  code: [{
    title: 'GameManager.cs',
    source: `
using System;
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }
    public event Action<int> OnScoreChanged;
    public int Score { get; private set; }

    void Awake()
    {
        if (Instance != null && Instance != this) { Destroy(gameObject); return; } // bản trùng
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    public void AddScore(int amount)
    {
        Score += amount;
        OnScoreChanged?.Invoke(Score); // ?. : không lỗi khi chưa ai đăng ký
    }
}`,
    note: 'Instance có private set nên code bên ngoài không gán đè được. Dòng kiểm tra trong Awake giữ cho chỉ có một GameManager.',
  }, {
    title: 'ScoreAudio.cs',
    source: `
using UnityEngine;

public class ScoreAudio : MonoBehaviour
{
    [SerializeField] private AudioSource source;

    void OnEnable()  => GameManager.Instance.OnScoreChanged += PlayCoin;

    void OnDisable()
    {
        if (GameManager.Instance != null)          // GameManager có thể đã bị hủy trước
            GameManager.Instance.OnScoreChanged -= PlayCoin;
    }

    void PlayCoin(int score) => source.Play();     // quên -= → MissingReferenceException ở đây
}`,
    note: 'Gọi -= khi chưa đăng ký không gây lỗi, nên cứ luôn hủy trong OnDisable.',
  }],
  tryIt: [
    'Bấm AddScore và đếm số chấm sáng chạy ra từ GameManager.',
    'Chọn AudioManager, bấm Unsubscribe rồi AddScore: GameManager có biết AudioManager vắng mặt không?',
    'Tắt "OnDisable gọi -=", Destroy AudioManager rồi AddScore. Đọc lỗi đỏ trong Console.',
    'Vẫn tắt -=, bấm Load Scene vài lần rồi AddScore: số handler rò rỉ tăng thế nào?',
    'Tắt DontDestroyOnLoad rồi Load Scene. Điểm số còn không?',
    'Bấm "Tạo GameManager #2" và xem Awake xử lý bản trùng.',
  ],
  links: [
    { label: 'C# events (Microsoft Docs)', url: 'https://learn.microsoft.com/dotnet/csharp/programming-guide/events/' },
    { label: 'Object.DontDestroyOnLoad', url: 'https://docs.unity3d.com/ScriptReference/Object.DontDestroyOnLoad.html' },
    { label: 'MissingReferenceException', url: 'https://docs.unity3d.com/ScriptReference/MissingReferenceException.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const obs = [
      { name: 'ScoreUI', type: 'TextMeshProUGUI', color: C.blue, shown: 30 },
      { name: 'AudioManager', type: 'AudioSource', color: C.orange },
      { name: 'Achievements', type: 'Animator', color: C.purple, shown: 30, unlocked: false },
    ].map((o) => Object.assign(o, { alive: true, sub: true, leaks: 0, flash: 0, err: 0 }));
    let score = 30, gmGen = 1, ddol = true, unsubOnDisable = true, auto = false, autoT = 0, sel = 1;
    let pulses = obs.map((o, i) => ({ i, ghost: false, p: 0.45 })), dupT = -1, sceneT = -1;

    const invocationCount = () => obs.reduce((n, o) => n + (o.sub ? 1 : 0) + o.leaks, 0);
    const syncReadouts = () => { invRead.set(String(invocationCount())); leakRead.set(String(obs.reduce((n, o) => n + o.leaks, 0))); };

    function addScore() {
      const n = invocationCount(); score += 10;
      stage.log(n ? `AddScore(10) → OnScoreChanged.Invoke(${score}) · ${n} handler` : `AddScore(10) → OnScoreChanged == null, không ai nghe`, 'info');
      obs.forEach((o, i) => {
        if (o.sub) pulses.push({ i, ghost: false, p: 0 });
        for (let k = 0; k < o.leaks; k++) pulses.push({ i, ghost: true, p: -k * 0.08 });
      });
    }
    function arrive(pl) {
      const o = obs[pl.i];
      if (pl.ghost) {
        o.err = 1;
        if (pl.p >= 1 && !pl.logged) stage.log(`MissingReferenceException: The object of type '${o.type}' has been destroyed but you are still trying to access it. (${o.name}.OnScoreChanged handler)`, 'error');
        return;
      }
      o.flash = 1; o.shown = score;
      if (o.name === 'Achievements' && score >= 100 && !o.unlocked) { o.unlocked = true; stage.log('Achievement mở khóa: "Trăm điểm"!', 'info'); }
    }
    function unsubscribe(o, why) { if (!o.sub) return; o.sub = false; stage.log(`${o.name}.OnDisable(): OnScoreChanged -= handler ${why || ''}`, 'info'); }
    function destroyObs(o) {
      if (!o.alive) return;
      o.alive = false;
      if (unsubOnDisable) unsubscribe(o, '(an toàn)');
      else if (o.sub) { o.sub = false; o.leaks++; stage.log(`Destroy(${o.name}) nhưng không gọi -=. GameManager vẫn giữ handler trỏ tới object đã chết.`, 'warn'); }
    }
    function respawn(o) { if (o.alive) return; o.alive = true; o.sub = true; o.shown = score; o.unlocked = score >= 100; stage.log(`${o.name}.OnEnable(): OnScoreChanged += handler`); }

    stage.ui.group('GameManager.Instance');
    stage.ui.button('AddScore(+10)', () => { addScore(); syncReadouts(); }, { variant: 'primary' });
    stage.ui.button('Tạo GameManager #2', () => {
      dupT = 0;
      stage.log('GameManager#2.Awake(): Instance != null → Destroy(gameObject). Vẫn chỉ có 1 instance.', 'warn');
    });
    stage.ui.toggle('Tự cộng điểm mỗi 1.5s', auto, (v) => (auto = v));
    stage.ui.toggle('DontDestroyOnLoad', ddol, (v) => (ddol = v));
    stage.ui.button('Load Scene', () => {
      sceneT = 0; pulses = [];
      stage.log('SceneManager.LoadScene("Level2")', 'info');
      obs.forEach((o) => { if (o.alive) destroyObs(o); });
      if (!ddol) {
        gmGen++; score = 0; obs.forEach((o) => (o.leaks = 0));
        stage.log(`GameManager bị hủy cùng scene cũ. Instance mới #${gmGen}: Score = 0, invocation list trống.`, 'warn');
      } else stage.log(`GameManager sống sót (DontDestroyOnLoad): Score = ${score}.`, 'info');
      obs.forEach((o) => respawn(o));
      syncReadouts();
    }, { variant: 'accent' });
    stage.ui.group('Observer');
    stage.ui.select('Chọn', obs.map((o, i) => ({ value: String(i), label: o.name })), String(sel), (v) => (sel = +v));
    stage.ui.button('Subscribe (+=)', () => { const o = obs[sel]; if (!o.alive || o.sub) return; o.sub = true; stage.log(`${o.name}: OnScoreChanged += handler`); syncReadouts(); });
    stage.ui.button('Unsubscribe (-=)', () => { unsubscribe(obs[sel]); syncReadouts(); });
    stage.ui.button('Destroy', () => { destroyObs(obs[sel]); syncReadouts(); }, { variant: 'danger' });
    stage.ui.button('Respawn', () => { respawn(obs[sel]); syncReadouts(); });
    stage.ui.toggle('OnDisable gọi -=', unsubOnDisable, (v) => (unsubOnDisable = v));
    const invRead = stage.ui.readout('Invocation list', '3');
    const leakRead = stage.ui.readout('Handler rò rỉ', '0');
    stage.log('GameManager.Awake(): Instance = this, DontDestroyOnLoad');
    obs.forEach((o) => stage.log(`${o.name}.OnEnable(): OnScoreChanged += handler`));

    stage.onFrame((dt) => {
      if (auto && (autoT += dt) > 1.5) { autoT = 0; addScore(); }
      const logged = new Set();
      pulses.forEach((pl) => {
        pl.p += dt * 1.6;
        if (pl.p >= 1 && !pl.done) { pl.done = true; pl.logged = logged.has(pl.i); arrive(pl); logged.add(pl.i); }
      });
      pulses = pulses.filter((pl) => pl.p < 1.15);
      obs.forEach((o) => { o.flash = Math.max(0, o.flash - dt * 2); o.err = Math.max(0, o.err - dt * 1.5); });
      if (dupT >= 0) dupT = dupT > 1.8 ? -1 : dupT + dt;
      if (sceneT >= 0) sceneT = sceneT > 0.7 ? -1 : sceneT + dt;
      render();
    });

    const bez = (a, b, t, u = 1 - t, mx = (a[0] + b[0]) / 2) => [u * u * u * a[0] + 3 * u * t * mx + t * t * t * b[0], (u * u * u + 3 * u * u * t) * a[1] + (3 * u * t * t + t * t * t) * b[1]];
    function wire(a, b, o) {
      const ctx = d.ctx, mx = (a[0] + b[0]) / 2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.bezierCurveTo(mx, a[1], mx, b[1], b[0], b[1]);
      ctx.lineWidth = o.lw || 2; ctx.strokeStyle = o.stroke; ctx.setLineDash(o.dash || []); ctx.stroke(); ctx.setLineDash([]);
    }

    function render() {
      const { w, h } = stage, ctx = d.ctx;
      d.clear(w, h); d.grid(w, h);
      const gw = U.clamp(w * 0.36, 150, 250), gh = 150, gx = 16, gy = h / 2 - gh / 2;
      const ow = U.clamp(w * 0.34, 140, 230), ox = w - ow - 16, slot = (h - 24) / 3, oh = Math.min(92, slot - 18);
      const port = [gx + gw, gy + gh / 2];
      const target = (i) => [ox, 12 + slot * i + slot / 2];
      // wires
      obs.forEach((o, i) => {
        const t = target(i);
        for (let k = o.leaks; k >= 1; k--) wire(port, [t[0] - k * 7, t[1] - k * 7], { stroke: C.red, dash: [5, 4], lw: 1.5 });
        wire(port, t, o.sub ? { stroke: o.color, lw: 2.5 } : { stroke: C.lineSoft, dash: [3, 5], lw: 1.5 });
      });
      pulses.forEach((pl) => {
        if (pl.p < 0 || pl.p > 1) return;
        const t = target(pl.i), o = obs[pl.i];
        const [x, y] = bez(port, pl.ghost ? [t[0] - 7, t[1] - 7] : t, pl.p);
        d.circle(x, y, 9, { fill: pl.ghost ? 'rgba(214,90,74,0.25)' : 'rgba(26,163,161,0.18)' });
        d.circle(x, y, 5, { fill: pl.ghost ? C.red : o.color, stroke: '#fff', lw: 1.5 });
      });
      // GameManager card
      d.node(gx, gy, gw, gh, null, { accent: C.teal, lw: 2.5 });
      d.text('GameManager', gx + 14, gy + 20, { font: 'cond', weight: 700, size: 17, color: C.navy });
      d.pill('Singleton', gx + gw - 12 - d.measure('Singleton', { size: 10, font: 'mono' }) - 16, gy + 20, { size: 10, fill: C.teal });
      const rows = [['static Instance', `#${gmGen}`], ['Score', String(score)], ['OnScoreChanged', `${invocationCount()} handler`], ['DontDestroyOnLoad', ddol ? 'on' : 'off']];
      rows.forEach(([k, v], i) => {
        const y = gy + 48 + i * 23;
        d.text(k, gx + 14, y, { font: 'mono', size: 11, color: C.muted });
        d.text(v, gx + gw - 14, y, { align: 'right', font: 'mono', size: i === 1 ? 14 : 11, weight: 700, color: i === 2 && obs.some((o) => o.leaks) ? C.red : C.navy });
      });
      d.circle(port[0], port[1], 7, { fill: C.teal, stroke: '#fff', lw: 2 });
      if (ox - port[0] > 150) d.text('OnScoreChanged?.Invoke()', port[0] + 12, port[1] - 14, { font: 'mono', size: 10, color: C.tealDeep });
      if (dupT >= 0) {
        ctx.save(); ctx.globalAlpha = dupT < 0.9 ? 1 : Math.max(0, 1 - (dupT - 0.9) / 0.9);
        const dy = gy + gh + 14 > h - 56 ? gy - 62 : gy + gh + 14;
        d.node(gx + 10, dy, gw - 20, 48, 'GameManager #2', { accent: C.red, sub: 'Instance != null → Destroy', fill: '#fbe6df', dash: [4, 4] });
        ctx.restore();
      }
      // Observers
      obs.forEach((o, i) => {
        const t = target(i), y = t[1] - oh / 2;
        for (let k = o.leaks; k >= 1; k--) d.rect(ox - k * 7, y - k * 7, ow, oh, { fill: `rgba(251,230,223,${0.5 + o.err * 0.5})`, stroke: C.red, dash: [4, 3], r: 10 });
        if (!o.alive) { d.rect(ox, y, ow, oh, { fill: 'rgba(249,242,229,0.6)', stroke: C.faint, dash: [5, 4], r: 10 }); d.text(`${o.name} (đã Destroy)`, ox + ow / 2, t[1], { align: 'center', font: 'mono', size: 11, color: C.faint }); return; }
        d.node(ox, y, ow, oh, null, { accent: o.sub ? o.color : C.line, fill: o.flash ? `rgba(26,163,161,${0.08 + o.flash * 0.15})` : C.card });
        d.text(o.name, ox + 12, y + 16, { font: 'cond', weight: 700, size: 14, color: C.navy });
        d.text(o.sub ? 'subscribed' : 'không nghe', ox + ow - 10, y + 16, { align: 'right', font: 'mono', size: 10, color: o.sub ? C.green : C.faint });
        const by = y + oh * 0.62;
        if (o.name === 'ScoreUI') d.text(`Score: ${o.shown}`, ox + 12, by, { font: 'mono', weight: 700, size: 16 + o.flash * 4, color: C.blue });
        if (o.name === 'AudioManager') {
          for (let b = 0; b < 6; b++) { const bh = 4 + o.flash * (6 + ((b * 7) % 5) * 4); d.rect(ox + 12 + b * 8, by + 8 - bh, 5, bh, { fill: C.orange, r: 2 }); }
          d.text(o.flash ? '♪ coin.wav' : 'AudioSource', ox + 70, by, { font: 'mono', size: 11, color: o.flash ? C.orange : C.muted });
        }
        if (o.name === 'Achievements') {
          const bw = ow - 24, k = U.clamp(o.shown / 100, 0, 1);
          d.rect(ox + 12, by - 5, bw, 10, { fill: C.lineSoft, r: 5 });
          d.rect(ox + 12, by - 5, Math.max(10, bw * k), 10, { fill: o.unlocked ? C.green : C.purple, r: 5 });
          d.text(o.unlocked ? 'Trăm điểm ✓' : `${o.shown}/100`, ox + 12, by + 15, { font: 'mono', size: 10, color: o.unlocked ? C.green : C.muted });
        }
        if (o.leaks) d.pill(`${o.leaks} leak`, ox + ow - 8, y, { size: 10, align: 'center', fill: C.red });
      });
      if (sceneT >= 0) {
        d.rect(0, 0, w, h, { fill: `rgba(24,33,61,${0.55 * (1 - sceneT / 0.7)})`, r: 0 });
        d.text('Loading Scene…', w / 2, h / 2, { align: 'center', font: 'cond', weight: 700, size: 22, color: '#fff' });
      }
    }
  },
});
