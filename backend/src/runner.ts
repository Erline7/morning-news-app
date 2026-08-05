import 'dotenv/config'
import {
  fetchCLSHeadlines,
  fetchWallstreetHeadlines,
  fetchCaixinGlobalHeadlines,
  fetchYahooFinanceDetailed,
  fetchGithubTrendingHeadlines,
  fetchHackerNewsHeadlines,
  fetchAivalleyHeadlines,
  fetchArticleContent
} from './scrapers.js'
import { analyzeArticle, generateDailyBriefing, generatePodcastScript, AnalysisContext } from './ai.js'
import { runMemoryPipeline } from './memoryAI.js'
import { synthesizeAudio } from './audio.js'
import fs from 'fs'
import path from 'path'
import { CloudflareEmailService } from './fetchKvEmail.js'
import {
  saveIntelligenceToR2,
  saveDataToR2,
  getFullHistoryFromR2,
  getCategoriesFromR2,
  saveCategoriesToR2,
  updateAndCleanHistoryInR2
} from './storage.js'
import { generateDailyReport } from './report.js'
import { kvGet, kvPut } from './utils.js'
import pLimit from 'p-limit'
import { ArticleIntelligence } from './types.js'

// ====================== 配置中心 ======================
const CONFIG = {
  aiConcurrency: 2,
}

// ====================== 运行模式 ======================
// PIPELINE_MODE=morning（默认）：完整流程（抓取→简报→复盘→记忆）
// PIPELINE_MODE=evening：只跑复盘 + 记忆系统
//   - 复盘日期由 REVIEW_DATE 指定（格式 YYYY-MM-DD），不指定则用当天日期
const PIPELINE_MODE = process.env.PIPELINE_MODE || 'morning'
const REVIEW_DATE = process.env.REVIEW_DATE || null

// ====================== 环境变量校验 ======================
const REQUIRED_ENV = ['DASHSCOPE_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_KV_NAMESPACE_ID', 'CLOUDFLARE_API_TOKEN'] as const
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`❌ 缺少必需的环境变量: ${key}`)
    process.exit(1)
  }
}
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY!

// ====================== 失败占位工厂 ======================
function createFallbackIntelligence(headline: any, errorMessage: string): ArticleIntelligence {
  return {
    title: headline.title || '未知标题',
    url: headline.url || '',
    source: headline.source || 'Unknown',
    collectedAt: headline.collectedAt || new Date().toISOString(),
    summary: `${headline.title || '本文'}（原始内容抓取失败：${errorMessage}。建议直接访问原文链接查看。）`,
    category: '未分类',
    importance: 0,
    keywords: [],
    entities: [],
    timeline: [],
    relatedTopics: [],
    questions: [],
    personalThinkingPrompt: '',
    isStarred: false,
    unstarredAt: undefined,
    isUserAdded: headline.isUserAdded || false,
  };
}

// ====================== 单篇文章处理函数 ======================
async function processArticle(
  headline: any,
  apiKey: string,
  ctx?: AnalysisContext
): Promise<any | any[]> {
  try {
    const contentData = await fetchArticleContent(headline)
    const result = await analyzeArticle(contentData, apiKey, ctx)
    // Newsletter 可能返回数组（多篇文章）
    if (Array.isArray(result)) {
      return result.map((item: any) => {
        if (headline.isUserAdded) item.isUserAdded = true;
        return item;
      });
    }
    if (headline.isUserAdded) result.isUserAdded = true
    return result
  } catch (error: any) {
    console.warn(`⚠️ [失败占位] ${headline.title?.slice(0, 30)}... | ${error.message}`)
    return createFallbackIntelligence(headline, error.message)
  }
}

