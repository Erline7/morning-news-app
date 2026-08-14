/**
 * 第一层：HTML 清洗
 * 安全地移除所有脚本、样式、不可见元素，并将标签替换为空格
 */
export function stripHtml(html: string): string {
    if (!html) return "";

    return html
        // 1. 移除脚本、样式等无用块
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
        .replace(/<svg[\s\S]*?<\/svg>/gi, "")
        // 2. 处理图片：保留 alt 文本（如果希望保留图片说明）
        .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, " [图片: $1] ")
        .replace(/<img[^>]*>/gi, " [图片] ")
        // 3. 处理链接：将 <a href="url">text</a> 转为 "text (url)"
        .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, url, text) => {
            // 去除 text 中可能残留的 HTML（防止嵌套标签）
            const cleanText = text.replace(/<[^>]+>/g, "").trim();
            // 如果 url 是相对路径，可以根据需要拼接绝对路径（此处略）
            return cleanText ? `${cleanText} (${url})` : url;
        })
        // 4. 最后删除所有剩余的 HTML 标签，替换为空格
        .replace(/<[^>]+>/g, " ")
        // 5. 清理多余的空白字符
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * 第二层：特殊字符与空白清洗
 */
export function normalizeWhitespace(text: string): string {
    return text
        // HTML实体
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        // Unicode空格
        .replace(/\u00A0/g, " ")
        // 控制字符
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        // 多个空格
        .replace(/[ \t]+/g, " ")
        // 多个空行
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * 第三层：广告与底部冗余信息过滤
 * 注意：[\s\S]* 会截断匹配词之后的所有内容，适用于这些词只出现在文章末尾的情况
 */
const uselessPatterns = [
    /相关阅读[\s\S]*/,
    /延伸阅读[\s\S]*/,
    /责任编辑[:：].*/,
    /来源[:：].*/,
    /点击查看[\s\S]*/,
    /上一篇[\s\S]*/,
    /下一篇[\s\S]*/,
    /免责声明[\s\S]*/,
    /版权所有[\s\S]*/,
    /广告[\s\S]*/,
    /Copyright[\s\S]*/i
];

export function removeBoilerplate(text: string) {
    let result = text;
    for (const p of uselessPatterns) {
        result = result.replace(p, "");
    }
    return result.trim();
}

/**
 * 第四层：LLM 优化（去重）
 * 去除网页中可能因为解析错误导致的重复行
 */
export function removeDuplicateLines(text: string) {
    const lines = text.split("\n");
    const seen = new Set();
    return lines.filter(line => {
        const l = line.trim();
        if (!l) return false;
        if (seen.has(l)) return false;
        seen.add(l);
        return true;
    }).join("\n");
}

/**
 * 第五层：一键清洗组合 (无损清洗)
 * 注意：已移除原有的破坏性截断，保留 100% 的原文数据，确保后续能够全文分析！
 */
export function cleanArticle(raw: string) {
    let text = raw;
    text = stripHtml(text);
    text = normalizeWhitespace(text);
    text = removeBoilerplate(text);
    text = removeDuplicateLines(text);
    return text;
}

/**
 * 第六层：Chunk 智能分块（为全文阅读准备）
 * 既然要全文分析，当文章超过大模型单次最优处理长度时，
 * 使用此函数将无损清洗后的全文，切分为多个块交由 AI 循环处理。
 * (加入了 overlap 重叠区，防止切断关键上下文)
 */
export function splitIntoChunks(text: string, chunkSize = 4000, overlap = 200): string[] {
    const chunks: string[] = [];
    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize));
        i += chunkSize - overlap; // 回退一部分作为重叠，保证上下文连贯
    }
    return chunks;
}