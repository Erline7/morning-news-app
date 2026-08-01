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

// ====================== 记忆系统 ======================

// 事件类型
export type EventType = 'article_read' | 'note_created' | 'note_edited' | 'question_asked' | 'article_starred' | 'category_edited'

// 事件流中的单条事件
export interface MemoryEvent {
  id: string // 事件唯一ID，格式: evt_YYYYMMDD_HHMMSS_random
  timestamp: string // ISO 时间戳
  type: EventType // 事件类型
  title: string // 事件标题（文章标题/笔记标题/问题摘要）
  content?: string // 事件内容（笔记内容/AI回答摘要）
  refs: {
    articles?: string[] // 关联的文章ID
    threads?: string[] // 关联的脉络ID
    notes?: string[] // 关联的笔记ID
  }
  tags: string[] // 自动或手动打的标签
}

// 思考脉络
export interface ThinkingThread {
  id: string // 脉络ID，格式: thread_xxx
  theme: string // 脉络主题（如"芯片供应链"）
  createdAt: string // 创建时间
  lastActiveAt: string // 最后活跃时间
  eventIds: string[] // 关联的事件ID列表
  summary: string // AI生成的脉络摘要（如"从禁令→企业影响→国产替代"）
  status: 'active' | 'decaying' | 'dormant' // 活跃/衰减中/休眠
  decay: number // 衰减系数 0-1，1=刚活跃，0=即将归档
  suggestedNext?: string // 建议下一步关注方向
}

// 每日时间线分析
export interface DailyTimelineAnalysis {
  date: string
  events: MemoryEvent[]
  narrative: string // AI生成的今日叙事（如"你今天围绕芯片话题..."）
  followUpQuestions: string[] // 复盘问题（2-3个）
  activeThreadIds: string[] // 今日活跃的脉络ID
}

// 脉络存储结构（R2）
export interface ThreadsStore {
  threads: ThinkingThread[]
  updatedAt: string
}