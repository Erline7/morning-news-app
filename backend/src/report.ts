/**
 * 每日复盘报告生成模块（后端）
 * 职责：从 KV 读取聊天记录和笔记 → 调 AI 生成报告 → 存回 KV
 */

// 远程 KV API 读写（通过 Cloudflare API）
const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}`

async function kvRemoteGet(key: string, type: string = 'text'): Promise<any> {
  try {
    const res = await fetch(`${KV_BASE}/values/${key}`, {
      headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }
    })
    if (!res.ok) return null
    if (type === 'json') return await res.json()
    return await res.text()
  } catch {
    return null
  }
}

async function kvRemotePut(key: string, value: string): Promise<void> {
  const res = await fetch(`${KV_BASE}/values/${key}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/octet-stream'
    },
    body: value
  })
  if (!res.ok) {
    throw new Error(`KV 写入失败: ${res.status}`)
  }
}

/**
 * 每日复盘报告结构
 */
export interface DailyReport {
  date: string;
  summary: string;
  thinkingAxis: string[];
  coreThemes: string[];
  questionCount: number;
  noteCount: number;
  insight: string;
  tomorrowSuggestion: string;
  generatedAt?: string;
}

/**
 * 生成每日复盘报告（由 runner.ts 在每天 pipeline 结束时调用）
 */
export async function generateDailyReport(date: string, apiKey: string): Promise<DailyReport> {
  console.log(`[Report] 正在生成 ${date} 的每日复盘...`);

  // 1. 获取当天聊天记录
  const chatKey = `chat-history:${date}`;
  const chatMessages = await kvRemoteGet(chatKey, 'json') || [];
  const userQuestions = (chatMessages as any[])
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m.content);

  // 2. 获取当天笔记
  const notes = await kvRemoteGet('notes:board', 'json') || [];
  const todayNotes = (notes as any[]).filter((n: any) => n.createdAt?.startsWith(date));

  console.log(`[Report] 读取到 ${userQuestions.length} 条提问, ${todayNotes.length} 条笔记`);

  // 3. 调 AI 生成
  const { generateDailyReportAi } = await import('./ai.js');
  const report = await generateDailyReportAi(userQuestions, todayNotes, date, apiKey);

  // 4. 补充元数据
  const fullReport: DailyReport = {
    ...report,
    date,
    questionCount: userQuestions.length,
    noteCount: todayNotes.length,
    generatedAt: new Date().toISOString(),
  };

  // 5. 保存到 KV
  await kvRemotePut(`report:${date}`, JSON.stringify(fullReport));
  console.log(`[Report] ✅ 报告已保存到 report:${date}`);

  return fullReport;
}

/**
 * 获取每日复盘报告（供前端/Worker 读取）
 */
export async function getDailyReport(date: string): Promise<DailyReport | null> {
  return await kvRemoteGet(`report:${date}`, 'json');
}
