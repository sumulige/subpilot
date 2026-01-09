/**
 * DeepL Translation API Route
 * DeepL 专用翻译 API（非 LLM）
 */

import { NextRequest, NextResponse } from 'next/server';

interface DeepLRequest {
    apiKey: string;
    useFree: boolean;
    text: string;
    targetLang: string;
    sourceLang?: string;
    context?: string;
}

interface DeepLResponse {
    translations: Array<{ text: string; detected_source_language?: string }>;
}

export async function POST(request: NextRequest) {
    const requestId = `deepl_${Date.now().toString(36)}`;
    const startTime = Date.now();

    try {
        const body: DeepLRequest = await request.json();
        const { apiKey, useFree, text, targetLang, sourceLang, context } = body;

        const baseUrl = useFree
            ? 'https://api-free.deepl.com'
            : 'https://api.deepl.com';

        console.log(`[${requestId}] DeepL translate to ${targetLang}`);

        const response = await fetch(`${baseUrl}/v2/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text],
                target_lang: targetLang.toUpperCase(),
                source_lang: sourceLang && sourceLang !== 'auto' ? sourceLang.toUpperCase() : undefined,
                context,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${requestId}] DeepL error:`, errorText);

            let errorType = 'UNKNOWN';
            if (response.status === 401 || response.status === 403) errorType = 'AUTH';
            else if (response.status === 429) errorType = 'RATE_LIMIT';
            else if (response.status === 456) errorType = 'QUOTA';

            return NextResponse.json({
                error: { type: errorType, message: errorText, requestId },
            }, { status: response.status });
        }

        const data: DeepLResponse = await response.json();
        const duration = Date.now() - startTime;

        console.log(`[${requestId}] Success in ${duration}ms`);

        return NextResponse.json({
            text: data.translations[0].text,
            detectedLanguage: data.translations[0].detected_source_language,
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[${requestId}] Error after ${duration}ms:`, message);

        return NextResponse.json({
            error: { type: 'NETWORK', message, requestId },
        }, { status: 500 });
    }
}
