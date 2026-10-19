/* =========================================================================
   Attention 注疏本 — reader, router, quiz, marginalia
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* ---------- data ---------- */
  var PAPER_RAW = window.PAPER || { meta: { authors: [] }, abstract: { html: '', notes: [] }, sections: [] };
  var NOTES = Object.assign({}, window.NOTES_A || {}, window.NOTES_B || {}, window.NOTES_C || {});
  var EXTRA_NOTES = window.NOTES_D || {};
  Object.keys(EXTRA_NOTES).forEach(function (k) {
    if (!NOTES[k]) { NOTES[k] = EXTRA_NOTES[k]; return; }
    NOTES[k].notes = (NOTES[k].notes || []).concat(EXTRA_NOTES[k].notes || []);
  });
  var PRIMER = [].concat(
    (window.PRIMER_1 || {}).lessons || [],
    (window.PRIMER_2 || {}).lessons || []
  );
  var PREVIEW = (window.PREVIEW || {}).parts || [];

  var SMETA = {
    abstract: { no: '〇', cn: '摘要', en: 'Abstract' },
    S1: { no: '一', cn: '引言', en: '1 Introduction' },
    S2: { no: '二', cn: '背景', en: '2 Background' },
    S3: { no: '三', cn: '模型架构', en: '3 Model Architecture' },
    S4: { no: '四', cn: '为什么是自注意力', en: '4 Why Self-Attention' },
    S5: { no: '五', cn: '训练', en: '5 Training' },
    S6: { no: '六', cn: '结果', en: '6 Results' },
    S7: { no: '七', cn: '结论', en: '7 Conclusion' },
    Sx1: { no: '附', cn: '附录：注意力可视化', en: 'Attention Visualizations' },
    bib: { no: '参', cn: '参考文献', en: 'References' }
  };
  var PAPER_IDS = ['abstract', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'Sx1', 'bib'];

  var FACSIMILE = {
    1: '题名与摘要',
    2: '引言',
    3: '模型架构',
    4: '缩放点积注意力与多头注意力',
    5: '注意力的三种用法、前馈、位置编码',
    6: '为什么是自注意力',
    7: '训练',
    8: '结果',
    9: '模型变体',
    10: '句法分析与结论',
    11: '参考文献',
    12: '参考文献',
    13: '附录：注意力可视化',
    14: '附录：注意力可视化',
    15: '附录：注意力可视化'
  };
  var PAGE_MAP = {
    abstract: [1], S1: [2], S2: [2], S3: [3, 4, 5], S4: [6, 7],
    S5: [7], S6: [8, 9, 10], S7: [10], bib: [11, 12], Sx1: [13, 14, 15]
  };

  var VOLUMES = {
    primer: {
      kicker: '卷一', title: '基础', en: 'Foundations',
      lead: '在读论文之前，把那些被默认你已经会了的东西补齐：向量、点积、矩阵乘法、softmax、线性投影、残差与层归一化、正弦位置编码。每一课只做一件事，并且都能在纸上跟着算。',
      hint: '建议顺序阅读。每课末尾有练习，答完再走。'
    },
    preview: {
      kicker: '卷二', title: '预习', en: 'Orientation',
      lead: '先把整篇论文的地图摊开：一句话怎样穿过 Transformer，作者在反对什么，注意力到底在算什么，八个头各自在看什么，没有循环时顺序从哪来，以及作者用哪些表和数据说服读者。',
      hint: '读完这一卷，你会知道每一节该期待什么。'
    },
    paper: {
      kicker: '卷三', title: '原文注疏', en: 'The Paper, Annotated',
      lead: '英文原文一字不改地照录，中文注疏写在页边。先读原文那一段，再看旁边的编号注：它解释这句英文的意思、背后的数学动作，以及最容易误会的地方。每节末尾有练习。',
      hint: '左侧编号与正文里的上标数字一一对应。原文可对照 arXiv 影印页。'
    }
  };

  /* ---------- progress ---------- */
  var PKEY = 'annotated-progress-v1';
  var SKEY = 'annotated-last-section';
  var progress = new Set();
  try {
    var stored = JSON.parse(localStorage.getItem(PKEY) || '[]');
    if (Array.isArray(stored)) progress = new Set(stored.filter(function (x) { return typeof x === 'string'; }));
  } catch (e) { /* ignore */ }
  function saveProgress() {
    try { localStorage.setItem(PKEY, JSON.stringify(Array.from(progress))); } catch (e) { /* ignore */ }
  }
  function isRead(key) { return progress.has(key); }
  function markRead(key) { progress.add(key); saveProgress(); }

  var state = {
    view: 'cover', id: null, lastPaperKey: null, gloss: null, quizCleanup: null, chat: null
  };
  try { state.lastPaperKey = localStorage.getItem(SKEY) || null; } catch (e) { /* ignore */ }

  /* ---------- helpers ---------- */
  function countMinutes(item) {
    var m = item.minutes || 0;
    if (m) return m + ' 分钟';
    var chars = 0;
    (item.blocks || []).forEach(function (b) {
      if (b.t === 'p' || b.t === 'h') chars += String(b.h || '').replace(/<[^>]+>/g, '').length;
      if (b.t === 'list') chars += (b.items || []).join('').length;
    });
    return Math.max(3, Math.round(chars / 320)) + ' 分钟';
  }
  function paperData(id) {
    if (id === 'abstract') {
      return { id: id, html: (PAPER_RAW.abstract || {}).html || '', notes: (PAPER_RAW.abstract || {}).notes || [] };
    }
    var s = (PAPER_RAW.sections || []).filter(function (x) { return x.id === id; })[0];
    return s ? { id: id, html: s.html, notes: s.notes || [] } : null;
  }
  function paperMeta(id) {
    var base = Object.assign({ id: id, no: '', cn: id, en: id }, SMETA[id] || {});
    var n = NOTES[id] || {};
    if (n.cnTitle && !/^第\s*\d+\s*节/.test(n.cnTitle)) base.cn = n.cnTitle;
    if (n.kicker) base.kicker = n.kicker;
    return base;
  }
  function collection(kind) {
    return kind === 'primer' ? PRIMER : kind === 'preview' ? PREVIEW : [];
  }
  function partItems(kind) {
    if (kind === 'paper') {
      return PAPER_IDS.map(function (id) { return paperMeta(id); });
    }
    return collection(kind);
  }
  function findItem(kind, id) {
    if (kind === 'paper') {
      var p = paperData(id);
      if (!p) return null;
      return Object.assign({}, p, paperMeta(id));
    }
    return collection(kind).filter(function (x) { return x.id === id; })[0] || null;
  }
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

  /* ---------- blocks ---------- */
  function renderBlocks(blocks) {
    return (blocks || []).map(renderBlock).join('\n');
  }
  function renderBlock(b) {
    if (!b || !b.t) return '';
    switch (b.t) {
      case 'p':
        return '<p>' + (b.h || '') + '</p>';
      case 'h':
        return '<h4>' + (b.h || '') + '</h4>';
      case 'quote':
        return '<blockquote>' + (b.h || '') + (b.cite ? '<cite>' + b.cite + '</cite>' : '') + '</blockquote>';
      case 'math':
        return '<div class="math-block"><div class="math-tex">' + esc(b.tex) + '</div>' +
          (b.label ? '<span class="math-label">' + esc(b.label) + '</span>' : '') +
          (b.note ? '<p class="math-note">' + b.note + '</p>' : '') + '</div>';
      case 'list':
        var tag = b.ordered ? 'ol' : 'ul';
        return '<' + tag + '>' + (b.items || []).map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</' + tag + '>';
      case 'callout':
        var tone = b.tone === 'key' ? ' callout--key' : b.tone === 'warn' ? ' callout--warn' : '';
        return '<div class="callout' + tone + '">' +
          (b.title ? '<p class="callout__title">' + esc(b.title) + '</p>' : '') +
          '<p>' + (b.h || '') + '</p></div>';
      case 'table':
        return '<div class="table-wrap"><table>' +
          (b.caption ? '<caption>' + b.caption + '</caption>' : '') +
          (b.head ? '<thead><tr>' + b.head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' : '') +
          '<tbody>' + (b.rows || []).map(function (row) {
            return '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>';
      case 'figure':
        return '<figure class="fig' + (b.width === 'narrow' ? ' fig--narrow' : '') + '">' +
          '<div class="fig__frame"><img src="' + esc(b.src) + '" alt="' + esc(b.alt || '') + '" loading="lazy"></div>' +
          (b.caption ? '<figcaption>' + b.caption +
            (b.credit ? '<span class="figure-credit">' + esc(b.credit) + '</span>' : '') + '</figcaption>' : '') +
          '</figure>';
      case 'widget':
        return '<div class="widget-slot" data-widget="' + esc(b.id) + '" data-caption="' + esc(b.caption || '') + '"></div>';
      case 'defs':
        return '<div class="defs">' + (b.items || []).map(function (d) {
          return '<div class="defs__item"><p class="defs__term">' + esc(d.term) +
            (d.en ? '<em>' + esc(d.en) + '</em>' : '') + '</p>' +
            '<p class="defs__body">' + (d.h || '') + '</p></div>';
        }).join('') + '</div>';
      default:
        return '';
    }
  }

  function setupRich(root) {
    // KaTeX display math
    $$('.math-tex', root).forEach(function (el) {
      var tex = el.textContent || '';
      if (!window.katex || typeof window.katex.render !== 'function') { el.classList.add('math-raw'); return; }
      try {
        window.katex.render(tex, el, { displayMode: true, throwOnError: false, strict: false, trust: false });
      } catch (e) {
        el.classList.add('math-raw');
      }
    });
    // inline data-tex (from markdown) if any
    if (window.MD && window.MD.typeset) { try { window.MD.typeset(root); } catch (e) { /* ignore */ } }
    // widgets
    $$('.widget-slot', root).forEach(function (el) {
      var id = el.getAttribute('data-widget');
      var caption = el.getAttribute('data-caption') || '';
      if (window.Widgets && typeof window.Widgets.mount === 'function') {
        try { window.Widgets.mount(el, id, caption); } catch (e) { el.textContent = '互动组件暂时无法载入。'; }
      } else {
        el.textContent = '互动组件载入中……';
      }
    });
    // external links
    $$('a[href^="http"]', root).forEach(function (a) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  function setupReveal(root) {
    if (!('IntersectionObserver' in window)) return;
    var els = $$('.part-head .spread__body > *, .prose > *, .quiz > .quiz-item, .chapter, .volume__head .spread__body > *, .original__head .spread__body > *, .part-foot__body > *, .plates__head > *, .plates__grid > figure', root);
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i, 5) * 55) + 'ms';
      io.observe(el);
    });
  }

  /* ---------- cover ---------- */
  function renderCover() {
    var authors = (PAPER_RAW.meta && PAPER_RAW.meta.authors) || [];
    var names = authors.map(function (a) { return a.name; });
    var authorLine = names.length
      ? names.map(function (n) { return '<em>' + esc(n) + '</em>'; }).join(' · ')
      : '<em>Ashish Vaswani</em> · <em>Noam Shazeer</em> · <em>Niki Parmar</em> · <em>Jakob Uszkoreit</em> · <em>Llion Jones</em> · <em>Aidan N. Gomez</em> · <em>Łukasz Kaiser</em> · <em>Illia Polosukhin</em>';

    return '' +
      '<section class="cover wrap">' +
        '<div class="cover__colophon">' +
          '<span>底本 · arXiv:1706.03762v7 · 2017</span>' +
          '<span>Google Brain · Google Research · University of Toronto</span>' +
        '</div>' +
        '<figure class="cover__plate">' +
          '<div class="cover__plate-frame"><img src="assets/img/facsimile/cover-plate.jpg" alt="论文底本第一页影印：标题、作者与摘要开头" loading="eager"></div>' +
          '<figcaption>底本第一页 · arXiv 影印 · 点开可放大</figcaption>' +
        '</figure>' +
        '<div class="cover__grid">' +
          '<div class="cover__left">' +
            '<p class="cover__standfirst">一篇在 2017 年把循环与卷积从序列模型里拿掉的论文。这里不替你读，而是把每一句原文、每一个数学动作拆开——<strong>从向量与点积开始，一直读到附录的注意力图。</strong></p>' +
            '<div class="cover__actions">' +
              '<a class="btn" href="#/primer/vectors">开始阅读</a>' +
              '<a class="text-link" href="#/preview/map">先看地图 →</a>' +
              '<a class="text-link" href="#/paper/abstract">直接读原文 →</a>' +
            '</div>' +
            '<p class="cover__hint">四卷 · 原文照录 · 24 部分 · 每节练习</p>' +
          '</div>' +
          '<div class="cover__title">' +
            '<h1><span class="mask-line"><span>Attention</span></span><span class="mask-line"><span>Is All You Need</span></span></h1>' +
            '<p class="cover__cn">注意力就是你所需要的一切<span class="seal" aria-hidden="true">注</span></p>' +
            '<p class="cover__authors">' + authorLine + '</p>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="plates wrap" aria-labelledby="plates-title">' +
        '<header class="plates__head">' +
          '<h2 id="plates-title">四张图，先看论文长什么样</h2>' +
          '<p>左侧是原文第一页的影印。下面四幅是论文自带的图版：整体架构、缩放点积注意力、多头注意力，以及一页原版排版。点开可放大。读正文时它们会再次出现，并配有中文旁注。</p>' +
        '</header>' +
        '<div class="plates__grid">' +
          '<figure><div class="plates__frame"><img src="assets/img/paper/ModalNet-21.png" alt="论文图 1：Transformer 模型架构" loading="lazy"></div><figcaption><b>图 1</b>Transformer 模型架构</figcaption></figure>' +
          '<figure><div class="plates__frame"><img src="assets/img/paper/ModalNet-19.png" alt="论文图 2 左：缩放点积注意力" loading="lazy"></div><figcaption><b>图 2 · 左</b>缩放点积注意力</figcaption></figure>' +
          '<figure><div class="plates__frame"><img src="assets/img/paper/ModalNet-20.png" alt="论文图 2 右：多头注意力" loading="lazy"></div><figcaption><b>图 2 · 右</b>多头注意力</figcaption></figure>' +
          '<figure><div class="plates__frame"><img src="assets/img/facsimile/page-03.jpg" alt="论文原页第 3 页排版影印" loading="lazy"></div><figcaption><b>原页 3</b>模型架构一节的原版排版</figcaption></figure>' +
        '</div>' +
      '</section>';
  }

  /* ---------- volume index ---------- */
  function renderVolume(kind) {
    var vol = VOLUMES[kind];
    var items = partItems(kind);
    var keys = kind === 'paper' ? PAPER_IDS : items.map(function (x) { return x.id; });
    var readCount = keys.filter(function (k) { return isRead(kind + ':' + k); }).length;

    var rows = items.map(function (item, i) {
      var id = item.id;
      var key = kind + ':' + id;
      var read = isRead(key);
      var cn = kind === 'paper' ? item.cn : item.title;
      var en = kind === 'paper' ? item.en : (item.en || '');
      var lead = kind === 'paper' ? (NOTES[id] && NOTES[id].kicker) || '' : (item.lead || '');
      var meta = [];
      if (kind === 'paper') {
        var noteCount = ((NOTES[id] || {}).notes || []).length;
        var quizCount = ((NOTES[id] || {}).quiz || []).length;
        meta.push(id === 'bib' ? '文献' : '原文');
        meta.push('旁注 ' + noteCount);
        meta.push('练习 ' + quizCount);
      } else {
        meta.push(countMinutes(item));
        meta.push('练习 ' + ((item.quiz || []).length));
      }
      var no = kind === 'paper' ? item.no : (item.no || '');
      return '<li><a class="chapter" href="#/' + kind + '/' + esc(id) + '">' +
        '<span class="chapter__no">' + esc(no) + '</span>' +
        '<span class="chapter__main">' +
          '<span class="chapter__title">' + esc(cn) + (en ? '<span>' + esc(en) + '</span>' : '') + '</span>' +
          (lead ? '<span class="chapter__lead">' + esc(lead) + '</span>' : '') +
          '<span class="chapter__meta">' + meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') +
          (read ? '<span class="chapter__done">已读 ✓</span>' : '') +
          '</span>' +
        '</span></a></li>';
    }).join('');

    return '' +
      '<section class="volume wrap">' +
        '<header class="volume__head spread">' +
          '<div class="spread__margin">' +
            '<p class="running-head">' + esc(vol.kicker) + ' · ' + esc(vol.en) + '<span class="cn">' + esc(vol.title) + '</span></p>' +
            '<p class="part-no">' + esc(vol.kicker) + '</p>' +
          '</div>' +
          '<div class="spread__body">' +
            '<h1>' + esc(vol.title) + '</h1>' +
            '<p class="volume__en">' + esc(vol.en) + '</p>' +
            '<p class="volume__lead">' + esc(vol.lead) + '</p>' +
            '<p class="part-meta"><span>共 ' + items.length + ' 部分</span><span>已读 ' + readCount + ' / ' + keys.length + '</span></p>' +
          '</div>' +
        '</header>' +
        '<ol class="chapter-list">' + rows + '</ol>' +
        '<p class="volume__note">' + esc(vol.hint) + '</p>' +
        (kind === 'paper' ? '<p class="volume__note">底本全文照录，包括摘要、七节正文、参考文献与附录。原文中的脚注、图表、公式与表格均按 arXiv 版本保留；中文注疏与原文分开呈现。你可以随时打开 <a href="#/facsimile">影印原页</a> 对照 PDF。</p>' : '') +
      '</section>';
  }

  /* ---------- part head ---------- */
  function partHead(kind, item) {
    var vol = VOLUMES[kind];
    var isPaper = kind === 'paper';
    var quizCount = ((isPaper ? (NOTES[item.id] || {}).quiz : item.quiz) || []).length;
    var meta = [];
    if (isPaper) {
      meta.push('底本 ' + item.en);
      meta.push('旁注 ' + ((NOTES[item.id] || {}).notes || []).length);
      meta.push('练习 ' + quizCount);
      var pages = PAGE_MAP[item.id] || [];
      if (pages.length) meta.push('原页 ' + pages.join('、'));
    } else {
      meta.push(countMinutes(item));
      meta.push('练习 ' + quizCount);
    }
    return '<header class="part-head wrap spread">' +
      '<div class="spread__margin">' +
        '<p class="running-head">' + esc(vol.kicker) + ' · ' + esc(vol.en) + '<span class="cn">' + esc(vol.title) + '</span></p>' +
        '<p class="part-no">' + esc(isPaper ? item.no : (item.no || '')) + '</p>' +
      '</div>' +
      '<div class="spread__body">' +
        '<h1>' + esc(isPaper ? item.cn : item.title) + '</h1>' +
        '<p class="part-en">' + esc(isPaper ? item.en : (item.en || '')) + '</p>' +
        '<p class="part-lead">' + esc(isPaper ? (item.kicker || '') : (item.lead || '')) + '</p>' +
        '<p class="part-meta">' + meta.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('') + '</p>' +
      '</div>' +
    '</header>';
  }

  /* ---------- exercises ---------- */
  function renderQuiz(partKey, quiz) {
    if (!quiz || !quiz.length) return '';
    return '<section class="exercises" id="exercises">' +
      '<div class="wrap spread">' +
        '<div class="spread__margin">' +
          '<p class="running-head">Exercises<span class="cn">练习</span></p>' +
          '<p class="original__note" style="margin-top:18px">先自己写，再看答案。选择题会立刻给出解释；问答题可以交给 AI 按评分点批改，没有接 API 时也能展开参考答案自查。</p>' +
        '</div>' +
        '<div class="spread__body">' +
          '<div class="quiz" data-quiz-part="' + esc(partKey) + '">' +
            quiz.map(renderQuizItem).join('') +
            '<div class="quiz-progress"><span class="quiz-progress__label">完成 0 / ' + quiz.length + '</span><span class="quiz-progress__bar"><span></span></span></div>' +
            '<div class="quiz-done"><strong>练习完成。</strong>本部分已标记为已读。回到目录，或者继续下一部分。</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function renderQuizItem(q, i) {
    var type = q.type === 'choice' ? '选择' : '问答';
    var body = '';
    if (q.type === 'choice') {
      body = '<ul class="quiz-options">' + (q.options || []).map(function (o, oi) {
        return '<li><button type="button" class="quiz-option" data-i="' + oi + '"><span class="letter">' + String.fromCharCode(65 + oi) + '</span><span>' + o + '</span></button></li>';
      }).join('') + '</ul>';
    } else {
      body = '<div class="quiz-short"><div class="quiz-grade" data-quiz-id="' + esc(q.id) + '"></div></div>';
    }
    return '<div class="quiz-item" data-qid="' + esc(q.id) + '" data-type="' + esc(q.type) + '">' +
      '<div class="quiz-q"><span class="quiz-no">' + (i + 1) + '</span>' +
        '<p class="quiz-stem">' + (q.q || '') + '<span class="quiz-type">' + type + '</span></p>' +
      '</div>' + body +
      '<div class="quiz-feedback" hidden></div>' +
    '</div>';
  }

  function bindQuiz(container, quiz, partKey) {
    var answered = new Set();
    var total = quiz.length;
    var quizDone = $('.quiz-done', container);
    var label = $('.quiz-progress__label', container);
    var bar = $('.quiz-progress__bar span', container);

    function refresh() {
      var n = answered.size;
      if (label) label.textContent = '完成 ' + n + ' / ' + total;
      if (bar) bar.style.width = (total ? Math.round((n / total) * 100) : 0) + '%';
      if (quizDone && n >= total) {
        quizDone.classList.add('is-visible');
        markRead(partKey);
        var markBtn = $('[data-mark-read="' + partKey + '"]');
        if (markBtn) { markBtn.classList.add('is-done'); markBtn.textContent = '已读 · 已完成'; }
      }
    }

    quiz.forEach(function (q) {
      var item = container.querySelector('[data-qid="' + q.id + '"]');
      if (!item) return;
      if (q.type === 'choice') {
        $$('.quiz-option', item).forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (item.getAttribute('data-answered')) return;
            item.setAttribute('data-answered', '1');
            var pick = Number(btn.getAttribute('data-i'));
            var correct = Number(q.answer);
            $$('.quiz-option', item).forEach(function (b, bi) {
              b.disabled = true;
              if (bi === correct) b.classList.add('is-correct');
              else if (bi === pick) b.classList.add('is-wrong');
            });
            var fb = $('.quiz-feedback', item);
            if (fb) {
              fb.hidden = false;
              fb.innerHTML = '<p class="verdict ' + (pick === correct ? 'ok' : 'no') + '">' +
                (pick === correct ? '答对了。' : '不对，再看一眼。') + '</p><p>' + (q.explain || '') + '</p>';
            }
            answered.add(q.id);
            refresh();
          });
        });
      } else {
        var gradeEl = $('.quiz-grade', item);
        if (gradeEl) {
          if (window.ChatUI && typeof window.ChatUI.attachGrading === 'function') {
            try { window.ChatUI.attachGrading(gradeEl, q); } catch (e) { /* fallback below */ }
          }
          if (!gradeEl.childNodes.length) {
            fallbackGrading(gradeEl, q);
          }
          gradeEl.addEventListener('chatui:graded', function () {
            answered.add(q.id);
            refresh();
          });
        }
      }
    });
    refresh();
  }

  function fallbackGrading(el, q) {
    var ref = q.reference || '';
    el.innerHTML = '<p class="original__note">AI 批改需要在 <a href="#/chat">问学</a> 里接入 API。你也可以先写，再展开参考答案自查。</p>' +
      '<textarea aria-label="你的回答" placeholder="用你自己的话写，50–150 字即可"></textarea>' +
      '<div class="quiz-short__bar"><button type="button" class="btn btn--small btn--ghost" data-reveal-ref>查看参考答案</button></div>' +
      '<div class="quiz-reference" hidden><p class="quiz-reference__label">参考答案</p><p>' + ref + '</p></div>';
    var ta = $('textarea', el);
    var btn = $('[data-reveal-ref]', el);
    var box = $('.quiz-reference', el);
    if (btn) btn.addEventListener('click', function () {
      box.hidden = !box.hidden;
      btn.textContent = box.hidden ? '查看参考答案' : '收起参考答案';
    });
    if (ta) {
      ta.addEventListener('input', function () {
        if (ta.value.trim().length >= 10 && !ta.getAttribute('data-counted')) {
          ta.setAttribute('data-counted', '1');
          el.dispatchEvent(new CustomEvent('chatui:graded', { bubbles: true, detail: { score: null, quizId: q.id } }));
        }
      });
    }
  }

  /* ---------- part foot ---------- */
  function partFoot(kind, id) {
    var ids = kind === 'paper' ? PAPER_IDS : collection(kind).map(function (x) { return x.id; });
    var i = ids.indexOf(id);
    var prev = i > 0 ? ids[i - 1] : null;
    var next = i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
    var key = kind + ':' + id;
    var read = isRead(key);
    function label(pid) {
      if (!pid) return '';
      if (kind === 'paper') return paperMeta(pid).cn;
      var it = findItem(kind, pid);
      return it ? it.title : pid;
    }
    return '<footer class="part-foot wrap">' +
      '<div class="spread__margin"></div>' +
      '<div class="spread__body"><div class="part-foot__body">' +
        '<div class="part-foot__links">' +
          (prev ? '<a class="part-foot__link" href="#/' + kind + '/' + esc(prev) + '"><span>上一部分</span>' + esc(label(prev)) + '</a>' : '') +
          (next ? '<a class="part-foot__link part-foot__next" href="#/' + kind + '/' + esc(next) + '"><span>下一部分</span>' + esc(label(next)) + ' →</a>' : '') +
        '</div>' +
        '<button type="button" class="btn btn--small mark-read' + (read ? ' is-done' : '') + '" data-mark-read="' + esc(key) + '">' + (read ? '已读 · 已完成' : '标记为已读') + '</button>' +
      '</div></div>' +
    '</footer>';
  }

  /* ---------- paper part ---------- */
  function renderPaperPart(id) {
    var part = findItem('paper', id);
    if (!part) return render404();
    state.lastPaperKey = id;
    try { localStorage.setItem(SKEY, id); } catch (e) { /* ignore */ }
    var note = NOTES[id] || {};
    var intro = note.intro || [];
    var points = note.points || [];
    var terms = note.terms || [];
    var quiz = note.quiz || [];

    var margin = '';
    if (points.length) {
      margin += '<div class="margin-block"><p class="margin-block__title">本节要点</p><ol class="points">' +
        points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ol></div>';
    }
    if (terms.length) {
      margin += '<div class="margin-block"><p class="margin-block__title">术语</p><dl class="terms">' +
        terms.map(function (t) {
          return '<dt>' + esc(t.term) + (t.en ? '<em>' + esc(t.en) + '</em>' : '') + '</dt><dd>' + (t.h || '') + '</dd>';
        }).join('') + '</dl></div>';
    }
    var pages = PAGE_MAP[id] || [];
    if (pages.length) {
      margin += '<div class="margin-block"><p class="margin-block__title">底本影印</p>' +
        '<p class="original__note">对应 arXiv PDF 第 ' + pages.join('、') + ' 页。</p>' +
        '<div class="margin-actions" style="margin-top:12px">' +
        pages.map(function (p) {
          return '<button type="button" class="btn btn--ghost btn--small" data-facsimile-page="' + p + '">原页 ' + p + '</button>';
        }).join('') + '</div></div>';
    }

    var html = '<article class="part">' +
      partHead('paper', part) +
      '<section class="part-intro wrap spread">' +
        '<div class="spread__margin">' + margin + '</div>' +
        '<div class="spread__body"><div class="prose">' + renderBlocks(intro) + '</div></div>' +
      '</section>' +
      '<section class="original" id="original">' +
        '<div class="wrap">' +
          '<div class="original__head spread">' +
            '<div class="spread__margin">' +
              '<p class="running-head">Textus<span class="cn">底本原文</span></p>' +
              '<p class="original__note" style="margin-top:16px">以下英文为论文原文，一字未改。段末的上标数字是中文旁注编号；文中脚注可点击跳转；图表按底本保留。</p>' +
            '</div>' +
          '</div>' +
          '<div class="original__grid">' +
            '<aside class="gloss-column" aria-label="中文旁注"></aside>' +
            '<div class="paper-body"><div class="paper-text" id="paper-text">' + part.html + '</div><div class="footnotes"></div></div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      renderQuiz('paper:' + id, quiz) +
      partFoot('paper', id) +
    '</article>';

    return html;
  }

  function setupPaper(part) {
    var textEl = $('#paper-text');
    if (!textEl) return;
    var notes = part.footnotes || [];
    var glosses = (part.glosses || []).slice();
    // order margin notes by their anchor's position in the original text
    glosses.sort(function (a, b) {
      var ea = textEl.querySelector('[id="' + a.para + '"]');
      var eb = textEl.querySelector('[id="' + b.para + '"]');
      return (ea ? ea.offsetTop : 1e9) - (eb ? eb.offsetTop : 1e9);
    });

    // objects -> images
    $$('object[data]', textEl).forEach(function (o) {
      var img = document.createElement('img');
      img.src = o.getAttribute('data');
      img.alt = o.getAttribute('title') || '论文插图';
      img.loading = 'lazy';
      o.replaceWith(img);
    });

    // footnotes (paper's own notes, distinct from our glosses)
    var footnotesEl = $('.footnotes');
    if (footnotesEl) {
      if (notes.length) {
        footnotesEl.innerHTML = notes.map(function (n, i) {
          return '<p id="fn-' + esc(part.id) + '-' + (i + 1) + '"><span class="fn-mark">' + esc(n.mark) + '</span>' + n.body + '</p>';
        }).join('');
      } else {
        footnotesEl.remove();
      }
    }

    // marks + inline notes
    var byPara = {};
    glosses.forEach(function (n, i) {
      if (!byPara[n.para]) byPara[n.para] = [];
      byPara[n.para].push({ n: n, i: i + 1 });
    });

    Object.keys(byPara).forEach(function (para) {
      var el = textEl.querySelector('[id="' + para + '"]');
      if (!el) return;
      var group = byPara[para];
      group.forEach(function (g) {
        var mark = document.createElement('sup');
        mark.className = 'gloss-mark';
        mark.textContent = g.i;
        mark.setAttribute('data-note-index', g.i);
        mark.setAttribute('role', 'button');
        mark.setAttribute('tabindex', '0');
        mark.setAttribute('aria-label', '旁注 ' + g.i + '：' + (g.n.title || ''));
        var host = el;
        if (el.tagName === 'FIGURE') {
          var cap = el.querySelector('figcaption');
          if (cap) host = cap;
        }
        host.appendChild(mark);
      });
      // one details block per note, appended in order
      var frag = document.createDocumentFragment();
      group.forEach(function (g) {
        var det = document.createElement('details');
        det.className = 'inline-gloss';
        det.setAttribute('data-note-index', g.i);
        det.innerHTML = '<summary><strong>注 ' + g.i + '</strong> · ' + esc(g.n.title || '') + '</summary>' +
          '<div class="inline-gloss__body">' + (g.n.h || '') + '</div>';
        frag.appendChild(det);
      });
      if (el.tagName === 'LI') el.appendChild(frag);
      else el.parentNode.insertBefore(frag, el.nextSibling);
    });

    // gloss column
    var col = $('.gloss-column');
    var marginIndex = null;
    if (col && glosses.length) {
      col.innerHTML = glosses.map(function (n, i) {
        return '<div class="gloss" data-note-index="' + (i + 1) + '" data-para="' + esc(n.para) + '">' +
          '<p class="gloss__no">' + (i + 1) + '</p>' +
          '<p class="gloss__title">' + esc(n.title || '') + '</p>' +
          '<div class="gloss__body">' + (n.h || '') + '</div>' +
        '</div>';
      }).join('');
      // running contents in the margin
      var heads = $$('h3, h4', textEl);
      if (heads.length) {
        var list = heads.map(function (h, hi) {
          var id = 'mh-' + part.id + '-' + hi;
          h.id = id;
          var text = (h.textContent || '').replace(/\s+/g, ' ').trim();
          return '<li><a href="#" data-margin-head="' + id + '">' + esc(text) + '</a></li>';
        }).join('');
        marginIndex = document.createElement('div');
        marginIndex.className = 'margin-index';
        marginIndex.innerHTML = '<p class="margin-block__title">本节结构</p><ol>' + list + '</ol>' +
          ((part.pages || []).length ? '<p class="margin-index__fac">底本原页 ' + (part.pages || []).join('、') + '</p>' : '');
        col.insertBefore(marginIndex, col.firstChild);
        $$('[data-margin-head]', marginIndex).forEach(function (a) {
          a.addEventListener('click', function (e) {
            e.preventDefault();
            var target = document.getElementById(a.getAttribute('data-margin-head'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
    }

    // footnote clicks
    $$('sup.fn', textEl).forEach(function (sup) {
      sup.setAttribute('role', 'button');
      sup.setAttribute('tabindex', '0');
      sup.addEventListener('click', function () {
        var idx = sup.getAttribute('data-fn');
        var target = document.getElementById('fn-' + part.id + '-' + idx);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('para-flash');
          setTimeout(function () { target.classList.remove('para-flash'); }, 1400);
        }
      });
    });

    // figure lightbox
    $$('figure img', textEl).forEach(function (img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        var cap = img.closest('figure') ? (img.closest('figure').querySelector('figcaption') || {}).textContent : '';
        openLightbox(img.getAttribute('src'), cap || '论文插图');
      });
    });

    // gloss interactions
    var marks = $$('.gloss-mark', textEl);
    state.gloss = { textEl: textEl, marks: marks, col: col, heads: $$('h3, h4', textEl), index: marginIndex };

    marks.forEach(function (mark) {
      mark.addEventListener('click', function () { activateGloss(mark.getAttribute('data-note-index'), true); });
      mark.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activateGloss(mark.getAttribute('data-note-index'), true); }
      });
    });
    if (col) {
      $$('.gloss', col).forEach(function (g) {
        g.addEventListener('click', function () {
          var el = textEl.querySelector('[id="' + g.getAttribute('data-para') + '"]');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('para-flash');
            setTimeout(function () { el.classList.remove('para-flash'); }, 1400);
          }
        });
      });
    }

    // wide tables: tell the reader they can scroll sideways (phone)
    var markWideTables = function () {
      $$('.ltx_table', textEl).forEach(function (t) {
        var prev = t.previousElementSibling;
        var hasHint = prev && prev.classList && prev.classList.contains('table-hint');
        if (hasHint) prev.remove();
        var inner = t.querySelector('table');
        var wide = (inner ? inner.scrollWidth : t.scrollWidth) > t.clientWidth + 8;
        if (wide) {
          var hint = document.createElement('p');
          hint.className = 'table-hint';
          hint.textContent = '表格较宽，可左右滑动查看 →';
          t.parentNode.insertBefore(hint, t);
        }
      });
    };

    // layout after fonts / images
    var layout = function () { layoutGlosses(); markWideTables(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    $$('img', textEl).forEach(function (img) { img.addEventListener('load', layout); });
    layoutGlosses();
    markWideTables();
    requestAnimationFrame(layout);
    setTimeout(layout, 400);

    // mobile details open from mark
    var baseActivate = function (idx, scroll) {
      $$('.gloss-mark', textEl).forEach(function (m) {
        m.classList.toggle('is-active', m.getAttribute('data-note-index') === String(idx));
      });
      if (col) {
        $$('.gloss', col).forEach(function (g) {
          g.classList.toggle('is-active', g.getAttribute('data-note-index') === String(idx));
        });
      }
      if (window.matchMedia('(max-width: 880px)').matches) {
        var det = textEl.querySelector('.inline-gloss[data-note-index="' + idx + '"]');
        if (det) {
          det.open = true;
          if (scroll) det.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    activateGloss = baseActivate;
  }

  var activateGloss = function () { /* set by setupPaper */ };

  function layoutGlosses() {
    if (window.matchMedia('(max-width: 880px)').matches) return;
    var col = $('.gloss-column');
    var textEl = $('#paper-text');
    if (!col || !textEl) return;
    var glosses = $$('.gloss', col);
    if (!glosses.length) return;
    var index = $('.margin-index', col);
    var prevBottom = index ? index.offsetHeight + 20 : 0;
    glosses.forEach(function (g) {
      var para = textEl.querySelector('[id="' + g.getAttribute('data-para') + '"]');
      var top = para ? para.offsetTop : prevBottom;
      top = Math.max(top, prevBottom + 14);
      g.style.top = top + 'px';
      prevBottom = top + g.offsetHeight;
    });
    col.style.minHeight = Math.max(prevBottom, textEl.offsetHeight) + 'px';
  }

  function updateGlossActive() {
    var g = state.gloss;
    if (!g || !g.marks.length) return;
    var threshold = window.innerHeight * 0.4;
    var active = null;
    for (var i = 0; i < g.marks.length; i++) {
      var r = g.marks[i].getBoundingClientRect();
      if (r.top <= threshold) active = g.marks[i].getAttribute('data-note-index');
      else break;
    }
    var col = g.col;
    if (!col) return;
    $$('.gloss', col).forEach(function (el) {
      el.classList.toggle('is-active', active !== null && el.getAttribute('data-note-index') === active);
    });
    if (g.index && g.heads && g.heads.length) {
      var current = null;
      for (var hi = 0; hi < g.heads.length; hi++) {
        if (g.heads[hi].getBoundingClientRect().top <= window.innerHeight * 0.28) current = g.heads[hi].id;
        else break;
      }
      $$('[data-margin-head]', g.index).forEach(function (a) {
        a.classList.toggle('is-active', current !== null && a.getAttribute('data-margin-head') === current);
      });
    }
  }

  /* ---------- primer / preview part ---------- */
  function renderLessonPart(kind, id) {
    var item = findItem(kind, id);
    if (!item) return render404();
    var quiz = item.quiz || [];
    var vol = VOLUMES[kind];
    var aside = '' +
      '<div class="lesson-aside">' +
        '<p class="running-head">' + esc(vol.kicker) + ' · ' + esc(vol.en) + '</p>' +
        '<p class="lesson-aside__no">第 ' + esc(item.no || '') + (kind === 'primer' ? ' 课' : ' 篇') + '</p>' +
        '<p class="lesson-aside__title">' + esc(item.title) + '</p>' +
        '<p class="lesson-aside__meta">' + countMinutes(item) + ' · 练习 ' + quiz.length + ' 题</p>' +
        '<p class="lesson-aside__note">' + (kind === 'primer'
          ? '先读文字，再拖动互动组件，最后做练习。遇到公式不要跳过：每个公式后面都有一句中文在拆它。'
          : '这一卷先给结论和地图，细节留到卷三的原文注疏。读到不确定的地方，带着问题继续。') + '</p>' +
        '<p class="lesson-aside__back"><a class="text-link" href="#/' + kind + '">回到目录 →</a></p>' +
      '</div>';
    return '<article class="part">' +
      partHead(kind, item) +
      '<section class="part-intro wrap spread">' +
        '<div class="spread__margin">' + aside + '</div>' +
        '<div class="spread__body"><div class="prose">' + renderBlocks(item.blocks || []) + '</div></div>' +
      '</section>' +
      renderQuiz(kind + ':' + id, quiz) +
      partFoot(kind, id) +
    '</article>';
  }

  /* ---------- part router ---------- */
  function renderPart(kind, id) {
    if (kind === 'paper') {
      var part = findItem('paper', id);
      if (!part) return render404();
      var html = renderPaperPart(id);
      mainHTML(html);
      setupRich($('#main'));
      var p = paperData(id);
      if (p) setupPaper({ id: id, html: p.html, footnotes: p.notes || [], glosses: (NOTES[id] || {}).notes || [], pages: PAGE_MAP[id] || [] });
      var quiz = (NOTES[id] || {}).quiz || [];
      var quizEl = $('.quiz', $('#main'));
      if (quizEl) bindQuiz(quizEl, quiz, 'paper:' + id);
    } else {
      var item = findItem(kind, id);
      if (!item) return render404();
      mainHTML(renderLessonPart(kind, id));
      setupRich($('#main'));
      var qEl = $('.quiz', $('#main'));
      if (qEl) bindQuiz(qEl, item.quiz || [], kind + ':' + id);
    }
    setupReveal($('#main'));
    bindPartActions();
  }

  function bindCover() {
    $$('.cover__plate img, .plates__grid img').forEach(function (img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function () {
        openLightbox(img.getAttribute('src'), img.getAttribute('alt') || '论文原图');
      });
    });
  }

  function bindPartActions() {
    $$('[data-mark-read]', $('#main')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-mark-read');
        markRead(key);
        btn.classList.add('is-done');
        btn.textContent = '已读 · 已完成';
        toast('已标记为已读');
      });
    });
    $$('[data-facsimile-page]', $('#main')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = Number(btn.getAttribute('data-facsimile-page'));
        openLightbox('assets/img/facsimile/page-' + String(p).padStart(2, '0') + '.jpg', '原页 ' + p + ' · ' + (FACSIMILE[p] || ''));
      });
    });
  }

  /* ---------- chat ---------- */
  function renderChat() {
    if (state.chat && typeof state.chat.destroy === 'function') {
      try { state.chat.destroy(); } catch (e) { /* ignore */ }
    }
    state.chat = null;
    var html = '<section class="chat-page wrap">' +
      '<header class="chat-head">' +
        '<h1>问学</h1>' +
        '<p>接入你自己的 OpenAI 兼容 API，向一位只依据这篇论文回答的助教提问。它不会上网，也不会替你做决定；它依据的是你正在读的原文与注疏。API Key 只保存在本机浏览器，请求直接由你的浏览器发往你填写的接口。</p>' +
      '</header>' +
      '<div id="chat-root"></div>' +
    '</section>';
    mainHTML(html);
    var root = $('#chat-root');
    if (root && window.ChatUI && typeof window.ChatUI.render === 'function') {
      try { state.chat = window.ChatUI.render(root, { currentKey: state.lastPaperKey }); } catch (e) {
        root.innerHTML = '<p class="original__note">问学模块载入失败：' + esc(e.message) + '</p>';
      }
    } else {
      root.innerHTML = '<p class="original__note">问学模块尚未载入。请刷新页面后重试。</p>';
    }
  }

  /* ---------- facsimile ---------- */
  function renderFacsimile() {
    var items = [];
    for (var p = 1; p <= 15; p++) {
      var file = 'assets/img/facsimile/page-' + String(p).padStart(2, '0') + '.jpg';
      items.push('<button type="button" class="fac-item" data-fac="' + p + '">' +
        '<img src="' + file + '" alt="论文原页 ' + p + '：' + esc(FACSIMILE[p] || '') + '" loading="lazy">' +
        '<span class="fac-item__label"><b>原页 ' + p + '</b><span>' + esc(FACSIMILE[p] || '') + '</span></span>' +
      '</button>');
    }
    mainHTML('<section class="fac-page wrap">' +
      '<header class="part-head spread">' +
        '<div class="spread__margin"><p class="running-head">Facsimile<span class="cn">影印</span></p></div>' +
        '<div class="spread__body"><h1>影印原页</h1>' +
          '<p class="part-en">Attention Is All You Need · arXiv:1706.03762v7</p>' +
          '<p class="fac-page__lead">十五页底本，按 arXiv 公开 PDF 原样影印。读注疏时如果想知道某句话在原页的哪个位置、图与表原本怎样排，点开对照。中文注疏不覆盖原文，两者可以并读。</p>' +
          '<p class="part-meta"><span>共 15 页</span><span>arXiv 公开 PDF</span></p>' +
        '</div>' +
      '</header>' +
      '<div class="fac-grid">' + items.join('') + '</div>' +
    '</section>');
    $$('.fac-item').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var p = Number(btn.getAttribute('data-fac'));
        openLightbox('assets/img/facsimile/page-' + String(p).padStart(2, '0') + '.jpg', '原页 ' + p + ' · ' + (FACSIMILE[p] || ''));
      });
    });
  }

  /* ---------- 404 ---------- */
  function render404() {
    return '<section class="volume wrap">' +
      '<header class="volume__head spread">' +
        '<div class="spread__margin"><p class="running-head">404</p></div>' +
        '<div class="spread__body"><h1>这一页不在底本里</h1>' +
        '<p class="volume__lead">链接可能写错了，或者这一部分还没有校订完成。回到卷首，或者从目录重新进入。</p>' +
        '<p style="margin-top:2rem"><a class="btn" href="#/">回到卷首</a></p></div>' +
      '</header></section>';
  }

  /* ---------- routing ---------- */
  var main = document.getElementById('main');
  function mainHTML(html) {
    state.gloss = null;
    main.innerHTML = html;
  }

  function parseHash() {
    var hash = (location.hash || '').replace(/^#/, '');
    if (!hash || hash === '/') return { view: 'cover', id: null };
    var parts = hash.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    return { view: parts[0] || 'cover', id: parts[1] || null };
  }

  var TITLES = {
    cover: '注意力注疏 · Attention Is All You Need 中文注疏本',
    primer: '卷一 · 基础 — 注意力注疏',
    preview: '卷二 · 预习 — 注意力注疏',
    paper: '卷三 · 原文注疏 — 注意力注疏',
    facsimile: '影印原页 — 注意力注疏',
    chat: '问学 — 注意力注疏'
  };

  function route() {
    var r = parseHash();
    state.view = r.view;
    state.id = r.id;
    if (state.view !== 'chat' && state.chat && typeof state.chat.destroy === 'function') {
      try { state.chat.destroy(); } catch (e) { /* ignore */ }
      state.chat = null;
    }
    document.body.setAttribute('data-view', r.view === 'cover' ? 'cover' : r.view);
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    document.documentElement.style.scrollBehavior = '';

    if (r.view === 'cover') {
      mainHTML(renderCover());
      document.title = TITLES.cover;
      bindCover();
      setupReveal($('#main'));
      requestAnimationFrame(function () {
        var cover = $('.cover');
        if (cover) cover.classList.add('is-ready');
      });
    } else if (r.view === 'primer' || r.view === 'preview') {
      if (r.id) { renderPart(r.view, r.id); document.title = (findItem(r.view, r.id) || {}).title + ' — 注意力注疏'; }
      else { mainHTML(renderVolume(r.view)); setupReveal($('#main')); document.title = TITLES[r.view]; }
    } else if (r.view === 'paper') {
      if (r.id) {
        renderPart('paper', r.id);
        var pm = paperMeta(r.id);
        document.title = pm.cn + ' · ' + pm.en + ' — 注意力注疏';
      } else { mainHTML(renderVolume('paper')); setupReveal($('#main')); document.title = TITLES.paper; }
    } else if (r.view === 'facsimile') {
      renderFacsimile();
      document.title = TITLES.facsimile;
    } else if (r.view === 'chat') {
      renderChat();
      document.title = TITLES.chat;
    } else {
      mainHTML(render404());
      document.title = '未找到 — 注意力注疏';
    }
    updateNav();
    updateReadBar();
  }

  function updateNav() {
    $$('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === state.view) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var nav = document.getElementById('primary-nav');
    if (nav) nav.classList.remove('is-open');
    var t = document.getElementById('nav-toggle');
    if (t) t.setAttribute('aria-expanded', 'false');
  }

  /* ---------- chrome ---------- */
  function updateReadBar() {
    var bar = document.getElementById('read-bar');
    if (!bar) return;
    var doc = document.documentElement;
    var total = doc.scrollHeight - window.innerHeight;
    var pct = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0;
    bar.style.width = pct + '%';
    var topbar = document.getElementById('topbar');
    if (topbar) topbar.classList.toggle('is-scrolled', window.scrollY > 8);
  }

  function onScroll() {
    updateReadBar();
    if (state.gloss) updateGlossActive();
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
  }

  /* ---------- lightbox ---------- */
  function openLightbox(src, title) {
    var dlg = document.getElementById('lightbox');
    if (!dlg) return;
    var img = document.getElementById('lightbox-img');
    img.src = src;
    img.hidden = false;
    document.getElementById('lightbox-title').textContent = title || '影印原页';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  function closeLightbox() {
    var dlg = document.getElementById('lightbox');
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
    var img = document.getElementById('lightbox-img');
    if (img) img.hidden = true;
  }

  /* ---------- misc ---------- */
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', debounce(function () {
    layoutGlosses();
    updateGlossActive();
    updateReadBar();
  }, 140));
  window.addEventListener('hashchange', route);

  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.classList.add('js');
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('primary-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    var lb = document.getElementById('lightbox');
    if (lb) {
      $$('[data-close-lightbox]').forEach(function (b) { b.addEventListener('click', closeLightbox); });
      lb.addEventListener('click', function (e) {
        if (e.target === lb) closeLightbox();
      });
      lb.addEventListener('cancel', function (e) { e.preventDefault(); closeLightbox(); });
    }
    route();
  });
})();
