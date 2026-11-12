/* Left sidebar: brand, overall progress, lessons grouped by roadmap section. */
window.U101 = window.U101 || {};

U101.renderSidebar = function (root, activeId) {
  const P = U101.progress;
  const total = U101.lessons.length, done = P.total();
  const activeSection = activeId ? U101.lessonById(activeId)?.section : null;

  const sections = U101.sections.map((s) => {
    const lessons = U101.lessons.filter((l) => l.section === s.id);
    const items = lessons.map((l, i) => `
      <li><a href="#/lesson/${l.id}" class="nav-lesson ${l.id === activeId ? 'is-active' : ''} ${P.isDone(l.id) ? 'is-done' : ''}">
        <span class="nav-num">${P.isDone(l.id) ? '✓' : i + 1}</span>
        <span class="nav-title">${l.title}</span>
      </a></li>`).join('');
    const open = !activeSection || activeSection === s.id;
    return `
      <details class="nav-section" ${open ? 'open' : ''} style="--accent:${s.color}">
        <summary>
          <span class="nav-dot"></span>
          <span class="nav-section-title">${s.title}<small>${s.vi}</small></span>
          <span class="nav-count">${P.countIn(s.id)}/${lessons.length}</span>
        </summary>
        <ol>${items}</ol>
      </details>`;
  }).join('');

  root.innerHTML = `
    <a class="brand" href="#/">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="32" height="32"><path d="M16 3 28 10v12l-12 7L4 22V10z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M16 3v13m0 0 12-6M16 16 4 10m12 6v13" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>
      </span>
      <span><b>Unity 101</b><small>Khám phá · Thử nghiệm · Xây dựng</small></span>
    </a>
    <div class="overall">
      <div class="overall-row"><span>Tiến độ</span><b>${done}/${total}</b></div>
      <div class="bar"><span style="width:${(done / total) * 100}%"></span></div>
    </div>
    <a class="nav-home ${activeId ? '' : 'is-active'}" href="#/">◎ Bản đồ lộ trình</a>
    <nav class="nav">${sections}</nav>
    <div class="sidebar-foot">Dựa trên <a href="https://github.com/chav0/unity-developer-roadmap" target="_blank" rel="noopener">Unity Developer Roadmap</a></div>`;
};
