/* Lesson: Event & Delegate — publisher multicasts to subscribers; destroyed-but-subscribed objects leak and throw. */
U101.defineLesson('events-delegates', {
  lead: 'Delegate là một biến chứa tham chiếu tới hàm. Event là delegate được bảo vệ: bên ngoài chỉ được += (đăng ký) và -= (hủy). Khi event được gọi, mọi hàm đã đăng ký chạy lần lượt (multicast).',
  hint: 'Bấm vào subscriber để += / -= · Raise để gọi event · tắt "Hủy đăng ký trong OnDisable" rồi Destroy Enemy để thấy leak',
  overview: `
    <p>Event giúp các hệ thống <b>không phụ thuộc trực tiếp</b> vào nhau. Player không cần biết có thanh máu, âm thanh hay achievement. Nó chỉ phát event <code>OnDamaged</code>, ai quan tâm thì đăng ký.</p>
    <ul>
      <li><b>Action</b> / <b>Action&lt;T&gt;</b>: delegate không trả về giá trị. <b>Func&lt;T, TResult&gt;</b>: delegate có trả về (tham số cuối là kiểu trả về).</li>
      <li><b>Multicast</b>: một delegate giữ một <i>invocation list</i>. <code>+=</code> thêm hàm vào cuối danh sách, <code>-=</code> gỡ ra. Gọi event sẽ chạy theo đúng thứ tự đăng ký.</li>
      <li>Từ khóa <b>event</b> chặn code bên ngoài gán <code>=</code> (xóa hết người khác) hoặc tự gọi Invoke.</li>
      <li>Dùng <code>OnDamaged?.Invoke(dmg)</code>: nếu chưa ai đăng ký thì event là <code>null</code>.</li>
    </ul>
    <p class="callout"><b>Memory leak</b>: invocation list giữ tham chiếu tới object đã đăng ký. Nếu object bị <code>Destroy</code> mà chưa <code>-=</code>, C# object không được GC thu hồi và handler vẫn chạy trên một object "đã chết", gây <code>MissingReferenceException</code>. Luôn ghép cặp: += trong <b>OnEnable</b>, -= trong <b>OnDisable</b>.</p>`,
  keyPoints: [
    'Action = hàm không trả về, Func = hàm có trả về.',
    'event chỉ cho phép += / -= từ bên ngoài, chỉ class khai báo mới Invoke được.',
    'Một event gọi nhiều handler theo thứ tự đăng ký (multicast).',
    'Quên -= khi Destroy → leak + MissingReferenceException.',
  ],
  code: [{
    title: 'Player.cs',
    source: `
using System;
using UnityEngine;

public class Player : MonoBehaviour
{
    public event Action<int> OnDamaged;     // chỉ Player được Invoke
    [SerializeField] private int hp = 100;

    public void TakeDamage(int dmg)
    {
        hp -= dmg;
        OnDamaged?.Invoke(dmg);              // gọi mọi subscriber
    }
}`,
    note: 'Dấu ?. tránh NullReferenceException khi chưa có ai đăng ký.',
  }, {
    title: 'EnemyAI.cs',
    source: `
using UnityEngine;

public class EnemyAI : MonoBehaviour
{
    [SerializeField] private Player player;

    void OnEnable()  { player.OnDamaged += HandleDamaged; }  // đăng ký
    void OnDisable() { player.OnDamaged -= HandleDamaged; }  // BẮT BUỘC hủy

    private void HandleDamaged(int dmg)
    {
        // Nếu object đã Destroy mà chưa -=, truy cập name sẽ ném MissingReferenceException
        Debug.Log(dmg > 20 ? $"{name}: Player yếu rồi, tấn công!" : $"{name}: chưa đáng sợ");
    }
}`,
    note: 'OnDisable cũng chạy khi object bị Destroy, nên -= ở đây là đủ an toàn.',
  }, {
    title: 'ActionFunc.cs',
    source: `
using System;
using UnityEngine;

public static class ActionFuncDemo
{
    public static void Run()
    {
        Action<string> say = msg => Debug.Log(msg);
        say += msg => Debug.Log(msg.ToUpper());  // multicast: 2 hàm
        say("hello");                             // in "hello" rồi "HELLO"

        Func<int, int, int> add = (a, b) => a + b;
        Debug.Log(add(2, 3));                     // 5
    }
}`,
    note: 'Lambda (=>) là cách viết hàm ngắn gọn để gán vào delegate.',
  }],
  tryIt: [
    'Bấm Raise: các tia đi tới subscriber theo thứ tự nào?',
    'Bấm vào SoundManager để -= rồi Raise lại. Nó còn nhận event không?',
    'Tắt "Hủy đăng ký trong OnDisable", Destroy một Enemy rồi Raise. Đọc lỗi trong Console.',
    'Spawn/Destroy vài lần khi đang tắt: invocation list phình ra thế nào?',
    'Bấm "OnDamaged = null" (từ class khác): vì sao compiler chặn?',
  ],
  links: [
    { label: 'Delegates (Microsoft)', url: 'https://learn.microsoft.com/dotnet/csharp/programming-guide/delegates/' },
    { label: 'Events (Microsoft)', url: 'https://learn.microsoft.com/dotnet/csharp/programming-guide/events/' },
    { label: 'Action<T> (Microsoft)', url: 'https://learn.microsoft.com/dotnet/api/system.action-1' },
    { label: 'Unity Manual: UnityEvents', url: 'https://docs.unity3d.com/Manual/UnityEvents.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    let hp = 100, dmg = 20, autoUnsub = true, enemyNo = 0, hits = 0, pulses = [], boxes = [];
    const subs = [];
    const add = (name, color, react, isEnemy) => { const s = { name, color, react, isEnemy, on: true, ghost: false, flash: 0, err: 0, y: null }; subs.push(s); return s; };
    add('HealthBarUI', C.green, () => `HealthBarUI: thanh máu ${hp + dmg} → ${hp}`);
    add('SoundManager', C.blue, () => 'SoundManager: phát "hurt.wav"');
    add('Achievement', C.purple, () => `Achievement: đã trúng đòn ${hits} lần`);
    const spawn = () => { const s = add(`EnemyAI #${++enemyNo}`, C.orange, () => (dmg > 20 ? `EnemyAI #${s.name.split('#')[1]}: Player yếu rồi, tấn công!` : `EnemyAI #${s.name.split('#')[1]}: chưa đáng sợ`), true); stage.log(`Spawn ${s.name} → OnEnable: player.OnDamaged += HandleDamaged`); };
    spawn(); spawn();
    const list = () => subs.filter((s) => s.on);

    stage.ui.group('Player');
    stage.ui.slider('Damage', { min: 5, max: 50, step: 5, value: dmg }, (v) => (dmg = v));
    stage.ui.button('Raise OnDamaged', raise, { variant: 'primary' });
    stage.ui.button('OnDamaged = null', () => stage.log("error CS0070: The event 'Player.OnDamaged' can only appear on the left hand side of += or -= (except when used from within the type 'Player')", 'error'));
    stage.ui.group('Enemy (subscriber động)');
    stage.ui.toggle('Hủy đăng ký trong OnDisable', autoUnsub, (v) => (autoUnsub = v));
    stage.ui.button('Spawn Enemy', () => { if (subs.length >= 9) return stage.log('Demo giới hạn 9 subscriber', 'warn'); spawn(); }, { variant: 'accent' });
    stage.ui.button('Destroy Enemy', destroyEnemy, { variant: 'danger' });
    const readList = stage.ui.readout('Invocation list', '');

    function raise() {
      hp = Math.max(0, hp - dmg); hits++;
      const l = list();
      stage.log(`Player.TakeDamage(${dmg}) → OnDamaged?.Invoke(${dmg}) · ${l.length} handler`);
      if (!l.length) return stage.log('OnDamaged == null: chưa ai đăng ký, ?. bỏ qua lời gọi', 'warn');
      l.forEach((s, i) => pulses.push({ s, t: -i * 0.18 }));
      if (hp === 0) hp = 100;
    }
    function destroyEnemy() {
      const e = subs.find((s) => s.isEnemy && !s.ghost);
      if (!e) return stage.log('Không còn Enemy nào đang sống', 'warn');
      if (autoUnsub && e.on) { stage.log(`Destroy(${e.name}) → OnDisable: OnDamaged -= HandleDamaged ✓`); subs.splice(subs.indexOf(e), 1); return; }
      if (!e.on) { stage.log(`Destroy(${e.name}) · đã -= từ trước, sạch sẽ`); subs.splice(subs.indexOf(e), 1); return; }
      e.ghost = true; e.name += ' (destroyed)';
      stage.log(`Destroy(${e.name.replace(' (destroyed)', '')}) nhưng KHÔNG -= → vẫn nằm trong invocation list (leak)`, 'warn');
    }
    function deliver(s) {
      if (s.ghost) { s.err = 1; return stage.log(`MissingReferenceException: The object of type 'EnemyAI' has been destroyed but you are still trying to access it.`, 'error'); }
      s.flash = 1; stage.log(s.react());
    }
    stage.onPointer('down', (x, y) => {
      const b = boxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (!b || b.s.ghost) return b && stage.log('Object đã bị Destroy, không thể gọi -= từ nó nữa. Leak này chỉ hết khi Player bị hủy', 'warn');
      b.s.on = !b.s.on;
      const inst = b.s.isEnemy ? 'enemy' + b.s.name.split('#')[1] : b.s.name[0].toLowerCase() + b.s.name.slice(1);
      stage.log(`player.OnDamaged ${b.s.on ? '+=' : '-='} ${inst}.HandleDamaged;`);
    });

    stage.onFrame((dt) => {
      subs.forEach((s) => { s.flash = Math.max(0, s.flash - dt * 1.6); s.err = Math.max(0, s.err - dt * 1.2); });
      pulses.forEach((p) => { const before = p.t; p.t += dt * 1.6; if (before < 1 && p.t >= 1) deliver(p.s); });
      pulses = pulses.filter((p) => p.t < 1.3 && subs.includes(p.s));
      const ghosts = subs.filter((s) => s.ghost).length;
      readList.set(`${list().length} handler${ghosts ? ` · ${ghosts} leak` : ''}`);
      render();
    });

    function render() {
      const { w, h } = stage, pad = 16;
      d.clear(w, h); d.grid(w, h);
      const listH = 44, areaH = h - listH - 20;
      const pw = Math.min(190, w * 0.36), ph = 92, px = pad, py = areaH / 2 - ph / 2 + 6;
      const sw = Math.min(220, w * 0.42), sx = w - pad - sw, n = subs.length;
      const sh = Math.min(48, (areaH - 16) / n - 8), gap = Math.min(14, (areaH - 16 - n * sh) / Math.max(1, n - 1));
      const y0 = 10 + (areaH - (n * sh + (n - 1) * gap)) / 2;
      // Publisher
      d.node(px, py, pw, ph, null, { accent: C.navy, lw: 2.5 });
      d.text('Player', px + 14, py + 20, { font: 'cond', size: 17, weight: 700, color: C.navy });
      d.text(`hp = ${hp}`, px + pw - 12, py + 20, { align: 'right', font: 'mono', size: 12, weight: 700, color: hp > 40 ? C.green : C.red });
      d.text('event Action<int>', px + 14, py + 46, { font: 'mono', size: 11, color: C.muted });
      d.text('OnDamaged', px + 14, py + 66, { font: 'mono', size: 13, weight: 700, color: C.orange });
      const ox = px + pw, oy = py + ph / 2;
      boxes = [];
      subs.forEach((s, i) => {
        const ty = y0 + i * (sh + gap); s.y = s.y == null ? ty : U.lerp(s.y, ty, 0.2);
        const y = s.y, cy = y + sh / 2;
        d.line(ox, oy, sx, cy, s.on ? { stroke: s.ghost ? C.red : s.color, lw: 2, dash: s.ghost ? [3, 4] : null } : { stroke: C.lineSoft, lw: 1.5, dash: [5, 5] });
        const shake = s.err ? Math.sin(stage.time * 60) * s.err * 4 : 0;
        d.node(sx + shake, y, sw, sh, null, { accent: s.ghost ? C.red : s.on ? s.color : C.lineSoft, lw: 2 + s.flash * 2, fill: s.ghost ? 'rgba(214,90,74,0.08)' : s.flash ? '#fffaf1' : C.card, shadow: s.on && !s.ghost ? 6 : 0 });
        d.text(s.name, sx + 12 + shake, cy - (sh > 38 ? 7 : 0), { font: 'cond', size: 14, weight: 700, color: s.ghost ? C.red : s.on ? C.navy : C.faint });
        if (sh > 38) d.text(s.ghost ? 'leak · vẫn bị gọi' : s.on ? 'HandleDamaged(int)' : 'chưa đăng ký', sx + 12, cy + 11, { font: 'mono', size: 11, color: s.ghost ? C.red : C.muted });
        d.pill(s.on ? '+=' : '-=', sx + sw - 24, cy, { align: 'center', fill: s.on ? (s.ghost ? C.red : s.color) : C.faint, size: 11 });
        boxes.push({ s, x: sx, y, w: sw, h: sh });
      });
      // Pulses
      pulses.forEach((p) => {
        if (p.t < 0 || p.t > 1) return;
        const ty = p.s.y + sh / 2, k = U.ease.inOutQuad(p.t), x = U.lerp(ox, sx, k), y = U.lerp(oy, ty, k);
        d.circle(x, y, 10, { fill: 'rgba(226,169,59,0.3)' });
        d.circle(x, y, 6, { fill: p.s.ghost ? C.red : C.yellow, stroke: '#fff', lw: 2 });
        d.text(dmg, x, y - 15, { align: 'center', font: 'mono', size: 11, weight: 700, color: C.orange });
      });
      // Invocation list
      const ly = h - listH - 4;
      d.rect(pad, ly, w - pad * 2, listH, { fill: 'rgba(24,33,61,0.05)', stroke: C.lineSoft, r: 8 });
      let x = pad + 10;
      x += d.pill('OnDamaged:', x, ly + listH / 2, { fill: C.navy, size: 11 }) + 8;
      const l = list();
      if (!l.length) d.text('null', x, ly + listH / 2, { font: 'mono', size: 12, weight: 700, color: C.faint });
      l.forEach((s, i) => {
        const label = `${i + 1}. ${s.name.split(' (')[0].replace('EnemyAI ', 'Enemy')}`, wd = d.measure(label, { size: 11, font: 'mono' }) + 16;
        if (x + wd > w - pad - 6) { if (x < w - pad - 20) d.text('…', x, ly + listH / 2, { color: C.muted }); x = w; return; }
        x += d.pill(label, x, ly + listH / 2, { fill: s.ghost ? C.red : s.color, size: 11 }) + 6;
      });
    }
    render();
  },
});
