# 《Attention Is All You Need》注疏本 · 内容编写规范

本文件是内容写作的唯一契约。所有写作者（人和 AI）必须遵守。写完后用 `node --check 文件.js` 检查语法。

---

## 0. 项目是什么

一个中文教学网站，对象是**零基础 AI 学习者，但具备初高中数学能力**。它不允许改写或摘要论文，而是：

- 先把读论文所需的数学与直觉补上（卷一 · 基础）；
- 再带读者把论文最关键的思想提前过一遍（卷二 · 预习）；
- 然后**逐节对照英文原文做中文注疏**（卷三 · 正文）；
- 每读完一部分，用练习检验；接入 API 后由 AI 批改问答题；
- 卷四 · 问学：读者可以就论文向 AI 提问。

**核心文体：一位耐心的助教在古籍页边写注。** 原文是"经"，你的解读是"注"。你不是在写教科书章节，而是在替读者拆开一句英文、指出一个数学动作、给一个具体例子、点破一个常见误解。

### 声音

- 第二人称"你"，短句，具体。像一个坐在读者旁边的人。
- 每讲一个概念，至少给一个**具体例子或数字**：不要只说"点积衡量相似度"，要说"`[1, 0]` 和 `[1, 0]` 的点积是 1，和 `[0, 1]` 的点积是 0"。
- 类比要贴切、一次只用一个，不要堆砌。
- 不用"值得注意的是""总而言之""毋庸置疑"这类空话；不用"赋能""打通"这类行业黑话。
- 数学必须准确。不确定的计算，自己先算一遍再写。
- 可以冷一点、干一点，不要卖萌，不要感叹号连用。

### 术语

- 首次出现的术语：中文 + 英文 + 一句人话解释。例："注意力（attention）：让每个词去看句子里其他词，并按相关程度取回信息。"
- 同一术语全站译名统一：attention 注意力、query 查询、key 键、value 值、head 头、embedding 嵌入、residual 残差、layer normalization 层归一化、feed-forward 前馈、positional encoding 位置编码、self-attention 自注意力、scaled dot-product attention 缩放点积注意力、multi-head 多头、encoder 编码器、decoder 解码器。

---

## 1. 文件契约（不要改文件名）

每个文件是一个普通的 JS 脚本，浏览器用 `<script>` 直接加载，挂一个全局变量。**不要用 import/export，不要用 fetch。**

| 文件 | 全局变量 | 内容 | 负责人 |
|---|---|---|---|
| `data/primer-1.js` | `window.PRIMER_1 = { lessons: [...] }` | 基础课 1–4 | primer-1 |
| `data/primer-2.js` | `window.PRIMER_2 = { lessons: [...] }` | 基础课 5–8 | primer-2 |
| `data/preview.js` | `window.PREVIEW = { parts: [...] }` | 预习 6 篇 | preview |
| `data/notes-a.js` | `window.NOTES_A = { ... }` | 摘要 + 第 1–3 节注疏 | notes-a |
| `data/notes-b.js` | `window.NOTES_B = { ... }` | 第 4–7 节 + 附录注疏 | notes-b |

每篇内容都自带练习（`quiz`），不另建题库文件。因此**每个人只改自己的文件，不碰别人的文件**。

---

## 2. 内容块 schema

所有正文由 `blocks` 数组组成。只允许以下类型，渲染器会处理；不要写其它类型。

