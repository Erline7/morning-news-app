import OpenAI from 'openai';
import { ArticleContent, ArticleIntelligence, RawHeadline } from './types.js';
import { cleanArticle } from './textCleaner.js';

/**
 * 创建 OpenAI 兼容客户端（单例复用）
 */
let _client: OpenAI | null = null;
function getClient(apiKey: string): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey,
      baseURL: "https://api.longcat.chat/openai/v1",
      maxRetries: 0,
    });
  }
  return _client;
}

/**
 * 超时包装器
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * JSON 解析容错
 */
export function parseAiJson(rawText: string): any {
  if (!rawText) return {}

  // 1. 剥除 Markdown 代码块
  let text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim()

  // 2. 尝试直接解析
  try { return JSON.parse(text) } catch {}

  // 3. 尝试提取最外层 { ... }（用括号匹配，不用贪婪正则）
  const firstBrace = text.indexOf('{')
  if (firstBrace === -1) {
    console.warn('⚠️ 无法解析 AI 返回的 JSON，未找到 {')
    return {}
  }

  // 从 firstBrace 开始，找到匹配的闭合 }
  let depth = 0
  let endPos = -1
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === '{') depth++
    if (text[i] === '}') depth--
    if (depth === 0) {
      endPos = i
      break
    }
  }

  if (endPos === -1) {
    console.warn('⚠️ 无法解析 AI 返回的 JSON，未找到匹配的 }')
    console.warn('原始内容（前 500 字）：')
    console.warn(text.slice(0, 500))
    return {}
  }

  const candidate = text.slice(firstBrace, endPos + 1).replace(/,\s*([}\]])/g, '$1')

  try {
    return JSON.parse(candidate)
  } catch (e: any) {
    console.warn('⚠️ 无法解析 AI 返回的 JSON，原始内容（前 300 字）：')
    console.warn(candidate.slice(0, 300))
    return {}
  }
}

/**
 * 根据文章长度动态决定摘要长度
 */
function getSummaryLengthGuide(contentLength: number): string {
  if (contentLength < 1000) return '80~150字';
  if (contentLength < 3000) return '150~300字';
  return '300~500字';
}

/**
 * 分析上下文
 */
export interface AnalysisContext {
  categories: string[];
  recentArticleTitles: string[];
}

/**
 * 分析单篇文章
 */
export async function analyzeArticle(
  content: ArticleContent,
  apiKey: string,
  ctx?: AnalysisContext
): Promise<ArticleIntelligence> {
  const client = getClient(apiKey);

  const safeContent = cleanArticle(content.content);
  console.log(`[AI] 正在分析: ${content.title?.slice(0, 30)}... | 清洗后 ${safeContent.length} 字`);

  // 太长文章截断（LongCat 有输入限制）
  const MAX_CONTENT_LENGTH = 8000
  const truncatedContent = safeContent.length > MAX_CONTENT_LENGTH
    ? safeContent.slice(0, MAX_CONTENT_LENGTH) + '\n\n（以下内容已截断）'
    : safeContent;

  const categoryPool = ctx?.categories ?? [
    '人工智能', '宏观经济', '互联网科技', '传统金融', '加密货币', '政策法规', '创业投资', '开源项目'
  ];
  const categoryGuide = `请先评估是否能归入以下既定分类：[${categoryPool.join(', ')}]。
若完全不匹配，允许你根据核心领域自行创建一个简短的、政治中立的、字数在 2-6 字之间的专业新分类（例如 '生物医药', '新能源', '半导体'），切记不要创建意义重合的分类。**分类名必须是中文，不要用英文。**`;

  const recentTitles = ctx?.recentArticleTitles ?? [];
  const relatedGuide = recentTitles.length > 0
    ? `近期文章标题参考（用于判断是否与历史文章有关联）：\n[${recentTitles.join(', ')}]\n请判断本文与以上哪些文章存在事件/主题/实体的延续或关联。`
    : '';

  const summaryLength = getSummaryLengthGuide(safeContent.length);

  const finalPrompt = `分析以下文章，提取关键信息。只输出 JSON，不要包含任何其他文字，不要用 Markdown 代码块包裹。

标题：${content.title}
来源：${content.source}
内容：${truncatedContent}

${relatedGuide}

严格输出以下 JSON 格式（字段类型必须一致，所有字段必须输出）：
{
  "title": "文章标题（如果是英文标题，必须翻译成中文；如果是中文标题，保持原样）",
  "summary": "文章核心总结（${summaryLength}，覆盖背景、关键事件、结论）",
  "category": "文章最核心的主分类。${categoryGuide}",
  "importance": 重要性评分 1-10（只输出数字）,
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "entities": ["公司/人物/产品"],
  "timeline": ["时间节点"],
  "relatedTopics": ["相关主题1", "相关主题2"],
  "questions": ["问题1", "问题2"],
  "personalThinkingPrompt": "一句话思考提示"
}
若某字段无信息，返回空数组或空字符串。确保 JSON 完整闭合。`;

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model: 'LongCat-2.0',
        messages: [{ role: 'user', content: finalPrompt }],
        max_tokens: 5000,
      }),
      120000
    );

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const parsed = parseAiJson(rawText);

    const importanceRaw = parsed.importance;
    let importance = 3;
    if (typeof importanceRaw === 'number') {
      importance = Math.max(1, Math.min(10, Math.round(importanceRaw)));
    } else if (typeof importanceRaw === 'string') {
      const n = parseInt(importanceRaw, 10);
      if (!isNaN(n)) importance = Math.max(1, Math.min(10, n));
    }

    return {
      title: parsed.title || content.title,
      url: content.url,
      source: content.source,
      collectedAt: content.collectedAt || new Date().toISOString(),
      summary: parsed.summary ?? '',
      category: parsed.category ?? '未分类',
      importance,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 5) : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 3) : [],
      personalThinkingPrompt: parsed.personalThinkingPrompt ?? '',
    };
  } catch (error: any) {
    console.error(`[AI] 分析失败: ${content.title?.slice(0, 30)}... | ${error.message}`);
    throw new Error(`AI 分析失败: ${error.message}`);
  }
}

