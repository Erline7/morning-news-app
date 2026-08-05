/**
 * 记忆系统 - 存储层
 * 事件流（KV）、脉络（R2）、时间线分析（R2）的读写操作
 */

import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, kvGet, kvPut } from './utils.js';
import { MemoryEvent, EventType, ThinkingThread, DailyTimelineAnalysis, ThreadsStore } from './types.js';

// ====================== 配置 ======================
const DECAY_RATE = 0.9;
const DORMANT_THRESHOLD = 0.3;
const ARCHIVE_THRESHOLD = 0.1;

// ====================== 事件流存储（KV） ======================

function eventsKey(date: string): string {
  return `events:${date}`;
}

export async function loadEvents(date: string): Promise<MemoryEvent[]> {
  return await kvGet(eventsKey(date), 'json') || [];
}

export async function saveEvents(date: string, events: MemoryEvent[]): Promise<void> {
  await kvPut(eventsKey(date), JSON.stringify(events));
}

export async function appendEvent(date: string, event: MemoryEvent): Promise<void> {
  const events = await loadEvents(date);
  events.push(event);
  await saveEvents(date, events);
}

// ====================== 脉络存储（R2） ======================

const THREADS_KEY = 'memory/threads.json';

export async function loadThreads(): Promise<ThreadsStore> {
  try {
    const r2 = getR2Client();
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: THREADS_KEY
    }));
    const body = await res.Body?.transformToString();
    if (body) return JSON.parse(body);
  } catch {
    // 不存在则新建
  }
  return { threads: [], updatedAt: new Date().toISOString() };
}

export async function saveThreads(store: ThreadsStore): Promise<void> {
  store.updatedAt = new Date().toISOString();
  const r2 = getR2Client();
  await r2.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: THREADS_KEY,
    Body: Buffer.from(JSON.stringify(store, null, 2), 'utf-8'),
    ContentType: 'application/json; charset=utf-8'
  }));
}

// ====================== 每日时间线分析存储 ======================

const TIMELINE_KEY = 'memory/timeline/';

export async function saveTimelineAnalysis(analysis: DailyTimelineAnalysis): Promise<void> {
  const r2 = getR2Client();
  await r2.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: `${TIMELINE_KEY}${analysis.date}.json`,
    Body: Buffer.from(JSON.stringify(analysis, null, 2), 'utf-8'),
    ContentType: 'application/json; charset=utf-8'
  }));
}

export async function loadTimelineAnalysis(date: string): Promise<DailyTimelineAnalysis | null> {
  try {
    const r2 = getR2Client();
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: `${TIMELINE_KEY}${date}.json`
    }));
    const body = await res.Body?.transformToString();
    if (body) return JSON.parse(body);
  } catch {
    return null;
  }
  return null;
}

// ====================== 事件创建工厂 ======================

export function generateEventId(date: string): string {
  return `evt_${date.replace(/-/g, '')}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEvent(
  type: EventType,
  title: string,
  options?: {
    content?: string;
    articles?: string[];
    threads?: string[];
    notes?: string[];
    tags?: string[];
  }
): MemoryEvent {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  return {
    id: generateEventId(date),
    timestamp: now.toISOString(),
    type,
    title,
    content: options?.content,
    refs: {
      articles: options?.articles ?? [],
      threads: options?.threads ?? [],
      notes: options?.notes ?? []
    },
    tags: options?.tags ?? []
  };
}

// ====================== 脉络增量更新（不耗 token） ======================

/**
 * 将事件匹配到现有脉络（纯规则，不用 AI）
 * 匹配逻辑：标签交集 > 50% 则关联
 */
export function matchEventToThreads(event: MemoryEvent, threads: ThinkingThread[]): string[] {
  const matched: string[] = [];
  const eventTags = new Set(event.tags.map(t => t.toLowerCase()));

  for (const thread of threads) {
    if (thread.status === 'dormant') continue;

    const threadKeywords = extractKeywords(thread.theme + ' ' + thread.summary);
    const threadTags = new Set(threadKeywords.map(t => t.toLowerCase()));

    let intersection = 0;
    for (const tag of eventTags) {
      if (threadTags.has(tag)) intersection++;
    }

    const eventRatio = eventTags.size > 0 ? intersection / eventTags.size : 0;
    const threadRatio = threadTags.size > 0 ? intersection / threadTags.size : 0;

    if (eventRatio >= 0.5 || threadRatio >= 0.3) {
      matched.push(thread.id);
    }
  }

  return matched;
}

/**
 * 从文本中提取关键词（简单分词：2-6 字词组）
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const cleaned = text.replace(/[^一-龥a-zA-Z0-9]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);

  for (const word of words) {
    keywords.add(word);
    if (word.length >= 4) {
      for (let i = 0; i <= word.length - 2; i++) {
        keywords.add(word.slice(i, i + 2));
      }
    }
  }
  return Array.from(keywords);
}

/**
 * 更新脉络衰减（每天调用一次）
 */
export function applyDecay(threads: ThinkingThread[], today: string): ThinkingThread[] {
  const todayDate = new Date(today);

  return threads.map(thread => {
    const lastActive = new Date(thread.lastActiveAt);
    const daysSinceActive = Math.floor((todayDate.getTime() - lastActive.getTime()) / (24 * 60 * 60 * 1000));

    if (daysSinceActive <= 0) return thread;

    const newDecay = Math.pow(DECAY_RATE, daysSinceActive);

    let status: ThinkingThread['status'] = 'active';
    if (newDecay < ARCHIVE_THRESHOLD) {
      status = 'dormant';
    } else if (newDecay < DORMANT_THRESHOLD) {
      status = 'decaying';
    }

    return { ...thread, decay: newDecay, status };
  });
}

/**
 * 激活脉络（有新事件关联时调用）
 */
export function activateThread(thread: ThinkingThread, eventId: string, today: string): ThinkingThread {
  return {
    ...thread,
    lastActiveAt: new Date().toISOString(),
    eventIds: [...thread.eventIds, eventId],
    decay: 1.0,
    status: 'active'
  };
}

/**
 * 创建新脉络
 */
export function createThread(theme: string, eventId: string): ThinkingThread {
  const now = new Date().toISOString();
  return {
    id: `thread_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    theme,
    createdAt: now,
    lastActiveAt: now,
    eventIds: [eventId],
    summary: '',
    status: 'active',
    decay: 1.0
  };
}

// ====================== 30 天事件流清理 ======================

export async function cleanupOldEvents(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const listUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/keys?prefix=events:`;
  const listRes = await fetch(listUrl, {
    headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }
  });

  if (!listRes.ok) return;
  const { result } = await listRes.json();
  if (!result) return;

  const keysToDelete = result
    .map((k: any) => k.name)
    .filter((name: string) => {
      const datePart = name.replace('events:', '');
      return datePart < `events:${cutoffDate}`;
    });

  if (keysToDelete.length === 0) return;

  const delUrl = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}/values`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(keysToDelete)
  });

  console.log(`🧹 清理了 ${keysToDelete.length} 天的过期事件流`);
}
