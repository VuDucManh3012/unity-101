/* Lesson: Value vs Reference types + boxing — stack slots, heap objects, reference arrows. */
U101.defineLesson('value-reference', {
  lead: 'Value type (struct, int, Vector3) chứa dữ liệu ngay trong biến; gán là copy. Reference type (class) chỉ chứa địa chỉ tới object trên heap; gán là chia sẻ cùng một object. Boxing biến value type thành object mới trên heap.',
  hint: 'Bấm b = a rồi b.x += 10 (a không đổi) · q = p rồi q.x += 10 (p đổi theo) · thử Box nhiều lần để thấy rác trên heap',
  overview: `
    <p>Mỗi biến local nằm trong <b>stack frame</b> của hàm đang chạy. Cái biến đó chứa gì phụ thuộc vào kiểu:</p>
    <ul>
      <li><b>Value type</b> (<code>struct</code>, <code>int</code>, <code>float</code>, <code>bool</code>, <code>Vector3</code>, <code>Quaternion</code>): biến chứa <b>chính dữ liệu</b>. <code>b = a</code> copy toàn bộ field, sửa <code>b</code> không ảnh hưởng <code>a</code>.</li>
      <li><b>Reference type</b> (<code>class</code>, <code>string</code>, mảng, <code>List&lt;T&gt;</code>, mọi <code>MonoBehaviour</code>): object nằm trên <b>managed heap</b>, biến chỉ chứa địa chỉ. <code>q = p</code> copy địa chỉ, cả hai cùng trỏ vào một object.</li>
      <li><b>Boxing</b>: khi gán value type vào <code>object</code> hoặc interface, runtime cấp phát một hộp mới trên heap và copy giá trị vào. <b>Unboxing</b> <code>(int)o</code> copy giá trị ra lại.</li>
    </ul>
    <p class="callout">Struct là field của class thì nằm trên heap cùng object đó. "Value type luôn ở stack" là cách nói đơn giản hóa. Điều quan trọng là <b>ngữ nghĩa copy</b>: gán struct là copy, gán class là chia sẻ.</p>
    <p>Vì <code>Vector3</code> là struct, <code>transform.position.x = 5</code> báo lỗi CS1612: property trả về <b>bản sao</b>, sửa bản sao vô nghĩa. Phải lấy ra, sửa, rồi gán lại.</p>`,
  keyPoints: [
    'Gán struct = copy dữ liệu. Gán class = copy địa chỉ (cùng một object).',
    'Mỗi lần boxing là một lần cấp phát heap → tạo rác cho Garbage Collector.',
    'Boxing ngầm hay gặp ở: object/params object[], interface trên struct, collection không generic.',
    'Struct nên nhỏ và bất biến. Struct lớn copy nhiều sẽ tốn CPU.',
  ],
  code: [{
    title: 'ValueVsReference.cs',
    source: `
using UnityEngine;

public struct PointS { public int x; }   // value type
public class  PointC { public int x; }   // reference type

public class ValueVsReference : MonoBehaviour
{
    void Start()
    {
        PointS a = new PointS { x = 1 };
        PointS b = a;            // copy toàn bộ dữ liệu
        b.x += 10;               // a.x vẫn = 1

        PointC p = new PointC { x = 1 }; // cấp phát trên heap
        PointC q = p;            // copy địa chỉ → cùng 1 object
        q.x += 10;               // p.x cũng thành 11

        int n = 42;
        object o = n;            // boxing: object mới trên heap
        int m = (int)o;          // unboxing: copy giá trị ra

        // Vector3 là struct: position trả về BẢN SAO
        Vector3 pos = transform.position;
        pos.x = 5f;
        transform.position = pos; // phải gán lại
    }
}`,
    note: 'Mô phỏng bên trên chạy đúng các dòng này. Để ý mũi tên: chỉ reference type (và boxed int) mới trỏ sang heap.',
  }, {
    title: 'BoxingPitfalls.cs',
    source: `
int score = 10;

// ✗ Boxing ngầm: mỗi dòng cấp phát 1 object trên heap
string s = string.Format("Score: {0}", score); // params object[] → box
ArrayList old = new ArrayList(); old.Add(score); // ArrayList lưu object → box
IComparable c = score;                           // struct → interface → box

// ✓ Không boxing
List<int> ints = new List<int>(); ints.Add(score); // generic giữ đúng kiểu int
string t = "Score: " + score.ToString();            // ToString() gọi thẳng trên int`,
    note: 'Gọi một lần thì không sao. Gọi mỗi frame trong Update() thì rác tích tụ và GC sẽ gây giật.',
  }],
  tryIt: [
    'Bấm b = a rồi b.x += 10. Giá trị của a có đổi không?',
    'Bấm q.x += 10: cả p và q cùng đổi vì hai mũi tên chỉ vào một object.',
    'Bấm p = new PointC(): giờ p và q trỏ vào hai object khác nhau.',
    'Box n vào o, rồi n += 1. Hộp trên heap có cập nhật theo không?',
    'Bật "Box mỗi frame" và nhìn heap đầy object unreachable (rác).',
  ],
  links: [
    { label: 'Value types (C# reference)', url: 'https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/value-types' },
    { label: 'Boxing and Unboxing (C#)', url: 'https://learn.microsoft.com/dotnet/csharp/programming-guide/types/boxing-and-unboxing' },
    { label: 'Unity Manual: Managed memory', url: 'https://docs.unity3d.com/Manual/performance-managed-memory.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    let t = 0, nextId = 1, allocs = 0, boxLoop = false, boxTimer = 0;
    const heap = [], stack = [];
    const REF_COL = { p: C.blue, q: C.teal, o: C.purple };
    const slot = (n) => stack.find((s) => s.name === n);
    const obj = (id) => heap.find((o) => o.id === id);
    function alloc(kind, x) { const o = { id: nextId++, kind, x, born: t, flash: t }; heap.push(o); allocs++; return o; }
    function setSlot(name, type, props, from) {
      let s = slot(name);
      if (!s) { s = { name, type }; stack.push(s); }
      return Object.assign(s, props, { flash: t, from: from || null });
    }
    function sweepView() { // mark unreachable objects; keep heap view small
      heap.forEach((o) => (o.garbage = !stack.some((s) => s.ref === o.id)));
      while (heap.length > 8) { const i = heap.findIndex((o) => o.garbage); if (i < 0) break; heap.splice(i, 1); }
    }
    const fmt = (s) => (s.ref != null ? `→ #${s.ref}` : s.type === 'PointS' ? `{ x = ${s.x} }` : String(s.x));

    // Initial scene: struct a, class p shared by q, int n
    setSlot('a', 'PointS', { x: 1 }); setSlot('b', 'PointS', { x: 1 }, 'a');
    setSlot('p', 'PointC', { ref: alloc('PointC', 1).id }); setSlot('q', 'PointC', { ref: slot('p').ref }, 'p');
    setSlot('n', 'int', { x: 42 }); setSlot('o', 'object', { ref: alloc('Int32', 42).id }, 'n'); sweepView();
    stack.forEach((s) => (s.flash = -9)); heap.forEach((o) => (o.born = o.flash = -9)); // settled initial state

    const box = () => {
      const o = alloc('Int32', slot('n').x); setSlot('o', 'object', { ref: o.id }, 'n'); sweepView();
      allocRead.set(`${allocs} object · ${allocs * 24} B`);
      return o;
    };
    stage.ui.group('Struct (value type)');
    stage.ui.button('b = a', () => { setSlot('b', 'PointS', { x: slot('a').x }, 'a'); stage.log('PointS b = a → copy dữ liệu sang ô nhớ riêng của b'); }, { variant: 'primary' });
    stage.ui.button('b.x += 10', () => { const b = slot('b'); b.x += 10; b.flash = t; b.from = null; stage.log(`b.x = ${b.x}, a.x vẫn = ${slot('a').x} (hai bản độc lập)`); });
    stage.ui.group('Class (reference type)');
    stage.ui.button('q = p', () => { setSlot('q', 'PointC', { ref: slot('p').ref }, 'p'); sweepView(); stage.log(`PointC q = p → copy địa chỉ #${slot('p').ref}, không tạo object mới`); }, { variant: 'primary' });
    stage.ui.button('q.x += 10', () => {
      const o = obj(slot('q').ref); o.x += 10; o.flash = t;
      const shared = slot('p').ref === o.id;
      stage.log(shared ? `Object #${o.id}.x = ${o.x} → p.x cũng = ${o.x} vì p và q trỏ cùng object` : `Chỉ object #${o.id} của q đổi, p trỏ object khác`, shared ? 'warn' : 'info');
    });
    stage.ui.button('p = new PointC()', () => { const o = alloc('PointC', 1); setSlot('p', 'PointC', { ref: o.id }); sweepView(); allocRead.set(`${allocs} object · ${allocs * 24} B`); stage.log(`new PointC() → cấp phát #${o.id} trên heap, q vẫn trỏ #${slot('q').ref}`); });
    stage.ui.group('Boxing');
    stage.ui.button('object o = n', () => { const o = box(); stage.log(`Boxing: tạo Int32 #${o.id} trên heap (24 B), copy giá trị ${o.x} vào`, 'warn'); }, { variant: 'accent' });
    stage.ui.button('int m = (int)o', () => {
      const s = slot('o'); if (!s) return stage.log('Chưa có o. Hãy box trước.', 'warn');
      setSlot('m', 'int', { x: obj(s.ref).x }, 'o'); stage.log(`Unboxing: copy ${slot('m').x} từ heap về stack`);
    });
    stage.ui.button('n += 1', () => { const n = slot('n'); n.x++; n.flash = t; n.from = null; if (slot('o')) stage.log(`n = ${n.x}, hộp #${slot('o').ref} vẫn giữ ${obj(slot('o').ref).x} (là bản copy)`); });
    stage.ui.toggle('Box mỗi frame (Update)', boxLoop, (v) => { boxLoop = v; stage.log(v ? 'Mỗi frame: object o = n → 1 object rác mới mỗi lần' : 'Đã tắt boxing trong Update', v ? 'warn' : 'info'); });
    const allocRead = stage.ui.readout('Heap alloc', `${allocs} object · ${allocs * 24} B`);

    stage.onFrame((dt) => {
      t += dt;
      if (boxLoop && (boxTimer += dt) > 0.35) { boxTimer = 0; slot('n').x++; box(); }
      render();
    });

    function render() {
      const { w, h } = stage, vert = w < 620, pad = 14;
      d.clear(w, h); d.grid(w, h);
      const S = vert ? { x: pad, y: pad, w: w - pad * 2, h: h * 0.5 - pad * 1.5 } : { x: pad, y: pad, w: w * 0.42 - pad * 1.5, h: h - pad * 2 };
      const H = vert ? { x: pad, y: h * 0.5 + pad / 2, w: w - pad * 2, h: h * 0.5 - pad * 1.5 } : { x: w * 0.42 + pad / 2, y: pad, w: w * 0.58 - pad * 1.5, h: h - pad * 2 };
      [[S, 'STACK · Start()', C.tealDeep], [H, 'MANAGED HEAP', C.purple]].forEach(([R, label, col]) => {
        d.rect(R.x, R.y, R.w, R.h, { fill: 'rgba(255,255,255,0.45)', stroke: C.line, dash: [5, 4], r: 12 });
        d.text(label, R.x + 12, R.y + 16, { font: 'mono', size: 11, weight: 700, color: col });
      });
      // Heap objects
      const cols = Math.max(1, Math.floor((H.w - 16) / 140)), cw = (H.w - 16) / cols - 12, ch = 52, pos = {};
      heap.forEach((o, i) => {
        const k = U.ease.outBack(U.clamp((t - o.born) / 0.4, 0, 1));
        const x = H.x + 14 + (i % cols) * (cw + 12), y = H.y + 34 + Math.floor(i / cols) * (ch + 14) + (1 - k) * 16;
        pos[o.id] = { x, y, w: cw, h: ch };
        const f = Math.max(0, 1 - (t - o.flash) / 1.2);
        d.ctx.globalAlpha = o.garbage ? 0.45 : U.clamp(k, 0, 1);
        d.node(x, y, cw, ch, null, { accent: f > 0 ? C.orange : o.kind === 'Int32' ? C.purple : C.blue, lw: 2 + f * 2 });
        d.text(`${o.kind === 'Int32' ? 'Int32 (boxed)' : 'PointC'} #${o.id}`, x + 10, y + 17, { font: 'cond', weight: 700, size: 13, color: C.navy });
        d.text(o.kind === 'Int32' ? `value = ${o.x}` : `x = ${o.x}`, x + 10, y + 36, { font: 'mono', size: 11, color: C.ink });
        if (o.garbage) d.text('unreachable', x + cw - 8, y + 36, { align: 'right', font: 'mono', size: 10, color: C.red });
        d.ctx.globalAlpha = 1;
      });
      // Stack slots
      const rh = Math.min(44, (S.h - 34) / 7), sp = {};
      stack.forEach((s, i) => {
        const x = S.x + 10, y = S.y + 30 + i * rh, sw = S.w - 20, f = Math.max(0, 1 - (t - s.flash) / 1.2);
        sp[s.name] = { x, y, w: sw, h: rh - 6 };
        d.node(x, y, sw, rh - 6, null, { accent: f > 0 ? C.orange : s.ref != null ? REF_COL[s.name] || C.line : C.lineSoft, lw: 2 + f * 2, shadow: 3, r: 8 });
        const my = y + (rh - 6) / 2;
        d.text(s.name, x + 12, my, { font: 'mono', size: 14, weight: 700, color: C.navy });
        d.text(s.type, x + 32, my, { font: 'mono', size: 11, color: C.muted });
        d.text(fmt(s), x + sw - 12, my, { align: 'right', font: 'mono', size: 12, weight: 600, color: s.ref != null ? REF_COL[s.name] || C.ink : C.ink });
      });
      // Reference arrows
      stack.forEach((s) => {
        const a = sp[s.name], b = pos[s.ref]; if (!a || !b) return;
        const col = REF_COL[s.name] || C.navy, sx = a.x + a.w - 4, sy = a.y + a.h / 2;
        const tx = vert ? b.x + b.w / 2 + (s.name === 'q' ? 14 : 0) : b.x, ty = vert ? b.y : b.y + b.h / 2 + (s.name === 'q' ? 8 : s.name === 'p' ? -8 : 0);
        d.arrow(sx, sy, tx, ty, { stroke: col, lw: 2 });
      });
      // Copy animation: a token flies from the source slot into the new slot
      stack.forEach((s) => {
        const k = (t - s.flash) / 0.6, src = sp[s.from], dst = sp[s.name];
        if (!src || !dst || k > 1) return;
        const e = U.ease.inOutQuad(k), x = U.lerp(src.x + src.w * 0.6, dst.x + dst.w * 0.6, e), y = U.lerp(src.y, dst.y, e) + src.h / 2;
        d.pill(s.ref != null ? `#${s.ref}` : 'copy', x, y - Math.sin(k * Math.PI) * 18, { align: 'center', fill: s.ref != null ? C.teal : C.orange, size: 11 });
      });
    }
  },
});