/**
 * 生成日刊简报
 */
export async function generateDailyBriefing(
  articles: ArticleIntelligence[],
  apiKey: string
): Promise<string> {
  const client = getClient(apiKey);

  // 按重要性评分排序，取前 10 篇
  const topArticles = [...articles]
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10);

  const prompt = `请根据以下财经情报，生成一份中文市场日刊简报，跳过争议性政治话题，全文约 8-10 分钟阅读时间。结构：
# 今日市场全景
# 今日重点事件
# 关键实体与数据
# 深度思考与机会

文章情报：
${topArticles.map(a => `- 标题：${a.title} [分类：${a.category}]
  概要：${a.summary}
  涉及实体：${a.entities.join(', ')}
`).join('\n')}`;
  console.log(`[AI] 正在撰写市场日刊简报（${topArticles.length} 篇，按重要性排序）...`);
  const response = await withTimeout(
    client.chat.completions.create({
      model: 'LongCat-2.0',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000,
    }),
    180000
  );
  return response.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * 将简报改写为播客脚本
 */
export async function generatePodcastScript(
  briefing: string,
  apiKey: string
): Promise<string> {
  const client = getClient(apiKey);

  const prompt = `你是一个专业的中文个人电台主播。请将以下日刊简报，改写成一份专业的播客文稿，包含科技，经济等内容。

  【极其核心的排版与格式要求（关系到 AI 朗读成败）】：
  这段文稿会直接提交给 TTS（文字转语音）引擎进行朗读。任何非口语的内容都会被引擎滑稽地读出来，因此：
  1. 绝对不要包含任何舞台指导、语气指示、音效提示或时间戳。
  2. 绝对不要包含任何角色标识、章节名称、标题或者排版序号。
  3. 绝对不要使用任何 Emoji 表情符号。
  4. 绝对不要使用 Markdown 的任何符号。
  5. 把所有大纲段落完全打散，重新融合成由"你"亲口说出来的一段连贯、温馨、带有人情味的对话。
  内容要求：
  - 按文章类型灵活组织，不套模板。
  - 技术发布/产品更新：亮点、关键特性、实际影响。
  - 深度分析/观点：核心观点、论证逻辑、延伸思考。
  - 事件/新闻：事件概述、背景脉络、行业影响。
  - 教程/实践：问题背景、解决方案、应用场景。
  - 研究/学术：研究发现、方法简介、意义与局限。
  - 开源项目：项目定位、核心能力、使用场景。

  简报内容如下：\n\n${briefing}`;

  console.log('[AI] 正在将简报改写为播客文案...');
  const response = await withTimeout(
    client.chat.completions.create({
      model: 'LongCat-2.0',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10000,
    }),
    180000  // 180 秒超时
  );
  return response.choices?.[0]?.message?.content?.trim() ?? '';
}

/**
 * 生成每日复盘报告（后端调用，重任务）
 */
export async function generateDailyReportAi(
  questions: string[],
  notes: any[],
  date: string,
  apiKey: string
): Promise<any> {
  const client = getClient(apiKey);

  const prompt = `你是一个专业的个人成长教练。请根据以下用户今日与 AI 的提问记录和笔记，生成一份简洁的每日复盘报告。只输出 JSON，不要包含任何其他文字。

日期：${date}

用户今日提问：
${questions.length > 0 ? questions.map((q, i) => `${i + 1}. ${q}`).join('\n') : '（今日无提问）'}

用户今日笔记：
${notes.length > 0 ? notes.map((n, i) => `${i + 1}. 标题：${n.title || '无标题'} | 内容：${n.content?.slice(0, 100) || '无内容'}`).join('\n') : '（今日无笔记）'}

严格输出以下 JSON 格式：
{
  "date": "${date}",
  "summary": "一句话总结今天的核心关注点",
  "thinkingAxis": ["思考轴节点1", "思考轴节点节点2", "思考轴节点3"],
  "coreThemes": ["核心主题1", "核心主题2"],
  "questionCount": ${questions.length},
  "noteCount": ${notes.length},
  "insight": "给用户的今日洞察（2-3 句话，引导深度反思）",
  "tomorrowSuggestion": "给明天的建议（一句话）"
}`;

  console.log('[AI] 正在生成每日复盘报告...');
  const response = await withTimeout(
    client.chat.completions.create({
      model: 'LongCat-2.0',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
    60000
  );

  const rawText = response.choices?.[0]?.message?.content ?? '';
  return parseAiJson(rawText);
}

// 占位函数
export async function rankHeadlines(headlines: RawHeadline[]) {
  return headlines;
}
export async function clusterEvents(articles: ArticleIntelligence[]) {
  return [];
}
