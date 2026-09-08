// Editorial adaptations of this article; scenarios are not forecasts or user profiles.
export const learningFormats = {
  overview: {
    title: "从一家公司的提效，到每个人的处境",
    note: "阅读地图：按论证层次分组，不是事件必然发生的顺序。",
    groups: [
      {
        title: "变化从哪里开始",
        description: "技术进入商业与工作",
        chapters: ["paradox", "business", "work"],
      },
      {
        title: "压力怎样传出去",
        description: "收入、消费与信贷相互影响",
        chapters: ["income", "credit", "loop"],
      },
      {
        title: "个人怎么理解与行动",
        description: "能力、责任与判断边界",
        chapters: ["workflow", "value", "window", "action"],
      },
    ],
    loopChapter: "loop",
  },
  scenarios: [
    {
      id: "distribution",
      chapter: "income",
      title: "同样提效，家庭一定更难过吗？",
      setup:
        "假设两家公司都因 AI 降低了成本。先只改变收益去向，看看文章中的箭头还会不会一样。",
      options: [
        {
          id: "concentrated",
          label: "收益主要留在企业",
          path: ["企业成本下降", "劳动收入没有同步改善", "家庭购买力可能承压"],
          explanation:
            "这更接近作者讨论的压力路径。但还需要观察岗位、价格和其他收入，不能只凭企业利润就判断家庭处境。",
        },
        {
          id: "shared",
          label: "部分收益进入工资或降价",
          path: [
            "企业成本下降",
            "工资改善或商品变便宜",
            "收入损失可能得到部分补偿",
          ],
          explanation:
            "中间的分配环节变了，后面的结果就未必相同。是否足以抵消冲击，仍取决于覆盖范围和实际幅度。",
        },
      ],
      takeaway: "提效是起点，分配机制才连接到人的生活。",
    },
    {
      id: "adoption",
      chapter: "business",
      title: "能复制功能，就能替换软件吗？",
      setup: "假设你负责采购。一款 AI 做出的工具，已经能演示原软件的核心功能。",
      options: [
        {
          id: "demo",
          label: "只有功能演示",
          path: [
            "核心功能可复制",
            "运维、权限与责任还没解决",
            "不能据此认定可以直接替换",
          ],
          explanation:
            "作者的订阅压力链依赖真实的替代能力。演示成功和长期可靠运行，不是同一个标准。",
        },
        {
          id: "ready",
          label: "迁移和可靠性也已验证",
          path: [
            "核心功能可复制",
            "迁移与风险成本可接受",
            "客户可能有更强议价能力",
          ],
          explanation:
            "这时客户拥有更可信的替代选项，原文的议价机制才更可能发生；仍不等于所有供应商都会倒下。",
        },
      ],
      takeaway: "补齐每个箭头的条件，才能判断它能走多远。",
    },
    {
      id: "measurement",
      chapter: "workflow",
      title: "生成得快，就代表工作更高效吗？",
      setup:
        "假设你在尝试用 AI 做周报。下面两种记录方法，哪一种更能支持保留这个流程的决定？",
      options: [
        {
          id: "draft",
          label: "只看初稿生成速度",
          path: [
            "初稿更快出来",
            "核查与返工尚未计入",
            "还不能判断整个任务提速",
          ],
          explanation:
            "一次生成变快，可能被后续查错抵消。这是教学假设，不是对你实际效率的测量。",
        },
        {
          id: "delivery",
          label: "同一标准下看完整交付",
          path: [
            "包括输入、生成和复查",
            "比较质量、耗时、返工与费用",
            "再决定保留哪些步骤",
          ],
          explanation:
            "这把作者的“用得好”变成可以检验的实践。即使不接受五年预测，也可以做这个小实验。",
        },
      ],
      takeaway: "测量完整任务，不把生成速度当作整体收益。",
    },
  ],
  cardQuestions: {
    paradox: "公司赚得更多，为什么员工还可能更不安？",
    business: "AI 压低软件成本，怎样传到订阅收入？",
    income: "产出增长和购买力增长，中间隔着什么？",
    work: "任务受 AI 影响，等于整个职业消失吗？",
    workflow: "“用得好”比“会用”多了哪一步？",
    credit: "收入变化，为什么会影响原本正常的贷款？",
    value: "能用 AI，为什么不等于拥有它创造的全部收益？",
    loop: "企业都在理性降本，整体结果就一定好吗？",
    window: "一个背景事实真实，就能证明五年预测吗？",
    action: "如果不接受宏观预测，还能从文章带走什么？",
  },
};
