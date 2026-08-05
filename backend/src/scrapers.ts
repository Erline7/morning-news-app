import axios from 'axios'
import { load } from 'cheerio'
import HttpsProxyAgent from 'https-proxy-agent'
import { RawHeadline, ArticleContent } from './types.js'

const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
const proxyAgent = proxyUrl ? HttpsProxyAgent(proxyUrl) : undefined;

if (proxyAgent) {
  console.log(`   检测到代理配置，已挂载本地代理: ${proxyUrl}`);
}

const CLS_BASE = 'https://cls.cn'
const WALLSTREET_BASE = 'https://wallstreetcn.com'
const CAIXIN_BASE = 'https://www.caixinglobal.com'
const YAHOO_BASE = 'https://finance.yahoo.com'

// 统一请求配置
const AXIOS_CONFIG = {
  timeout: 30000,
  httpsAgent: proxyAgent,
  proxy: false as const,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.google.com/',
    'Connection': 'keep-alive'
  }
}

/**
 * 带重试的 HTTP 请求（指数退避）
 */
async function requestWithRetry(url: string, config = {}, retries = 3, delay = 1000) {
  let lastError: any
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const finalConfig = { ...AXIOS_CONFIG, ...config }
      return await axios.get(url, finalConfig)
    } catch (error: any) {
      lastError = error
      if (attempt < retries && (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || !error.response)) {
        const wait = delay * Math.pow(2, attempt - 1)
        console.log(`   ⏳ 请求失败 (${error.message})，${wait}ms 后重试 (${attempt}/${retries})...`)
        await new Promise(resolve => setTimeout(resolve, wait))
      } else {
        throw error
      }
    }
  }
  throw lastError
}

// ==================== 头条抓取模块 ====================

export async function fetchCLSHeadlines(): Promise<RawHeadline[]> {
  try {
    const response = await requestWithRetry(CLS_BASE)
    const $ = load(response.data)
    const headlines: RawHeadline[] = []
    const seenUrls = new Set<string>()

    const hotListTitle = $('div').filter(function() {
      return $(this).text().trim() === '热门文章排行榜';
    }).first();

    if (hotListTitle.length > 0) {
      console.log('   [CLS] 🎯 正在提取位置: 主页 -> 热门文章排行榜');
      const listContainer = hotListTitle.next();
      listContainer.find('a').each((_: number, el: any) => {
        if (headlines.length >= 5) return;  // 只取前 5 条
        let title = $(el).text().trim()
        const href = $(el).attr('href')

        if (href && href.includes('/detail/') && title.length > 8) {
          const url = href.startsWith('http') ? href : `${CLS_BASE}${href}`
          if (!seenUrls.has(url)) {
            seenUrls.add(url)
            headlines.push({
              title, url,
              source: 'CLS (热门文章排行榜)',
              collectedAt: new Date().toISOString()
            })
          }
        }
      })
    } else {
      console.log('   [CLS] ⚠️ 未找到"热门文章排行榜"区域，放弃抓取流以防混入杂讯');
    }
    return headlines
  } catch (error: any) {
    console.log(`   ❌ 财联社抓取失败: ${error.message}`)
    return []
  }
}

export async function fetchWallstreetHeadlines(): Promise<RawHeadline[]> {
  console.log('   [WallstreetCN] 🎯 正在提取位置: 主页 -> 日榜最热文章 (via API)');
  const API_URL = 'https://api-one-wscn.awtmt.com/apiv1/content/articles/hot?period=day';
  const headlines: RawHeadline[] = [];
  const seenUrls = new Set<string>();

  try {
    const response = await requestWithRetry(API_URL);
    const items = response.data?.data?.day_items || [];

    for (const item of items) {
      if (headlines.length >= 5) break;  // 只取前 5 条
      const title = item.title;
      const href = item.uri;
      if (title && href && href.includes('/articles/')) {
        const url = href.startsWith('http') ? href : `${WALLSTREET_BASE}${href}`;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          headlines.push({
            title: title.trim(), url,
            source: 'WallstreetCN (最热文章)',
            collectedAt: new Date().toISOString()
          });
        }
      }
    }
  } catch (error: any) {
    console.log(`   ❌ 华尔街见闻 API 抓取失败: ${error.message}`);
  }
  return headlines;
}

