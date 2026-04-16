'use client';

import { render, screen, waitFor } from '@testing-library/react';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { VirtualTranslationList } from './VirtualTranslationList';
import { I18nProvider } from '@/lib/i18n/context';

const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
const originalScrollTo = HTMLElement.prototype.scrollTo;
const originalResizeObserver = globalThis.ResizeObserver;
const originalLocalStorage = globalThis.localStorage;

const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

function getMockHeight(element: HTMLElement): number {
    if (element.matches('[data-index="1"]')) {
        if (element.style.height) {
            return Number.parseInt(element.style.height, 10);
        }

        if (element.style.minHeight) {
            return Math.max(Number.parseInt(element.style.minHeight, 10), 140);
        }

        return 140;
    }

    if (element.matches('[data-index]')) {
        if (element.style.height) {
            return Number.parseInt(element.style.height, 10);
        }

        if (element.style.minHeight) {
            return Math.max(Number.parseInt(element.style.minHeight, 10), 70);
        }

        return 70;
    }

    if (element.className.includes('overflow-auto')) return 500;
    return 20;
}

describe('VirtualTranslationList', () => {
    beforeAll(() => {
        globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: localStorageMock,
        });

        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            configurable: true,
            get() {
                return getMockHeight(this as HTMLElement);
            },
        });

        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            configurable: true,
            get() {
                return 400;
            },
        });

        HTMLElement.prototype.scrollTo = vi.fn();
    });

    afterAll(() => {
        if (originalOffsetHeight) {
            Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
        }
        if (originalOffsetWidth) {
            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
        }
        if (originalScrollTo) {
            HTMLElement.prototype.scrollTo = originalScrollTo;
        }
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: originalLocalStorage,
        });
        globalThis.ResizeObserver = originalResizeObserver;
    });

    beforeEach(() => {
        localStorageMock.clear.mockClear();
        localStorageMock.getItem.mockClear();
        localStorageMock.setItem.mockClear();
    });

    it('measures wrapped subtitle rows so long translations do not overlap following rows', async () => {
        const longTranslation = '这是一条很长很长的翻译文本，用来模拟多行换行场景，必须让虚拟列表把这一行测量成更高的高度，否则下一行会直接压在它上面。';

        render(
            <I18nProvider>
                <VirtualTranslationList
                    lines={[
                        { original: 'Short original', translated: '短句' },
                        { original: 'Long original line', translated: longTranslation },
                        { original: 'Following original', translated: '后续字幕' },
                    ]}
                    height={500}
                />
            </I18nProvider>
        );

        const longTextNode = screen.getByText(longTranslation);
        const longRow = longTextNode.closest('[data-index="1"]') as HTMLElement | null;
        const followingTextNode = screen.getByText('后续字幕');
        const followingRow = followingTextNode.closest('[data-index="2"]') as HTMLElement | null;

        expect(longRow).not.toBeNull();
        expect(followingRow).not.toBeNull();

        await waitFor(() => {
            expect(longRow?.style.minHeight).toBe('140px');
            expect(followingRow?.style.transform).toBe('translateY(210px)');
        });
    });
});
