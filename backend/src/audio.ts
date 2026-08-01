import fs from 'fs/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

/**
 * 使用 MiniMax TTS 同步接口生成语音
 * 文档: https://platform.minimax.io/document/tts
 */
async function generateSpeech(text: string): Promise<Buffer> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error('MINIMAX_API_KEY 未配置');

  const url = 'https://api.minimax.chat/v1/t2a_v2';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'speech-02-hd',
      text: text.substring(0, 5000),
      voice_setting: {
        voice_id: 'female-shaonv',  // 女声
        speed: 1.0,
        vol: 1.0,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        format: 'mp3',
        bitrate: 128000,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MiniMax TTS 返回 ${res.status}: ${err}`);
  }

  const data = await res.json();

  // 成功时返回 base64 编码的音频
  if (data.data?.audio) {
    return Buffer.from(data.data.audio, 'hex');
  }

  // 检查错误
  if (data.base_resp?.status_code !== 0) {
    throw new Error(`MiniMax 错误: ${data.base_resp?.status_msg || '未知错误'}`);
  }

  throw new Error('MiniMax TTS 未返回音频数据');
}

/**
 * 将文本合成语音并上传到 R2
 */
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

  console.log('   🎙️ [TTS] 正在合成语音（MiniMax）...');

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
