import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

type AdminConfig = {
    email: string;
    password: string;
    token: string | null;
    configured: boolean;
};

function sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest();
}

function safeEqual(a: string, b: string): boolean {
    // Avoid leaking string length via timing.
    return crypto.timingSafeEqual(sha256(a), sha256(b));
}

function getAdminConfig(): AdminConfig {
    const isProd = process.env.NODE_ENV === 'production';
    const email = (process.env.ADMIN_EMAIL ?? (isProd ? '' : 'admin@example.com')).trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? (isProd ? '' : 'admin');
    const token = process.env.ADMIN_TOKEN?.trim() || null;
    const configured = Boolean(token || (email && password));

    return { email, password, token, configured };
}

function parseBasicAuth(header: string): { email: string; password: string } | null {
    if (!header.toLowerCase().startsWith('basic ')) return null;
    const encoded = header.slice('basic '.length).trim();
    if (!encoded) return null;
    let decoded = '';
    try {
        decoded = Buffer.from(encoded, 'base64').toString('utf8');
    } catch {
        return null;
    }
    const idx = decoded.indexOf(':');
    if (idx < 0) return null;
    return {
        email: decoded.slice(0, idx).trim().toLowerCase(),
        password: decoded.slice(idx + 1),
    };
}

function unauthorized(message = 'Unauthorized') {
    return NextResponse.json(
        { error: message },
        {
            status: 401,
            headers: {
                // Makes curl/browser clients prompt for credentials in some contexts.
                'WWW-Authenticate': 'Basic realm="subpilot"',
            },
        }
    );
}

export function requireAdmin(request: NextRequest): { ok: true } | { ok: false; response: NextResponse } {
    const config = getAdminConfig();
    if (!config.configured) {
        return { ok: false, response: unauthorized('Admin auth is not configured.') };
    }

    const header = request.headers.get('authorization') || '';

    if (config.token && header.toLowerCase().startsWith('bearer ')) {
        const token = header.slice('bearer '.length).trim();
        if (token && safeEqual(token, config.token)) return { ok: true };
        return { ok: false, response: unauthorized() };
    }

    const basic = parseBasicAuth(header);
    if (basic) {
        if (basic.email !== config.email) return { ok: false, response: unauthorized() };
        if (!safeEqual(basic.password, config.password)) return { ok: false, response: unauthorized() };
        return { ok: true };
    }

    return { ok: false, response: unauthorized() };
}

