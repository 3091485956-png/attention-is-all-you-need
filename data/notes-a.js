// data/notes-a.js — 卷三 · 正文注疏（摘要、第 1–3 节）
// 浏览器用 <script> 直接加载，挂 window.NOTES_A；不使用 import/export。

window.NOTES_A = {
  // ============================================================
  // 摘要
  // ============================================================
  "abstract": {
    key: "abstract",
    cnTitle: "摘要",
    kicker: "把循环与卷积一起删掉",
    minutes: 5,
    intro: [
      { t: "p", h: "摘要只有一段，却按“问题—方案—结果—外推”排了四步。第一次读，重点不是记住 28.4 这个数字，而是看清作者删掉了什么：循环、卷积，以及注意力原本“只当配件”的身份。" },
      { t: "p", h: "标题本身就把主张说完了：<em>Attention Is All You Need</em>——你需要的全部就是注意力。摘要只是把这句话拆成可检验的四步。" },
      { t: "p", h: "第一句先把对手摆在台上：主流序列转导模型是带编码器与解码器的复杂 RNN 或 CNN；表现最好的那些，还会在编码器与解码器之间接一个注意力机制。注意 <em>also</em> 这个词——此时注意力只是配件，模型的主体仍是循环或卷积。本文要做的事，是把配件变成主体。" },
      { t: "p", h: "第二句是全文最锋利的地方：<em>based solely on attention mechanisms, dispensing with recurrence and convolutions entirely</em>。solely 是“只靠”，entirely 是“彻底不要”，不是“少用一点”。代价随即出现：没有循环，就没有天然的时间顺序；没有卷积，就少了局部窗口带来的归纳偏置。顺序问题由 3.5 节的位置编码解决，逐位置的变换由 3.3 节的前馈网络承担。" },
      { t: "p", h: "第三个动作是报数：英德 28.4 BLEU，比当时最好结果（包括把多个模型集成起来的结果）高 2 分以上；英法 41.8 BLEU，是单模型的新纪录；训练只用了 8 块 GPU 3.5 天。数字的功能是把“更简单”和“更强”绑进同一句判断——读者容易只记住 BLEU，忘了后半句讲的是成本。" },
      { t: "p", h: "最后一句把范围从翻译推到成分句法分析：即使训练数据有限，模型也能用。这是摘要里唯一的“泛化”证据，真正的表格在第 6 节。读摘要时不妨追问：它没说什么？没提 6 层、512 维、8 个头，也没提训练细节——这些都在正文，也正是后面几节要拆的东西。" },
      { t: "callout", tone: "key", title: "读摘要的三步", h: "先找删掉了什么（循环、卷积），再找拿什么补（注意力、位置编码、前馈），最后看数字证明了哪一半（质量与成本，不是原因）。" }
    ],
    points: [
      "注意力从编码器与解码器之间的桥，升级为唯一的结构。",
      "删掉循环与卷积后，顺序信息与逐位置变换必须由别的机制补回。",
      "28.4 BLEU 与 8 卡 3.5 天，分别支撑“更强”和“更省”两句话。",
      "摘要不给实现细节；层数、维度、头数都在第 3 节。"
    ],
    terms: [
      { term: "序列转导", en: "sequence transduction", h: "把一个序列变成另一个序列的任务，例如机器翻译、语音识别。" },
      { term: "BLEU", en: "BLEU", h: "机器翻译的自动评分，和参考译文比 n-gram 重合度，0–100，越高越好。" },
      { term: "集成", en: "ensemble", h: "把多个模型的输出合起来，通常比单个模型强，成本也更高。" },
      { term: "成分句法分析", en: "constituency parsing", h: "把句子分析成树状短语结构，例如把 the cat 看成一个名词短语。" }
    ],
    notes: [
      {
        para: "abstract1.1",
        title: "注意力原本只是配件",
        h: "第一句的重点在 <em>also</em>：最好的模型已经在用注意力，但它接在编码器与解码器之间，主体仍是 RNN 或 CNN。作者先把对手的最强形态说全，再提出只留注意力的方案。这不是综述，而是为后面的“替换”划出靶子：要反驳的不是弱模型，是当时最强的模型。"
      },
      {
        para: "abstract1.1",
        title: "entirely 是彻底不要",
        h: "<em>dispensing with</em> 不是“减少”，而是“免除、抛弃”；<em>entirely</em> 把它钉死：模型里没有任何循环或卷积。数学上，每个位置的表示只由矩阵乘法和 softmax 得到，不再有 <span class=\"m\">h<sub>t</sub></span> 依赖 <span class=\"m\">h<sub>t−1</sub></span> 的时间链。代价是顺序信息消失，必须由位置编码补上；这也解释了摘要为什么紧接着谈翻译质量，而不是先谈架构细节。"
      }
    ],
    quiz: [
      {
        id: "abstractq1",
        type: "choice",
        q: "摘要中 “dispensing with recurrence and convolutions entirely” 最接近的意思是？",
        options: [
          "减少循环与卷积的使用，但保留一小部分",
          "完全不用循环与卷积，只依靠注意力",
          "用卷积替代循环，注意力保持不动",
          "编码器保留循环，解码器不用卷积"
        ],
        answer: 1,
        explain: "dispensing with 是“抛弃、免除”，entirely 是“完全地”。摘要说的是整个模型不再含循环或卷积，主体只剩注意力；A 把它弱化成“减少”，C、D 则仍在保留其中一种结构。"
      },
      {
        id: "abstractq2",
        type: "choice",
        q: "摘要用 “28.4 BLEU” 想说明什么？",
        options: [
          "模型的参数量比之前的方法小",
          "在英德翻译上超过此前最好结果（含集成）2 分以上",
          "训练总时长只有 12 小时",
          "英法翻译也达到了 28.4 BLEU"
        ],
        answer: 1,
        explain: "28.4 是 WMT 2014 英德任务的分数，比当时最好结果（包括集成模型）高 2 分以上；英法是 41.8；12 小时是第 1 节提到的 base 模型训练时间，不是这里的 3.5 天。"
      },
      {
        id: "abstractq3",
        type: "choice",
        q: "下列哪一项是摘要没有直接给出的？",
        options: [
          "主流序列转导模型采用编码器-解码器结构",
          "注意力被用来连接编码器与解码器",
          "模型的层数、隐藏维度与注意力头数",
          "英法翻译的 BLEU 分数"
        ],
        answer: 2,
        explain: "摘要只给主张与数字；6 层、d_model=512、h=8 这些结构参数在第 3 节。A、B、D 都能在摘要原文中找到对应句子。"
      },
      {
        id: "abstractq4",
        type: "short",
        q: "用两句话说明摘要的论证顺序：它先承认什么、再提出什么、最后用什么支撑。",
        hint: "按“现状—方案—证据”的顺序组织，不必复述数字。",
        reference: "先承认当时最强的模型是带编码器与解码器的复杂 RNN/CNN，注意力只作为连接件；再提出只依赖注意力的 Transformer，彻底去掉循环与卷积；最后用英德、英法两个翻译任务的 BLEU 与训练成本证明更强也更省，并用成分句法分析说明它能泛化到别的任务。",
        rubric: [
          "点出主流模型是 RNN/CNN + 编码器-解码器",
          "点出注意力此前只是配件",
          "点出去掉循环与卷积、只靠注意力",
          "点出 BLEU 与训练成本两类证据",
          "提到句法分析作为泛化证据"
        ]
      },
      {
        id: "abstractq5",
        type: "short",
        q: "删掉循环与卷积会失去什么？正文用哪两处机制补回来？请各写一个具体机制。",
        hint: "一个与顺序有关，一个与逐位置的非线性变换有关。",
        reference: "失去的是序列的顺序信息与依赖局部窗口的结构。3.5 节用正弦位置编码把位置信息加到嵌入上，让模型仍能区分词序；3.3 节用逐位置前馈网络（512→2048→512，中间 ReLU）对每个位置单独做非线性变换，补上卷积原本提供的逐位置加工。",
        rubric: [
          "指出顺序信息丢失",
          "指出位置编码加在嵌入上、维度同为 512",
          "指出前馈网络逐位置作用",
          "给出 512→2048→512 或 ReLU 等具体细节"
        ]
      }
    ]
  },

  // ============================================================
  // S1 — 1 Introduction
  // ============================================================
  "S1": {
    key: "S1",
    cnTitle: "第 1 节 · 引言",
    kicker: "先承认对手，再拆掉地基",
    minutes: 8,
    intro: [
      { t: "p", h: "这一节不做技术，只做一件事：让读者相信“换掉循环”不是任性，而是被逼的。作者用四段完成一次标准的学术说服：承认现状、指出瓶颈、清点已有工具、宣布替换方案。" },
      { t: "h", h: "先把 RNN 捧到最高" },
      { t: "p", h: "开头点名 RNN、LSTM、GRU，说它们 <em>firmly established as state of the art</em>，后面挂了一串引用。这不是客套。作者要先承认对手是最强形态，否则“我们换掉了它”就没有分量。读论文时留意这种让步：它往往在为下一段的“但是”蓄力。" },
      { t: "h", h: "串行性为什么是原罪" },
      { t: "p", h: "关键句是 <em>factor computation along the symbol positions</em>：计算被摊在符号位置上，一个位置一步。写出来就是 <span class=\"m\"><b>h</b><sub>t</sub> = f(<b>h</b><sub>t−1</sub>, <b>x</b><sub>t</sub>)</span>：第 t 步的隐藏状态要用第 t−1 步的结果。长度为 1000 的句子，训练时至少要串行 1000 步；一个样本内部的 1000 个位置无法同时算，只能靠 batch 在样本之间并行，而显存又把 batch 卡住。" },
      { t: "math", tex: String.raw`\mathbf{h}_{t}=f\left(\mathbf{h}_{t-1},\mathbf{x}_{t}\right)`, note: "每一步都依赖上一步，时间步之间无法同时计算。" },
      { t: "p", h: "注意作者的措辞：<em>within training examples</em>——被卡住的是训练时一个样本内部的并行，不是“模型不能运行”。这两个说法差别很大。factorization tricks 与 conditional computation 只是把每一步变便宜，没有拆掉“必须按顺序”的链条，所以作者说 <em>the fundamental constraint remains</em>。" },
      { t: "p", h: "把账算得更直白：一个长度为 n 的样本，RNN 要 n 次串行调用；一个 batch 有 B 个样本，GPU 能并行的路数是 B，而不是 B×n。n=1000、B=32 时，理论上要算 32000 个位置，实际同时在算的只有 32 个。这就是 <em>critical at longer sequence lengths</em> 的意思：句子越长，浪费越大，显存还限制你把 B 开大。" },
      { t: "h", h: "注意力早就存在，但只是配件" },
      { t: "p", h: "注意力能让一个位置直接看任意距离的另一个位置，不必走 1000 步。但作者马上补一句：除了极少数工作，注意力都是 <em>in conjunction with a recurrent network</em>。这句话是全文的支点——工具已经有了，缺的是把它从配件变成主体。" },
      { t: "quote", h: "Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences.", cite: "第 1 节第 3 段" },
      { t: "h", h: "宣布替换" },
      { t: "p", h: "于是有了 Transformer：<em>eschewing recurrence</em>，完全绕开循环；<em>relying entirely on an attention mechanism to draw global dependencies</em>。global 是关键词：任意两个位置之间只隔一次注意力，路径长度是常数。最后那句 <em>twelve hours on eight P100 GPUs</em> 把成本也摆上桌。" },
      { t: "p", h: "还有一层历史语境：2017 年前后，翻译质量的提升主要靠更大的数据、更大的模型和集成，训练动辄以周计。作者把“十二小时”写进引言，是在说这条路线的成本结构变了，而不只是分数高一点。第 6 节的表 2 会把 BLEU 与 FLOPs 并排放在一起。" },
      { t: "p", h: "读完这一节，应该能复述一条链：RNN 强 → 但它串行 → 串行拖慢训练 → 注意力能跨距离 → 那把循环整个拿掉。第 2 节补“别人试过什么”，第 4 节会把这里的“路径长度”变成一张可比较的表。" },
      { t: "callout", tone: "note", title: "读法", h: "把每一段的让步（虽然……）和转折（however……）标出来，论证骨架就浮出来了。" }
    ],
    points: [
      "RNN 的地位来自效果，不来自效率；作者先承认前者。",
      "串行性的代价是样本内不能并行，序列越长越吃亏。",
      "注意力能跨距离取信息，但此前几乎都寄生在 RNN 上。",
      "Transformer 的全部主张：去掉循环，让任意两位置只隔一次注意力。"
    ],
    terms: [
      { term: "循环神经网络", en: "recurrent neural network", h: "按时间步逐个处理序列的神经网络，每一步依赖上一步的隐藏状态。" },
      { term: "长短期记忆", en: "long short-term memory (LSTM)", h: "RNN 的一种门控变体，缓解长序列上的梯度问题。" },
      { term: "隐藏状态", en: "hidden state", h: "模型在某个时间步内部保存的向量，携带到目前为止读到的信息。" },
      { term: "批处理", en: "batching", h: "一次把多个样本一起算，用样本维度的并行喂饱 GPU。" },
      { term: "序列转导", en: "sequence transduction", h: "输入一个序列、输出另一个序列的任务；机器翻译是最典型的例子。" }
    ],
    notes: [
      {
        para: "S1.p1.1",
        title: "先承认最强对手",
        h: "<em>state of the art</em> 是“当前最好”，<em>firmly established</em> 是“已经坐稳”。作者把 RNN、LSTM、GRU 并列，是因为三者共享同一个时间步结构：每一步的隐藏状态都由上一步算出。引用多不是炫耀，而是说“这不是小众路线”；后面所有批评都建立在这个最强形态上，反驳才站得住。"
      },
      {
        para: "S1.p2.1",
        title: "串行的是训练，不是推理",
        h: "原文说 <em>precludes parallelization within training examples</em>：被卡住的是“一个样本内部”的并行。推理本来就要逐词生成；训练时反向传播也要沿时间步走。真正贵的是长序列：n=1000 时理论上 1000 路并行，实际只有 1 路；batch 只能从样本维度补，而显存又限制 batch 大小。一句话：瓶颈不是算得慢，而是能同时算的东西太少。"
      },
      {
        para: "S1.p3.1",
        title: "配件如何变成主体",
        h: "<em>in conjunction with</em> 是“与……配合使用”。这句承认注意力已经能建模任意距离的依赖，但它的位置是配角：通常接在 RNN 的编码器与解码器之间，用来对齐两种语言。本文的新意不在发明注意力，而在把 RNN 从这条链里删掉——工具是旧的，用法是新的。"
      },
      {
        para: "S1.p4.1",
        title: "十二小时是什么概念",
        h: "这是 base 模型在英德任务上的训练时间；摘要里的大模型英法训练用了 8 块 GPU 3.5 天。作者用“小时”而不是“天”来对比当时动辄数周的训练，卖点是并行度而不是模型小。读者容易把这个数字当成所有任务的成本，其实它只对应一套配置和一个数据集。"
      }
    ],
    quiz: [
      {
        id: "S1q1",
        type: "choice",
        q: "作者说 RNN 的 “inherently sequential nature” 具体卡住了什么？",
        options: [
          "模型无法处理超过 100 个词的句子",
          "训练时一个样本内部的各个位置不能并行计算",
          "模型完全不能使用注意力",
          "参数量会随序列长度线性增长"
        ],
        answer: 1,
        explain: "原文紧接着说 <em>precludes parallelization within training examples</em>：时间步之间互相等待，样本内并行度只有 1。长句会放大问题，但不是“超过 100 个词就不能处理”；参数量也不随长度增长。"
      },
      {
        id: "S1q2",
        type: "choice",
        q: "“In all but a few cases, however, such attention mechanisms are used in conjunction with a recurrent network.” 这句话在论证中起什么作用？",
        options: [
          "说明注意力在效果上全面超过 RNN",
          "指出注意力此前通常只是 RNN 的配件，为“完全去掉 RNN”做铺垫",
          "证明卷积网络不适合机器翻译",
          "引出位置编码的必要性"
        ],
        answer: 1,
        explain: "这句先承认注意力的能力，再指出它一直寄生在 RNN 上。“however”后面才是作者的落点：既然工具已经存在，下一步就是把 RNN 拿掉。它没有比较效果高低，也没有谈卷积或位置编码。"
      },
      {
        id: "S1q3",
        type: "short",
        q: "用三句话复述第 1 节的论证顺序：先承认什么、再指出什么、最后提出什么。并说明第 4 节用来比较的 path length 指什么。",
        hint: "按段落顺序走：RNN 的地位 → 串行瓶颈 → Transformer。",
        reference: "先承认 RNN/LSTM/GRU 是序列建模与转导的 state of the art；再指出其计算沿位置串行，样本内无法并行，长序列还受显存限制；最后提出完全依赖注意力、绕开循环的 Transformer。path length 指信号从一个位置传到另一个位置要经过的计算步数，作者在第 4 节把它量化为常数。",
        rubric: [
          "承认 RNN 系列是当前最好",
          "指出串行导致样本内不能并行",
          "提出只靠注意力的 Transformer",
          "解释 path length 为信号经过的步数/层数"
        ]
      },
      {
        id: "S1q4",
        type: "short",
        q: "写出 RNN 第 t 步隐藏状态的依赖关系，并用长度为 1000 的句子解释为什么这会让训练慢。",
        hint: "先说 h_t 依赖谁，再说并行度。",
        reference: "关系是 h_t = f(h_{t−1}, x_t)，第 t 步必须等第 t−1 步算完。长度 1000 时，一个样本内部要串行 1000 步；GPU 的并行只能放到 batch 的样本维度，而显存又限制 batch 大小，于是长序列的训练时间随长度线性增长，长程依赖的梯度也要穿过 1000 步。",
        rubric: [
          "写出 h_t 依赖 h_{t−1} 与 x_t",
          "指出时间步之间必须等待",
          "说明样本内并行度为 1",
          "提到 batch 或显存限制"
        ]
      }
    ]
  },

  // ============================================================
  // S2 — 2 Background
  // ============================================================
  "S2": {
    key: "S2",
    cnTitle: "第 2 节 · 背景",
    kicker: "三条旧路线，只差一个空位",
    minutes: 8,
    intro: [
      { t: "p", h: "背景节的任务不是综述，而是定位：卷积路线已经做到什么、自注意力被谁用过、记忆网络差在哪，最后立起本文的边界——“第一个完全靠自注意力做表示、不用序列对齐 RNN 或卷积的转导模型”。" },
      { t: "h", h: "卷积路线：并行，但路径随距离变长" },
      { t: "p", h: "ConvS2S、ByteNet、Extended Neural GPU 都用卷积并行计算所有位置。代价是：要让相距 d 的两个位置发生联系，ConvS2S 需要线性多层的感受野重叠，ByteNet 需要对数多层；d 越大，信号要走的步数越多。作者引用 [12] 的说法：路径越长，长程依赖越难学。" },
      { t: "p", h: "换成数字：d=100 时，Transformer 是 1 次注意力，ConvS2S 要约 100 层等效距离，ByteNet 约 log₂100≈7 层。这不是说卷积不行，而是说它在“远距离”这一项上吃亏。" },
      { t: "p", h: "顺带拆一下这两个增长从哪来：ConvS2S 每层只把感受野向外扩一圈，走完距离 d 要 O(d) 层；ByteNet 用空洞卷积，每层把有效距离翻倍，所以只要 O(log d) 层。Transformer 不需要叠层，一次矩阵乘就把所有位置两两连上。" },
      { t: "p", h: "代价也写清楚了：注意力是对 value 的加权平均，一个头会把多个位置的信息混进同一个向量，作者叫 <em>reduced effective resolution</em>，像照片被平均糊了；补救办法是 3.2 节的多头——让多个头各自保留一种“对焦方式”。" },
      { t: "h", h: "自注意力不是新发明" },
      { t: "p", h: "作者给自注意力下了定义：在同一个序列内部，让不同位置互相看，以算出这个序列的表示；别名 intra-attention。它在阅读理解、摘要、文本蕴含、句表示学习里都用过。注意“同一序列内部”这个限定，它把自注意力与编码器-解码器注意力区分开。" },
      { t: "p", h: "记忆网络用的是“循环注意力”而不是“按序列对齐的循环”：它不要求 h<sub>t</sub> 严格对应第 t 个词，而是在记忆槽上迭代。作者把它单列，是因为它最接近“不要 RNN 的循环”，但仍保留了 recurrent 的迭代结构。" },
      { t: "h", h: "边界声明" },
      { t: "quote", h: "To the best of our knowledge, however, the Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.", cite: "第 2 节末段" },
      { t: "p", h: "这句话是本文的位置声明。“To the best of our knowledge”是学术上的保险措辞，claim 的范围是：在转导模型里，第一个完全依赖自注意力来计算输入与输出表示、且不使用序列对齐 RNN 或卷积的。它没有说“第一个注意力模型”，也没有说“第一个并行模型”——这两个常见误读要避免。" },
      { t: "p", h: "下一节开始拆模型。读的时候带着这一节的三个坐标：卷积的路径长度、自注意力的定义、以及“完全不用 RNN/CNN”到底意味着什么。" },
      { t: "callout", tone: "warn", title: "别把 claim 读大", h: "<em>first transduction model relying entirely on self-attention</em> 限定的是“表示”，不是“训练目标”，也不是“所有任务上的第一次”。注意力本身在 [2] 等工作中早就用于机器翻译。" }
    ],
    points: [
      "卷积路线能并行，但两个远距离位置的联系要走过更多层。",
      "注意力用加权平均换取常数路径，代价是有效分辨率被平均掉。",
      "自注意力指同一序列内部位置互看，别名 intra-attention。",
      "本文的 claim 有精确边界：完全靠自注意力做表示，不用序列对齐 RNN 或卷积。"
    ],
    terms: [
      { term: "自注意力", en: "self-attention", h: "同一序列内部不同位置互相关注，用来算这个序列的表示。" },
      { term: "序列对齐", en: "sequence-aligned", h: "隐藏状态严格按输入或输出的第 t 个符号对齐，RNN 就是这种结构。" },
      { term: "有效分辨率", en: "effective resolution", h: "注意力把多个位置加权平均后，一个向量能保留多少位置差异。" },
      { term: "记忆网络", en: "memory network", h: "把信息存进一组记忆槽，再通过多跳读写来推理的模型。" }
    ],
    notes: [
      {
        para: "S2.p1.1",
        title: "路径长度差多少",
        h: "ConvS2S 里，相距 d 的两个位置要靠 O(d) 层卷积把感受野叠起来；ByteNet 用空洞卷积，约 O(log d) 层；Transformer 一次注意力就让任意两位置直接相乘，O(1)。代价是注意力把多个位置加权平均成一个向量，单头下分辨率下降，3.2 节用多头把不同子空间分开来补。"
      },
      {
        para: "S2.p2.1",
        title: "intra 指序列内部",
        h: "<em>intra-attention</em> 的 intra 指“序列内部”。自注意力里 Q、K、V 来自同一序列；编码器-解码器注意力的 Q 来自解码器、K/V 来自编码器，那是跨序列。别把两者混为一谈：前者在编码器、解码器内部各有一处，后者只出现在解码器的中间子层，3.2.3 会给出对照表。"
      },
      {
        para: "S2.p3.1",
        title: "循环注意力不是自注意力",
        h: "end-to-end memory networks 仍然有“多跳”的循环：每一跳在记忆槽上重新读一次，再更新查询。它去掉的是“按词对齐”的循环，不是所有循环。作者把它作为最接近的先行者，同时点明差别：本文连这种迭代也不要，所有位置一次算完。"
      },
      {
        para: "S2.p4.1",
        title: "claim 的边界",
        h: "限定词分三层：<em>to the best of our knowledge</em>（我们不知道反例）、<em>transduction model</em>（转导任务）、<em>relying entirely on self-attention to compute representations</em>（表示完全由自注意力算）。它没说“第一个注意力模型”，也没说“第一个并行模型”。读 claim 时把这三个限定词逐个套上，范围就清楚了，也不会把作者没主张的东西算成错误。"
      }
    ],
    quiz: [
      {
        id: "S2q1",
        type: "choice",
        q: "ConvS2S 中，要让相距 d 的两个位置发生联系，所需操作数随 d 怎样增长？",
        options: ["线性增长", "对数增长", "常数，与 d 无关", "平方增长"],
        answer: 0,
        explain: "原文说 <em>linearly for ConvS2S and logarithmically for ByteNet</em>。Transformer 把它降到常数。平方增长的是自注意力每层的计算量 O(n²·d)，不是路径长度。"
      },
      {
        id: "S2q2",
        type: "choice",
        q: "作者说注意力带来 “reduced effective resolution”，指的是？",
        options: [
          "注意力权重过于稀疏，只盯着一个词",
          "对 value 的加权平均把多个位置的信息混进同一个向量，单头下分辨率下降",
          "位置编码的精度不够",
          "softmax 在长序列上数值不稳定"
        ],
        answer: 1,
        explain: "注意力输出是 value 的加权和，多个位置被平均进同一个 512 维向量，细节被抹平；作者用多头注意力补偿。权重稀疏是 softmax 饱和的后果，不是这里说的分辨率。"
      },
      {
        id: "S2q3",
        type: "choice",
        q: "关于 self-attention，下列哪项正确？",
        options: [
          "Q、K、V 都来自同一个序列",
          "Q 来自解码器，K、V 来自编码器",
          "它必须配合 RNN 才能使用",
          "它就是编码器-解码器注意力"
        ],
        answer: 0,
        explain: "自注意力的定义就是同一序列内部位置互看，因此 Q、K、V 同源；B 是编码器-解码器注意力。本文恰恰证明自注意力可以脱离 RNN 单独使用。"
      },
      {
        id: "S2q4",
        type: "short",
        q: "解释为什么 Transformer 中任意两个位置只需常数次操作，代价是什么，作者如何补偿。",
        hint: "从一次矩阵乘说起，再谈平均与多头。",
        reference: "一次缩放点积注意力里，每个 query 与所有 key 直接做点积，任意两位置只隔一次矩阵乘，所以路径长度是常数。代价是输出对 value 做加权平均，多个位置的信息被混合，单头下有效分辨率下降；作者用多头注意力让不同的头在不同表示子空间分别对焦，再把结果拼接。",
        rubric: [
          "指出任意两位置直接相乘、路径为常数",
          "指出加权平均导致分辨率下降",
          "指出多头补偿",
          "提到 3.2 节"
        ]
      },
      {
        id: "S2q5",
        type: "short",
        q: "作者为什么写 “To the best of our knowledge”？写出本文 claim 的准确范围，并指出一个它没有声称的内容。",
        hint: "把限定词逐层拆开。",
        reference: "这是学术措辞，表示作者未发现反例，但不排除存在。claim 的范围：在序列转导模型中，第一个完全依靠自注意力计算输入与输出表示、不使用序列对齐 RNN 或卷积的模型。它没有声称是第一个注意力模型（注意力早已用于机器翻译等任务），也没有声称在所有任务上都更强。",
        rubric: [
          "指出这是“未发现反例”的保险措辞",
          "点出限定在转导模型",
          "点出“完全依靠自注意力计算表示”",
          "点出不用序列对齐 RNN 或卷积",
          "举出一个未声称的内容"
        ]
      }
    ]
  },

  // ============================================================
  // S3 — 3 Model Architecture
  // ============================================================
  "S3": {
    key: "S3",
    cnTitle: "第 3 节 · 模型架构",
    kicker: "一台没有循环的翻译机器",
    minutes: 18,
    intro: [
      { t: "p", h: "这一节是全文的图纸。别急着逐条读公式：先在图 1 上认路，再按 3.1→3.5 的顺序把每个盒子拆开。整节回答一个问题：把循环拿掉之后，用什么补上“看哪里”和“按什么顺序”。" },
      { t: "figure", src: "assets/img/paper/ModalNet-21.png", alt: "Transformer 架构图：左侧编码器、右侧解码器", caption: "图 1：Transformer 模型架构。左侧编码器 6 层，右侧解码器 6 层；底部是嵌入与位置编码相加，顶部线性层加 softmax 输出词概率。", credit: "论文原图", width: "wide" },
      { t: "p", h: "先看数据的形状。设一个 batch 有 B 个句子、句子长度 n、嵌入维度 <span class=\"m\">d<sub>model</sub></span>=512，进入模型的张量是 B×n×512。编码器不改变这个形状，输出仍是 B×n×512 的表示 z。解码器吃右移一位的目标序列（长度 m），输出 B×m×512，再经线性层变成 B×m×词表大小，softmax 得到每个位置下一个词的概率。" },
      { t: "widget", id: "stack", caption: "逐层点亮编码器与解码器的堆叠：两边各 6 层，结构相同但不共享权重。" },
      { t: "h", h: "3.1 编码器与解码器：先加残差，再做层归一化" },
      { t: "p", h: "编码器由 N=6 个完全相同的层叠成。每层只有两个子层：多头自注意力，和逐位置前馈网络。每个子层外面套一条残差连接，然后做层归一化（layer normalization）。论文的写法是 <span class=\"m\">LayerNorm(x + Sublayer(x))</span>——注意顺序：先加，再归一化，这就是后来所说的 Post-LN。" },
      { t: "math", tex: String.raw`\mathrm{LayerNorm}\left(x+\mathrm{Sublayer}(x)\right)`, note: "残差相加之后再做层归一化，顺序不要记反。" },
      { t: "p", h: "这个顺序有两个硬约束。第一，残差要求输入输出同形：x 是 512 维，子层输出也必须是 512 维，否则加不起来；所以模型里所有子层和嵌入层都输出 <span class=\"m\">d<sub>model</sub></span>=512。第二，层归一化是在每个位置的 512 个特征上算均值和方差，不是跨 batch、也不是跨句子；它只把这一行向量标准化，形状不变。读者最容易把它和 BatchNorm 搞混。" },
      { t: "p", h: "“完全相同”指结构相同、层与层不共享参数。解码器也是 6 层，但每层有三个子层：带遮罩的多头自注意力、对编码器输出做多头注意力（编码器-解码器注意力）、逐位置前馈。每个子层后面同样接 Add & Norm。" },
      { t: "p", h: "解码器还有两件容易混的事。其一是 offset：训练时把目标序列整体右移一位（首位补起始符），位置 i 处的输入 token 是 <span class=\"m\">y<sub>i−1</sub></span>，要预测的是 <span class=\"m\">y<sub>i</sub></span>。其二是 mask：自注意力里把“未来”的位置在 softmax 之前设成 −∞，权重就变成 0。mask 保证看不到后面，offset 保证输入与标签错开；两者一起，才让位置 i 的预测只依赖 i 之前的已知输出。" },
      { t: "widget", id: "mask", caption: "切换因果遮罩：上三角被置为 −∞，softmax 后权重为 0，每个位置只能看自己和左边。" },
      { t: "h", h: "3.2 注意力：一次可微的检索" },
      { t: "p", h: "先给定义：注意力函数把一个查询（query）和一组键值对（key-value pairs）映射成一个输出。query、key、value 都是向量；输出是 value 的加权和，权重由 query 与对应 key 的“兼容性”算出。用查字典打比方：query 是你要查的词，key 是字典条目的索引，value 是条目内容；你不是只选一条，而是按相似度把所有条目混起来。" },
      { t: "h", h: "3.2.1 缩放点积注意力" },
      { t: "p", h: "动作只有四步：query 与所有 key 做点积；每个点积除以 <span class=\"m\">√d<sub>k</sub></span>；对结果做 softmax，得到和为 1 的权重；用权重对 value 加权求和。写成矩阵就是公式 (1)。" },
      { t: "math", tex: String.raw`\mathrm{Attention}(Q,K,V)=\mathrm{softmax}\left(\frac{QK^{T}}{\sqrt{d_{k}}}\right)V`, label: "(1)", note: "softmax 按行做：每个 query 得到一组对 m 个 key 的权重。" },
      { t: "p", h: "拆形状。设一次处理 n 个 query、m 个 key，key/query 是 d<sub>k</sub> 维、value 是 d<sub>v</sub> 维。Q 是 n×d<sub>k</sub>，K 是 m×d<sub>k</sub>，K 的转置是 d<sub>k</sub>×m，于是 QK<sup>T</sup> 是 n×m 的分数矩阵；除以 √d<sub>k</sub> 不改变形状；softmax 按行做，每行 m 个数变成和为 1 的权重；再乘 m×d<sub>v</sub> 的 V，得到 n×d<sub>v</sub> 的输出。编码器自注意力里 n=m=句长，所以分数矩阵是 n×n，每一行是一个位置对所有位置的注意力分布。" },
      { t: "p", h: "为什么要除以 √d<sub>k</sub>？论文脚注 1 给了一个漂亮的论证：假设 q、k 的每个分量独立、均值 0、方差 1，那么点积 q·k 是 d<sub>k</sub> 项之和，均值 0、方差 d<sub>k</sub>。d<sub>k</sub>=64 时标准差是 8；softmax 的输入差到 8 这个量级，输出几乎变成 one-hot，梯度接近 0，学不动。除以 √64=8，把标准差拉回 1，softmax 留在有梯度的区域。" },
      { t: "widget", id: "attention", caption: "点一个词，看它把注意力分给谁：每一行权重由 softmax 得到，加起来为 1。" },
      { t: "p", h: "图 2 左是这条流水线：MatMul → Scale → Mask(opt.) → SoftMax → MatMul。两个 MatMul 分别是 QK<sup>T</sup> 和“权重×V”；Mask 是可选项，解码器自注意力会用到。" },
      { t: "figure", src: "assets/img/paper/ModalNet-19.png", alt: "缩放点积注意力流程图", caption: "图 2 左：缩放点积注意力。缩放发生在 softmax 之前，遮罩也在 softmax 之前。", credit: "论文原图", width: "narrow" },
      { t: "p", h: "另一种注意力是加性注意力（additive attention）：用一个小前馈网络算 query 与 key 的兼容性。理论上两者复杂度同阶，但点积注意力能直接用高度优化的矩阵乘法，实际更快、更省内存；所以论文选它，并且只多了一个 <span class=\"m\">1/√d<sub>k</sub></span>。" },
      { t: "h", h: "3.2.2 多头注意力：八个视角" },
      { t: "p", h: "与其用一个 512 维的注意力，不如做 8 次“低维”注意力。步骤：把 Q、K、V 分别用 8 组独立的线性投影压到 64 维；每组各做一次缩放点积注意力，得到 n×64 的输出；把 8 个输出沿特征维拼成 n×512；最后用一个 512×512 的 <span class=\"m\">W<sup>O</sup></span> 混合回 <span class=\"m\">d<sub>model</sub></span>。" },
      { t: "math", tex: String.raw`\mathrm{MultiHead}(Q,K,V)=\mathrm{Concat}\left(\mathrm{head}_{1},\dots,\mathrm{head}_{h}\right)W^{O}` },
      { t: "math", tex: String.raw`\mathrm{head}_{i}=\mathrm{Attention}\left(QW_{i}^{Q},KW_{i}^{K},VW_{i}^{V}\right)` },
      { t: "p", h: "形状要盯住：<span class=\"m\">W<sub>i</sub><sup>Q</sup></span>、<span class=\"m\">W<sub>i</sub><sup>K</sup></span>、<span class=\"m\">W<sub>i</sub><sup>V</sup></span> 都是 512×64，<span class=\"m\">W<sup>O</sup></span> 是 512×512。h=8，<span class=\"m\">d<sub>k</sub>=d<sub>v</sub>=512/8=64</span>。每个头只看 64 维子空间，8 个头合起来仍然覆盖 512 维。" },
      { t: "p", h: "为什么值得？论文的原话是 <em>jointly attend to information from different representation subspaces at different positions</em>；单头会 <em>averaging inhibits this</em>：一个头只能给出一套加权平均，把句法、指代、位置这些不同关系混在同一条权重里。多头让每个头用自己的投影去对焦，像同一场景用 8 台不同焦距的相机拍。" },
      { t: "figure", src: "assets/img/paper/ModalNet-20.png", alt: "多头注意力结构图", caption: "图 2 右：多头注意力。8 组独立的 Q/K/V 投影并行做缩放点积注意力，拼接后再投影。", credit: "论文原图", width: "narrow" },
      { t: "p", h: "计算量并没有涨。每个头在 n×n 分数矩阵上做 64 维点积，成本约 n²·64；8 个头合起来是 8·n²·64=n²·512，与一个全维单头相同。因为每个头的维度缩小了，头数增加不改变总量级——这也解释了为什么 <span class=\"m\">d<sub>k</sub></span> 要等于 <span class=\"m\">d<sub>model</sub>/h</span>。" },
      { t: "h", h: "3.2.3 三种用法：Q、K、V 从哪来" },
      { t: "p", h: "同一个多头注意力，在模型里出现三次，区别只在 Q、K、V 的来源：" },
      {
        t: "table",
        caption: "三种多头注意力。n 为输入序列长度，m 为解码器当前长度。",
        head: ["用法", "Q 来自", "K、V 来自", "分数矩阵", "遮罩"],
        rows: [
          ["编码器自注意力", "上一层编码器输出", "同左", "n×n", "无"],
          ["解码器自注意力（masked）", "上一层解码器输出", "同左", "m×m", "有：上三角置 −∞"],
          ["编码器-解码器注意力", "上一层解码器输出", "编码器输出", "m×n", "无"]
        ]
      },
      { t: "p", h: "第二行的遮罩就是前面说的因果遮罩：第 i 行只能看第 0…i 列。第三行没有遮罩，因为解码器要看完整的输入句子；它的分数矩阵是 m×n，不是方阵——每个输出位置对每个输入位置都有一个分数。" },
      { t: "p", h: "mask 的数学动作很小：softmax 之前，把非法位置的分数改成 −∞；exp(−∞)=0，所以 softmax 之后这些位置的权重正好是 0，且每行仍然和为 1。不要事后对权重乘 0：那样每行不再归一化，还得重新除一遍；在 softmax 之前置 −∞ 才是干净的做法。" },
      { t: "h", h: "3.3 逐位置前馈网络：每个 token 自己的小 MLP" },
      { t: "p", h: "注意力子层负责“在位置之间搬运信息”，前馈子层负责“在每个位置上做非线性变换”。它对每个位置独立、且用同一组参数作用，所以叫 position-wise。公式 (2) 是两层线性变换，中间夹一个 ReLU：先 512→2048，再 2048→512。" },
      { t: "math", tex: String.raw`\mathrm{FFN}(x)=\max\left(0,xW_{1}+b_{1}\right)W_{2}+b_{2}`, label: "(2)" },
      { t: "p", h: "形状：x 是 512 维，<span class=\"m\">W<sub>1</sub></span> 是 512×2048，加偏置、过 ReLU 后得到 2048 维，再乘 2048×512 的 <span class=\"m\">W<sub>2</sub></span> 回到 512 维。每个编码器层、每个解码器层各有一个这样的 FFN；层内所有位置共享 <span class=\"m\">W<sub>1</sub>、W<sub>2</sub></span>，层与层之间不共享。参数量约 2×512×2048≈210 万，是每层参数的大头。" },
      { t: "p", h: "论文给了一个等价视角：两个卷积核大小为 1 的卷积。1×1 卷积不混合相邻位置，只在每个位置上做通道变换，正好就是逐位置的意思。中间维度放大 4 倍（512→2048），给非线性留出空间；这也是后来 Transformer 变体里最常被调的超参数之一。" },
      { t: "h", h: "3.4 嵌入与 softmax：一张表用三次" },
      { t: "p", h: "输入 token 先查表变成 512 维向量；解码器输出经过一个线性层和 softmax，变成下一个词的概率。论文让三个地方共享同一个权重矩阵：源语言嵌入、目标语言嵌入、softmax 之前的线性层。词表大小记作 V，这张表就是 V×512，共享一次就省下两份参数。" },
      { t: "p", h: "共享之所以说得通，是因为 softmax 前的 logits 可以看成“解码器输出与每个词嵌入的点积”：<span class=\"m\">h·E<sup>T</sup></span>。输入侧用 E 把词变成向量，输出侧用同一个 E 判断“像不像这个词”，两边落在同一个空间里。" },
      { t: "p", h: "还有一个不起眼但重要的细节：嵌入层把权重乘以 <span class=\"m\">√d<sub>model</sub></span>=√512≈22.6。论文没有解释原因，常见理由是：位置编码的值在 [−1, 1] 附近，而嵌入初始化通常很小；不放大，位置信息会在相加时压过词义。乘完之后两者量级接近，加法才有意义。" },
      { t: "h", h: "3.5 位置编码：把顺序写进向量" },
      { t: "p", h: "模型里没有循环也没有卷积，token 之间唯一的顺序线索来自位置编码。做法是在编码器和解码器底部的嵌入上“加”一个同维向量：PE 也是 512 维，所以能逐元素相加；不是拼接，拼接会变成 1024 维，后续所有矩阵都要改。" },
      { t: "p", h: "论文选正弦与余弦函数，公式如下。pos 是位置，i 是维度编号（0…255），偶数维用 sin，奇数维用 cos，分母 <span class=\"m\">10000<sup>2i/512</sup></span> 让不同维度有不同的频率。" },
      { t: "math", tex: String.raw`PE_{(pos,2i)}=\sin\left(pos/10000^{2i/d_{\mathrm{model}}}\right)` },
      { t: "math", tex: String.raw`PE_{(pos,2i+1)}=\cos\left(pos/10000^{2i/d_{\mathrm{model}}}\right)` },
      { t: "p", h: "看波长。第 i 对维度的波长是 <span class=\"m\">2π·10000<sup>2i/512</sup></span>：i=0 时约 6.28，位置每加 1 就转一圈；i 越大转得越慢，最大到约 10000·2π≈6.3 万。这像钟表的秒针、分针、时针：低维记录细粒度位置，高维记录粗粒度位置；所有维度合起来，每个位置得到一个独一无二的 512 维指纹。" },
      { t: "p", h: "为什么选它？论文的假设是：对任意固定偏移 k，<span class=\"m\">PE<sub>pos+k</sub></span> 可以写成 <span class=\"m\">PE<sub>pos</sub></span> 的线性函数（本质是一个与 k 有关的旋转）。线性这件事对注意力很友好：模型可以用一个固定的线性变换表达“看前面第 k 个词”，相对位置就变成了可学的操作。" },
      { t: "p", h: "作者也试过可学习的位置嵌入，结果几乎一样（表 3 第 E 行）；最终选正弦版，是因为它可能外推到训练时没见过的更长序列——位置公式对任意 pos 都有定义，而学出来的表只覆盖训练长度。" },
      { t: "p", h: "到这里，3.1–3.5 可以串成一句话：嵌入加位置编码给出带顺序的 512 维向量；6 层“注意力搬运 + 前馈变换 + Add & Norm”反复加工；解码器用遮罩保证不看未来、用编码器-解码器注意力读取输入；最后线性层加 softmax 输出下一个词。" }
    ],
    points: [
      "每个子层都是 Add & Norm：先残差相加，再对 512 维做层归一化。",
      "注意力的形状由 Q、K、V 决定：n×d_k 乘 d_k×m 得 n×m 的分数矩阵。",
      "8 个头各 64 维，拼回 512 维，计算量与单头全维相当。",
      "前馈网络逐位置作用：512→2048→512，参数占每层大头。",
      "位置编码与嵌入同维相加；波长从 2π 到约 6.3 万，给出相对位置线索。"
    ],
    terms: [
      { term: "自注意力", en: "self-attention", h: "同一序列内部位置互相关注；编码器第一子层与解码器第一子层都用它。" },
      { term: "缩放点积注意力", en: "scaled dot-product attention", h: "点积打分、除以 √d_k、softmax、对 value 加权求和。" },
      { term: "多头注意力", en: "multi-head attention", h: "h 组独立的 Q/K/V 投影并行做注意力，拼接后再投影。" },
      { term: "残差连接", en: "residual connection", h: "把子层输入直接加到输出上，让梯度有短路可走。" },
      { term: "层归一化", en: "layer normalization", h: "对单个位置的特征向量做标准化；本文放在残差相加之后。" },
      { term: "前馈网络", en: "feed-forward network", h: "逐位置作用的两层线性变换，中间夹 ReLU。" },
      { term: "位置编码", en: "positional encoding", h: "与嵌入同维相加的向量，把位置信息注入模型。" },
      { term: "因果遮罩", en: "causal mask", h: "在 softmax 前把未来位置的分数设为 −∞，使权重为 0。" },
      { term: "自回归", en: "auto-regressive", h: "生成第 i 个词时，只使用已经生成的前 i−1 个词。" },
      { term: "逐位置", en: "position-wise", h: "对序列里每个位置独立、用同一组参数做同样的变换。" }
    ],
    notes: [
      {
        para: "S3.SS1.SSS0.Px1.p1.1",
        title: "Post-LN 的加法顺序",
        h: "论文写的是 <span class=\"m\">LayerNorm(x + Sublayer(x))</span>：先残差相加，再归一化，后来被称为 Post-LN。层归一化对每个位置的 512 个特征单独算均值与方差，不跨 batch；形状仍是 512。读者常把顺序记反成“先归一化再进子层”，那是后来的 Pre-LN 变体，不是本文的写法。顺序一改，梯度的传播路径也跟着变。"
      },
      {
        para: "S3.SS1.SSS0.Px2.p1.1",
        title: "遮罩与错位是两件事",
        h: "offset 指训练时目标序列整体右移一位，位置 i 处的输入是 <span class=\"m\">y<sub>i−1</sub></span>；mask 指在 softmax 前把 i 之后的位置设成 −∞。offset 让输入与标签错开，mask 让模型看不见未来；两者一起，才保证预测 <span class=\"m\">y<sub>i</sub></span> 只依赖 <span class=\"m\">y<sub>0</sub>…y<sub>i−1</sub></span>。少任何一个，训练目标都会泄漏答案；推理时逐词生成，本来就只有过去，所以 mask 只在训练时起作用。"
      },
      {
        para: "S3.SS2.SSS1.p1.1",
        title: "缩放不是归一化向量",
        h: "缩放的对象是点积分数，不是 q、k 本身；向量长度没变，只是把分数整体除以 √d<sub>k</sub>。d<sub>k</sub>=64 时点积的标准差约 8，softmax 会接近 one-hot、梯度趋近 0；除以 8 把标准差拉回 1。别把它和“把向量缩成长度 1”混为一谈：后者改变点积的含义，前者只是调温度。"
      },
      {
        para: "S3.SS2.SSS1.p2.1",
        title: "n×m 的分数矩阵",
        h: "Q 是 n×d<sub>k</sub>、K 是 m×d<sub>k</sub>，QK<sup>T</sup> 是 n×m；softmax 按行做，每行 m 个权重相加为 1；再乘 m×d<sub>v</sub> 的 V 得 n×d<sub>v</sub>。编码器自注意力里 n=m，矩阵是方阵；编码器-解码器注意力里 n 是解码器长度、m 是输入长度，矩阵不是方阵，输出仍回到 n×64。把 n、m 认成“序列长度”而不是“维度”，形状就不会乱。"
      },
      {
        para: "S3.SS2.SSS2.p1.1",
        title: "投影到 64 维",
        h: "每个头有自己的 <span class=\"m\">W<sub>i</sub><sup>Q</sup>、W<sub>i</sub><sup>K</sup>、W<sub>i</sub><sup>V</sup></span>，形状都是 512×64；8 个头并行，输出各是 n×64，拼成 n×512，再用 512×512 的 <span class=\"m\">W<sup>O</sup></span> 混合。所谓“多头”不是把 512 维切成 8 份复制，而是 8 套独立、可学习的投影：每个头看到同一批 token，但用自己的方式提问和检索。W<sup>O</sup> 负责把 8 个 64 维的结果重新混合成 512 维，避免各头各说各话。"
      },
      {
        para: "S3.SS2.SSS2.p2.1",
        title: "平均会抹平差异",
        h: "单个头只能给出一套权重，一个位置的所有关系（句法、指代、位置）被压进同一次加权平均，作者说 <em>averaging inhibits this</em>。多个头各自投影到不同子空间，能同时保留几种关系。它不是“参数更多所以更强”，而是“多个视角避免平均”；参数量与单头全维几乎一样。"
      },
      {
        para: "S3.SS2.SSS2.p5.1",
        title: "八个头，每个 64 维",
        h: "<span class=\"m\">d<sub>k</sub>=d<sub>v</sub>=512/8=64</span>。每个头在 n×n 分数矩阵上做 64 维点积，成本约 n²·64；8 个头共 8n²·64=n²·512，与单头全维相同。参数总量恰好是 <span class=\"m\">4×512<sup>2</sup></span>=1,048,576，也和单头全维完全相同。头数增加买到的是“视角”，不是“算力”；真正随序列变贵的是 n² 那一项，不是 h。换句话说，8 个头不是 8 倍开销，也不是 8 倍参数。"
      },
      {
        para: "S3.SS2.SSS3.p1.1",
        title: "三种用法看 Q 从哪来",
        h: "三种用法只差 Q、K、V 的来源：编码器自注意力三者都来自上一层编码器；解码器自注意力三者都来自上一层解码器，且加上三角遮罩；编码器-解码器注意力 Q 来自解码器、K/V 来自编码器，分数矩阵 m×n。记住“Q 决定谁在提问，K/V 决定向谁检索”。"
      },
      {
        para: "S3.SS3.p1.1",
        title: "512→2048→512",
        h: "FFN 对每个位置独立作用：x(512) 乘 W<sub>1</sub>(512×2048) 加 b<sub>1</sub>，过 ReLU 得 2048 维，再乘 W<sub>2</sub>(2048×512) 加 b<sub>2</sub> 回到 512。同一层内所有位置共享参数，层与层之间不共享；等价于两个 1×1 卷积。每层约 210 万参数，是参数大头，也是模型主要的非线性来源；它不在位置之间通信，那是注意力子层的工作。"
      },
      {
        para: "S3.SS4.p1.1",
        title: "共享一次，乘 √512",
        h: "源嵌入、目标嵌入、softmax 前线性层共享同一个 V×512 权重矩阵。乘 √d<sub>model</sub>≈22.6 是因为嵌入初始化数值小，而位置编码在 [−1,1] 附近；放大后两者相加才量级相当。共享还让输出 logits 等于解码器状态与词嵌入的点积 <span class=\"m\">h·E<sup>T</sup></span>，输入与输出被放进同一个空间。"
      },
      {
        para: "S3.SS5.p1.1",
        title: "位置编码是加不是拼",
        h: "位置编码与嵌入同维（512），逐元素相加，形状不变、不增加参数；拼接会变成 1024 维，后续所有矩阵都要改。位置信息必须加在编码器和解码器的最底部，之后每层都带着它走。没有这一步，模型对词序完全无感：同一组词打乱顺序，输出会一模一样。"
      },
      {
        para: "S3.SS5.p4.1",
        title: "波长是几何级数",
        h: "第 i 对维度波长 <span class=\"m\">2π·10000<sup>2i/512</sup></span>：i=0 约 6.28，i=255 约 6.3 万，按几何级数排开。低维变化快、高维变化慢，像秒针与时针。固定偏移 k 时 <span class=\"m\">PE<sub>pos+k</sub></span> 是 <span class=\"m\">PE<sub>pos</sub></span> 的线性变换（旋转），所以模型能学“看前面第 k 个位置”，而不用为每个 k 单独记一张表。这种“相对位置可线性表达”的性质，也是作者不用学习式位置嵌入的主要理由之一。"
      }
    ],
    quiz: [
      {
        id: "S3q1",
        type: "choice",
        q: "论文中每个子层输出的写法是下列哪一个？",
        options: [
          "LayerNorm(x) + Sublayer(x)",
          "LayerNorm(x + Sublayer(x))",
          "x + Sublayer(LayerNorm(x))",
          "Sublayer(LayerNorm(x)) + x"
        ],
        answer: 1,
        explain: "论文原文是 LayerNorm(x + Sublayer(x))：先残差相加，再归一化，即 Post-LN。C、D 是后来常见的 Pre-LN 变体；A 把归一化放在相加之前。"
      },
      {
        id: "S3q2",
        type: "choice",
        q: "多头注意力中 h=8、d_model=512，每个头的 d_k 是多少？",
        options: ["512", "256", "64", "8"],
        answer: 2,
        explain: "论文取 d_k=d_v=d_model/h=512/8=64。8 个头各输出 n×64，拼起来正好 n×512，再由 W^O 混合；不是把 512 维简单切成 8 份复制。"
      },
      {
        id: "S3q3",
        type: "choice",
        q: "编码器-解码器注意力中，Q、K、V 分别来自哪里？",
        options: [
          "Q、K、V 都来自编码器输出",
          "Q 来自解码器上一层，K、V 来自编码器输出",
          "Q 来自编码器输出，K、V 来自解码器上一层",
          "Q 来自词嵌入，K、V 来自位置编码"
        ],
        answer: 1,
        explain: "这一步让解码器的每个位置对输入序列的所有位置取信息：Q 由解码器上一层产生，K、V 来自编码器输出，分数矩阵是 m×n，通常不加上三角遮罩。"
      },
      {
        id: "S3q4",
        type: "short",
        q: "设编码器输入长度为 n、解码器当前长度为 m。写出三种多头注意力各自的分数矩阵形状，并指出哪种有遮罩、遮罩加在哪个位置。",
        hint: "先写 Q 和 K 的形状，再相乘；遮罩在 softmax 之前。",
        reference: "编码器自注意力：Q 与 K 都是 n×d_k，分数矩阵 n×n，无遮罩。解码器自注意力：Q、K 都是 m×d_k，分数矩阵 m×m，在 softmax 之前把上三角（j>i）设为 −∞。编码器-解码器注意力：Q 来自解码器 m×d_k，K 来自编码器 n×d_k，分数矩阵 m×n，无遮罩。遮罩加在 softmax 的输入上，exp(−∞)=0，权重为 0。",
        rubric: [
          "三种形状 n×n、m×m、m×n 都写对",
          "指出解码器自注意力有遮罩",
          "说明遮罩加在 softmax 之前、置为 −∞",
          "说明遮罩后每行仍归一化为 1"
        ]
      },
      {
        id: "S3q5",
        type: "short",
        q: "位置编码为什么用加法而不是拼接？写出正弦位置编码的波长范围，并解释它如何帮助模型表达相对位置。",
        hint: "加法与形状、参数量的关系；波长与旋转的关系。",
        reference: "位置编码与嵌入同为 512 维，逐元素相加可以保持形状、不增加参数；拼接会得到 1024 维，后续所有矩阵都要改。波长从 2π 到 10000·2π，按几何级数排列。对固定偏移 k，PE(pos+k) 可以写成 PE(pos) 的线性变换（旋转），所以模型能用线性映射表达“看前面第 k 个位置”，而固定公式还能外推到训练时未见的长度。",
        rubric: [
          "指出同维相加、保持形状与参数量",
          "指出拼接会改变维度",
          "写对波长范围 2π 到 10000·2π 或约 6.3 万",
          "指出固定偏移下是线性变换/旋转",
          "提到外推到更长序列"
        ]
      }
    ]
  }
};