export async function fetchCaixinGlobalHeadlines(): Promise<RawHeadline[]> {
  console.log('   [Caixin] 🎯 正在提取位置: 主页 -> TOP STORIES...');
  const headlines: RawHeadline[] = [];
  const seenUrls = new Set<string>();

  // 1. DOM 精准提取
  try {
    const response = await requestWithRetry(CAIXIN_BASE, { timeout: 25000 }, 3, 1500);
    const $ = load(response.data);
    const topStoryContainer = $('.top-story, .topstories, #top-story, main, .featured');
    const targetArea = topStoryContainer.length > 0 ? topStoryContainer : $('body');

    targetArea.find('h2 a, h3 a, .top-story a').each((_, el) => {
      const title = $(el).text().trim();
      let href = $(el).attr('href');

      if (title && href && title.length > 12) {
        const url = href.startsWith('http') ? href : `${CAIXIN_BASE}${href}`;
        if (!seenUrls.has(url) && !url.includes('/search/') && !url.includes('/sub/')) {
          seenUrls.add(url);
          headlines.push({
            title, url,
            source: 'Caixin Global (TOP STORIES)',
            collectedAt: new Date().toISOString()
          });
        }
      }
    });

    if (headlines.length > 0) return headlines.slice(0, 6);
  } catch (error: any) {
    console.log(`      [Caixin-DOM] ⚠️ 失败 (${error.message})，进入 Jina 过滤流...`);
  }

  // 2. Jina Reader 中转
  try {
    const jinaUrl = `https://r.jina.ai/${CAIXIN_BASE}`;
    const response = await requestWithRetry(jinaUrl, { timeout: 22000, headers: { 'Accept': 'text/plain' } }, 2, 2000);
    let text = response.data || '';

    const topStoriesIndex = text.search(/#+\s*Top\s*Stories/i);
    if (topStoriesIndex !== -1) {
      text = text.substring(topStoriesIndex, topStoriesIndex + 8000);
    }

    const regex = /\[([^\]]{12,}?)\]\((https:\/\/(?:www\.)?caixinglobal\.com[^\)]+)\)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const title = match[1].replace(/\n/g, ' ').trim();
      const url = match[2].trim();

      if (title.length > 15 && !seenUrls.has(url)) {
        seenUrls.add(url);
        headlines.push({
          title, url,
          source: 'Caixin Global (TOP STORIES-Jina)',
          collectedAt: new Date().toISOString()
        });
      }
    }
    if (headlines.length > 0) return headlines.slice(0, 6);
  } catch (error: any) {
    console.log(`      [Caixin-Jina] ⚠️ 失败 (${error.message})，切换 RSS 兜底...`);
  }

  // 3. RSS 兜底
  try {
    const rssUrl = 'https://www.caixinglobal.com/rss/';
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    const response = await requestWithRetry(proxyUrl, { timeout: 20000 });
    const items = response.data?.items || [];

    for (const item of items.slice(0, 8)) {
      const title = item.title?.trim();
      const url = item.link?.trim();
      if (title && url && !seenUrls.has(url)) {
        seenUrls.add(url);
        headlines.push({
          title, url,
          source: 'Caixin Global (Latest Feed)',
          collectedAt: new Date().toISOString(),
          preFetchedContent: item.description || item.content || ''
        });
      }
    }
    return headlines.slice(0, 6);
  } catch (error: any) {
    console.log(`      [Caixin-RSS] ❌ 终极降级全线溃败: ${error.message}`);
  }
  return headlines;
}

