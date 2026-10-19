/*!
 * assets/js/chat.js — 《Attention Is All You Need》中文注疏本 · 卷四「问学」
 *
 * 纯静态站点组件：无外部依赖，不 import/export，浏览器 <script> 直接加载。
 * 暴露 window.ChatUI（Node 下同时 module.exports）：
 *   ChatUI.render(root, { currentKey })      挂载问学页（设置 + 流式对话）
 *   ChatUI.attachGrading(container, quiz)    挂载问答题的 AI 批改
 *
 * 依赖（由页面按顺序加载）：
 *   window.AI   assets/js/api.js      配置 / chat / gradeAnswer / buildContext / listModels
 *   window.MD   assets/js/markdown.js MD.render(text) / MD.typeset(el)
 *
 * 隐私：对话只存在内存里，刷新即清空；API Key 的读写全部交给 AI（localStorage）。
 * 安全：用户输入与 AI 输出一律经 MD.render 渲染；AI 批改的纯文本字段用 textContent。
 * 样式：自注入 <style id="chat-style">，类名统一 .chat- 前缀，颜色/字体只用 :root 变量。
 */
(function (global) {
  "use strict";

  var doc = typeof document !== "undefined" ? document : null;

  var STYLE_ID = "chat-style";
  var UID = 0;

  var SUGGESTIONS = [
    "为什么注意力要除以 √d_k？用高中数学解释。",
    "多头注意力里 8 个头分别在做什么？",
    "位置编码为什么用正弦和余弦，而不是直接编号？",
    "表 3 的消融实验说明了什么？"
  ];

  /* ========================================================================== *
   * 一、无 DOM 的纯逻辑（便于测试；也是 UI 文案的唯一来源）
   * ========================================================================== */

  function uid(prefix) {
    UID += 1;
    return (prefix || "chat") + "-" + UID;
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatInt(value) {
    var text = String(value === undefined || value === null ? "" : value);
    return text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function visibleCharCount(value) {
    var text = String(value === undefined || value === null ? "" : value).replace(/\s+/g, "");
    if (typeof Array.from === "function") return Array.from(text).length;
    return text.length;
  }

  function isAbortError(err) {
    return !!err && (err.name === "AbortError" || err.code === "ABORT_ERR" || err.code === 20);
  }

  function cleanErrorText(value) {
    var text = String(value === undefined || value === null ? "" : value).replace(/\s+/g, " ").trim();
    if (text.length > 320) text = text.slice(0, 320) + "…";
    return text;
  }

  /**
   * 把 AI 抛出的错误翻译成中文提示，并指出该高亮哪个设置项。
   * @returns {{text:string, field:(string|null), aborted:(boolean|undefined)}}
   */
  function describeError(err) {
    if (isAbortError(err)) {
      return { text: "已停止。", field: null, aborted: true };
    }
    var status = err && typeof err.status === "number" ? err.status : null;
    if (status === 401) {
      return { text: "API Key 无效或未授权。请检查设置面板里的 API Key。", field: "apiKey" };
    }
    if (status === 403) {
      return { text: "这个 API Key 没有访问该模型的权限（HTTP 403）。请检查模型名或账户权限。", field: "apiKey" };
    }
    if (status === 404) {
      return { text: "接口路径不存在（HTTP 404）。请检查 Base URL，通常应以 /v1 结尾。", field: "baseUrl" };
    }
    if (status === 429) {
      return { text: "请求被限流，稍后再试。若持续失败，请检查账户额度。", field: null };
    }
    if (status === 0 || (err && err.code === "NETWORK_ERROR")) {
      return { text: "网络错误：无法连接到接口。请检查 Base URL、网络连接与跨域设置。", field: "baseUrl" };
    }
    if (status !== null && status >= 500) {
      return { text: "服务端错误（HTTP " + status + "），请稍后再试。", field: null };
    }
    if (status !== null) {
      var extra = cleanErrorText(err && err.message);
      return { text: "请求失败（HTTP " + status + "）。" + (extra ? " " + extra : ""), field: null };
    }
    var message = cleanErrorText(err && err.message);
    return { text: message || "请求失败，请稍后重试。", field: null };
  }

  function levelForScore(score) {
    var value = Number(score);
    if (!isFinite(value)) return "需加强";
    if (value >= 90) return "优秀";
    if (value >= 75) return "良好";
    if (value >= 60) return "及格";
    return "需加强";
  }

  /**
   * buildContext 返回的文本以【标签】分段；从标签还原「依据」行。
   */
  function parseContextLabels(context) {
    var found = { abstract: false, section: "", related: 0 };
    var source = String(context === undefined || context === null ? "" : context);
    var pattern = /【([^】\n]{1,160})】/g;
    var match;
    while ((match = pattern.exec(source))) {
      var label = match[1].trim().replace(/\s+/g, " ");
      if (!label) continue;
      if (/^摘要(?:\s|$)/.test(label)) {
        found.abstract = true;
      } else if (/^相关小节\s*/.test(label)) {
        found.related += 1;
      } else if (/^小节\s*/.test(label)) {
        if (!found.section) found.section = label.replace(/^小节\s*/, "");
      } else if (!found.section) {
        found.section = label;
      }
    }
    return found;
  }

  function buildBasisText(context) {
    var source = String(context === undefined || context === null ? "" : context);
    if (!source.trim()) return "依据：未载入论文上下文";
    var labels = parseContextLabels(source);
    var parts = [];
    if (labels.abstract) parts.push("摘要");
    if (labels.section) parts.push(labels.section);
    if (labels.related === 1) parts.push("1 个相关小节");
    else if (labels.related > 1) parts.push(labels.related + " 个相关小节");
    var head = parts.length ? "依据：" + parts.join(" + ") : "依据：已载入论文上下文";
    return head + " · 上下文 " + formatInt(source.length) + " 字";
  }

  function isLocalBaseUrl(value) {
    var source = String(value === undefined || value === null ? "" : value).trim();
    return /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]|[^\/:]+\.localhost)(?::\d+)?(?:\/|$)/i.test(source);
  }

  function markdownHtml(text) {
    var source = String(text === undefined || text === null ? "" : text);
    if (global.MD && typeof global.MD.render === "function") {
      try {
        var html = global.MD.render(source);
        if (typeof html === "string") return html;
      } catch (err) { /* 回退到纯文本 */ }
    }
    // markdown.js 不可用时的最小兜底：只转义、只保留换行，不实现第二套 Markdown。
    return "<p>" + escapeHtml(source).replace(/\r?\n/g, "<br>") + "</p>";
  }

  function normalizeBaseUrlInput(value) {
    return String(value === undefined || value === null ? "" : value).trim().replace(/\/+$/, "");
  }

  /* ========================================================================== *
   * 二、DOM 小工具
   * ========================================================================== */

  function elem(tag, className, text) {
    if (!doc) return null;
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clearNode(node) {
    if (!node) return;
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function removeNode(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function typeset(node) {
    if (!node || !global.MD || typeof global.MD.typeset !== "function") return;
    try { global.MD.typeset(node); } catch (err) { /* 排版失败不影响阅读 */ }
  }

  function paintMarkdown(node, text) {
    if (!node) return;
    node.innerHTML = markdownHtml(text);
    typeset(node);
  }

  // 站内受信任内容（quiz 的 hint / reference 是写作规范里的 HTML 片段），
  // 与用户输入、AI 输出分开处理；含标签时直接插入，纯文本按 Markdown 渲染。
  function paintTrusted(node, value) {
    if (!node) return;
    var source = String(value === undefined || value === null ? "" : value);
    if (/<[a-z][^>]*>/i.test(source)) {
      node.innerHTML = source;
      typeset(node);
    } else {
      paintMarkdown(node, source);
    }
  }

  function scheduleFrame(fn) {
    if (typeof global.requestAnimationFrame === "function") {
      return global.requestAnimationFrame(fn);
    }
    return global.setTimeout(fn, 16);
  }

  function cancelFrame(id) {
    if (typeof global.cancelAnimationFrame === "function") {
      try { global.cancelAnimationFrame(id); } catch (err) { /* ignore */ }
    } else {
      global.clearTimeout(id);
    }
  }

  /* ========================================================================== *
   * 三、样式（只使用 :root 变量；无圆角、无阴影、无渐变）
   * ========================================================================== */

  var STYLE_TEXT = `
.chat-shell,
.chat-grade {
  font-family: var(--serif-cn);
  font-size: var(--fs-body);
  color: var(--ink);
  line-height: 1.75;
}
.chat-shell *,
.chat-shell *::before,
.chat-shell *::after,
.chat-grade *,
.chat-grade *::before,
.chat-grade *::after { box-sizing: border-box; }
.chat-shell [hidden],
.chat-grade [hidden] { display: none !important; }
.chat-sr-only {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}
.chat-shell a { color: var(--ink); text-decoration-color: var(--gold); text-underline-offset: 3px; }
.chat-shell a:focus-visible,
.chat-shell button:focus-visible,
.chat-shell summary:focus-visible,
.chat-shell textarea:focus-visible,
.chat-shell input:focus-visible,
.chat-grade button:focus-visible,
.chat-grade textarea:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
}

/* 版面：桌面两栏，< 900px 单栏 */
.chat-shell {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: calc(var(--gutter) * 2);
  align-items: start;
}
.chat-aside { padding-top: 4px; min-width: 0; }
.chat-kicker {
  margin: 0 0 8px;
  font-family: var(--serif-latin);
  font-size: var(--fs-small);
  letter-spacing: 0.18em;
  color: var(--gold);
  text-transform: uppercase;
}
.chat-lead {
  margin: 0 0 12px;
  max-width: 30ch;
  color: var(--ink);
}
.chat-privacy {
  margin: 0 0 calc(var(--gutter) * 1.2);
  max-width: 36ch;
  font-size: var(--fs-small);
  line-height: 1.65;
  color: var(--ink-soft);
}

/* 设置面板 */
.chat-settings {
  border-top: 1px solid var(--rubric);
  border-bottom: 1px solid var(--rubric);
}
.chat-settings__summary {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: baseline;
  padding: 12px 0;
  cursor: pointer;
  list-style: none;
}
.chat-settings__summary::-webkit-details-marker { display: none; }
.chat-settings__summary::after {
  content: "＋";
  font-family: var(--serif-latin);
  color: var(--ink-soft);
}
.chat-settings[open] .chat-settings__summary::after { content: "－"; }
.chat-settings__label {
  font-size: var(--fs-small);
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}
.chat-settings__state {
  font-size: var(--fs-small);
  color: var(--ink-soft);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-settings__body { padding: 2px 0 18px; }
.chat-field { margin: 0 0 14px; }
.chat-field label {
  display: block;
  margin-bottom: 5px;
  font-size: var(--fs-small);
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}
.chat-field__value {
  font-family: var(--serif-latin);
  color: var(--ink);
}
.chat-input,
.chat-textarea,
.chat-range {
  font: inherit;
  color: var(--ink);
  background: var(--ground);
  border: 1px solid var(--ink-faint);
  border-radius: 0;
  box-shadow: none;
}
.chat-input {
  width: 100%;
  padding: 8px 10px;
  font-family: var(--serif-latin);
  font-size: var(--fs-small);
}
.chat-input:focus-visible,
.chat-textarea:focus-visible {
  border-color: var(--ink);
}
.chat-input-row { display: flex; align-items: stretch; }
.chat-input-row .chat-input { border-right: 0; min-width: 0; }
.chat-key-toggle {
  flex: none;
  padding: 0 10px;
  font: inherit;
  font-size: var(--fs-small);
  color: var(--ink-soft);
  background: var(--ground-2);
  border: 1px solid var(--ink-faint);
  border-radius: 0;
  cursor: pointer;
}
.chat-key-toggle:hover { background: var(--ground-3); color: var(--ink); }
.chat-field__note {
  margin: 6px 0 0;
  font-size: calc(var(--fs-small) * 0.92);
  line-height: 1.55;
  color: var(--ink-faint);
}
.chat-field--error label,
.chat-field--error .chat-field__note { color: var(--rubric); }
.chat-field--error .chat-input { border-color: var(--rubric); }
.chat-range {
  width: 100%;
  height: 24px;
  padding: 0;
  margin: 0;
  background: transparent;
  border: 0;
  -webkit-appearance: none;
  appearance: none;
}
.chat-range::-webkit-slider-runnable-track { height: 1px; background: var(--ink-faint); }
.chat-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px; height: 12px;
  margin-top: -6px;
  background: var(--ink);
  border: 0;
  border-radius: 0;
}
.chat-range::-moz-range-track { height: 1px; background: var(--ink-faint); }
.chat-range::-moz-range-thumb {
  width: 12px; height: 12px;
  background: var(--ink);
  border: 0;
  border-radius: 0;
}

/* 按钮 */
.chat-btn {
  appearance: none;
  -webkit-appearance: none;
  padding: 7px 14px;
  font: inherit;
  font-size: var(--fs-small);
  letter-spacing: 0.04em;
  color: var(--ink);
  background: var(--ground);
  border: 1px solid var(--ink-faint);
  border-radius: 0;
  box-shadow: none;
  cursor: pointer;
}
.chat-btn:hover:not(:disabled) { background: var(--ground-3); border-color: var(--ink-soft); }
.chat-btn:disabled { opacity: 0.42; cursor: not-allowed; }
.chat-btn--primary {
  color: var(--night-ink);
  background: var(--night);
  border-color: var(--night);
}
.chat-btn--primary:hover:not(:disabled) { color: var(--ground); background: var(--ink); border-color: var(--ink); }
.chat-btn--quiet {
  color: var(--ink-soft);
  background: transparent;
  border-color: transparent;
}
.chat-btn--quiet:hover:not(:disabled) { color: var(--ink); background: var(--ground-3); }
.chat-stop {
  color: var(--rubric);
  background: transparent;
  border-color: var(--rubric);
}
.chat-stop:hover:not(:disabled) {
  color: var(--rubric-deep);
  background: var(--rubric-wash);
  border-color: var(--rubric-deep);
}
.chat-settings__actions { display: flex; flex-wrap: wrap; gap: 6px; }
.chat-settings__msg {
  min-height: 1.5em;
  margin: 10px 0 0;
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink-soft);
}
.chat-settings__msg[data-tone="ok"] { color: var(--verdigris); }
.chat-settings__msg[data-tone="error"] { color: var(--rubric); }

/* 对话栏 */
.chat-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--ground);
  border: 1px solid var(--rubric);
}
.chat-main__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px 18px;
  padding: 12px calc(var(--gutter) * 0.9) 10px;
  border-bottom: 1px solid var(--rubric);
}
.chat-main__title {
  margin: 0;
  font-family: var(--serif-cn);
  font-size: var(--fs-small);
  font-weight: 400;
  letter-spacing: 0.16em;
  color: var(--ink-soft);
}
.chat-basis {
  flex: 1 1 260px;
  margin: 0;
  font-size: var(--fs-small);
  line-height: 1.55;
  color: var(--ink-faint);
  text-align: right;
}
.chat-log {
  display: flex;
  flex-direction: column;
  gap: calc(var(--gutter) * 1.05);
  height: clamp(360px, 56vh, 640px);
  padding: calc(var(--gutter) * 1.1);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--ground-2);
}

/* 空状态与建议问题 */
.chat-empty { max-width: 560px; margin: auto 0; padding: 6px 0; }
.chat-empty__title {
  margin: 0 0 16px;
  font-family: var(--serif-display);
  font-size: clamp(20px, 2.4vw, 26px);
  font-weight: 600;
  line-height: 1.4;
}
.chat-suggestions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--rubric);
  border: 1px solid var(--rubric);
}
.chat-suggestion {
  display: block;
  width: 100%;
  min-height: 86px;
  padding: 12px 14px;
  font: inherit;
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--ink);
  text-align: left;
  background: var(--ground);
  border: 0;
  border-radius: 0;
  cursor: pointer;
}
.chat-suggestion:hover,
.chat-suggestion:focus-visible { background: var(--ground-3); }
.chat-suggestion__index {
  display: block;
  margin-bottom: 4px;
  font-family: var(--serif-latin);
  font-size: calc(var(--fs-small) * 0.92);
  letter-spacing: 0.18em;
  color: var(--gold);
}
.chat-empty__note {
  margin: 12px 0 0;
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--ink-faint);
}

/* 消息 */
.chat-msg { max-width: 46em; }
.chat-msg__label {
  margin: 0 0 4px;
  font-size: calc(var(--fs-small) * 0.9);
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}
.chat-msg__body { overflow-wrap: break-word; }
.chat-msg__body > :first-child { margin-top: 0; }
.chat-msg__body > :last-child { margin-bottom: 0; }
.chat-msg__body p { margin: 0 0 0.8em; }
.chat-msg__body h1,
.chat-msg__body h2,
.chat-msg__body h3,
.chat-msg__body h4,
.chat-msg__body h5,
.chat-msg__body h6 {
  margin: 1.1em 0 0.45em;
  font-family: var(--serif-display);
  line-height: 1.3;
}
.chat-msg__body ul,
.chat-msg__body ol { margin: 0.35em 0 0.9em; padding-left: 1.25em; }
.chat-msg__body li { margin: 0.2em 0; }
.chat-msg__body li::marker { color: var(--gold); }
.chat-msg__body code {
  padding: 0.06em 0.3em;
  font-family: var(--serif-latin);
  font-size: 0.92em;
  background: var(--ground-3);
}
.chat-msg__body pre {
  margin: 0.8em 0;
  padding: 10px 12px;
  overflow-x: auto;
  background: var(--ground);
  border: 1px solid var(--ink-faint);
}
.chat-msg__body pre code { padding: 0; background: transparent; }
.chat-msg__body blockquote {
  margin: 0.8em 0;
  padding-left: 1em;
  color: var(--ink-soft);
  border-left: 1px solid var(--gold);
}
.chat-msg__body table { border-collapse: collapse; font-size: var(--fs-small); }
.chat-msg__body th,
.chat-msg__body td {
  padding: 4px 8px;
  border: 1px solid var(--ink-faint);
  text-align: left;
  vertical-align: top;
}
.chat-msg__body hr { border: 0; border-top: 1px solid var(--rubric); margin: 1em 0; }
.chat-msg__body a { color: var(--ink); text-decoration-color: var(--gold); text-underline-offset: 3px; }
.chat-msg--assistant {
  margin-right: 8%;
  padding-left: 14px;
  border-left: 2px solid var(--rubric);
}
.chat-msg--user {
  margin-left: 18%;
  padding-right: 14px;
  border-right: 2px solid var(--gold);
}
.chat-msg--user .chat-msg__label { text-align: right; }
.chat-msg--error { border-left-color: var(--rubric); }
.chat-msg--error .chat-msg__label { color: var(--rubric); }
.chat-msg__thinking {
  margin: 0;
  font-size: var(--fs-small);
  letter-spacing: 0.02em;
  color: var(--ink-faint);
}
.chat-msg__note {
  margin: 8px 0 0;
  font-size: var(--fs-small);
  color: var(--ink-faint);
}
.chat-msg__note[data-tone="error"] { color: var(--rubric); }
.chat-retry { margin-top: 10px; }
.chat-caret {
  display: inline-block;
  width: 0.48em;
  height: 1em;
  margin-left: 0.12em;
  vertical-align: -0.12em;
  background: var(--ink);
  animation: chat-caret-blink 1s steps(1, end) infinite;
}
@keyframes chat-caret-blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .chat-caret { animation: none; }
  .chat-log { scroll-behavior: auto; }
}

/* 输入区 */
.chat-composer {
  padding: 12px calc(var(--gutter) * 0.9) 14px;
  background: var(--ground);
  border-top: 1px solid var(--rubric);
}
.chat-textarea {
  width: 100%;
  min-height: 84px;
  max-height: 220px;
  padding: 10px 12px;
  font-size: var(--fs-body);
  line-height: 1.7;
  resize: vertical;
}
.chat-textarea:disabled,
.chat-input:disabled {
  color: var(--ink-faint);
  background: var(--ground-2);
  cursor: not-allowed;
}
.chat-composer__bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 10px 16px;
  margin-top: 10px;
}
.chat-hint {
  margin: 0;
  max-width: 42ch;
  font-size: var(--fs-small);
  line-height: 1.5;
  color: var(--ink-faint);
}
.chat-composer__actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.chat-send { min-width: 92px; }

/* ============================================================================
 * 问答题 AI 批改（可挂在 .chat-shell 之外，因此不依赖 .chat-shell）
 * ========================================================================== */
.chat-grade {
  margin-top: calc(var(--gutter) * 0.9);
  padding-top: 12px;
  border-top: 1px solid var(--rubric);
}
.chat-grade__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px 14px;
}
.chat-grade__head .chat-kicker { margin: 0; }
.chat-grade__status {
  min-height: 1.5em;
  margin: 0;
  font-size: var(--fs-small);
  line-height: 1.5;
  color: var(--ink-soft);
}
.chat-grade__status[data-tone="ok"] { color: var(--verdigris); }
.chat-grade__status[data-tone="error"] { color: var(--rubric); }
.chat-grade__config {
  margin: 0 0 8px;
  font-size: var(--fs-small);
  line-height: 1.6;
  color: var(--ink-soft);
}
.chat-grade__answer { margin-top: 4px; }
.chat-grade__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 14px;
  margin: 6px 0 10px;
  font-size: var(--fs-small);
  color: var(--ink-faint);
}
.chat-grade__hint { text-align: right; }
.chat-grade__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.chat-grade__reference {
  margin: 12px 0 0;
  padding: 10px 12px;
  background: var(--ground-2);
  border-left: 2px solid var(--gold);
}
.chat-grade__label {
  margin: 0 0 4px;
  font-family: var(--serif-latin);
  font-size: calc(var(--fs-small) * 0.92);
  letter-spacing: 0.14em;
  color: var(--gold);
}
.chat-grade__ref-text { font-size: var(--fs-small); line-height: 1.7; }
.chat-grade__ref-text > :first-child { margin-top: 0; }
.chat-grade__ref-text > :last-child { margin-bottom: 0; }
.chat-grade__result:not(:empty) {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--rubric);
}
.chat-grade__score-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rubric);
}
.chat-grade__score {
  margin: 0;
  font-family: var(--serif-latin);
  font-size: clamp(44px, 7vw, 66px);
  line-height: 0.85;
  letter-spacing: -0.02em;
}
.chat-grade__score small {
  margin-left: 6px;
  font-size: var(--fs-small);
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}
.chat-grade__score-meta { flex: 1 1 220px; min-width: 0; padding-bottom: 2px; }
.chat-grade__level {
  margin: 0 0 4px;
  font-size: var(--fs-small);
  letter-spacing: 0.2em;
  color: var(--gold);
}
.chat-grade__verdict {
  margin: 0;
  font-size: var(--fs-body);
  line-height: 1.65;
  color: var(--ink);
}
.chat-grade__section { margin-top: 14px; }
.chat-grade__section h4 {
  margin: 0 0 6px;
  font-size: var(--fs-small);
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
}
.chat-grade__section ul { margin: 0; padding-left: 1.15em; }
.chat-grade__section li {
  margin: 2px 0;
  font-size: var(--fs-small);
  line-height: 1.7;
}
.chat-grade__section li::marker { color: var(--gold); }
.chat-grade__suggestion {
  margin: 0;
  font-size: var(--fs-small);
  line-height: 1.7;
}
.chat-grade__error-link { margin-top: 6px; font-size: var(--fs-small); }
.chat-grade a { color: var(--ink); text-decoration-color: var(--gold); text-underline-offset: 3px; }

@media (max-width: 900px) {
  .chat-shell { grid-template-columns: minmax(0, 1fr); gap: calc(var(--gutter) * 1.4); }
  .chat-aside { padding-top: 0; }
  .chat-basis { text-align: left; }
  .chat-log { height: clamp(300px, 52vh, 460px); }
  .chat-msg--assistant { margin-right: 0; }
  .chat-msg--user { margin-left: 8%; }
  .chat-suggestions { grid-template-columns: minmax(0, 1fr); }
  .chat-suggestion { min-height: 0; }
  .chat-grade__hint { text-align: left; }
}
`;

  function ensureStyle() {
    if (!doc) return;
    if (doc.getElementById(STYLE_ID)) return;
    var style = doc.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    (doc.head || doc.documentElement).appendChild(style);
  }

  /* ========================================================================== *
   * 四、配置与设置面板的公共小工具
   * ========================================================================== */

  function safeLoadConfig() {
    try {
      if (global.AI && typeof global.AI.loadConfig === "function") return global.AI.loadConfig();
    } catch (err) { /* 配置损坏时按未配置处理 */ }
    return { baseUrl: "", model: "", apiKey: "", temperature: 0.3 };
  }

  function safeIsConfigured() {
    try {
      if (global.AI && typeof global.AI.isConfigured === "function") return !!global.AI.isConfigured();
    } catch (err) { /* ignore */ }
    return false;
  }

  function getAI() {
    return global.AI || null;
  }

  function makeController() {
    if (typeof global.AbortController === "function") {
      try { return new global.AbortController(); } catch (err) { /* ignore */ }
    }
    return null;
  }

  /* ========================================================================== *
   * 五、ChatUI.render — 问学页
   * ========================================================================== */

  var SHELL_HTML = `
<div class="chat-shell">
  <aside class="chat-aside">
    <p class="chat-kicker">论文助教</p>
    <p class="chat-lead">接入你自己的 API，让助教只依据这篇论文回答。</p>
    <p class="chat-privacy">API Key 只保存在本机浏览器的 localStorage 里，不会上传到别处；提问直接由你的浏览器发往你填写的接口。对话不持久化，刷新即清空。</p>

    <details class="chat-settings" id="chat-settings">
      <summary class="chat-settings__summary">
        <span class="chat-settings__label">设置</span>
        <span class="chat-settings__state" id="chat-config-state">未接入 API</span>
      </summary>
      <div class="chat-settings__body">
        <div class="chat-field">
          <label for="chat-base-url">Base URL</label>
          <input class="chat-input" id="chat-base-url" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://api.openai.com/v1">
          <p class="chat-field__note">OpenAI 兼容接口地址，通常以 <code>/v1</code> 结尾。本机接口（localhost）可以留空 Key。</p>
        </div>
        <div class="chat-field">
          <label for="chat-api-key">API Key</label>
          <div class="chat-input-row">
            <input class="chat-input" id="chat-api-key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-…">
            <button type="button" class="chat-key-toggle" id="chat-key-toggle" aria-pressed="false" aria-controls="chat-api-key" aria-label="显示 API Key">显示</button>
          </div>
          <p class="chat-field__note">写入本机 localStorage（键名 annotated-ai-config）。</p>
        </div>
        <div class="chat-field">
          <label for="chat-model">模型名</label>
          <input class="chat-input" id="chat-model" type="text" autocomplete="off" spellcheck="false" list="chat-model-list" placeholder="例如 gpt-4o-mini">
          <datalist id="chat-model-list"></datalist>
        </div>
        <div class="chat-field">
          <label for="chat-temperature">temperature <span class="chat-field__value" id="chat-temperature-value">0.3</span></label>
          <input class="chat-range" id="chat-temperature" type="range" min="0" max="1" step="0.05" value="0.3">
          <p class="chat-field__note">0 更稳定，1 更发散。助教默认 0.3。</p>
        </div>
        <div class="chat-settings__actions">
          <button type="button" class="chat-btn chat-btn--primary" id="chat-save">保存</button>
          <button type="button" class="chat-btn" id="chat-test">测试连接</button>
          <button type="button" class="chat-btn chat-btn--quiet" id="chat-clear">清除配置</button>
        </div>
        <p class="chat-settings__msg" id="chat-settings-msg" role="status" aria-live="polite"></p>
      </div>
    </details>
  </aside>

  <section class="chat-main" aria-labelledby="chat-conversation-title">
    <header class="chat-main__head">
      <h2 class="chat-main__title" id="chat-conversation-title">对话</h2>
      <p class="chat-basis" id="chat-basis">依据：正在载入论文上下文…</p>
    </header>

    <div class="chat-log" id="chat-log" role="log" aria-label="对话记录">
      <div class="chat-empty" id="chat-empty">
        <p class="chat-empty__title">从这四个问题开始，或写下你自己的问题。</p>
        <div class="chat-suggestions" id="chat-suggestions"></div>
        <p class="chat-empty__note" id="chat-empty-note"></p>
      </div>
    </div>

    <div class="chat-composer">
      <label class="chat-sr-only" for="chat-input">你的问题</label>
      <textarea class="chat-textarea" id="chat-input" rows="3" placeholder="就这篇论文提问。Enter 发送，Shift+Enter 换行。"></textarea>
      <div class="chat-composer__bar">
        <p class="chat-hint" id="chat-hint">助教只依据论文回答，不确定时会直说。</p>
        <div class="chat-composer__actions">
          <button type="button" class="chat-btn chat-btn--primary" id="chat-connect">接入 API</button>
          <button type="button" class="chat-btn chat-btn--primary chat-send" id="chat-send" aria-label="发送问题">发送</button>
          <button type="button" class="chat-btn chat-stop" id="chat-stop" hidden>停止</button>
        </div>
      </div>
      <p class="chat-status chat-sr-only" id="chat-status" role="status" aria-live="polite"></p>
    </div>
  </section>
</div>`;

  function render(root, options) {
    if (!doc || !root || typeof root.appendChild !== "function") return null;
    ensureStyle();

    // 同一容器重复挂载时先清理旧实例（中止还在跑的流）。
    if (root.__chatUI && typeof root.__chatUI.destroy === "function") {
      try { root.__chatUI.destroy(); } catch (err) { /* ignore */ }
    }
    clearNode(root);

    var opts = options && typeof options === "object" ? options : {};
    var AI = getAI();

    var state = {
      currentKey: opts.currentKey || null,
      configured: false,
      streaming: false,
      controller: null,
      messages: [],
      pendingQuestion: "",
      focusInComposer: false,
      destroyed: false
    };

    var refs = {};
    root.innerHTML = SHELL_HTML;

    function q(selector) { return root.querySelector(selector); }

    refs.settings = q("#chat-settings");
    refs.configState = q("#chat-config-state");
    refs.baseUrl = q("#chat-base-url");
    refs.apiKey = q("#chat-api-key");
    refs.keyToggle = q("#chat-key-toggle");
    refs.model = q("#chat-model");
    refs.modelList = q("#chat-model-list");
    refs.temperature = q("#chat-temperature");
    refs.temperatureValue = q("#chat-temperature-value");
    refs.save = q("#chat-save");
    refs.test = q("#chat-test");
    refs.clear = q("#chat-clear");
    refs.settingsMsg = q("#chat-settings-msg");
    refs.basis = q("#chat-basis");
    refs.log = q("#chat-log");
    refs.empty = q("#chat-empty");
    refs.suggestions = q("#chat-suggestions");
    refs.emptyNote = q("#chat-empty-note");
    refs.input = q("#chat-input");
    refs.hint = q("#chat-hint");
    refs.connect = q("#chat-connect");
    refs.send = q("#chat-send");
    refs.stop = q("#chat-stop");
    refs.status = q("#chat-status");

    /* ---------- 小工具 ---------- */

    function setStatus(text) {
      if (!refs.status) return;
      refs.status.textContent = text || "";
    }

    function setSettingsMessage(text, tone) {
      if (!refs.settingsMsg) return;
      refs.settingsMsg.textContent = text || "";
      if (tone) refs.settingsMsg.setAttribute("data-tone", tone);
      else refs.settingsMsg.removeAttribute("data-tone");
    }

    function fieldWrapOf(input) {
      var node = input;
      while (node && node !== refs.settings) {
        if (node.classList && node.classList.contains("chat-field")) return node;
        node = node.parentNode;
      }
      return null;
    }

    function clearFieldErrors() {
      if (!refs.settings) return;
      var fields = refs.settings.querySelectorAll(".chat-field--error");
      for (var i = 0; i < fields.length; i += 1) fields[i].classList.remove("chat-field--error");
    }

    function highlightField(field) {
      var target = field === "apiKey" ? refs.apiKey : field === "model" ? refs.model : field === "baseUrl" ? refs.baseUrl : null;
      if (!target) return;
      openSettings(field);
      var wrap = fieldWrapOf(target);
      if (wrap) wrap.classList.add("chat-field--error");
      try { target.focus(); } catch (err) { /* ignore */ }
    }

    function openSettings(focusField) {
      if (!refs.settings) return;
      refs.settings.open = true;
      if (!focusField) return;
      var target = focusField === "apiKey" ? refs.apiKey : focusField === "model" ? refs.model : refs.baseUrl;
      if (!target) return;
      try { target.focus(); } catch (err) { /* ignore */ }
    }

    function updateTemperatureLabel() {
      if (!refs.temperature || !refs.temperatureValue) return;
      var value = Number(refs.temperature.value);
      refs.temperatureValue.textContent = isFinite(value) ? String(Math.round(value * 100) / 100) : "0.3";
    }

    function fillForm(config) {
      var cfg = config && typeof config === "object" ? config : {};
      if (refs.baseUrl) refs.baseUrl.value = typeof cfg.baseUrl === "string" ? cfg.baseUrl : "";
      if (refs.apiKey) refs.apiKey.value = typeof cfg.apiKey === "string" ? cfg.apiKey : "";
      if (refs.model) refs.model.value = typeof cfg.model === "string" ? cfg.model : "";
      var temperature = typeof cfg.temperature === "number" ? cfg.temperature : 0.3;
      if (!isFinite(temperature)) temperature = 0.3;
      temperature = Math.max(0, Math.min(1, temperature));
      if (refs.temperature) refs.temperature.value = String(temperature);
      updateTemperatureLabel();
    }

    function setKeyVisibility(visible) {
      if (!refs.apiKey || !refs.keyToggle) return;
      refs.apiKey.type = visible ? "text" : "password";
      refs.keyToggle.setAttribute("aria-pressed", visible ? "true" : "false");
      refs.keyToggle.setAttribute("aria-label", visible ? "隐藏 API Key" : "显示 API Key");
      refs.keyToggle.textContent = visible ? "隐藏" : "显示";
    }

    function updateEmptyNote() {
      if (!refs.emptyNote) return;
      if (state.pendingQuestion) {
        var short = state.pendingQuestion.length > 46 ? state.pendingQuestion.slice(0, 46) + "…" : state.pendingQuestion;
        refs.emptyNote.textContent = "已记下你的问题：“" + short + "”。接入 API 后会填进输入框。";
        return;
      }
      refs.emptyNote.textContent = state.configured
        ? "对话只保存在本页内存里，刷新即清空。回答由 AI 生成，可能有误，请对照原文。"
        : "尚未接入 API。点任意问题会先打开设置；接入后问题会留在输入框里。";
    }

    function updateComposer() {
      var configured = state.configured;
      if (refs.input) {
        refs.input.disabled = !configured;
        refs.input.placeholder = configured
          ? "就这篇论文提问。Enter 发送，Shift+Enter 换行。"
          : "接入 API 后即可提问。";
      }
      if (refs.send) {
        refs.send.hidden = !configured || state.streaming;
        refs.send.disabled = !configured || state.streaming;
      }
      if (refs.stop) refs.stop.hidden = !configured || !state.streaming;
      if (refs.connect) refs.connect.hidden = configured;
      if (refs.hint) {
        refs.hint.textContent = configured
          ? "助教只依据论文回答，不确定时会直说。"
          : "尚未接入 API。设置只保存在本机。";
      }
    }

    function refreshConfigState() {
      if (state.destroyed) return;
      var cfg = safeLoadConfig();
      state.configured = safeIsConfigured();
      if (refs.configState) {
        refs.configState.textContent = state.configured
          ? "已接入 · " + (cfg.model || "未填模型")
          : "未接入 API";
      }
      updateComposer();
      updateEmptyNote();
      if (state.configured && state.pendingQuestion && refs.input && !refs.input.value.trim()) {
        refs.input.value = state.pendingQuestion;
        state.pendingQuestion = "";
        if (refs.settings) refs.settings.open = false;
        updateEmptyNote();
        try { refs.input.focus(); } catch (err) { /* ignore */ }
      }
    }

    function scrollToBottom() {
      if (!refs.log) return;
      refs.log.scrollTop = refs.log.scrollHeight;
    }

    function hideEmpty() {
      if (refs.empty) refs.empty.hidden = true;
    }

    function showEmptyIfEmpty() {
      if (!refs.empty) return;
      var hasMessage = refs.log && refs.log.querySelector(".chat-msg");
      refs.empty.hidden = !!hasMessage;
    }

    /* ---------- 消息 ---------- */

    function appendMessage(role, text) {
      var entry = { role: role, content: String(text || ""), node: null };
      var wrap = elem("article", "chat-msg chat-msg--" + role);
      if (!wrap) return entry;
      var label = elem("p", "chat-msg__label", role === "user" ? "你" : "助教");
      var body = elem("div", "chat-msg__body");
      paintMarkdown(body, entry.content);
      wrap.appendChild(label);
      wrap.appendChild(body);
      if (refs.log) refs.log.appendChild(wrap);
      entry.node = wrap;
      state.messages.push(entry);
      hideEmpty();
      scrollToBottom();
      return entry;
    }

    function appendAssistantStream() {
      var wrap = elem("article", "chat-msg chat-msg--assistant chat-msg--streaming");
      if (!wrap) return null;
      var label = elem("p", "chat-msg__label", "助教");
      var body = elem("div", "chat-msg__body");
      body.appendChild(elem("p", "chat-msg__thinking", "正在检索论文并组织回答…"));
      var caret = elem("span", "chat-caret");
      caret.setAttribute("aria-hidden", "true");
      wrap.appendChild(label);
      wrap.appendChild(body);
      wrap.appendChild(caret);
      if (refs.log) refs.log.appendChild(wrap);
      hideEmpty();
      scrollToBottom();
      return { wrap: wrap, body: body, caret: caret };
    }

    function attachNote(wrap, text, tone) {
      if (!wrap) return;
      var note = elem("p", "chat-msg__note", text);
      if (tone) note.setAttribute("data-tone", tone);
      wrap.appendChild(note);
      scrollToBottom();
      return note;
    }

    function removeLastTurn() {
      // 重试前清掉上一条用户消息与可能残留的半截回答。
      while (state.messages.length && state.messages[state.messages.length - 1].role === "assistant") {
        var assistant = state.messages.pop();
        removeNode(assistant.node);
      }
      for (var i = state.messages.length - 1; i >= 0; i -= 1) {
        if (state.messages[i].role === "user") {
          var entry = state.messages.splice(i, 1)[0];
          removeNode(entry.node);
          return entry.content;
        }
      }
      return "";
    }

    function showError(info, question) {
      var wrap = elem("article", "chat-msg chat-msg--assistant chat-msg--error");
      if (!wrap) return;
      var label = elem("p", "chat-msg__label", "助教 · 未完成");
      var body = elem("div", "chat-msg__body");
      paintMarkdown(body, "**请求没有完成。**\n\n" + info.text);
      wrap.appendChild(label);
      wrap.appendChild(body);
      if (question) {
        var retry = elem("button", "chat-btn chat-btn--quiet chat-retry", "重试这个问题");
        retry.type = "button";
        retry.setAttribute("aria-label", "重试上一个问题");
        retry.addEventListener("click", function () {
          removeNode(wrap);
          var restored = removeLastTurn();
          showEmptyIfEmpty();
          ask(restored || question);
        });
        wrap.appendChild(retry);
      }
      if (refs.log) refs.log.appendChild(wrap);
      if (info.field) highlightField(info.field);
      setStatus(info.text);
      scrollToBottom();
    }

    function buildRequestMessages(context) {
      var system = "";
      try {
        system = AI && typeof AI.systemPrompt === "function" ? AI.systemPrompt("chat") : "你是论文助教。";
      } catch (err) {
        system = "你是论文助教。";
      }
      if (context) {
        system += "\n\n【论文上下文】\n" + context +
          "\n\n以上是本次回答允许依据的论文原文。上下文里没有的信息，明确说“论文上下文里没有提到”，不要靠记忆补全。";
      } else {
        system += "\n\n【论文上下文】\n（本次未能载入论文上下文。请说明无法依据原文回答，并建议读者检查页面是否完整加载。）";
      }
      var messages = [{ role: "system", content: system }];
      var history = state.messages
        .filter(function (item) { return item && item.content; })
        .slice(-12);
      while (history.length && history[0].role !== "user") history.shift();
      history.forEach(function (item) {
        messages.push({ role: item.role, content: item.content });
      });
      return messages;
    }

    function setBasis(context, fallbackText) {
      if (!refs.basis) return;
      if (fallbackText) {
        refs.basis.textContent = fallbackText;
        return;
      }
      refs.basis.textContent = buildBasisText(context);
    }

    function makePainter(bodyNode) {
      var pending = "";
      var frame = 0;
      function paint() {
        frame = 0;
        paintMarkdown(bodyNode, pending);
        scrollToBottom();
      }
      return {
        push: function (delta, full) {
          pending = typeof full === "string" ? full : pending + String(delta || "");
          if (!frame) frame = scheduleFrame(paint);
        },
        flush: function (text) {
          if (frame) {
            cancelFrame(frame);
            frame = 0;
          }
          if (typeof text === "string") pending = text;
          paintMarkdown(bodyNode, pending);
          scrollToBottom();
        },
        value: function () { return pending; }
      };
    }

    function updateStopButton() {
      if (refs.stop) refs.stop.hidden = !state.configured || !state.streaming;
    }

    /* ---------- 发送 ---------- */

    async function ask(question) {
      var text = String(question === undefined || question === null ? "" : question).trim();
      if (!text || state.streaming || state.destroyed) return;
      if (!AI || typeof AI.chat !== "function") {
        setStatus("AI 接入层未加载，无法提问。");
        setSettingsMessage("AI 接入层（assets/js/api.js）未加载。", "error");
        return;
      }
      if (!safeIsConfigured()) {
        state.pendingQuestion = text;
        openSettings("apiKey");
        updateEmptyNote();
        setStatus("尚未接入 API，问题已记下。");
        return;
      }

      var focusWasInComposer = doc.activeElement === refs.input;
      state.streaming = true;
      state.focusInComposer = focusWasInComposer;
      updateComposer();
      updateStopButton();
      setStatus("正在生成回答…");

      if (refs.input) refs.input.value = "";
      appendMessage("user", text);

      var stream = appendAssistantStream();
      var painter = stream ? makePainter(stream.body) : null;
      var controller = makeController();
      state.controller = controller;

      setBasis("", "依据：正在检索相关小节…");
      var context = "";
      try {
        if (AI && typeof AI.buildContext === "function") {
          context = AI.buildContext({ key: state.currentKey || undefined, query: text });
        }
      } catch (err) {
        context = "";
      }
      context = typeof context === "string" ? context : "";
      setBasis(context);
      setStatus("依据已载入，正在等待回答…");

      var messages = buildRequestMessages(context);
      var resultFull = "";

      try {
        var returned = await AI.chat({
          messages: messages,
          signal: controller ? controller.signal : undefined,
          onDelta: function (delta, full) {
            if (painter) painter.push(delta, full);
          }
        });
        if (state.destroyed) return;
        resultFull = typeof returned === "string" ? returned : (painter ? painter.value() : "");
        if (resultFull.trim()) {
          if (painter) painter.flush(resultFull);
          else if (stream) paintMarkdown(stream.body, resultFull);
          state.messages.push({ role: "assistant", content: resultFull, node: stream ? stream.wrap : null });
          if (stream) stream.wrap.classList.remove("chat-msg--streaming");
          if (stream && stream.caret) removeNode(stream.caret);
          setStatus("回答完成。");
        } else {
          removeNode(stream ? stream.wrap : null);
          showEmptyIfEmpty();
          showError({ text: "助教没有返回内容。请重试，或把问题拆小一点。", field: null }, text);
        }
      } catch (err) {
        if (state.destroyed) return;
        var aborted = isAbortError(err);
        var partial = painter ? painter.value() : "";
        if (aborted) {
          if (partial.trim()) {
            painter.flush(partial);
            if (stream) stream.wrap.classList.remove("chat-msg--streaming");
            if (stream && stream.caret) removeNode(stream.caret);
            state.messages.push({ role: "assistant", content: partial, node: stream ? stream.wrap : null });
            if (stream) attachNote(stream.wrap, "已停止生成，保留了已经写出的部分。");
            setStatus("已停止生成。");
          } else {
            removeNode(stream ? stream.wrap : null);
            showEmptyIfEmpty();
            setStatus("已停止生成。");
          }
        } else {
          if (partial.trim()) {
            painter.flush(partial);
            if (stream) stream.wrap.classList.remove("chat-msg--streaming");
            if (stream && stream.caret) removeNode(stream.caret);
            state.messages.push({ role: "assistant", content: partial, node: stream ? stream.wrap : null });
            if (stream) attachNote(stream.wrap, "回答没有写完，可以重试。", "error");
          } else {
            removeNode(stream ? stream.wrap : null);
            showEmptyIfEmpty();
          }
          var info = describeError(err);
          showError(info, text);
        }
      } finally {
        state.streaming = false;
        state.controller = null;
        updateComposer();
        updateStopButton();
        if (state.focusInComposer && refs.input && !refs.input.disabled) {
          var active = doc.activeElement;
          var inSettings = !!(active && refs.settings && typeof refs.settings.contains === "function" && refs.settings.contains(active));
          if (!inSettings) {
            try { refs.input.focus(); } catch (err) { /* ignore */ }
          }
        }
        state.focusInComposer = false;
      }
    }

    /* ---------- 设置面板事件 ---------- */

    function onSave() {
      clearFieldErrors();
      var baseUrl = normalizeBaseUrlInput(refs.baseUrl ? refs.baseUrl.value : "");
      var apiKey = refs.apiKey ? refs.apiKey.value.trim() : "";
      var model = refs.model ? refs.model.value.trim() : "";
      var temperature = refs.temperature ? Number(refs.temperature.value) : 0.3;
      if (!isFinite(temperature)) temperature = 0.3;

      if (!baseUrl) {
        setSettingsMessage("请填写 Base URL。", "error");
        highlightField("baseUrl");
        return;
      }
      if (!apiKey && !isLocalBaseUrl(baseUrl)) {
        setSettingsMessage("请填写 API Key。只有 localhost 等本地接口可以留空。", "error");
        highlightField("apiKey");
        return;
      }
      if (!model) {
        setSettingsMessage("请填写模型名。可以先点“测试连接”，从候选里选一个。", "error");
        highlightField("model");
        return;
      }
      try {
        if (!AI || typeof AI.saveConfig !== "function") throw new Error("AI 接入层未加载，无法保存配置。");
        AI.saveConfig({ baseUrl: baseUrl, apiKey: apiKey, model: model, temperature: temperature });
      } catch (err) {
        setSettingsMessage((err && err.message) || "保存失败。", "error");
        return;
      }
      fillForm(safeLoadConfig());
      refreshConfigState();
      if (state.configured) {
        setSettingsMessage("已保存到本机，正在验证连接…", "pending");
        onTestConnection(true);
      } else {
        setSettingsMessage("已保存到本机，但还没有可用的 Key。", "error");
      }
      updateEmptyNote();
    }

    async function onTestConnection(isAuto) {
      clearFieldErrors();
      var baseUrl = normalizeBaseUrlInput(refs.baseUrl ? refs.baseUrl.value : "");
      var apiKey = refs.apiKey ? refs.apiKey.value.trim() : "";
      if (!baseUrl) {
        setSettingsMessage("请先填写 Base URL。", "error");
        highlightField("baseUrl");
        return;
      }
      if (!apiKey && !isLocalBaseUrl(baseUrl)) {
        setSettingsMessage("请先填写 API Key。", "error");
        highlightField("apiKey");
        return;
      }
      if (!AI || typeof AI.listModels !== "function") {
        setSettingsMessage("AI 接入层未加载，无法测试连接。", "error");
        return;
      }
      var button = refs.test;
      if (button) {
        button.disabled = true;
        button.textContent = "测试中…";
      }
      setSettingsMessage((isAuto ? "已保存，正在连接 " : "正在连接 ") + baseUrl + " …", "pending");
      try {
        var models = await AI.listModels({ baseUrl: baseUrl, apiKey: apiKey });
        if (!Array.isArray(models)) models = [];
        if (refs.modelList) clearNode(refs.modelList);
        var seen = {};
        models.slice(0, 120).forEach(function (item) {
          var id = item && item.id ? String(item.id) : "";
          if (!id || seen[id]) return;
          seen[id] = true;
          var option = doc.createElement("option");
          option.value = id;
          if (refs.modelList) refs.modelList.appendChild(option);
        });
        var hasModel = refs.model && refs.model.value.trim();
        setSettingsMessage(
          "连接成功 · " + models.length + " 个模型" + (hasModel || !models.length ? "。" : "。可在模型名里选择。"),
          "ok"
        );
      } catch (err) {
        var info = describeError(err);
        setSettingsMessage((isAuto ? "已保存到本机，但测试连接失败：" : "连接失败：") + info.text, "error");
        if (info.field) highlightField(info.field);
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "测试连接";
        }
      }
    }

    function onClearConfig() {
      try {
        if (AI && typeof AI.clearConfig === "function") AI.clearConfig();
      } catch (err) { /* ignore */ }
      var defaults = (AI && AI.DEFAULTS) || {};
      fillForm({
        baseUrl: defaults.baseUrl || "",
        apiKey: "",
        model: defaults.model || "",
        temperature: typeof defaults.temperature === "number" ? defaults.temperature : 0.3
      });
      clearFieldErrors();
      if (refs.modelList) clearNode(refs.modelList);
      setKeyVisibility(false);
      refreshConfigState();
      openSettings();
      setSettingsMessage("已清除本机配置。", "ok");
      updateEmptyNote();
    }

    /* ---------- 事件绑定 ---------- */

    if (refs.suggestions) {
      SUGGESTIONS.forEach(function (text, index) {
        var button = elem("button", "chat-suggestion");
        if (!button) return;
        button.type = "button";
        button.setAttribute("data-index", String(index));
        var marker = elem("span", "chat-suggestion__index", ["其一", "其二", "其三", "其四"][index] || String(index + 1));
        button.appendChild(marker);
        button.appendChild(doc.createTextNode(text));
        button.addEventListener("click", function () {
          if (state.configured) {
            ask(text);
          } else {
            state.pendingQuestion = text;
            updateEmptyNote();
            openSettings(refs.baseUrl && !refs.baseUrl.value ? "baseUrl" : "apiKey");
            setStatus("接入 API 后即可发送这个问题。");
          }
        });
        refs.suggestions.appendChild(button);
      });
    }

    if (refs.send) {
      refs.send.addEventListener("click", function () {
        ask(refs.input ? refs.input.value : "");
      });
    }

    if (refs.stop) {
      refs.stop.addEventListener("click", function () {
        if (state.controller) {
          try { state.controller.abort(); } catch (err) { /* ignore */ }
        }
        setStatus("正在停止…");
      });
    }

    if (refs.connect) {
      refs.connect.addEventListener("click", function () {
        openSettings(refs.apiKey && !refs.apiKey.value ? "apiKey" : "baseUrl");
      });
    }

    if (refs.input) {
      refs.input.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return;
        if (event.isComposing || event.keyCode === 229) return;
        event.preventDefault();
        ask(refs.input.value);
      });
    }

    if (refs.keyToggle) {
      refs.keyToggle.addEventListener("click", function () {
        var visible = refs.apiKey && refs.apiKey.type === "password";
        setKeyVisibility(!!visible);
      });
    }

    if (refs.temperature) refs.temperature.addEventListener("input", updateTemperatureLabel);
    if (refs.save) refs.save.addEventListener("click", onSave);
    if (refs.test) refs.test.addEventListener("click", onTestConnection);
    if (refs.clear) refs.clear.addEventListener("click", onClearConfig);

    [refs.baseUrl, refs.apiKey, refs.model].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", function () {
        var wrap = fieldWrapOf(input);
        if (wrap) wrap.classList.remove("chat-field--error");
      });
    });

    fillForm(safeLoadConfig());
    setKeyVisibility(false);
    refreshConfigState();
    if (refs.settings) refs.settings.open = !state.configured;

    var initialContext = "";
    try {
      if (AI && typeof AI.buildContext === "function") {
        initialContext = AI.buildContext({ key: state.currentKey || undefined });
      }
    } catch (err) {
      initialContext = "";
    }
    setBasis(typeof initialContext === "string" ? initialContext : "");

    var api = {
      destroy: function () {
        state.destroyed = true;
        if (state.controller) {
          try { state.controller.abort(); } catch (err) { /* ignore */ }
        }
        state.controller = null;
        state.messages = [];
        if (root.__chatUI === api) root.__chatUI = null;
      }
    };
    root.__chatUI = api;
    return api;
  }

  /* ========================================================================== *
   * 六、ChatUI.attachGrading — 问答题 AI 批改
   * ========================================================================== */

  function gradingTemplate(prefix) {
    return `
<section class="chat-grade" aria-labelledby="${prefix}-title">
  <div class="chat-grade__head">
    <p class="chat-kicker" id="${prefix}-title">AI 批改</p>
    <p class="chat-grade__status" id="${prefix}-status" role="status" aria-live="polite"></p>
  </div>
  <p class="chat-grade__config" id="${prefix}-config"></p>
  <label class="chat-sr-only" for="${prefix}-answer">你的回答</label>
  <textarea class="chat-textarea chat-grade__answer" id="${prefix}-answer" rows="5" maxlength="1200" placeholder="用你自己的话写，50–150 字即可"></textarea>
  <div class="chat-grade__meta">
    <span class="chat-grade__count" id="${prefix}-count">0 字</span>
    <span class="chat-grade__hint" id="${prefix}-hint"></span>
  </div>
  <div class="chat-grade__actions">
    <button type="button" class="chat-btn chat-btn--primary" id="${prefix}-submit">请 AI 批改</button>
    <button type="button" class="chat-btn chat-stop" id="${prefix}-stop" hidden>停止批改</button>
    <button type="button" class="chat-btn chat-btn--quiet" id="${prefix}-ref" aria-expanded="false" aria-controls="${prefix}-refbody">查看参考答案</button>
    <button type="button" class="chat-btn chat-btn--quiet" id="${prefix}-clear">清除重写</button>
  </div>
  <div class="chat-grade__reference" id="${prefix}-refbody" hidden>
    <p class="chat-grade__label">参考答案</p>
    <div class="chat-grade__ref-text" id="${prefix}-reftext"></div>
  </div>
  <div class="chat-grade__result" id="${prefix}-result" aria-live="polite"></div>
</section>`;
  }

  // 批改成功后通知宿主（app.js 用它更新练习进度）；失败/未配置不派发。
  function emitGraded(container, score, quizId) {
    if (!container || typeof container.dispatchEvent !== "function") return;
    var detail = { score: score, quizId: quizId ? String(quizId) : "" };
    try {
      if (typeof global.CustomEvent === "function") {
        container.dispatchEvent(new global.CustomEvent("chatui:graded", { bubbles: true, detail: detail }));
        return;
      }
      var event = doc.createEvent("CustomEvent");
      event.initCustomEvent("chatui:graded", true, false, detail);
      container.dispatchEvent(event);
    } catch (err) { /* 宿主没有监听时静默 */ }
  }

  function appendGradeList(parent, title, items) {
    var list = (Array.isArray(items) ? items : []).filter(function (item) {
      return item !== undefined && item !== null && String(item).trim();
    });
    if (!list.length) return;
    var section = elem("section", "chat-grade__section");
    if (!section) return;
    section.appendChild(elem("h4", null, title));
    var ul = elem("ul");
    list.forEach(function (item) {
      ul.appendChild(elem("li", null, String(item)));
    });
    section.appendChild(ul);
    parent.appendChild(section);
  }

  function renderGradeResult(box, result) {
    if (!box) return;
    clearNode(box);
    var scoreNumber = Number(result && result.score);
    var score = isFinite(scoreNumber) ? Math.max(0, Math.min(100, Math.round(scoreNumber))) : 0;

    var row = elem("div", "chat-grade__score-row");
    var scoreNode = elem("p", "chat-grade__score", String(score));
    scoreNode.appendChild(elem("small", null, "/ 100"));
    row.appendChild(scoreNode);

    var meta = elem("div", "chat-grade__score-meta");
    meta.appendChild(elem("p", "chat-grade__level", "等级 · " + levelForScore(score)));
    if (result && result.verdict) meta.appendChild(elem("p", "chat-grade__verdict", String(result.verdict)));
    row.appendChild(meta);
    box.appendChild(row);

    appendGradeList(box, "做到的地方", result && result.strengths);
    appendGradeList(box, "可以补的地方", result && result.improvements);

    if (result && result.suggestion) {
      var section = elem("section", "chat-grade__section");
      section.appendChild(elem("h4", null, "下一步"));
      section.appendChild(elem("p", "chat-grade__suggestion", String(result.suggestion)));
      box.appendChild(section);
    }
  }

  function attachGrading(container, quiz) {
    if (!doc || !container || typeof container.appendChild !== "function") return null;
    ensureStyle();

    if (container.__chatGrading && typeof container.__chatGrading.destroy === "function") {
      try { container.__chatGrading.destroy(); } catch (err) { /* ignore */ }
    }
    clearNode(container);

    var item = quiz && typeof quiz === "object" ? quiz : {};
    var prefix = uid("chat-grade");
    container.innerHTML = gradingTemplate(prefix);

    var refs = {
      status: container.querySelector("#" + prefix + "-status"),
      config: container.querySelector("#" + prefix + "-config"),
      answer: container.querySelector("#" + prefix + "-answer"),
      count: container.querySelector("#" + prefix + "-count"),
      hint: container.querySelector("#" + prefix + "-hint"),
      submit: container.querySelector("#" + prefix + "-submit"),
      stop: container.querySelector("#" + prefix + "-stop"),
      referenceToggle: container.querySelector("#" + prefix + "-ref"),
      clear: container.querySelector("#" + prefix + "-clear"),
      referenceBody: container.querySelector("#" + prefix + "-refbody"),
      referenceText: container.querySelector("#" + prefix + "-reftext"),
      result: container.querySelector("#" + prefix + "-result")
    };

    var state = {
      busy: false,
      controller: null,
      referencePainted: false,
      destroyed: false
    };

    container.setAttribute("data-quiz-id", item.id ? String(item.id) : "");

    function setGradeStatus(text, tone) {
      if (!refs.status) return;
      refs.status.textContent = text || "";
      if (tone) refs.status.setAttribute("data-tone", tone);
      else refs.status.removeAttribute("data-tone");
    }

    function setResultError(text, field) {
      if (!refs.result) return;
      clearNode(refs.result);
      var wrap = elem("div", "chat-grade__section");
      wrap.appendChild(elem("p", "chat-grade__suggestion", text));
      if (field) {
        var linkRow = elem("p", "chat-grade__error-link");
        var link = elem("a", null, "去问学页检查设置");
        link.setAttribute("href", "#/chat");
        linkRow.appendChild(link);
        wrap.appendChild(linkRow);
      }
      refs.result.appendChild(wrap);
    }

    function buildConfigNote() {
      if (!refs.config) return;
      clearNode(refs.config);
      var configured = safeIsConfigured();
      refs.config.hidden = configured;
      if (configured) return;
      refs.config.appendChild(doc.createTextNode("尚未接入 API。请先到 "));
      var link = elem("a", null, "问学页");
      link.setAttribute("href", "#/chat");
      refs.config.appendChild(link);
      refs.config.appendChild(doc.createTextNode(" 填写 Base URL、API Key 和模型名，保存后即可批改。"));
    }

    function paintReference() {
      if (state.referencePainted || !refs.referenceText) return;
      state.referencePainted = true;
      paintTrusted(refs.referenceText, item.reference || "（这道题暂无参考答案。）");
    }

    function updateCount() {
      if (!refs.count || !refs.answer) return;
      refs.count.textContent = visibleCharCount(refs.answer.value) + " 字";
    }

    function updateControls() {
      var configured = safeIsConfigured();
      if (refs.submit) {
        refs.submit.disabled = state.busy || !configured;
        refs.submit.textContent = state.busy ? "批改中…" : "请 AI 批改";
      }
      if (refs.stop) refs.stop.hidden = !state.busy;
      if (refs.answer) refs.answer.disabled = state.busy;
      if (refs.clear) refs.clear.disabled = state.busy;
    }

    async function grade() {
      if (state.busy || state.destroyed) return;
      var answer = refs.answer ? refs.answer.value.trim() : "";
      if (!answer) {
        setGradeStatus("先写几句，再请助教批改。", "error");
        if (refs.answer) { try { refs.answer.focus(); } catch (err) { /* ignore */ } }
        return;
      }
      if (!safeIsConfigured()) {
        buildConfigNote();
        setGradeStatus("尚未接入 API，无法批改。请先到问学页接入。", "error");
        updateControls();
        return;
      }
      var AI = getAI();
      if (!AI || typeof AI.gradeAnswer !== "function") {
        setGradeStatus("AI 接入层未加载，无法批改。", "error");
        return;
      }

      state.busy = true;
      updateControls();
      setGradeStatus("正在批改…（可点停止）", "pending");
      if (refs.result) clearNode(refs.result);

      var controller = makeController();
      state.controller = controller;

      try {
        var result = await AI.gradeAnswer({
          question: item.q,
          answer: answer,
          reference: item.reference,
          rubric: item.rubric,
          config: AI.loadConfig(),
          signal: controller ? controller.signal : undefined
        });
        if (state.destroyed) return;
        if (!result || result.score === null || result.score === undefined || !isFinite(Number(result.score))) {
          setGradeStatus("AI 返回格式异常，请重试", "error");
          setResultError("AI 返回格式异常，请重试。你写的内容还在，可以直接再点一次“请 AI 批改”。", null);
          return;
        }
        renderGradeResult(refs.result, result);
        emitGraded(container, Number(result.score), item.id);
        setGradeStatus("批改完成 · 仅供参考，请对照原文。", "ok");
      } catch (err) {
        if (state.destroyed) return;
        if (isAbortError(err)) {
          setGradeStatus("已停止批改。", "pending");
        } else {
          var info = describeError(err);
          setGradeStatus(info.text, "error");
          setResultError(info.text, info.field);
        }
      } finally {
        state.busy = false;
        state.controller = null;
        updateControls();
      }
    }

    function onReferenceToggle() {
      var open = refs.referenceToggle.getAttribute("aria-expanded") !== "true";
      refs.referenceToggle.setAttribute("aria-expanded", open ? "true" : "false");
      refs.referenceToggle.textContent = open ? "收起参考答案" : "查看参考答案";
      if (refs.referenceBody) refs.referenceBody.hidden = !open;
      if (open) paintReference();
    }

    function onClear() {
      if (refs.answer) {
        refs.answer.value = "";
        updateCount();
        try { refs.answer.focus(); } catch (err) { /* ignore */ }
      }
      if (refs.result) clearNode(refs.result);
      setGradeStatus("");
      if (refs.referenceToggle) {
        refs.referenceToggle.setAttribute("aria-expanded", "false");
        refs.referenceToggle.textContent = "查看参考答案";
      }
      if (refs.referenceBody) refs.referenceBody.hidden = true;
      buildConfigNote();
      updateControls();
    }

    function onStop() {
      if (state.controller) {
        try { state.controller.abort(); } catch (err) { /* ignore */ }
      }
      setGradeStatus("正在停止…");
    }

    function syncConfig() {
      buildConfigNote();
      updateControls();
    }

    if (item.hint) paintTrusted(refs.hint, item.hint);
    else if (refs.hint) refs.hint.textContent = "先自己写，再对照参考答案。";

    refs.answer.addEventListener("input", updateCount);
    refs.answer.addEventListener("focus", syncConfig);
    refs.answer.addEventListener("input", syncConfig);
    if (refs.submit) refs.submit.addEventListener("click", grade);
    if (refs.stop) refs.stop.addEventListener("click", onStop);
    if (refs.referenceToggle) refs.referenceToggle.addEventListener("click", onReferenceToggle);
    if (refs.clear) refs.clear.addEventListener("click", onClear);

    updateCount();
    buildConfigNote();
    updateControls();

    var api = {
      destroy: function () {
        state.destroyed = true;
        if (state.controller) {
          try { state.controller.abort(); } catch (err) { /* ignore */ }
        }
        state.controller = null;
        if (container.__chatGrading === api) container.__chatGrading = null;
      }
    };
    container.__chatGrading = api;
    return api;
  }

  /* ========================================================================== *
   * 七、导出
   * ========================================================================== */

  var ChatUI = {
    render: render,
    attachGrading: attachGrading,
    SUGGESTIONS: SUGGESTIONS.slice(),
    // 仅供 Node 测试纯逻辑使用；页面集成不要依赖这些内部函数。
    _internal: {
      escapeHtml: escapeHtml,
      formatInt: formatInt,
      visibleCharCount: visibleCharCount,
      isAbortError: isAbortError,
      describeError: describeError,
      levelForScore: levelForScore,
      parseContextLabels: parseContextLabels,
      buildBasisText: buildBasisText,
      markdownHtml: markdownHtml,
      isLocalBaseUrl: isLocalBaseUrl
    }
  };

  if (typeof window !== "undefined" && window) window.ChatUI = ChatUI;
  if (global && (typeof window === "undefined" || global !== window)) global.ChatUI = ChatUI;
  if (typeof module !== "undefined") module.exports = ChatUI;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
