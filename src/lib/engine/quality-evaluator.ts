/**
 * Quality Evaluator Service
 * LLM-as-Judge 翻译质量评估
 */

import type { Provider } from '@/lib/types';

export interface QualityScore {
    /** 评分 1-10 */
    score: number;
    /** 置信度 */
    confidence: 'high' | 'medium' | 'low';
    /** 发现的问题 */
    issues?: string[];
}

export interface EvaluationResult {
    /** 原文 */
    original: string;
    /** 译文 */
    translated: string;
    /** 评分结果 */
    quality: QualityScore;
    /** 行索引 */
    lineIndex: number;
}

const EVALUATION_PROMPT = `你是翻译质量评估专家。请评估以下翻译的质量。

原文: {original}
译文: {translated}

评估标准:
1. 准确性：译文是否准确传达原文含义
2. 流畅性：译文是否自然流畅
3. 完整性：是否有遗漏或多余内容

请用 JSON 格式回复（不要有其他内容）:
{
  "score": 1-10的数字,
  "confidence": "high"或"medium"或"low",
  "issues": ["问题1", "问题2"]
}`;

/**
 * 评估单条翻译质量
 */
export async function evaluateTranslation(
    original: string,
    translated: string,
    provider: Provider,
    lineIndex: number
): Promise<EvaluationResult> {
    const prompt = EVALUATION_PROMPT
        .replace('{original}', original)
        .replace('{translated}', translated);

    try {
        const result = await provider.translate({
            text: prompt,
            source: 'auto',
            target: 'zh',
            temperature: 0,
        });

        // 解析 JSON 响应
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return createDefaultResult(original, translated, lineIndex, 'parse_error');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            original,
            translated,
            lineIndex,
            quality: {
                score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
                confidence: parsed.confidence || 'medium',
                issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            },
        };
    } catch (error) {
        console.error('[QualityEvaluator] Evaluation failed:', error);
        return createDefaultResult(original, translated, lineIndex, 'api_error');
    }
}

/**
 * 抽样评估批次翻译
 * @param sampleRate 抽样率 (0-1)，默认 0.1 (10%)
 */
export async function evaluateBatch(
    originals: string[],
    translations: string[],
    provider: Provider,
    sampleRate: number = 0.1
): Promise<EvaluationResult[]> {
    const sampleSize = Math.max(1, Math.ceil(originals.length * sampleRate));
    const indices = sampleIndices(originals.length, sampleSize);

    const evaluations = await Promise.all(
        indices.map(i => evaluateTranslation(originals[i], translations[i], provider, i))
    );

    return evaluations;
}

/**
 * 随机抽样索引
 */
function sampleIndices(total: number, sampleSize: number): number[] {
    if (sampleSize >= total) {
        return Array.from({ length: total }, (_, i) => i);
    }

    const indices = new Set<number>();
    while (indices.size < sampleSize) {
        indices.add(Math.floor(Math.random() * total));
    }
    return Array.from(indices).sort((a, b) => a - b);
}

/**
 * 创建默认评估结果（失败时使用）
 */
function createDefaultResult(
    original: string,
    translated: string,
    lineIndex: number,
    reason: string
): EvaluationResult {
    return {
        original,
        translated,
        lineIndex,
        quality: {
            score: 5,
            confidence: 'low',
            issues: [`评估失败: ${reason}`],
        },
    };
}

/**
 * 计算批次平均分
 */
export function calculateAverageScore(results: EvaluationResult[]): number {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.quality.score, 0);
    return Math.round((total / results.length) * 10) / 10;
}

/**
 * 获取评分等级颜色
 */
export function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
    if (score >= 8) return 'green';
    if (score >= 5) return 'yellow';
    return 'red';
}
