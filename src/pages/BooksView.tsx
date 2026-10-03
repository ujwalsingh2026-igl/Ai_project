import React, { useEffect, useState } from 'react';
import { bookService } from '../services/bookService';
import type { Book } from '../types';
import { Card, Button, EmptyState } from '../components/ui';
import { Book as BookIcon, Plus, BookOpen, Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const BooksView: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await bookService.getAll();
        setBooks(all);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleCreateBook = async () => {
    const newBook = await bookService.create('New Novel Project', 'Author', 'Fiction');
    setBooks((prev) => [...prev, newBook]);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Books & Novels
          </h1>
          <p className="text-xs text-stone-500">
            Long-form multi-chapter manuscripts, series, and volumes.
          </p>
        </div>
        <Button onClick={handleCreateBook} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Book</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-stone-400">Loading books...</div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookIcon className="w-6 h-6" />}
          title="No Books Created"
          description="Create your first multi-chapter novel, memoir, poetry volume, or anthology."
          action={
            <Button size="sm" onClick={handleCreateBook}>
              <Plus className="w-4 h-4 mr-1.5" />
              Create Book Project
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {books.map((b) => (
            <Card key={b.id} interactive className="flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600 dark:text-stone-300 mb-3">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base mb-1">
                  {b.title}
                </h3>
                <p className="text-xs text-stone-500 mb-3">By {b.author}</p>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-3 border-t border-stone-100 dark:border-stone-800">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(b.updatedAt)}
                </span>
                <span className="capitalize">{b.status}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
