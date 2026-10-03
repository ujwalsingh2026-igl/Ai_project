export type BookStatus = 'planning' | 'in_progress' | 'completed' | 'on_hold' | 'archived';

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
  title: string;
  number: number;
  order: number;
  content: string;
  status: 'draft' | 'revised' | 'final';
  wordCount: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Book {
  id: string;
  title: string;
  subtitle?: string;
  author: string;
  description?: string;
  coverImage?: string;
  genre?: string;
  tags: string[];
  status: BookStatus;
  wordGoal?: number;
  currentWordCount: number;
  userId?: string;
  createdAt: number;
  updatedAt: number;
}
