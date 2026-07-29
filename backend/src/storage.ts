import fs from 'fs'
import path from 'path'
import { DailyBriefing } from './types.js'
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const KV_PATH = path.resolve(process.cwd(), '.cache', 'kv.json')

export async function saveBriefingToKV(briefing: DailyBriefing): Promise<void> {
  const existing = fs.existsSync(KV_PATH) ? JSON.parse(fs.readFileSync(KV_PATH, 'utf-8')) : []
  existing.push(briefing)
  fs.mkdirSync(path.dirname(KV_PATH), { recursive: true })
  fs.writeFileSync(KV_PATH, JSON.stringify(existing, null, 2), 'utf-8')
}

function getR2Client() {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("❌ 缺少 R2 客户端配置，请检查你的 .env 文件！");
  }

  return new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 5 // 增加重试次数
  });
}

/**
 * 🎧 上传 MP3 音频到 R2
 */
export async function saveAudioToR2(date: string, audioBuffer: Buffer): Promise<string> {
  const s3 = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const fileName = `podcasts/${date}.mp3`;

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: audioBuffer,
    ContentType: "audio/mpeg",
  }));

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  return publicUrl ? `${publicUrl.replace(/\/$/, '')}/${fileName}` : `r2://${bucketName}/${fileName}`;
}

export async function saveIntelligenceToR2(date: string, data: any): Promise<string> {
  const s3 = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const fileName = `data/${date}.json`; // 存放在 R2 的 data 目录下

  console.log(`   ☁️ [R2] 正在将今日结构化数据上传至 R2...`);
  
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
    ContentType: "application/json; charset=utf-8",
  }));

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  const url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${fileName}` : `r2://${bucketName}/${fileName}`;
  console.log(`   ✅ [R2] 结构化情报上传成功！网页/问答端可用連結: ${url}`);
  return url;
}

export async function getFullHistoryFromR2(): Promise<any[]> {
  try {
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
    const response = await fetch(`${publicUrl.replace(/\/$/, '')}/data/history.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log("   ℹ️ 暂无历史数据，将新建 history.json");
  }
  return []; // 如果没找到文件，返回空数组
}

export async function saveFullHistoryToR2(data: any[]): Promise<string> {
  const s3 = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const fileName = `data/history.json`;

  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
    ContentType: "application/json; charset=utf-8",
  }));
  
  return fileName;
}
/**
 * 通用上传函数：将任意数据上传到 R2 的 data 目录
 * @param fileName - 文件名（如 'github_trending.json'）
 * @param data - 要上传的数据（会自动 JSON.stringify）
 * @returns 公开访问 URL
 */
export async function saveDataToR2(fileName: string, data: any): Promise<string> {
  const s3 = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const key = `data/${fileName}`;

  console.log(`   ☁️ [R2] 正在上传 ${fileName} 至 R2...`);
  
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: Buffer.from(JSON.stringify(data, null, 2), 'utf-8'),
    ContentType: "application/json; charset=utf-8",
  }));

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  const url = publicUrl ? `${publicUrl.replace(/\/$/, '')}/${key}` : `r2://${bucketName}/${key}`;
  console.log(`   ✅ [R2] ${fileName} 上传成功！: ${url}`);
  return url;
}

export async function getCategoriesFromR2(): Promise<string[]> {
  try {
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
    const response = await fetch(`${publicUrl}/categories.json`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log("   ℹ️ 暂无分类总账本，将使用初始分类池创建 categories.json");
  }
    return ["人工智能", "宏观经济", "互联网科技", "传统金融", "加密货币", "政策法规", "创业投资"];
}

export async function saveCategoriesToR2(categories: string[]): Promise<string> {
  const s3 = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const fileName = `data/categories.json`;
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: Buffer.from(JSON.stringify(categories, null, 2), 'utf-8'),
    ContentType: "application/json; charset=utf-8",
  }));
  return fileName;
}

export async function updateAndCleanHistoryInR2(newArticles: any[]): Promise<string> {
  const s3 = getR2Client();
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  const fileName = `data/history.json`;

  // 1. 获取老账本
  let existingHistory: any[] = [];
  try {
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
    const response = await fetch(`${publicUrl.replace(/\/$/, '')}/${fileName}`);
    if (response.ok) {
      existingHistory = await response.json();
    }
  } catch (e) {
    console.log("   ℹ️ 暂无历史数据，将新建 history.json");
  }

  // 2. 合并今日新文章（新文章默认设置好收藏初始值）
  const fullList = [...existingHistory, ...newArticles];

  // 3. 核心生命周期过滤算法
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30天对应的毫秒数

  const cleanedHistory = fullList.filter(article => {
    // 💡 规则 A：如果是被标星收藏的文章，铁饭碗，绝对不能删
    if (article.isStarred === true) {
      return true;
    }

    // 💡 规则 B：如果之前收藏了，现在被取消收藏了
    if (article.unstarredAt) {
      const unstarredTime = new Date(article.unstarredAt);
      const msSinceUnstar = now.getTime() - unstarredTime.getTime();
      
      // 检查取消收藏是否超过 30 天
      if (msSinceUnstar > THIRTY_DAYS_MS) {
        console.log(`🗑️ [TTL 过期] 文章已取消收藏满 30 天，自动删除: 《${article.title}》`);
        return false; // 超过 30 天，删除
      }
      return true; // 没满 30 天，继续留存
    }

    // 💡 规则 C：常规文章（从未被收藏过），检查创建时间（collectedAt）
    const collectTime = new Date(article.collectedAt || now.toISOString());
    const msSinceCollect = now.getTime() - collectTime.getTime();

    if (msSinceCollect > THIRTY_DAYS_MS) {
      console.log(`🗑️ [TTL 过期] 常规文章满 30 天未收藏，自动删除: 《${article.title}》`);
      return false; // 满 30 天，删除
    }

    return true; // 30天以内，保留
  });

  console.log(`   📊 [账本净化] 历史总文章数: ${fullList.length} -> 净化保留数: ${cleanedHistory.length}`);

  // 4. 将清洗完的干净账本重新推回 R2
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: Buffer.from(JSON.stringify(cleanedHistory, null, 2), 'utf-8'),
    ContentType: "application/json; charset=utf-8",
  }));
  
  return fileName;
}