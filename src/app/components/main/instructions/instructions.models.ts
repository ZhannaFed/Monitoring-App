import { SafeHtml, SafeResourceUrl } from '@angular/platform-browser';

export type InstructionNodeType = 'file' | 'folder';

export interface InstructionNode {
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

export interface PreviewMessageLink {
  label: string;
  url: string;
}

export interface SearchContentMatch {
  node: InstructionNode;
  snippet: SafeHtml;
}

export type PreviewState =
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

export type PreviewOf<K extends PreviewState['kind']> = Extract<
  PreviewState,
  { kind: K }
>;
