import OpenAI from 'openai';
import { ArticleContent, ArticleIntelligence, RawHeadline } from './types.js';
import { cleanArticle } from './textCleaner.js';
import { parseAiJson, withTimeout } from './utils.js';

// ====================== AI 客户端配置 ======================
// 通过环境变量切换模型，默认 DeepSeek
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.deepseek.com/v1";
const AI_MODEL = process.env.AI_MODEL || "deepseek-v4-flash";

const _clients = new Map<string, { client: OpenAI; model: string }>();
export function getClient(apiKey: string): { client: OpenAI; model: string } {
  if (!_clients.has(apiKey)) {
    _clients.set(apiKey, {
      client: new OpenAI({
        apiKey,
        baseURL: AI_BASE_URL,
        maxRetries: 0,
      }),
      model: AI_MODEL,
    });
  }
  return _clients.get(apiKey)!;
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
): Promise<ArticleIntelligence | ArticleIntelligence[]> {
  const { client, model } = getClient(apiKey);

  const safeContent = cleanArticle(content.content);
  console.log(`[AI] 正在分析: ${content.title?.slice(0, 30)}... | 清洗后 ${safeContent.length} 字 | 模型: ${model}`);

  // 太长文章截断（模型有输入限制）
  const MAX_CONTENT_LENGTH = 8000;
  const truncatedContent = safeContent.length > MAX_CONTENT_LENGTH
    ? safeContent.slice(0, MAX_CONTENT_LENGTH) + '\n\n（以下内容已截断）'
    : safeContent;

  const categoryPool = ctx?.categories ?? [
    '人工智能', '宏观经济', '互联网科技', '传统金融', '加密货币', '政策法规', '创业投资', '开源项目'
  ];
  const categoryGuide = `请先评估是否能归入以下既定分类：[${categoryPool.join(', ')}]。
若完全不匹配，允许你根据核心领域自行创建一个简短的、政治中立的、字数在 2-6 字之间的专业新分类（例如 '生物医药', '新能源', '半导体'），切记不要创建意义重合的分类。**分类名必须是中文，不要用英文。**`;

  // 特殊处理：Aivalley Newsletter 需要按区域拆分
  const isAivalleyNewsletter = content.source === 'Aivalley' && content.title === 'Aivalley Newsletter';
  const newsletterGuide = isAivalleyNewsletter
    ? `\n\n**重要：这是 Aivalley Newsletter，已按 3 个区域切分。请按以下规则输出 JSON 数组：**\n\n1. ## THROUGH THE VALLEY（深度分析）\n   - 按 "1/" "2/" "3/" 等编号拆分成独立文章\n   - 每篇输出一个对象：title: "Through the Valley: [主题]", summary: 核心内容总结, importance: 6-9\n\n2. ## TRENDING TOOLS（热门工具）\n   - 每个工具一个对象\n   - title: 工具名（加 🔧 前缀）, summary: "一句话描述", category: "AI工具", importance: 5\n\n3. ## WHAT I'M CONSUMING（我在消费）\n   - 每个链接一个对象\n   - title: 链接标题, summary: 基于标题推测内容并总结（100-200字）, category: "推荐", importance: 4\n\n输出格式（JSON 数组）：\n[\n  {"title": "Through the Valley: xxx", "summary": "...", "category": "AI", "importance": 8, "keywords": [...], "entities": [...], "timeline": [], "relatedTopics": [], "questions": [], "personalThinkingPrompt": ""},\n  {"title": "🔧 Fish Audio", "summary": "语音克隆工具...", "category": "AI工具", "importance": 5, "keywords": [], "entities": [], "timeline": [], "relatedTopics": [], "questions": [], "personalThinkingPrompt": ""},\n  ...\n]`
    : '';

  const recentTitles = ctx?.recentArticleTitles ?? [];
  const relatedGuide = recentTitles.length > 0
    ? `近期文章标题参考（用于判断是否与历史文章有关联）：\n[${recentTitles.join(', ')}]\n请判断本文与以上哪些文章存在事件/主题/实体的延续或关联。`
    : '';

  const summaryLength = getSummaryLengthGuide(safeContent.length);

  const finalPrompt = `分析以下文章，提取关键信息。只输出 JSON，不要包含任何其他文字，不要用 Markdown 代码块包裹。

标题：${content.title}
来源：${content.source}
内容：${truncatedContent}

${relatedGuide}${newsletterGuide}

${isAivalleyNewsletter ? '输出 JSON 数组' : '严格输出以下 JSON 格式'}（字段类型必须一致，所有字段必须输出）：
{
  "title": "文章标题（如果是英文标题，必须翻译成中文；如果是中文标题，保持原样）",
  "summary": "文章核心总结（${summaryLength}，用简洁客观的语言直接说明论文/文章做了什么、发现了什么、有什么意义。不要使用'本文''该研究''为...提供''探讨了''分析了'等套话，直接陈述内容。）",
  "category": "文章最核心的主分类。${categoryGuide}",
  "importance": 重要性评分 1-10（只输出数字）,
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "entities": ["公司/人物/产品"],
  "timeline": ["时间节点"],
  "relatedTopics": ["相关主题1", "相关主题2"],
  "questions": ["问题1", "问题2"],
  "personalThinkingPrompt": "一句话思考提示"
}
若某字段无信息，返回空数组或空字符串。确保 JSON 完整闭合。**summary 中不要包含其他文章链接，只做内容总结。**`;

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: finalPrompt }],
        max_tokens: isAivalleyNewsletter ? 8000 : 5000, // Newsletter 需要更多 token
      }),
      180000
    );

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const parsed = parseAiJson(rawText);

    // Newsletter 返回的是数组，需要特殊处理
    if (isAivalleyNewsletter && Array.isArray(parsed)) {
      console.log(`[AI] Newsletter 拆分为 ${parsed.length} 篇子文章`);
      return parsed.map((item: any, idx: number) => ({
        title: item.title || 'Aivalley 文章',
        url: `${content.url}#aivalley-${idx + 1}`, // 用锚点区分子文章，确保唯一
        source: 'Aivalley',
        collectedAt: content.collectedAt,
        summary: item.summary ?? '',
        category: item.category ?? 'AI/科技',
        importance: Math.max(1, Math.min(10, Number(item.importance) || 6)),
        keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 5) : [],
        entities: Array.isArray(item.entities) ? item.entities.slice(0, 5) : [],
        timeline: Array.isArray(item.timeline) ? item.timeline : [],
        relatedTopics: Array.isArray(item.relatedTopics) ? item.relatedTopics : [],
        questions: Array.isArray(item.questions) ? item.questions.slice(0, 3) : [],
        personalThinkingPrompt: item.personalThinkingPrompt ?? '',
        content: `${item.summary}\n\n---\n原文链接：${content.url}`, // 详情页显示摘要 + Newsletter 链接
      }));
    }

    // 普通文章返回单个对象
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
      content: content.content ? content.content.slice(0, 5000) : '',
      isEmail: content.isEmail || false,
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
  const { client, model } = getClient(apiKey);

  // 按重要性评分排序，取前 10 篇
  const topArticles = [...articles]
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, 10);

  const prompt = `你是一位资深财经科技分析师。请根据以下情报，生成一份中文日刊简报。

【输出要求】
- 总字数约 3000 字
- 按主题分类合并总结，不要一篇一篇罗列
- 把相关新闻串联起来，提炼共同趋势和核心观点
- 跳过争议性政治话题

【结构】
# 今日市场全景（一段话概括今天整体情况）
# 重点主题（3-5 个主题，每个主题下合并相关新闻，分析趋势和影响）
# 关键数据与实体（值得关注的公司、人物、数字）
# 深度思考（值得持续关注的趋势和机会）

【写作风格】
- 专业但不晦涩
- 有观点有判断，不要中立罗列
- 用讲故事的方式串联信息

文章情报：
${topArticles.map(a => `- 标题：${a.title} [分类：${a.category}]
  概要：${a.summary}
  涉及实体：${a.entities.join(', ')}
