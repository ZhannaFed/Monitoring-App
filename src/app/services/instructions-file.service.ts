import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { InstructionNode } from '../components/main/instructions/instructions.models';

@Injectable({ providedIn: 'root' })
export class InstructionsFileService {
  constructor(private readonly http: HttpClient) {}

  async fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
    return await firstValueFrom(
      this.http.get(url, { responseType: 'arraybuffer' })
    );
  }

  decodeText(buffer: ArrayBuffer): string {
    const uint8 = new Uint8Array(buffer);
    const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
    let result = utf8Decoder.decode(uint8);

    if (!result.includes('\uFFFD')) {
      return result;
    }

    try {
      const cp1251Decoder = new TextDecoder('windows-1251', { fatal: false });
      result = cp1251Decoder.decode(uint8);
    } catch {
      // NOTE: fallback to UTF-8 result with replacement characters.
    }

    return result;
  }

  getExtension(nodeOrPath: InstructionNode | string): string {
    const path = typeof nodeOrPath === 'string' ? nodeOrPath : nodeOrPath.path;
    const explicit =
      typeof nodeOrPath === 'object' && nodeOrPath.ext
        ? nodeOrPath.ext.toLowerCase()
        : null;
    if (explicit) {
      return explicit;
    }

    const lastSegment = path.split('/').pop() ?? '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex === -1) {
      return '';
    }

    return lastSegment.slice(dotIndex + 1).toLowerCase();
  }

  resolveAssetPath(path: string): string {
    if (!path) {
      return '';
    }

    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) {
      return path;
    }

    return path.startsWith('/') ? path : `/${path}`;
  }

  buildAbsoluteUrl(relativeOrAbsolute: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return new URL(relativeOrAbsolute, window.location.origin).href;
    } catch {
      return null;
    }
  }

  guessMimeFromUrl(url: string): string | null {
    const extension = url.split('.').pop()?.toLowerCase();
    if (!extension) {
      return null;
    }

    switch (extension) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'webp':
        return 'image/webp';
      case 'svg':
        return 'image/svg+xml';
      default:
        return null;
    }
  }

  escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  highlightOccurrences(text: string, query: string): string {
    if (!query) {
      return this.escapeHtml(text);
    }

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (!lowerText.includes(lowerQuery)) {
      return this.escapeHtml(text);
    }

    let result = '';
    let cursor = 0;

    while (cursor < text.length) {
      const matchIndex = lowerText.indexOf(lowerQuery, cursor);
      if (matchIndex === -1) {
        result += this.escapeHtml(text.slice(cursor));
        break;
      }

      result += this.escapeHtml(text.slice(cursor, matchIndex));
      result += `<mark>${this.escapeHtml(
        text.slice(matchIndex, matchIndex + query.length)
      )}</mark>`;
      cursor = matchIndex + query.length;
    }

    return result;
  }

  buildSnippet(
    text: string,
    query: string,
    index: number,
    radius: number
  ): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(text.length, index + query.length + radius);
    const fragment = text.slice(start, end);
    const highlighted = this.highlightOccurrences(fragment, query);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < text.length ? '...' : '';
    return `${prefix}${highlighted}${suffix}`;
  }

  clampZoom(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) {
      return 1;
    }

    const clamped = Math.min(max, Math.max(min, value));
    return Math.round(clamped * 100) / 100;
  }
}
