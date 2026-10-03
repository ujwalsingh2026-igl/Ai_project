import type { DocumentStats } from '../types';

export function calculateDocumentStats(text: string): DocumentStats {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      words: 0,
      characters: 0,
      sentences: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      estimatedPages: 0,
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const characters = text.length;
  const sentences = (trimmed.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || (words > 0 ? 1 : 0);
  const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0).length || 1;
  const readingTimeMinutes = Math.ceil(words / 200);
  const estimatedPages = Math.max(1, Math.ceil(words / 300));

  return {
    words,
    characters,
    sentences,
    paragraphs,
    readingTimeMinutes,
    estimatedPages,
  };
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}