export async function fetchGithubTrendingHeadlines(): Promise<RawHeadline[]> {
  const headlines: RawHeadline[] = [];
  try {
    console.log('   🌐 正在通过 RSSHub 获取 GitHub Trending...');
    const rssUrl = 'https://rsshub.app/github/trending';
    const response = await requestWithRetry(rssUrl, { timeout: 25000 });
    const $ = load(response.data, { xmlMode: true });

    $('item').slice(0, 10).each((_, el) => {
      const title = $(el).find('title').text().trim();
      const url = $(el).find('link').text().trim();
      const description = $(el).find('description').text().trim();
      if (title && url) {
        headlines.push({
          title, url,
          source: 'GitHub Trending (RSSHub)',
          collectedAt: new Date().toISOString(),
          preFetchedContent: description || ''
        });
      }
    });
    if (headlines.length > 0) return headlines;
  } catch (error: any) {
    console.log(`   ⚠️ RSSHub 抓取失败 (${error.message})，尝试直接抓取页面...`);
  }

  // 直接爬取
  try {
    const response = await requestWithRetry('https://github.com/trending', { timeout: 30000 }, 2, 1000);
    const $ = load(response.data);
    $('.Box-row').slice(0, 10).each((_, el) => {
      const repoName = $(el).find('h2 a').text().replace(/\s+/g, '').trim();
      const description = $(el).find('p').text().trim();
      const href = $(el).find('h2 a').attr('href');
      const url = href ? `https://github.com${href}` : '';
      if (repoName && url) {
        headlines.push({
          title: repoName, url,
          source: 'GitHub Trending (Direct)',
          collectedAt: new Date().toISOString(),
          preFetchedContent: description
        });
      }
    });
  } catch (error: any) {
    console.log(`   ❌ 直接抓取 GitHub Trending 失败: ${error.message}`);
  }
  return headlines;
}

export async function fetchYahooFinanceDetailed(): Promise<RawHeadline[]> {
  const yahooFeeds = [
    { location: 'Top Stories', url: 'https://finance.yahoo.com/news/rss' },
    { location: 'Popular', url: 'https://finance.yahoo.com/rss/trending' }
  ];
  const headlines: RawHeadline[] = [];
  const seenUrls = new Set<string>();

  await Promise.all(yahooFeeds.map(async (feed) => {
    try {
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      const response = await requestWithRetry(proxyUrl, { timeout: 20000 });
      const items = response.data?.items || [];

      let count = 0;
      for (const item of items) {
        if (count >= 5) break;
        const title = item.title?.trim();
        const url = item.link?.trim();

        if (title && url && !seenUrls.has(url)) {
          seenUrls.add(url);
          count++;
          headlines.push({
            title, url,
            source: `Yahoo Finance (${feed.location})`,
            collectedAt: new Date().toISOString(),
            preFetchedContent: item.description || item.content || ''
          });
        }
      }
    } catch (error: any) {
      console.log(`      [Yahoo] ⚠️ 分区 [${feed.location}] 提取失败: ${error.message}`);
    }
  }));
  return headlines;
}

// ==================== Aivalley (theaivalley.com) ====================

/**
 * 抓取 Aivalley 最新一篇文章
 * 通过 Jina Reader 绕过 Cloudflare 保护
 */
export async function fetchAivalleyHeadlines(): Promise<RawHeadline[]> {
  const headlines: RawHeadline[] = [];
  const BASE_URL = 'https://www.theaivalley.com';

  try {
    // 用 Jina Reader 获取 archive 页面内容
    const jinaUrl = `https://r.jina.ai/${BASE_URL}/archive`;
    const response = await requestWithRetry(jinaUrl, {
      timeout: 30000,
      headers: { 'Accept': 'text/plain' }
    }, 2, 2000);

    if (!response.data) {
      console.log('   ⚠️ [Aivalley] Jina Reader 无返回');
      return [];
    }

    const text = response.data;

    // Jina Reader 返回 Markdown 格式，文章链接格式: [标题](URL)
    // 找第一个 /p/ 链接（最新文章）
    const linkRegex = /\[([^\]]+)\]\((https:\/\/www\.theaivalley\.com\/p\/[^\)]+)\)/g;
    let match;
    let count = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      const title = match[1].trim();
      const url = match[2].trim();

      // 过滤掉过短的（可能是导航链接）
      if (title.length < 10) continue;

      headlines.push({
        title,
        url,
        source: 'Aivalley',
        collectedAt: new Date().toISOString(),
      });

      count++;
      if (count >= 1) break; // 只取最新一篇
    }

    console.log(`   [Aivalley] 抓取到 ${headlines.length} 篇文章`);
  } catch (error: any) {
    console.log(`   ⚠️ [Aivalley] 抓取失败: ${error.message}`);
  }

  return headlines;
}

