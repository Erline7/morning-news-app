/**
 * HN热门讨论 - 抓取 Hacker News 官方 API + AI 翻译标题
 * 使用官方 API（firebaseio.com），比 hnrss.org 更可靠
 * 文档：https://github.com/HackerNews/API
 */

import { getClient } from './ai.js';

export interface HnDiscussion {
  title: string;          // 原标题（英文）
  titleZh: string;        // 中文翻译
  url: string;            // 原文链接
  hnUrl: string;          // HN 讨论页
  points: number;         // 点数
  comments: number;       // 评论数
  source: string;         // 来源域名
}

interface HnItem {
  id: number;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  by?: string;
  type?: string;
}

/**
 * 获取 HN Top N 讨论（使用官方 Firebase API）
 */
async function fetchHnTopStories(count: number = 10): Promise<HnDiscussion[]> {
  // 1. 获取 Top Stories ID 列表
  const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!topRes.ok) throw new Error(`HN API topstories 返回 ${topRes.status}`);
  const ids: number[] = await topRes.json();

  // 2. 取前 N 个 ID
  const topIds = ids.slice(0, count);

  // 3. 并发获取每个故事的详情
  const items = await Promise.all(
    topIds.map(async (id) => {
      try {
        const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        if (!res.ok) return null;
        return await res.json() as HnItem;
      } catch {
        return null;
      }
    })
  );

  // 4. 转换为 HnDiscussion 格式
  const discussions: HnDiscussion[] = items
    .filter((item): item is HnItem => item !== null && !!item.title)
    .map((item) => {
      const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
      const sourceMatch = url.match(/https?:\/\/([^\/]+)/);
      return {
        title: item.title || '',
        titleZh: '',
        url,
        hnUrl: `https://news.ycombinator.com/item?id=${item.id}`,
        points: item.score || 0,
        comments: item.descendants || 0,
        source: sourceMatch ? sourceMatch[1] : '',
      };
    });

  return discussions;
}

/**
 * 用 AI 批量翻译标题（一次请求翻译多个）
 */
async function translateTitles(items: HnDiscussion[], apiKey: string): Promise<void> {
  if (items.length === 0) return;

  const { client, model } = getClient(apiKey);

  // 批量翻译：一条消息包含所有标题，节省 API 调用
  const titlesText = items.map((item, idx) => `${idx + 1}. ${item.title}`).join('\n');

  const prompt = `请将以下 Hacker News 文章标题翻译成中文。要求：
- 简洁准确，保留技术术语（如 AI、API、Rust 等不翻译）
- 如果是知名产品/公司名，保留英文（如 GitHub、React、OpenAI）
- 只输出编号 + 中文翻译，不要额外解释

示例格式：
1. 中文翻译1
2. 中文翻译2

待翻译标题：
${titlesText}`;

  console.log(`[HN] 正在翻译 ${items.length} 个标题...`);

  const response = await Promise.race([
    client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('翻译超时')), 60000)
    ),
  ]);

  const translatedText = response.choices?.[0]?.message?.content ?? '';

  // 解析翻译结果
  const lines = translatedText.split('\n').filter((l: string) => l.trim());
  lines.forEach((line: string) => {
    const match = line.match(/^\d+\.\s*(.+)$/);
    if (match) {
      const idx = lines.indexOf(line);
      if (idx < items.length) {
        items[idx].titleZh = match[1].trim();
      }
    }
  });

  // 没翻译成功的 fallback 用原标题
  items.forEach(item => {
    if (!item.titleZh) {
      item.titleZh = item.title;
    }
  });
}

/**
 * 主函数：抓取 + 翻译
 */
export async function fetchHnDiscussions(apiKey: string, count: number = 10): Promise<HnDiscussion[]> {
  console.log(`🚀 [HN] 抓取 Top ${count} 热门讨论（官方 API）...`);

  const items = await fetchHnTopStories(count);
  console.log(`   ✅ 抓取到 ${items.length} 条`);

  try {
    await translateTitles(items, apiKey);
    console.log(`   ✅ 翻译完成`);
  } catch (e: any) {
    console.warn(`   ⚠️ 翻译失败: ${e.message}，保留原标题`);
    items.forEach(item => { item.titleZh = item.title; });
  }

  return items;
}
