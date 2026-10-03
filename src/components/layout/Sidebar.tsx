import React, { useRef } from 'react';
import {
  Home,
  BookOpen,
  Book,
  Clock,
  Star,
  FileText,
  Folder,
  Tag,
  Archive,
  Trash2,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useApp, type AppView } from '../../state';
import { DesktopBranding } from '../brand/DesktopBranding';
import { APP_CONFIG } from '../../config/app.config';
import { cn } from '../../utils/cn';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    sidebarOpen,
    toggleSidebar,
    sidebarWidth,
    setSidebarWidth,
    createDocumentAndOpen,
    distractionFree,
  } = useApp();

  const isResizingRef = useRef(false);

  if (distractionFree) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = moveEvent.clientX;
      if (newWidth >= 200 && newWidth <= 420) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const navPrimary: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'book', label: 'Books & Novels', icon: Book },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'drafts', label: 'Drafts', icon: FileText },
  ];

  const navOrganize: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'folders', label: 'Folders', icon: Folder },
    { id: 'tags', label: 'Tags', icon: Tag },
  ];

  const navSystem: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'ai', label: 'AI Companion', icon: Sparkles },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'trash', label: 'Trash', icon: Trash2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      style={{ width: sidebarOpen ? `${sidebarWidth}px` : '72px' }}
      className="hidden md:flex flex-col border-r border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-900/70 backdrop-blur-md relative shrink-0 z-20 select-none transition-[width] duration-150"
    >
      {/* Resizing handle on desktop */}
      {sidebarOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/20 active:bg-amber-500/40 transition-colors z-30"
          title="Drag to resize sidebar"
        />
      )}

      {/* Top Branding */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-stone-200/50 dark:border-stone-800/80">
        <div className="overflow-hidden whitespace-nowrap">
          <DesktopBranding collapsed={!sidebarOpen} />
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Action Button */}
      <div className="p-3">
        <button
          onClick={() => createDocumentAndOpen()}
          className={cn(
            'w-full flex items-center justify-center gap-2 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white rounded-lg py-2.5 font-medium text-xs transition-all shadow-xs',
            !sidebarOpen && 'px-0'
          )}
          title="Write New Piece"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Write Now</span>}
        </button>
      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto [scrollbar-width:thin]">
        {/* Primary Group */}
        <div className="space-y-0.5">
          {navPrimary.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/70 dark:hover:bg-stone-800/50',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={item.label}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500')} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* Organize Group */}
        <div className="space-y-0.5 pt-2 border-t border-stone-200/40 dark:border-stone-800/40">
          {sidebarOpen && (
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              Organize
            </div>
          )}
          {navOrganize.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/70 dark:hover:bg-stone-800/50',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={item.label}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500')} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>

        {/* System Group */}
        <div className="space-y-0.5 pt-2 border-t border-stone-200/40 dark:border-stone-800/40">
          {sidebarOpen && (
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-stone-400 font-medium">
              System
            </div>
          )}
          {navSystem.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                  isActive
                    ? 'bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/70 dark:hover:bg-stone-800/50',
                  !sidebarOpen && 'justify-center px-0'
                )}
                title={item.label}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500')} />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer Branding Info */}
      {sidebarOpen && (
        <div className="p-4 border-t border-stone-200/50 dark:border-stone-800/60 text-[11px] text-stone-400 leading-tight">
          <div className="font-serif italic text-stone-500 dark:text-stone-400 mb-0.5">
            "{APP_CONFIG.primaryTagline}"
          </div>
          <div>v{APP_CONFIG.version} · Local First</div>
        </div>
      )}
    </aside>
  );
};