// ==================== Hacker News ====================

/**
 * 抓取 Hacker News 前 5 条热门
 */
export async function fetchHackerNewsHeadlines(): Promise<RawHeadline[]> {
  const headlines: RawHeadline[] = []
  try {
    const response = await requestWithRetry('https://news.ycombinator.com/front', { timeout: 20000 })
    const $ = load(response.data)

    // HN 的标题在 .titleline > a
    $('.titleline > a').each((_, el) => {
      if (headlines.length >= 5) return
      const title = $(el).text().trim()
      const url = $(el).attr('href') || ''
      if (!title || !url) return

      // 处理相对链接（item?id=xxx 是 HN 讨论页）
      const fullUrl = url.startsWith('http') ? url : `https://news.ycombinator.com/${url}`

      headlines.push({
        title,
        url: fullUrl,
        source: 'Hacker News',
        collectedAt: new Date().toISOString()
      })
    })
  } catch (error: any) {
    console.log(`      [HackerNews] ⚠️ 提取失败: ${error.message}`)
  }
  return headlines
}

// ==================== 通用 URL 抓取（用于前端任意输入） ====================

/**
 * 尝试多种策略抓取任意 URL 的正文
 * 策略顺序：直接抓取 → Jina Reader
 */
export async function fetchGenericUrl(url: string): Promise<{ title: string; content: string } | null> {
  // 策略 1：直接抓取
  try {
    const response = await requestWithRetry(url, { timeout: 20000 });
    const $ = load(response.data);
    const title = $('title').first().text().trim() || url;

    // 提取正文
    const selectors = ['article', '.article-content', '.content', '.article-main', '.detail-body', '#article-body', 'main'];
    for (const selector of selectors) {
      const node = $(selector);
      if (node.length) {
        node.find('script,noscript,style,iframe,aside,header,footer,.advertisement,.related-article').remove();
        const text = node.text().trim();
        if (text.length > 200) {
          console.log(`   ✅ [通用抓取-直接] ${url.slice(0, 50)}... | ${text.length} 字`);
          return { title, content: text };
        }
      }
    }
    // 兜底用 body
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    if (bodyText.length > 200) {
      console.log(`   ✅ [通用抓取-Body] ${url.slice(0, 50)}... | ${bodyText.length} 字`);
      return { title, content: bodyText };
    }
  } catch (e: any) {
    console.log(`   ⚠️ [通用抓取-直接] 失败: ${e.message}，尝试 Jina...`);
  }

  // 策略 2：Jina Reader
  try {
    const response = await requestWithRetry(`https://r.jina.ai/${url}`, {
      timeout: 30000,
      headers: { 'Accept': 'text/plain' }
    }, 2, 1500);
    if (response.data && response.data.length > 100) {
      // Jina 返回格式：第一行是 Title: xxx
      const lines = response.data.split('\n');
      const titleLine = lines.find((l: string) => l.startsWith('Title:'));
      const title = titleLine ? titleLine.replace(/^Title:\s*/i, '').trim() : url;
      console.log(`   ✅ [通用抓取-Jina] ${url.slice(0, 50)}... | ${response.data.length} 字`);
      return { title, content: response.data };
    }
  } catch (e: any) {
    console.log(`   ❌ [通用抓取-Jina] 也失败: ${e.message}`);
  }

  return null;
}

