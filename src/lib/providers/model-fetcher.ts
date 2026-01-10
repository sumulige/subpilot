'use client';

/**
 * Model Fetcher Utility
 * Fetches available models from provider APIs via our server-side proxy
 */

// Providers that support /v1/models endpoint
const SUPPORTED_PROVIDERS = [
    'nvidia',
    'openai',
    'deepseek',
    'openrouter',
    'deepinfra',
    'tongyi',
    'doubao',
];

/**
 * Fetch available models from a provider via our internal API
 */
export async function fetchModels(
    providerId: string,
    apiKey: string
): Promise<string[]> {
    if (!apiKey || !SUPPORTED_PROVIDERS.includes(providerId)) {
        return [];
    }

    try {
        const response = await fetch('/api/models', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ providerId, apiKey }),
            signal: AbortSignal.timeout(20000), // 20s timeout
        });

        if (!response.ok) {
            console.warn(`[ModelFetcher] Failed to fetch models for ${providerId}: ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (data.error) {
            console.warn(`[ModelFetcher] Error for ${providerId}:`, data.error);
            return [];
        }

        const models = data.models || [];
        return models;
    } catch (error) {
        console.warn(`[ModelFetcher] Error fetching models for ${providerId}:`, error);
        return [];
    }
}

/**
 * Check if a provider supports dynamic model fetching
 */
export function supportsModelFetching(providerId: string): boolean {
    return SUPPORTED_PROVIDERS.includes(providerId);
}
