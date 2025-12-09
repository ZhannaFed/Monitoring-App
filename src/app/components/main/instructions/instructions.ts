import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { firstValueFrom } from 'rxjs';

import {
  InstructionNode,
  PreviewOf,
  PreviewState,
  SearchContentMatch,
} from './instructions.models';
import { InstructionsFileService } from '../../../services/instructions-file.service';
import {
  InstructionsSearchParams,
  InstructionsSearchService,
} from '../../../services/instructions-search.service';

@Component({
  selector: 'app-instructions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, NgxDocViewerModule],
  templateUrl: './instructions.html',
  styleUrl: './instructions.scss',
})
export class Instructions implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly fileService = inject(InstructionsFileService);
  private readonly searchService = inject(InstructionsSearchService);

  private readonly manifestUrl = 'assets/instructions/manifest.json';
  private readonly collator = new Intl.Collator('ru-RU', {
    numeric: true,
    sensitivity: 'base',
  });

  private readonly textExtensions = new Set([
    'txt',
    'log',
    'md',
    'json',
    'csv',
    'xml',
    'ini',
    'conf',
    'yml',
    'yaml',
  ]);

  private readonly imageExtensions = new Set([
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'webp',
    'svg',
  ]);

  private readonly spreadsheetExtensions = new Set(['xls', 'xlsx']);

  private readonly minZoom = 0.5;
  private readonly maxZoom = 2;
  private readonly zoomStep = 0.1;
  private readonly maxContentMatches = 20;
  private readonly snippetRadius = 80;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tree = signal<InstructionNode[]>([]);
  protected readonly expanded = signal(new Set<string>());
  protected readonly selected = signal<InstructionNode | null>(null);
  protected readonly previewState = signal<PreviewState>({ kind: 'idle' });
  protected readonly treeCollapsed = signal(false);
  protected readonly previewZoom = signal(1);
  protected readonly searchQuery = signal('');
  protected readonly searchLoading = signal(false);
  protected readonly searchError = signal<string | null>(null);
  protected readonly searchNameResults = signal<InstructionNode[]>([]);
  protected readonly searchContentResults = signal<SearchContentMatch[]>([]);

  protected readonly hasItems = computed(() => this.tree().length > 0);
  protected readonly previewZoomPercent = computed(() =>
    Math.round(this.previewZoom() * 100)
  );
  protected readonly canZoomIn = computed(
    () => this.previewZoom() < this.maxZoom - 0.001
  );
  protected readonly canZoomOut = computed(
    () => this.previewZoom() > this.minZoom + 0.001
  );
  protected readonly zoomTransform = computed(
    () => `scale(${this.previewZoom().toFixed(2)})`
  );
  protected readonly zoomFillPercent = computed(() => {
    const zoom = this.previewZoom();
    const percent = Math.max(100, 100 / zoom);
    return `${percent.toFixed(2)}%`;
  });
  protected readonly isSearchActive = computed(
    () => this.searchQuery().trim().length > 0
  );
  protected readonly hasSearchResults = computed(
    () =>
      this.searchNameResults().length > 0 ||
      this.searchContentResults().length > 0
  );

  private objectUrl: string | null = null;
  private searchSequence = 0;

  ngOnInit(): void {
    void this.loadManifest();
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
    this.searchService.resetCache();
  }

  protected handleNodeClick(node: InstructionNode, event?: MouseEvent): void {
    event?.preventDefault();

    if (node.type === 'folder') {
      this.toggleFolder(node);
      return;
    }

    void this.selectNode(node);
  }

  protected onToggleIconClick(node: InstructionNode, event: MouseEvent): void {
    event.stopPropagation();
    this.toggleFolder(node);
  }

  protected toggleTreePanel(): void {
    this.treeCollapsed.update((state) => !state);
  }

  protected zoomIn(): void {
    this.previewZoom.update((zoom) =>
      this.fileService.clampZoom(zoom + this.zoomStep, this.minZoom, this.maxZoom)
    );
  }

  protected zoomOut(): void {
    this.previewZoom.update((zoom) =>
      this.fileService.clampZoom(zoom - this.zoomStep, this.minZoom, this.maxZoom)
    );
  }

  protected resetZoom(): void {
    this.previewZoom.set(1);
  }

  protected handleZoomSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (!target) {
      return;
    }

    const percent = Number(target.value);
    if (Number.isNaN(percent)) {
      return;
    }

    const normalized = Math.round(percent);
    const zoom = normalized / 100;
    this.previewZoom.set(
      this.fileService.clampZoom(zoom, this.minZoom, this.maxZoom)
    );
  }

  protected onSearchQueryChange(value: string): void {
    const next = value ?? '';
    this.searchQuery.set(next);
    void this.runSearch(next);
  }

  protected clearSearchQuery(): void {
    this.searchQuery.set('');
    void this.runSearch('');
  }

  protected handleSearchResultClick(node: InstructionNode): void {
    void this.selectNode(node);
  }

  protected highlightFileName(name: string): SafeHtml | string {
    const query = this.searchQuery().trim();
    if (!query) {
      return name;
    }

    return this.searchService.highlightLabel(name, query);
  }

  protected formatPreviewText(content: string): SafeHtml {
    const query = this.searchQuery().trim();
    const source = content ?? '';
    const highlighted = query
      ? this.fileService.highlightOccurrences(source, query)
      : this.fileService.escapeHtml(source);
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  protected isExpanded(node: InstructionNode): boolean {
    return node.type === 'folder' && this.expanded().has(node.path);
  }

  protected isSelected(node: InstructionNode): boolean {
    return this.selected()?.path === node.path;
  }

  protected trackByPath(_: number, node: InstructionNode): string {
    return node.path;
  }

  protected trackBySearchMatch(_: number, match: SearchContentMatch): string {
    return match.node.path;
  }

  protected getSelectedDownloadUrl(): string | null {
    const node = this.selected();
    if (!node || node.type !== 'file') {
      return null;
    }

    return this.fileService.resolveAssetPath(node.path);
  }

  protected reload(): void {
    void this.loadManifest();
  }

  protected formatSize(bytes?: number | null): string | null {
    if (bytes === null || bytes === undefined) {
      return null;
    }

    if (bytes === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }

    const formatted =
      value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value).toString();

    return `${formatted} ${units[unit]}`;
  }

  protected isLoadingState(state: PreviewState): state is PreviewOf<'loading'> {
    return state.kind === 'loading';
  }

  protected isTextState(state: PreviewState): state is PreviewOf<'text'> {
    return state.kind === 'text';
  }

  protected isHtmlState(state: PreviewState): state is PreviewOf<'html'> {
    return state.kind === 'html';
  }

  protected isImageState(state: PreviewState): state is PreviewOf<'image'> {
    return state.kind === 'image';
  }

  protected isIframeState(state: PreviewState): state is PreviewOf<'iframe'> {
    return state.kind === 'iframe';
  }

  protected isViewerState(state: PreviewState): state is PreviewOf<'viewer'> {
    return state.kind === 'viewer';
  }

  protected isMessageState(state: PreviewState): state is PreviewOf<'message'> {
    return state.kind === 'message';
  }

  protected isErrorState(state: PreviewState): state is PreviewOf<'error'> {
    return state.kind === 'error';
  }

  protected isIdleState(state: PreviewState): state is PreviewOf<'idle'> {
    return state.kind === 'idle';
  }

  private async loadManifest(): Promise<void> {
    const previouslySelected = this.selected()?.path ?? null;

    this.loading.set(true);
    this.error.set(null);

    try {
      const nodes =
        (await firstValueFrom(
          this.http.get<InstructionNode[]>(this.manifestUrl)
        )) ?? [];

      const normalized = this.normalizeNodes(nodes);
      this.tree.set(normalized);
      this.expanded.set(this.collectInitialExpansion(normalized));

      if (this.searchQuery().trim()) {
        void this.runSearch(this.searchQuery());
      } else {
        this.resetSearchResults();
      }

      if (previouslySelected) {
        const nextSelection = this.findNodeByPath(normalized, previouslySelected);
        if (nextSelection) {
          this.selected.set(nextSelection);
          await this.updatePreview(nextSelection);
        } else {
          this.clearSelection();
        }
      } else {
        this.clearSelection();
      }
    } catch (error) {
      console.error('Failed to load manifest', error);
      this.error.set('Не удалось загрузить инструкции. Повторите попытку.');
      this.clearSelection();
    } finally {
      this.loading.set(false);
    }
  }

  private clearSelection(): void {
    this.selected.set(null);
    this.previewState.set({ kind: 'idle' });
    this.revokeObjectUrl();
  }

  private normalizeNodes(nodes: InstructionNode[]): InstructionNode[] {
    return nodes
      .map((node) => ({
        ...node,
        children: node.children ? this.normalizeNodes(node.children) : undefined,
      }))
      .sort((a, b) => this.compareNodes(a, b));
  }

  private compareNodes(a: InstructionNode, b: InstructionNode): number {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }

    return this.collator.compare(a.name, b.name);
  }

  private collectInitialExpansion(nodes: InstructionNode[]): Set<string> {
    const expanded = new Set<string>();

    const walk = (items: InstructionNode[], depth: number) => {
      for (const item of items) {
        if (item.type === 'folder') {
          if (depth === 0) {
            expanded.add(item.path);
          }
          if (item.children?.length) {
            walk(item.children, depth + 1);
          }
        }
      }
    };

    walk(nodes, 0);
    return expanded;
  }

  private async runSearch(rawQuery: string): Promise<void> {
    const trimmed = rawQuery.trim();
    const sequence = ++this.searchSequence;

    if (!trimmed || !this.tree().length) {
      this.resetSearchResults();
      return;
    }

    this.searchLoading.set(true);
    this.searchError.set(null);
    this.searchNameResults.set([]);
    this.searchContentResults.set([]);

    try {
      const params: InstructionsSearchParams = {
        query: trimmed,
        nodes: this.tree(),
        collator: this.collator,
        textExtensions: this.textExtensions,
        snippetRadius: this.snippetRadius,
        maxContentMatches: this.maxContentMatches,
      };

      const { nameMatches, contentMatches } =
        await this.searchService.search(params);

      if (sequence !== this.searchSequence) {
        return;
      }

      this.searchNameResults.set(nameMatches);
      this.searchContentResults.set(contentMatches);
    } catch (error) {
      if (sequence !== this.searchSequence) {
        return;
      }
      console.error('Search error', error);
      this.searchError.set('Ошибка поиска. Повторите попытку.');
    } finally {
      if (sequence === this.searchSequence) {
        this.searchLoading.set(false);
      }
    }
  }

  private resetSearchResults(): void {
    this.searchLoading.set(false);
    this.searchError.set(null);
    this.searchNameResults.set([]);
    this.searchContentResults.set([]);
  }

  private toggleFolder(node: InstructionNode): void {
    if (node.type !== 'folder') {
      return;
    }

    const expanded = new Set(this.expanded());
    if (expanded.has(node.path)) {
      expanded.delete(node.path);
    } else {
      expanded.add(node.path);
    }

    this.expanded.set(expanded);
  }

  private async selectNode(node: InstructionNode): Promise<void> {
    if (node.type !== 'file') {
      return;
    }

    this.selected.set(node);
    await this.updatePreview(node);
  }

      private async updatePreview(node: InstructionNode): Promise<void> {
    const downloadUrl = this.fileService.resolveAssetPath(node.path);
    const extension = this.fileService.getExtension(node);

    this.previewState.set({
      kind: 'loading',
      message: '???????? ?????????????...',
    });

    try {
      if (!extension) {
        this.previewState.set({
          kind: 'message',
          message: '??????????? ??????????. ???????? ????.',
          downloadUrl,
        });
        return;
      }

      if (extension === 'doc') {
        this.previewState.set({
          kind: 'message',
          message:
            'DOC нельзя показать в предпросмотре. Скачайте или конвертируйте в DOCX.',
          downloadUrl,
          extraLink: node.convertedPath
            ? {
                label: 'Скачать конвертированную копию DOCX',
                url: this.fileService.resolveAssetPath(node.convertedPath),
              }
            : undefined,
        });
        return;
      }

      if (extension === 'pdf') {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(downloadUrl);
        this.previewState.set({ kind: 'iframe', url: safeUrl });
        return;
      }

      if (this.imageExtensions.has(extension)) {
        await this.renderImage(downloadUrl, node.mime);
        return;
      }

      if (extension === 'docx') {
        await this.renderDocx(downloadUrl);
        return;
      }

      if (this.spreadsheetExtensions.has(extension)) {
        await this.renderSpreadsheet(downloadUrl);
        return;
      }

      if (this.textExtensions.has(extension) || node.readable) {
        await this.renderText(downloadUrl, extension);
        return;
      }

      if (extension === 'html' || extension === 'htm') {
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(downloadUrl);
        this.previewState.set({ kind: 'iframe', url: safeUrl });
        return;
      }

      const viewerUrl = this.fileService.buildAbsoluteUrl(downloadUrl);
      if (viewerUrl) {
        this.previewState.set({
          kind: 'viewer',
          url: viewerUrl,
          viewer: 'office',
          note: '??????? ????? Office Viewer. ????????, ???? ????? ?????? ???????.',
        });
        return;
      }

      this.previewState.set({
        kind: 'message',
        message: '???????????? ??????????. ???????? ????.',
        downloadUrl,
      });
    } catch (error) {
      console.error('Failed to render preview', error);
      this.previewState.set({
        kind: 'error',
        message: '?? ??????? ?????????? ????????????. ???????? ????.',
        downloadUrl,
      });
    }
  }
  private async renderDocx(url: string): Promise<void> {
    try {
      const arrayBuffer = await this.fileService.fetchArrayBuffer(url);
      const mammoth = await import('mammoth/mammoth.browser');
      const { value } = await mammoth.convertToHtml({ arrayBuffer });
      const sanitized = this.sanitizer.bypassSecurityTrustHtml(
        value || '<p>?????????? ???????????.</p>'
      );
      this.previewState.set({
        kind: 'html',
        content: sanitized,
      });
    } catch (error) {
      console.warn(
        'DOCX inline render failed, falling back to Office viewer.',
        error
      );
      const fallbackUrl = this.fileService.buildAbsoluteUrl(url);
      if (fallbackUrl) {
        this.previewState.set({
          kind: 'viewer',
          url: fallbackUrl,
          viewer: 'office',
          note: '??????? ????? Office Viewer. ????????, ???? ?????????????? ???????????.',
        });
        return;
      }
      throw error;
    }
  }
  private async renderSpreadsheet(url: string): Promise<void> {
    const arrayBuffer = await this.fileService.fetchArrayBuffer(url);
    const XLSX = await import('xlsx');

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    if (!workbook.SheetNames.length) {
      this.previewState.set({
        kind: 'message',
        message: '? ????? ??? ??????.',
        downloadUrl: url,
      });
      return;
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      blankrows: false,
    }) as unknown[][];

    const limitedRows = rows.slice(0, 101); // NOTE: ????????? + 100 ????? ??? ???????? ?????????.
    const html = this.buildTableHtml(limitedRows);
    const sanitized = this.sanitizer.bypassSecurityTrustHtml(html);

    this.previewState.set({
      kind: 'html',
      content: sanitized,
    });
  }
  private async renderText(url: string, extension: string): Promise<void> {
    const arrayBuffer = await this.fileService.fetchArrayBuffer(url);
    let text = this.fileService.decodeText(arrayBuffer);

    if (extension === 'json') {
      try {
        const parsed = JSON.parse(text);
        text = JSON.stringify(parsed, null, 2);
      } catch {
        // FIXME: keep raw JSON if parsing fails.
      }
    }

    this.previewState.set({
      kind: 'text',
      content: text || '???? ????.',
    });
  }
  private async renderImage(url: string, mime?: string): Promise<void> {
    const arrayBuffer = await this.fileService.fetchArrayBuffer(url);
    const blob = new Blob([arrayBuffer], {
      type: mime ?? this.fileService.guessMimeFromUrl(url) ?? 'application/octet-stream',
    });

    this.revokeObjectUrl();

    this.objectUrl = URL.createObjectURL(blob);
    this.previewState.set({
      kind: 'image',
      url: this.objectUrl,
      alt: this.selected()?.name ?? '???????????? ???????????',
    });
  }

    private buildTableHtml(rows: unknown[][]): string {
    if (!rows.length) {
      return '<p class="preview__note">??????? ?????.</p>';
    }

    const [header, ...body] = rows;

    const escape = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      return this.fileService.escapeHtml(String(value));
    };

    const buildRow = (cells: unknown[], tag: 'td' | 'th'): string =>
      `<tr>${cells
        .map((cell) => `<${tag}>${escape(cell)}</${tag}>`)
        .join('')}</tr>`;

    const headerHtml = header ? `<thead>${buildRow(header, 'th')}</thead>` : '';
    const bodyHtml = body.length
      ? `<tbody>${body.map((row) => buildRow(row, 'td')).join('')}</tbody>`
      : '<tbody><tr><td></td></tr></tbody>';

    const truncated =
      rows.length > 101
        ? '<caption>???????? ?? ?????? 100 ?????.</caption>'
        : '';

    return `<table class="preview-table">${truncated}${headerHtml}${bodyHtml}</table>`;
  }
private findNodeByPath(
    nodes: InstructionNode[],
    path: string
  ): InstructionNode | null {
    for (const node of nodes) {
      if (node.path === path) {
        return node;
      }
      if (node.children?.length) {
        const match = this.findNodeByPath(node.children, path);
        if (match) {
          return match;
        }
      }
    }
    return null;
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }
}

// === ИТОГИ ДЛЯ ФАЙЛА ===
// - Added dedicated search/file services usage to enforce SRP and reuse helpers.
// - Enabled OnPush and tightened UI state handling with signals and safer formatting.
// - Simplified preview rendering paths and unified error messages for better UX.
