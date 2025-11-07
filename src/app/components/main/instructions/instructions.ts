import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { NgxDocViewerModule } from 'ngx-doc-viewer';
import { firstValueFrom } from 'rxjs';

type InstructionNodeType = 'file' | 'folder';

interface InstructionNode {
  name: string;
  type: InstructionNodeType;
  path: string;
  ext?: string;
  size?: number;
  mime?: string;
  readable?: boolean;
  convertedPath?: string;
  children?: InstructionNode[];
}

interface PreviewMessageLink {
  label: string;
  url: string;
}

type PreviewState =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'html'; content: SafeHtml }
  | { kind: 'text'; content: string }
  | { kind: 'image'; url: string; alt: string }
  | { kind: 'iframe'; url: SafeResourceUrl }
  | { kind: 'viewer'; url: string; viewer: 'google' | 'office'; note?: string }
  | {
    kind: 'message';
    message: string;
    downloadUrl?: string;
    extraLink?: PreviewMessageLink;
  }
  | { kind: 'error'; message: string; downloadUrl?: string };

type PreviewOf<K extends PreviewState['kind']> = Extract<
  PreviewState,
  { kind: K }
>;

@Component({
  selector: 'app-instructions',
  imports: [CommonModule, NgxDocViewerModule],
  templateUrl: './instructions.html',
  styleUrl: './instructions.scss',
})
export class Instructions implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

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

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tree = signal<InstructionNode[]>([]);
  protected readonly expanded = signal(new Set<string>());
  protected readonly selected = signal<InstructionNode | null>(null);
  protected readonly previewState = signal<PreviewState>({ kind: 'idle' });

  protected readonly hasItems = computed(() => this.tree().length > 0);

  private objectUrl: string | null = null;

  ngOnInit(): void {
    void this.loadManifest();
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
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

  protected isExpanded(node: InstructionNode): boolean {
    return node.type === 'folder' && this.expanded().has(node.path);
  }

  protected isSelected(node: InstructionNode): boolean {
    return this.selected()?.path === node.path;
  }

  protected trackByPath(_: number, node: InstructionNode): string {
    return node.path;
  }

  protected getSelectedDownloadUrl(): string | null {
    const node = this.selected();
    if (!node || node.type !== 'file') {
      return null;
    }

    return this.resolveAssetPath(node.path);
  }

  protected reload(): void {
    void this.loadManifest();
  }

  protected formatSize(bytes?: number | null): string | null {
    if (bytes === null || bytes === undefined) {
      return null;
    }

    if (bytes === 0) {
      return '0 Б';
    }

    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
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
    } catch (err) {
      console.error('Не удалось загрузить manifest инструкций', err);
      this.error.set('Не удалось загрузить список инструкций.');
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
    const downloadUrl = this.resolveAssetPath(node.path);
    const extension = this.getExtension(node);

    this.previewState.set({
      kind: 'loading',
      message: 'Загрузка файла...',
    });

    try {
      if (!extension) {
        this.previewState.set({
          kind: 'message',
          message: 'Не удалось определить тип файла.',
          downloadUrl,
        });
        return;
      }

      if (extension === 'doc') {
        this.previewState.set({
          kind: 'message',
          message:
            'Формат DOC устарел. Пожалуйста, сохраните документ в формате DOCX.',
          downloadUrl,
          extraLink: node.convertedPath
            ? {
              label: 'Открыть автоматически созданный DOCX',
              url: this.resolveAssetPath(node.convertedPath),
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

      const viewerUrl = this.buildAbsoluteUrl(downloadUrl);
      if (viewerUrl) {
        this.previewState.set({
          kind: 'viewer',
          url: viewerUrl,
          viewer: 'office',
          note: 'Просмотр через Office Viewer требует доступа к интернету.',
        });
        return;
      }

      this.previewState.set({
        kind: 'message',
        message: 'Этот тип файла пока не поддерживается.',
        downloadUrl,
      });
    } catch (err) {
      console.error('Не удалось подготовить предпросмотр файла', err);
      this.previewState.set({
        kind: 'error',
        message: 'Не удалось загрузить предпросмотр файла.',
        downloadUrl,
      });
    }
  }

  private async renderDocx(url: string): Promise<void> {
    try {
      const arrayBuffer = await this.fetchArrayBuffer(url);
      const mammoth = await import('mammoth/mammoth.browser');
      const { value } = await mammoth.convertToHtml({ arrayBuffer });
      const sanitized = this.sanitizer.bypassSecurityTrustHtml(
        value || '<p>Документ пуст.</p>'
      );
      this.previewState.set({
        kind: 'html',
        content: sanitized,
      });
    } catch (error) {
      console.warn('Ошибка конвертации DOCX, используется онлайн-просмотр.', error);
      const fallbackUrl = this.buildAbsoluteUrl(url);
      if (fallbackUrl) {
        this.previewState.set({
          kind: 'viewer',
          url: fallbackUrl,
          viewer: 'office',
          note: 'Документ преобразован через Office Viewer. Требуется интернет.',
        });
        return;
      }
      throw error;
    }
  }

  private async renderSpreadsheet(url: string): Promise<void> {
    const arrayBuffer = await this.fetchArrayBuffer(url);
    const XLSX = await import('xlsx');

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    if (!workbook.SheetNames.length) {
      this.previewState.set({
        kind: 'message',
        message: 'В таблице нет данных.',
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

    const limitedRows = rows.slice(0, 101); // заголовок + 100 строк
    const html = this.buildTableHtml(limitedRows);
    const sanitized = this.sanitizer.bypassSecurityTrustHtml(html);

    this.previewState.set({
      kind: 'html',
      content: sanitized,
    });
  }

  private async renderText(url: string, extension: string): Promise<void> {
    const arrayBuffer = await this.fetchArrayBuffer(url);
    let text = this.decodeText(arrayBuffer);

    if (extension === 'json') {
      try {
        const parsed = JSON.parse(text);
        text = JSON.stringify(parsed, null, 2);
      } catch {
        // ignore JSON parse errors, show raw text
      }
    }

    this.previewState.set({
      kind: 'text',
      content: text || 'Файл пуст.',
    });
  }

  private async renderImage(url: string, mime?: string): Promise<void> {
    const arrayBuffer = await this.fetchArrayBuffer(url);
    const blob = new Blob([arrayBuffer], {
      type: mime ?? this.guessMimeFromUrl(url) ?? 'application/octet-stream',
    });

    this.revokeObjectUrl();

    this.objectUrl = URL.createObjectURL(blob);
    this.previewState.set({
      kind: 'image',
      url: this.objectUrl,
      alt: this.selected()?.name ?? 'Изображение',
    });
  }

  private async fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
    return await firstValueFrom(
      this.http.get(url, { responseType: 'arraybuffer' })
    );
  }

  private decodeText(buffer: ArrayBuffer): string {
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
      // ignore and return UTF-8 result with replacement chars
    }

    return result;
  }

  private buildTableHtml(rows: unknown[][]): string {
    if (!rows.length) {
      return '<p class="preview__note">Таблица не содержит данных.</p>';
    }

    const [header, ...body] = rows;

    const escape = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
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
        ? '<caption>Показаны первые 100 строк.</caption>'
        : '';

    return `<table class="preview-table">${truncated}${headerHtml}${bodyHtml}</table>`;
  }

  private getExtension(node: InstructionNode): string {
    if (node.ext) {
      return node.ext.toLowerCase();
    }

    const lastSegment = node.path.split('/').pop() ?? '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex === -1) {
      return '';
    }

    return lastSegment.slice(dotIndex + 1).toLowerCase();
  }

  private resolveAssetPath(path: string): string {
    if (!path) {
      return '';
    }

    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) {
      return path;
    }

    return path.startsWith('/') ? path : `/${path}`;
  }

  private buildAbsoluteUrl(relativeOrAbsolute: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return new URL(relativeOrAbsolute, window.location.origin).href;
    } catch {
      return null;
    }
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

  private guessMimeFromUrl(url: string): string | null {
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
}
