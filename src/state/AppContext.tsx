import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Document, Settings } from '../types';
import { initializeStorage, DEFAULT_SETTINGS, db } from '../storage';
import { documentService } from '../services/documentService';
import { applyThemeToDOM } from '../theme';

export type AppView =
  | 'home'
  | 'library'
  | 'document'
  | 'book'
  | 'story'
  | 'recent'
  | 'favorites'
  | 'drafts'
  | 'folders'
  | 'tags'
  | 'archive'
  | 'trash'
  | 'settings'
  | 'ai';

export type RightPanelTab = 'info' | 'outline' | 'notes' | 'story' | 'ai';

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  navigateBack: () => void;
  navigationHistory: AppView[];
  activeDocument: Document | null;
  setActiveDocument: (doc: Document | null) => void;
  openDocument: (id: string) => Promise<void>;
  createDocumentAndOpen: (title?: string, type?: import('../types').DocumentType) => Promise<void>;
  
  // Left Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  
  // Right Panel
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  toggleRightPanel: () => void;
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;
  rightPanelWidth: number;
  setRightPanelWidth: (width: number) => void;

  // Distraction-Free & Fullscreen
  distractionFree: boolean;
  setDistractionFree: (val: boolean) => void;
  toggleDistractionFree: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;

  // Search & Mobile Drawer
  searchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;
  mobileDrawerOpen: boolean;
  setMobileDrawerOpen: (open: boolean) => void;

  // Theme & Settings
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  toggleTheme: () => void;
  isStorageReady: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewInternal] = useState<AppView>('home');
  const [history, setHistory] = useState<AppView[]>(['home']);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(260);

  // Right panel state
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('info');
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(300);

  // Distraction-free & Fullscreen
  const [distractionFree, setDistractionFree] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Search & Mobile Drawer
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Settings & Storage
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isStorageReady, setIsStorageReady] = useState<boolean>(false);

  useEffect(() => {
    async function setup() {
      await initializeStorage();
      const loaded = await db.settings.get('current_settings');
      if (loaded) {
        setSettings(loaded);
        applyThemeToDOM(loaded.appearance);
      } else {
        applyThemeToDOM(DEFAULT_SETTINGS.appearance);
      }
      setIsStorageReady(true);
    }
    setup();
  }, []);

  // System theme preference listener
  useEffect(() => {
    if (!settings.appearance.followSystemTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyThemeToDOM(settings.appearance);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.appearance]);

  // Sync fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const setCurrentView = (view: AppView) => {
    setHistory((prev) => [...prev, view]);
    setCurrentViewInternal(view);
    setMobileDrawerOpen(false); // Close mobile drawer when view changes
  };

  const navigateBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history];
      nextHistory.pop(); // Remove current
      const previous = nextHistory[nextHistory.length - 1];
      setHistory(nextHistory);
      setCurrentViewInternal(previous);
    } else {
      setCurrentViewInternal('home');
    }
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const toggleRightPanel = () => setRightPanelOpen((prev) => !prev);
  const toggleDistractionFree = () => setDistractionFree((prev) => !prev);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const toggleTheme = async () => {
    const nextTheme: import('../types').ThemeMode = settings.appearance.theme === 'dark' ? 'light' : 'dark';
    const updatedAppearance = { ...settings.appearance, theme: nextTheme, followSystemTheme: false };
    applyThemeToDOM(updatedAppearance);
    await updateSettings({
      appearance: updatedAppearance,
    });
  };

  const openDocument = async (id: string) => {
    const doc = await documentService.getById(id);
    if (doc) {
      setActiveDocument(doc);
      setCurrentView('document');
    }
  };

  const createDocumentAndOpen = async (
    title = 'Untitled Manuscript',
    type: import('../types').DocumentType = 'blank'
  ) => {
    const doc = await documentService.create(title, type, '');
    setActiveDocument(doc);
    setCurrentView('document');
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const merged = { ...settings, ...newSettings, updatedAt: Date.now() };
    setSettings(merged);
    if (newSettings.appearance) {
      applyThemeToDOM(merged.appearance);
    }
    await db.settings.put(merged);
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        navigateBack,
        navigationHistory: history,
        activeDocument,
        setActiveDocument,
        openDocument,
        createDocumentAndOpen,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        sidebarWidth,
        setSidebarWidth,
        rightPanelOpen,
        setRightPanelOpen,
        toggleRightPanel,
        rightPanelTab,
        setRightPanelTab,
        rightPanelWidth,
        setRightPanelWidth,
        distractionFree,
        setDistractionFree,
        toggleDistractionFree,
        isFullscreen,
        toggleFullscreen,
        searchModalOpen,
        setSearchModalOpen,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        settings,
        updateSettings,
        toggleTheme,
        isStorageReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
