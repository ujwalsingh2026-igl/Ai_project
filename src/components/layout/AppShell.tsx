import React, { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { MobileDrawer } from './MobileDrawer';
import { RightPanel } from './RightPanel';
import { SearchModal } from './SearchModal';
import { useApp } from '../../state';
import { Eye } from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isStorageReady, distractionFree, toggleDistractionFree } = useApp();

  if (!isStorageReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-300">
        <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-800 dark:border-t-stone-200 rounded-full animate-spin mb-4" />
        <div className="font-serif text-lg tracking-wide">Preparing LITERIA Local Studio...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-50/50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100 antialiased">
      {/* Search Modal (Ctrl/Cmd + K) */}
      <SearchModal />

      {/* Mobile Slide-Out Drawer */}
      <MobileDrawer />

      {/* Desktop / Tablet Sidebar */}
      <Sidebar />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <Header />

        {/* Workspace + Right Panel Container */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className={`mx-auto h-full ${distractionFree ? 'max-w-3xl' : 'max-w-6xl'}`}>
              {children}
            </div>
          </main>

          {/* Optional Right Panel */}
          <RightPanel />
        </div>

        {/* Mobile / Foldable Bottom Navigation */}
        <MobileNav />

        {/* Floating exit control for Distraction-Free Mode */}
        {distractionFree && (
          <button
            onClick={toggleDistractionFree}
            className="fixed bottom-6 right-6 z-sticky flex items-center gap-2 px-3.5 py-2 rounded-full bg-stone-900/80 dark:bg-stone-100/80 text-white dark:text-stone-900 backdrop-blur-md text-xs font-medium shadow-soft hover:opacity-100 opacity-60 transition-opacity"
            title="Exit distraction-free mode"
          >
            <Eye className="w-4 h-4" />
            <span>Exit Focus</span>
          </button>
        )}
      </div>
    </div>
  );
};
