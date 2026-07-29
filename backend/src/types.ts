// 原始输入层：从各个爬虫/邮件源抓取到的最原始的头条信息
export interface RawHeadline {
  title: string // 文章标题
  url: string // 文章链接
  source: string // 文章来源
  collectedAt: string // 文章收集时间
  isEmail?: boolean  // 是否为邮件源
  isUserAdded?: boolean  // 是否为用户自定义添加
  preFetchedContent?: string  // 可选的预抓取内容，如果已经抓取过文章内容，可以直接传入，避免重复抓取
}
// 排序层：对头条进行打分排序后的状态
// export interface RankedHeadline extends RawHeadline {
//   rankScore: number
// }
// 正文层：通过 ContentEngine 抓取并清洗完 HTML 后的完整正文数据
export interface ArticleContent {
  title: string // 文章标题
  url: string // 文章链接
  source: string // 文章来源
  collectedAt: string // 文章收集时间
  content: string // 文章正文内容
}
// 结构化情报层：大模型分析出的多维结构化 JSON 数据
export interface ArticleIntelligence {
  title: string // 文章标题
  url: string // 文章链接
  source: string // 文章来源
  collectedAt: string // 💡 核心修复：补上缺失的时间戳属性
  summary: string // 文章概要
  category: string // 文章分类
  // subCategory: string // 文章子分类
  importance: number // 重要性评分
  // sentiment: string
  keywords: string[] // 核心关键词
  entities: string[] // 涉及实体
  timeline: string[] // 时间线
  relatedTopics: string[] // 相关话题
  questions: string[] // 相关问题
  personalThinkingPrompt: string // 个人思考提示
  isStarred?: boolean       // 是否被标星/收藏，默认 false
  unstarredAt?: string     // 记录取消收藏的时间戳（ISO字符串），默认为空
  isUserAdded?: boolean     // 是否为用户自定义添加
}
// 聚类层：对多篇文章进行事件聚合后的状态
export interface EventCluster {
  event: string // 事件描述
  importance: number // 事件重要性
  relatedArticles: ArticleIntelligence[] // 相关文章
}
// 最终发布层：每日生成的 Markdown 简报、音频链接以及时间戳
export interface DailyBriefing {
  date: string // 简报日期
  briefing: string // 简报 Markdown 文本
  audioUrl: string  // 简报音频链接
  generatedAt: string // 简报生成时间
}