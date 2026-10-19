# 注意力注疏 · Attention Is All You Need 中文注疏本

一本给**零基础 AI 学习者、具备初高中数学能力**的读者看的《Attention Is All You Need》注疏网站。

英文原文一字不改地照录（摘要、七节正文、参考文献、附录），中文注疏写在页边：先补数学与直觉，再逐节拆原文，最后用练习检验。每道问答题都可以接入你自己的 OpenAI 兼容 API，由 AI 按评分点批改；「问学」页可以就论文提问。

---

## 打开方式

**在线阅读（推荐）**：直接访问 **<https://3091485956-png.github.io/attention-is-all-you-need/>** ，由 GitHub Pages 托管，手机、平板均可打开。

**离线阅读**：直接双击 `index.html` 即可（字体、公式、影印页、练习、组件全部在本地）。

如果浏览器对本地文件的 `localStorage` 或跨域请求有限制，可以在本目录起一个静态服务器：

```bash
# Python 3
python -m http.server 8000

# 或 Node
npx serve .
```

然后访问 `http://localhost:8000/`。

> 推荐使用较新的 Chrome / Edge / Firefox / Safari。公式使用 MathML 与本地 KaTeX，无需联网。

---

## 手机端适配

站点按 **1440 / 768 / 390 / 360 / 320px** 五档做过布局与交互核验：

- **窄屏单列**：所有左右分栏（标题轴、页边注、练习栏）在 ≤880px 折为单列；卷三的页边注在手机上变为段落后的可展开「注 1 · …」。
- **卷目折叠**：≤880px 顶部导航收进「卷目」菜单，点击展开；顶栏高度在手机上缩到 60px。
- **聊天优先**：问学页在手机上把对话区放在设置之前，输入框、发送按钮与建议问题首屏可见；点「接入 API」会自动展开设置并滚动到表单。
- **触控目标**：正文链接、笔记折叠条、聊天按钮、表格提示等主要可点元素放大到 40–44px 左右；滑块与组件按钮也做了移动端尺寸。
- **阅读版式**：手机正文 17px、行距约 1.9；论文宽表会自动提示「表格较宽，可左右滑动查看」，公式可横向滚动。
- **安全区与输入**：表单、textarea 使用 16px 以上字号避免 iOS 缩放；适配 `env(safe-area-inset-*)`，刘海与圆角屏不压字。
- **图片与图版**：图版在手机上两列排布，影印页单列；点任意图可进入可关闭的灯箱看大图。
- **动效降级**：尊重 `prefers-reduced-motion`，手机端仍保留内容完整可见。

---

## 四卷

| 卷 | 内容 |
|---|---|
| **卷一 · 基础** | 8 课：向量与矩阵、点积、softmax、线性投影、注意力直觉、残差与层归一化、序列与路径长度、正弦位置编码 |
| **卷二 · 预习** | 6 篇：全图、动机、注意力、多头、位置、论文的论证结构 |
| **卷三 · 原文注疏** | 摘要 + 第 1–7 节 + 参考文献 + 附录，逐段英文原文 + 页边中文旁注，每节附练习 |
| **卷四 · 问学** | 接入 API 后的 AI 助教；问答题 AI 批改 |
| **影印** | arXiv 公开 PDF 的十五页原样影印，可随时对照 |

全站 **24 个学习部分、111 道练习**（选择 + 问答）。每部分都有练习；问答练习在没有接入 API 时也可以展开参考答案自查。

---

## 接入 API

1. 打开「卷四 · 问学」。
2. 展开「设置」，填写：
   - **Base URL**：OpenAI 兼容接口，例如 `https://api.openai.com/v1`、`https://api.deepseek.com/v1`、`https://api.siliconflow.cn/v1`、本地 Ollama 的 `http://127.0.0.1:11434/v1`。
   - **API Key**：只保存在你的浏览器 `localStorage`，不会上传到本站（本站没有后端）。
   - **模型名**：例如 `gpt-4o-mini`、`deepseek-chat`、`Qwen/Qwen2.5-72B-Instruct` 等，以你的服务商为准。
