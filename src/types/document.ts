export type DocumentType =
  | 'blank'
  | 'note'
  | 'story'
  | 'novel'
  | 'book'
  | 'poem'
  | 'script'
  | 'comic'
  | 'journal'
  | 'draft';

export interface DocumentStats {
  words: number;
  characters: number;
  sentences: number;
  paragraphs: number;
  readingTimeMinutes: number;
  estimatedPages: number;
}

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  content: string; // JSON or HTML representation
  plainTextPreview?: string;
  userId?: string;
  folderId?: string | null;
  bookId?: string | null;
  chapterId?: string | null;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isDraft: boolean;
  isDeleted: boolean;
  version: number;
  stats: DocumentStats;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}
