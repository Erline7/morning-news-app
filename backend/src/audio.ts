import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as edgeTts from 'edge-tts';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * 将文本合成语音并上传到 R2（使用 edge-tts Node.js 版，纯 Node.js，无 Python 依赖）
 * @param text - 播客脚本全文
 * @param date - 日期标识（如 "2025-01-15"）
 * @param options - 可选配置
 * @returns 公开访问 URL
 */
export async function synthesizeAudio(
  text: string,
  date: string,
  options?: {
    maxLength?: number;        // 最大字符数，0 表示不截断
    voice?: string;            // 语音名称，默认 zh-CN-XiaoxiaoNeural
    retainLocal?: boolean;     // 是否保留本地 MP3 文件，默认 false
  }
): Promise<string> {
  const maxLength = options?.maxLength ?? 0;
  const voice = options?.voice ?? 'zh-CN-XiaoxiaoNeural';
  const retainLocal = options?.retainLocal ?? false;

  console.log('   🎙️ [TTS] 正在调用 edge-tts (Node.js) 合成语音...');

  // 截断过长文本
  let safeText = text;
  if (maxLength > 0 && text.length > maxLength) {
    console.log(`   ⚠️ [TTS] 文案较长（${text.length} 字），截取前 ${maxLength} 字...`);
    safeText = text.substring(0, maxLength) + '。（完整版请查看文字稿）';
  }

  const tempDir = path.resolve(process.cwd(), '.cache', 'tts');
  await fs.mkdir(tempDir, { recursive: true });
  const outputFile = path.join(tempDir, `${date}.mp3`);

  try {
    // 1. 使用 edge-tts Node.js 版合成 MP3（纯 Node.js，无需 Python）
    const tts = new edgeTts.Communicate(safeText, { voice });
    await tts.save(outputFile);

    // 2. 读取生成的 MP3 文件
    const audioBuffer = await fs.readFile(outputFile);
    console.log(`   ✅ TTS 合成完成，大小: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

    // 3. 上传到 R2
    const key = `podcast/${date}.mp3`;
    const command = new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    });
    await r2Client.send(command);
    console.log(`   📤 已上传至 R2: ${key}`);

    // 4. 生成公开访问 URL
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (publicUrl) {
      const url = `${publicUrl.replace(/\/$/, '')}/${key}`;
      console.log(`   🔗 公开链接: ${url}`);
      return url;
    } else {
      console.warn('   ⚠️ 未配置 CLOUDFLARE_R2_PUBLIC_URL');
      return key;
    }

  } catch (error: any) {
    throw new Error(`TTS 失败: ${error.message}`);
  } finally {
    if (!retainLocal) {
      await fs.rm(outputFile, { force: true }).catch(() => {});
    } else {
      console.log(`   💾 本地 MP3 已保留: ${outputFile}`);
    }
  }
}
