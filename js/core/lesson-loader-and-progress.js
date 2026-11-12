/* Lesson registry (lazy script loading, works from file://) + progress persisted in localStorage. */
window.U101 = window.U101 || {};

U101.registry = {};

/* Called by each lesson file: U101.defineLesson('id', { lead, overview, code, tryIt, links, hint, mount }) */
U101.defineLesson = function (id, def) { U101.registry[id] = def; };

U101.loadLesson = function (id) {
  if (U101.registry[id]) return Promise.resolve(U101.registry[id]);
  const meta = U101.lessonById(id);
  if (!meta) return Promise.reject(new Error('Không tìm thấy bài: ' + id));
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `js/lessons/${meta.section}/${id}.js`;
    s.onload = () => (U101.registry[id] ? resolve(U101.registry[id]) : reject(new Error('File bài học không gọi defineLesson')));
    s.onerror = () => reject(new Error('Bài học này đang được biên soạn'));
    document.head.appendChild(s);
  });
};

U101.progress = (function () {
  const KEY = 'u101.done.v1';
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { /* storage blocked: progress lives in memory only */ }
  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch (e) { /* ignore */ }
    listeners.forEach((fn) => fn());
  }
  return {
    isDone: (id) => done.has(id),
    toggle(id) { done.has(id) ? done.delete(id) : done.add(id); save(); },
    countIn: (sectionId) => U101.lessons.filter((l) => l.section === sectionId && done.has(l.id)).length,
    total: () => U101.lessons.filter((l) => done.has(l.id)).length,
    onChange: (fn) => listeners.push(fn),
  };
})();
