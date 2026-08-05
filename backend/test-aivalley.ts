/**
 * 本地测试 Aivalley 抓取
 * 需要代理才能访问 theaivalley.com
 *
 * 运行: npx tsx test-aivalley.ts
 */

import axios from 'axios'
import { load } from 'cheerio'
import HttpsProxyAgent from 'https-proxy-agent'
import fs from 'fs'

const BASE_URL = 'https://www.theaivalley.com'

// 代理地址（根据你的代理软件修改）
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7890'
const proxyAgent = HttpsProxyAgent(proxyUrl)

// 提取 Newsletter 中某个区域的内容
function extractSection(html: string, sectionName: string, nextSections: string[]): string {
  const sectionRegex = new RegExp(
    `<[^>]*>\\s*${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/[^>]*>`,
    'i'
  )

  let sectionStart = -1
  const match = html.match(sectionRegex)
  if (match && match.index !== undefined) {
    sectionStart = match.index + match[0].length
  } else {
    const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const looseRegex = new RegExp(escaped, 'i')
    const looseMatch = html.match(looseRegex)
    if (looseMatch && looseMatch.index !== undefined) {
      sectionStart = looseMatch.index + looseMatch[0].length
    }
  }

  if (sectionStart === -1) return ''

  let sectionEnd = html.length
  for (const next of nextSections) {
    const nextRegex = new RegExp(next.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const nextMatch = html.slice(sectionStart).match(nextRegex)
    if (nextMatch && nextMatch.index !== undefined) {
      const nextPos = sectionStart + nextMatch.index
      if (nextPos < sectionEnd) sectionEnd = nextPos
    }
  }

  const rawHtml = html.slice(sectionStart, sectionEnd)

  return rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2: $1') // 链接 → 文字: URL
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

async function test() {
  console.log('=== 测试 Aivalley 抓取（按区域切分）===')
  console.log(`使用代理: ${proxyUrl}\n`)

  try {
    // Step 1: 获取 archive
    console.log('1. 抓取 archive 页面...')
    const archiveRes = await axios.get(`${BASE_URL}/archive`, {
      timeout: 30000,
      httpsAgent: proxyAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    let $ = load(archiveRes.data)

    // 找第一个 /p/ 链接
    let latestNewsletterUrl: string | null = null
    $('a[href*="/p/"]').each((_, el) => {
      if (latestNewsletterUrl) return
      const href = $(el).attr('href')
      if (!href || !href.match(/^\/p\/[a-z0-9-]+$/)) return
      latestNewsletterUrl = `${BASE_URL}${href}`
      return false
    })

    if (!latestNewsletterUrl) {
      console.log('❌ 未找到最新一期 Newsletter')
      console.log('页面内容（前 1000 字）:', $('body').text().slice(0, 1000))
      return
    }
    console.log(`✅ 最新一期: ${latestNewsletterUrl}\n`)

    // Step 2: 抓取 Newsletter 全文
    console.log('2. 抓取 Newsletter 内容...')
    const newsletterRes = await axios.get(latestNewsletterUrl, {
      timeout: 30000,
      httpsAgent: proxyAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const fullHtml = newsletterRes.data

    // Step 3: 按区域切分
    console.log('3. 按区域切分内容...')

    const throughTheValley = extractSection(fullHtml, 'THROUGH THE VALLEY', ['TRENDING TOOLS', "WHAT I'M CONSUMING", 'THE VALLEY GEMS'])
    const trendingTools = extractSection(fullHtml, 'TRENDING TOOLS', ["WHAT I'M CONSUMING", 'THE VALLEY GEMS'])
    const whatImConsuming = extractSection(fullHtml, "WHAT I'M CONSUMING", ['THE VALLEY GEMS'])
    const valleyGems = extractSection(fullHtml, 'THE VALLEY GEMS', ['THAT’S ALL FOR TODAY', "THAT'S ALL FOR TODAY", 'Thank you for reading'])

    console.log(`   THROUGH THE VALLEY: ${throughTheValley.length} 字`)
    console.log(`   TRENDING TOOLS: ${trendingTools.length} 字`)
    console.log(`   WHAT I'M CONSUMING: ${whatImConsuming.length} 字`)
    console.log(`   THE VALLEY GEMS: ${valleyGems.length} 字\n`)

    // Step 4: 输出各区域内容
    if (throughTheValley) {
      console.log('\n=== THROUGH THE VALLEY (前 500 字) ===')
      console.log(throughTheValley.slice(0, 500))
    }

    if (trendingTools) {
      console.log('\n=== TRENDING TOOLS (前 500 字) ===')
      console.log(trendingTools.slice(0, 500))
    }

    if (whatImConsuming) {
      console.log("\n=== WHAT I'M CONSUMING (前 500 字) ===")
      console.log(whatImConsuming.slice(0, 500))
    }

    if (valleyGems) {
      console.log('\n=== THE VALLEY GEMS (前 500 字) ===')
      console.log(valleyGems.slice(0, 500))
    }

    // Step 5: 拼接成给 AI 的结构化文本
    const sections: string[] = []
    if (throughTheValley) sections.push(`## THROUGH THE VALLEY（深度分析）\n\n${throughTheValley}`)
    if (trendingTools) sections.push(`## TRENDING TOOLS（热门工具）\n\n${trendingTools}`)
    if (whatImConsuming) sections.push(`## WHAT I'M CONSUMING（我在消费）\n\n${whatImConsuming}`)
    if (valleyGems) sections.push(`## THE VALLEY GEMS（精选链接）\n\n${valleyGems}`)

    const structuredContent = sections.join('\n\n---\n\n')

    // 保存到文件
    fs.mkdirSync('.cache', { recursive: true })
    fs.writeFileSync('.cache/aivalley-test.txt', structuredContent.slice(0, 12000))
    console.log('\n✅ 结构化内容已保存到 .cache/aivalley-test.txt')

  } catch (error: any) {
    console.log(`\n❌ 错误: ${error.message}`)
    if (error.response) {
      console.log(`   状态码: ${error.response.status}`)
    }
    console.log('\n请检查:')
    console.log('1. 代理软件是否已打开')
    console.log('2. 代理地址是否正确（默认 http://127.0.0.1:7890）')
    console.log('3. 或设置环境变量后运行')
  }
}

test()
