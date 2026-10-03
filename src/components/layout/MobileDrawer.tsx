import React, { useEffect } from 'react';
import {
  Home,
  BookOpen,
  Book,
  Compass,
  Clock,
  Star,
  FileText,
  Folder,
  Tag,
  Archive,
  Trash2,
  Settings,
  Sparkles,
  X,
  Plus,
} from 'lucide-react';
import { useApp, type AppView } from '../../state';
import { MobileBranding } from '../brand/MobileBranding';
import { APP_CONFIG } from '../../config/app.config';
import { cn } from '../../utils/cn';

export const MobileDrawer: React.FC = () => {
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    currentView,
    setCurrentView,
    createDocumentAndOpen,
  } = useApp();

  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileDrawerOpen]);

  if (!mobileDrawerOpen) return null;

  const navItems: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home Studio', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'book', label: 'Books & Novels', icon: Book },
    { id: 'story', label: 'Story Bible', icon: Compass },
    { id: 'recent', label: 'Recent Documents', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'drafts', label: 'Drafts', icon: FileText },
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'tags', label: 'Tags', icon: Tag },
    { id: 'ai', label: 'AI Writing Companion', icon: Sparkles },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Recycle Bin', icon: Trash2 },
    { id: 'settings', label: 'Settings & Preferences', icon: Settings },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-modal flex md:hidden bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setMobileDrawerOpen(false);
      }}
    >
      <div className="w-72 max-w-[85vw] h-full bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shadow-modal flex flex-col animate-in slide-in-from-left duration-250 select-none">
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-stone-200/80 dark:border-stone-800 shrink-0">
          <MobileBranding />
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick New Button */}
        <div className="p-4">
          <button
            onClick={() => {
              createDocumentAndOpen();
              setMobileDrawerOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 rounded-lg py-2.5 font-medium text-xs shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Manuscript</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800/40'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400'
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400">
          <div className="font-serif italic text-stone-500 mb-0.5">
            "{APP_CONFIG.primaryTagline}"
          </div>
          <div>LITERIA v{APP_CONFIG.version}</div>
        </div>
      </div>
    </div>
  );
};
