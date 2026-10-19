/* 《Attention Is All You Need》中文注疏 · 后半篇（第 4–7 节 + 附录可视化）
 * 全局变量：window.NOTES_B
 * 旁注锚点：data/para-ids.md 中真实存在的段落 id
 * 独立公式一律 String.raw
 */
window.NOTES_B = {
  "S4": {
    key: "S4",
    cnTitle: "为什么是自注意力",
    kicker: "用三把尺子量三种层",
    minutes: 8,
    intro: [
      {
        t: "p",
        h: "第 3 节把 Transformer 的零件装好了；这一节回答一个更基本的问题：凭什么用自注意力，而不是循环层或卷积层？作者的比较对象限定得很干净——把长度 <span class=\"m\">n</span> 的序列 <span class=\"m\">(x<sub>1</sub>,…,x<sub>n</sub>)</span> 映射成长度相同的 <span class=\"m\">(z<sub>1</sub>,…,z<sub>n</sub>)</span>，每个向量都在 <span class=\"m\">R<sup>d</sup></span> 里，也就是编码器或解码器中的一层。三种候选层做同一件事，作者用三把尺子分别量它们。"
      },
      { t: "h", h: "三把尺子" },
      {
        t: "p",
        h: "三把尺子对应原文的三个 desiderata（衡量标准）：一是<b>每层的计算复杂度</b>（贵不贵），二是<b>最少串行操作数</b>（能不能同时算），三是<b>任意两个位置之间的最大路径长度</b>（信息要走多远）。前两把决定训练要花多少算力，第三把决定长距离依赖好不好学。三者不是同一件事，不能互相替代。"
      },
      {
        t: "table",
        caption: "表 1（重排）：不同层类型的每层复杂度、最少串行操作数与最大路径长度。n 为序列长度，d 为表示维度，k 为卷积核宽度，r 为受限自注意力的邻域大小。",
        head: ["层类型", "每层复杂度", "最少串行操作", "最大路径长度"],
        rows: [
          ["自注意力", "O(n<sup>2</sup>·d)", "O(1)", "O(1)"],
          ["循环层", "O(n·d<sup>2</sup>)", "O(n)", "O(n)"],
          ["卷积层", "O(k·n·d<sup>2</sup>)", "O(1)", "O(log<sub>k</sub> n)"],
          ["受限自注意力", "O(r·n·d)", "O(1)", "O(n/r)"]
        ]
      },
      { t: "h", h: "第一列：每层多贵" },
      {
        t: "p",
        h: "自注意力要为 <span class=\"m\">n</span> 个查询各算 <span class=\"m\">n</span> 个点积，每个点积长度是 <span class=\"m\">d</span>，所以是 <span class=\"m\">O(n<sup>2</sup>·d)</span>；循环层每步做一次 <span class=\"m\">d×d</span> 的矩阵乘，<span class=\"m\">n</span> 步合起来 <span class=\"m\">O(n·d<sup>2</sup>)</span>；卷积层每个位置要做 <span class=\"m\">k</span> 次 <span class=\"m\">d×d</span> 乘，<span class=\"m\">O(k·n·d<sup>2</sup>)</span>。把自注意力和循环层这两项约掉一个 <span class=\"m\">n</span>，比较就退化成 <span class=\"m\">n</span> 和 <span class=\"m\">d</span> 谁大——这就是下一段那句“n 小于 d 时自注意力更快”的全部来源。"
      },
      { t: "h", h: "第二列：能并行多少" },
      {
        t: "p",
        h: "这一列数的不是算力，而是“必须排队做几步”。自注意力把所有位置两两的点积摞成一个 <span class=\"m\">n×n</span> 矩阵，一次矩阵乘算完，串行操作是 <span class=\"m\">O(1)</span>；循环层第 <span class=\"m\">t</span> 步必须等第 <span class=\"m\">t−1</span> 步的隐状态，串行操作是 <span class=\"m\">O(n)</span>。这就解释了为什么 Transformer 能吃满 8 张 P100：GPU 擅长同一时刻做大量同构运算，最怕“等上一步算完”。"
      },
      { t: "h", h: "第三列：信号走多远" },
      {
        t: "p",
        h: "路径长度指前向信号和反向梯度从位置 <span class=\"m\">i</span> 到位置 <span class=\"m\">j</span> 必须经过的边数。自注意力里任意两个词通过一次点积加权就建立联系，路径是 <span class=\"m\">O(1)</span>；循环层要把第 1 个词的信息带到第 <span class=\"m\">n</span> 个词，必须穿过 <span class=\"m\">n</span> 个隐状态，路径是 <span class=\"m\">O(n)</span>，梯度一路连乘，越远越容易消失。卷积层单个核宽 <span class=\"m\">k</span> 只能看 <span class=\"m\">k</span> 个邻居，要覆盖全句得堆 <span class=\"m\">O(n/k)</span> 层连续卷积、或 <span class=\"m\">O(log<sub>k</sub> n)</span> 层膨胀卷积；表里的 <span class=\"m\">log<sub>k</sub> n</span> 是堆叠之后的结果，不是单层的本事。"
      },
      {
        t: "p",
        h: "代一组具体数：<span class=\"m\">n=50</span>、<span class=\"m\">d=512</span>。自注意力单层约 <span class=\"m\">50<sup>2</sup>×512≈128 万</span>次乘加；循环层约 <span class=\"m\">50×512<sup>2</sup>≈1310 万</span>次，差十倍左右。机器翻译的句子通常几十到一百个 subword，而 <span class=\"m\">d<sub>model</sub>=512</span>，所以 <span class=\"m\">n&lt;d</span> 是常态，自注意力反而便宜。但 <span class=\"m\">n</span> 一旦超过 <span class=\"m\">d</span>（比如两千个 token 的文档），<span class=\"m\">n<sup>2</sup></span> 开始爆炸，结论反转——这是后来所有长上下文工作的起点。"
      },
      {
        t: "p",
        h: "作者知道这个软肋，所以给了折中方案：受限自注意力只看每个位置邻域 <span class=\"m\">r</span> 内的词。复杂度从 <span class=\"m\">O(n<sup>2</sup>·d)</span> 降到 <span class=\"m\">O(r·n·d)</span>，代价是最大路径长度从 <span class=\"m\">O(1)</span> 变成 <span class=\"m\">O(n/r)</span>：远处的信息要靠多层堆叠才传得到。表 1 最后一行就是它，论文把它留作 future work。"
      },
      {
        t: "p",
        h: "卷积那两行最容易被误读。单个宽度 <span class=\"m\">k&lt;n</span> 的卷积核并不能连接所有输入输出对，必须堆叠；普通卷积每个位置要做 <span class=\"m\">k</span> 次 <span class=\"m\">d×d</span> 乘，比循环层还贵 <span class=\"m\">k</span> 倍。可分离卷积能把复杂度降到 <span class=\"m\">O(k·n·d+n·d<sup>2</sup>)</span>，但即便取 <span class=\"m\">k=n</span>，它的复杂度和“一个自注意力层 + 一个逐点前馈层”打平——而后者正是 Transformer 的一层。换句话说，在作者眼里卷积能做的自注意力也能做，而且路径更短。"
      },
      {
        t: "widget",
        id: "scaled",
        caption: "拖一拖 d<sub>k</sub>：点积的方差随维度线性增长，softmax 随之变尖。表 1 里的 d 与这里的 d<sub>k</sub> 是同一类“表示维度”——它同时决定单层成本（按 d 线性涨）和数值稳定性。"
      },
      {
        t: "p",
        h: "最后一条是顺带的：注意力分布可以直接画出来。作者在附录里展示了若干例子，说不同的头似乎在处理不同的句法、语义任务。注意英文措辞是 “could yield” 和 “appear to exhibit”——这是观察，不是证明；权重高也不等于因果重要。附录 Sx1 会专门讲这些图能读出什么、不能读出什么。"
      },
      {
        t: "callout",
        tone: "key",
        title: "这一节真正回答的问题",
        h: "自注意力胜出的不是“单层更省算力”（那要看 n 和 d 谁大），而是“串行操作 O(1)、路径长度 O(1)”。复杂度、并行度、路径长度是三件独立的事，表 1 把它们并排放，就是为了让你别用一列去解释另一列。"
      }
    ],
    points: [
      "表 1 三列分别回答：每层多贵、能并行多少、信号要走多远。",
      "自注意力每层 O(n²d)；n&lt;d 时比循环层便宜，长序列时反过来。",
      "自注意力任意两位置一步可达；循环要 n 步，卷积堆叠后要 log_k n 层。",
      "受限注意力用路径长度换成本：O(rnd) 的代价是 O(n/r) 的路径。",
      "可解释性只是 side benefit，原文措辞是 could / appear，不是结论。"
    ],
    terms: [
      { term: "每层复杂度", en: "complexity per layer", h: "这一层要做多少次乘加，用 n（序列长度）和 d（表示维度）的大 O 记号表示。" },
      { term: "串行操作", en: "sequential operations", h: "必须一步一步排队执行的最少次数；它决定模型能不能吃满 GPU 的并行度。" },
      { term: "最大路径长度", en: "maximum path length", h: "任意两个位置之间，前向信号或反向梯度必须经过的最多边数。" },
      { term: "受限自注意力", en: "restricted self-attention", h: "每个位置只看邻域 r 内的位置，而不是整句；用来把 n² 成本压成 r·n。" }
    ],
    notes: [
      {
        para: "S4.p1.1",
        title: "比较对象先被限定",
        h: "desiderata 是“衡量标准”的复数。这一段先把比较对象钉死：同一个长度 n 的符号序列映射成长度 n 的表示序列，x<sub>i</sub>、z<sub>i</sub> 都在 R<sup>d</sup> 里，比的是“一层”，不是整个模型。所以表 1 的结论不能直接搬成“Transformer 比 LSTM 快 n 倍”；它比的是层类型，而每种层都可以堆叠。"
      },
      {
        para: "S4.p3.1",
        title: "路径长度不是距离",
        h: "“path length” 数的是边数，不是欧氏距离，也不是物理时间。循环层把第 1 个词的信息送到第 n 个词，必须经过 n 个隐状态，反向传播时梯度要连乘 n 个雅可比矩阵，所以长程依赖难学。自注意力一步到位。但路径短只说明好传播，不说明省算力——算力是另一列。"
      },
      {
        para: "S4.p4.1",
        title: "n 小于 d 才更便宜",
        h: "把 O(n²d) 和 O(nd²) 约掉一个 n，比较就是 n 和 d。n=50、d=512 时，自注意力单层约 128 万次乘加，循环层约 1310 万次；句子级翻译 n 通常在几十到一百，所以自注意力占优。反过来，n=2000 的长文档，n²d 是 20 亿量级，循环层反而便宜。这句结论有前提，原文用 “when the sequence length n is smaller than the representation dimensionality d” 说得很清楚。"
      },
      {
        para: "S4.p5.1",
        title: "卷积要堆叠才连得通",
        h: "单个卷积核 k&lt;n 只能连接局部，感受野靠叠层扩大：连续卷积要 O(n/k) 层，膨胀卷积要 O(log<sub>k</sub> n) 层，表里的路径长度说的是堆叠后的结果。可分离卷积把成本压到 O(k·n·d+n·d²)，但 k=n 时正好等于“自注意力层 + 逐点前馈层”。所以作者不是在说卷积一无是处，而是在说同样连得通时它的路径更长、通常更贵。"
      },
      {
        para: "S4.p6.1",
        title: "可解释性只是顺带的",
        h: "“side benefit” 是作者主动把可解释性降级：它不是方法目标，也不是证据。英文用 “could yield”（可能带来）和 “appear to exhibit”（似乎表现出），都是留余地的措辞。注意力权重只是 softmax 之后的一行分布，归一化意味着此消彼长，权重高不等于因果重要；附录里还是挑出来的例子。读到 §5、§7 时要记住这个强度。"
      }
    ],
    quiz: [
      {
        id: "S4q1",
        type: "choice",
        q: "只看表 1 的“最大路径长度”一列，下列排序正确的是？",
        options: [
          "自注意力 O(1) ＜ 卷积 O(log<sub>k</sub> n) ＜ 循环 O(n)",
          "循环 O(1) ＜ 自注意力 O(n) ＜ 卷积 O(n)",
          "自注意力 O(n) ＜ 循环 O(1) ＜ 卷积 O(log<sub>k</sub> n)",
          "三者都是 O(1)，没有差别"
        ],
        answer: 0,
        explain: "表 1 给的是：自注意力 O(1)、循环 O(n)、卷积 O(log<sub>k</sub> n)（膨胀卷积堆叠后）。对数增长比线性慢，所以卷积居中。串行操作列才是自注意力和卷积同为 O(1)，路径长度列卷积不是 O(1)。"
      },
      {
        id: "S4q2",
        type: "choice",
        q: "设 <span class=\"m\">n=1000</span>、<span class=\"m\">d=512</span>，按表 1 的每层复杂度，哪一层最便宜？",
        options: [
          "自注意力：O(n<sup>2</sup>·d)",
          "循环层：O(n·d<sup>2</sup>)",
          "卷积层（k=3）：O(k·n·d<sup>2</sup>)",
          "三者相同"
        ],
        answer: 1,
        explain: "代入：n²d=1000²×512≈5.12×10⁸；nd²=1000×512²≈2.62×10⁸；knd²≈7.86×10⁸。此时 n>d，自注意力的 n² 项反超，循环层最便宜。这正是“n&lt;d 时自注意力更快”的另一面。"
      },
      {
        id: "S4q3",
        type: "choice",
        q: "受限自注意力把邻域 r 调小，表 1 中哪两项会同时变化、方向如何？",
        options: [
          "复杂度 O(r·n·d) 下降，最大路径长度 O(n/r) 上升",
          "复杂度 O(r·n·d) 上升，最大路径长度 O(n/r) 下降",
          "两者都下降",
          "两者都不变，只影响参数量"
        ],
        answer: 0,
        explain: "r 变小，每层要算的邻域变少，复杂度按 r 线性下降；但每个位置能直接看到的范围变小，远处信息要走更多层才传得到，路径长度按 n/r 上升。这是一次明确的取舍，原文把它留作 future work。"
      },
      {
        id: "S4q4",
        type: "short",
        q: "用表 1 的两列说明：“自注意力更并行”和“自注意力更便宜”是两件不同的事。要求各指到具体一列，并用 n=50、d=512 举一个数。",
        hint: "一列数的是必须排队的步数，另一列数的是乘加次数。",
        reference: "并行看“最少串行操作”列：自注意力 O(1)，循环层 O(n)，因为循环第 t 步依赖第 t−1 步，而自注意力把所有点积一次矩阵乘算完。便宜看“每层复杂度”列：自注意力 O(n²d)、循环层 O(nd²)，约掉 n 后比 n 和 d。n=50、d=512 时自注意力约 128 万次乘加，循环层约 1310 万次，所以这里自注意力既并行又便宜；但 n>d 时便宜这一条就不成立了，并行这一条仍然成立。",
        rubric: [
          "指出并行度对应“最少串行操作”列：O(1) vs O(n)",
          "指出成本对应“每层复杂度”列，并说出 n²d 与 nd² 的比较",
          "给出 n=50、d=512 的具体数字或数量级",
          "点明两列独立：n>d 时成本结论反转，并行结论不变"
        ]
      },
      {
        id: "S4q5",
        type: "short",
        q: "为什么更短的路径有利于学习长距离依赖？用前向信号和反向梯度的传播解释，并说明路径长度为什么不等于计算量。",
        hint: "想想循环层里梯度要连乘多少次。",
        reference: "路径长度是信号从位置 i 到位置 j 必须经过的边数。前向时信息每过一条边就被变换一次；反向时梯度每过一条边就乘一个雅可比矩阵。循环层要跨 n 步，连乘 n 次，容易消失或爆炸；自注意力任意两点只隔一次点积加权，O(1) 步。但路径短只说明传播容易，不说明计算少：自注意力每层要做 n² 次点积，n 大时反而更贵，成本和路径是表 1 中两列不同的事。",
        rubric: [
          "定义路径长度为信号/梯度经过的边数",
          "说明循环层梯度要连乘 n 次，易消失",
          "说明自注意力两位置一步可达",
          "点明路径长度与计算复杂度是两列、可分离"
        ]
      }
    ]
  },

  "S5": {
    key: "S5",
    cnTitle: "训练",
    kicker: "十二小时背后的训练配方",
    minutes: 7,
    intro: [
      {
        t: "p",
        h: "第 5 节只有一页半，却是复现 Transformer 时最常被翻回去的一页。它回答四件事：用什么数据、用什么机器、学习率怎么调、怎么防止过拟合。把这几个数字记住，你才能判断后来论文里“我们也训练了更久”到底意味着什么。"
      },
      { t: "h", h: "数据与批" },
      {
        t: "p",
        h: "EN-DE 用 WMT 2014 标准集，约 450 万句对，BPE（byte-pair encoding）子词，源语言和目标语言共享约 37000 的词表；EN-FR 用同一个 WMT 2014，但大得多，3600 万句对，word-piece 词表 32000。批不是按句子数凑的，而是按近似长度分组，每批约 25000 个源 token 加 25000 个目标 token——按 token 数凑批，长短句混排，padding 才不会浪费。"
      },
      {
        t: "p",
        h: "为什么要按 token 凑批？如果按句子数，一个 80 词的句子会让同批的 5 词短句大量 padding，GPU 算的全是零。按每批约 25000+25000 个 token 出批，每步矩阵乘的大小稳定，长句短句的比例也稳定，训练曲线才可复现。"
      },
      { t: "h", h: "机器与时间表" },
      {
        t: "p",
        h: "一台机器、8 张 NVIDIA P100。base 模型每步约 0.4 秒，跑 100000 步，论文写约 12 小时；big 模型每步 1.0 秒，跑 300000 步，约 3.5 天。自己算一遍：0.4×100000=40000 秒≈11.1 小时，12 小时是把评估、写检查点等开销算进去的粗略值；1.0×300000=300000 秒≈3.47 天，对得上。"
      },
      { t: "h", h: "优化器与 warmup" },
      {
        t: "p",
        h: "优化器用 Adam，β<sub>1</sub>=0.9、β<sub>2</sub>=0.98、ε=10<sup>−9</sup>。β<sub>2</sub> 比常见的 0.999 小，二阶矩估计忘得更快，后来大量 Transformer 实现沿用了这个设置。学习率不是常数，而是按公式 (3) 先升后降。"
      },
      {
        t: "math",
        tex: String.raw`\mathrm{lrate}=d_{\mathrm{model}}^{-0.5}\cdot\min\left(\mathrm{step\_num}^{-0.5},\ \mathrm{step\_num}\cdot\mathrm{warmup\_steps}^{-1.5}\right)`,
        label: "(3)",
        note: "先线性升温，再按步数的平方根倒数衰减。"
      },
      {
        t: "p",
        h: "拆开看：min 里两项，谁小取谁。训练初期 step 很小，<span class=\"m\">step·warmup<sup>−1.5</sup></span> 比 <span class=\"m\">step<sup>−0.5</sup></span> 小，学习率随 step 线性上升；过了 warmup_steps=4000，另一项接管，按 <span class=\"m\">step<sup>−0.5</sup></span> 衰减。拐点就在两项相等处：step=4000。base 的峰值 <span class=\"m\">lr=512<sup>−0.5</sup>×4000<sup>−0.5</sup>≈6.99×10<sup>−4</sup></span>；big 的 d<sub>model</sub>=1024，峰值减半到约 4.9×10<sup>−4</sup>。warmup 的作用是别让刚开始还很随机的模型被一个大步长带跑。"
      },
      {
        t: "p",
        h: "代两个数看这条曲线：第 1 步 <span class=\"m\">lr≈512<sup>−0.5</sup>×4000<sup>−1.5</sup>≈1.7×10<sup>−7</sup></span>，约等于零；到第 4000 步升到 6.99×10<sup>−4</sup>，涨了约四千倍；之后按 <span class=\"m\">1/√step</span> 慢慢降，到 10 万步约 1.4×10<sup>−4</sup>。先小后大的理由：初始化时输出接近随机，梯度方向不稳，大步长容易把参数带进坏区域；等训练稳定了，再按平方根倒数退火。"
      },
      { t: "h", h: "正则化" },
      {
        t: "p",
        h: "三件事。第一，残差 dropout：对每个子层的输出做 dropout，<b>在它被加回子层输入并做层归一化之前</b>；base 用 P<sub>drop</sub>=0.1。第二，嵌入与位置编码相加的结果也做 dropout。第三，label smoothing 取 ε<sub>ls</sub>=0.1：目标从 one-hot 变成“正确类 0.9 + 其余平摊 0.1”，模型不再被逼到 100% 自信。代价是训练 perplexity 变差，收益是准确率和 BLEU 变好——表 3 的 (D) 行会替这句话作证。big 模型用 P<sub>drop</sub>=0.3；EN-FR 的 big 是例外，用 0.1。"
      },
      {
        t: "p",
        h: "这套设置里很少有理论推导：warmup=4000、β<sub>2</sub>=0.98、P<sub>drop</sub>=0.1 都是在开发集上试出来的经验值。读这一节时把“作者选了这些数”和“这些数有必然性”分开，复现时才不会迷信某个具体取值；真正稳定的是结构——先升温、后退火，对子层输出做 dropout，用平滑目标换泛化。"
      },
      {
        t: "callout",
        tone: "note",
        title: "单位别读错",
        h: "12 小时 / 3.5 天都是 8 张 P100 的时间，不是单卡；“step”是参数更新次数，不是 epoch；FLOPs 是训练总算力，不是推理速度。这三个单位经常在二手转述里被悄悄换掉。"
      }
    ],
    points: [
      "EN-DE 450 万句对、37K BPE；EN-FR 3600 万句对、32K word-piece。",
      "base：8×P100、0.4 秒/步、10 万步≈12 小时；big：1 秒/步、30 万步≈3.5 天。",
      "Adam β₂=0.98、ε=1e−9；warmup 4000 步，base 峰值学习率约 7×10⁻⁴。",
      "dropout 0.1（big 0.3）加在子层输出加回残差、做归一化之前。",
      "label smoothing 0.1：训练 PPL 变差，准确率与 BLEU 变好。"
    ],
    terms: [
      { term: "字节对编码", en: "byte-pair encoding", h: "把高频字符对不断合并成子词单元的分词法，用来控制词表大小并处理生词。" },
      { term: "词片", en: "word-piece", h: "另一种子词切分方案，把词拆成常见片段；EN-FR 实验用的是它。" },
      { term: "预热", en: "warmup", h: "训练最初若干步让学习率从很小线性升到峰值，避免早期大步长破坏随机初始化的模型。" },
      { term: "标签平滑", en: "label smoothing", h: "把 one-hot 目标改成正确类占 1−ε、其余类平摊 ε，抑制模型过度自信。" }
    ],
    notes: [
      {
        para: "S5.SS1.p1.1",
        title: "两种分词，两套数字",
        h: "英文 “about 4.5 million” 与 “36M” 差 8 倍，对应两个不同任务。BPE 与 word-piece 都是子词切分，目的是用有限词表覆盖开放词表；EN-DE 的 37000 是<b>源和目标共享</b>的词表，EN-FR 的 32000 不是。批按“近似长度”分组、约 25000 源 token + 25000 目标 token，是按 token 数而不是句子数凑批——否则一个 100 词的句子会拖着一批短句大量 padding。"
      },
      {
        para: "S5.SS2.p1.1",
        title: "12 小时是怎么算的",
        h: "0.4 秒 × 100000 步 = 40000 秒 ≈ 11.1 小时，论文取整写 12 小时；1.0 秒 × 300000 步 = 300000 秒 ≈ 3.47 天，约 3.5 天。两个时间都是 8 卡并行的墙钟时间，且包含评估、写检查点等开销。别把“12 小时”读成“单卡 12 小时”或“任意任务 12 小时”——big 模型是 3.5 天，差 7 倍。原文用的是 “about 0.4 seconds”“about 12 hours”，0.4 秒是 base 的稳态步时，不是全程平均值。"
      },
      {
        para: "S5.SS3.p3.1",
        title: "warmup 的拐点在哪",
        h: "min 的两项相等时 step = warmup_steps = 4000，这就是拐点：之前学习率随 step 线性上升，之后按 step<sup>−0.5</sup> 衰减。base 峰值 = 512<sup>−0.5</sup>×4000<sup>−0.5</sup>≈6.99×10<sup>−4</sup>；big 的 d<sub>model</sub>=1024，系数 1024<sup>−0.5</sup>=0.03125，峰值约 4.9×10<sup>−4</sup>。d<sub>model</sub> 越大峰值越小，这是公式里 d<sub>model</sub><sup>−0.5</sup> 直接规定的。为什么先升？初期参数随机、梯度方向噪声大，小步长先稳住；为什么之后按 1/√step？这是 Adam 类优化器常用的退火，让后期更新幅度逐渐减小。"
      },
      {
        para: "S5.SS4.SSS0.Px1.p1.1",
        title: "dropout 加在哪一层",
        h: "英文说得很精确：“before it is added to the sub-layer input and normalized”——先对子层（注意力或前馈）的输出做 dropout，再残差相加，再 LayerNorm，不是加在子层输入上。另外嵌入与位置编码之和也做 dropout。base 0.1；big 用 0.3，但 EN-FR 的 big 例外用 0.1（§6.1 交代）。位置不同，效果不同：它拦住的是子层往残差主干里塞的新信息。"
      },
      {
        para: "S5.SS4.SSS0.Px2.p1.1",
        title: "标签平滑的账",
        h: "原文一句 “This hurts perplexity … but improves accuracy and BLEU” 是全文最直白的取舍陈述。机制上，label smoothing 让模型不必把正确类的概率推到 1，训练 PPL 因此变差；但预测分布更平滑，泛化和 BLEU 更好。以 3.7 万词表为例，正确 token 的目标从 1 变成 0.9，剩下 0.1 平摊给 36999 个词，每个约 2.7×10<sup>−6</sup>——这个极小的非零项就足以阻止 logit 被推到无穷大。表 3 行 (D) 正好对上：ε<sub>ls</sub>=0 时 PPL 4.67（比 base 4.92 好）、BLEU 25.3（比 25.8 差）。"
      }
    ],
    quiz: [
      {
        id: "S5q1",
        type: "choice",
        q: "公式 (3) 中，warmup 阶段（step < warmup_steps）学习率如何变化？",
        options: [
          "随 step 线性上升",
          "随 step 指数上升",
          "保持常数",
          "随 step 的平方根上升"
        ],
        answer: 0,
        explain: "step 很小时 min 取第二项 step·warmup<sup>−1.5</sup>，它与 step 成正比，所以线性上升；过了 4000 步才由 step<sup>−0.5</sup> 接管并衰减。原文 “increasing the learning rate linearly for the first warmup_steps” 说的就是这一段。"
      },
      {
        id: "S5q2",
        type: "choice",
        q: "base 模型（d<sub>model</sub>=512、warmup_steps=4000）的峰值学习率约为？",
        options: [
          "7×10<sup>−4</sup>",
          "7×10<sup>−3</sup>",
          "1×10<sup>−2</sup>",
          "5×10<sup>−5</sup>"
        ],
        answer: 0,
        explain: "峰值在 step=4000：512<sup>−0.5</sup>×4000<sup>−0.5</sup>≈0.0442×0.0158≈6.99×10<sup>−4</sup>。注意还要乘 warmup 之外的 d<sub>model</sub><sup>−0.5</sup>，漏掉它就会算出 1.6×10<sup>−2</sup> 这类错误。"
      },
      {
        id: "S5q3",
        type: "choice",
        q: "根据 §5.4，label smoothing 0.1 的直接后果是？",
        options: [
          "训练 PPL 变好、BLEU 变差",
          "训练 PPL 变差、准确率与 BLEU 变好",
          "PPL 和 BLEU 都变好",
          "PPL 和 BLEU 都变差"
        ],
        answer: 1,
        explain: "原文明确说 “This hurts perplexity … but improves accuracy and BLEU score”。模型不再被逼到 0/1 的目标，所以训练困惑度变差；但分布更平滑、泛化更好，BLEU 反而升。表 3 (D) 行 ε<sub>ls</sub>=0 对 ε<sub>ls</sub>=0.1 正是这个方向。"
      },
      {
        id: "S5q4",
        type: "short",
        q: "residual dropout 具体加在什么位置？为什么这个位置比“加在子层输入上”更合理？",
        hint: "原文：before it is added to the sub-layer input and normalized。",
        reference: "它加在每个子层（多头注意力、前馈网络）的输出上，在输出被加回子层输入、再做层归一化之前。这样被 dropout 的是子层新算出来的那部分信息，残差主干本身保持干净，梯度可以沿恒等路径回传。若加在输入上，等于把已经归一化的主干也随机丢弃，残差连接的意义会被削弱。此外嵌入与位置编码之和也做 dropout，base 取 0.1。",
        rubric: [
          "指出加在子层输出、残差相加与 LayerNorm 之前",
          "说明被丢弃的是子层新信息，残差主干保持干净",
          "提到嵌入+位置编码之和也做 dropout",
          "给出 base 0.1（big 0.3）的取值"
        ]
      },
      {
        id: "S5q5",
        type: "short",
        q: "论文说 base 模型训练约 12 小时、big 模型约 3.5 天。请写出这两个数的算法，并指出它们共享的前提。",
        hint: "每一步多久、跑多少步、几张卡。",
        reference: "base：0.4 秒/步 × 100000 步 = 40000 秒 ≈ 11.1 小时，论文取整为 12 小时（含评估、写检查点等开销）。big：1.0 秒/步 × 300000 步 = 300000 秒 ≈ 3.47 天，取整 3.5 天。共享前提是都在一台机器、8 张 P100 上并行训练，且是墙钟时间，不是单卡时间；步数是参数更新次数，不是 epoch。",
        rubric: [
          "base：0.4 秒 × 10 万步，约 11 小时/取整 12 小时",
          "big：1.0 秒 × 30 万步，约 3.47 天/取整 3.5 天",
          "指出前提是 8 张 P100 并行的墙钟时间",
          "指出 step 不是 epoch"
        ]
      }
    ]
  },

  "S6": {
    key: "S6",
    cnTitle: "结果",
    kicker: "用 BLEU 和消融把话说实",
    minutes: 8,
    intro: [
      {
        t: "p",
        h: "前面所有设计，最终要在表 2 和表 3 上接受检验。表 2 回答“比前人好不好、贵不贵”，表 3 回答“每个零件有没有用”，6.3 再拿一个非翻译任务回答“是不是只会翻译”。三张表的读法不一样，混着看会得出错误结论。"
      },
      { t: "h", h: "表 2：BLEU 与成本" },
      {
        t: "p",
        h: "EN-DE 上，Transformer big 拿到 28.4，比之前最好的 ConvS2S Ensemble 26.36 高 2.04 分；base 也有 27.3，已经高过所有单模型和集成。EN-FR 上 big 是 41.8，base 38.1。成本一列更刺眼：base 只花 3.3×10<sup>18</sup> FLOPs，约为 ConvS2S 单模型 9.6×10<sup>18</sup> 的三分之一，约为 GNMT+RL Ensemble 1.8×10<sup>20</sup> 的五十五分之一；big 的 2.3×10<sup>19</sup> 仍比 ConvS2S Ensemble 的 7.7×10<sup>19</sup> 便宜三倍多，比 GNMT+RL Ensemble 便宜近八倍。"
      },
      {
        t: "table",
        caption: "表 2（重排关键行）：BLEU 与训练成本（FLOPs）。原表把 Transformer 两行的成本合并成一个单元格，这里照原样标注为“两列合并”。",
        head: ["模型", "BLEU EN-DE", "BLEU EN-FR", "成本 EN-DE", "成本 EN-FR"],
        rows: [
          ["ByteNet [18]", "23.75", "—", "—", "—"],
          ["GNMT + RL [38]", "24.6", "39.92", "2.3×10<sup>19</sup>", "1.4×10<sup>20</sup>"],
          ["ConvS2S [9]", "25.16", "40.46", "9.6×10<sup>18</sup>", "1.5×10<sup>20</sup>"],
          ["GNMT + RL Ensemble [38]", "26.30", "41.16", "1.8×10<sup>20</sup>", "1.1×10<sup>21</sup>"],
          ["ConvS2S Ensemble [9]", "26.36", "41.29", "7.7×10<sup>19</sup>", "1.2×10<sup>21</sup>"],
          ["Transformer (base)", "27.3", "38.1", "3.3×10<sup>18</sup>（两列合并）", "—"],
          ["Transformer (big)", "28.4", "41.8", "2.3×10<sup>19</sup>（两列合并）", "—"]
        ]
      },
      {
        t: "p",
        h: "表 2 有一个必须指出的数字问题：正文 6.1 写 EN-FR big 的 BLEU 是 41.0，而表 2 同一行是 41.8。两个数字在原论文里并存，属于论文自身的笔误/版本差异；引用时以表 2 的 41.8 为准。顺便验算 “less than 1/4 the training cost”：2.3×10<sup>19</sup> / 1.5×10<sup>20</sup>≈0.15，确实小于 1/4。"
      },
      {
        t: "p",
        h: "成本这一列是怎么估出来的？脚注给了算法：训练时间 × GPU 数 × 每张卡的持续单精度算力。base 的 12 小时 = 43200 秒，8 张 P100，按脚注的 9.5 TFLOPS 计：43200×8×9.5×10<sup>12</sup>≈3.28×10<sup>18</sup>，正好对上表里的 3.3×10<sup>18</sup>。这是个粗略估计（假设全程跑满峰值），但所有模型用同一套算法，横向比较仍然成立。这也是为什么后来论文更愿意报 FLOPs 而不是“训练了几天”：天数依赖硬件与实现，FLOPs 至少把硬件因素显式化了。"
      },
      { t: "h", h: "表 3：消融在验证什么" },
      {
        t: "p",
        h: "表 3 是消融（ablation）：在 base 上每次只改一个因素，在 newstest2013 <b>开发集</b>上量 PPL 和 BLEU。关键前提是 “no checkpoint averaging”，所以 base 在这里是 25.8，而表 2 里同一配置的 base 是 27.3——两张表不能横着比。PPL 按 word-piece 计算，也不能和按词计算的 PPL 比。"
      },
      {
        t: "table",
        caption: "表 3（重排关键行）：newstest2013 开发集，未做检查点平均；PPL 按 word-piece 计。base 训练 10 万步，big 30 万步。",
        head: ["组", "变化", "PPL (dev)", "BLEU (dev)", "参数量"],
        rows: [
          ["base", "—", "4.92", "25.8", "65M"],
          ["(A)", "h=1, d<sub>k</sub>=d<sub>v</sub>=512", "5.29", "24.9", "—"],
          ["(A)", "h=16, d<sub>k</sub>=d<sub>v</sub>=32", "4.91", "25.8", "—"],
          ["(A)", "h=32, d<sub>k</sub>=d<sub>v</sub>=16", "5.01", "25.4", "—"],
          ["(B)", "d<sub>k</sub>=16", "5.16", "25.1", "58M"],
          ["(B)", "d<sub>k</sub>=32", "5.01", "25.4", "60M"],
          ["(C)", "N=2", "6.11", "23.7", "36M"],
          ["(C)", "N=8", "4.88", "25.5", "80M"],
          ["(C)", "d<sub>ff</sub>=4096", "4.75", "26.2", "90M"],
          ["(D)", "P<sub>drop</sub>=0", "5.77", "24.6", "—"],
          ["(D)", "P<sub>drop</sub>=0.2", "4.95", "25.5", "—"],
          ["(D)", "ε<sub>ls</sub>=0", "4.67", "25.3", "—"],
          ["(D)", "ε<sub>ls</sub>=0.2", "5.47", "25.7", "—"],
          ["(E)", "学习式位置编码替代正弦编码", "4.92", "25.7", "—"],
          ["big", "d<sub>model</sub>=1024, h=16, P<sub>drop</sub>=0.3", "4.33", "26.4", "213M"]
        ]
      },
      {
        t: "p",
        h: "逐行读：(A) 固定总计算量改头数和维度——单头 24.9 比最好的 25.8 差 0.9，头太多也掉到 25.4，说明“多子空间”有用但不是越多越好。(B) 单独减小 d<sub>k</sub>：16 和 32 都让 BLEU 下降，作者据此猜“点积这个兼容函数可能不够用”。(C) 加深加宽都涨点，N=2 掉到 23.7，d<sub>ff</sub>=4096 到 26.2。(D) dropout 关掉，PPL 从 4.92 涨到 5.77；label smoothing 关掉，PPL 降到 4.67 但 BLEU 降到 25.3——两个正则项都在用训练 PPL 换泛化。(E) 学出来的位置编码与正弦编码几乎一样（4.92/25.7 对 4.92/25.8）。最后一行 big：4.33 / 26.4 / 213M。整张表的读法是看方向而不是看小数点后第二位：换头数、换维度、加层、加正则，每一行只回答一个“有没有用、往哪边动”的问题。"
      },
      {
        t: "p",
        h: "为什么消融不做检查点平均？表 3 要量的是“每个改动本身”的效应，平均会削掉一部分方差，让各行差距变小、结论变钝；三十多组实验每组都做平均，算力也吃不消。代价是表 3 的绝对分数比表 2 低，但组内比较更干净——这就是“控制变量”的写法。"
      },
      { t: "h", h: "6.3：换一个任务" },
      {
        t: "p",
        h: "英语成分句法分析（constituency parsing）：输出不是译文，而是一棵句法树。这个任务结构约束强、输出比输入长得多，而且 RNN 序列到序列模型在小数据上一直不占优。作者只训 4 层、d<sub>model</sub>=1024，WSJ 只有约 4 万句时 F1 91.3，已经超过 BerkeleyParser 的 90.4；半监督设置（加约 1700 万句）到 92.7，只输给 RNN Grammar 的 93.3。他们没做任务特定调参，这正是“泛化”论点的分量。"
      },
      {
        t: "p",
        h: "实验设置也值得记：WSJ-only 用 16K 词表、半监督用 32K；beam=21、长度惩罚 α=0.3，最大输出长度放宽到 input+300（因为树比句子长）；只在 WSJ 第 22 节开发集上小范围调了 dropout、学习率和 beam，其余沿用 EN-DE base 的设置。换句话说，这不是为句法分析重造的模型，而是把翻译模型原样搬过去。"
      },
      {
        t: "callout",
        tone: "warn",
        title: "三张表不要混着读",
        h: "表 2 = newstest2014 测试集 + 检查点平均 + beam 4；表 3 = newstest2013 开发集 + 不平均；表 4 = WSJ 23。数据集、解码设置、是否平均都不同，横比数字会得出“消融让模型变差”之类的假结论。"
      }
    ],
    points: [
      "EN-DE：base 27.3、big 28.4；成本 3.3×10¹⁸ / 2.3×10¹⁹ FLOPs。",
      "EN-FR：base 38.1、big 41.8；正文写 41.0，与表 2 不一致。",
      "表 2 是测试集+检查点平均；表 3 是开发集+不平均，不能横比。",
      "表 3 消融覆盖头数、d_k、层数/宽度、dropout/标签平滑、位置编码。",
      "句法分析 4 层模型 WSJ-only 91.3 F1，超过 BerkeleyParser 的 90.4。"
    ],
    terms: [
      { term: "BLEU", en: "BLEU", h: "机器翻译常用的语料级评分，比较译文与参考译文的 n-gram 重合度，0–100，越高越好。" },
      { term: "消融", en: "ablation", h: "在基线模型上每次只去掉或改动一个部件，看指标变化，用来判断该部件是否真的有用。" },
      { term: "检查点平均", en: "checkpoint averaging", h: "把训练后期若干个检查点的权重取平均，相当于免费集成，能稳定结果。" },
      { term: "成分句法分析", en: "constituency parsing", h: "把句子分析成嵌套的短语结构树（NP、VP 等），输出是树而不是序列。" },
      { term: "束搜索", en: "beam search", h: "解码时每步保留得分最高的若干条候选，而不是只贪心取一条。" }
    ],
    notes: [
      {
        para: "S6.SS1.p1.1",
        title: "2.0 BLEU 的分量",
        h: "之前 EN-DE 的最好成绩是 ConvS2S Ensemble 的 26.36，big 的 28.4 领先 2.04 分；base 的 27.3 也高于所有已发表单模型和集成。原文说 “more than 2.0 BLEU”，是保守说法，算式是 28.4−26.36=2.04；base 相对同一基线是 27.3−26.36=0.94。BLEU 是语料级 n-gram 精度指标，在 WMT 这种成熟基准上，2 分通常意味着明显可感知的质量差距，不是噪声。"
      },
      {
        para: "S6.SS1.p2.1",
        title: "41.0 还是 41.8",
        h: "这一段正文写 EN-FR big 的 BLEU 是 41.0，而同一篇论文表 2 同一行是 41.8——两个数字在原论文里并存，属于论文自身的笔误/版本差异。引用时以表 2 的 41.8 为准。顺带验算后半句“less than 1/4 the training cost”：2.3×10<sup>19</sup>/1.5×10<sup>20</sup>≈0.15，确实小于 0.25。这类笔误在会议论文里并不罕见；做注疏、写复现时以表为准，并把差异标出来，比照抄正文安全。"
      },
      {
        para: "S6.SS1.p3.1",
        title: "平均检查点与束搜索",
        h: "base 取最后 5 个检查点、big 取 20 个（base 每 10 分钟写一次）做权重平均，相当于免费集成，降低方差；这是表 2 数字偏高的原因之一。为什么有用？SGD 末期的检查点在参数空间里相邻但各自带噪声，平均相当于在局部做一次小集成，通常能换来零点几 BLEU。解码用 beam search，beam=4、长度惩罚 α=0.6，最大输出长度=input+50，能停就停。这些超参在开发集上选过，测试集没再调。"
      },
      {
        para: "S6.SS2.p1.1",
        title: "表 3 的分数为什么更低",
        h: "表 3 全部在 newstest2013 <b>开发集</b>上，而且明确 “no checkpoint averaging”；表 2 是 newstest2014 测试集、带权重平均、beam 4。所以 base 在表 3 是 25.8，在表 2 是 27.3，差 1.5 分主要来自数据集与解码设置，不是模型变差。消融统一用开发集、统一关闭平均，是为了让每一行的差异只来自被改的那个因素；PPL 还是 per-wordpiece，和 per-word PPL 不可比。"
      },
      {
        para: "S6.SS2.p2.1",
        title: "单头为什么差 0.9",
        h: "行 (A) 固定总计算量（h·d<sub>k</sub> 基本不变）：h=1、d<sub>k</sub>=512 时 BLEU 24.9，比 h=16、d<sub>k</sub>=32 的 25.8 低 0.9；头太多（h=32、d<sub>k</sub>=16）也掉到 25.4。这说明“多个子空间并行看不同位置”确实有用，但每个头的维度太小又会削弱兼容函数的表达能力，存在一个中间最优点。对照是“同样预算下怎么分配每头维度”，不是单纯“头越多越好”。"
      },
      {
        para: "S6.SS3.p1.1",
        title: "句法分析为什么难",
        h: "英文 “strong structural constraints” 指输出必须是合法的成分句法树，括号不能乱配；“significantly longer than the input” 指树里的节点比词多，解码序列更长。再加上 RNN seq2seq 在小数据上拿不到 SOTA，所以这是一个真正不同的任务。作者只用 40K 句、4 层、d<sub>model</sub>=1024 就超过 BerkeleyParser，说明结构约束没有难倒自注意力。"
      }
    ],
    quiz: [
      {
        id: "S6q1",
        type: "choice",
        q: "按表 2，Transformer (big) 在 EN-DE 上的 BLEU 与训练成本分别是？",
        options: [
          "28.4，2.3×10<sup>19</sup> FLOPs",
          "27.3，3.3×10<sup>18</sup> FLOPs",
          "28.4，3.3×10<sup>18</sup> FLOPs",
          "26.36，7.7×10<sup>19</sup> FLOPs"
        ],
        answer: 0,
        explain: "表 2：big 行 EN-DE 28.4、EN-FR 41.8，成本 2.3×10<sup>19</sup>（两列合并）。27.3/3.3×10<sup>18</sup> 是 base；26.36/7.7×10<sup>19</sup> 是 ConvS2S Ensemble。"
      },
      {
        id: "S6q2",
        type: "choice",
        q: "表 3 行 (A) 在测什么？结论是什么？",
        options: [
          "固定总计算量、改头数与每头维度；单头明显更差，头太多也变差",
          "增加层数；越深越好",
          "去掉 dropout；dropout 有害",
          "换位置编码；正弦编码更好"
        ],
        answer: 0,
        explain: "(A) 行保持 h·d<sub>k</sub> 大致不变，只改 h 与 d<sub>k</sub>：h=1 时 BLEU 24.9（差 0.9），h=16 时 25.8 最好，h=32 时 25.4。说明多头有用，但每头维度太小也有损。层数、dropout、位置编码分别是 (C)(D)(E) 行。"
      },
      {
        id: "S6q3",
        type: "choice",
        q: "表 3 行 (D) 中 ε<sub>ls</sub>=0 与 base（ε<sub>ls</sub>=0.1）相比：PPL 4.67 对 4.92，BLEU 25.3 对 25.8。这组数字说明？",
        options: [
          "label smoothing 让训练 PPL 变好",
          "label smoothing 让训练 PPL 变差，但 BLEU 变好",
          "label smoothing 对两者都无影响",
          "label smoothing 让 PPL 和 BLEU 都变好"
        ],
        answer: 1,
        explain: "关掉 label smoothing（ε<sub>ls</sub>=0）后 PPL 更低（4.67<4.92），但 BLEU 也更低（25.3<25.8）。这正是 §5.4 说的“hurts perplexity but improves BLEU”：模型更自信，训练困惑度好看，泛化反而差。"
      },
      {
        id: "S6q4",
        type: "short",
        q: "为什么不能拿表 2 的 base（27.3）和表 3 的 base（25.8）直接比较？至少说出两个设置差异。",
        hint: "数据集、是否做检查点平均、解码参数。",
        reference: "表 2 报的是 newstest2014 测试集，且用了检查点权重平均（base 取最后 5 个）和 beam search（beam=4、α=0.6）；表 3 报的是 newstest2013 开发集，明确 no checkpoint averaging。测试集与开发集难度不同，权重平均通常又能涨 1 分左右，所以 27.3 与 25.8 的差主要来自评测设置，不能当作模型质量的变化。",
        rubric: [
          "指出表 2 是测试集、表 3 是开发集",
          "指出表 2 做检查点平均、表 3 不做",
          "可补充 beam search 参数或数据年份不同",
          "结论：差异来自设置，不能横比"
        ]
      },
      {
        id: "S6q5",
        type: "short",
        q: "6.3 的句法分析实验想回答什么问题？结果用什么数字支撑？",
        hint: "不只是“再跑一个任务”，想想 RNN 在这个任务上的弱点。",
        reference: "它想验证 Transformer 能不能泛化到翻译之外的任务——尤其是输出有强结构约束、且比输入更长的任务，而 RNN seq2seq 在小数据上做不好这类任务。作者训练 4 层、d<sub>model</sub>=1024 的模型：WSJ-only 40K 句时 F1 91.3，高于 BerkeleyParser 的 90.4；半监督（约 1700 万句）到 92.7，只低于 RNN Grammar 的 93.3。且没做任务特定调参，这加强了“泛化”结论。",
        rubric: [
          "指出目的是验证跨任务泛化（非翻译任务）",
          "指出任务特点：结构约束强、输出比输入长",
          "给出 91.3 vs 90.4（WSJ-only）或 92.7（半监督）",
          "提到未做任务特定调参，或只输给 RNN Grammar 93.3"
        ]
      }
    ]
  },

  "S7": {
    key: "S7",
    cnTitle: "结论",
    kicker: "把主张收回到证据范围内",
    minutes: 4,
    intro: [
      {
        t: "p",
        h: "结论只有四段，作者把话收得很紧。第一段重述贡献：Transformer 是第一个完全基于注意力的序列转导模型，用多头自注意力替换编码器/解码器里最常见的循环层。"
      },
      {
        t: "p",
        h: "第二段把证据摆出来：两个 WMT 2014 翻译任务都刷新 SOTA，训练速度显著快于循环或卷积架构；EN-DE 上最好的模型甚至超过所有已发表的集成模型。注意措辞是分任务说的，不是“所有任务全面碾压”。"
      },
      {
        t: "p",
        h: "注意结论的写法：先说贡献，再说证据，最后说未来。每一句主张都能在正文里找到对应的表或图；反过来，正文里被写成 future work 的东西，结论里不会伪装成已解决。这种“主张跟着证据走”的结构，比结论本身更值得学。"
      },
      {
        t: "p",
        h: "“We are excited about the future” 是修辞，不是论据；真正有信息量的是紧跟其后的具体计划：其它模态、受限注意力、让生成更少串行。读结论时把形容词和名词分开，剩下的才是作者真正承诺的东西。"
      },
      {
        t: "p",
        h: "第三、四段是边界与去向：把注意力用到文本之外的模态（图像、音频、视频），研究局部/受限注意力来处理超长输入输出，让生成过程少一点串行；代码开在 tensor2tensor。换成今天的说法，这三条正好对应多模态、长上下文和并行解码——论文自己已经点出了后来十年的主线。"
      },
      {
        t: "p",
        h: "读结论时最该学的是“主张的强度”：哪些是实验直接支持的（BLEU、成本），哪些是作者的推测（可解释性、迁移到其它模态）。§7 没有新增实验，它只是把前六节能支撑的结论重新排了一遍。"
      },
      {
        t: "callout",
        tone: "note",
        title: "结论里的三个“没做”",
        h: "没证明注意力权重等于解释；没解决 n² 的长序列成本；没让解码摆脱逐 token 自回归。三条都被写成 future work，而不是已解决的问题。"
      }
    ],
    points: [
      "贡献：完全基于注意力的序列转导模型，替换循环层。",
      "证据：两个翻译任务 SOTA，训练显著更快。",
      "边界：长序列成本、自回归解码、可解释性仍是开放问题。"
    ],
    terms: [
      { term: "序列转导", en: "sequence transduction", h: "把一条输入序列转换成另一条输出序列的任务，机器翻译、句法分析都算。" },
      { term: "自回归", en: "auto-regressive", h: "生成第 t 个 token 时把前面已生成的 token 当输入，逐位往下生成。" },
      { term: "受限注意力", en: "restricted attention", h: "每个位置只和邻域内的位置做注意力，用来降低长序列的平方级成本。" }
    ],
    notes: [
      {
        para: "S7.p1.1",
        title: "“第一”的边界",
        h: "原文限定词是 “the first sequence transduction model based entirely on attention”：一是 sequence transduction（序列转导），二是 entirely（完全）。§2 已经承认自注意力本身不新，也被用于阅读理解等任务；ConvS2S 等模型也不用循环。所以作者没主张“第一个注意力模型”，也没主张“第一个不用循环的模型”，别把“第一”放大。"
      },
      {
        para: "S7.p2.1",
        title: "快在哪里，赢在哪里",
        h: "“trained significantly faster” 对应 §4 的 O(1) 串行操作和 §5 的 12 小时/3.5 天；EN-DE 上 “outperforms even all previously reported ensembles”，EN-FR 上原文只与单模型比，措辞是 “all of the previously published single models”。两个任务的说法强度不同，合起来读容易夸大成“全面碾压”。原文这两句的主语都是 the Transformer，但比较对象一个是 ensembles、一个是 single models，引用时别合并成一句，否则结论的强度就被悄悄改掉了。"
      },
      {
        para: "S7.p3.1",
        title: "作者没做的事",
        h: "未来工作三条：文本之外的模态、局部/受限注意力以处理超长输入输出、让生成更少串行。这反过来就是当前模型的边界：自注意力对 n 是平方成本，解码仍逐 token 自回归，跨模态还没有实验。十年后的多模态模型、长上下文技巧、并行解码，基本都长在这三条上。"
      }
    ],
    quiz: [
      {
        id: "S7q1",
        type: "choice",
        q: "结论中“first”的准确范围是？",
        options: [
          "第一个注意力机制",
          "第一个完全基于注意力、不用序列对齐 RNN 或卷积的序列转导模型",
          "第一个不用循环层的模型",
          "第一个机器翻译模型"
        ],
        answer: 1,
        explain: "限定词是 sequence transduction + based entirely on attention。§2 承认自注意力早已存在；ConvS2S、ByteNet 也不用循环但用了卷积；机器翻译更早就有。把范围缩小到“序列转导 + 完全注意力”才是准确主张。"
      },
      {
        id: "S7q2",
        type: "choice",
        q: "作者列出的未来方向<b>不包括</b>哪一项？",
        options: [
          "把注意力用到图像、音频、视频等文本之外的模态",
          "研究局部/受限注意力以处理超长输入输出",
          "让生成过程更少串行",
          "用循环层替换多头注意力以提升可解释性"
        ],
        answer: 3,
        explain: "原文三条 future work 是：其它模态、受限注意力、making generation less sequential。全文的立场恰恰是去掉循环层，不可能在结论里又提议换回循环。前三项都能在 §7 第三段找到。"
      },
      {
        id: "S7q3",
        type: "short",
        q: "用两句话总结论文的主张与证据，要求分别指出“主张”和“支撑它的实验”。",
        hint: "主张在 §1 与 §7，证据在 §6。",
        reference: "主张：一种完全基于注意力的序列转导架构（Transformer）可以取代循环/卷积层，并且训练更快。证据：在 WMT 2014 EN-DE 与 EN-FR 上分别达到 28.4 与 41.8 BLEU（表 2），超过此前最好结果，训练成本只有 2.3×10¹⁹ FLOPs；表 3 的消融显示多头、位置编码、dropout 等部件各自有用；6.3 的句法分析说明它能迁移到翻译之外的任务。",
        rubric: [
          "主张：完全基于注意力、可替代循环/卷积",
          "证据：两个翻译任务的 BLEU 与成本数字",
          "提到消融或句法分析作为补充证据",
          "区分主张与证据，不把推测当结论"
        ]
      },
      {
        id: "S7q4",
        type: "short",
        q: "从 §4、§5、§7 中找出作者承认或暗示的三个局限，各用一句话说明。",
        hint: "长序列、解码方式、可解释性。",
        reference: "第一，自注意力对序列长度是 n² 成本，长序列要么贵要么需要受限注意力，而后者还被列为 future work。第二，解码仍是逐 token 自回归，生成过程串行，作者把“让生成更少串行”写进未来工作。第三，可解释性只是 side benefit，附录里的注意力图是定性观察，作者没有证明权重就是原因。",
        rubric: [
          "指出 n² 复杂度/长序列成本",
          "指出解码自回归、生成串行",
          "指出可解释性只是观察/side benefit",
          "每条能对应到具体小节或原文措辞"
        ]
      }
    ]
  },

  "Sx1": {
    key: "Sx1",
    cnTitle: "附录：注意力可视化",
    kicker: "注意力图上能读出什么",
    minutes: 5,
    intro: [
      {
        t: "p",
        h: "附录这三张图是论文里唯一“看得见注意力”的地方：它们把某一层、某些头对每个词的权重画成连线。图都取自编码器自注意力第 5 层（共 6 层）。上下两行是同一句话的两个副本——线从上面的查询词连到下面被看的词，颜色区分不同的头，线越深/越粗表示权重越大。"
      },
      {
        t: "figure",
        src: "assets/img/paper/making_more_difficult5_new.svg",
        alt: "图 3：从 making 出发的注意力连线，多条深色线连到远处的 more 与 difficult",
        caption: "图 3：第 5 层里 ‘making’ 的注意力。不同颜色代表不同的头，深色线把它连到 ‘more’、‘difficult’，补全 “making…more difficult”。",
        width: "wide"
      },
      {
        t: "p",
        h: "图 3 只看一个词 ‘making’：几条深色线把它连到远处的 ‘more’ 和 ‘difficult’，补全了 “making…more difficult” 这个被隔开的结构。这是长距离依赖的直观例子——两个词在句面上隔了十来个词，第 5 层的注意力一步就够到了。"
      },
      {
        t: "figure",
        src: "assets/img/paper/anaphora_resolution_new.svg",
        alt: "图 4 上：第 5 层头 5 的完整注意力，粗线从 its 指向 Law",
        caption: "图 4（上）：头 5 的完整注意力。粗线从 ‘its’ 指向 ‘Law’，这是指代消解。",
        width: "wide"
      },
      {
        t: "figure",
        src: "assets/img/paper/anaphora_resolution2_new.svg",
        alt: "图 4 下：只抽 its 一个词时，头 5 与头 6 的注意力都很集中",
        caption: "图 4（下）：只抽 ‘its’ 这个词，头 5 与头 6 的注意力都高度集中（caption 称 “very sharp”）。",
        width: "wide"
      },
      {
        t: "p",
        h: "图 4 是另一个经典现象：指代消解。句子里的 ‘its’ 需要找到先行词 ‘Law’，图里从 ‘its’ 出发的那条粗线几乎全部压在 ‘Law’ 上。caption 用 “very sharp” 形容这种分布——权重高度集中，不是平摊。"
      },
      {
        t: "figure",
        src: "assets/img/paper/attending_to_head_new.svg",
        alt: "图 5 左：一个头让 missing 回看 are、are 回看 we",
        caption: "图 5（左）：同一层里一个头的注意力，’missing’ 回看 ‘are’，’are’ 回看 ‘we’。",
        width: "wide"
      },
      {
        t: "figure",
        src: "assets/img/paper/attending_to_head2_new.svg",
        alt: "图 5 右：另一个头让 application 同时看 The 与 Law",
        caption: "图 5（右）：同一层的另一个头，’application’ 同时看 ‘The’ 与 ‘Law’，分工不同。",
        width: "wide"
      },
      {
        t: "p",
        h: "图 5 想说明“头之间有分工”：同一层里，一个头让 ‘missing’ 回看 ‘are’、‘are’ 回看 ‘we’，像在沿动词短语往回找；另一个头让 ‘application’ 同时看 ‘The’ 和 ‘Law’。作者的原话是 “seems related” 和 “clearly learned to perform different tasks”——是观察，不是机制证明。"
      },
      {
        t: "p",
        h: "所以这些图能说明：在第 5 层、在给定的头上，某个词的注意力确实会集中在某些位置，而且这些位置常常和句法、指代结构对得上。它们不能说明：这个权重就是这个词的“重要性”，这个头就是负责这个语法现象的“那个头”，或者模型整体是这样工作的。图是挑出来的例子，不是统计证据；换一层、换一个头、换一句话，图可能完全不同。读图时把“我看到”和“它证明”分开。"
      },
      {
        t: "callout",
        tone: "warn",
        title: "别把注意力图当解释",
        h: "注意力权重是 softmax 后的归一化分布，此消彼长；一个词权重低不代表它没用，权重高也不代表因果重要。要谈“重要性”得做消融、看梯度或替换实验。附录图能回答“第 5 层这个头在看哪”，不能回答“模型为什么翻译对”。"
      }
    ],
    points: [
      "图里上下两行是同一句话，线从查询词指向被看的词。",
      "颜色代表不同的头，线越深/越粗代表权重越大。",
      "图 3 看长距离依赖，图 4 看指代，图 5 看头之间的分工。",
      "这些是定性例子，不能证明注意力权重等于因果重要性。"
    ],
    terms: [
      { term: "注意力图", en: "attention map", h: "把注意力权重画成连线或热力图的可视化，一行（或一列）通常对应一个查询位置。" },
      { term: "指代消解", en: "anaphora resolution", h: "确定代词（如 its）指向句中哪个名词（先行词）的任务。" },
      { term: "尖锐", en: "sharp", h: "注意力分布高度集中在少数位置，而不是均匀铺开。" }
    ],
    notes: [
      {
        para: "Sx1.F3",
        title: "一行一列都是同一句话",
        h: "图 3 上下两行是同一句话的两个副本，线从 query 词（上）连到被看的词（下）；颜色区分不同的头，线越深/越粗权重越大。图上只画了 ‘making’ 这一个词的注意力：深色两三条连到 ‘more’、‘difficult’，补全 “making…more difficult”。没有画线的词不代表没有注意力，只是这张图没展示而已。"
      },
      {
        para: "Sx1.F4",
        title: "sharp 是什么意思",
        h: "caption 说 ‘its’ 的注意力 “very sharp”：权重几乎全压在一个位置上，而不是平摊。上图是整个头 5 的完整注意力，粗线从 ‘its’ 指向 ‘Law’；下图只抽 ‘its’ 这个词，头 5 与头 6 的线也很集中。这是“代词找先行词”的直观例子，但它只是第 5 层、某几个头的现象，不能推广成“模型里有一个专门做指代的模块”。"
      },
      {
        para: "Sx1.F5",
        title: "一个头一种活",
        h: "两个头都取自第 5 层：一个头里 ‘missing’ 的注意力落回 ‘are’、‘are’ 落回 ‘we’，像在沿动词短语往回看；另一个头里 ‘application’ 同时看 ‘The’ 和 ‘Law’。作者用 “seems related”“clearly learned to perform different tasks” 描述，属于观察。头之间有分工是合理的解释，但这不是机制证明，也没排除其它头在做同样的事。"
      }
    ],
    quiz: [
      {
        id: "Sx1q1",
        type: "choice",
        q: "附录注意力图里，线的深浅/粗细代表什么？",
        options: [
          "注意力权重大小",
          "两个词在句子中的距离",
          "词频高低",
          "该头训练了多久"
        ],
        answer: 0,
        explain: "图把某一层、某个头的注意力权重画成连线，权重越大线越深/越粗。它不编码距离、词频或训练时间；词在句中的位置由左右顺序表示。"
      },
      {
        id: "Sx1q2",
        type: "choice",
        q: "关于附录这三张图，下面哪种说法是准确的？",
        options: [
          "它们证明注意力权重等于因果重要性",
          "它们只展示第 5 层、个别头与个别词的例子，是定性观察",
          "它们展示了所有层所有头的完整注意力",
          "它们证明模型从不看错位置"
        ],
        answer: 1,
        explain: "图全部取自编码器第 5 层（共 6 层），且往往只抽一个词或几个头，是挑出来的定性例子。它们能展示权重分布，不能证明因果重要性，也不是全层全头的统计。"
      },
      {
        id: "Sx1q3",
        type: "choice",
        q: "图 3 中不同颜色代表什么？",
        options: [
          "不同的注意力头",
          "不同的层",
          "不同的句子",
          "不同的语言"
        ],
        answer: 0,
        explain: "图 3 的 caption 明说 “Different colors represent different heads”。同一层里多个头对 ‘making’ 的注意力用不同颜色叠加在一张图上，所以你能看到有的头看 ‘more’、‘difficult’，有的看别处。"
      },
      {
        id: "Sx1q4",
        type: "short",
        q: "看注意力图能说明什么、不能说明什么？各写两点。",
        hint: "能：某层某头某词的权重分布；不能：因果、整体机制、泛化。",
        reference: "能说明：在第 5 层某个头上，某个词的注意力集中在哪些位置；这些位置有时和长距离依赖、指代、句法结构对得上；不同头在同一层可以有不同的关注模式。不能说明：注意力权重等于因果重要性（softmax 归一化，此消彼长）；这个头就是负责某语法现象的模块；模型整体如何工作；也不能从挑出来的图推广到所有层、所有句子。",
        rubric: [
          "能：具体到某层某头的权重分布",
          "能：可观察到长距离依赖/指代/句法模式",
          "不能：权重≠因果重要性",
          "不能：不能推广到全局或其他层/头"
        ]
      },
      {
        id: "Sx1q5",
        type: "short",
        q: "为什么“某个词的注意力权重高”不等于“这个词对输出重要”？",
        hint: "softmax 的归一化、层与头的局限、需要什么额外证据。",
        reference: "注意力权重是 softmax 后的分布，同一行权重和为 1，此消彼长，高低只表示相对竞争，不表示贡献大小。权重高只说明当前层、当前头在这个位置取了较多信息；信息可能冗余、可能被后续层改写，也可能这个词对最终输出影响很小。要判断重要性，需要消融、梯度或替换实验等额外证据——这也是 §4 把可解释性称为 side benefit 的原因。",
        rubric: [
          "指出 softmax 归一化、权重此消彼长",
          "指出只反映当前层/当前头",
          "指出需要消融/梯度/替换等额外证据",
          "能联系 §4 的 side benefit 或附录的定性性质"
        ]
      }
    ]
  }
};
