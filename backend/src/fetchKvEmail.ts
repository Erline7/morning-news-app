import PostalMime from 'postal-mime'; 

interface CloudflareConfig {
  accountId: string;
  namespaceId: string;
  apiToken: string;
}

export class CloudflareEmailService {
  private config: CloudflareConfig;
  private baseUrl: string;

  constructor(config: CloudflareConfig) {
    this.config = config;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}`;
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`Cloudflare API 错误: ${response.status} ${response.statusText}`);
    }
    return response;
  }

  async getEmailKeys(): Promise<string[]> {
    try {
      const response = await this.fetchApi('/keys?prefix=news:');
      const data = await response.json();
      if (data.success && Array.isArray(data.result)) {
        return data.result.map((item: any) => item.name);
      }
      return [];
    } catch (error) {
      console.error('获取 KV Keys 失败:', error);
      return [];
    }
  }

  async fetchAndParseEmail(key: string) {
    try {
      const response = await this.fetchApi(`/values/${key}`);
      const rawEmail = await response.text();

      const parser = new PostalMime(); // 直接使用默认导入的类
      const parsed = await parser.parse(rawEmail);

      return {
        key,
        subject: parsed.subject || '无标题',
        text: parsed.text || parsed.html || '',
        html: parsed.html || '',
        date: parsed.date ? new Date(parsed.date) : null,
        from: parsed.from?.address || '',
      };
    } catch (error) {
      console.error(`解析邮件 ${key} 失败:`, error);
      return null;
    }
  }

  async deleteEmail(key: string) {
    try {
      await this.fetchApi(`/values/${key}`, { method: 'DELETE' });
      console.log(`🗑️ 已从 KV 中删除: ${key}`);
    } catch (error) {
      console.error(`删除邮件 ${key} 失败:`, error);
    }
  }
}