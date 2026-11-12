/* Lesson: Git basics — interactive commit graph (commit, branch, switch, merge, conflict), .gitignore, LFS, Smart Merge, push/PR. */
U101.defineLesson('git-basics', {
  lead: 'Git lưu lịch sử dự án thành chuỗi commit. Branch cho phép làm tính năng song song, merge gộp lại. Với Unity, cần .gitignore thư mục Library/, dùng Git LFS cho file nặng và Smart Merge cho file scene.',
  hint: 'Bấm git merge feature để thấy conflict trên Level1.unity · bật Smart Merge rồi thử lại · sửa file, commit, switch branch',
  overview: `
    <p><b>Commit</b> là một ảnh chụp dự án kèm con trỏ tới commit cha. <b>Branch</b> chỉ là một nhãn trỏ vào commit. <b>HEAD</b> cho biết bạn đang đứng ở branch nào.</p>
    <ul>
      <li><b>Merge</b>: nếu branch kia đi thẳng từ chỗ bạn thì Git chỉ dời nhãn (<i>fast-forward</i>). Nếu hai bên đều có commit mới, Git tạo <b>merge commit</b> có hai cha.</li>
      <li><b>Conflict</b>: hai branch cùng sửa một file. File <code>.unity</code>/<code>.prefab</code> là YAML rất dài, sửa tay rất khó. <b>UnityYAMLMerge</b> (Smart Merge) hiểu cấu trúc scene nên tự gộp được khi hai bên sửa khác object.</li>
      <li><b>.gitignore</b>: bỏ qua <code>Library/</code>, <code>Temp/</code>, <code>Logs/</code>, <code>obj/</code>. Unity tự sinh lại các thư mục này. Commit <code>.meta</code> đầy đủ.</li>
      <li><b>Git LFS</b>: file nhị phân lớn (.psd, .fbx, .wav) chỉ lưu con trỏ nhỏ trong repo. GitHub chặn file trên 100 MB.</li>
      <li><b>GitHub</b>: <code>git push</code> lên remote, rồi mở <b>Pull Request</b> để review trước khi merge vào main.</li>
    </ul>
    <p class="callout">Trong Project Settings → Editor, đặt <b>Asset Serialization = Force Text</b> và <b>Version Control = Visible Meta Files</b> để Git đọc và merge được asset.</p>`,
  keyPoints: [
    'Branch là nhãn trỏ vào commit. Merge tạo commit có hai cha, hoặc fast-forward.',
    'Conflict xảy ra khi hai branch sửa cùng file. Scene/prefab nên merge bằng UnityYAMLMerge.',
    'Luôn .gitignore Library/ Temp/ Logs/ và luôn commit file .meta.',
    'File nhị phân lớn dùng Git LFS. Làm việc trên branch, đẩy lên GitHub và mở Pull Request.',
  ],
  code: [
    { title: '.gitignore', source: `
# Unity tự sinh lại, KHÔNG commit
/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Uu]ser[Ss]ettings/
*.csproj
*.sln
# KHÔNG ignore *.meta: chúng giữ GUID tham chiếu asset`, note: 'Library/ chứa cache import (hàng GB). Mỗi máy tự build lại khi mở project.' },
    { title: '.gitattributes + .git/config', source: `
# .gitattributes: file nặng đi qua Git LFS
*.psd filter=lfs diff=lfs merge=lfs -text
*.fbx filter=lfs diff=lfs merge=lfs -text
*.wav filter=lfs diff=lfs merge=lfs -text
*.unity  merge=unityyamlmerge eol=lf
*.prefab merge=unityyamlmerge eol=lf

# .git/config: Smart Merge của Unity
[merge]
    tool = unityyamlmerge
[mergetool "unityyamlmerge"]
    trustExitCode = false
    cmd = '<Unity>/Editor/Data/Tools/UnityYAMLMerge' merge -p "$BASE" "$REMOTE" "$LOCAL" "$MERGED"`, note: 'Khi có conflict trên scene, chạy git mergetool để UnityYAMLMerge tự gộp.' },
    { title: 'terminal', source: `
git lfs install
git switch -c feature/enemy-ai     # tạo branch và chuyển sang
git add Assets/Scenes/Level1.unity Assets/Scripts/Enemy.cs
git commit -m "Add Enemy to Level1"
git push -u origin feature/enemy-ai  # rồi mở Pull Request trên GitHub
git switch main
git merge feature/enemy-ai           # hoặc merge qua PR`, note: 'Quy trình chuẩn: branch → commit nhỏ → push → Pull Request → review → merge.' },
  ],
  tryIt: [
    'Bấm git merge feature khi Smart Merge tắt: file nào bị conflict? Bấm Resolve để tạo merge commit.',
    'Reset, bật Smart Merge rồi merge lại: Level1.unity được gộp tự động.',
    'Switch sang feature, sửa Player.cs, commit; về main sửa Player.cs, commit rồi merge.',
    'Tắt .gitignore Library/ rồi commit: xem kích thước repo nhảy vọt.',
    'Sửa Hero.psd và push khi chưa bật LFS: GitHub cảnh báo gì?',
  ],
  links: [
    { label: 'Version control integrations (Unity)', url: 'https://docs.unity3d.com/Manual/Versioncontrolintegration.html' },
    { label: 'Smart Merge (UnityYAMLMerge)', url: 'https://docs.unity3d.com/Manual/SmartMerge.html' },
    { label: 'Git LFS', url: 'https://git-lfs.com/' },
    { label: 'GitHub: About pull requests', url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests' },
  ],

  mount(stage) {
    const { draw: d, colors: C, util: U } = stage;
    const SIZE = { 'Player.cs': 4e3, 'Level1.unity': 1.2e5, 'Hero.psd': 8.5e7, 'ProjectSettings/': 2e4 };
    const LANE_COL = [C.blue, C.purple];
    const cfg = { file: 'Player.cs', ignore: true, lfs: false, smart: false };
    const commits = [], refs = {}, origin = {}, refDisp = {};
    const work = new Set();
    let head = 'main', conflict = null, repo = 0, libTracked = false, t0 = 0;

    const hex = () => Math.floor(Math.random() * 0xfffffff).toString(16).padStart(7, '0');
    function addCommit(lane, parents, files, msg) {
      let bytes = files.reduce((s, f) => s + (f === 'Hero.psd' && cfg.lfs ? 130 : SIZE[f] || 0), 0);
      if (!cfg.ignore) { files = [...files, 'Library/']; bytes += libTracked ? 4e7 : 3.5e8; libTracked = true; }
      repo += bytes;
      const c = { id: commits.length, hash: hex(), lane, parents, files, msg, born: t0, psdRaw: files.includes('Hero.psd') && !cfg.lfs };
      commits.push(c); return c;
    }
    const anc = (id, set = new Set()) => { if (id == null || set.has(id)) return set; set.add(id); commits[id].parents.forEach((p) => anc(p, set)); return set; };
    const changed = (base, tip) => { const a = anc(base), out = new Set(); anc(tip).forEach((id) => { if (!a.has(id)) commits[id].files.forEach((f) => out.add(f)); }); return out; };
    const fmt = (b) => (b > 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB');

    // History: main 2 commits, feature and main diverged, both touched Level1.unity
    addCommit(0, [], ['ProjectSettings/'], 'Initial commit');
    addCommit(0, [0], ['Player.cs'], 'Add Player');
    refs.feature = addCommit(1, [1], ['Level1.unity'], 'Add Enemy to Level1').id;
    refs.main = addCommit(0, [1], ['Level1.unity'], 'Tweak light in Level1').id;
    origin.main = 1;

    function commit(msg) {
      if (conflict) return stage.log('error: Committing is not possible because you have unmerged files.', 'error');
      if (!work.size) return stage.log('nothing to commit, working tree clean', 'warn');
      const files = [...work]; work.clear();
      const c = addCommit(head === 'main' ? 0 : 1, [refs[head]], files, msg || `Update ${files.join(', ')}`);
      refs[head] = c.id;
      const lib = c.files.includes('Library/');
      stage.log(`[${head} ${c.hash}] ${c.msg}` + (lib ? '  + Library/ (3,214 file cache!)' : ''), lib ? 'warn' : 'info');
    }
    function switchTo(b) {
      if (conflict) return stage.log('error: you need to resolve your current index first', 'error');
      if (work.size) return stage.log('Còn thay đổi chưa commit. Hãy commit trước khi switch (hoặc git stash).', 'warn');
      if (!(b in refs)) { refs[b] = refs[head]; stage.log(`git switch -c ${b}: tạo branch tại ${commits[refs[head]].hash}`); }
      else stage.log(`git switch ${b}`);
      head = b;
    }
    function merge() {
      const other = head === 'main' ? 'feature' : 'main';
      if (!(other in refs)) return stage.log(`merge: ${other} - not something we can merge`, 'error');
      if (conflict) return stage.log('Đang merge dở: Resolve hoặc Abort trước', 'warn');
      const A = refs[head], B = refs[other];
      if (anc(A).has(B)) return stage.log('Already up to date.');
      if (anc(B).has(A)) { refs[head] = B; return stage.log(`Fast-forward: ${head} dời nhãn tới ${commits[B].hash}`); }
      const common = [...anc(A)].filter((id) => anc(B).has(id)), base = Math.max(...common);
      stage.log(`git merge ${other}  (merge-base ${commits[base].hash})`);
      const ours = changed(base, A), theirs = changed(base, B);
      const both = [...ours].filter((f) => theirs.has(f) && f !== 'Library/');
      const files = both.filter((f) => !(f.endsWith('.unity') && cfg.smart && (stage.log(`UnityYAMLMerge: ${f} gộp tự động (hai bên sửa GameObject khác nhau)`), true)));
      if (!files.length) { refs[head] = addCommit(head === 'main' ? 0 : 1, [A, B], [], `Merge branch '${other}'`).id; return stage.log(`Merge made by the 'ort' strategy. Merge commit ${commits[refs[head]].hash}`); }
      conflict = { files, other, A, B };
      files.forEach((f) => stage.log(`CONFLICT (content): Merge conflict in ${f}${f.endsWith('.psd') ? ' (file nhị phân, không merge được, phải chọn một bản)' : ''}`, 'error'));
      if (files.some((f) => f.endsWith('.unity'))) stage.log('Gợi ý: scene YAML rất khó sửa tay. Bật Smart Merge (UnityYAMLMerge).', 'warn');
    }

    stage.ui.group('Working directory');
    stage.ui.select('File', ['Player.cs', 'Level1.unity', 'Hero.psd'], cfg.file, (v) => (cfg.file = v));
    stage.ui.button('Sửa file', () => { if (conflict) return stage.log('Đang có conflict, hãy Resolve trước', 'warn'); work.add(cfg.file); stage.log(`modified: ${cfg.file}`); });
    stage.ui.button('git add + commit', () => commit(), { variant: 'primary' });
    stage.ui.group('Branch & merge');
    stage.ui.button('switch main', () => switchTo('main')); stage.ui.button('switch feature', () => switchTo('feature'));
    const mergeBtn = stage.ui.button('git merge feature', merge, { variant: 'accent' });
    stage.ui.button('Resolve + commit', () => {
      if (!conflict) return stage.log('Không có conflict nào', 'warn');
      const { A, B, other, files } = conflict; conflict = null;
      refs[head] = addCommit(head === 'main' ? 0 : 1, [A, B], [], `Merge branch '${other}'`).id;
      stage.log(`Đã sửa ${files.join(', ')} → merge commit ${commits[refs[head]].hash}`);
    });
    stage.ui.button('merge --abort', () => { if (conflict) { conflict = null; stage.log('git merge --abort: quay về trạng thái trước merge'); } });
    stage.ui.group('Unity + GitHub');
    stage.ui.toggle('.gitignore Library/', cfg.ignore, (v) => { cfg.ignore = v; stage.log(v ? 'Library/ được ignore' : 'Library/ sẽ bị commit (sai!)', v ? 'info' : 'warn'); });
    stage.ui.toggle('Git LFS cho *.psd', cfg.lfs, (v) => (cfg.lfs = v)); stage.ui.toggle('Smart Merge (UnityYAMLMerge)', cfg.smart, (v) => (cfg.smart = v));
    stage.ui.button('git push', () => {
      stage.log(`git push origin ${head}  (${fmt(repo)} trong .git)`);
      const reach = [...anc(refs[head])].map((id) => commits[id]);
      if (reach.some((c) => c.psdRaw)) stage.log('remote: warning: File Hero.psd is 85.00 MB; this is larger than GitHub\'s recommended maximum file size of 50.00 MB. Dùng Git LFS!', 'warn');
      if (reach.some((c) => c.files.includes('Library/'))) stage.log('Library/ bị đẩy lên remote: hàng nghìn file cache, clone rất chậm', 'error');
      origin[head] = refs[head];
      if (head !== 'main') stage.log(`remote: Create a pull request for '${head}' on GitHub: .../pull/new/${head}`);
    }, { variant: 'primary' });
    const sizeR = stage.ui.readout('Kích thước .git', fmt(repo));

    stage.onFrame((dt, t) => { t0 = t; mergeBtn.set(`git merge ${head === 'main' ? 'feature' : 'main'}`); sizeR.set(fmt(repo)); render(t, dt); });

    function render(t, dt) {
      const { w, h } = stage;
      d.clear(w, h); d.grid(w, h);
      d.text('COMMIT GRAPH', 16, 20, { font: 'mono', size: 11, weight: 700, color: C.muted });
      d.text(`HEAD → ${head}`, w - 16, 20, { align: 'right', font: 'mono', size: 12, weight: 700, color: C.navy });
      const gx = 84, gh = Math.min(200, h * 0.42), laneY = [52 + gh * 0.38, 52 + gh * 0.82];
      const dx = U.clamp((w - gx - 40) / Math.max(commits.length, 5), 34, 90), shift = Math.max(0, commits.length * dx - (w - gx - 40));
      const cx = (c) => gx + c.id * dx - shift + dx / 2, cy = (c) => laneY[c.lane];
      ['main', 'feature'].forEach((b, i) => { if (b in refs || i === 0) { d.line(gx - 6, laneY[i], w - 12, laneY[i], { stroke: C.lineSoft, lw: 1, dash: [3, 5] }); d.text(b, 14, laneY[i], { font: 'mono', size: 12, weight: 700, color: LANE_COL[i] }); } });
      const ctx = d.ctx;
      commits.forEach((c) => c.parents.forEach((pid) => {
        const p = commits[pid], x1 = cx(p), y1 = cy(p), x2 = cx(c), y2 = cy(c);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
        ctx.strokeStyle = LANE_COL[c.parents.length > 1 && pid !== c.parents[0] ? p.lane : c.lane]; ctx.lineWidth = 3; ctx.stroke();
      }));
      commits.forEach((c) => {
        const x = cx(c), y = cy(c); if (x < gx - 20) return;
        const s = U.ease.outBack(U.clamp((t - c.born) * 2.5, 0, 1)), r = 10 * s;
        d.circle(x, y, r, { fill: c.parents.length > 1 ? C.paper : LANE_COL[c.lane], stroke: LANE_COL[c.lane], lw: 3, shadow: 4 });
        if (c.files.includes('Library/')) d.circle(x, y, r + 5, { stroke: C.red, lw: 2, dash: [3, 3] });
        d.text(c.hash.slice(0, dx > 60 ? 7 : 4), x, y + 22, { align: 'center', font: 'mono', size: 11, color: C.muted });
      });
      // Ref labels (lerped)
      const stack = {};
      const refList = [['main', refs.main, C.blue], ...(refs.feature != null ? [['feature', refs.feature, C.purple]] : []), ...Object.keys(origin).map((b) => ['origin/' + b, origin[b], C.faint])];
      refList.forEach(([name, id, col]) => {
        const c = commits[id], n = (stack[id] = (stack[id] || 0) + 1), tx = cx(c), ty = cy(c) - 22 - (n - 1) * 22;
        const rd = (refDisp[name] = refDisp[name] || { x: tx, y: ty }), k = 1 - Math.exp(-(dt || 0.016) * 10);
        rd.x = U.lerp(rd.x, tx, k); rd.y = U.lerp(rd.y, ty, k);
        d.pill((name === head ? 'HEAD→' : '') + name, rd.x, rd.y, { align: 'center', fill: col, size: 11 });
      });
      // Bottom: working dir + log
      const by = 52 + gh + 26, bh = h - by - 12, two = w >= 620, ww = two ? (w - 36) * 0.5 : w - 24;
      d.node(12, by, ww, bh, null, { accent: conflict ? C.red : work.size ? C.orange : C.line, shadow: 4 });
      d.text(`On branch ${head}${conflict ? ' · MERGING' : ''}`, 24, by + 18, { font: 'mono', size: 12, weight: 700, color: conflict ? C.red : C.navy });
      const rows = ['Player.cs', 'Level1.unity', 'Hero.psd', 'Library/'];
      rows.forEach((f, i) => {
        const y = by + 42 + i * 21; if (y > by + bh - 10) return;
        const lib = f === 'Library/', cf = conflict && conflict.files.includes(f);
        const st = lib ? (cfg.ignore ? '!!' : '??') : cf ? 'UU' : work.has(f) ? ' M' : '  ';
        const col = cf ? C.red : lib ? (cfg.ignore ? C.faint : C.red) : work.has(f) ? C.orange : C.muted;
        d.text(st, 24, y, { font: 'mono', size: 12, weight: 700, color: col });
        d.text(f + (lib ? (cfg.ignore ? '  (ignored)' : '  (untracked, 3,214 file)') : f === 'Hero.psd' && cfg.lfs ? '  [LFS]' : ''), 50, y, { font: 'mono', size: 12, color: cf ? C.red : C.navy });
      });
      if (conflict && bh > 160) {
        const f = conflict.files[0], unity = f.endsWith('.unity'), y0 = by + 42 + rows.length * 21 + 4;
        const lines = ['<<<<<<< HEAD', unity ? '  m_Intensity: 1.2' : '  speed = 7f;', '=======', unity ? '  m_Name: Enemy' : '  speed = 5f;', `>>>>>>> ${conflict.other}`];
        lines.forEach((ln, i) => { if (y0 + i * 16 < by + bh - 8) d.text(ln, 24, y0 + i * 16, { font: 'mono', size: 11, color: i % 2 === 0 ? C.red : C.navy }); });
      }
      if (!two) return;
      const lx = 24 + ww;
      d.node(lx, by, ww, bh, null, { accent: C.line, shadow: 4 });
      d.text('git log --oneline', lx + 12, by + 18, { font: 'mono', size: 12, weight: 700, color: C.navy });
      ctx.save(); ctx.beginPath(); ctx.rect(lx + 4, by, ww - 8, bh); ctx.clip();
      commits.slice(-Math.max(1, Math.floor((bh - 40) / 20))).reverse().forEach((c, i) => {
        const tags = refList.filter((r) => r[1] === c.id).map((r) => (r[0] === head ? 'HEAD -> ' : '') + r[0]).join(', ');
        const y = by + 42 + i * 20, hw = d.measure(c.hash + ' ', { font: 'mono', size: 11 });
        d.text(c.hash, lx + 12, y, { font: 'mono', size: 11, color: C.orange });
        const tw = tags ? d.measure(`(${tags}) `, { font: 'mono', size: 11, weight: 700 }) : 0;
        if (tags) d.text(`(${tags})`, lx + 12 + hw, y, { font: 'mono', size: 11, weight: 700, color: C.teal });
        d.text(c.msg, lx + 12 + hw + tw, y, { font: 'mono', size: 11, color: C.navy });
      });
      ctx.restore();
    }
  },
});
