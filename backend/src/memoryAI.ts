/**
 * 记忆系统 - AI 分析层
 * 调用 LLM 进行时间线分析、脉络摘要、建议生成
 */

import OpenAI from 'openai';
import { MemoryEvent, ThinkingThread, DailyTimelineAnalysis } from './types.js';
import {
  loadThreads, saveThreads, saveTimelineAnalysis, loadTimelineAnalysis,
  loadEvents, applyDecay, matchEventToThreads, activateThread, appendEvent,
  cleanupOldEvents
} from './memory.js';
import { parseAiJson, withTimeout } from './utils.js';

// ====================== AI 客户端 ======================

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: "https://api.longcat.chat/openai/v1",
      maxRetries: 0,
    });
  }
  return _client;
}

// ====================== AI 每日时间线分析 ======================

export async function analyzeDailyTimeline(
  events: MemoryEvent[],
  date: string,
  apiKey: string
): Promise<DailyTimelineAnalysis> {
  if (events.length === 0) {
    return {
      date,
      events: [],
      narrative: '今天还没有记录任何行为。',
      followUpQuestions: ['今天有什么让你思考的事情吗？'],
      activeThreadIds: []
    };
  }

  const client = getClient();

  const eventsSummary = events.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    let line = `${time} [${e.type}] ${e.title}`;
    if (e.content) line += ` | ${e.content.slice(0, 80)}`;
    if (e.tags.length > 0) line += ` | 标签: ${e.tags.join(', ')}`;
    return line;
  }).join('\n');

  const prompt = `你是一个个人思考教练。根据以下用户今天的行为时间线，生成：
1. 一段叙事（2-3句话，串联今天的核心思考脉络）
2. 2-3个复盘问题（引导用户深度反思，不要泛泛而谈）

今日行为记录：
${eventsSummary}

只输出 JSON：
{
  "narrative": "叙事（中文，100字以内）",
  "followUpQuestions": ["问题1", "问题2", "问题3"]
}`;

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model: 'LongCat-2.0',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
      60000
    );

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const parsed = parseAiJson(rawText);

    return {
      date,
      events,
      narrative: parsed.narrative || '今天的行为很零散，没有明显的主题。',
      followUpQuestions: Array.isArray(parsed.followUpQuestions)
        ? parsed.followUpQuestions.slice(0, 3)
        : [],
      activeThreadIds: []
    };
  } catch (error: any) {
    console.error(`[Memory] 每日时间线分析失败: ${error.message}`);
    return {
      date,
      events,
      narrative: '今天有 ' + events.length + ' 条行为记录。',
      followUpQuestions: [],
      activeThreadIds: []
    };
  }
}

// ====================== AI 脉络摘要更新 ======================

export async function updateThreadSummary(
  thread: ThinkingThread,
  events: MemoryEvent[],
  apiKey: string
): Promise<string> {
  if (events.length < 2) return '';

  const client = getClient();

  const eventsSummary = events.map(e => {
    const date = e.timestamp.slice(0, 10);
    return `${date}: ${e.title}`;
  }).join('\n');

  const prompt = `以下是用户围绕"${thread.theme}"主题的一系列行为，请用一句话（30字以内）总结这条思考脉络的走向。

${eventsSummary}

只输出 JSON：
{
  "summary": "从A到B到C的思考脉络"
}`;

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model: 'LongCat-2.0',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
      30000
    );

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const parsed = parseAiJson(rawText);
    return parsed.summary || '';
  } catch {
    return '';
  }
}

// ====================== AI 脉络建议生成 ======================

export async function generateThreadSuggestion(
  thread: ThinkingThread,
  events: MemoryEvent[],
  apiKey: string
): Promise<string> {
  if (events.length < 3) return '';

  const client = getClient();

  const recentEvents = events.slice(-5).map(e => e.title).join(', ');

  const prompt = `用户在"${thread.theme}"这个话题上已经持续思考了多天，最近的行为是：${recentEvents}。

请给出一个简短的下一步关注方向（20字以内，以问句或建议形式）。

只输出 JSON：
{
  "suggestion": "建议文本"
}`;

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model: 'LongCat-2.0',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
      }),
      30000
    );

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const parsed = parseAiJson(rawText);
    return parsed.suggestion || '';
  } catch {
    return '';
  }
}

// ====================== 自动创建新脉络 ======================

