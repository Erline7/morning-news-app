/**
 * HN热门讨论 - 抓取 hnrss.org + AI 翻译标题
 * 数据来源：https://hnrss.org/frontpage?count=10
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

/**
 * 抓取 HN RSS feed（Top 10）
 */
async function fetchHnRss(count: number = 10): Promise<HnDiscussion[]> {
  const rssUrl = `https://hnrss.org/frontpage?count=${count}`;
  const res = await fetch(rssUrl, {
    headers: { 'User-Agent': 'DailyBrief/1.0' },
  });

  if (!res.ok) {
    throw new Error(`HN RSS 返回 ${res.status}`);
  }

  const xml = await res.text();
  return parseHnXml(xml);
}

/**
 * 解析 HN RSS XML
 * hnrss.org 实际格式：
 * <item>
 *   <title><![CDATA[...]]></title>
 *   <link>https://example.com/article</link>
 *   <comments>https://news.ycombinator.com/item?id=xxx</comments>
 *   <description><![CDATA[<p>Article URL: <a href="...">...</a></p><p>Comments URL: ...</p><p>Points: 31</p><p># Comments: 7</p>]]></description>
 * </item>
 */
function parseHnXml(xml: string): HnDiscussion[] {
  const items: HnDiscussion[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const commentsUrl = extractTag(itemXml, 'comments');
    const description = extractTag(itemXml, 'description');

    // 从 description HTML 里提取 Points 和 Comments
    const pointsMatch = description.match(/Points:\s*(\d+)/i);
    const commentsMatch = description.match(/#\s*Comments:\s*(\d+)/i);

    // 提取来源域名
    const sourceMatch = link.match(/https?:\/\/([^\/]+)/);

    items.push({
      title: title || '',
      titleZh: '',  // 稍后 AI 翻译填充
      url: link || '',
      hnUrl: commentsUrl || '',
      points: pointsMatch ? parseInt(pointsMatch[1], 10) : 0,
      comments: commentsMatch ? parseInt(commentsMatch[1], 10) : 0,
      source: sourceMatch ? sourceMatch[1] : '',
    });
  }

  return items;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\\/${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
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
      temperature: 0.3,  // 低温度保证翻译稳定性
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
  console.log(`🚀 [HN] 抓取 Top ${count} 热门讨论...`);

  const items = await fetchHnRss(count);
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
