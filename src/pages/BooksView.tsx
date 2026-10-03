import React, { useEffect, useState } from 'react';
import { bookService } from '../services/bookService';
import type { Book } from '../types';
import { Button, EmptyState } from '../components/ui';
import { Book as BookIcon, Plus, Calendar, Target } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { BookCover } from '../components/books/BookCover';
import { BookCreateModal } from '../components/books/BookCreateModal';
import { BookDetailStudio } from '../components/books/BookDetailStudio';

export const BooksView: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const loadBooks = async () => {
    try {
      const all = await bookService.getAll();
      setBooks(all);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleCreateBook = async (data: Parameters<typeof bookService.create>[0]) => {
    const newBook = await bookService.create(data);
    setBooks((prev) => [newBook, ...prev]);
    setSelectedBook(newBook);
  };

  if (selectedBook) {
    return (
      <BookDetailStudio
        book={selectedBook}
        onBack={() => {
          setSelectedBook(null);
          loadBooks();
        }}
        onUpdateBook={(updated) => {
          setSelectedBook(updated);
          setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Books & Novels
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Long-form multi-chapter manuscripts, novels, memoirs, and volumes.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Book Project</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-xs text-stone-400 font-mono">
          Loading library manuscripts...
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="w-8 h-8 text-amber-600" />}
          title="No Books Created Yet"
          description="Build your first multi-chapter novel, memoir, poetry anthology, or series."
          action={
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Book Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {books.map((b) => {
            const progress = Math.min(
              100,
              Math.round((b.currentWordCount / (b.targetWordCount || 50000)) * 100)
            );
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBook(b)}
                className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-600/40 dark:hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex gap-4 items-start mb-4">
                  <BookCover
                    title={b.title}
                    subtitle={b.subtitle}
                    author={b.author}
                    coverStyle={b.coverStyle}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 mb-1">
                      {b.genre || 'Novel'}
                    </span>
                    <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base leading-snug line-clamp-2 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                      {b.title}
                    </h3>
                    <p className="text-xs text-stone-500 truncate mt-0.5">By {b.author}</p>
                    <span className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full capitalize font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                      {b.status}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Target className="w-3 h-3 text-stone-400" />
                      {b.currentWordCount.toLocaleString()} words
                    </span>
                    <span className="font-mono text-stone-400">{progress}%</span>
                  </div>

                  <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(b.updatedAt)}
                    </span>
                    <span className="text-amber-600 font-medium group-hover:underline">
                      Open Studio →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Book Creation Modal */}
      <BookCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreate={handleCreateBook}
      />
    </div>
  );
};