// ==========================================
// 🚀 ContentEngine 正文处理引擎
// ==========================================

async function fetchDirectly(url: string): Promise<string> {
  const response = await requestWithRetry(url, {
    timeout: 30000,
    headers: { 'Cache-Control': 'max-age=0' }
  }, 2, 1000);

  const $ = load(response.data);
  const selectors = ['article', '.article-content', '.content', '.article-main', '.detail-body', '#article-body'];
  for (const selector of selectors) {
    const node = $(selector);
    if (node.length) {
      node.find('script,noscript,style,iframe,aside,header,footer,.advertisement,.related-article,.related-posts').remove();
      const text = node.text().trim();
      if (text.length > 400) return text;
    }
  }
  return $('body').text().replace(/\s+/g, ' ').trim();
}

async function fetchViaJinaWithRetry(url: string): Promise<string> {
  try {
    const response = await requestWithRetry(`https://r.jina.ai/${url}`, {
      timeout: 35000,
      headers: { 'Accept': 'text/plain' }
    }, 2, 1500);
    if (response.data && response.data.length > 50) return response.data;
  } catch (e) {}
  throw new Error('Jina 策略解密失败');
}

class ContentEngine {
  private cache = new Map<string, string>();
  private pipelines = new Map<string, (url: string, headline: RawHeadline) => Promise<string>>();

  constructor() {
    this.registerDefaultPipelines();
  }

  private registerDefaultPipelines() {
    this.pipelines.set('direct', async (url) => await fetchDirectly(url));
    this.pipelines.set('jina', async (url) => await fetchViaJinaWithRetry(url));
    this.pipelines.set('rss_short_circuit', async (url, headline) => {
      if (headline.preFetchedContent && headline.preFetchedContent.length > 30) {
        return headline.preFetchedContent;
      }
      throw new Error('摘要过短');
    });
    this.pipelines.set('pre_fetched_full', async (url, headline) => {
      if (headline.preFetchedContent && headline.preFetchedContent.length > 0) {
        return headline.preFetchedContent;
      }
      throw new Error('无内容');
    });
  }

  private getFetchStrategy(url: string, headline: RawHeadline): string[] {
    const urlLower = url.toLowerCase();
    if (headline.isEmail || urlLower.includes('github.com')) {
      return ['pre_fetched_full'];
    }
    if (urlLower.includes('cls.cn') || urlLower.includes('wallstreetcn.com')) {
      return ['direct', 'jina'];
    }
    if (urlLower.includes('caixinglobal')) {
      return ['jina', 'direct'];
    }
    if (headline.source.toLowerCase().includes('yahoo')) {
      return ['rss_short_circuit', 'jina', 'direct'];
    }
    return ['jina', 'direct'];
  }

  public async process(headline: RawHeadline): Promise<ArticleContent> {
    if (this.cache.has(headline.url)) {
      return { ...headline, content: this.cache.get(headline.url)! };
    }

    const strategies = this.getFetchStrategy(headline.url, headline);
    let content = '';
    let usedStrategy = 'none';
    const startTime = Date.now();

    for (const strategyName of strategies) {
      const pipelineFn = this.pipelines.get(strategyName);
      if (!pipelineFn) continue;

      try {
        const rawContent = await pipelineFn(headline.url, headline);
        if (rawContent && rawContent.length >= 10) {
          content = rawContent;
          usedStrategy = strategyName;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!content) {
      content = headline.preFetchedContent || headline.title;
      usedStrategy = 'fallback';
    }

    this.cache.set(headline.url, content);

    console.log(
      `      -> ✅ [遥测] ${headline.source.substring(0, 15).padEnd(15)} | ` +
      `${usedStrategy.padEnd(18)} | ${Date.now() - startTime}ms | ${content.length} 字符`
    );

    return { ...headline, content };
  }
}

const contentEngine = new ContentEngine();

export const fetchArticleContent = async (headline: RawHeadline): Promise<ArticleContent> => {
  return await contentEngine.process(headline);
};
