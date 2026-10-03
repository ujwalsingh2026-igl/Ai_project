import React from 'react';
import {
  Menu,
  ShieldCheck,
  User as UserIcon,
  ArrowLeft,
  Search,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  EyeOff,
  Sidebar as SidebarIcon,
  MoreVertical,
} from 'lucide-react';
import { useApp } from '../../state';
import { useAuth } from '../../auth';
import { MobileBranding } from '../brand/MobileBranding';
import { Badge } from '../ui/Badge';
import { Dropdown } from '../ui/Dropdown';
import { IconButton } from '../ui/IconButton';

export const Header: React.FC = () => {
  const {
    currentView,
    activeDocument,
    navigateBack,
    navigationHistory,
    setMobileDrawerOpen,
    setSearchModalOpen,
    settings,
    toggleTheme,
    isFullscreen,
    toggleFullscreen,
    distractionFree,
    toggleDistractionFree,
    toggleRightPanel,
    rightPanelOpen,
  } = useApp();

  const { user } = useAuth();

  if (distractionFree) return null;

  const getTitle = () => {
    switch (currentView) {
      case 'home':
        return 'Home Studio';
      case 'library':
        return 'Library';
      case 'document':
        return activeDocument ? activeDocument.title : 'Manuscript';
      case 'book':
        return 'Books & Novels';
      case 'recent':
        return 'Recent Documents';
      case 'favorites':
        return 'Favorites';
      case 'drafts':
        return 'Drafts';
      case 'folders':
        return 'Folders';
      case 'tags':
        return 'Tags';
      case 'archive':
        return 'Archive';
      case 'trash':
        return 'Recycle Bin';
      case 'ai':
        return 'AI Companion';
      case 'settings':
        return 'Settings & Preferences';
      default:
        return 'LITERIA';
    }
  };

  const showBackButton = navigationHistory.length > 1;

  return (
    <header className="h-16 border-b border-stone-200/80 dark:border-stone-800 bg-white/70 dark:bg-stone-900/70 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 select-none z-10 transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile menu drawer trigger */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          aria-label="Open navigation drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Back navigation button if history exists */}
        {showBackButton && (
          <button
            onClick={navigateBack}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Logo */}
        <div className="md:hidden">
          <MobileBranding />
        </div>

        {/* Desktop Title & Context */}
        <div className="hidden sm:flex items-center gap-2 text-stone-400 text-sm min-w-0">
          <span className="font-medium text-stone-800 dark:text-stone-100 font-serif text-base truncate max-w-[280px]">
            {getTitle()}
          </span>
          {activeDocument && currentView === 'document' && (
            <span className="text-[11px] font-mono text-stone-400 shrink-0">
              ({activeDocument.stats.words} words)
            </span>
          )}
        </div>
      </div>

      {/* Header Actions & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Search trigger */}
        <button
          onClick={() => setSearchModalOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
          title="Search (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
          <span className="hidden md:inline font-mono text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">
            ⌘K
          </span>
        </button>

        {/* Save / Sync status badge */}
        <Badge variant="neutral" className="hidden lg:inline-flex gap-1.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-stone-500" />
          <span>Local Safe</span>
        </Badge>

        {/* Theme quick toggle */}
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Toggle theme"
          onClick={toggleTheme}
          title={settings.appearance.theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {settings.appearance.theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-stone-600" />
          )}
        </IconButton>

        {/* Toggle Right Panel (when on document view) */}
        {currentView === 'document' && (
          <IconButton
            variant={rightPanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            aria-label="Toggle details panel"
            onClick={toggleRightPanel}
            title={rightPanelOpen ? 'Hide right panel' : 'Show right panel'}
            className="hidden lg:inline-flex"
          >
            <SidebarIcon className="w-4 h-4" />
          </IconButton>
        )}

        {/* Fullscreen toggle */}
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Toggle fullscreen"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          className="hidden sm:inline-flex"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </IconButton>

        {/* Actions Dropdown */}
        <Dropdown
          trigger={
            <IconButton variant="ghost" size="sm" aria-label="More actions">
              <MoreVertical className="w-4 h-4" />
            </IconButton>
          }
          items={[
            {
              id: 'distraction-free',
              label: 'Distraction-Free Mode',
              icon: <EyeOff className="w-3.5 h-3.5" />,
              onClick: toggleDistractionFree,
            },
            {
              id: 'fullscreen',
              label: isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen',
              icon: <Maximize2 className="w-3.5 h-3.5" />,
              onClick: toggleFullscreen,
            },
          ]}
        />

        {/* User indicator */}
        <div className="flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-stone-800">
          <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-stone-700 dark:text-stone-300 text-xs font-medium">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <span className="hidden xl:inline text-xs font-medium text-stone-700 dark:text-stone-300">
            {user?.displayName || 'Author'}
          </span>
        </div>
      </div>
    </header>
  );
};
