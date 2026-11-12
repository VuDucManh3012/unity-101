/* Lesson: Scenes — Single vs Additive, LoadSceneAsync progress, allowSceneActivation, DontDestroyOnLoad, unload. */
U101.defineLesson('scenes', {
  lead: 'Scene là một "màn" chứa các GameObject. SceneManager cho phép thay scene (Single), chồng thêm scene (Additive), tải ngầm bằng LoadSceneAsync, và giữ lại object qua các scene bằng DontDestroyOnLoad.',
  hint: 'Chọn scene và chế độ rồi bấm Load · thử tắt allowSceneActivation · bấm Unload để gỡ scene additive',
  overview: `
    <p>Muốn load một scene bằng code, scene đó phải có trong <b>Build Profiles / Build Settings</b> (danh sách Scene List).</p>
    <ul>
      <li><b>LoadSceneMode.Single</b>: đóng mọi scene đang mở rồi mở scene mới. Mọi object bị hủy, trừ object đã gọi <code>DontDestroyOnLoad</code>.</li>
      <li><b>LoadSceneMode.Additive</b>: mở thêm scene, giữ nguyên scene cũ. Hay dùng cho UI/HUD, hoặc chia một level lớn thành nhiều phần.</li>
      <li><b>LoadSceneAsync</b>: tải ngầm, game không bị đứng. <code>progress</code> chạy tới <b>0.9</b>; phần còn lại là bước kích hoạt. Nếu <code>allowSceneActivation = false</code>, scene dừng ở 0.9 chờ bạn cho phép.</li>
      <li><b>UnloadSceneAsync</b>: gỡ một scene additive. Không thể gỡ scene cuối cùng đang mở.</li>
    </ul>
    <p class="callout">Bẫy kinh điển: AudioManager gọi DontDestroyOnLoad trong MainMenu. Mỗi lần quay về MainMenu lại sinh thêm một AudioManager. Phải có <b>singleton guard</b> để hủy bản thừa.</p>`,
  keyPoints: [
    'Single thay toàn bộ scene. Additive chồng thêm scene, scene cũ vẫn còn.',
    'LoadSceneAsync không làm đứng game. progress dừng ở 0.9 cho tới khi scene được kích hoạt.',
    'DontDestroyOnLoad chuyển object sang scene đặc biệt, sống qua mọi lần load Single.',
    'Dùng singleton guard để không bị nhân bản object DontDestroyOnLoad.',
  ],
  code: {
    title: 'SceneLoader.cs',
    source: `
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

public class SceneLoader : MonoBehaviour
{
    public static SceneLoader Instance { get; private set; }

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; } // singleton guard
        Instance = this;
        DontDestroyOnLoad(gameObject);                         // sống qua mọi scene
    }

    public void LoadLevel(string scene) => StartCoroutine(LoadRoutine(scene));

    IEnumerator LoadRoutine(string scene)
    {
        AsyncOperation op = SceneManager.LoadSceneAsync(scene, LoadSceneMode.Single);
        op.allowSceneActivation = false;          // chờ, chưa chuyển ngay
        while (op.progress < 0.9f)
        {
            Debug.Log($"Loading {op.progress:P0}"); // cập nhật thanh loading
            yield return null;
        }
        yield return new WaitForSeconds(0.5f);    // ví dụ: chờ fade màn hình
        op.allowSceneActivation = true;           // kích hoạt → progress = 1
        SceneManager.LoadSceneAsync("HUD", LoadSceneMode.Additive);
    }
}`,
    note: 'progress chỉ lên tới 0.9 khi allowSceneActivation = false. Đừng viết while (!op.isDone) trong trường hợp đó, vòng lặp sẽ không bao giờ kết thúc.',
  },
  tryIt: [
    'Load Level1 kiểu Single: object nào biến mất, object nào sống sót?',
    'Load HUD kiểu Additive rồi Unload nó. Active scene có đổi không?',
    'Tắt allowSceneActivation rồi Load: progress dừng ở đâu? Bấm Activate để đi tiếp.',
    'Tắt Async và Load: để ý vòng quay "game loop" đứng hình.',
    'Tắt Singleton guard rồi load lại MainMenu vài lần: đếm số AudioManager.',
  ],
  links: [
    { label: 'SceneManager.LoadSceneAsync', url: 'https://docs.unity3d.com/ScriptReference/SceneManagement.SceneManager.LoadSceneAsync.html' },
    { label: 'AsyncOperation.allowSceneActivation', url: 'https://docs.unity3d.com/ScriptReference/AsyncOperation-allowSceneActivation.html' },
    { label: 'Object.DontDestroyOnLoad', url: 'https://docs.unity3d.com/ScriptReference/Object.DontDestroyOnLoad.html' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const DEFS = { MainMenu: ['Main Camera', 'Canvas', 'AudioManager'], Level1: ['Main Camera', 'Player', 'Enemy', 'Enemy'], Level2: ['Main Camera', 'Player', 'Boss'], HUD: ['HUD Canvas', 'EventSystem'] };
    const OCOL = { 'Main Camera': C.teal, Canvas: C.blue, 'HUD Canvas': C.blue, AudioManager: C.orange, Player: C.green, Enemy: C.red, Boss: C.purple, EventSystem: C.faint };
    const cfg = { target: 'Level1', mode: 'Single', async: true, allow: true, ddol: true, guard: true, loadTime: 2 };
    const ddol = { name: 'DontDestroyOnLoad', objs: [], alpha: 1 };
    let scenes = [], op = null, freeze = 0, active = '', uid = 0, spin = 0;

    const mkObjs = (name) => DEFS[name].map((label) => ({ id: ++uid, label, x: null, y: null, a: 0 }));
    function activate(name, mode) {
      if (mode === 'Single') {
        scenes.forEach((s) => { s.state = 'unloading'; stage.log(`Unload ${s.name}: hủy ${s.objs.length} object (OnDestroy)`, 'warn'); });
        if (ddol.objs.length) stage.log(`${ddol.objs.map((o) => o.label).join(', ')} sống sót (DontDestroyOnLoad)`);
      }
      const sc = { name, objs: mkObjs(name), state: 'loaded', alpha: 0 };
      if (mode === 'Additive' && sc.objs.some((o) => o.label === 'Main Camera') && scenes.some((s) => s.state === 'loaded' && s.objs.some((o) => o.label === 'Main Camera')))
        stage.log('There are 2 audio listeners in the scene. (hai scene cùng có Main Camera)', 'warn');
      const am = sc.objs.find((o) => o.label === 'AudioManager');
      if (am && cfg.ddol) {
        const existing = ddol.objs.find((o) => o.label === 'AudioManager');
        if (existing && cfg.guard) { sc.objs = sc.objs.filter((o) => o !== am); stage.log('AudioManager.Awake: Instance đã tồn tại → Destroy(bản mới)'); }
        else { sc.objs = sc.objs.filter((o) => o !== am); ddol.objs.push(am); stage.log('DontDestroyOnLoad(AudioManager) → chuyển sang scene DontDestroyOnLoad', existing ? 'error' : 'info'); }
        const n = ddol.objs.filter((o) => o.label === 'AudioManager').length;
        if (n > 1) stage.log(`Có ${n} AudioManager! Nhạc phát chồng lên nhau. Hãy bật singleton guard.`, 'error');
      }
      scenes.push(sc);
      if (mode === 'Single' || !active) active = name;
      stage.log(`${name} đã load (${mode}). Active scene: ${active}`);
    }
    function load() {
      if (op || freeze > 0) return stage.log('Đang có một thao tác load chưa xong', 'warn');
      const { target, mode } = cfg;
      if (mode === 'Additive' && scenes.some((s) => s.name === target && s.state === 'loaded')) stage.log(`${target} đang mở rồi: Unity vẫn load thêm một bản nữa`, 'warn');
      if (cfg.async) { op = { name: target, mode, p: 0, allow: cfg.allow, waiting: false }; stage.log(`SceneManager.LoadSceneAsync("${target}", LoadSceneMode.${mode})`); }
      else { freeze = cfg.loadTime * 0.5; op = { name: target, mode, sync: true }; stage.log(`SceneManager.LoadScene("${target}") (đồng bộ): game đứng hình ${freeze.toFixed(1)}s`, 'warn'); }
    }

    stage.ui.group('Load scene');
    stage.ui.select('Scene', Object.keys(DEFS), cfg.target, (v) => (cfg.target = v));
    stage.ui.select('LoadSceneMode', ['Single', 'Additive'], cfg.mode, (v) => (cfg.mode = v));
    stage.ui.toggle('Async (LoadSceneAsync)', cfg.async, (v) => (cfg.async = v));
    stage.ui.toggle('allowSceneActivation', cfg.allow, (v) => { cfg.allow = v; if (op && !op.sync) op.allow = v; });
    stage.ui.slider('Thời gian tải', { min: 0.5, max: 5, step: 0.5, value: cfg.loadTime, unit: 's' }, (v) => (cfg.loadTime = v));
    stage.ui.button('Load', load, { variant: 'primary' });
    stage.ui.button('Activate', () => { if (!op || op.sync) return stage.log('Không có AsyncOperation nào đang chờ', 'warn'); op.allow = true; stage.log('op.allowSceneActivation = true'); });
    stage.ui.button('Unload', () => {
      const live = scenes.filter((s) => s.state === 'loaded'), sc = live.find((s) => s.name === cfg.target);
      if (!sc) return stage.log(`${cfg.target} chưa được load`, 'warn');
      if (live.length === 1) return stage.log('Unloading the last loaded scene is not supported', 'error');
      sc.state = 'unloading'; stage.log(`SceneManager.UnloadSceneAsync("${sc.name}")`);
      if (active === sc.name) { active = live.find((s) => s !== sc).name; stage.log(`Active scene chuyển sang ${active}`); }
    }, { variant: 'danger' });
    stage.ui.group('AudioManager (trong MainMenu)');
    stage.ui.toggle('Awake gọi DontDestroyOnLoad', cfg.ddol, (v) => (cfg.ddol = v));
    stage.ui.toggle('Singleton guard', cfg.guard, (v) => (cfg.guard = v));
    const countR = stage.ui.readout('sceneCount', '1');

    activate('MainMenu', 'Single');
    scenes[0].alpha = 1;

    stage.onFrame((dt) => {
      if (freeze > 0) { freeze -= dt; if (freeze <= 0) { activate(op.name, op.mode); op = null; } render(); return; } // game loop đứng
      spin += dt * 5;
      if (op) {
        if (op.p < 0.9) op.p = Math.min(0.9, op.p + dt / cfg.loadTime * 0.9);
        else if (!op.allow) { if (!op.waiting) { op.waiting = true; stage.log('progress = 0.9, isDone = false: chờ allowSceneActivation', 'warn'); } }
        else if ((op.p += dt * 0.5) >= 1) { activate(op.name, op.mode); op = null; }
      }
      const k = 1 - Math.exp(-dt * 9);
      scenes.forEach((s) => { s.alpha = s.state === 'unloading' ? s.alpha - dt * 2 : Math.min(1, s.alpha + dt * 3); });
      scenes = scenes.filter((s) => s.alpha > 0 || s.state !== 'unloading');
      [...scenes, ddol].forEach((s) => s.objs.forEach((o) => { if (o.tx != null) { o.x = o.x == null ? o.tx : U.lerp(o.x, o.tx, k); o.y = o.y == null ? o.ty : U.lerp(o.y, o.ty, k); o.a = Math.min(1, o.a + dt * 3); } }));
      countR.set(String(scenes.filter((s) => s.state === 'loaded').length));
      render();
    });

    function render() {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      d.text('HIERARCHY (Play Mode)', 16, 22, { font: 'mono', size: 11, weight: 700, color: C.muted });
      // Status: game-loop spinner + active scene
      const sx = w - 26, sy = 22;
      d.circle(sx, sy, 9, { stroke: C.lineSoft, lw: 3 });
      d.ctx.beginPath(); d.ctx.arc(sx, sy, 9, spin, spin + 1.8); d.ctx.strokeStyle = freeze > 0 ? C.red : C.teal; d.ctx.lineWidth = 3; d.ctx.stroke();
      d.text(freeze > 0 ? 'game loop ĐỨNG' : 'game loop', sx - 16, sy, { align: 'right', font: 'mono', size: 11, weight: 600, color: freeze > 0 ? C.red : C.muted });
      // Cards: scenes + pending op + DDOL
      const cards = [...scenes];
      if (op) cards.push({ name: op.name, op: true, objs: [], alpha: 1 });
      cards.push(ddol);
      const cols = w > 760 ? 4 : w > 480 ? 3 : 2, gap = 12, cw = (w - 24 - gap * (cols - 1)) / cols, ch = Math.min(150, (h - 60) / Math.ceil(cards.length / cols) - gap);
      cards.forEach((s, i) => {
        const x = 12 + (i % cols) * (cw + gap), y = 40 + Math.floor(i / cols) * (ch + gap);
        const isD = s === ddol, isAct = s.name === active && !s.op && !isD && s.state === 'loaded';
        d.ctx.globalAlpha = U.clamp(s.alpha, 0, 1);
        d.node(x, y, cw, ch, null, { accent: isD ? C.orange : s.op ? C.yellow : isAct ? C.blue : C.line, fill: isD ? 'rgba(192,101,45,0.07)' : C.card, shadow: 5 });
        d.text((isAct ? '★ ' : '') + s.name, x + 12, y + 18, { font: 'cond', size: 14, weight: 700, color: isD ? C.orange : C.navy });
        if (isAct && cw > 150) d.text('Active', x + cw - 10, y + 18, { align: 'right', font: 'mono', size: 11, color: C.blue });
        if (s.op) {
          const bw = cw - 24, p = op.sync ? 0.5 : op.p;
          d.rect(x + 12, y + 46, bw, 10, { fill: C.lineSoft, r: 5 });
          d.rect(x + 12, y + 46, bw * (op.sync ? 1 : p), 10, { fill: op.sync ? C.red : op.waiting ? C.yellow : C.teal, r: 5 });
          d.text(op.sync ? 'LoadScene (sync)' : `progress ${p.toFixed(2)}`, x + 12, y + 72, { font: 'mono', size: 11, weight: 600, color: C.navy });
          d.text(op.sync ? 'chặn main thread' : `isDone ${p >= 1}`, x + 12, y + 90, { font: 'mono', size: 11, color: C.muted });
          if (!op.sync && op.waiting) d.text('chờ allowSceneActivation', x + 12, y + 108, { font: 'mono', size: 11, color: C.orange });
        }
        if (isD && !s.objs.length) d.text('(trống)', x + 12, y + 44, { font: 'mono', size: 11, color: C.faint });
        s.objs.forEach((o, j) => { o.tx = x + 12; o.ty = y + 36 + j * 22; });
        d.ctx.globalAlpha = 1;
      });
      [...scenes, ddol].forEach((s) => s.objs.forEach((o) => {
        if (o.x == null) return;
        d.ctx.globalAlpha = U.clamp(Math.min(o.a, s.alpha), 0, 1);
        const cw2 = Math.min(cw - 24, 150);
        d.rect(o.x, o.y, cw2, 18, { fill: C.paper, stroke: OCOL[o.label], lw: 1.5, r: 9 });
        d.circle(o.x + 10, o.y + 9, 4, { fill: OCOL[o.label] });
        d.text(o.label, o.x + 20, o.y + 9.5, { font: 'mono', size: 11, color: C.navy });
        d.ctx.globalAlpha = 1;
      }));
      // Build Settings strip
      const by = h - 66;
      if (by > 40 + ch + 20) {
        d.text('BUILD PROFILES · SCENE LIST', 16, by, { font: 'mono', size: 11, weight: 700, color: C.muted });
        let bx = 16;
        Object.keys(DEFS).forEach((n, i) => {
          const isT = n === cfg.target, isL = scenes.some((s) => s.name === n && s.state === 'loaded');
          bx += d.pill(`${i} ${n}${isL ? ' ●' : ''}`, bx, by + 24, { fill: isT ? C.navy : C.paper, color: isT ? '#fff' : C.navy, size: 11 }) + 8;
        });
        d.text(`GetActiveScene().name = "${active}"`, 16, by + 50, { font: 'mono', size: 11, color: C.blue });
      }
      if (freeze > 0) { d.rect(0, 0, w, h, { fill: 'rgba(24,33,61,0.06)', r: 0 }); d.text('Main thread bận load scene: không render, không nhận input', w / 2, h - 92, { align: 'center', font: 'mono', size: 11, weight: 600, color: C.red }); }
    }
  },
});
