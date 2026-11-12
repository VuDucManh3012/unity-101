/* Lesson: C# basics — typed variable boxes + value type (struct) vs reference type (class) on stack/heap. */
U101.defineLesson('csharp-basics', {
  lead: 'Script Unity viết bằng C#, chạy trên .NET. Mỗi biến có một kiểu cố định (int, float, bool, string…), và kiểu đó quyết định biến chứa giá trị trực tiếp hay chỉ chứa địa chỉ trỏ tới object.',
  hint: 'Kéo slider để đổi giá trị biến · thử ép kiểu · bên dưới: bấm "var b = a" rồi "b.x = 9" với struct và class',
  overview: `
    <p>C# là ngôn ngữ <b>kiểu tĩnh</b>: kiểu của biến được kiểm tra lúc compile. Gán sai kiểu là lỗi ngay trong Editor, chưa cần bấm Play.</p>
    <ul>
      <li><b>int</b> (4 byte): số nguyên như máu, số đạn. <b>float</b> (4 byte): số thực, Unity dùng float khắp nơi nên phải có hậu tố <code>f</code>: <code>5.5f</code>.</li>
      <li><b>bool</b>: true/false. <b>string</b>: chuỗi ký tự, là kiểu tham chiếu và bất biến (immutable).</li>
      <li><b>Value type</b> (int, float, bool, <code>struct</code> như <code>Vector3</code>): gán là <b>sao chép</b> toàn bộ giá trị.</li>
      <li><b>Reference type</b> (<code>class</code>, string, mảng, GameObject): biến chỉ giữ <b>tham chiếu</b> tới object nằm trên heap. Gán là chia sẻ cùng một object.</li>
      <li><b>.NET</b> cung cấp runtime và thư viện chuẩn (System, System.Collections.Generic…). Unity chạy C# qua Mono hoặc IL2CPP.</li>
    </ul>
    <p class="callout">Lỗi kinh điển: <code>transform.position.x = 5;</code> không compile được, vì <code>position</code> trả về một <b>bản sao</b> Vector3 (struct). Phải lấy ra, sửa, rồi gán lại.</p>`,
  keyPoints: [
    'Kiểu được kiểm tra lúc compile; float literal cần hậu tố f.',
    'Ép (int) từ float sẽ cắt bỏ phần thập phân, không làm tròn.',
    'struct (Vector3, Color) sao chép khi gán; class chia sẻ cùng một object.',
    'Sửa một bản sao struct không ảnh hưởng bản gốc, vì thế phải gán lại transform.position.',
  ],
  code: {
    title: 'PlayerStats.cs',
    source: `
using UnityEngine;

public class PlayerStats : MonoBehaviour
{
    [SerializeField] private int hp = 100;          // số nguyên
    [SerializeField] private float speed = 5.5f;    // cần hậu tố f
    [SerializeField] private bool isAlive = true;
    [SerializeField] private string playerName = "Hero";

    void Start()
    {
        int dmg = (int)7.9f;          // = 7, cắt phần thập phân
        hp -= dmg;

        Vector3 a = transform.position; // struct: bản sao
        a.x = 9f;                        // chưa đổi gì trên object
        transform.position = a;          // phải gán lại

        Debug.Log($"{playerName}: hp={hp}, speed={speed}, alive={isAlive}");
    }
}`,
    note: 'Dùng [SerializeField] private thay vì public để chỉnh trong Inspector mà vẫn giữ đóng gói.',
  },
  tryIt: [
    'Bấm "int hp = 7.9f;" và đọc lỗi compile trong Console.',
    'Bấm "(int)7.9f": hp nhận giá trị bao nhiêu?',
    'Chọn struct Vector3, bấm "var b = a" rồi "b.x = 9". a.x có đổi không?',
    'Đổi sang class Enemy và làm lại. Vì sao a.x đổi theo?',
    'Với class, có bao nhiêu object trên heap sau khi gán b = a?',
  ],
  links: [
    { label: 'C# language tour (Microsoft)', url: 'https://learn.microsoft.com/dotnet/csharp/tour-of-csharp/' },
    { label: 'Value types vs reference types', url: 'https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/value-types' },
    { label: 'Unity Manual: Scripting', url: 'https://docs.unity3d.com/Manual/ScriptingSection.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const vars = [
      { type: 'int', name: 'hp', val: 100, bytes: 4, color: C.blue, flash: 0 },
      { type: 'float', name: 'speed', val: 5.5, bytes: 4, color: C.orange, flash: 0 },
      { type: 'bool', name: 'isAlive', val: true, bytes: 1, color: C.green, flash: 0 },
      { type: 'string', name: 'playerName', val: 'Hero', bytes: 'ref', color: C.purple, flash: 0 },
    ];
    const fmt = (v) => (v.type === 'float' ? v.val.toFixed(1) + 'f' : v.type === 'string' ? `"${v.val}"` : String(v.val));
    const set = (i, val, msg) => { vars[i].val = val; vars[i].flash = 1; if (msg) stage.log(msg); };
    let mode = 'struct', hasB = false, aX = 1, bX = 1, copyT = 1, editT = 1, shake = 0;

    stage.ui.group('Biến (Inspector)');
    stage.ui.slider('int hp', { min: 0, max: 200, value: 100 }, (v) => set(0, v));
    stage.ui.slider('float speed', { min: 0, max: 10, step: 0.1, value: 5.5, format: (v) => v.toFixed(1) + 'f' }, (v) => set(1, v));
    stage.ui.toggle('bool isAlive', true, (v) => set(2, v, `isAlive = ${v};`));
    stage.ui.select('string playerName', ['Hero', 'Mage', 'Rogue'], 'Hero', (v) => set(3, v, `playerName = "${v}"; // string mới, chuỗi cũ không bị sửa`));
    stage.ui.group('Ép kiểu');
    stage.ui.button('int hp = 7.9f;', () => { shake = 1; stage.log("error CS0266: Cannot implicitly convert type 'float' to 'int'. An explicit conversion exists (are you missing a cast?)", 'error'); });
    stage.ui.button('hp = (int)7.9f;', () => set(0, 7, '(int)7.9f = 7 → cắt phần thập phân, không làm tròn'), { variant: 'primary' });
    stage.ui.group('Value vs Reference');
    stage.ui.select('Kiểu của a', [{ value: 'struct', label: 'struct Vector3' }, { value: 'class', label: 'class Enemy' }], mode, (v) => { mode = v; reset(); });
    stage.ui.button('var b = a;', () => {
      if (hasB) return stage.log('b đã được gán', 'warn');
      hasB = true; bX = aX; copyT = 0;
      stage.log(mode === 'struct' ? 'b = a: sao chép toàn bộ Vector3 sang b (2 bản độc lập)' : 'b = a: copy tham chiếu, b trỏ tới CÙNG object Enemy trên heap');
    }, { variant: 'primary' });
    stage.ui.button('b.x = 9;', () => {
      if (!hasB) return stage.log('Chưa có b. Bấm "var b = a;" trước', 'warn');
      editT = 0;
      if (mode === 'struct') { bX = 9; stage.log(`b.x = 9 → a.x vẫn = ${aX} (struct là bản sao)`); }
      else { aX = bX = 9; stage.log('b.x = 9 → a.x cũng = 9 (cùng một object)', 'warn'); }
    });
    stage.ui.button('Reset', () => reset());
    const readA = stage.ui.readout('a.x / b.x', '1 / —');
    function reset() { hasB = false; aX = bX = 1; copyT = editT = 1; }

    stage.onFrame((dt) => {
      vars.forEach((v) => (v.flash = Math.max(0, v.flash - dt * 1.8)));
      copyT = Math.min(1, copyT + dt * 1.4); editT = Math.min(1, editT + dt * 2); shake = Math.max(0, shake - dt * 2);
      readA.set(`${aX} / ${hasB ? bX : '—'}`);
      render();
    });

    function render() {
      const { w, h } = stage, pad = 16;
      d.clear(w, h); d.grid(w, h);
      // Typed boxes
      const cols = w < 560 ? 2 : 4, rows = 4 / cols, gap = 10;
      const bw = (w - pad * 2 - gap * (cols - 1)) / cols, bh = rows === 1 ? 74 : 62;
      vars.forEach((v, i) => {
        const x = pad + (i % cols) * (bw + gap) + (i === 0 ? Math.sin(shake * 30) * shake * 6 : 0), y = 14 + Math.floor(i / cols) * (bh + gap);
        d.node(x, y, bw, bh, null, { accent: v.flash > 0 ? v.color : C.line, lw: 2 + v.flash * 2, fill: v.flash > 0 ? `rgba(255,250,241,1)` : C.card });
        d.pill(v.type, x + 10, y + 15, { fill: v.color, size: 11 });
        d.text(v.bytes === 'ref' ? 'ref' : v.bytes + 'B', x + bw - 10, y + 15, { align: 'right', font: 'mono', size: 11, color: C.faint });
        d.text(v.name, x + 12, y + bh * 0.5 + 2, { font: 'mono', size: 11, color: C.muted });
        d.text(fmt(v), x + 12, y + bh - 15, { font: 'mono', size: rows === 1 ? 17 : 15, weight: 700, color: C.navy });
      });
      // Stack / Heap
      const top = 14 + rows * (bh + gap) + 14, H = h - top - pad;
      const sw = Math.min(260, (w - pad * 3) * 0.48), hx = pad * 2 + sw, hw = w - hx - pad;
      d.rect(pad, top, sw, H, { fill: 'rgba(42,86,163,0.06)', stroke: C.lineSoft, r: 10 });
      d.rect(hx, top, hw, H, { fill: 'rgba(138,115,224,0.06)', stroke: C.lineSoft, r: 10 });
      d.text('STACK (biến)', pad + 12, top + 16, { font: 'mono', size: 11, weight: 700, color: C.blue });
      d.text('HEAP (object)', hx + 12, top + 16, { font: 'mono', size: 11, weight: 700, color: C.purple });
      const slotH = U.clamp((H - 110) / 2, 40, 70), sx = pad + 12, slotW = sw - 24;
      const slotY = [top + 34, top + 56 + slotH], E = U.ease.outCubic(copyT);
      const objX = hx + hw / 2 - Math.min(120, hw * 0.4), objY = top + 34 + slotH / 2 - 10, objW = Math.min(240, hw * 0.8), objH = slotH + 20;
      const struct = mode === 'struct';
      ['a', 'b'].forEach((n, i) => {
        const y = slotY[i], show = i === 0 || hasB;
        d.rect(sx, y, slotW, slotH, { fill: show ? C.paper : 'transparent', stroke: show ? C.line : C.lineSoft, dash: show ? null : [4, 4], r: 8 });
        d.text(struct ? `Vector3 ${n}` : `Enemy ${n}`, sx + 10, y + 12, { font: 'mono', size: 11, color: C.muted });
        if (!show) return;
        const x = i === 0 ? aX : bX, hl = editT < 1 && (i === 1 || !struct);
        if (struct) {
          if (i === 1 && copyT < 1) { // copy flying from a to b
            const fy = U.lerp(slotY[0], y, E);
            d.rect(sx + 6, fy + 22, slotW - 12, slotH - 28, { fill: 'rgba(42,86,163,0.15)', stroke: C.blue, r: 6 });
          }
          d.text(`{ x: ${x}, y: 0, z: 0 }`, sx + 10, y + slotH - 13, { font: 'mono', size: 13, weight: 700, color: hl ? C.orange : C.navy });
        } else {
          d.text('→ ref #A1', sx + 10, y + slotH - 13, { font: 'mono', size: 13, weight: 700, color: C.teal });
          const ex = U.lerp(sx + slotW, objX, i === 1 ? E : 1);
          d.arrow(sx + slotW - 4, y + slotH / 2, ex, objY + objH / 2 + (i ? 10 : -10), { stroke: C.teal, lw: 2 });
        }
      });
      if (hasB) d.text(struct ? '↓ copy giá trị' : '↓ copy tham chiếu', sx + slotW - 8, slotY[1] - 11, { align: 'right', font: 'mono', size: 11, color: struct ? C.blue : C.teal });
      const sy = top + H - 52, sW = Math.min(150, hw - 24); // string playerName cũng sống trên heap
      d.node(hx + 12, sy, sW, 38, null, { accent: vars[3].flash > 0 ? C.purple : C.lineSoft, shadow: 4 });
      d.text('string "' + vars[3].val + '"', hx + 22, sy + 19, { font: 'mono', size: 12, weight: 600, color: C.purple });
      if (hx + sW + 30 < w - 120) d.text('← playerName', hx + sW + 20, sy + 19, { font: 'mono', size: 11, color: C.faint });
      if (!struct) {
        d.node(objX, objY, objW, objH, null, { accent: editT < 1 ? C.orange : C.purple });
        d.text('Enemy  @#A1', objX + 12, objY + 16, { font: 'mono', size: 11, color: C.muted });
        d.text(`x = ${aX}`, objX + 12, objY + objH - 20, { font: 'mono', size: 16, weight: 700, color: editT < 1 ? C.orange : C.navy });
        d.text('Enemy trên heap: 1 object', objX, objY + objH + 16, { font: 'mono', size: 11, color: C.muted });
      } else {
        d.text('struct nằm ngay trong biến,', hx + 12, top + 42, { font: 'mono', size: 11, color: C.faint });
        d.text('không cấp phát trên heap', hx + 12, top + 60, { font: 'mono', size: 11, color: C.faint });
      }
    }
    render();
  },
});
