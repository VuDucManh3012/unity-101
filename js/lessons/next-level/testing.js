/* Lesson: Unit test & Test Framework — Test Runner tree (EditMode/PlayMode), bug injection, performance benchmark bars. */
U101.defineLesson('testing', {
  lead: 'Unity Test Framework chạy test NUnit ngay trong Editor: EditMode test kiểm tra logic thuần (nhanh, không cần Play), PlayMode test chạy qua nhiều frame với GameObject thật. Sửa code xong, bấm Run All là biết ngay có làm hỏng gì không.',
  hint: 'Chọn một bug rồi bấm Run All · bấm vào dòng test đỏ để đọc assertion · bật regression rồi chạy Benchmark',
  overview: `
    <p>Test tự động là đoạn code kiểm tra code khác. Viết một lần, chạy lại hàng trăm lần mỗi khi sửa game, kể cả trên CI.</p>
    <ul>
      <li><b>Unit test</b>: kiểm tra một đơn vị nhỏ (class <code>Health</code>, <code>Inventory</code>) cô lập với phần còn lại. Logic để trong class C# thuần thì test dễ hơn nhiều so với nhét hết vào MonoBehaviour.</li>
      <li><b>EditMode</b> (<code>[Test]</code>): chạy trong Editor, không vào Play Mode, mất vài mili giây. <b>PlayMode</b> (<code>[UnityTest]</code> trả về <code>IEnumerator</code>): có frame, physics, coroutine, dùng <code>yield return</code> để chờ.</li>
      <li>Mỗi test theo mẫu <b>Arrange → Act → Assert</b>. Assertion fail sẽ in rõ <code>Expected</code> và <code>But was</code>.</li>
      <li><b>Benchmark</b>: package <b>Performance Testing</b> (<code>[Performance]</code>, <code>Measure.Method</code>) đo thời gian nhiều lần, so với baseline để bắt regression về hiệu năng.</li>
      <li><b>Auto test</b> (AltTester, Airtest/Poco) điều khiển build thật như người chơi. <b>Load testing</b> dồn hàng nghìn client giả vào server multiplayer/backend. <b>Crash reporting</b> (Sentry, Firebase Crashlytics) thu thập exception và crash từ máy người chơi sau khi phát hành.</li>
    </ul>
    <p class="callout">Test chỉ có giá trị khi chạy thường xuyên. Hãy cho CI chạy <code>Unity -batchmode -runTests -testPlatform EditMode</code> mỗi lần push, và chặn merge khi có test đỏ.</p>`,
  keyPoints: [
    'EditMode [Test] cho logic thuần: nhanh. PlayMode [UnityTest] cho hành vi qua nhiều frame.',
    'Arrange → Act → Assert; tên test mô tả hành vi: TakeDamage_ClampsAtZero.',
    'Tách logic khỏi MonoBehaviour để dễ test.',
    'Performance Testing đo và so baseline; Sentry/Crashlytics bắt lỗi sau khi phát hành.',
  ],
  code: [
    {
      title: 'Tests/EditMode/HealthTests.cs',
      source: `
using NUnit.Framework;

public class HealthTests
{
    private Health health;

    [SetUp] public void SetUp() => health = new Health(max: 100); // Arrange chung

    [TestCase(30, 70)]
    [TestCase(100, 0)]
    public void TakeDamage_ReducesHp(int dmg, int expected)
    {
        health.TakeDamage(dmg);                         // Act
        Assert.AreEqual(expected, health.Current);      // Assert
    }

    [Test]
    public void TakeDamage_ClampsAtZero()
    {
        health.TakeDamage(120);
        Assert.AreEqual(0, health.Current);             // fail: Expected 0 But was -20
    }

    [Test]
    public void Die_RaisesOnDeathOnce()
    {
        int deaths = 0;
        health.OnDeath += () => deaths++;
        health.TakeDamage(100);
        health.TakeDamage(10);
        Assert.That(deaths, Is.EqualTo(1));
    }
}`,
      note: 'Health là class C# thuần, không kế thừa MonoBehaviour, nên test chạy trong vài mili giây. Thư mục test cần một .asmdef tham chiếu nunit và assembly của game.',
    },
    {
      title: 'Tests/PlayMode/HealthRegenTests.cs',
      source: `
using System.Collections;
using NUnit.Framework;
using Unity.PerformanceTesting;
using UnityEngine;
using UnityEngine.TestTools;

public class HealthRegenTests
{
    [UnityTest]
    public IEnumerator Regen_RestoresOverTime()
    {
        var go = new GameObject("Player");
        var regen = go.AddComponent<HealthRegen>();     // hồi 20 HP mỗi giây
        regen.Health.TakeDamage(80);                    // còn 20 HP

        yield return new WaitForSeconds(2f);            // chờ frame thật trôi qua

        int hp = regen.Health.Current;
        Object.Destroy(go);
        Assert.That(hp, Is.EqualTo(60).Within(2));      // phải nhân Time.deltaTime!
    }

    [Test, Performance]
    public void Inventory_Find_Benchmark()
    {
        var inv = Inventory.CreateWith(1000);
        Measure.Method(() => inv.Find("sword_999"))
            .WarmupCount(5).MeasurementCount(20).IterationsPerMeasurement(100)
            .Run();                                     // median, min, max trong Test Report
    }
}`,
      note: '[UnityTest] chạy như coroutine. Nếu regen cộng HP theo frame (không nhân deltaTime), kết quả phụ thuộc FPS và test sẽ đỏ.',
    },
  ],
  tryIt: [
    'Bấm Run All với "Không có bug": để ý PlayMode test chạy chậm hơn EditMode bao nhiêu.',
    'Chọn bug "Health không clamp về 0" rồi Run All. Những test nào đỏ? Bấm vào để đọc Expected / But was.',
    'Chọn bug regen theo frame: vì sao chỉ PlayMode test bắt được lỗi này?',
    'Bật "Inventory dùng List" rồi chạy Benchmark: thời gian Find tăng bao nhiêu % so với baseline?',
    'Nghĩ xem: lỗi nào ở đây unit test không bắt được mà cần auto test trên build thật hoặc Sentry?',
  ],
  links: [
    { label: 'Unity Test Framework', url: 'https://docs.unity3d.com/Packages/com.unity.test-framework@latest' },
    { label: 'Performance Testing package', url: 'https://docs.unity3d.com/Packages/com.unity.test-framework.performance@latest' },
    { label: 'NUnit assertions', url: 'https://docs.nunit.org/articles/nunit/writing-tests/assertions/assertion-models/constraint.html' },
    { label: 'Sentry for Unity', url: 'https://docs.sentry.io/platforms/unity/' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const T = (mode, cls, name, bug, msg) => ({ mode, cls, name, bug, msg, status: 'idle', ms: 0 });
    const tests = [
      T('EditMode', 'HealthTests', 'TakeDamage_ReducesHp(30,70)'),
      T('EditMode', 'HealthTests', 'TakeDamage_ClampsAtZero', 'clamp', 'Expected: 0\nBut was:  -20'),
      T('EditMode', 'HealthTests', 'Die_RaisesOnDeathOnce', 'clamp', 'Expected: 1\nBut was:  2\n(hp âm, OnDeath bị gọi lại)'),
      T('EditMode', 'HealthTests', 'Heal_DoesNotExceedMax'),
      T('EditMode', 'InventoryTests', 'Add_StacksSameItem'),
      T('EditMode', 'InventoryTests', 'Add_RespectsStackLimit', 'stack', 'Expected: 99\nBut was:  120\n(Add bỏ qua maxStack)'),
      T('EditMode', 'InventoryTests', 'Remove_Missing_ReturnsFalse'),
      T('PlayMode', 'HealthRegenTests', 'Regen_RestoresOverTime', 'regen', 'Expected: 60 ± 2\nBut was:  100\n(regen theo frame, quên Time.deltaTime)'),
      T('PlayMode', 'PlayerSpawnTests', 'Spawn_HasFullHealth'),
      T('PlayMode', 'PickupTests', 'Pickup_AddsToInventory'),
    ];
    const BENCH = [
      { name: 'Inventory.Find (1000 item)', base: 0.02, reg: 0.45 },
      { name: 'Health.TakeDamage ×10k', base: 0.3 },
      { name: 'Inventory.Add ×1k', base: 0.12 },
    ];
    let bug = 'none', running = -1, runT = 0, selected = 1, useList = false, benchT = 1, rowsHit = [];

    const result = () => ({ pass: tests.filter((t) => t.status === 'pass').length, fail: tests.filter((t) => t.status === 'fail').length, time: tests.reduce((a, t) => a + t.ms, 0) });
    function runAll() {
      tests.forEach((t) => { t.status = 'idle'; t.ms = 0; });
      running = 0; runT = 0; stage.log(`Run All: ${tests.length} test (bug: ${bug})`);
    }
    function finishTest(t) {
      const fail = t.bug && t.bug === bug;
      t.status = fail ? 'fail' : 'pass'; t.ms = Math.round(t.mode === 'PlayMode' ? U.rand(1900, 2100) : U.rand(1, 6));
      if (fail) { selected = tests.indexOf(t); stage.log(`✗ ${t.cls}.${t.name}: ${t.msg.split('\n').join(' ')}`, 'error'); }
    }

    stage.ui.group('Test Runner');
    stage.ui.select('Inject bug', [
      { value: 'none', label: 'Không có bug' }, { value: 'clamp', label: 'Health không clamp về 0' },
      { value: 'stack', label: 'Inventory bỏ qua stack limit' }, { value: 'regen', label: 'Regen theo frame (PlayMode)' },
    ], bug, (v) => { bug = v; stage.log(v === 'none' ? 'Đã sửa code: bấm Run All để kiểm tra lại' : 'Code vừa bị sửa sai. Bấm Run All xem test nào bắt được.', v === 'none' ? 'info' : 'warn'); });
    stage.ui.button('Run All', runAll, { variant: 'primary' });
    stage.ui.group('Performance Testing');
    stage.ui.toggle('Inventory dùng List (regression)', useList, (v) => { useList = v; });
    stage.ui.button('Chạy Benchmark', () => {
      benchT = 0; const v = useList ? BENCH[0].reg : BENCH[0].base;
      stage.log(`Measure.Method: Inventory.Find median ${v} ms (baseline ${BENCH[0].base} ms)`, useList ? 'warn' : 'info');
      if (useList) stage.log('Regression: List.Find là O(n), Dictionary là O(1). Báo đỏ vì vượt ngưỡng 10%.', 'error');
    });
    const summary = stage.ui.readout('Kết quả', '—');
    tests.forEach((t) => finishTest(t)); summary.set(`✓ ${tests.length}  ✗ 0`); selected = 1;
    stage.log('Lần chạy trước: tất cả test pass. Chọn một bug rồi bấm Run All.');

    stage.onPointer('down', (x, y) => { const hit = rowsHit.find((r) => y >= r.y && y < r.y + r.h && x >= r.x && x < r.x + r.w); if (hit) selected = hit.i; });

    stage.onFrame((dt) => {
      if (running >= 0) {
        runT += dt; const t = tests[running];
        t.status = 'run';
        if (runT >= (t.mode === 'PlayMode' ? 0.7 : 0.16)) {
          finishTest(t); runT = 0; running++;
          if (running >= tests.length) {
            running = -1; const r = result();
            stage.log(`Xong: ${r.pass} pass, ${r.fail} fail · ${(r.time / 1000).toFixed(2)}s`, r.fail ? 'error' : 'info');
          }
        }
        const r = result(); summary.set(`✓ ${r.pass}  ✗ ${r.fail}`);
      }
      benchT = Math.min(1, benchT + dt * 0.8);
      render(stage.time || 0);
    });

    function icon(x, y, s, time) {
      if (s === 'pass') { d.circle(x, y, 7, { fill: C.green }); d.poly([[x - 3.5, y], [x - 1, y + 3], [x + 4, y - 3]], { stroke: '#fff', lw: 2 }); }
      else if (s === 'fail') { d.circle(x, y, 7, { fill: C.red }); d.line(x - 3, y - 3, x + 3, y + 3, { stroke: '#fff', lw: 2 }); d.line(x + 3, y - 3, x - 3, y + 3, { stroke: '#fff', lw: 2 }); }
      else if (s === 'run') { d.circle(x, y, 7, { stroke: C.lineSoft, lw: 2 }); const a = time * 8; d.circle(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 2.5, { fill: C.teal }); }
      else d.circle(x, y, 6, { stroke: C.line, lw: 1.5 });
    }
    function render(time) {
      const { w, h } = stage, wide = w >= 700, g = 12;
      d.clear(w, h); d.grid(w, h);
      const tw = wide ? w * 0.56 : w - g * 2, th = wide ? h - g * 2 : h - g * 3 - 110;
      drawTree(g, g, tw, th, time);
      const rx = wide ? g * 2 + tw : g, ry = wide ? g : g * 2 + th, rw = wide ? w - tw - g * 3 : w - g * 2, rh = wide ? h - g * 2 : h - th - g * 3;
      if (!wide) { const hw = (rw - g) / 2; drawDetail(rx, ry, hw, rh); drawBench(rx + hw + g, ry, hw, rh); return; }
      const dh = rh * 0.42;
      drawDetail(rx, ry, rw, dh); drawBench(rx, ry + dh + g, rw, rh - dh - g);
    }
    function drawTree(x, y, w, h, time) {
      d.node(x, y, w, h, null, { accent: C.navy, shadow: 6 });
      d.text('Test Runner', x + 12, y + 17, { font: 'cond', weight: 700, size: 15, color: C.navy });
      const r = result();
      if (w > 320) d.text(`✓ ${r.pass}   ✗ ${r.fail}   ${(r.time / 1000).toFixed(2)}s`, x + w - 12, y + 17, { align: 'right', font: 'mono', size: 11, weight: 600, color: r.fail ? C.red : C.green });
      const rowH = U.clamp((h - 40) / (tests.length + 2), 13, 28), fs = rowH < 18 ? 11 : 12;
      let yy = y + 34; rowsHit = [];
      ['EditMode', 'PlayMode'].forEach((mode) => {
        const active = running >= 0 && tests[running].mode === mode;
        d.text(`▾ ${mode}`, x + 12, yy + rowH / 2, { font: 'mono', size: fs, weight: 700, color: active ? C.teal : C.navy });
        d.text(mode === 'EditMode' ? '[Test]' : '[UnityTest]', x + w - 12, yy + rowH / 2, { align: 'right', font: 'mono', size: 11, color: C.muted });
        yy += rowH;
        tests.forEach((t, i) => {
          if (t.mode !== mode) return;
          if (i === selected) d.rect(x + 6, yy + 1, w - 12, rowH - 2, { fill: t.status === 'fail' ? 'rgba(214,90,74,0.12)' : 'rgba(26,163,161,0.12)', r: 5 });
          icon(x + 30, yy + rowH / 2, t.status, time);
          const label = w > 420 ? `${t.cls}.${t.name}` : t.name;
          d.text(label, x + 44, yy + rowH / 2, { font: 'mono', size: fs, color: t.status === 'fail' ? C.red : t.status === 'idle' ? C.faint : C.ink });
          if (t.ms && w > 360) d.text(`${t.ms} ms`, x + w - 12, yy + rowH / 2, { align: 'right', font: 'mono', size: 11, color: C.muted });
          rowsHit.push({ x, y: yy, w, h: rowH, i }); yy += rowH;
        });
      });
    }
    function drawDetail(x, y, w, h) {
      const t = tests[selected];
      d.node(x, y, w, h, null, { accent: t.status === 'fail' ? C.red : C.lineSoft, shadow: 4 });
      d.text(t.name, x + 12, y + 17, { font: 'mono', size: 12, weight: 700, color: t.status === 'fail' ? C.red : C.navy });
      d.text(`${t.cls} · ${t.mode}`, x + 12, y + 35, { font: 'mono', size: 11, color: C.muted });
      const lines = t.status === 'fail' ? [...t.msg.split('\n'), `at ${t.cls}.${t.name.replace(/\(.*/, '')} ()`, `   in ${t.cls}.cs`] : t.status === 'pass' ? ['Passed', `Duration ${t.ms} ms`] : t.status === 'run' ? ['Đang chạy…'] : ['Chưa chạy'];
      lines.forEach((ln, i) => { if (56 + i * 17 < h - 4) d.text(ln, x + 12, y + 56 + i * 17, { font: 'mono', size: 12, weight: i < 2 ? 600 : 500, color: t.status === 'fail' ? (i < 2 ? C.red : C.ink) : t.status === 'pass' ? C.green : C.muted }); });
    }
    function drawBench(x, y, w, h) {
      d.node(x, y, w, h, null, { accent: C.lineSoft, shadow: 4 });
      d.text('Benchmark · median (ms)', x + 12, y + 17, { font: 'cond', weight: 700, size: 14, color: C.navy });
      const top = y + 34, rowH = Math.min(46, (h - 44) / BENCH.length), bw = w - 90;
      const vals = BENCH.map((b, i) => (i === 0 && useList ? b.reg : b.base)), max = Math.max(...vals, 0.5);
      BENCH.forEach((b, i) => {
        const ry = top + i * rowH, v = vals[i], e = U.ease.outCubic(benchT), regress = v > b.base * 1.1;
        d.text(b.name, x + 12, ry + 7, { font: 'mono', size: 11, color: C.ink });
        const by = ry + 15, bh = U.clamp(rowH - 22, 5, 18);
        d.rect(x + 12, by, bw, bh, { fill: C.bgDeep, r: 4 });
        d.rect(x + 12, by, Math.max(3, (bw * v * e) / max), bh, { fill: regress ? C.red : C.teal, r: 4 });
        const bx = x + 12 + (bw * b.base) / max;
        d.line(bx, by - 3, bx, by + bh + 3, { stroke: C.navy, lw: 1.5, dash: [3, 2] });
        d.text(regress ? `+${Math.round((v / b.base - 1) * 100)}%` : `${v.toFixed(2)}`, x + w - 12, by + bh / 2, { align: 'right', font: 'mono', size: 11, weight: 600, color: regress ? C.red : C.muted });
      });
    }
  },
});
