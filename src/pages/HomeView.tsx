import React, { useEffect, useState } from 'react';
import { useApp } from '../state';
import { documentService } from '../services/documentService';
import { bookService } from '../services/bookService';
import { activityService } from '../services/activityService';
import type { Document, Book, Activity, DocumentType } from '../types';
import { Card, Button, Badge } from '../components/ui';
import { LiteriaLogo, LiteriaWordmark } from '../components/brand';
import { formatDate } from '../utils/formatters';
import {
  FileText,
  Book as BookIcon,
  BookOpen,
  Feather,
  Sparkles,
  Plus,
  ArrowRight,
  Clock,
  Star,
  Flame,
  FileCheck,
  Film,
  Smile,
  Compass,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { setCurrentView, openDocument, createDocumentAndOpen } = useApp();

  const [latestDoc, setLatestDoc] = useState<Document | null>(null);
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [favoriteDocs, setFavoriteDocs] = useState<Document[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState({
    totalWords: 0,
    totalDocs: 0,
    totalBooks: 0,
    wordsToday: 0,
    streakDays: 1,
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const allDocs = await documentService.getAll();
      const allBooks = await bookService.getAll();
      const recentActs = await activityService.getRecent(6);

      // Latest document
      const latest = allDocs.length > 0
        ? [...allDocs].sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt))[0]
        : null;
      setLatestDoc(latest);

      // Recent 4 documents
      const recents = [...allDocs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
      setRecentDocs(recents);

      // Favorites
      const favs = allDocs.filter((d) => d.isFavorite).slice(0, 4);
      setFavoriteDocs(favs);

      // Recent books
      setRecentBooks(allBooks.slice(0, 3));

      // Activities
      setActivities(recentActs);

      // Stats calculation
      const totalWords = allDocs.reduce((acc, d) => acc + (d.stats?.words || 0), 0);
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const wordsToday = allDocs
        .filter((d) => d.updatedAt >= startOfToday)
        .reduce((acc, d) => acc + (d.stats?.words || 0), 0);

      setStats({
        totalWords,
        totalDocs: allDocs.length,
        totalBooks: allBooks.length,
        wordsToday,
        streakDays: allDocs.length > 0 ? 3 : 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleToggleFav = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    await documentService.toggleFavorite(docId);
    await loadDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quickCreateTypes: Array<{
    type: DocumentType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { type: 'blank', label: 'Blank Document', description: 'Pure white page', icon: FileText },
    { type: 'note', label: 'Quick Note', description: 'Rapid thoughts & memos', icon: Feather },
    { type: 'story', label: 'Short Story', description: 'Narrative prose & tale', icon: BookOpen },
    { type: 'novel', label: 'Novel', description: 'Chaptered manuscript', icon: BookIcon },
    { type: 'book', label: 'Book Project', description: 'Multi-part publication', icon: Compass },
    { type: 'poem', label: 'Poem & Verse', description: 'Stanzas & lyrical meter', icon: Feather },
    { type: 'script', label: 'Script / Screenplay', description: 'Scenes, dialogue, actions', icon: Film },
    { type: 'comic', label: 'Comic Script', description: 'Panel descriptions & speech', icon: Sparkles },
    { type: 'journal', label: 'Daily Journal', description: 'Reflective dated entry', icon: Smile },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-stone-400 text-xs">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-2">
      {/* 1. WELCOME AREA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-stone-200/60 dark:border-stone-800">
        <div className="flex items-center gap-4">
          <LiteriaLogo size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-stone-400 font-medium">
                {getGreeting()}, Author
              </span>
              <Badge variant="accent">Writer Studio</Badge>
            </div>
            <LiteriaWordmark size="lg" showTagline={true} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => createDocumentAndOpen('Untitled Manuscript', 'blank')}
            size="md"
            className="gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Piece</span>
          </Button>
        </div>
      </div>

      {/* 2. CONTINUE WRITING HERO WIDGET */}
      {latestDoc ? (
        <Card className="bg-gradient-to-br from-white to-stone-50 dark:from-stone-900 dark:to-stone-900/60 border-stone-200/90 dark:border-stone-800 p-6 sm:p-7 shadow-soft">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Continue Writing</span>
            </div>
            <Badge variant="neutral" className="capitalize">
              {latestDoc.type}
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="min-w-0 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mb-2 truncate">
                {latestDoc.title || 'Untitled Manuscript'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-serif line-clamp-2 leading-relaxed">
                {latestDoc.plainTextPreview || 'No content drafted yet. Pick up where your inspiration left off...'}
              </p>

              {/* Progress meta */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 mt-4">
                <span>{latestDoc.stats.words} words written</span>
                <span>•</span>
                <span>~{latestDoc.stats.readingTimeMinutes} min reading time</span>
                <span>•</span>
                <span>Last opened {formatDate(latestDoc.lastOpenedAt || latestDoc.updatedAt)}</span>
              </div>
            </div>

            <Button
              onClick={() => openDocument(latestDoc.id)}
              size="lg"
              className="shrink-0 gap-2 font-serif text-sm px-6"
            >
              <span>Resume Manuscript</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center bg-stone-50/50 dark:bg-stone-900/40 border-dashed border-stone-300 dark:border-stone-800">
          <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 mx-auto flex items-center justify-center text-stone-400 mb-3">
            <Feather className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-stone-100 mb-1">
            Your Writing Canvas Awaits
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-5 leading-relaxed">
            Begin your literary journey with notes, chapters, poetry, or a full book project.
          </p>
          <Button onClick={() => createDocumentAndOpen('First Manuscript', 'blank')} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Start Writing Now
          </Button>
        </Card>
      )}

      {/* 3. QUICK CREATE (9 DOCUMENT TYPES) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
            Quick Create
          </h3>
          <span className="text-xs text-stone-400">9 formats tailored for every written form</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          {quickCreateTypes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                onClick={() => createDocumentAndOpen(`New ${item.label}`, item.type)}
                className="group flex flex-col p-4 rounded-xl border border-stone-200/70 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-subtle text-left transition-all duration-150"
              >
                <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 group-hover:bg-amber-50 dark:group-hover:bg-amber-950/40 flex items-center justify-center text-stone-700 dark:text-stone-300 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors mb-2.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-sm group-hover:text-amber-900 dark:group-hover:text-amber-200 transition-colors">
                  {item.label}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                  {item.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. WRITING OVERVIEW & HABITS */}
      <section className="space-y-4">
        <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
          Writing Overview
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4 flex flex-col justify-between">
            <span className="text-xs text-stone-400 font-medium">Total Words</span>
            <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
              {stats.totalWords.toLocaleString()}
            </div>
            <span className="text-[10px] text-stone-400 mt-1">Across all documents</span>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <span className="text-xs text-stone-400 font-medium">Manuscripts</span>
            <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
              {stats.totalDocs}
            </div>
            <span className="text-[10px] text-stone-400 mt-1">{stats.totalBooks} book projects</span>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <span className="text-xs text-stone-400 font-medium">Today's Words</span>
            <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2 flex items-center gap-1.5">
              <span>{stats.wordsToday.toLocaleString()}</span>
              {stats.wordsToday > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <span className="text-[10px] text-stone-400 mt-1">Written today</span>
          </Card>

          <Card className="p-4 flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-800 dark:text-amber-400 font-medium">Streak</span>
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-2">
              {stats.streakDays} Days
            </div>
            <span className="text-[10px] text-stone-400 mt-1">Active writing routine</span>
          </Card>
        </div>
      </section>

      {/* 5. RECENT DOCUMENTS & BOOKS SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents Column (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
              Recent Documents
            </h3>
            <button
              onClick={() => setCurrentView('library')}
              className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <Card className="p-6 text-center text-xs text-stone-400">
              No recent documents.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {recentDocs.map((doc) => (
                <Card
                  key={doc.id}
                  interactive
                  onClick={() => openDocument(doc.id)}
                  className="flex items-center justify-between p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate flex items-center gap-2">
                        <span>{doc.title || 'Untitled'}</span>
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {doc.type}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-stone-400 truncate font-serif mt-0.5">
                        {doc.plainTextPreview || 'Empty manuscript'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-[11px] text-stone-400 text-right hidden sm:block">
                      <div>{doc.stats.words} words</div>
                      <div>{formatDate(doc.updatedAt)}</div>
                    </div>
                    <button
                      onClick={(e) => handleToggleFav(e, doc.id)}
                      className="p-1.5 rounded-md text-stone-300 hover:text-amber-500 transition-colors"
                      aria-label="Toggle favorite"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          doc.isFavorite ? 'fill-amber-400 text-amber-500' : ''
                        }`}
                      />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Books & Favorites Column (1 col) */}
        <div className="space-y-6">
          {/* Books Widget */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
                Books & Series
              </h3>
              <button
                onClick={() => setCurrentView('book')}
                className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 flex items-center gap-1 transition"
              >
                <span>All Books</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentBooks.length === 0 ? (
              <Card className="p-6 text-center text-xs text-stone-400">
                No book projects yet.
              </Card>
            ) : (
              <div className="space-y-2.5">
                {recentBooks.map((book) => (
                  <Card
                    key={book.id}
                    interactive
                    onClick={() => setCurrentView('book')}
                    className="p-3.5 flex items-center gap-3"
                  >
                    <div className="w-9 h-12 bg-stone-800 text-stone-200 rounded flex items-center justify-center font-serif text-sm shrink-0 shadow-xs">
                      {book.title.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-serif font-bold text-stone-900 dark:text-stone-100 truncate">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-stone-400 truncate">By {book.author}</p>
                      <div className="text-[10px] text-stone-400 mt-1 capitalize">
                        {book.status} · {book.currentWordCount} words
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Favorites Snippet */}
          {favoriteDocs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Starred Manuscripts
              </h4>
              <div className="space-y-1.5">
                {favoriteDocs.map((fav) => (
                  <div
                    key={fav.id}
                    onClick={() => openDocument(fav.id)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/80 cursor-pointer text-xs transition"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                      <span className="truncate font-serif text-stone-800 dark:text-stone-200">
                        {fav.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">
                      {fav.stats.words} w
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. RECENT ACTIVITY STREAM */}
      <section className="space-y-4 pt-4 border-t border-stone-200/60 dark:border-stone-800">
        <h3 className="text-base font-serif font-bold text-stone-900 dark:text-stone-100">
          Recent Activity
        </h3>

        {activities.length === 0 ? (
          <div className="text-xs text-stone-400 italic">No recent activity recorded.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-stone-50/70 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 text-xs"
              >
                <div className="p-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-200/80 dark:border-stone-700 text-stone-600 dark:text-stone-300 shrink-0">
                  <FileCheck className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-stone-800 dark:text-stone-200 truncate">
                    <span className="capitalize font-semibold">{act.action}</span> "{act.targetTitle}"
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(act.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
