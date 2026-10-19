import '@testing-library/jest-dom/vitest';
import React from 'react';
import { vi } from 'vitest';

vi.mock('next/image', () => ({
  default: function MockImage({
    src,
    alt,
    priority: _priority,
    ...rest
  }: {
    src: string;
    alt: string;
    priority?: boolean;
    [key: string]: unknown;
  }) {
    return React.createElement('img', { src, alt, ...rest });
  },
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// ProseMirror (Tiptap) measures text ranges when focusing/scrolling; jsdom has no layout.
const emptyRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList;
Range.prototype.getClientRects ??= emptyRects;
Range.prototype.getBoundingClientRect ??= () => new DOMRect();
document.elementFromPoint ??= () => null;
