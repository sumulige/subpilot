/**
 * Article Executive Summary API
 * Admin-protected endpoint for generating founder-friendly exec summaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

type SummaryRequest = {
    title: string;
    content: string;
    titleFormat?: string;
    provider?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
};

type SummaryObject = {
    oneLine: string;
    insights: Array<{
        question: string;
        answer: string;
    }>;
    strategic: string;
    tags: string[];
};

function applyTitleFormat(title: string, titleFormat?: string) {
    const raw = (titleFormat || '## ${title}').trim();
    if (!raw) return title;
    return raw.includes('${title}') ? raw.replace(/\$\{title\}/g, title) : raw;
}

function createModel(provider: string, model: string, apiKey: string, baseUrl?: string) {
    switch (provider) {
        case 'openai':
            return createOpenAI({ apiKey, baseURL: baseUrl })(model);
        case 'deepseek':
            return createDeepSeek({ apiKey })(model);
        case 'google':
            return createGoogleGenerativeAI({ apiKey })(model);
        case 'openai-compatible': {
            const baseURL = (baseUrl || '').trim();
            if (!baseURL) {
                throw new Error('baseUrl is required for provider: openai-compatible');
            }
            return createOpenAICompatible({
                name: 'openai-compatible',
                apiKey,
                baseURL,
            }).chatModel(model);
        }
        default:
            throw new Error(`Unknown provider: ${provider}`);
    }
}

function readEnvConfig() {
    const provider = (process.env.ARTICLE_SUMMARY_PROVIDER || '').trim();
    const model = (process.env.ARTICLE_SUMMARY_MODEL || '').trim();
    const apiKey = process.env.ARTICLE_SUMMARY_API_KEY || '';
    const baseUrl = (process.env.ARTICLE_SUMMARY_BASE_URL || '').trim() || undefined;
    const temperatureRaw = (process.env.ARTICLE_SUMMARY_TEMPERATURE || '').trim();
    const temperature = temperatureRaw ? Number.parseFloat(temperatureRaw) : undefined;
    return { provider, model, apiKey, baseUrl, temperature };
}

function extractJson(text: string) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    return text.slice(start, end + 1);
}

function clampContent(content: string, maxChars: number) {
    const cleaned = content.trim();
    if (cleaned.length <= maxChars) return cleaned;
    return `${cleaned.slice(0, maxChars)}\n\n[内容已截断：仅供摘要生成使用]`;
}

export async function POST(request: NextRequest) {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.response;

    const requestId = `article_summary_${Date.now().toString(36)}`;
    const startTime = Date.now();

    try {
        const body = (await request.json()) as Partial<SummaryRequest>;

        const title = String(body.title || '').trim();
        const content = String(body.content || '').trim();

        if (!title || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: title, content.' },
                { status: 400 }
            );
        }

        const env = readEnvConfig();
        const provider = String(body.provider || env.provider || 'openai').trim();
        const model = String(body.model || env.model || 'gpt-4o-mini').trim();
        const apiKey = String(body.apiKey || env.apiKey || '').trim();
        const baseUrl = String(body.baseUrl || env.baseUrl || '').trim() || undefined;
        const temperature = typeof body.temperature === 'number' ? body.temperature : env.temperature ?? 0.2;

        if (!apiKey) {
            return NextResponse.json(
                {
                    error:
                        'Missing API key. Provide apiKey in request, or set ARTICLE_SUMMARY_API_KEY env.',
                },
                { status: 400 }
            );
        }

        const modelInstance = createModel(provider, model, apiKey, baseUrl);
        const titleLine = applyTitleFormat(title, body.titleFormat);
        const clipped = clampContent(content, 14_000);

        const system = [
            '你是一位资深分析师，擅长消化技术和学术文档，为时间紧迫的创始人撰写执行摘要。',
            '',
            '任务：分析内容并生成 5 个关键洞察，每条洞察回答一个能捕捉文章主要观点的问题。',
            '',
            '只输出严格 JSON，不要添加任何解释性文字或 Markdown 代码块。',
        ].join('\n');

        const user = [
            `标题：${title}`,
            '',
            '请输出 JSON 对象，字段必须为：',
            '- oneLine: string （一句话概括核心内容）',
            '- insights: array（长度=5，每项包含 question, answer）',
            '- strategic: string（提炼出的战略性洞察和可行动建议）',
            '- tags: string[]（3-5 个分类标签，可中英混合，具体且有意义）',
            '',
            '内容如下：',
            clipped,
        ].join('\n');

        const result = await generateText({
            model: modelInstance,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
            temperature,
        });

        const raw = result.text.trim();
        const jsonText = extractJson(raw) ?? raw;
        let parsed: SummaryObject | null = null;
        try {
            parsed = JSON.parse(jsonText) as SummaryObject;
        } catch {
            parsed = null;
        }

        if (!parsed) {
            return NextResponse.json(
                {
                    error: 'Model did not return valid JSON.',
                    raw,
                    requestId,
                },
                { status: 502 }
            );
        }

        const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [];
        const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [];

        const formatted = [
            titleLine,
            '',
            parsed.oneLine || '',
            '',
            ...insights.map((i) => `Q: ${i.question}\nA: ${i.answer}\n`),
            (parsed.strategic || '').trim(),
            '',
            JSON.stringify(tags),
            '',
        ]
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        const duration = Date.now() - startTime;

        return NextResponse.json(
            {
                success: true,
                requestId,
                provider,
                model,
                formatted,
                titleLine,
                oneLine: parsed.oneLine,
                insights,
                strategic: parsed.strategic,
                tags,
            },
            {
                headers: {
                    'X-Request-Id': requestId,
                    'X-Response-Time': `${duration}ms`,
                },
            }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: message, requestId },
            { status: 500 }
        );
    }
}
