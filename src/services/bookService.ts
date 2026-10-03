import { db } from '../storage/db';
import type { Book, Chapter } from '../types';
import { generateSafeId } from '../utils/security';

export const bookService = {
  async getAll(): Promise<Book[]> {
    return await db.books.toArray();
  },

  async getById(id: string): Promise<Book | undefined> {
    return await db.books.get(id);
  },

  async create(title: string, author = 'Author', genre = ''): Promise<Book> {
    const now = Date.now();
    const newBook: Book = {
      id: generateSafeId(),
      title,
      author,
      genre,
      tags: [],
      status: 'planning',
      currentWordCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await db.books.add(newBook);
    return newBook;
  },

  async getChapters(bookId: string): Promise<Chapter[]> {
    return await db.chapters.where('bookId').equals(bookId).sortBy('order');
  },
};
