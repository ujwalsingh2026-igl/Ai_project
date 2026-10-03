import { db } from '../storage/db';
import type { Book, Chapter, BookRollupStats, BookCoverStyle } from '../types';
import { generateSafeId } from '../utils/security';
import { activityService } from './activityService';

export const DEFAULT_BOOK_COVER: BookCoverStyle = {
  bgColor: '#1c1917',
  textColor: '#fafaf9',
  pattern: 'classic',
  accentColor: '#d97706',
};

export const bookService = {
  async getAll(): Promise<Book[]> {
    return await db.books.toArray();
  },

  async getById(id: string): Promise<Book | undefined> {
    return await db.books.get(id);
  },

  async create(data: {
    title: string;
    subtitle?: string;
    author?: string;
    genre?: string;
    targetWordCount?: number;
    description?: string;
    coverStyle?: BookCoverStyle;
  }): Promise<Book> {
    const now = Date.now();
    const newBook: Book = {
      id: generateSafeId(),
      title: data.title || 'Untitled Book',
      subtitle: data.subtitle || '',
      author: data.author || 'Author',
      genre: data.genre || 'Fiction',
      description: data.description || '',
      coverStyle: data.coverStyle || DEFAULT_BOOK_COVER,
      tags: [],
      status: 'planning',
      targetWordCount: data.targetWordCount || 50000,
      currentWordCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.books.add(newBook);
    await activityService.log('created', newBook.id, newBook.title, 'book');

    // Create default Chapter 1 automatically
    await this.createChapter(newBook.id, 'Chapter 1: The Beginning');

    return newBook;
  },

  async update(id: string, updates: Partial<Book>): Promise<void> {
    const existing = await db.books.get(id);
    if (!existing) return;

    await db.books.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    if (updates.title && updates.title !== existing.title) {
      await activityService.log('renamed', id, updates.title, 'book');
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.books.get(id);
    if (!existing) return;

    // Delete associated chapters
    await db.chapters.where('bookId').equals(id).delete();
    // Delete book
    await db.books.delete(id);
    await activityService.log('deleted', id, existing.title, 'book');
  },

  async getChapters(bookId: string): Promise<Chapter[]> {
    const chapters = await db.chapters.where('bookId').equals(bookId).toArray();
    return chapters.sort((a, b) => a.order - b.order);
  },

  async createChapter(bookId: string, title = 'Untitled Chapter', content = ''): Promise<Chapter> {
    const now = Date.now();
    const existingChapters = await this.getChapters(bookId);
    const nextOrder = existingChapters.length + 1;
    const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;

    const newChapter: Chapter = {
      id: generateSafeId(),
      bookId,
      title,
      number: nextOrder,
      order: nextOrder,
      content: content || `<p>Begin writing ${title}...</p>`,
      status: 'draft',
      wordCount: words,
      createdAt: now,
      updatedAt: now,
    };

    await db.chapters.add(newChapter);
    await this.recalculateBookWords(bookId);
    return newChapter;
  },

  async updateChapter(chapterId: string, updates: Partial<Chapter>): Promise<void> {
    const existing = await db.chapters.get(chapterId);
    if (!existing) return;

    let wordCount = existing.wordCount;
    if (updates.content !== undefined) {
      const text = updates.content.replace(/<[^>]+>/g, ' ').trim();
      wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    }

    await db.chapters.update(chapterId, {
      ...updates,
      wordCount,
      updatedAt: Date.now(),
    });

    await this.recalculateBookWords(existing.bookId);
  },

  async deleteChapter(chapterId: string): Promise<void> {
    const chapter = await db.chapters.get(chapterId);
    if (!chapter) return;

    await db.chapters.delete(chapterId);
    // Renumber remaining chapters
    const remaining = await this.getChapters(chapter.bookId);
    for (let i = 0; i < remaining.length; i++) {
      await db.chapters.update(remaining[i].id, {
        order: i + 1,
        number: i + 1,
      });
    }
    await this.recalculateBookWords(chapter.bookId);
  },

  async moveChapter(bookId: string, chapterId: string, direction: 'up' | 'down'): Promise<void> {
    const chapters = await this.getChapters(bookId);
    const index = chapters.findIndex((c) => c.id === chapterId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = chapters[index - 1];
      chapters[index - 1] = chapters[index];
      chapters[index] = temp;
    } else if (direction === 'down' && index < chapters.length - 1) {
      const temp = chapters[index + 1];
      chapters[index + 1] = chapters[index];
      chapters[index] = temp;
    } else {
      return;
    }

    // Persist new orders
    for (let i = 0; i < chapters.length; i++) {
      await db.chapters.update(chapters[i].id, {
        order: i + 1,
        number: i + 1,
      });
    }
  },

  async recalculateBookWords(bookId: string): Promise<number> {
    const chapters = await this.getChapters(bookId);
    const totalWords = chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    await db.books.update(bookId, {
      currentWordCount: totalWords,
      updatedAt: Date.now(),
    });
    return totalWords;
  },

  async getRollupStats(bookId: string): Promise<BookRollupStats> {
    const book = await db.books.get(bookId);
    const chapters = await this.getChapters(bookId);
    const totalWords = chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);
    const targetWordCount = book?.targetWordCount || 50000;

    return {
      totalWords,
      chaptersCount: chapters.length,
      estimatedPages: Math.max(1, Math.ceil(totalWords / 300)),
      readingTimeMinutes: Math.ceil(totalWords / 200),
      progressPercent: Math.min(100, Math.round((totalWords / targetWordCount) * 100)),
    };
  },

  async compileManuscript(bookId: string): Promise<{
    title: string;
    subtitle: string;
    author: string;
    genre: string;
    fullContent: string;
    chapters: Chapter[];
    stats: BookRollupStats;
  }> {
    const book = await db.books.get(bookId);
    const chapters = await this.getChapters(bookId);
    const stats = await this.getRollupStats(bookId);

    const compiledHtml = chapters
      .map(
        (c) => `
        <article class="compiled-chapter mb-16">
          <h2 class="text-2xl font-serif font-bold text-center mb-6">${c.title}</h2>
          <div class="prose-content leading-relaxed">${c.content}</div>
        </article>
      `
      )
      .join('\n<hr class="my-12 border-stone-300 dark:border-stone-700"/>\n');

    return {
      title: book?.title || 'Untitled',
      subtitle: book?.subtitle || '',
      author: book?.author || 'Author',
      genre: book?.genre || '',
      fullContent: compiledHtml,
      chapters,
      stats,
    };
  },
};
