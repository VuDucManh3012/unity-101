/* Tiny C# syntax highlighter (comments, strings, keywords, types, numbers, methods). */
window.U101 = window.U101 || {};

U101.highlightCSharp = (function () {
  const KW = new Set(('abstract as async await base bool break byte case catch char class const continue decimal default delegate do double else enum event explicit false finally float for foreach get if implicit in int interface internal is lock long namespace new null object out override params private protected public readonly ref return sealed set short static string struct switch this throw true try typeof uint ulong using var virtual void volatile while yield where').split(' '));
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)')|(\[[A-Z]\w*(?:\([^\]\n]*\))?\])|\b(\d+(?:\.\d+)?f?)\b|\b([A-Za-z_]\w*)\b(?=\s*\()|\b([A-Za-z_]\w*)\b/g;

  return function (code) {
    let out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(code))) {
      out += esc(code.slice(last, m.index));
      const [tok, com, str, attr, num, fn, word] = m;
      if (com) out += `<span class="tk-com">${esc(com)}</span>`;
      else if (str) out += `<span class="tk-str">${esc(str)}</span>`;
      else if (attr) out += `<span class="tk-attr">${esc(attr)}</span>`;
      else if (num) out += `<span class="tk-num">${num}</span>`;
      else if (fn) out += KW.has(fn) ? `<span class="tk-kw">${fn}</span>` : `<span class="tk-fn">${fn}</span>`;
      else if (word) out += KW.has(word) ? `<span class="tk-kw">${word}</span>` : /^[A-Z]/.test(word) ? `<span class="tk-type">${word}</span>` : word;
      else out += esc(tok);
      last = TOKEN.lastIndex;
    }
    return out + esc(code.slice(last));
  };
})();