export async function detectNewThreads(
  recentEvents: MemoryEvent[],
  existingThreads: ThinkingThread[],
  apiKey: string
): Promise<ThinkingThread[]> {
  const orphanEvents = recentEvents.filter(e => !e.refs.threads || e.refs.threads.length === 0);
  if (orphanEvents.length < 3) return [];

  const client = getClient();

  const eventsSummary = orphanEvents.map(e => {
    const date = e.timestamp.slice(0, 10);
    return `${date} ${e.title} [${e.tags.join(', ')}]`;
  }).join('\n');

  const existingThemes = existingThreads.map(t => t.theme).join(', ');

  const prompt = `以下是用户近期的零散行为（未归入任何思考脉络），以及现有的脉络主题。

近期零散行为：
${eventsSummary}

现有脉络：[${existingThemes}]

请判断这些零散行为是否形成了新的主题脉络。如果有，给出主题名称（2-6字，中文）。如果没有形成主题，返回空数组。

只输出 JSON：
{
  "newThreads": [
    { "theme": "主题名称", "relatedEventIds": ["事件ID1", "事件ID2"] }
  ]
}`;

  try {
    const response = await withTimeout(
      client.chat.completions.create({
        model: 'LongCat-2.0',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
      }),
      60000
    );

    const rawText = response.choices?.[0]?.message?.content ?? '';
    const parsed = parseAiJson(rawText);
    const newThreadsData = Array.isArray(parsed.newThreads) ? parsed.newThreads : [];

    const createdThreads: ThinkingThread[] = [];
    for (const nt of newThreadsData) {
      if (!nt.theme || !Array.isArray(nt.relatedEventIds)) continue;
      const thread: ThinkingThread = {
        id: `thread_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        theme: nt.theme,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        eventIds: nt.relatedEventIds,
        summary: '',
        status: 'active',
        decay: 1.0
      };
      createdThreads.push(thread);
    }

    return createdThreads;
  } catch {
    return [];
  }
}

// ====================== Pipeline 集成函数 ======================

export async function runMemoryPipeline(date: string, apiKey: string): Promise<void> {
  console.log('🧠 [Memory] 开始记忆系统每日处理...');

  // 1. 加载今日事件
  const todayEvents = await loadEvents(date);
  console.log(`   今日事件数: ${todayEvents.length}`);

  // 2. 每日时间线分析
  const timelineAnalysis = await analyzeDailyTimeline(todayEvents, date, apiKey);
  await saveTimelineAnalysis(timelineAnalysis);
  console.log(`   ✅ 时间线分析已生成`);

  // 3. 脉络衰减 + 激活
  let threadsStore = await loadThreads();
  threadsStore.threads = applyDecay(threadsStore.threads, date);

  // 将今日事件关联到活跃脉络
  for (const event of todayEvents) {
    const matched = matchEventToThreads(event, threadsStore.threads);
    for (const threadId of matched) {
      const idx = threadsStore.threads.findIndex(t => t.id === threadId);
      if (idx !== -1) {
        threadsStore.threads[idx] = activateThread(threadsStore.threads[idx], event.id, date);
      }
    }
  }

  // 4. 更新有变化的脉络摘要
  for (let i = 0; i < threadsStore.threads.length; i++) {
    const thread = threadsStore.threads[i];
    if (thread.status !== 'active') continue;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threadEvents = todayEvents.filter(e =>
      thread.eventIds.includes(e.id) &&
      new Date(e.timestamp) > sevenDaysAgo
    );

    if (threadEvents.length >= 3 && !thread.summary) {
      const summary = await updateThreadSummary(thread, threadEvents, apiKey);
      if (summary) {
        threadsStore.threads[i].summary = summary;
      }
    }

    const daysActive = Math.floor(
      (new Date().getTime() - new Date(thread.createdAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysActive >= 3 && !thread.suggestedNext) {
      const suggestion = await generateThreadSuggestion(thread, threadEvents, apiKey);
      if (suggestion) {
        threadsStore.threads[i].suggestedNext = suggestion;
      }
    }
  }

  await saveThreads(threadsStore);
  console.log(`   ✅ 脉络状态已更新（活跃: ${threadsStore.threads.filter(t => t.status === 'active').length}）`);

  // 5. 周末清理
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0) {
    await cleanupOldEvents();
    console.log('   ✅ 周末清理完成');
  }

  console.log('🧠 [Memory] 记忆系统处理完毕');
}

// ====================== API 端点辅助函数 ======================

export async function recordEvent(date: string, event: MemoryEvent): Promise<{ success: boolean }> {
  try {
    await appendEvent(date, event);
    return { success: true };
  } catch (e: any) {
    console.error(`[Memory] 记录事件失败: ${e.message}`);
    return { success: false };
  }
}

export async function getTimeline(date: string): Promise<DailyTimelineAnalysis | null> {
  return loadTimelineAnalysis(date);
}

export async function getActiveThreads(): Promise<ThinkingThread[]> {
  const store = await loadThreads();
  return store.threads.filter(t => t.status === 'active' || t.status === 'decaying');
}
