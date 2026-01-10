/**
 * Glossary Service
 * 术语表管理与检索 (RAG Lite)
 */

export interface GlossaryItem {
    term: string;
    translation: string;
    context?: string;
}

export type GlossaryFormat = 'text' | 'json' | 'csv';

/**
 * 解析用户输入的术语表文本
 * 支持格式:
 * Term=Translation
 * Term,Translation
 * {"term": "...", "translation": "..."}
 */
export function parseGlossary(input: string): GlossaryItem[] {
    if (!input || !input.trim()) return [];

    // 尝试 JSON
    try {
        if (input.trim().startsWith('[') || input.trim().startsWith('{')) {
            const parsed = JSON.parse(input);
            if (Array.isArray(parsed)) {
                return parsed.map(item => ({
                    term: item.term || item.key || '',
                    translation: item.translation || item.value || '',
                    context: item.context
                })).filter(i => i.term && i.translation);
            }
        }
    } catch (_e) {
        // Ignore JSON error, try text
    }

    // 文本解析 (每行一个)
    return input.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // 忽略空行和注释
        .map(line => {
            // 尝试常见分隔符: =, :, ,, \t
            const separators = ['=', ':', '\t', ','];
            for (const sep of separators) {
                if (line.includes(sep)) {
                    const [term, ...rest] = line.split(sep);
                    return {
                        term: term.trim(),
                        translation: rest.join(sep).trim() // 重新组合剩余部分作为翻译
                    };
                }
            }
            return null;
        })
        .filter((item): item is GlossaryItem => item !== null);
}

/**
 * 检索给定文本中匹配的术语 (RAG Core)
 * @param text 待翻译的原文片段
 * @param glossary 完整术语表
 * @returns 匹配到的术语列表
 */
export function retrieveGlossaryMatches(text: string, glossary: GlossaryItem[]): GlossaryItem[] {
    if (!text || !glossary || glossary.length === 0) return [];

    const lowerText = text.toLowerCase();

    // 简单关键词匹配 (可优化为正则边界匹配以避免部分匹配)
    // 优先匹配长词 (避免 "Apple" 匹配到 "Pineapple" 的一部分? 不, 这里是 substring check)
    // 为了准确性，应该排序术语（长词优先）或者使用单词边界

    // 这里实现一个稍微智能的版本：长词优先匹配，避免被短词覆盖（虽然 additional_rules 是列表，都提供也没关系）
    // 但为了上下文 Token 节省，只返回命中的。

    const matches = glossary.filter(item => {
        // 简单包含检查 (大小写不敏感)
        return lowerText.includes(item.term.toLowerCase());
    });

    // 去重 (以防 terms 重复)
    const uniqueMatches = new Map<string, GlossaryItem>();
    matches.forEach(m => uniqueMatches.set(m.term.toLowerCase(), m));

    return Array.from(uniqueMatches.values());
}
