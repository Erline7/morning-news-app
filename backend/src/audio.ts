import fs from 'fs/promises';
import { execFile } from 'child_process';
import util from 'util';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const execFileAsync = util.promisify(execFile);

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

async function generateSpeech(text: string): Promise<Buffer> {
  const encodedText = encodeURIComponent(text.substring(0, 200));
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=zh-CN&client=tw-ob`;

  await fs.mkdir('.cache/tts', { recursive: true });
  const tempFile = `.cache/tts/temp-${Date.now()}.mp3`;

  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7897';

  await execFileAsync('curl', [
    '-x', proxy,
    '-o', tempFile,
    '-s',
    '-H', 'User-Agent: Mozilla/5.0',
    url,
  ]);

  const buffer = await fs.readFile(tempFile);
  await fs.rm(tempFile, { force: true });

  return buffer;
}

export async function synthesizeAudio(
  text: string,
  date: string,
  options?: {
    maxLength?: number;
    retainLocal?: boolean;
  }
): Promise<string> {
  const maxLength = options?.maxLength ?? 0;
  const retainLocal = options?.retainLocal ?? false;

  console.log('   🎙️ [TTS] 正在合成语音...');

  let safeText = text;
  if (maxLength > 0 && text.length > maxLength) {
    safeText = text.substring(0, maxLength) + '。（完整版请查看文字稿）';
  }

  await fs.mkdir('.cache/tts', { recursive: true });
  const outputFile = `.cache/tts/${date}.mp3`;

  try {
    const audioBuffer = await generateSpeech(safeText);
    console.log(`   ✅ TTS 合成完成，大小: ${(audioBuffer.length / 1024).toFixed(1)} KB`);

    await fs.writeFile(outputFile, audioBuffer);

    const key = `podcast/${date}.mp3`;
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    }));
    console.log(`   📤 已上传至 R2: ${key}`);

    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (publicUrl) {
      return `${publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return key;
  } catch (error: any) {
    throw new Error(`TTS 失败: ${error.message}`);
  } finally {
    if (!retainLocal) {
      await fs.rm(outputFile, { force: true }).catch(() => {});
    }
  }
}
