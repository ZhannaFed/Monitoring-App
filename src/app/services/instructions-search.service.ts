import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import {
  InstructionNode,
  SearchContentMatch,
} from '../components/main/instructions/instructions.models';
import { InstructionsFileService } from './instructions-file.service';

export interface InstructionsSearchParams {
  query: string;
  nodes: InstructionNode[];
  collator: Intl.Collator;
  textExtensions: Set<string>;
  snippetRadius: number;
  maxContentMatches: number;
}

export interface InstructionsSearchResult {
  nameMatches: InstructionNode[];
  contentMatches: SearchContentMatch[];
}

@Injectable({ providedIn: 'root' })
export class InstructionsSearchService {
  private readonly searchContentCache = new Map<string, string>();

  constructor(
    private readonly fileService: InstructionsFileService,
    private readonly sanitizer: DomSanitizer
  ) {}

  resetCache(): void {
    this.searchContentCache.clear();
  }

  highlightLabel(label: string, query: string): SafeHtml {
    const markup = this.fileService.highlightOccurrences(label, query);
    return this.sanitizer.bypassSecurityTrustHtml(markup);
  }

  async search(
    params: InstructionsSearchParams
  ): Promise<InstructionsSearchResult> {
    const {
      query,
      nodes,
      collator,
      textExtensions,
      snippetRadius,
      maxContentMatches,
    } = params;
    const files = this.flattenFiles(nodes);
    const loweredQuery = query.toLowerCase();

    const nameMatches = files
      .filter((node) => node.name.toLowerCase().includes(loweredQuery))
      .sort((a, b) => collator.compare(a.name, b.name));

    const contentMatches: SearchContentMatch[] = [];

    for (const node of files) {
      if (!this.shouldSearchFileContents(node, textExtensions)) {
        continue;
      }

      const text = await this.loadText(node);
      if (!text) {
        continue;
      }

      const loweredContent = text.toLowerCase();
      const index = loweredContent.indexOf(loweredQuery);
      if (index === -1) {
        continue;
      }

      const snippet = this.fileService.buildSnippet(
        text,
        query,
        index,
        snippetRadius
      );

      contentMatches.push({
        node,
        snippet: this.sanitizer.bypassSecurityTrustHtml(snippet),
      });

      if (contentMatches.length >= maxContentMatches) {
        break;
      }
    }

    return { nameMatches, contentMatches };
  }

  private flattenFiles(nodes: InstructionNode[]): InstructionNode[] {
    const files: InstructionNode[] = [];

    const walk = (items: InstructionNode[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          files.push(item);
        }
        if (item.children?.length) {
          walk(item.children);
        }
      }
    };

    walk(nodes);
    return files;
  }

  private shouldSearchFileContents(
    node: InstructionNode,
    textExtensions: Set<string>
  ): boolean {
    const extension = this.fileService.getExtension(node);
    return (
      textExtensions.has(extension) ||
      extension === 'html' ||
      extension === 'htm' ||
      node.readable === true
    );
  }

  private async loadText(node: InstructionNode): Promise<string | null> {
    const cached = this.searchContentCache.get(node.path);
    if (cached !== undefined) {
      return cached;
    }

    try {
      const url = this.fileService.resolveAssetPath(node.path);
      const buffer = await this.fileService.fetchArrayBuffer(url);
      const text = this.fileService.decodeText(buffer);
      this.searchContentCache.set(node.path, text);
      return text;
    } catch {
      this.searchContentCache.set(node.path, '');
      return null;
    }
  }
}
