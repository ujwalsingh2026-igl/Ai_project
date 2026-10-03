import React from 'react';
import { Home, BookOpen, Edit3, Search, Menu } from 'lucide-react';
import { useApp } from '../../state';
import { cn } from '../../utils/cn';

export const MobileNav: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    createDocumentAndOpen,
    setSearchModalOpen,
    setMobileDrawerOpen,
    distractionFree,
  } = useApp();

  if (distractionFree) return null;

  return (
    <nav className="md:hidden border-t border-stone-200/80 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg px-2 py-1 flex items-center justify-around shrink-0 z-30 select-none pb-safe">
      <button
        onClick={() => setCurrentView('home')}
        className={cn(
          'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg text-[10px] font-medium transition-colors',
          currentView === 'home'
            ? 'text-stone-900 dark:text-stone-100 font-semibold'
            : 'text-stone-400 dark:text-stone-500'
        )}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Home</span>
      </button>

      <button
        onClick={() => setCurrentView('library')}
        className={cn(
          'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg text-[10px] font-medium transition-colors',
          currentView === 'library'
            ? 'text-stone-900 dark:text-stone-100 font-semibold'
            : 'text-stone-400 dark:text-stone-500'
        )}
      >
        <BookOpen className="w-5 h-5 mb-0.5" />
        <span>Library</span>
      </button>

      {/* Floating Center Write Button */}
      <button
        onClick={() => createDocumentAndOpen()}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] -mt-4"
        title="Write Now"
        aria-label="Write Now"
      >
        <div className="w-12 h-12 rounded-full bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 flex items-center justify-center shadow-soft">
          <Edit3 className="w-5 h-5" />
        </div>
      </button>

      <button
        onClick={() => setSearchModalOpen(true)}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg text-[10px] font-medium text-stone-400 dark:text-stone-500 transition-colors"
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span>Search</span>
      </button>

      <button
        onClick={() => setMobileDrawerOpen(true)}
        className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-lg text-[10px] font-medium text-stone-400 dark:text-stone-500 transition-colors"
        aria-label="Open more menu"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span>More</span>
      </button>
    </nav>
  );
};
