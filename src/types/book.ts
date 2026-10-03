export type BookStatus =
  | 'planning'
  | 'outlining'
  | 'drafting'
  | 'revising'
  | 'editing'
  | 'completed';

export type ChapterStatus = 'outline' | 'draft' | 'revised' | 'final';

export interface BookCoverStyle {
  bgColor: string;
  textColor: string;
  pattern: 'minimal' | 'classic' | 'vintage' | 'botanical' | 'modern';
  accentColor: string;
}

export interface BookPart {
  id: string;
  bookId: string;
  title: string;
  order: number;
}

export interface Chapter {
  id: string;
  bookId: string;
  partId?: string | null;
  sectionTitle?: string;
  title: string;
  number: number;
  order: number;
  content: string;
  status: ChapterStatus;
  wordCount: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookRollupStats {
  totalWords: number;
  estimatedPages: number;
  readingTimeMinutes: number;
  chaptersCount: number;
  progressPercent: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  description?: string; // blurb / synopsis
  coverStyle?: BookCoverStyle;
  coverImage?: string;
  genre?: string;
  tags: string[];
  status: BookStatus;
  targetWordCount?: number;
  currentWordCount: number;
  userId?: string;
  createdAt: number;
  updatedAt: number;
}
