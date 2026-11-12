/* Lesson page: header, Scene stage + Inspector + Console, and the tabbed lesson panel. */
window.U101 = window.U101 || {};

U101.lessonView = (function () {
  const $ = (sel) => document.querySelector(sel);
  let stage = null, cleanup = null, currentId = null, currentDef = null;

  function unmount() {
    try { cleanup && cleanup(); } catch (e) { console.error(e); }
    stage && stage.destroy();
    stage = cleanup = null;
  }

  function mountStage(def) {
    unmount();
    stage = U101.createStage({ canvas: $('#scene-canvas'), inspector: $('#inspector'), consoleEl: $('#console'), hintEl: $('#scene-hint') });
    stage.setHint(def.hint || '');
    try { const r = def.mount(stage); if (typeof r === 'function') cleanup = r; } catch (e) { console.error(e); stage.log('Lỗi khi khởi tạo mô phỏng: ' + e.message, 'error'); }
    if (!$('#inspector').children.length) $('#inspector').innerHTML = '<p class="muted">Tương tác trực tiếp trên Scene.</p>';
    stage.start();
    setPaused(false);
  }

  function setPaused(p) {
    if (!stage) return;
    stage.paused = p;
    $('#btn-play').classList.toggle('is-paused', p);
    $('#btn-play').setAttribute('aria-label', p ? 'Tiếp tục' : 'Tạm dừng');
  }

  /* Highlight only C#-like sources (.cs/.shader/.hlsl); others (.gitignore, terminal) render as plain text. */
  function renderCodeSource(c) {
    const src = c.source.replace(/^\n/, '');
    const isCode = !c.title || /\.(cs|shader|hlsl)\b/.test(c.title);
    return isCode ? U101.highlightCSharp(src) : src.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderPanel(meta, def) {
    const codes = def.code ? (Array.isArray(def.code) ? def.code : [def.code]) : [];
    const codeHtml = codes.map((c) => `
      <figure class="code-block"><figcaption><span class="file-dot"></span>${c.title || 'Example.cs'}</figcaption>
      <pre><code>${renderCodeSource(c)}</code></pre>${c.note ? `<p class="code-note">${c.note}</p>` : ''}</figure>`).join('');
    const keyPts = (def.keyPoints || []).map((k, i) => `<li><span class="kp-num">${i + 1}</span><div>${k}</div></li>`).join('');
    const tries = (def.tryIt || []).map((t, i) => `<li><label><input type="checkbox" data-try="${i}"><span>${t}</span></label></li>`).join('');
    const links = (def.links || []).map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a></li>`).join('');
    const topics = meta.topics.map((t) => `<span class="chip">${t}</span>`).join('');

    $('#tab-overview').innerHTML = `<div class="prose">${def.overview || ''}</div>${keyPts ? `<h3 class="panel-h">Ý chính</h3><ol class="key-points">${keyPts}</ol>` : ''}<div class="chips">${topics}</div>`;
    $('#tab-code').innerHTML = codeHtml || '<p class="muted">Chưa có code mẫu.</p>';
    $('#tab-try').innerHTML = tries ? `<p class="muted">Làm từng thử thách trên mô phỏng bên trái:</p><ol class="try-list">${tries}</ol>` : '<p class="muted">Không có thử thách.</p>';
    $('#tab-links').innerHTML = links ? `<ul class="link-list">${links}</ul>` : '<p class="muted">—</p>';
  }

  function renderHead(meta) {
    const sec = U101.sectionById(meta.section);
    const list = U101.lessons, idx = list.indexOf(meta);
    const inSec = list.filter((l) => l.section === meta.section);
    const prev = list[idx - 1], next = list[idx + 1];
    document.documentElement.style.setProperty('--accent', sec.color);
    $('#lesson-eyebrow').innerHTML = `<span class="dot"></span>${sec.title} · ${meta.node} · Bài ${inSec.indexOf(meta) + 1}/${inSec.length}`;
    $('#lesson-title').textContent = meta.title;
    $('#lesson-prev').href = prev ? '#/lesson/' + prev.id : '#/';
    $('#lesson-prev').textContent = prev ? '← ' + prev.title : '← Bản đồ';
    $('#lesson-next').href = next ? '#/lesson/' + next.id : '#/';
    $('#lesson-next').textContent = next ? next.title + ' →' : 'Hoàn thành lộ trình →';
    syncDone();
  }

  function syncDone() {
    const done = currentId && U101.progress.isDone(currentId);
    $('#btn-done').classList.toggle('is-done', !!done);
    $('#btn-done').textContent = done ? '✓ Đã hoàn thành' : 'Đánh dấu hoàn thành';
  }

  function selectTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = p.id !== 'tab-' + name));
  }

  function bindOnce() {
    document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => selectTab(t.dataset.tab)));
    $('#btn-done').addEventListener('click', () => { U101.progress.toggle(currentId); syncDone(); });
    $('#btn-reset').addEventListener('click', () => currentDef && mountStage(currentDef));
    $('#btn-play').addEventListener('click', () => setPaused(!stage?.paused));
    $('#btn-clear-log').addEventListener('click', () => stage && stage.clearLog());
  }

  async function show(id) {
    const meta = U101.lessonById(id);
    if (!meta) { location.hash = '#/'; return; }
    currentId = id; currentDef = null;
    renderHead(meta);
    selectTab('overview');
    $('#lesson-lead').textContent = 'Đang tải…';
    try {
      const def = await U101.loadLesson(id);
      if (currentId !== id) return; // user navigated away while loading
      currentDef = def;
      $('#lesson-lead').textContent = def.lead || '';
      renderPanel(meta, def);
      mountStage(def);
    } catch (err) {
      unmount();
      $('#lesson-lead').textContent = err.message;
      ['overview', 'code', 'try', 'links'].forEach((t) => ($('#tab-' + t).innerHTML = ''));
    }
  }

  return { show, unmount, bindOnce };
})();
