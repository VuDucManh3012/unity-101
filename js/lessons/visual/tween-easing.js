/* Lesson: Tween & easing (DOTween) — ease curve plot + objects driven by it, loops/yoyo and a Sequence timeline. */
U101.defineLesson('tween-easing', {
  lead: 'Tween là nội suy một giá trị từ A đến B trong một khoảng thời gian. Easing là hàm biến thời gian tuyến tính thành chuyển động có gia tốc, vượt đích hoặc nảy. DOTween làm việc này bằng một dòng code.',
  hint: 'Chọn Ease để xem đường cong và chuyển động thay đổi · bật So sánh Linear · thử Loops + Yoyo · bấm Play Sequence',
  overview: `
    <p>Animation trong UI và gameplay nhỏ (nút nảy, popup, coin bay vào ví) thường không cần Animator. Một <b>tween</b> là đủ: <code>transform.DOMoveX(5, 1f)</code>.</p>
    <ul>
      <li><b>Easing</b>: hàm f(t) với t từ 0→1. <code>Linear</code> đều đều và cứng. <code>OutQuad</code>/<code>OutCubic</code> nhanh rồi chậm dần, rất tự nhiên. <code>OutBack</code> vượt đích rồi quay lại. <code>OutElastic</code>/<code>OutBounce</code> rung và nảy.</li>
      <li><b>Loops</b>: <code>SetLoops(3, LoopType.Restart)</code> chạy lại từ đầu. <code>LoopType.Yoyo</code> chạy đi rồi chạy về. <code>-1</code> nghĩa là lặp vô hạn.</li>
      <li><b>Sequence</b>: ghép nhiều tween. <code>Append</code> nối tiếp, <code>Join</code> chạy song song với tween trước, <code>AppendInterval</code> chèn khoảng nghỉ.</li>
      <li><b>Vòng đời</b>: luôn <code>Kill()</code> tween hoặc dùng <code>SetLink(gameObject)</code>. Nếu không, tween vẫn chạy trên object đã bị destroy và gây lỗi.</li>
    </ul>
    <p>DOTween là plugin của Demigiant (có bản miễn phí trên Asset Store). Nếu không muốn thêm thư viện, bạn có thể tự viết tween bằng coroutine + <code>AnimationCurve.Evaluate(t)</code>.</p>
    <p class="callout">Nhìn đường cong: phần nào <b>dốc</b> thì vật chuyển động <b>nhanh</b>, phần nào <b>vượt quá 1</b> thì vật đi quá đích.</p>`,
  keyPoints: [
    'Easing biến tiến độ thời gian t thành giá trị f(t). Độ dốc của đường cong chính là vận tốc.',
    'Out-ease (OutQuad, OutBack) hợp với UI xuất hiện. In-ease hợp với vật rời đi.',
    'Sequence: Append nối tiếp, Join song song, AppendInterval để nghỉ.',
    'Kill tween hoặc SetLink khi object bị hủy để tránh lỗi MissingReference.',
  ],
  code: {
    title: 'CoinCollect.cs',
    source: `
using DG.Tweening;
using UnityEngine;

public class CoinCollect : MonoBehaviour
{
    [SerializeField] private RectTransform popup;
    [SerializeField] private Transform coin;
    [SerializeField] private float duration = 1.2f;

    void OnEnable()
    {
        popup.localScale = Vector3.zero;
        popup.DOScale(1f, 0.35f).SetEase(Ease.OutBack);   // bật ra, hơi vượt rồi về 1

        coin.DOMoveY(coin.position.y + 0.5f, duration)    // lơ lửng lên xuống
            .SetEase(Ease.InOutSine)
            .SetLoops(-1, LoopType.Yoyo)
            .SetLink(gameObject);                          // tự Kill khi object bị destroy
    }

    public void PlayCollect()
    {
        DOTween.Sequence()
            .Append(coin.DOMoveX(3f, 0.6f).SetEase(Ease.OutQuad))
            .Append(coin.DOScale(1.4f, 0.35f).SetEase(Ease.OutBack))
            .Join(coin.DORotate(new Vector3(0, 0, 180), 0.35f)) // song song với DOScale
            .AppendInterval(0.2f)
            .Append(coin.DOMoveX(0f, 0.6f).SetEase(Ease.InOutQuad))
            .Append(coin.DOScale(1f, 0.3f))
            .OnComplete(() => Debug.Log("Collect xong"));
    }
}`,
    note: 'Mọi hàm DOxxx trả về Tweener. Bạn nối tiếp SetEase, SetLoops, OnComplete theo kiểu fluent API.',
  },
  tryIt: [
    'Chuyển Linear → OutQuad → OutBack. Đối chiếu độ dốc đường cong với tốc độ của khối.',
    'Bật "So sánh Linear": khối nào tới đích trước ở nửa đầu thời gian?',
    'Chọn OutElastic: giá trị vượt quá 1 bao nhiêu lần trước khi dừng?',
    'Đặt Loops = 3 và LoopType = Yoyo rồi bấm Play. Khi nào OnComplete được gọi?',
    'Trong timeline Sequence, tìm đoạn Join chạy song song với DOScale.',
  ],
  links: [
    { label: 'DOTween documentation', url: 'https://dotween.demigiant.com/documentation.php' },
    { label: 'Easing functions cheat sheet', url: 'https://easings.net/' },
    { label: 'AnimationCurve API', url: 'https://docs.unity3d.com/ScriptReference/AnimationCurve.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const E = U.ease;
    const EASES = {
      Linear: [E.linear, 'đều đều, cảm giác máy móc'], InQuad: [E.inQuad, 'chậm rồi nhanh dần, hợp vật rời đi'],
      OutQuad: [E.outQuad, 'nhanh rồi chậm dần, tự nhiên nhất cho UI'], InOutQuad: [E.inOutQuad, 'chậm-nhanh-chậm, hợp camera/di chuyển'],
      OutCubic: [E.outCubic, 'như OutQuad nhưng phanh gắt hơn'], InOutSine: [(t) => -(Math.cos(Math.PI * t) - 1) / 2, 'rất êm, hợp lơ lửng lên xuống'],
      OutBack: [E.outBack, 'vượt đích rồi quay lại, hợp popup/nút'], OutElastic: [E.outElastic, 'rung như lò xo'], OutBounce: [E.outBounce, 'nảy như bóng rơi'],
    };
    const tw = { ease: 'OutBack', dur: 1.2, loops: -1, type: 'Yoyo', el: 0.45, playing: true, ghost: true };
    const SEQ = [
      { at: 0, dur: 0.6, row: 0, from: 0, to: 1, ease: E.outQuad, label: 'Append DOMoveX → B' },
      { at: 0.6, dur: 0.35, row: 1, from: 1, to: 1.4, ease: E.outBack, label: 'Append DOScale 1.4' },
      { at: 0.6, dur: 0.35, row: 2, from: 0, to: 180, ease: E.inOutQuad, label: 'Join DORotate 180°' },
      { at: 0.95, dur: 0.2, row: -1, label: 'Interval' },
      { at: 1.15, dur: 0.6, row: 0, from: 1, to: 0, ease: E.inOutQuad, label: 'Append DOMoveX → A' },
      { at: 1.75, dur: 0.3, row: 1, from: 1.4, to: 1, ease: E.outQuad, label: 'Append DOScale 1' },
    ];
    const SEQ_LEN = 2.05, ROWS = ['Move', 'Scale', 'Rotate'];
    const seq = { t: 0.3, playing: true, loop: true };

    function sample(el) {
      const total = tw.loops < 0 ? Infinity : tw.loops * tw.dur, e = Math.min(el, total - 1e-6);
      const loop = Math.floor(e / tw.dur), u = (e % tw.dur) / tw.dur, back = tw.type === 'Yoyo' && loop % 2 === 1;
      const t = back ? 1 - u : u;
      return { t, k: EASES[tw.ease][0](t), loop, back };
    }
    const seqVal = (row, base) => SEQ.reduce((v, s) => (s.row === row && seq.t >= s.at ? U.lerp(s.from, s.to, s.ease(U.clamp((seq.t - s.at) / s.dur, 0, 1))) : v), base);

    stage.ui.group('Tween');
    stage.ui.select('Ease', Object.keys(EASES), tw.ease, (v) => { tw.ease = v; stage.log(`SetEase(Ease.${v}): ${EASES[v][1]}`); });
    stage.ui.slider('Duration', { min: 0.2, max: 3, step: 0.1, value: tw.dur, unit: 's' }, (v) => (tw.dur = v));
    stage.ui.select('Loops', [{ value: '1', label: '1' }, { value: '3', label: '3' }, { value: '-1', label: '-1 (vô hạn)' }], '-1', (v) => (tw.loops = +v));
    stage.ui.select('LoopType', ['Yoyo', 'Restart'], tw.type, (v) => (tw.type = v));
    stage.ui.toggle('So sánh Linear', tw.ghost, (v) => (tw.ghost = v));
    stage.ui.button('Play', () => { tw.el = 0; tw.playing = true; stage.log(`DOMoveX(B, ${tw.dur}f).SetEase(Ease.${tw.ease}).SetLoops(${tw.loops}, LoopType.${tw.type})`); }, { variant: 'primary' });
    stage.ui.button('Kill', () => { if (tw.playing) stage.log('tween.Kill(): dừng ngay tại chỗ, không gọi OnComplete', 'warn'); tw.playing = false; }, { variant: 'danger' });
    stage.ui.group('Sequence');
    stage.ui.button('Play Sequence', () => { seq.t = 0; seq.playing = true; stage.log('DOTween.Sequence() bắt đầu'); }, { variant: 'accent' });
    stage.ui.toggle('Lặp Sequence', seq.loop, (v) => (seq.loop = v));
    stage.log('Tween đang chạy: Ease.OutBack, SetLoops(-1, Yoyo). Chọn Ease khác để so sánh.');

    stage.onFrame((dt) => {
      if (tw.playing) {
        tw.el += dt;
        if (tw.loops > 0 && tw.el >= tw.loops * tw.dur) { tw.playing = false; stage.log(`OnComplete() sau ${tw.loops} vòng (${(tw.loops * tw.dur).toFixed(1)}s)`); }
      }
      if (seq.playing) {
        seq.t += dt;
        if (seq.t >= SEQ_LEN) {
          if (seq.loop) seq.t = seq.t - SEQ_LEN - 0.6; else { seq.t = SEQ_LEN; seq.playing = false; stage.log('Sequence.OnComplete()'); }
        }
      }
      render();
    });

    function render() {
      const { w, h } = stage, wide = w >= 640, s = sample(tw.el), ease = EASES[tw.ease][0], ctx = d.ctx;
      d.clear(w, h); d.grid(w, h);
      const cv = wide ? { x: 16, y: 16, w: w * 0.4 - 8, h: h * 0.6 - 16 } : { x: 12, y: 12, w: w - 24, h: h * 0.34 - 12 };
      const mo = wide ? { x: w * 0.4 + 16, y: 16, w: w * 0.6 - 32, h: h * 0.6 - 16 } : { x: 12, y: h * 0.34 + 10, w: w - 24, h: h * 0.27 - 10 };
      const sq = wide ? { x: 16, y: h * 0.6 + 14, w: w - 32, h: h * 0.4 - 30 } : { x: 12, y: h * 0.61 + 10, w: w - 24, h: h * 0.39 - 22 };
      // Curve plot
      d.node(cv.x, cv.y, cv.w, cv.h, null, { fill: C.paper, accent: C.lineSoft, shadow: 4 });
      d.text(`Ease.${tw.ease}`, cv.x + 12, cv.y + 16, { font: 'mono', size: 12, weight: 700, color: C.navy });
      d.text(`loop ${s.loop + 1}${s.back ? ' ←' : ' →'}`, cv.x + cv.w - 12, cv.y + 16, { align: 'right', font: 'mono', size: 11, color: C.muted });
      const pl = { x: cv.x + 30, y: cv.y + 32, w: cv.w - 46, h: cv.h - 52 };
      const PX = (t) => pl.x + t * pl.w, PY = (v) => pl.y + pl.h - ((v + 0.25) / 1.6) * pl.h;
      [0, 1].forEach((v) => { d.line(pl.x, PY(v), pl.x + pl.w, PY(v), { stroke: C.line, lw: 1, dash: [4, 4] }); d.text(v, pl.x - 8, PY(v), { align: 'right', font: 'mono', size: 11, color: C.muted }); });
      d.line(pl.x, pl.y, pl.x, pl.y + pl.h, { stroke: C.line, lw: 1 });
      d.text('t →', pl.x + pl.w, pl.y + pl.h + 10, { align: 'right', font: 'mono', size: 11, color: C.muted });
      const pts = (f) => Array.from({ length: 81 }, (_, i) => [PX(i / 80), PY(f(i / 80))]);
      if (tw.ghost) d.poly(pts(E.linear), { stroke: C.faint, lw: 1.5, dash: [5, 4] });
      d.poly(pts(ease), { stroke: C.teal, lw: 3 });
      const dx = PX(s.t), dy = PY(s.k);
      d.line(dx, pl.y + pl.h, dx, dy, { stroke: C.orange, lw: 1, dash: [3, 3] }); d.line(pl.x, dy, dx, dy, { stroke: C.orange, lw: 1, dash: [3, 3] });
      d.circle(dx, dy, 6, { fill: C.orange, stroke: '#fff', lw: 2 });
      d.text(`t=${s.t.toFixed(2)}  f(t)=${s.k.toFixed(2)}`, pl.x + 6, pl.y + 8, { font: 'mono', size: 11, color: C.orange, weight: 600 });
      // Motion panel
      d.node(mo.x, mo.y, mo.w, mo.h, null, { fill: C.paper, accent: C.lineSoft, shadow: 4 });
      const two = mo.h >= 130, r1 = mo.y + mo.h * (two ? 0.3 : 0.55), r2 = mo.y + mo.h * 0.74, ax = mo.x + 36, bx = ax + (mo.w - 84) / 1.3, box = U.clamp(mo.h * 0.17, 16, 36);
      d.text(`DOMoveX(B, ${tw.dur.toFixed(1)}f)`, mo.x + 12, mo.y + 16, { font: 'mono', size: 11, weight: 600, color: C.navy });
      d.line(ax, r1, bx, r1, { stroke: C.line, lw: 2 });
      [['A', ax], ['B', bx]].forEach(([n, x]) => { d.line(x, r1 - box * 0.9, x, r1 + box * 0.9, { stroke: C.navy, lw: 2 }); d.text(n, x, r1 + box * 0.9 + 10, { align: 'center', font: 'mono', size: 11, weight: 700, color: C.navy }); });
      if (tw.ghost) d.rect(U.lerp(ax, bx, s.t) - box / 2, r1 - box / 2, box, box, { stroke: C.faint, lw: 2, dash: [4, 3], r: 6 });
      d.rect(U.lerp(ax, bx, s.k) - box / 2, r1 - box / 2, box, box, { fill: C.teal, stroke: C.tealDeep, lw: 2, r: 6, shadow: 6 });
      if (two) {
      d.text('DOScale(1f)', mo.x + 12, mo.y + mo.h * 0.52, { font: 'mono', size: 11, weight: 600, color: C.navy });
      d.text('DORotate(0,0,180)', mo.x + mo.w / 2 + 12, mo.y + mo.h * 0.52, { font: 'mono', size: 11, weight: 600, color: C.navy });
      const sc = U.lerp(0.3, 1, s.k), sz = box * 1.3;
      d.circle(mo.x + mo.w * 0.25, r2, sz / 2, { stroke: C.line, lw: 1.5, dash: [4, 3] });
      d.circle(mo.x + mo.w * 0.25, r2, Math.max(0, sz / 2 * sc), { fill: C.orange, stroke: '#fff', lw: 2, shadow: 6 });
      ctx.save(); ctx.translate(mo.x + mo.w * 0.75, r2); ctx.rotate(Math.PI * s.k);
      d.rect(-sz / 2, -sz / 2, sz, sz, { fill: C.purple, r: 6, shadow: 6 }); d.rect(-3, -sz / 2 + 4, 6, sz * 0.35, { fill: '#fff', r: 3 });
      ctx.restore();
      }
      // Sequence timeline
      d.node(sq.x, sq.y, sq.w, sq.h, null, { fill: C.paper, accent: C.lineSoft, shadow: 4 });
      d.text('DOTween.Sequence()', sq.x + 12, sq.y + 15, { font: 'mono', size: 11, weight: 700, color: C.navy });
      const st = Math.max(0, seq.t), compact = sq.h < 150, trackY = sq.y + (compact ? 36 : 44), lx = sq.x + 64, tl = { x: lx, w: sq.w - 80 };
      const sx0 = lx + 14, sx1 = sq.x + sq.w - 30, sv = seqVal(0, 0), sS = seqVal(1, 1), sR = seqVal(2, 0);
      d.line(sx0, trackY, sx1, trackY, { stroke: C.line, lw: 2, dash: [5, 4] });
      ctx.save(); ctx.translate(U.lerp(sx0, sx1, sv), trackY); ctx.rotate(sR * Math.PI / 180); ctx.scale(sS, sS);
      d.circle(0, 0, 13, { fill: C.yellow, stroke: C.orange, lw: 2.5 }); d.text('$', 0, 1, { align: 'center', font: 'cond', weight: 700, size: 14, color: C.navy });
      ctx.restore();
      const rowsTop = sq.y + (compact ? 60 : 74), rh = Math.max(16, Math.min(24, (sq.y + sq.h - rowsTop - 8) / 3)), X = (t) => tl.x + (t / SEQ_LEN) * tl.w;
      ROWS.forEach((n, i) => d.text(n, sq.x + 12, rowsTop + i * rh + rh / 2, { font: 'mono', size: 11, color: C.muted }));
      SEQ.forEach((sg) => {
        const x = X(sg.at), bw = X(sg.at + sg.dur) - x, on = st >= sg.at && st <= sg.at + sg.dur;
        if (sg.row < 0) { d.rect(x + 1, rowsTop, bw - 2, rh * 3 - 2, { fill: 'rgba(206,192,173,0.25)', stroke: C.line, lw: 1, dash: [3, 3], r: 4 }); return; }
        const col = [C.teal, C.orange, C.purple][sg.row];
        d.rect(x + 1, rowsTop + sg.row * rh + 2, bw - 2, rh - 4, { fill: on ? col : col + '55', r: 4 });
        const lb = [sg.label, sg.label.replace(/^(Append|Join) /, '')].find((t) => d.measure(t, { font: 'mono', size: 11 }) < bw - 10);
        if (lb) d.text(lb, x + 6, rowsTop + sg.row * rh + rh / 2, { font: 'mono', size: 11, color: on ? '#fff' : C.navy });
      });
      const hx = X(Math.min(st, SEQ_LEN));
      d.line(hx, rowsTop - 6, hx, rowsTop + rh * 3, { stroke: C.red, lw: 2 });
      d.text(`${Math.min(st, SEQ_LEN).toFixed(2)}s`, hx, rowsTop - 12, { align: 'center', font: 'mono', size: 11, color: C.red, weight: 600 });
    }
  },
});
