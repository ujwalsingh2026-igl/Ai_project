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
  // Type-specific stats
  linesCount?: number;
  stanzasCount?: number;
  scenesCount?: number;
  panelsCount?: number;
  pagesCount?: number;
  estimatedRuntimeMinutes?: number;
}

export interface NoteMetadata {
  checklistCompleted?: number;
  checklistTotal?: number;
  color?: string;
  pinned?: boolean;
}

export interface PoemMetadata {
  form?: 'free-verse' | 'sonnet' | 'haiku' | 'limerick' | 'ballad' | 'custom';
  rhymeScheme?: string;
  meter?: string;
  stanzasCount?: number;
}

export interface ScriptMetadata {
  format?: 'feature' | 'short' | 'television' | 'stage';
  sceneCount?: number;
  characters?: string[];
  estimatedRuntimeMinutes?: number;
}

export interface ComicMetadata {
  issueNumber?: number;
  pageCount?: number;
  panelCount?: number;
  artist?: string;
}

export interface JournalMetadata {
  entryDate?: string; // YYYY-MM-DD
  entryTime?: string; // HH:MM
  mood?: 'serene' | 'inspired' | 'reflective' | 'melancholy' | 'energetic' | 'neutral';
  weather?: string;
  location?: string;
}

export interface NovelMetadata {
  targetWordCount?: number;
  chapterNumber?: number;
  povCharacter?: string;
  synopsis?: string;
  status?: 'outline' | 'first-draft' | 'revision' | 'completed';
}

export interface StoryMetadata {
  genre?: string;
  theme?: string;
  targetWordCount?: number;
}

export interface DocumentTypeMetadata {
  note?: NoteMetadata;
  poem?: PoemMetadata;
  script?: ScriptMetadata;
  comic?: ComicMetadata;
  journal?: JournalMetadata;
  novel?: NovelMetadata;
  story?: StoryMetadata;
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
  metadata?: DocumentTypeMetadata;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}
