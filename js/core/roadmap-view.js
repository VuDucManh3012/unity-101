/* Home: hero + the roadmap drawn as section bands around a central spine.
 * Nodes alternate left/right like the original roadmap image. */
window.U101 = window.U101 || {};

U101.renderRoadmap = function (root) {
  const P = U101.progress;
  const total = U101.lessons.length, done = P.total();
  const firstTodo = U101.lessons.find((l) => !P.isDone(l.id)) || U101.lessons[0];

  const bands = U101.sections.map((s, si) => {
    const lessons = U101.lessons.filter((l) => l.section === s.id);
    const nodes = [...new Set(lessons.map((l) => l.node))];
    const nodeHtml = nodes.map((n, ni) => {
      const ls = lessons.filter((l) => l.node === n);
      const topics = [...new Set(ls.flatMap((l) => l.topics))];
      const side = (ni + si) % 2 ? 'right' : 'left';
      const chips = ls.map((l) => `
        <a class="rm-lesson ${P.isDone(l.id) ? 'is-done' : ''}" href="#/lesson/${l.id}">
          <span class="rm-check">${P.isDone(l.id) ? '✓' : ''}</span>${l.title}
        </a>`).join('');
      return `
        <div class="rm-node rm-${side}">
          <div class="rm-node-head"><span class="rm-node-box">${n}</span></div>
          <div class="rm-node-body">
            <div class="rm-lessons">${chips}</div>
            <div class="rm-topics">${topics.map((t) => `<span>${t}</span>`).join('')}</div>
          </div>
        </div>`;
    }).join('');
    return `
      <section class="rm-band" style="--accent:${s.color};--tint:${s.tint}">
        <header class="rm-band-head">
          <h2>${s.title}</h2><p>${s.vi}</p>
          <span class="rm-band-count">${P.countIn(s.id)}/${lessons.length} bài</span>
        </header>
        <div class="rm-nodes">${nodeHtml}</div>
      </section>`;
  }).join('');

  root.innerHTML = `
    <div class="hero">
      <div class="hero-text">
        <p class="eyebrow"><span class="dot"></span>Lộ trình tương tác · ${total} bài · ${U101.sections.length} chặng</p>
        <h1>Học Unity bằng cách <em>tự tay thử</em></h1>
        <p class="lead">Mỗi bài là một mô phỏng nhỏ chạy ngay trên trình duyệt: kéo slider, bấm nút, quan sát Console, rồi đọc code C# tương ứng trong Unity. Đi từ C# cơ bản đến kiến trúc, profiling và build.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="#/lesson/${firstTodo.id}">${done ? 'Học tiếp' : 'Bắt đầu'}: ${firstTodo.title} →</a>
          <span class="hero-progress"><b>${done}</b>/${total} bài đã xong</span>
        </div>
      </div>
      <div class="hero-legend">
        ${U101.sections.map((s) => `<a href="#/lesson/${U101.lessons.find((l) => l.section === s.id).id}" style="--accent:${s.color}"><span class="dot"></span>${s.title}<small>${P.countIn(s.id)}/${U101.lessons.filter((l) => l.section === s.id).length}</small></a>`).join('')}
      </div>
    </div>
    <div class="roadmap">
      <div class="rm-root"><b>Unity Developer</b> Roadmap</div>
      ${bands}
    </div>`;
};
