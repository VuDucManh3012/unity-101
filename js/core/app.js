/* App bootstrap: hash router (#/ and #/lesson/<id>), sidebar refresh, clock, mobile drawer. */
(function () {
  const $ = (sel) => document.querySelector(sel);

  function route() {
    const m = location.hash.match(/^#\/lesson\/([\w-]+)/);
    const id = m ? m[1] : null;
    document.body.classList.remove('nav-open');
    U101.renderSidebar($('#sidebar'), id);
    $('#view-home').hidden = !!id;
    $('#view-lesson').hidden = !id;
    if (id) {
      const meta = U101.lessonById(id);
      $('#crumb').textContent = meta ? `${U101.sectionById(meta.section).title} / ${meta.title}` : '';
      document.title = meta ? `${meta.title} · Unity 101` : 'Unity 101';
      U101.lessonView.show(id);
    } else {
      U101.lessonView.unmount();
      document.documentElement.style.removeProperty('--accent');
      $('#crumb').textContent = 'Bản đồ lộ trình';
      document.title = 'Unity 101 · Lộ trình Unity Developer';
      U101.renderRoadmap($('#view-home'));
    }
    window.scrollTo(0, 0);
  }

  function tickClock() {
    const d = new Date();
    $('#clock-date').textContent = d.toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    $('#clock-time').textContent = d.toTimeString().slice(0, 8);
  }

  U101.progress.onChange(() => {
    const m = location.hash.match(/^#\/lesson\/([\w-]+)/);
    U101.renderSidebar($('#sidebar'), m ? m[1] : null);
  });

  window.addEventListener('hashchange', route);
  $('#btn-menu').addEventListener('click', () => document.body.classList.toggle('nav-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
  U101.lessonView.bindOnce();
  tickClock(); setInterval(tickClock, 1000);
  route();
  requestAnimationFrame(() => document.documentElement.classList.remove('is-loading'));
})();
