/* Lesson: MVC / MVP / MVVM & Dependency Injection — animated message flow between Model, View and the middle layer. */
U101.defineLesson('mv-patterns-di', {
  lead: 'MVC, MVP và MVVM đều tách dữ liệu (Model) khỏi giao diện (View). Chúng khác nhau ở lớp giữa và ở chỗ ai được biết ai. Dependency Injection (DI) đưa phụ thuộc từ bên ngoài vào thay vì để class tự new, nên rất dễ thay bằng Mock khi test.',
  hint: 'Bấm "Mua item" (trên Scene hoặc Inspector) · đổi pattern · tắt DI rồi thử chọn MockShopService',
  overview: `
    <p>Khi UI và logic dính chặt vào một MonoBehaviour, sửa một nút cũng có thể làm hỏng logic mua hàng. Các pattern <b>MV*</b> chia code thành 3 vai trò:</p>
    <ul>
      <li><b>MVC</b>: View chuyển input cho <b>Controller</b>, Controller sửa Model, View tự quan sát Model để vẽ lại. View vẫn biết Model.</li>
      <li><b>MVP</b>: View "thụ động" (passive view). <b>Presenter</b> nhận event từ View, sửa Model, rồi gọi <code>view.SetGold()</code>. View không biết Model, nên dễ thay UI.</li>
      <li><b>MVVM</b>: <b>ViewModel</b> phơi ra state dạng reactive (<code>ReactiveProperty</code> của UniRx/R3). View <b>bind</b> vào đó, giá trị đổi là UI tự cập nhật, không ai phải gọi <code>SetGold</code>.</li>
    </ul>
    <p><b>Dependency Injection</b>: Presenter cần <code>IShopService</code> nhưng không tự <code>new ShopService()</code> hay <code>FindObjectOfType</code>. Một container (<b>Zenject/Extenject</b>, <b>VContainer</b>) tạo object và truyền vào qua constructor. Muốn test thì đăng ký <code>MockShopService</code>, không phải sửa Presenter.</p>
    <p class="callout">Hãy để ý trên mô phỏng: số gold trong <b>Model</b> đổi trước, còn <b>View</b> chỉ đổi khi thông điệp tới nơi. Đó chính là luồng dữ liệu một chiều của từng pattern.</p>`,
  keyPoints: [
    'Model không biết gì về UI. View chỉ hiển thị và bắn event. Logic nằm ở Controller/Presenter/ViewModel.',
    'MVP: Presenter gọi View qua interface. MVVM: View bind vào ReactiveProperty, cập nhật tự động.',
    'DI: phụ thuộc đi vào qua constructor/[Inject], code chỉ thấy interface, nên thay Mock được khi test.',
    'Tránh new hoặc FindObjectOfType rải rác: phụ thuộc bị ẩn, khó test, phụ thuộc thứ tự load scene.',
  ],
  code: [
    {
      title: 'ShopPresenter.cs (MVP + VContainer)',
      source: `
public interface IShopService { bool TryPurchase(int price); }

public class ShopPresenter : IStartable, System.IDisposable
{
    readonly IShopService shop;   // được inject, không tự new
    readonly PlayerModel model;
    readonly IShopView view;

    public ShopPresenter(IShopService shop, PlayerModel model, IShopView view)
    { this.shop = shop; this.model = model; this.view = view; }

    public void Start()
    {
        view.BuyClicked += OnBuy;
        model.GoldChanged += view.SetGold;   // Model -> Presenter -> View
        view.SetGold(model.Gold);
    }

    void OnBuy()
    {
        if (shop.TryPurchase(50)) { model.Spend(50); model.AddItem(); }
        else view.ShowError("Không đủ gold");
    }

    public void Dispose() { view.BuyClicked -= OnBuy; model.GoldChanged -= view.SetGold; }
}

// GameLifetimeScope.cs: nơi DUY NHẤT quyết định dùng class cụ thể nào
protected override void Configure(IContainerBuilder builder)
{
    builder.Register<IShopService, ShopService>(Lifetime.Singleton);
    builder.Register<PlayerModel>(Lifetime.Singleton);
    builder.RegisterComponentInHierarchy<ShopView>().As<IShopView>();
    builder.RegisterEntryPoint<ShopPresenter>();
}`,
      note: 'Presenter chỉ biết interface. Đổi ShopService sang bản khác chỉ cần sửa 1 dòng trong LifetimeScope.',
    },
    {
      title: 'ShopViewModel.cs (MVVM + UniRx)',
      source: `
using UniRx;
using UnityEngine;
using UnityEngine.UI;

public class ShopViewModel
{
    public readonly ReactiveProperty<int> Gold = new ReactiveProperty<int>(120);
    public readonly ReactiveCommand BuyCommand;

    public ShopViewModel(IShopService shop)
    {
        // nút chỉ bấm được khi đủ tiền, tự động theo Gold
        BuyCommand = Gold.Select(g => g >= 50).ToReactiveCommand();
        BuyCommand.Subscribe(_ => { if (shop.TryPurchase(50)) Gold.Value -= 50; });
    }
}

public class ShopView : MonoBehaviour
{
    [SerializeField] private Text goldText;
    [SerializeField] private Button buyButton;

    public void Bind(ShopViewModel vm)
    {
        vm.Gold.SubscribeToText(goldText).AddTo(this);   // binding: đổi là UI tự cập nhật
        vm.BuyCommand.BindTo(buyButton).AddTo(this);
    }
}

// Test EditMode: inject Mock bằng tay, không cần scene hay server
class MockShopService : IShopService { public bool TryPurchase(int p) => true; }

[Test] public void Buy_SpendsGold()
{
    var vm = new ShopViewModel(new MockShopService());
    vm.BuyCommand.Execute();
    Assert.AreEqual(70, vm.Gold.Value);
}`,
      note: 'Nhờ DI, ViewModel test được mà không cần MonoBehaviour. UniRx đã ngừng phát triển, R3 là bản kế nhiệm với API tương tự.',
    },
  ],
  tryIt: [
    'Ở MVP, bấm "Mua item": theo dõi 5 bước View → Presenter → Service → Model → Presenter → View.',
    'Chuyển sang MVC: Model báo thẳng cho View. View biết Model, khác MVP ở điểm nào?',
    'Chuyển sang MVVM rồi bấm "+100 gold (server)": chỉ có ReactiveProperty đổi, binding tự đẩy lên View.',
    'Mua liên tục tới khi hết gold để thấy nhánh ShowError.',
    'Tắt DI rồi chọn MockShopService: vì sao không thay được? Bật DI lại và thử lần nữa.',
  ],
  links: [
    { label: 'VContainer: Getting started', url: 'https://vcontainer.hadashikick.jp/getting-started/hello-world' },
    { label: 'Extenject (Zenject)', url: 'https://github.com/Mathijs-Bakker/Extenject' },
    { label: 'R3 (kế nhiệm UniRx)', url: 'https://github.com/Cysharp/R3' },
    { label: 'Unity e-book: Design patterns (MVP/MVVM)', url: 'https://unity.com/resources/design-patterns-solid-ebook' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const PRICE = 50, MID = { mvc: 'Controller', mvp: 'Presenter', mvvm: 'ViewModel' };
    let mode = 'mvp', di = true, mock = false, speed = 1, B = {}, btn = null;
    const model = { gold: 120, items: 0 }, view = { gold: 120, items: 0, msg: '' };
    let rp = 120, queue = [], cur = null;
    const flash = {};
    const name = (k) => ({ view: 'View', mid: MID[mode], model: 'Model', svc: mock ? 'MockShopService' : 'ShopService' }[k]);
    const step = (a, b, label, fn, color) => ({ a, b, label, fn, color: color || C.blue, t: 0 });
    const syncView = () => { view.gold = mode === 'mvvm' ? rp : model.gold; view.items = model.items; view.msg = ''; };

    function notify() { // Model changed -> how does the View find out?
      if (mode === 'mvc') return [step('model', 'view', 'OnChanged → View đọc Model', syncView, C.green)];
      if (mode === 'mvp') return [step('model', 'mid', 'GoldChanged', null, C.green), step('mid', 'view', `view.SetGold(${model.gold})`, syncView, C.orange)];
      return [step('model', 'mid', `Gold.Value = ${model.gold}`, () => (rp = model.gold), C.teal), step('mid', 'view', 'binding tự cập nhật', syncView, C.teal)];
    }
    function buy() {
      if (queue.length || cur) return stage.log('Đang xử lý thông điệp trước...', 'warn');
      queue.push(
        step('view', 'mid', mode === 'mvvm' ? 'BuyCommand.Execute()' : 'OnBuyClicked()', null, C.purple),
        step('mid', 'svc', `TryPurchase(${PRICE})`),
        step('svc', 'mid', '...', null),
      );
      const reply = queue[2];
      reply.fn = () => {
        const ok = mock || model.gold >= PRICE;
        if (mock) stage.log('MockShopService: luôn trả true, không gọi server (dùng cho test)', 'info');
        if (!ok) return queue.unshift(step('mid', 'view', 'ShowError("Không đủ gold")', () => (view.msg = 'Không đủ gold!'), C.red));
        queue.unshift(step('mid', 'model', 'Spend(50) · AddItem()', () => { model.gold = Math.max(0, model.gold - PRICE); model.items++; }, C.purple), { lazy: true });
      };
      reply.label = mock || model.gold >= PRICE ? 'true' : 'false';
    }
    function reward() {
      if (queue.length || cur) return stage.log('Đang xử lý thông điệp trước...', 'warn');
      queue.push(step('svc', 'model', 'Reward +100 (server)', () => (model.gold += 100), C.yellow));
      queue.push({ lazy: true });
    }

    stage.ui.group('Pattern');
    stage.ui.select('Kiến trúc', [{ value: 'mvc', label: 'MVC' }, { value: 'mvp', label: 'MVP' }, { value: 'mvvm', label: 'MVVM (reactive)' }], mode, (v) => { mode = v; queue = []; cur = null; rp = model.gold; syncView(); stage.log(`Chuyển sang ${v.toUpperCase()}: lớp giữa là ${MID[v]}`); });
    stage.ui.button('Mua item (50)', buy, { variant: 'primary' });
    stage.ui.button('+100 gold (server)', reward, { variant: 'accent' });
    stage.ui.slider('Tốc độ', { min: 0.25, max: 3, step: 0.25, value: speed, unit: '×' }, (v) => (speed = v));
    stage.ui.group('Dependency Injection');
    stage.ui.toggle('Dùng DI container', di, (v) => {
      di = v;
      if (!v && mock) { mock = false; svcSel.set('real'); }
      stage.log(v ? 'DI bật: container tạo ShopService và inject qua constructor' : `DI tắt: ${MID[mode]} tự gọi new ShopService(). Phụ thuộc bị "hàn chết"`, v ? 'info' : 'warn');
    });
    const svcSel = stage.ui.select('IShopService', [{ value: 'real', label: 'ShopService (thật)' }, { value: 'mock', label: 'MockShopService (test)' }], 'real', (v) => {
      if (v === 'mock' && !di) { svcSel.set('real'); return stage.log(`Không thay được: ${MID[mode]} tự new ShopService(), muốn Mock phải sửa code`, 'error'); }
      mock = v === 'mock';
      stage.log(mock ? 'Container.Bind<IShopService>().To<MockShopService>(). Presenter không đổi một dòng' : 'Bind<IShopService>().To<ShopService>()');
    });

    stage.onPointer('down', (x, y) => { if (btn && x > btn.x && x < btn.x + btn.w && y > btn.y && y < btn.y + btn.h) buy(); });
    stage.onFrame((dt) => {
      if (!cur && queue.length) { cur = queue.shift(); if (cur.lazy) cur = (queue.unshift(...notify()), queue.shift()); }
      if (cur) {
        cur.t += dt * speed / 0.9;
        if (cur.t >= 1) {
          const c = cur; cur = null; flash[c.b] = 0.5;
          if (c.fn) c.fn();
          stage.log(`${name(c.a)} → ${name(c.b)}: ${c.label}`);
        }
      }
      for (const k in flash) flash[k] = Math.max(0, flash[k] - dt);
      render();
    });

    function layout(w, h) {
      const pad = 14, gap = U.clamp(w * 0.1, 22, 120), bw = Math.min(220, (w - 2 * pad - 2 * gap) / 3);
      const x0 = (w - (3 * bw + 2 * gap)) / 2, bh = U.clamp(h * 0.27, 96, 140), y1 = 40, y2 = y1 + bh + U.clamp(h * 0.18, 40, 110);
      B = {
        view: { x: x0, y: y1, w: bw, h: bh }, mid: { x: x0 + bw + gap, y: y1, w: bw, h: bh }, model: { x: x0 + 2 * (bw + gap), y: y1, w: bw, h: bh },
        svc: { x: x0 + bw + gap, y: y2, w: bw, h: 62 }, di: { x: x0, y: y2, w: bw, h: 62 },
      };
    }
    const ctr = (b) => [b.x + b.w / 2, b.y + b.h / 2];
    function edge(b, tx, ty) { // point on rect border toward (tx,ty)
      const [cx, cy] = ctr(b), dx = tx - cx, dy = ty - cy;
      const s = Math.min(Math.abs((b.w / 2) / (dx || 1e-6)), Math.abs((b.h / 2) / (dy || 1e-6)));
      return [cx + dx * s, cy + dy * s];
    }
    function seg(a, b, off) {
      const [ax, ay] = ctr(B[a]), [bx, by] = ctr(B[b]), L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L * off, ny = (bx - ax) / L * off;
      const p = edge(B[a], bx, by), q = edge(B[b], ax, ay);
      return [p[0] + nx, p[1] + ny, q[0] + nx, q[1] + ny];
    }
    const off = (a, b) => (a < b ? 7 : -7);
    function path(a, b) { // MVC: Model -> View goes over the top of the boxes
      if ((a === 'model' && b === 'view') || (a === 'view' && b === 'model')) {
        const A = B[a], Bb = B[b], r = B.view.y - 14;
        return [[A.x + A.w / 2, A.y], [A.x + A.w / 2, r], [Bb.x + Bb.w / 2, r], [Bb.x + Bb.w / 2, Bb.y]];
      }
      const s = seg(a, b, off(a, b)); return [[s[0], s[1]], [s[2], s[3]]];
    }
    function link(a, b, o = {}) { const s = seg(a, b, 0); d.line(s[0], s[1], s[2], s[3], { stroke: o.stroke || C.lineSoft, lw: o.lw || 2, dash: o.dash }); return s; }

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h); layout(w, h);
      // static "who references whom"
      link('view', 'mid'); link('mid', 'model'); link('mid', 'svc', di ? { dash: [5, 5], stroke: C.faint } : { stroke: C.red, lw: 2.5 });
      if (mode === 'mvc') { d.poly(path('view', 'model'), { stroke: C.lineSoft, lw: 2 }); }
      if (di) { link('di', 'mid', { stroke: C.teal, dash: [4, 4] }); link('di', 'svc', { stroke: C.teal, dash: [4, 4] }); }
      const fl = (k, col) => (flash[k] > 0 ? col : null);
      // View box with mini UI
      const V = B.view, small = V.w < 130;
      d.node(V.x, V.y, V.w, V.h, null, { accent: fl('view', C.purple) || C.purple, lw: flash.view ? 3.5 : 2 });
      d.text('View (UI)', V.x + 10, V.y + 15, { font: 'cond', weight: 700, size: 14, color: C.navy });
      d.text(`Gold: ${view.gold}`, V.x + 10, V.y + 37, { font: 'mono', size: small ? 11 : 13, color: C.ink });
      d.text(`Items: ${view.items}`, V.x + 10, V.y + 55, { font: 'mono', size: small ? 11 : 13, color: C.ink });
      if (view.msg) d.text(view.msg, V.x + V.w - 8, V.y + 15, { align: 'right', font: 'mono', size: 11, color: C.red });
      btn = { x: V.x + 8, y: V.y + V.h - 30, w: V.w - 16, h: 22 };
      d.rect(btn.x, btn.y, btn.w, btn.h, { fill: C.navy, r: 6 });
      d.text(small ? 'Mua' : 'Mua item (50)', btn.x + btn.w / 2, btn.y + 11.5, { align: 'center', font: 'mono', size: 11, color: '#fff' });
      // Middle layer
      const M = B.mid;
      d.node(M.x, M.y, M.w, M.h, null, { accent: fl('mid', C.orange) || C.orange, lw: flash.mid ? 3.5 : 2 });
      d.text(MID[mode], M.x + 10, M.y + 15, { font: 'cond', weight: 700, size: 14, color: C.navy });
      const role = { mvc: 'xử lý input', mvp: 'gọi view.SetGold()', mvvm: 'state reactive' }[mode];
      d.text(role, M.x + 10, M.y + 35, { font: 'mono', size: 11, color: C.muted });
      if (mode === 'mvvm') d.text(`Gold: RP<int> = ${rp}`, M.x + 10, M.y + 55, { font: 'mono', size: small ? 10 : 12, weight: 600, color: C.teal });
      d.text(di ? '(IShopService shop)' : 'new ShopService()', M.x + 10, M.y + M.h - 16, { font: 'mono', size: small ? 10 : 11, color: di ? C.tealDeep : C.red });
      // Model
      const Mo = B.model;
      d.node(Mo.x, Mo.y, Mo.w, Mo.h, null, { accent: fl('model', C.green) || C.green, lw: flash.model ? 3.5 : 2 });
      d.text('Model (data)', Mo.x + 10, Mo.y + 15, { font: 'cond', weight: 700, size: 14, color: C.navy });
      d.text(`gold  = ${model.gold}`, Mo.x + 10, Mo.y + 37, { font: 'mono', size: small ? 11 : 13 });
      d.text(`items = ${model.items}`, Mo.x + 10, Mo.y + 55, { font: 'mono', size: small ? 11 : 13 });
      d.text('không biết UI', Mo.x + 10, Mo.y + Mo.h - 16, { font: 'mono', size: 11, color: C.muted });
      // Service + DI container
      const S = B.svc;
      d.node(S.x, S.y, S.w, S.h, mock ? 'MockShopService' : 'ShopService', { accent: fl('svc', C.blue) || (mock ? C.pink : C.blue), sub: mock ? 'luôn trả true' : ': IShopService', size: small ? 11 : 14 });
      if (di) d.node(B.di.x, B.di.y, B.di.w, B.di.h, 'DI Container', { accent: C.teal, sub: small ? 'inject' : 'Resolve + [Inject]', size: small ? 11 : 14 });
      else d.text('(không có container)', B.di.x + B.di.w / 2, B.di.y + 31, { align: 'center', font: 'mono', size: 11, color: C.faint });
      // pattern summary
      const sum = { mvc: 'View → Controller → Model → View (View quan sát Model)', mvp: 'View ⇄ Presenter ⇄ Model · View không biết Model', mvvm: 'View bind ViewModel.Gold · Model → ViewModel (reactive)' }[mode];
      const yS = Math.max(S.y + S.h + 30, Math.min(h - 48, S.y + S.h + 80));
      if (yS < h - 8) d.text(sum, w / 2, yS, { align: 'center', font: 'mono', size: w < 520 ? 10 : 12, color: C.navy2 });
      if (yS + 22 < h - 4) d.text(di ? 'Test: thay MockShopService mà không sửa ' + MID[mode] : 'Không DI: ' + MID[mode] + ' tự new → khó test, khó thay', w / 2, yS + 22, { align: 'center', font: 'mono', size: w < 520 ? 10 : 11, color: di ? C.tealDeep : C.red });
      // moving message
      if (cur && !cur.lazy) {
        const pts = path(cur.a, cur.b), t = U.ease.inOutQuad(U.clamp(cur.t, 0, 1));
        const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
        let rem = t * lens.reduce((a, b) => a + b, 0), i = 0;
        while (i < lens.length - 1 && rem > lens[i]) rem -= lens[i++];
        const k = rem / (lens[i] || 1), px = U.lerp(pts[i][0], pts[i + 1][0], k), py = U.lerp(pts[i][1], pts[i + 1][1], k);
        const trail = pts.slice(0, i + 1);
        if (trail.length > 1) d.poly(trail.concat([[pts[i][0], pts[i][1]]]), { stroke: cur.color, lw: 3 });
        if (t > 0.03) d.arrow(pts[i][0], pts[i][1], px, py, { stroke: cur.color, lw: 3 });
        const lw = d.measure(cur.label, { size: 11, font: 'mono' }) + 16;
        d.pill(cur.label, U.clamp(px, lw / 2 + 4, w - lw / 2 - 4), Math.max(12, py - 16), { align: 'center', fill: cur.color, size: 11 });
      }
    }

    buy(); cur = queue.shift(); cur.t = 0.55; // meaningful first frame
    stage.log('MVP: View chỉ báo "đã bấm", Presenter quyết định mọi thứ');
  },
});