3. 点「保存」后会调用 `/models` 测试连接；也可以点「测试连接」。
4. 回到任意一节的问答题，点「请 AI 批改」，AI 会按该题的评分点给出分数、做到的地方、可以补的地方与下一步建议。

**注意**

- 请求由你的浏览器**直接**发往你填写的接口。若服务商不允许浏览器跨域请求（CORS），会提示连接失败；请改用允许浏览器调用的服务商或自建网关。
- API Key 存在本机浏览器。不要在公用电脑上保存。
- 对话历史只保存在当前页面内存中，刷新即清空。

---

## 目录结构

```
index.html                入口
assets/
  css/style.css           全站样式（纸面、排版、注疏栏、练习）
  js/app.js               路由、渲染、注疏布局、练习、进度
  js/api.js               OpenAI 兼容接入、流式、评分、论文检索
  js/chat.js              问学与批改 UI
  js/widgets.js           11 个互动组件
  js/markdown.js          AI 消息的 Markdown/公式渲染（转义安全）
  fonts/                  EB Garamond、Cormorant Garamond、Noto Serif SC
  vendor/katex/           KaTeX（本地）
  img/paper/              论文原图（PNG/SVG）
  img/facsimile/          PDF 影印页与封面图版
data/
  paper.js                论文全文（由 arXiv HTML 结构化，照录）
  primer-1.js / primer-2.js   卷一 8 课
  preview.js              卷二 6 篇
  notes-a.js / notes-b.js / notes-c.js / notes-d.js   卷三注疏
docs/CONTENT-SPEC.md      内容编写规范
screenshots/              页面截图
```

阅读进度保存在 `localStorage`（键 `annotated-progress-v1`），API 配置在 `annotated-ai-config`。

---

## 底本与版权

- 底本：Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin. *Attention Is All You Need*. 2017. [arXiv:1706.03762](https://arxiv.org/abs/1706.03762)。
- 原文、图表与影印页版权归原作者与 Google 所有；依 arXiv 非独占许可用于教学与学术展示。本站仅照录原文，未改写或摘要正文。
- 中文注疏、练习、互动组件为本站所撰。
- 字体：EB Garamond、Cormorant Garamond、Noto Serif SC，SIL Open Font License。
- 公式排版：KaTeX，MIT License。

---

## 校验记录

- 内容 schema：24 个学习部分、111 道练习、全部旁注锚点均通过校验。
- 响应式：320 / 360 / 390 / 768 / 1440 五档宽度均无横向溢出、无控制台错误；手机端卷目、笔记展开、选择题、灯箱、聊天输入均实测可操作。
- 浏览器冒烟：24 个部分 × 1440 / 768 / 390 三种宽度，无控制台错误、无横向溢出、无坏图。
- 交互：选择题判定、标记已读与进度持久化、页边注 / 移动端内嵌注、影印 lightbox、移动端卷目、章节跳转均实测通过。
- 问学与批改：使用本地 OpenAI 兼容 mock 服务端到端验证流式回答、上下文注入、评分与 `chatui:graded` 事件。
- 设计检查：taste-skill inspector 在三档宽度下 **0 FAIL**。保留的 WARN 均与中文/拉丁双字体、CJK 字号层级、论文题材无视频有关，属于有意选择。

---

## 已知限制

- 纯静态、无后端：没有账号、云同步、学习记录跨设备同步。
- AI 回答质量取决于你接入的模型；助教被要求只依据论文上下文回答，但仍可能出错，请以原文为准。
- 互动组件中的注意力权重是教学用的预置矩阵，不是预训练模型的真实权重（组件内已注明）。
- 影印页由 arXiv PDF 生成，仅供对照，不替代正式排版。