`).join('\n')}`;

  console.log(`[AI] 正在撰写市场日刊简报（${topArticles.length} 篇，按重要性排序）...`);
  const response = await withTimeout(
    client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 10000,
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
  apiKey: string,
  date?: string  // 可选：传入日期，避免 AI 幻觉
): Promise<string> {
  const { client, model } = getClient(apiKey);

  const dateHint = date ? `今天的日期是 ${date}。` : '';

  const prompt = `你是一个专业的中文个人电台主播，风格自然、有个性，像在跟朋友聊天。

将以下日刊简报改写成适合语音朗读的播客文稿。

${dateHint}
【字数要求】：全文约 1200-1500 字，约 5-7 分钟阅读时长。

【开头要求 - 重要！】：
- 每次开头必须不同！可以用以下方式引入（随机选择）：
  * 用一个引人深思的问题开头
  * 用一个惊人的数据或事实开头
  * 用一个比喻或场景描述开头
  * 直接切入最热门的话题
  * 用"最近有个事特别有意思..."这样的口吻
- 禁止使用"各位朋友，大家好"、"欢迎收听"这类套话
- 第一句话就要抓住听众注意力

【核心要求】：
- 按主题自然过渡，不要一篇一篇罗列
- 把相关信息串联起来讲，像在跟朋友聊天
- 有观点有判断，不是在读报纸
- 可以用"你猜怎么着"、"有意思的是"、"说实话"等口语化表达
- 结尾要有总结和思考，但不要套话

【格式要求（TTS 朗读成败关键）】：
- 绝对不要包含舞台指导、语气指示、音效提示、时间戳
- 绝对不要包含角色标识、章节名称、标题、排版序号
- 绝对不要使用 Emoji 或 Markdown 符号
- 全文是流畅的口语化表达，像你在亲口讲述

简报内容如下：\n\n${briefing}`;

  console.log('[AI] 正在将简报改写为播客文案...');
  const response = await withTimeout(
    client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000,
    }),
    180000
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
  const { client, model } = getClient(apiKey);

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
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    }),
    60000
  );

  const rawText = response.choices?.[0]?.message?.content ?? '';
  return parseAiJson(rawText);
}
