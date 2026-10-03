import React, { useEffect } from 'react';
import { AuthProvider } from './auth';
import { AppProvider, useApp } from './state';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './utils/errorBoundary';
import {
  HomeView,
  LibraryView,
  EditorView,
  BooksView,
  StoryBibleView,
  RecentView,
  FavoritesView,
  DraftsView,
  FoldersView,
  TagsView,
  ArchiveView,
  TrashView,
  AIView,
  SettingsView,
} from './pages';
import { runSmokeTests } from './tests/smoke.test';

import { ToastProvider } from './components/ui/Toast';

const MainRouter: React.FC = () => {
  const { currentView } = useApp();

  switch (currentView) {
    case 'home':
      return <HomeView />;
    case 'library':
      return <LibraryView />;
    case 'document':
      return <EditorView />;
    case 'book':
      return <BooksView />;
    case 'story':
      return <StoryBibleView />;
    case 'recent':
      return <RecentView />;
    case 'favorites':
      return <FavoritesView />;
    case 'drafts':
      return <DraftsView />;
    case 'folders':
      return <FoldersView />;
    case 'tags':
      return <TagsView />;
    case 'archive':
      return <ArchiveView />;
    case 'trash':
      return <TrashView />;
    case 'ai':
      return <AIView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <HomeView />;
  }
};

export const App: React.FC = () => {
  useEffect(() => {
    // Run smoke test once on initialization
    try {
      runSmokeTests();
    } catch (e) {
      console.error('Smoke tests failed:', e);
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <ToastProvider>
            <AppShell>
              <MainRouter />
            </AppShell>
          </ToastProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