```js
{ t: "p", h: "段落 HTML" }
{ t: "h", h: "小标题" }                         // 渲染为 <h4>，不要用 # 号
{ t: "quote", h: "引文", cite: "出处（可省）" }
{ t: "math", tex: String.raw`\mathrm{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V`, label: "(1)", note: "可选的一句解释" }
{ t: "list", ordered: false, items: ["…", "…"] }   // items 可含行内 HTML
{ t: "callout", tone: "key|note|warn", title: "小标题", h: "内容 HTML" }
{ t: "table", caption: "表题（可省）", head: ["列1", "列2"], rows: [["…", "…"]] }
{ t: "figure", src: "assets/img/xxx.svg", alt: "…", caption: "图题", credit: "来源（可省）", width: "wide|narrow" }
{ t: "widget", id: "dotproduct", caption: "互动说明" }   // 可用 id 见第 6 节
{ t: "defs", items: [{ term: "中文", en: "English", h: "解释" }] }
```

段落里允许的行内 HTML：`<em>`、`<strong>`、`<sup>`、`<sub>`、`<code>`、`<span class="term">术语</span>`、`<span class="m">…</span>`（数学小片段，如 `<span class="m"><b>q</b>·<b>k</b></span>`）。

### 数学

- **行内数学不要用 LaTeX**，用 HTML：`<span class="m">d<sub>k</sub></span>`、`<span class="m">QK<sup>T</sup></span>`、`<span class="m">√d<sub>k</sub></span>`。
- **独立公式**用 `{ t: "math", tex: ... }`，并且**必须**用 `String.raw` 模板字符串，否则反斜杠会丢失：

```js
{ t: "math", tex: String.raw`\mathrm{Attention}(Q,K,V)=\mathrm{softmax}\left(\frac{QK^{T}}{\sqrt{d_{k}}}\right)V`, label: "(1)" }
```

- 一个公式只讲一个动作。公式后必须跟一段 `p` 用中文拆解它。

---

## 3. 三种内容的 schema

### 3.1 基础课（primer）

```js
window.PRIMER_1 = {
  lessons: [
    {
      id: "vectors",                 // 英文小写短横线，全站唯一
      no: "一",                       // 汉字序号，按负责范围写：一 二 三 四 / 五 六 七 八
      title: "向量与矩阵：把一句话放进坐标里",
      en: "Vectors, Matrices",
      lead: "一段 40–70 字的导语，告诉读者这一课解决什么问题。",
      minutes: 8,
      blocks: [ ... ],
      quiz: [ ... ]                  // 4–5 题，至少 2 道选择、2 道问答
    }
  ]
};
```

负责范围：
- primer-1：`vectors`（向量与矩阵）、`dot`（点积与相似度）、`softmax`（softmax 与概率）、`projection`（线性变换与 Q/K/V 投影）。
- primer-2：`attention-intuition`（注意力的直觉：查字典）、`residual-norm`（残差与层归一化）、`sequence`（序列、并行与路径长度）、`posenc`（位置编码：给词一个坐标）。

每课 700–1200 字中文（不含公式与表格），2–4 个数学/图像/互动块。课程之间不重复。

### 3.2 预习（preview）

```js
window.PREVIEW = {
  parts: [
    {
      id: "map", no: "一",
      title: "先看全图：一个句子如何穿过 Transformer",
      en: "The map",
      lead: "40–70 字。",
      minutes: 10,
      blocks: [ ... ],
      quiz: [ ... ]
    }
  ]
};
```

六篇（固定顺序）：
1. `map` — 先看全图：一个句子如何穿过 Transformer（编码器/解码器、数据流、张量形状）。
2. `why` — 论文到底在反对什么：RNN 的串行诅咒与注意力的旧身份。
3. `attention` — 注意力的核心动作：Q、K、V 的一次"检索"（含缩放点积公式）。
4. `multihead` — 为什么要八个头：子空间、并行、拼接。
5. `position` — 没有循环，顺序从哪里来：正弦位置编码。
6. `read` — 论文的论证结构：作者如何用实验说服你（表 1、表 2、表 3、消融）。

每篇 800–1300 字。

### 3.3 正文注疏（notes）

```js
window.NOTES_A = {
  "abstract": {
    key: "abstract",
    cnTitle: "摘要",
    kicker: "一句话里的全部主张",       // 10–16 字
    minutes: 5,
    intro: [ ...blocks ],              // 读原文之前的导读，300–700 字
    points: ["要点一", "要点二", "要点三"],   // 3–5 条，每条 15–35 字
    terms: [{ term: "序列转导", en: "sequence transduction", h: "…" }],
    notes: [
      {
        para: "abstract1.p1",        // 原文中某个 <p> 的 id，见 data/para-ids.md
        title: "旁注标题（6–14 字）",
        h: "旁注正文 80–220 字。解释这一段在说什么、为什么这样说、数学上发生了什么。"
      }
    ],
    quiz: [ ... ]
  },
  "S1": { ... }
};
```

- 每个小节 3–6 条旁注，必须命中原文中真实存在的段落 id。**先读 `data/paper-plain.md`，再读 `data/para-ids.md` 找 id。**
- `intro` 是这一节的精讲主体：讲清论证顺序、关键概念、和其它节的关系。可以用 `widget`、`math`、`table`、`figure`。
- 旁注不是复述原文，而是补三种东西：①这句英文的准确意思；②背后的数学动作；③读者容易误会的地方。
- `points` 是读者离开这一节时应记住的话，不是小标题。

负责范围：
- notes-a：`abstract`、`S1`（Introduction）、`S2`（Background）、`S3`（Model Architecture，可拆成 S3 一篇，但要覆盖 3.1–3.5 全部）。
- notes-b：`S4`（Why Self-Attention）、`S5`（Training）、`S6`（Results）、`S7`（Conclusion）、`Sx1`（Attention Visualizations 附录）。

`S3` 是最重要的一节：intro 至少 1200 字，旁注 8–12 条，覆盖编码器/解码器堆叠、缩放点积注意力、多头、前馈、嵌入与 softmax、位置编码。

---

## 4. 练习（quiz）

```js
// 选择题
{
  id: "S3q1",                 // 全站唯一：小节 id + q + 序号
  type: "choice",
  q: "题干 HTML，可含行内数学",
  options: ["A 选项", "B 选项", "C 选项", "D 选项"],
  answer: 2,                  // 正确项下标，从 0 开始
  explain: "为什么对、其它项错在哪，60–150 字。"
}

// 问答题
{
  id: "S3q2",
  type: "short",
  q: "题干 HTML。要有明确的作答要求，比如'用两句话解释…并给出一个例子'。",
  hint: "一句提示（可省）",
  reference: "参考答案 HTML，80–200 字。",
  rubric: ["评分点 1（如：指出点积衡量相似度）", "评分点 2", "评分点 3"]
}
```

要求：
- 每个小节/每课 4–5 题，至少 2 道选择 + 2 道问答。
- 选择题考**理解**和**易错点**，不要考背诵原文。干扰项要像真的。
- 问答题要有可评分的 rubric（3–5 条），参考答案不是唯一答案。
- 全站 id 唯一，用小节 id 前缀。

---

## 5. 可用图片

`assets/img/paper/` 下是论文原图（**不要改，不要裁**）：
- `ModalNet-21.png` — 图 1，Transformer 整体架构
- `ModalNet-19.png` — 图 2 左，缩放点积注意力
- `ModalNet-20.png` — 图 2 右，多头注意力
- `attending_to_head_new.svg`、`attending_to_head2_new.svg`、`anaphora_resolution_new.svg`、`anaphora_resolution2_new.svg`、`making_more_difficult5_new.svg` — 附录注意力可视化图

引用方式：
```js
{ t: "figure", src: "assets/img/paper/ModalNet-21.png", alt: "Transformer 架构图：左侧编码器、右侧解码器", caption: "图 1：Transformer 模型架构（论文原图）。", width: "wide" }
```

论文原图之外的图由站点统一绘制，写作时用 `{ t: "widget", id: "..." }` 调用，不要自己写 SVG。

---

## 6. 可用交互组件 id

| id | 是什么 | 适合放在 |
|---|---|---|
| `dotproduct` | 拖动两个二维向量，看点积与夹角 | 基础课 dot |
| `softmax` | 拖动 logits，看 softmax 输出柱状图 | 基础课 softmax |
| `projection` | 拖动输入向量，看投影到 Q/K/V 空间 | 基础课 projection |
| `attention` | 点一个词，看它对其余词的注意力权重（弧线） | 基础课 attention-intuition / 预习 attention |
| `scaled` | 拖动 d_k，看点积方差与 softmax 饱和 | 基础课 softmax 或预习 attention |
| `multihead` | 切换 8 个头，看不同头关注不同位置 | 预习 multihead |
| `posenc` | 拖动位置，看正弦编码向量与波长 | 基础课 posenc / 预习 position |
| `mask` | 切换因果遮罩，看下三角矩阵 | 预习 map / notes S3 |
| `shapes` | 一个句子的张量形状如何流动（batch × seq × d） | 预习 map |
| `stack` | 逐层点亮编码器/解码器堆叠 | notes S3 |
| `qkv` | 一句话中 Q/K/V 的角色切换 | 预习 attention |

组件下方会自动渲染 `caption`。一个组件在一篇里最多用两次。

---

## 7. 旁注锚点工作流

1. 打开 `data/paper-plain.md` 找到你负责的小节，通读英文原文。
2. 打开 `data/para-ids.md`，找到你要标注的段落 id（形如 `S3.SS2.SSS1.p1.1`）。
3. 旁注只挂在这个 id 的段落开头。一个段落最多一条旁注。
4. `Sx1`（附录可视化）没有太多段落，旁注可少（2–3 条），intro 要解释"看注意力图能看出什么、不能看出什么"。

---

## 8. 质量自检（提交前逐条过）

- [ ] `node --check data/你的文件.js` 通过。
- [ ] 全局变量名正确，没有 import/export。
- [ ] 所有 `para` id 在 `data/para-ids.md` 里真实存在。
- [ ] 所有 `quiz` 都有 `answer`（选择）或 `rubric`（问答），id 不重复。
- [ ] 每个数学公式都用 `String.raw`；公式后的中文拆解没有把符号念一遍了事。
- [ ] 每篇至少 3 个具体例子或数字。
- [ ] 没有出现"本文将""综上所述""众所周知"这类空转句。
- [ ] 没有改写、翻译整段原文冒充原创；注疏是解释，不是译文。
- [ ] 中文标点统一（，。；：""''），英文术语前后空格自然。
- [ ] 长度达标，不注水。

---

## 9. 交付

只写自己负责的文件。写完后在回复里列出：文件路径、小节 id 列表、每节字数、你使用的旁注 id、你自检发现并修掉的问题。
