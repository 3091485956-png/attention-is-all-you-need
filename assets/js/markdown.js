/* Tiny, safe Markdown renderer for tutor messages.
   All input is escaped first; only generated tags are emitted.
   Math is kept as [data-tex] nodes and typeset with KaTeX by MD.typeset(). */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(url) {
    const u = String(url || '').trim();
    if (/^https?:\/\//i.test(u)) return u;
    if (/^mailto:/i.test(u)) return u;
    return null;
  }

  // inline formatting on already-escaped text
  function inline(escaped, mathStore) {
    let s = escaped;
    // inline math placeholders restored last
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      const href = safeUrl(url.replace(/&amp;/g, '&'));
      if (!href) return label;
      return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>';
    });
    s = s.replace(/\u0000M(\d+)\u0000/g, function (m, i) {
      const item = mathStore[Number(i)];
      if (!item) return '';
      return '<span class="md-math" data-tex="' + escapeHtml(item.tex) + '"' +
        (item.display ? ' data-display="1"' : '') + '></span>';
    });
    return s;
  }

  function extractMath(text, store) {
    let out = String(text).replace(/\r\n?/g, '\n');
    // fenced code blocks are protected separately by caller
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, function (m, tex) {
      store.push({ tex: tex.trim(), display: true });
      return '\u0000M' + (store.length - 1) + '\u0000';
    });
    out = out.replace(/(^|[^\\$])\$([^$\n]+?)\$(?!\d)/g, function (m, pre, tex) {
      store.push({ tex: tex.trim(), display: false });
      return pre + '\u0000M' + (store.length - 1) + '\u0000';
    });
    return out;
  }

  function paragraph(lines, store) {
    const html = lines.map((line) => inline(escapeHtml(extractMath(line, store)), store)).join('<br>');
    return '<p>' + html + '</p>';
  }

  function renderList(items, ordered, store) {
    const tag = ordered ? 'ol' : 'ul';
    const body = items.map(function (it) {
      return '<li>' + inline(escapeHtml(extractMath(it, store)), store) + '</li>';
    }).join('');
    return '<' + tag + '>' + body + '</' + tag + '>';
  }

  function render(text) {
    if (text == null) return '';
    const src = String(text).replace(/\r\n?/g, '\n');
    const store = [];

    // 1. pull out fenced code
    const codes = [];
    const work = src.replace(/```([a-zA-Z0-9+#.-]*)\n?([\s\S]*?)```/g, function (m, lang, code) {
      codes.push({ lang: lang || '', code: code.replace(/\n$/, '') });
      return '\u0000C' + (codes.length - 1) + '\u0000';
    });

    const lines = work.split('\n');
    const out = [];
    let buf = [];
    let list = null;
    let quote = [];

    function flushParagraph() {
      if (!buf.length) return;
      out.push(paragraph(buf, store));
      buf = [];
    }
    function flushList() {
      if (!list) return;
      out.push(renderList(list.items, list.ordered, store));
      list = null;
    }
    function flushQuote() {
      if (!quote.length) return;
      out.push('<blockquote>' + quote.map(function (l) {
        return paragraph([l], store);
      }).join('') + '</blockquote>');
      quote = [];
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if ((list || quote.length) && !trimmed) {
        flushList(); flushQuote(); continue;
      }
      if (!trimmed) { flushParagraph(); continue; }

      // code placeholder as its own block
      if (/^\u0000C\d+\u0000$/.test(trimmed)) {
        flushParagraph(); flushList(); flushQuote();
        const idx = Number(trimmed.replace(/\u0000C|\u0000/g, ''));
        const c = codes[idx];
        out.push('<pre><code>' + escapeHtml(c.code) + '</code></pre>');
        continue;
      }

      let m;
      if ((m = trimmed.match(/^(#{1,4})\s+(.*)$/))) {
        flushParagraph(); flushList(); flushQuote();
        const level = Math.min(m[1].length + 2, 6);
        out.push('<h' + level + '>' + inline(escapeHtml(extractMath(m[2], store)), store) + '</h' + level + '>');
        continue;
      }
      if (/^>\s?/.test(trimmed)) {
        flushParagraph(); flushList();
        quote.push(trimmed.replace(/^>\s?/, ''));
        continue;
      }
      if ((m = trimmed.match(/^[-*+]\s+(.*)$/))) {
        flushParagraph(); flushQuote();
        if (!list || list.ordered) { flushList(); list = { items: [], ordered: false }; }
        list.items.push(m[1]);
        continue;
      }
      if ((m = trimmed.match(/^\d+[.)]\s+(.*)$/))) {
        flushParagraph(); flushQuote();
        if (!list || !list.ordered) { flushList(); list = { items: [], ordered: true }; }
        list.items.push(m[1]);
        continue;
      }
      if ((m = trimmed.match(/^(-{3,}|\*{3,}|_{3,})$/))) {
        flushParagraph(); flushList(); flushQuote();
        continue;
      }
      // continuation of list item
      if (list && /^\s{2,}\S/.test(line)) {
        list.items[list.items.length - 1] += ' ' + trimmed;
        continue;
      }
      flushList(); flushQuote();
      buf.push(line);
    }
    flushParagraph(); flushList(); flushQuote();

    return out.join('\n');
  }

  function typeset(root) {
    if (!root) return;
    const nodes = root.querySelectorAll('[data-tex]');
    if (!nodes.length) return;
    if (!window.katex || typeof window.katex.render !== 'function') return;
    nodes.forEach(function (el) {
      const tex = el.getAttribute('data-tex') || '';
      if (!tex) return;
      try {
        window.katex.render(tex, el, {
          displayMode: el.getAttribute('data-display') === '1',
          throwOnError: false,
          strict: false,
          trust: false,
        });
      } catch (e) {
        el.textContent = tex;
      }
    });
  }

  window.MD = { render: render, typeset: typeset, escape: escapeHtml };
})();
