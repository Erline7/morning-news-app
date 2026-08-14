/**
 * 每日复盘报告生成模块（后端）
 * 职责：从 KV 读取聊天记录和笔记 → 调 AI 生成报告 → 存回 KV
 */

import { kvGet, kvPut } from './utils.js';

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
  const chatMessages = await kvGet(chatKey, 'json') || [];
  const userQuestions = (chatMessages as any[])
    .filter((m: any) => m.role === 'user')
    .map((m: any) => m.content);

  // 2. 获取当天笔记
  const notes = await kvGet('notes:board', 'json') || [];
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
  await kvPut(`report:${date}`, JSON.stringify(fullReport));
  console.log(`[Report] ✅ 报告已保存到 report:${date}`);

  return fullReport;
}

/**
 * 获取每日复盘报告（供前端/Worker 读取）
 */
export async function getDailyReport(date: string): Promise<DailyReport | null> {
  return await kvGet(`report:${date}`, 'json');
}
