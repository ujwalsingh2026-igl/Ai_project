import React, { useState, useEffect } from 'react';
import { StoryDevelopmentHub } from '../components/story/StoryDevelopmentHub';
import { bookService } from '../services/bookService';
import type { Book } from '../types';
import { Compass, Book as BookIcon } from 'lucide-react';

export const StoryBibleView: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const all = await bookService.getAll();
      setBooks(all);
    };
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-500" />
            <span>Story Bible & World-Building</span>
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Craft living characters, sensory locations, chronological timelines, and dramatic scene index cards.
          </p>
        </div>

        {/* Book filter dropdown if books exist */}
        {books.length > 0 && (
          <div className="flex items-center gap-2">
            <BookIcon className="w-4 h-4 text-stone-400" />
            <select
              value={selectedBookId || ''}
              onChange={(e) => setSelectedBookId(e.target.value || null)}
              className="h-8 px-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
            >
              <option value="">All Works & Universes (Global)</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  Project: {b.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Story Hub */}
      <StoryDevelopmentHub bookId={selectedBookId} />
    </div>
  );
};
