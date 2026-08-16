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
import { fetchHnDiscussions } from './hnrss.js'
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

// 使用北京时间日期（UTC+8），确保 UTC 23:00 = 北京 07:00 时日期正确
function getBeijingDate(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ====================== 运行模式 ======================
// PIPELINE_MODE=morning（默认）：完整流程（抓取→简报→复盘→记忆）
// PIPELINE_MODE=evening：只跑复盘 + 记忆系统
//   - 复盘日期由 REVIEW_DATE 指定（格式 YYYY-MM-DD），不指定则用当天日期
const PIPELINE_MODE = process.env.PIPELINE_MODE || 'morning'
const REVIEW_DATE = process.env.REVIEW_DATE || null

// ====================== 环境变量校验 ======================
const AI_API_KEY: string = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY || ''
if (!AI_API_KEY) {
  console.error('❌ 缺少 AI API Key：请设置 AI_API_KEY 或 DEEPSEEK_API_KEY')
  process.exit(1)
}

// ====================== 失败占位工厂 ======================
function createFallbackIntelligence(headline: any, errorMessage: string): ArticleIntelligence {
  // 根据错误类型给出更友好的提示
  let friendlyError = errorMessage;
  if (errorMessage.includes('Timeout') || errorMessage.includes('超时')) {
    friendlyError = '分析耗时过长，可能是内容较复杂。建议直接访问原文阅读。';
  } else if (errorMessage.includes('403') || errorMessage.includes('验证') || errorMessage.includes('Cloudflare') || errorMessage.includes('CF')) {
    friendlyError = '原文受 Cloudflare 保护无法自动抓取，需手动访问。';
  } else if (errorMessage.includes('fetch') || errorMessage.includes('抓取') || errorMessage.includes('connect')) {
    friendlyError = '原文页面暂时无法访问，可能是网络限制或网站反爬。';
  }
  return {
    title: headline.title || '未知标题',
    url: headline.url || '',
    source: headline.source || 'Unknown',
    collectedAt: headline.collectedAt || new Date().toISOString(),
    summary: `${headline.title || '本文'}（${friendlyError}）`,
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
// 返回值增加一个标记，区分真正分析成功 vs fallback 占位
type ProcessResult = { data: any | any[]; failedHeadline?: any };

async function processArticle(
  headline: any,
  apiKey: string,
  ctx?: AnalysisContext
): Promise<ProcessResult> {
  try {
    const contentData = await fetchArticleContent(headline)
    const result = await analyzeArticle(contentData, apiKey, ctx)
    // Newsletter 可能返回数组（多篇文章）
    if (Array.isArray(result)) {
      const data = result.map((item: any) => {
        if (headline.isUserAdded) item.isUserAdded = true;
        return item;
      });
      return { data }
    }
    if (headline.isUserAdded) result.isUserAdded = true
    return { data: result }
  } catch (error: any) {
    console.warn(`⚠️ [失败占位] ${headline.title?.slice(0, 30)}... | ${error.message}`)
    return { data: createFallbackIntelligence(headline, error.message), failedHeadline: headline }
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
      await generateDailyReport(reviewDate, AI_API_KEY)
      console.log('   ✅ 每日复盘报告已生成')
    } catch (e: any) {
      console.error(`   ⚠️ 报告生成失败: ${e.message}`)
    }

    try {
      console.log('🚀 记忆系统处理...')
      await runMemoryPipeline(reviewDate, AI_API_KEY)
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

  // 并发抓取：邮件 + CLS + 华尔街见闻 + 财新 + Yahoo + GitHub + Aivalley
  // 注意：Hacker News 已移到独立的「人们正在讨论」页面，不再进入内容库
  const [emailHeadlines, cls, ws, cx, yahoo, github, aivalley] = await Promise.allSettled([
    emailTask,
    fetchCLSHeadlines(),
    fetchWallstreetHeadlines(),
    fetchCaixinGlobalHeadlines(),
    fetchYahooFinanceDetailed(),
    fetchGithubTrendingHeadlines(),
    fetchAivalleyHeadlines()
  ])

  const allHeadlines = [
    ...(emailHeadlines.status === 'fulfilled' ? emailHeadlines.value : []),
    ...(cls.status === 'fulfilled' ? cls.value : []),
    ...(ws.status === 'fulfilled' ? ws.value : []),
    ...(cx.status === 'fulfilled' ? cx.value : []),
    ...(yahoo.status === 'fulfilled' ? yahoo.value : []),
    ...(aivalley.status === 'fulfilled' ? aivalley.value : []),
  ]

  if (github.status === 'fulfilled') {
    githubTrendingData = github.value
  }

  console.log(`✅ 抓取完成 | 邮件: ${emailHeadlines.status === 'fulfilled' ? emailHeadlines.value.length : 0} | CLS: ${cls.status === 'fulfilled' ? cls.value.length : 0} | 华尔街见闻: ${ws.status === 'fulfilled' ? ws.value.length : 0} | 财新: ${cx.status === 'fulfilled' ? cx.value.length : 0} | Yahoo: ${yahoo.status === 'fulfilled' ? yahoo.value.length : 0} | GitHub: ${githubTrendingData.length} | Aivalley: ${aivalley.status === 'fulfilled' ? aivalley.value.length : 0} 条`)

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
    limit(() => processArticle(headline, AI_API_KEY, analysisCtx))
  )
  const firstRoundResults = await Promise.all(processTasks)

  // 区分成功 vs 失败，收集失败 headline 用于重试
  const failedHeadlines: any[] = []
  const articles: any[] = []
  firstRoundResults.forEach(r => {
    if (r.failedHeadline) failedHeadlines.push(r.failedHeadline)
    articles.push(...(Array.isArray(r.data) ? r.data : [r.data]))
  })

  console.log(`✅ AI 首轮分析完成: ${articles.length - failedHeadlines.length} 篇成功, ${failedHeadlines.length} 篇失败（将进入重试队列）`)

  // 启动失败重试队列（不阻塞主流程，在后台等 5 分钟后重试）
  // 重试成功后把 fallback 替换为真实分析结果
  const retryPromise = (async () => {
    if (failedHeadlines.length === 0) return
    console.log(`⏳ [重试队列] ${failedHeadlines.length} 篇文章将在 5 分钟后重试...`)
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000))

    console.log(`🔁 [重试队列] 开始重试 ${failedHeadlines.length} 篇失败文章...`)
    const retryLimit = pLimit(CONFIG.aiConcurrency)
    const retryResults = await Promise.all(
      failedHeadlines.map(h => retryLimit(() => processArticle(h, AI_API_KEY, analysisCtx)))
    )

    let replaced = 0
    retryResults.forEach((r, idx) => {
      if (!r.failedHeadline) {
        replaced++
        const fresh = Array.isArray(r.data) ? r.data : [r.data]
        // 用标题+来源定位并替换 fallback
        fresh.forEach((item: any) => {
          const fallbackIdx = articles.findIndex(a =>
            a.title === failedHeadlines[idx].title &&
            a.source === (failedHeadlines[idx].source || (Array.isArray(r.data) ? r.data[0]?.source : r.data?.source)) &&
            a.summary?.startsWith(failedHeadlines[idx].title || '')
          )
          if (fallbackIdx >= 0) {
            articles.splice(fallbackIdx, 1, ...fresh)
          } else {
            articles.push(...fresh)
          }
        })
        console.log(`   ✅ 重试成功: ${failedHeadlines[idx].title?.slice(0, 40)}`)
      } else {
        console.log(`   ❌ 仍然失败: ${failedHeadlines[idx].title?.slice(0, 40)}`)
      }
    })

    console.log(`🔁 [重试队列] 完成: ${replaced}/${failedHeadlines.length} 篇重试成功，当前共 ${articles.length} 篇`)
  })().catch(e => console.warn(`⚠️ [重试队列] 执行异常: ${e.message}`))

  console.log(`✅ AI 全局分析完成，共收纳 ${articles.length} 条多维结构化情报（含 ${failedHeadlines.length} 个待重试占位）`)

  if (githubTrendingData.length > 0) {
    console.log(`🚀 3.5 处理 ${githubTrendingData.length} 个 GitHub Trending 项目...`)
    const githubLimit = pLimit(Math.min(CONFIG.aiConcurrency, 2))

    const githubTasks = githubTrendingData.map(item =>
      githubLimit(async () => {
        const { data } = await processArticle(item, AI_API_KEY, analysisCtx)
        const arr = Array.isArray(data) ? data : [data]
        arr.forEach((a: any) => {
          a.isGithubTrending = true
          a.category = a.category || '开源项目'
          a.importance = a.importance || 5
          a.keywords = Array.isArray(a.keywords) ? [...new Set([...a.keywords, 'github', 'trending'])] : ['github', 'trending']
        })
        return arr
      })
    )
    const githubArticles = (await Promise.all(githubTasks)).flat()
    articles.push(...githubArticles)
  }

  console.log(`✅ AI 全局分析完成，共收纳 ${articles.length} 条多维结构化情报`)

  const today = getBeijingDate();

  // ==================== 3.6 抓取 HN 热门讨论 ====================
  console.log('🚀 3.6 抓取 HN 热门讨论（人们正在讨论）...')
  let hnDiscussions: any[] = []
  try {
    hnDiscussions = await fetchHnDiscussions(AI_API_KEY, 10)
    // 存到 R2 供前端读取
    await saveDataToR2(`hn_discussions/${today}.json`, {
      date: today,
      discussions: hnDiscussions,
      fetchedAt: new Date().toISOString(),
    })
    console.log(`   ✅ HN 讨论已保存 (${hnDiscussions.length} 条)`)
  } catch (e: any) {
    console.warn(`   ⚠️ HN 讨论抓取失败: ${e.message}`)
  }

  // ==================== 4. 生成简报、播客脚本、TTS ====================
  // 在生成简报前，先等一下重试队列（如果它还在等 5 分钟的话）
  // 注意：如果 failedHeadlines 为空，retryPromise 会立即 resolve，不影响性能
  console.log('🚀 4. 生成简报、播客脚本、TTS...')
  try {
    console.log('   ⏳ 等待重试队列完成（最多等 5 分钟）...')
    await retryPromise
    console.log(`   ✅ 重试队列已结束，当前共 ${articles.length} 篇`)
  } catch (e: any) {
    console.warn(`   ⚠️ 重试队列异常: ${e.message}`)
  }

  let briefing = ''
  let script = ''
  let audioUrl = ''
  try {
    briefing = await generateDailyBriefing(articles, AI_API_KEY)
    script = await generatePodcastScript(briefing, AI_API_KEY)

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
