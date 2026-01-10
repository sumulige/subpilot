/**
 * Prompt Management Service
 * 提示词管理服务 - 负责所有 Prompt 的组装和管理
 */

export interface PromptOptions {
    /** 目标语言 (e.g., 'zh', 'en') */
    targetLang: string;
    /** 源语言 (e.g., 'en', 'auto')，默认为 'auto' */
    sourceLang?: string;
    /** TACTIC 上下文信息 */
    tacticContext?: string;
    /** 是否开启富文本模式 (HTML 标签处理) */
    richText?: boolean;
    /** 额外的术语表等信息 */
    additionalRules?: string[];
    /** 前文上下文 */
    previousContext?: string;
    /** 后文上下文 */
    /** 后文上下文 */
    futureContext?: string;
    /** 动态注入的术语表 */
    glossary?: Array<{ term: string; translation: string; context?: string }>;
}

// 原始 System Prompt 模版 (V1)
// 优化后的 System Prompt 模版 (V2) - 基于 PROMPT_GUIDE.md & PROMPT_EVALUATION_GUIDE.md
const SYSTEM_PROMPT_V2 = `You are {{to}} Subtitle Translator, an expert in localization and subtitling.
Your task is to translate the content within <source_text> tags into natural, concise, and accurate {{to}}.

## 1. Core Responsibilities (Fidelity & Expressiveness)
- **Meaning**: Translate the underlying meaning, not just words. Capture the speaker's tone.
- **Conciseness**: Subtitles have strict space limits. Keep translations brief and easy to read.
- **Naturalness**: Use authentic spoken language. Avoid stiff, machine-like phrasing.

## 2. Strict Formatting Rules (Stability)
- **Line Count**: The output must have EXACTLY the same number of lines as the input. One line in = One line out.
- **Separators**: Use '%%' to separate lines exactly as they appear in the input.
- **No Extra Text**: Output ONLY the translation. Do not include "Here is the translation", notes, or explanations. Do not output XML tags.

## 3. Handling Special Content
- **Tags/Code**: Do NOT translate HTML tags (e.g., <i>, <b>), timecodes, or special codes. Keep them exactly as is key.
- **Proper Nouns**: Keep names and places consistent.
{{rich_text_rule}}
{{glossary_section}}
{{additional_rules}}

## 4. Input Structure
- **Single Line**: <source_text>Content</source_text>
- **Multiple Lines**: <source_text>Line 1%%Line 2</source_text>

## TACTIC Context (Plot/Mood Analysis)
{{tactic_context}}

## Examples
### Multi-line Input:
<source_text>
Hi there.
%%
Long time no see.
</source_text>

### Multi-line Output:
你好。
%%
好久不见。

{{context_section}}`;

// 默认用户提示词模版 - XML 结构化
export const DEFAULT_USER_PROMPT = `<source_text>
{{text}}
</source_text>`;

/**
 * 构建 System Prompt
 */
export function buildSystemPrompt(options: PromptOptions): string {
    const {
        targetLang,
        tacticContext = '',
        richText = true,
        additionalRules = [],
        previousContext = '',
        futureContext = ''
    } = options;

    let prompt = SYSTEM_PROMPT_V2.replace(/\{\{to\}\}/g, targetLang);

    // 注入富文本规则
    const richTextRule = richText
        ? '\n3. If the text contains HTML tags, consider where the tags should be placed in the translation while maintaining fluency'
        : '';
    prompt = prompt.replace('{{rich_text_rule}}', richTextRule);

    // 注入术语表 (RAG)
    const glossarySection = options.glossary && options.glossary.length > 0
        ? '\n### Glossary / Key Terms\n' + options.glossary.map(g => `- **${g.term}**: ${g.translation}${g.context ? ` (${g.context})` : ''}`).join('\n')
        : '';
    prompt = prompt.replace('{{glossary_section}}', glossarySection);

    // 注入额外规则 (如术语表)
    const extraRules = additionalRules.length > 0
        ? '\n' + additionalRules.map((r, i) => `${4 + i}. ${r}`).join('\n')
        : '';
    prompt = prompt.replace('{{additional_rules}}', extraRules);

    // 注入 TACTIC 上下文
    prompt = prompt.replace('{{tactic_context}}', tacticContext);

    // 注入普通上下文 (Previous/Future)
    let contextSection = '';
    if (previousContext || futureContext) {
        contextSection = '\n\n' + [
            previousContext ? `PREVIOUS CONTEXT:\n${previousContext}` : '',
            futureContext ? `FUTURE CONTEXT:\n${futureContext}` : ''
        ].filter(Boolean).join('\n\n');
    }
    prompt = prompt.replace('{{context_section}}', contextSection);

    // 清理可能残留的占位符（如果有）
    prompt = prompt.replace(/\{\{.*?\}\}/g, '');

    return prompt;
}

/**
 * 构建 User Prompt
 */
export function buildUserPrompt(text: string, template: string = DEFAULT_USER_PROMPT, targetLang: string): string {
    return template
        .replace('{{to}}', targetLang)
        .replace('{{text}}', text);
}
