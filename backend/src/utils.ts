/**
 * 共享工具函数
 * 提供 parseAiJson、withTimeout、KV 读写、R2 客户端等公共能力
 */

// ====================== AI JSON 解析 ======================

export function parseAiJson(rawText: string): any {
  if (!rawText) return {};

  // 1. 剥除 Markdown 代码块
  let text = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 2. 尝试直接解析
  try { return JSON.parse(text); } catch {}

  // 3. 尝试提取最外层 { ... }（用括号匹配，不用贪婪正则）
  const firstBrace = text.indexOf('{');
  if (firstBrace === -1) {
    console.warn('⚠️ 无法解析 AI 返回的 JSON，未找到 {');
    return {};
  }

  let depth = 0;
  let endPos = -1;
  for (let i = firstBrace; i < text.length; i++) {
    if (text[i] === '{') depth++;
    if (text[i] === '}') depth--;
    if (depth === 0) { endPos = i; break; }
  }

  if (endPos === -1) {
    console.warn('⚠️ 无法解析 AI 返回的 JSON，未找到匹配的 }');
    console.warn('原始内容（前 500 字）：');
    console.warn(text.slice(0, 500));
    return {};
  }

  const candidate = text.slice(firstBrace, endPos + 1).replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(candidate);
  } catch (e: any) {
    console.warn('⚠️ 无法解析 AI 返回的 JSON，原始内容（前 300 字）：');
    console.warn(candidate.slice(0, 300));
    return {};
  }
}

// ====================== 超时包装器 ======================

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// ====================== KV 读写（远程 REST API） ======================

const KV_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CLOUDFLARE_KV_NAMESPACE_ID}`;

export async function kvGet(key: string, type: string = 'text'): Promise<any> {
  try {
    const res = await fetch(`${KV_BASE}/values/${key}`, {
      headers: { 'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }
    });
    if (!res.ok) return null;
    if (type === 'json') return await res.json();
    return await res.text();
  } catch {
    return null;
  }
}

export async function kvPut(key: string, value: string): Promise<void> {
  const res = await fetch(`${KV_BASE}/values/${key}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/octet-stream'
    },
    body: value
  });
  if (!res.ok) {
    throw new Error(`KV 写入失败: ${res.status}`);
  }
}

// ====================== R2 客户端（单例） ======================

import { S3Client } from '@aws-sdk/client-s3';

let _r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2Client) {
    const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('❌ 缺少 R2 客户端配置，请检查 .env 文件');
    }

    _r2Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 5
    });
  }
  return _r2Client;
}
