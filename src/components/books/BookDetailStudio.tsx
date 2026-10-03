import React, { useState, useEffect } from 'react';
import type { Book, Chapter, BookRollupStats, BookStatus, ChapterStatus } from '../../types';
import { bookService } from '../../services/bookService';
import { documentService } from '../../services/documentService';
import { useApp } from '../../state';
import { BookCover } from './BookCover';
import { ManuscriptCompileModal } from './ManuscriptCompileModal';
import { StoryDevelopmentHub } from '../story/StoryDevelopmentHub';
import { Button } from '../ui';
import {
  ArrowLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Edit3,
  Trash2,
  BookOpen,
  Compass,
  Layers,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface BookDetailStudioProps {
  book: Book;
  onBack: () => void;
  onUpdateBook: (updated: Book) => void;
}

const BOOK_STATUS_OPTIONS: { id: BookStatus; label: string }[] = [
  { id: 'planning', label: 'Planning' },
  { id: 'outlining', label: 'Outlining' },
  { id: 'drafting', label: 'Drafting' },
  { id: 'revising', label: 'Revising' },
  { id: 'editing', label: 'Editing' },
  { id: 'completed', label: 'Completed' },
];

const CHAPTER_STATUS_COLORS: Record<ChapterStatus, string> = {
  outline: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  draft: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  revised: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
  final: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
};

export const BookDetailStudio: React.FC<BookDetailStudioProps> = ({
  book,
  onBack,
  onUpdateBook,
}) => {
  const { setActiveDocument, setCurrentView } = useApp();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [stats, setStats] = useState<BookRollupStats>({
    totalWords: 0,
    estimatedPages: 0,
    readingTimeMinutes: 0,
    chaptersCount: 0,
    progressPercent: 0,
  });
  const [compileOpen, setCompileOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(book.title);
  const [studioTab, setStudioTab] = useState<'manuscript' | 'worldbuilding'>('manuscript');

  const loadData = async () => {
    const chs = await bookService.getChapters(book.id);
    setChapters(chs);
    const st = await bookService.getRollupStats(book.id);
    setStats(st);
  };

  useEffect(() => {
    loadData();
  }, [book.id]);

  const handleStatusChange = async (newStatus: BookStatus) => {
    await bookService.update(book.id, { status: newStatus });
    onUpdateBook({ ...book, status: newStatus });
  };

  const handleTitleSave = async () => {
    if (!titleInput.trim()) return;
    await bookService.update(book.id, { title: titleInput.trim() });
    onUpdateBook({ ...book, title: titleInput.trim() });
    setEditingTitle(false);
  };

  const handleAddChapter = async () => {
    const nextNum = chapters.length + 1;
    await bookService.createChapter(book.id, `Chapter ${nextNum}`);
    await loadData();
  };

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    await bookService.moveChapter(book.id, chapterId, direction);
    await loadData();
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (confirm('Delete this chapter?')) {
      await bookService.deleteChapter(chapterId);
      await loadData();
    }
  };

  const handleChapterStatusChange = async (chapterId: string, status: ChapterStatus) => {
    await bookService.updateChapter(chapterId, { status });
    await loadData();
  };

  // Open Chapter directly in Literia Core Editor
  const handleOpenChapterInEditor = async (chapter: Chapter) => {
    // Create or retrieve document representation for this chapter
    const doc = await documentService.create(
      chapter.title,
      'novel',
      chapter.content
    );
    // Link document with book and chapter
    await documentService.update(doc.id, {
      bookId: book.id,
      chapterId: chapter.id,
    });
    setActiveDocument(doc);
    setCurrentView('document');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/80 dark:border-stone-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Books</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCompileOpen(true)}
            disabled={chapters.length === 0}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            <span>Compile Manuscript</span>
          </Button>

          <Button size="sm" onClick={handleAddChapter}>
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New Chapter</span>
          </Button>
        </div>
      </div>

      {/* Book Hero Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row gap-6 items-start">
        {/* Cover Preview */}
        <BookCover
          title={book.title}
          subtitle={book.subtitle}
          author={book.author}
          coverStyle={book.coverStyle}
          size="md"
        />

        {/* Book Details & Meta */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                {book.genre || 'Novel'}
              </span>

              {/* Status Selector */}
              <select
                value={book.status}
                onChange={(e) => handleStatusChange(e.target.value as BookStatus)}
                aria-label="Book production status"
                className="text-[11px] px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700 bg-transparent font-medium capitalize outline-none"
              >
                {BOOK_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {editingTitle ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="text-2xl font-serif font-bold px-2 py-1 border rounded"
                  autoFocus
                />
                <Button size="sm" onClick={handleTitleSave}>
                  Save
                </Button>
              </div>
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 cursor-pointer hover:opacity-80 transition"
                title="Click to edit title"
              >
                {book.title}
              </h1>
            )}

            {book.subtitle && (
              <p className="text-sm font-serif italic text-stone-500">
                {book.subtitle}
              </p>
            )}

            <p className="text-xs text-stone-500 pt-1">
              By <span className="font-semibold text-stone-700 dark:text-stone-300">{book.author}</span>
            </p>
          </div>

          {/* Description / Synopsis */}
          {book.description && (
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed bg-stone-50 dark:bg-stone-800/40 p-3 rounded-lg border border-stone-100 dark:border-stone-800/80">
              {book.description}
            </p>
          )}

          {/* Rollup Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-[10px] text-stone-400 block font-mono">TOTAL WORDS</span>
              <span className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                {stats.totalWords.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-[10px] text-stone-400 block font-mono">EST. PAGES</span>
              <span className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                ~{stats.estimatedPages}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-[10px] text-stone-400 block font-mono">READING TIME</span>
              <span className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                {stats.readingTimeMinutes} min
              </span>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800">
              <span className="text-[10px] text-stone-400 block font-mono">CHAPTERS</span>
              <span className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
                {stats.chaptersCount}
              </span>
            </div>
          </div>

          {/* Target Word Count Progress */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-stone-500">
              <span>Goal Progress: {stats.totalWords.toLocaleString()} / {(book.targetWordCount || 50000).toLocaleString()} words</span>
              <span className="font-mono font-medium">{stats.progressPercent}%</span>
            </div>
            <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all duration-300"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio View Switcher */}
      <div className="flex items-center gap-2 border-b border-stone-200/80 dark:border-stone-800 pb-2">
        <button
          onClick={() => setStudioTab('manuscript')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all',
            studioTab === 'manuscript'
              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Table of Contents & Chapters</span>
        </button>

        <button
          onClick={() => setStudioTab('worldbuilding')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all',
            studioTab === 'worldbuilding'
              ? 'bg-amber-600 text-white font-semibold shadow-xs'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Story Bible & World-Building</span>
        </button>
      </div>

      {studioTab === 'worldbuilding' ? (
        <div className="pt-2">
          <StoryDevelopmentHub bookId={book.id} />
        </div>
      ) : (
        /* Table of Contents Section */
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100">
                Table of Contents
              </h2>

            <p className="text-xs text-stone-500">
              Manage chapters, order, status, and write sequentially.
            </p>
          </div>
          <Button size="sm" onClick={handleAddChapter}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Chapter</span>
          </Button>
        </div>

        {chapters.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-stone-400 text-xs">
            No chapters yet. Click "Add Chapter" to begin your table of contents.
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-4 hover:border-stone-300 dark:hover:border-stone-700 transition group"
              >
                {/* Left: Reorder Stepper & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5 text-stone-400">
                    <button
                      onClick={() => handleMoveChapter(ch.id, 'up')}
                      disabled={idx === 0}
                      className="hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                      title="Move Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveChapter(ch.id, 'down')}
                      disabled={idx === chapters.length - 1}
                      className="hover:text-stone-700 dark:hover:text-stone-200 disabled:opacity-20"
                      title="Move Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-mono text-xs text-stone-400 w-6">
                    #{ch.number}
                  </span>

                  <div className="min-w-0">
                    <h3 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-sm truncate">
                      {ch.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-stone-400 font-mono mt-0.5">
                      <span>{ch.wordCount.toLocaleString()} words</span>
                      <span>•</span>
                      <span>~{Math.max(1, Math.ceil(ch.wordCount / 300))} pages</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status selector & Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={ch.status}
                    onChange={(e) =>
                      handleChapterStatusChange(ch.id, e.target.value as ChapterStatus)
                    }
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium border-none outline-none capitalize ${
                      CHAPTER_STATUS_COLORS[ch.status]
                    }`}
                  >
                    <option value="outline">Outline</option>
                    <option value="draft">Draft</option>
                    <option value="revised">Revised</option>
                    <option value="final">Final</option>
                  </select>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenChapterInEditor(ch)}
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    <span>Write</span>
                  </Button>

                  <button
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                    title="Delete Chapter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {/* Manuscript Compilation Modal */}

      <ManuscriptCompileModal
        isOpen={compileOpen}
        onClose={() => setCompileOpen(false)}
        bookTitle={book.title}
        bookSubtitle={book.subtitle}
        author={book.author}
        genre={book.genre}
        chapters={chapters}
        stats={stats}
      />
    </div>
  );
};