// ====================== 主流程 ======================
async function run() {
  console.log(`🚀 DailyBrief Pipeline [${PIPELINE_MODE} 模式] 开始执行...`)
  console.time('总耗时')

  const keysToDelete: string[] = []
  let githubTrendingData: any[] = []

  // ==================== Evening 模式：只跑复盘 + 记忆系统 ====================
  if (PIPELINE_MODE === 'evening') {
    const reviewDate = REVIEW_DATE || new Date().toISOString().slice(0, 10)
    console.log(`🌙 Evening 模式：复盘日期 = ${reviewDate}`)

    try {
      console.log('🚀 生成每日复盘报告...')
      await generateDailyReport(reviewDate, DASHSCOPE_API_KEY)
      console.log('   ✅ 每日复盘报告已生成')
    } catch (e: any) {
      console.error(`   ⚠️ 报告生成失败: ${e.message}`)
    }

    try {
      console.log('🚀 记忆系统处理...')
      await runMemoryPipeline(reviewDate, DASHSCOPE_API_KEY)
      console.log('   ✅ 记忆系统处理完毕')
    } catch (e: any) {
      console.error(`   ⚠️ 记忆系统处理失败: ${e.message}`)
    }

    console.timeEnd('总耗时')
    console.log('✅ Evening Pipeline 执行完毕！')
    return
  }

  // ==================== Morning 模式：完整流程 ====================
  // ==================== 1. 并行抓取所有信息源 ====================
  console.log('🚀 1. 并行抓取所有信息源...')

  const emailService = new CloudflareEmailService({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    namespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID!,
    apiToken: process.env.CLOUDFLARE_API_TOKEN!
  })

  const emailTask = (async () => {
    try {
      const keys = await emailService.getEmailKeys()
      const results: any[] = []
      for (const key of keys) {
        const mail = await emailService.fetchAndParseEmail(key)
        if (mail?.text) {
          results.push({
            title: mail.subject,
            url: `email://${key}`,
            source: 'Newsletter / 电子报',
            collectedAt: new Date().toISOString(),
            preFetchedContent: mail.text,
            isEmail: true
          })
          keysToDelete.push(key)
        }
      }
      return results
    } catch (e) {
      console.error('  邮件抓取失败:', e)
      return []
    }
  })()

  // 并发抓取：邮件 + CLS + 华尔街见闻 + 财新 + Yahoo + GitHub + HackerNews + Aivalley
  const [emailHeadlines, cls, ws, cx, yahoo, github, hackernews, aivalley] = await Promise.allSettled([
    emailTask,
    fetchCLSHeadlines(),
    fetchWallstreetHeadlines(),
    fetchCaixinGlobalHeadlines(),
    fetchYahooFinanceDetailed(),
    fetchGithubTrendingHeadlines(),
    fetchHackerNewsHeadlines(),
    fetchAivalleyHeadlines()
  ])

  const allHeadlines = [
    ...(emailHeadlines.status === 'fulfilled' ? emailHeadlines.value : []),
    ...(cls.status === 'fulfilled' ? cls.value : []),
    ...(ws.status === 'fulfilled' ? ws.value : []),
    ...(cx.status === 'fulfilled' ? cx.value : []),
    ...(yahoo.status === 'fulfilled' ? yahoo.value : []),
    ...(hackernews.status === 'fulfilled' ? hackernews.value : []),
    ...(aivalley.status === 'fulfilled' ? aivalley.value : []),
  ]

  if (github.status === 'fulfilled') {
    githubTrendingData = github.value
  }

  console.log(`✅ 抓取完成 | 邮件: ${emailHeadlines.status === 'fulfilled' ? emailHeadlines.value.length : 0} | CLS: ${cls.status === 'fulfilled' ? cls.value.length : 0} | 华尔街见闻: ${ws.status === 'fulfilled' ? ws.value.length : 0} | 财新: ${cx.status === 'fulfilled' ? cx.value.length : 0} | Yahoo: ${yahoo.status === 'fulfilled' ? yahoo.value.length : 0} | HackerNews: ${hackernews.status === 'fulfilled' ? hackernews.value.length : 0} | GitHub: ${githubTrendingData.length} | Aivalley: ${aivalley.status === 'fulfilled' ? aivalley.value.length : 0} 条`)

  // 上传 GitHub 原始趋势快照
  if (githubTrendingData.length > 0) {
    await saveDataToR2('github_trending.json', githubTrendingData)
  }

  if (allHeadlines.length === 0 && githubTrendingData.length === 0) {
    console.log('🛑 没有抓到任何有效数据，流控提前结束')
    return
  }

  // ==================== 2. 构建 AI 分析上下文 ====================
  console.log('🚀 2. 构建 AI 分析上下文...')
  const existingCategories = await getCategoriesFromR2()
  const allHistory = await getFullHistoryFromR2()
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
  const recentTitles = allHistory
    .filter((a: any) => a.collectedAt && new Date(a.collectedAt).getTime() > threeDaysAgo)
    .map((a: any) => a.title)
    .filter(Boolean)
    .slice(-30)
  console.log(`   📚 分类池: ${existingCategories.length} 个 | 近期文章: ${recentTitles.length} 条`)

  const analysisCtx: AnalysisContext = {
    categories: existingCategories,
    recentArticleTitles: recentTitles,
  }

  // ==================== 3. 并发 AI 分析 ====================
  console.log(`🚀 3. 并发分析 ${allHeadlines.length} 条头条...`)

  const limit = pLimit(CONFIG.aiConcurrency)
  const processTasks = allHeadlines.map(headline =>
    limit(() => processArticle(headline, DASHSCOPE_API_KEY, analysisCtx))
  )
  const results = await Promise.all(processTasks)

  // 展开数组（Aivalley Newsletter 会返回多篇文章）
  const articles = results.flat()

  console.log(`✅ AI 全局分析完成，共收纳 ${articles.length} 条多维结构化情报`)
  if (githubTrendingData.length > 0) {
    console.log(`🚀 3.5 处理 ${githubTrendingData.length} 个 GitHub Trending 项目...`)
    const githubLimit = pLimit(Math.min(CONFIG.aiConcurrency, 2))

    const githubTasks = githubTrendingData.map(item =>
      githubLimit(async () => {
        try {
          const result = await processArticle(item, DASHSCOPE_API_KEY, analysisCtx)
          result.isGithubTrending = true
          return result
        } catch (e: any) {
          return {
            ...createFallbackIntelligence(item, e.message),
            category: '开源项目',
            importance: 5,
            keywords: ['github', 'trending'],
            isGithubTrending: true
          }
        }
      })
    )
    const githubArticles = await Promise.all(githubTasks)
    articles.push(...githubArticles)
  }

  console.log(`✅ AI 全局分析完成，共收纳 ${articles.length} 条多维结构化情报`)

  // ==================== 4. 简报组织与音频合成 ====================
  console.log('🚀 4. 生成简报、播客和音频...')
  const today = new Date().toISOString().slice(0, 10)

  let briefing = ''
  let script = ''
  let audioUrl = ''
  try {
    briefing = await generateDailyBriefing(articles, DASHSCOPE_API_KEY)
    script = await generatePodcastScript(briefing, DASHSCOPE_API_KEY)

    const cacheDir = path.resolve(process.cwd(), '.cache')
    fs.mkdirSync(cacheDir, { recursive: true })

    fs.writeFileSync(path.join(cacheDir, 'daily_briefing.md'), briefing, 'utf-8')
    fs.writeFileSync(path.join(cacheDir, 'podcast_script.md'), script, 'utf-8')

    // 保存简报到 KV（供前端读取）
    await kvPut(`brief:${today}`, JSON.stringify({
      date: today,
      briefing,
      script,
      audioUrl: '',
      generatedAt: new Date().toISOString(),
    }))
    console.log(`   ✅ 简报已保存到 KV: brief:${today}`)

    // TTS 合成（MiniMax TTS，无需代理）
    try {
      audioUrl = await synthesizeAudio(script, today, { retainLocal: false })
      console.log(`🎉 离线音频 TTS 合成成功: ${audioUrl}`)
    } catch (e: any) {
      console.warn(`   ⚠️ TTS 失败: ${e.message}`)
    }
  } catch (e: any) {
    console.error(`   ❌ 简报/音频合成阶段发生异常: ${e.message}`)
  }

  // ==================== 5. 存储落地 ====================
  let storageSuccess = false
  console.log('🚀 5. 存储情报账本并触发 30 天生命周期检查...')
  try {
    await saveIntelligenceToR2(today, articles)
    await updateAndCleanHistoryInR2(articles)
    storageSuccess = true
    console.log('   ✅ 今日快照落库成功，且历史大账本已完成 30 天智能过期清理')
  } catch (e: any) {
    console.error(`   ❌ 数据云落库失败: ${e.message}`)
  }

  // ==================== 6. 分类账本自动对齐 ====================
  if (storageSuccess) {
    try {
      const latestCategories = await getCategoriesFromR2()
      const categorySet = new Set(latestCategories)
      const newCategoriesDetected: string[] = []

      for (const article of articles) {
        if (article.category && !categorySet.has(article.category)) {
          categorySet.add(article.category)
          newCategoriesDetected.push(article.category)
        }
      }

      if (newCategoriesDetected.length > 0) {
        console.log(`💡 [分类自动同步] 检测到 AI 创造了新分类: [${newCategoriesDetected.join(', ')}]`)
        await saveCategoriesToR2(Array.from(categorySet))
        console.log(`   ✅ 成功将新分类同步至云端 data/categories.json`)
      } else {
        console.log(`   ℹ️ 今日分类未越界，总数维持在 ${categorySet.size} 个`)
      }
    } catch (catError: any) {
      console.error(`   ⚠️ 分类总账本同步失败: ${catError.message} (不影响主流程)`)
    }
  }

  // ==================== 7. 事务清理 ====================
  if (storageSuccess) {
    if (keysToDelete.length > 0) {
      console.log(`🧹 正在清理 ${keysToDelete.length} 封已安全搬运的 KV 原始邮件...`)
      for (const key of keysToDelete) {
        await emailService.deleteEmail(key).catch(e => console.error(`  删除邮件 ${key} 失败:`, e))
      }
    }
  } else {
    console.warn(`⚠️ 警告: 因数据落库 R2 未完全成功，系统自动挂起并保留 KV 邮件以供重试！`)
  }

  // ==================== 8 & 9. 复盘 + 记忆系统 ====================
  // 注意：复盘和记忆系统由 evening 模式单独跑（每晚 22:00 北京时间）
  // morning 模式只负责抓取新闻 + 生成简报

  console.timeEnd('总耗时')
  console.log('✅ Pipeline 全链路执行完毕！')
}

run().catch(error => {
  console.error('❌ Pipeline 致命性崩溃:', error)
  process.exit(1)
})
