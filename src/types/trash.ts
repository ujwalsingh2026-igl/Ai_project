import type { DocumentType } from './document';

export type TrashItemType = 'document' | 'book' | 'chapter' | 'folder';

export interface TrashItem {
  id: string;
  originalId: string;
  itemType: TrashItemType;
  title: string;
  documentType?: DocumentType;
  originalLocation?: string;
  deletedAt: number;
  dataSnapshot: Record<string, unknown>;
}
