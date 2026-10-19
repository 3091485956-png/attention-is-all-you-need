/*!
 * assets/js/api.js — 《Attention Is All You Need》中文注疏本 · AI 接入层
 *
 * 纯静态站点专用：无外部依赖，不 import/export，浏览器用 <script> 直接加载。
 * 暴露 window.AI（Node 下同时 module.exports），负责：
 *   配置读写 / OpenAI 兼容 chat 流式请求 / 问答题评分 / 论文上下文拼装 / 系统提示词 / 模型列表。
 *
 * 配置只存 localStorage('annotated-ai-config')，本文件任何路径都不打印 API Key。
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "annotated-ai-config";
  var TRUNC_MARK = "[...节选]";
  var DEFAULT_MAX_CHARS = 9000;

  var DEFAULTS = {
    baseUrl: "https://api.openai.com/v1",
    model: "",
    apiKey: "",
    temperature: 0.3
  };

  /* ========================================================================== *
   * 一、配置
   * ========================================================================== */

  function getStorage() {
    // 先取 globalThis.localStorage（Node 测试/浏览器都可用），再回退到 window。
    try {
      if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
    } catch (err) { /* localStorage 被禁用 */ }
    try {
      if (global && global.localStorage) return global.localStorage;
    } catch (err) { /* ignore */ }
    return null;
  }

  function stripTrailingSlash(value) {
    return String(value).replace(/\/+$/, "");
  }

  function toConfigString(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  function normalizeBaseUrl(value) {
    var trimmed = stripTrailingSlash(String(value === undefined || value === null ? "" : value).trim());
    var parsed = null;
    try {
      parsed = new URL(trimmed);
    } catch (err) {
      parsed = null;
    }
    if (!parsed || !/^https?:$/i.test(parsed.protocol)) {
      throw new Error("Base URL 无效：需要以 http:// 或 https:// 开头的完整地址，例如 https://api.openai.com/v1。");
    }
    return trimmed;
  }

  function normalizeTemperature(value) {
    var number = typeof value === "number" ? value : Number(String(value).trim());
    if (!isFinite(number) || number < 0 || number > 2) {
      throw new Error("temperature 必须是 0 到 2 之间的数字。");
    }
    return number;
  }

  function loadConfig() {
    var config = {
      baseUrl: DEFAULTS.baseUrl,
      model: DEFAULTS.model,
      apiKey: DEFAULTS.apiKey,
      temperature: DEFAULTS.temperature
    };
    var store = getStorage();
    if (!store) return config;

    var raw = null;
    try {
      raw = store.getItem(STORAGE_KEY);
    } catch (err) {
      return config;
    }
    if (!raw) return config;

    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return config;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return config;

    if (typeof parsed.baseUrl === "string" && parsed.baseUrl.trim()) {
      config.baseUrl = stripTrailingSlash(parsed.baseUrl.trim());
    }
    if (typeof parsed.model === "string") config.model = parsed.model;
    if (typeof parsed.apiKey === "string") config.apiKey = parsed.apiKey;
    if (parsed.temperature !== undefined && parsed.temperature !== null && parsed.temperature !== "") {
      var temperature = Number(parsed.temperature);
      if (isFinite(temperature) && temperature >= 0 && temperature <= 2) {
        config.temperature = temperature;
      }
    }
    return config;
  }

  function saveConfig(cfg) {
    var source = cfg && typeof cfg === "object" ? cfg : {};
    var baseUrlValue = source.baseUrl !== undefined ? source.baseUrl : DEFAULTS.baseUrl;
    if (typeof baseUrlValue !== "string" || !baseUrlValue.trim()) {
      throw new Error("Base URL 不能为空。");
    }
    var normalized = {
      baseUrl: normalizeBaseUrl(baseUrlValue),
      model: toConfigString(source.model),
      apiKey: toConfigString(source.apiKey),
      temperature: source.temperature === undefined || source.temperature === null || source.temperature === ""
        ? DEFAULTS.temperature
        : normalizeTemperature(source.temperature)
    };
    var store = getStorage();
    if (!store) {
      throw new Error("当前环境不支持 localStorage，无法保存配置。");
    }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch (err) {
      throw new Error("保存配置失败：浏览器拒绝写入 localStorage（可能处于无痕模式或空间已满）。");
    }
    return normalized;
  }

  function clearConfig() {
    var store = getStorage();
    if (!store) return;
    try {
      store.removeItem(STORAGE_KEY);
    } catch (err) { /* ignore */ }
  }

  function isLocalBaseUrl(baseUrl) {
    var source = String(baseUrl === undefined || baseUrl === null ? "" : baseUrl).trim();
    var hostname = "";
    try {
      hostname = new URL(source).hostname.toLowerCase();
    } catch (err) {
      var match = /^https?:\/\/([^\/:?#]+)/i.exec(source);
      hostname = match ? match[1].toLowerCase() : "";
    }
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]") {
      return true;
    }
    return hostname.length > 10 && hostname.slice(-10) === ".localhost";
  }

  function isConfigured(cfg) {
    var config = cfg && typeof cfg === "object" ? Object.assign({}, loadConfig(), cfg) : loadConfig();
    var baseUrl = typeof config.baseUrl === "string" ? config.baseUrl.trim() : "";
    if (!baseUrl) return false;
    var apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
    if (apiKey) return true;
    // 本地 endpoint（localhost / 127.0.0.1）允许不填 key，例如 Ollama、LM Studio。
    return isLocalBaseUrl(baseUrl);
  }

  function endpointUrl(baseUrl) {
    var raw = typeof baseUrl === "string" && baseUrl.trim() ? baseUrl.trim() : DEFAULTS.baseUrl;
    var base = stripTrailingSlash(raw);
    if (!base) base = DEFAULTS.baseUrl;
    if (/\/chat\/completions$/i.test(base)) return base;
    return base + "/chat/completions";
  }

  function modelsUrl(baseUrl) {
    var endpoint = endpointUrl(baseUrl);
    return endpoint.replace(/\/chat\/completions$/i, "") + "/models";
  }

  /* ========================================================================== *
   * 二、系统提示词
   * ========================================================================== */

  var SYSTEM_CHAT = [
    "你是《Attention Is All You Need》中文注疏本网站的 AI 助教。读者是零基础、但具备高中数学能力的学习者。",
    "",
    "回答规则：",
    "1. 只依据用户消息中提供的【论文上下文】回答。上下文里没有的信息，明确说“论文上下文里没有提到”，不要靠记忆补全。",
    "2. 不确定时就直说“我不确定”，并说明缺哪条信息，不要伪装确定。",
    "3. 解释用零基础能懂的中文和高中数学语言：先给结论，再拆步骤，尽量给一个具体数字或小例子。",
    "4. 引用原文时给小节号（例如 3.2.1）或小节标题；不要大段翻译原文，用自己的话解释。",
    "5. 不编造数字、实验设置、引用文献或公式。公式要逐个符号说明含义。",
    "6. 回答简洁，默认控制在 300 字以内；用户要求展开时再展开。"
  ].join("\n");

  var SYSTEM_GRADE = [
    "你是《Attention Is All You Need》中文注疏本网站的 AI 批改助教，负责按 rubric（评分点）给读者的问答题打分。",
    "",
    "评分规则：",
    "1. 满分 100 分。逐条对照 rubric：答到给分，漏掉扣分，答错或含糊不给分。",
    "2. 严格：只认可答案中明确写出的内容，不替读者补全他没写出来的意思。",
    "3. 明确指出缺失或错误的评分点，并说明为什么扣分。",
    "4. 给出可执行的改进建议，具体到“补一句……”“把……换成……”，不要只说“加油”。",
    "5. 只依据题目、参考答案、rubric 和论文上下文，不引入外部知识，不编造数字。",
    "",
    "输出要求：只输出一个 JSON 对象，不要输出 Markdown 代码块，不要输出任何额外文字。JSON 结构：",
    '{"score":0-100,"verdict":"一句话总评","strengths":["..."],"improvements":["..."],"suggestion":"..."}'
  ].join("\n");

  function systemPrompt(mode) {
    return mode === "grade" ? SYSTEM_GRADE : SYSTEM_CHAT;
  }

  /* ========================================================================== *
   * 三、论文上下文（buildContext）
   * ========================================================================== */

  function decodeEntities(input) {
    var entities = {
      amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
      mdash: "—", ndash: "–", hellip: "…", times: "×", minus: "−",
      lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
      copy: "©", reg: "®", deg: "°", middot: "·", plusmn: "±",
      le: "≤", ge: "≥", ne: "≠", asymp: "≈", infin: "∞",
      sum: "∑", radic: "√", alpha: "α", beta: "β", gamma: "γ",
      delta: "δ", epsilon: "ε", lambda: "λ", mu: "μ", pi: "π",
      sigma: "σ", tau: "τ", phi: "φ", omega: "ω",
      Delta: "Δ", Sigma: "Σ", Omega: "Ω"
    };
    return String(input).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, function (match, code) {
      if (code.charAt(0) === "#") {
        var hex = code.charAt(1).toLowerCase() === "x";
        var number = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (isFinite(number) && number >= 0 && number <= 0x10ffff) {
          try {
            return String.fromCodePoint(number);
          } catch (err) {
            return match;
          }
        }
        return match;
      }
      var value = entities[code];
      return value !== undefined ? value : match;
    });
  }

  function htmlToText(html) {
    if (typeof html !== "string") return "";
    var text = html;
    text = text.replace(/<script\b[\s\S]*?<\/script>/gi, " ");
    text = text.replace(/<style\b[\s\S]*?<\/style>/gi, " ");
    // 公式保留 alttext（TeX 文本），例如 <math alttext="d_{k}">…</math> -> $d_{k}$
    text = text.replace(/<math\b([^>]*)>[\s\S]*?<\/math>/gi, function (match, attributes) {
      var attr = /\balttext\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attributes);
      var alt = attr ? (attr[1] !== undefined ? attr[1] : attr[2]) : "";
      alt = decodeEntities(alt).replace(/\s+/g, " ").trim();
      return alt ? " $" + alt + "$ " : " ";
    });
    text = text.replace(/<\/(?:p|div|h[1-6]|li|tr|table|section|figure|figcaption|blockquote|dt|dd)>/gi, "\n");
    text = text.replace(/<(?:br|hr)\s*\/?>/gi, "\n");
    text = text.replace(/<[^>]*>/g, " ");
    text = decodeEntities(text);
    text = text.replace(/\u00a0/g, " ");
    text = text.replace(/[ \t\f\v]+/g, " ");
    text = text.replace(/ *\n */g, "\n");
    text = text.replace(/\n{3,}/g, "\n\n");
    return text.trim();
  }

  var textCache = new Map();

  function htmlToTextCached(html) {
    if (typeof html !== "string") return "";
    if (textCache.has(html)) return textCache.get(html);
    var text = htmlToText(html);
    if (textCache.size > 60) textCache.clear();
    textCache.set(html, text);
    return text;
  }

  function getPaper() {
    var paper = null;
    try {
      if (typeof window !== "undefined" && window && window.PAPER) paper = window.PAPER;
      else if (global && global.PAPER) paper = global.PAPER;
    } catch (err) {
      paper = null;
    }
    if (!paper && typeof PAPER !== "undefined") paper = PAPER;
    if (!paper || !Array.isArray(paper.sections)) return null;
    return paper;
  }

  function normalizeMaxChars(value) {
    var number = typeof value === "number" ? value : Number(value);
    if (!isFinite(number) || number <= 0) return DEFAULT_MAX_CHARS;
    return Math.max(1, Math.floor(number));
  }

  function truncateTo(text, limit) {
    if (typeof text !== "string") return "";
    if (text.length <= limit) return text;
    if (limit <= TRUNC_MARK.length) return text.slice(0, limit);
    return text.slice(0, limit - TRUNC_MARK.length).replace(/\s+$/, "") + TRUNC_MARK;
  }

  function findSection(sections, key) {
    if (typeof key !== "string") return null;
    var needle = key.trim().toLowerCase();
    if (!needle || needle === "abstract" || needle === "摘要") return null;
    var usable = sections.filter(function (section) {
      return section && typeof section.id === "string";
    });
    var hit = usable.find(function (section) {
      return section.id.toLowerCase() === needle;
    });
    if (hit) return hit;
    // 支持 quiz id 之类的前缀，例如 "S3q2" / "S3.quiz1" -> S3
    var sorted = usable.slice().sort(function (a, b) { return b.id.length - a.id.length; });
    hit = sorted.find(function (section) {
      return needle.indexOf(section.id.toLowerCase()) === 0;
    });
    if (hit) return hit;
    hit = sorted.find(function (section) {
      return String(section.title || "").toLowerCase().indexOf(needle) >= 0;
    });
    return hit || null;
  }

  // 中文提问 -> 论文英文用词，让中文 query 也能命中英文原文。
  var CJK_TERM_MAP = {
    "自注意力": ["self-attention"],
    "注意力头": ["head"],
    "多头注意力": ["multi-head", "multihead"],
    "多头": ["multi-head", "multihead"],
    "注意力": ["attention"],
    "位置编码": ["positional encoding"],
    "位置": ["position"],
    "词嵌入": ["embedding"],
    "嵌入": ["embedding"],
    "编码器": ["encoder"],
    "解码器": ["decoder"],
    "前馈": ["feed-forward", "feedforward"],
    "残差": ["residual"],
    "层归一化": ["layer normalization"],
    "归一化": ["normalization"],
    "缩放": ["scaled"],
    "点积": ["dot product", "dot-product"],
    "掩码": ["mask"],
    "遮罩": ["mask"],
    "训练": ["training"],
    "优化器": ["optimizer"],
    "正则化": ["regularization"],
    "标签平滑": ["label smoothing"],
    "推断": ["inference"],
    "推理": ["inference"],
    "结果": ["results"],
    "实验": ["experiments"],
    "复杂度": ["complexity"],
    "并行": ["parallel"],
    "循环": ["recurrent"],
    "卷积": ["convolution"],
    "架构": ["architecture"],
    "可视化": ["visualizations"],
    "结论": ["conclusion"],
    "背景": ["background"],
    "引言": ["introduction"],
    "摘要": ["abstract"],
    "正弦": ["sinusoid"],
    "波长": ["wavelength"],
    "翻译": ["translation"],
    "解析": ["parsing"],
    "德语": ["english-to-german"],
    "法语": ["english-to-french"],
    "附录": ["visualizations"]
  };

  function tokenizeQuery(query) {
    var tokens = new Set();
    var source = String(query || "");
    var lower = source.toLowerCase();

    var latin = lower.match(/[a-z0-9][a-z0-9._+\-]*/g) || [];
    latin.forEach(function (token) {
      if (token.length >= 2) tokens.add(token);
    });

    var cjkRuns = source.match(/[\u4e00-\u9fff]+/g) || [];
    cjkRuns.forEach(function (run) {
      if (run.length === 1) {
        tokens.add(run);
        return;
      }
      for (var i = 0; i + 1 < run.length; i += 1) tokens.add(run.slice(i, i + 2));
    });

    Object.keys(CJK_TERM_MAP).forEach(function (chinese) {
      if (source.indexOf(chinese) >= 0) {
        CJK_TERM_MAP[chinese].forEach(function (english) {
          tokens.add(english.toLowerCase());
        });
      }
    });

    return Array.from(tokens);
  }

  function rankSectionsByQuery(sections, query, excluded) {
    var tokens = tokenizeQuery(query);
    if (!tokens.length) return [];
    var scored = [];
    sections.forEach(function (section, index) {
      if (!section || excluded && section.id === excluded.id) return;
      var title = String(section.title || "").toLowerCase();
      var body = htmlToTextCached(section.html).toLowerCase();
      if (!body && !title) return;
      var score = 0;
      tokens.forEach(function (token) {
        if (!token) return;
        if (title.indexOf(token) >= 0) score += 3;
        var position = body.indexOf(token);
        var hits = 1;
        while (position >= 0 && hits < 6) {
          score += 1;
          hits += 1;
          position = body.indexOf(token, position + token.length);
        }
      });
      if (score > 0) scored.push({ section: section, score: score, index: index });
    });
    scored.sort(function (a, b) {
      return b.score - a.score || a.index - b.index;
    });
    return scored.slice(0, 2).map(function (entry) { return entry.section; });
  }

  function buildContext(options) {
    var opts = options && typeof options === "object" ? options : {};
    var paper = getPaper();
    if (!paper) return "";
    var limit = normalizeMaxChars(opts.maxChars);
    var parts = [];

    var abstractHtml = paper.abstract && (paper.abstract.html || paper.abstract);
    var abstractText = htmlToTextCached(typeof abstractHtml === "string" ? abstractHtml : "");
    if (abstractText) parts.push({ label: "摘要 Abstract", text: abstractText });

    var sections = paper.sections.filter(function (section) {
      return section && typeof section.html === "string";
    });

    var keySection = findSection(sections, opts.key);
    if (keySection) {
      var keyText = htmlToTextCached(keySection.html);
      if (keyText) parts.push({ label: "小节 " + keySection.title, text: keyText });
    }

    var query = typeof opts.query === "string" ? opts.query.trim() : "";
    if (query) {
      rankSectionsByQuery(sections, query, keySection).forEach(function (section) {
        var text = htmlToTextCached(section.html);
        if (text) parts.push({ label: "相关小节 " + section.title, text: text });
      });
    }

    var rendered = parts.map(function (part) {
      return "【" + part.label + "】\n" + part.text;
    }).join("\n\n");

    return truncateTo(rendered, limit);
  }

  /* ========================================================================== *
   * 四、HTTP / SSE 基础
   * ========================================================================== */

  function isAbortError(err) {
    return !!err && (err.name === "AbortError" || err.code === "ABORT_ERR" || err.code === 20);
  }

  function requestHeaders(config, stream) {
    var headers = { "Content-Type": "application/json" };
    if (stream) headers["Accept"] = "text/event-stream";
    if (config.apiKey) headers["Authorization"] = "Bearer " + config.apiKey;
    return headers;
  }

  function requestFetch(url, init) {
    var impl = null;
    try {
      if (typeof fetch === "function") impl = fetch;
      else if (global && typeof global.fetch === "function") impl = global.fetch;
    } catch (err) {
      impl = null;
    }
    if (!impl) return Promise.reject(new Error("当前环境不支持 fetch，无法调用 AI 接口。"));
    return impl(url, init);
  }

  function makeNetworkError(url, cause) {
    var error = new Error("无法连接到 " + url + "，请检查 Base URL 与网络。");
    error.name = "AINetworkError";
    error.status = 0;
    error.code = "NETWORK_ERROR";
    error.cause = cause;
    return error;
  }

  function clampText(value, limit) {
    var text = String(value === undefined || value === null ? "" : value).replace(/\s+/g, " ").trim();
    if (text.length <= limit) return text;
    return text.slice(0, limit) + "…";
  }

  function extractErrorMessage(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    var error = payload.error;
    if (typeof error === "string") return error;
    if (error && typeof error.message === "string") return error.message;
    if (typeof payload.message === "string") return payload.message;
    if (typeof payload.detail === "string") return payload.detail;
    return "";
  }

  function makeHttpError(status, serverMessage, url) {
    var prefix;
    if (status === 401) {
      prefix = "API Key 无效或未授权（HTTP 401），请在设置面板检查 API Key。";
    } else if (status === 403) {
      prefix = "当前 API Key 没有访问该模型的权限（HTTP 403）。";
    } else if (status === 404) {
      prefix = "接口路径不存在（HTTP 404），请检查 Base URL 是否指向 OpenAI 兼容接口（通常以 /v1 结尾）。";
    } else if (status === 429) {
      prefix = "请求被限流或额度不足（HTTP 429），请稍后重试或检查账户额度。";
    } else if (status >= 500) {
      prefix = "服务端错误（HTTP " + status + "），请稍后重试。";
    } else {
      prefix = "请求失败（HTTP " + status + "）。";
    }
    var detail = serverMessage ? " 服务端信息：" + clampText(serverMessage, 500) : "";
    var error = new Error(prefix + detail);
    error.name = "AIHttpError";
    error.status = status;
    error.serverMessage = serverMessage || "";
    error.url = url;
    return error;
  }

  async function readErrorPayload(response) {
    var text = "";
    try {
      text = await response.text();
    } catch (err) {
      return "";
    }
    if (!text) return "";
    try {
      var parsed = JSON.parse(text);
      var message = extractErrorMessage(parsed);
      if (message) return message;
    } catch (err) { /* 不是 JSON，按纯文本处理 */ }
    return clampText(text, 300);
  }

  function extractContent(part) {
    if (!part || typeof part !== "object") return "";
    var content = part.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      var text = "";
      content.forEach(function (item) {
        if (typeof item === "string") text += item;
        else if (item && typeof item.text === "string") text += item.text;
        else if (item && typeof item.content === "string") text += item.content;
      });
      return text;
    }
    return "";
  }

  function parseSseText(text, onDelta) {
    var lines = String(text || "").split(/\r?\n/);
    var sawData = false;
    var full = "";
    var push = function (delta) {
      if (!delta) return;
      full += delta;
      if (onDelta) onDelta(delta, full);
    };
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i].trim();
      if (line.indexOf("data:") !== 0) continue;
      sawData = true;
      var data = line.slice(5).trim();
      if (!data) continue;
      if (data === "[DONE]") break;
      var payload = null;
      try {
        payload = JSON.parse(data);
      } catch (err) {
        continue;
      }
      var choice = payload && Array.isArray(payload.choices) ? payload.choices[0] : null;
      if (!choice) continue;
      push(extractContent(choice.delta) || extractContent(choice.message) ||
        (typeof choice.text === "string" ? choice.text : ""));
    }
    return sawData ? full : null;
  }

  function consumeFullPayload(text, onDelta) {
    var trimmed = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!trimmed) return "";
    var parsed = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      parsed = null;
    }
    if (!parsed) {
      var sse = parseSseText(trimmed, onDelta);
      if (sse !== null) return sse;
      throw new Error("无法解析服务端响应：期望 JSON 或 SSE 数据流。");
    }
    var choice = parsed && Array.isArray(parsed.choices) ? parsed.choices[0] : null;
    var content = choice
      ? (extractContent(choice.message) || extractContent(choice.delta) ||
        (typeof choice.text === "string" ? choice.text : ""))
      : "";
    if (!content) return "";
    if (onDelta) onDelta(content, content);
    return content;
  }

  async function readChatStream(response, url, onDelta) {
    if (!response.body || typeof response.body.getReader !== "function") {
      var bodyText = "";
      try {
        bodyText = await response.text();
      } catch (err) {
        throw makeNetworkError(url, err);
      }
      return consumeFullPayload(bodyText, onDelta);
    }

    var reader = response.body.getReader();
    var decoder = new TextDecoder("utf-8");
    var buffer = "";
    var raw = "";
    var full = "";
    var sawSseData = false;
    var finished = false;

    var push = function (delta) {
      if (!delta) return;
      full += delta;
      if (onDelta) onDelta(delta, full);
    };

    var handleLine = function (line) {
      var trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.indexOf("data:") !== 0) return false;
      sawSseData = true;
      var data = trimmed.slice(5).trim();
      if (!data) return false;
      if (data === "[DONE]") return true;
      var payload = null;
      try {
        payload = JSON.parse(data);
      } catch (err) {
        return false; // 坏 JSON 行直接跳过
      }
      var choice = payload && Array.isArray(payload.choices) ? payload.choices[0] : null;
      if (!choice) return false;
      push(extractContent(choice.delta) || extractContent(choice.message) ||
        (typeof choice.text === "string" ? choice.text : ""));
      return false;
    };

    try {
      while (!finished) {
        var step = await reader.read();
        if (step.done) break;
        var decoded = decoder.decode(step.value, { stream: true });
        raw += decoded;
        buffer += decoded;
        var newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          var line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
          buffer = buffer.slice(newlineIndex + 1);
          if (handleLine(line)) {
            finished = true;
            break;
          }
          newlineIndex = buffer.indexOf("\n");
        }
      }
      if (!finished) {
        var tail = decoder.decode();
        raw += tail;
        buffer += tail;
        if (buffer.trim()) handleLine(buffer.replace(/\r$/, ""));
      } else {
        try {
          reader.cancel();
        } catch (err) { /* ignore */ }
      }
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw makeNetworkError(url, err);
    }

    if (!sawSseData && !full) return consumeFullPayload(raw, onDelta);
    return full;
  }

  function resolveConfig(config) {
    var loaded = loadConfig();
    var overrides = config && typeof config === "object" ? config : {};
    var merged = Object.assign({}, loaded, overrides);
    var baseUrl = typeof merged.baseUrl === "string" ? stripTrailingSlash(merged.baseUrl.trim()) : "";
    if (!baseUrl) {
      throw new Error("未配置 Base URL：请先在设置面板填写 OpenAI 兼容 API 的 Base URL。");
    }
    var temperature = merged.temperature;
    if (typeof temperature !== "number" || !isFinite(temperature) || temperature < 0 || temperature > 2) {
      temperature = DEFAULTS.temperature;
    }
    return {
      baseUrl: baseUrl,
      model: toConfigString(merged.model),
      apiKey: toConfigString(merged.apiKey),
      temperature: temperature
    };
  }

  /* ========================================================================== *
   * 五、chat / gradeAnswer / listModels
   * ========================================================================== */

  async function performChat(url, payload, config, onDelta, signal) {
    var response;
    try {
      response = await requestFetch(url, {
        method: "POST",
        headers: requestHeaders(config, true),
        body: JSON.stringify(payload),
        signal: signal
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw makeNetworkError(url, err);
    }
    if (!response.ok) {
      var serverMessage = await readErrorPayload(response);
      throw makeHttpError(response.status, serverMessage, url);
    }
    return await readChatStream(response, url, onDelta);
  }

  async function chat(options) {
    var opts = options && typeof options === "object" ? options : {};
    var config = resolveConfig(opts.config);
    var messages = opts.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("messages 必须是非空数组。");
    }
    var onDelta = typeof opts.onDelta === "function" ? opts.onDelta : null;
    var signal = opts.signal;
    var url = endpointUrl(config.baseUrl);
    var payload = {
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      stream: true
    };

    var retried = false;
    for (;;) {
      var emitted = false;
      var handleDelta = onDelta
        ? function (delta, full) {
            emitted = true;
            onDelta(delta, full);
          }
        : null;
      try {
        return await performChat(url, payload, config, handleDelta, signal);
      } catch (err) {
        // 最多重试 1 次：仅限「尚未输出任何内容」的纯网络错误。
        if (!retried && !emitted && err && err.code === "NETWORK_ERROR" && !isAbortError(err)) {
          retried = true;
          continue;
        }
        throw err;
      }
    }
  }

  function toPlainText(value) {
    if (typeof value === "string") return htmlToText(value);
    if (value === undefined || value === null) return "";
    return String(value);
  }

  function normalizeRubric(rubric) {
    if (Array.isArray(rubric)) {
      return rubric.map(toPlainText).map(function (item) { return item.trim(); }).filter(Boolean);
    }
    if (typeof rubric === "string") {
      return rubric.split(/\n+/).map(function (item) { return toPlainText(item).trim(); }).filter(Boolean);
    }
    return [];
  }

  function buildGradeUserPrompt(parts) {
    var lines = [];
    lines.push("【题目】");
    lines.push(parts.question || "（未提供）");
    lines.push("");
    lines.push("【读者答案】");
    lines.push(parts.answer || "（读者未作答）");
    lines.push("");
    lines.push("【参考答案】");
    lines.push(parts.reference || "（未提供，请依据 rubric 判断）");
    lines.push("");
    lines.push("【评分点 rubric】");
    if (parts.rubric.length) {
      parts.rubric.forEach(function (item, index) {
        lines.push((index + 1) + ". " + item);
      });
    } else {
      lines.push("（未提供，请按题意给出合理评分点）");
    }
    lines.push("");
    lines.push("请逐条对照 rubric 评分，并只输出规定的 JSON 对象。");
    return lines.join("\n");
  }

  function toText() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && isFinite(value)) return String(value);
      if (Array.isArray(value)) {
        var joined = value.filter(function (item) {
          return typeof item === "string" && item.trim();
        }).join("；");
        if (joined) return joined;
      }
    }
    return "";
  }

  function toList() {
    for (var i = 0; i < arguments.length; i += 1) {
      var value = arguments[i];
      if (Array.isArray(value)) {
        var items = value.map(function (item) {
          if (typeof item === "string") return item.trim();
          if (typeof item === "number") return String(item);
          if (item && typeof item === "object") return toText(item.text, item.content, item.title);
          return "";
        }).filter(Boolean);
        if (items.length) return items;
      } else if (typeof value === "string" && value.trim()) {
        var lines = value.split(/\n+/).map(function (item) { return item.trim(); }).filter(Boolean);
        if (lines.length) return lines;
      }
    }
    return [];
  }

  function emptyGrade(raw) {
    return {
      score: null,
      verdict: "",
      strengths: [],
      improvements: [],
      suggestion: "",
      raw: typeof raw === "string" ? raw : ""
    };
  }

  function repairJsonCandidate(candidate) {
    // 常见模型输出问题：尾随逗号。
    return candidate.replace(/,\s*([}\]])/g, "$1");
  }

  function extractJsonObject(text) {
    if (typeof text !== "string" || !text.trim()) return null;
    var source = text.replace(/^\uFEFF/, "").trim();
    var candidates = [];

    var fence = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence && fence[1]) candidates.push(fence[1].trim());
    candidates.push(source);
    var start = source.indexOf("{");
    var end = source.lastIndexOf("}");
    if (start >= 0 && end > start) candidates.push(source.slice(start, end + 1));

    var repaired = candidates.slice().map(repairJsonCandidate);
    var all = candidates.concat(repaired);

    for (var i = 0; i < all.length; i += 1) {
      try {
        var value = JSON.parse(all[i]);
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
      } catch (err) { /* 尝试下一个候选 */ }
    }
    return null;
  }

  function normalizeGradeResult(parsed, raw) {
    var result = emptyGrade(raw);
    var score = parsed.score;
    if (typeof score === "string") {
      var match = score.match(/-?\d+(?:\.\d+)?/);
      score = match ? Number(match[0]) : NaN;
    }
    if (typeof score === "number" && isFinite(score)) {
      result.score = Math.max(0, Math.min(100, score));
    }
    result.verdict = toText(parsed.verdict, parsed.comment, parsed.summary);
    result.strengths = toList(parsed.strengths, parsed.advantages);
    result.improvements = toList(parsed.improvements, parsed.weaknesses, parsed.issues);
    result.suggestion = toText(parsed.suggestion, parsed.advice);
    return result;
  }

  async function gradeAnswer(options) {
    var opts = options && typeof options === "object" ? options : {};
    var config = resolveConfig(opts.config);
    var gradeConfig = Object.assign({}, config, { temperature: 0.2 });
    var messages = [
      { role: "system", content: systemPrompt("grade") },
      {
        role: "user",
        content: buildGradeUserPrompt({
          question: toPlainText(opts.question),
          answer: typeof opts.answer === "string" ? opts.answer.trim() : toPlainText(opts.answer),
          reference: toPlainText(opts.reference),
          rubric: normalizeRubric(opts.rubric)
        })
      }
    ];
    var raw = await chat({
      messages: messages,
      config: gradeConfig,
      onDelta: opts.onDelta,
      signal: opts.signal
    });
    var parsed = extractJsonObject(raw);
    if (!parsed) return emptyGrade(raw);
    return normalizeGradeResult(parsed, raw);
  }

  async function listModels(config) {
    var settings = resolveConfig(config);
    var url = modelsUrl(settings.baseUrl);
    var response;
    try {
      response = await requestFetch(url, {
        method: "GET",
        headers: requestHeaders(settings, false)
      });
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw makeNetworkError(url, err);
    }
    if (!response.ok) {
      throw makeHttpError(response.status, await readErrorPayload(response), url);
    }
    var payload = null;
    try {
      payload = await response.json();
    } catch (err) {
      throw new Error("模型列表解析失败：服务端返回的不是合法 JSON。");
    }
    var list = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.data) ? payload.data : null);
    if (!list) throw new Error("模型列表格式异常：缺少 data 数组。");
    return list.map(function (item) {
      if (typeof item === "string") return { id: item };
      if (item && item.id !== undefined && item.id !== null) return { id: String(item.id) };
      return { id: "" };
    }).filter(function (item) { return item.id; });
  }

  /* ========================================================================== *
   * 六、导出
   * ========================================================================== */

  var AI = {
    DEFAULTS: DEFAULTS,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    clearConfig: clearConfig,
    isConfigured: isConfigured,
    endpointUrl: endpointUrl,
    chat: chat,
    gradeAnswer: gradeAnswer,
    buildContext: buildContext,
    systemPrompt: systemPrompt,
    listModels: listModels
  };

  if (typeof window !== "undefined" && window) window.AI = AI;
  if (global && (typeof window === "undefined" || global !== window)) global.AI = AI;

  if (typeof module !== "undefined" && module.exports) module.exports = AI;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
