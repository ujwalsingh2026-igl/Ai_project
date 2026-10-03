import React, { useRef } from 'react';
import { useApp, type RightPanelTab } from '../../state';
import { cn } from '../../utils/cn';
import {
  X,
  FileText,
  ListTree,
  StickyNote,
  Sparkles,
  Clock,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const RightPanel: React.FC = () => {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    rightPanelTab,
    setRightPanelTab,
    rightPanelWidth,
    setRightPanelWidth,
    activeDocument,
    distractionFree,
  } = useApp();

  const isResizingRef = useRef(false);

  if (!rightPanelOpen || distractionFree) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - moveEvent.clientX;
      if (newWidth >= 240 && newWidth <= 500) {
        setRightPanelWidth(newWidth);
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

  const tabs: Array<{ id: RightPanelTab; label: string; icon: React.ReactNode }> = [
    { id: 'info', label: 'Info', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'outline', label: 'Outline', icon: <ListTree className="w-3.5 h-3.5" /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'AI', icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside
      style={{ width: `${rightPanelWidth}px` }}
      className="hidden lg:flex flex-col border-l border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md relative shrink-0 z-10 transition-[width] duration-75 select-none"
    >
      {/* Resizing handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute -left-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500/20 active:bg-amber-500/40 transition-colors z-20"
        title="Drag to resize panel"
      />

      {/* Panel Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-stone-200/70 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = rightPanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRightPanelTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setRightPanelOpen(false)}
          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
          aria-label="Close side panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-stone-600 dark:text-stone-300">
        {rightPanelTab === 'info' && (
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Manuscript Details
            </h4>
            {activeDocument ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Title:</span>
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate max-w-[150px]">
                      {activeDocument.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Words:</span>
                    <span className="font-mono font-medium">{activeDocument.stats.words}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Characters:</span>
                    <span className="font-mono font-medium">{activeDocument.stats.characters}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Estimated Pages:</span>
                    <span className="font-mono font-medium">{activeDocument.stats.estimatedPages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Reading Time:</span>
                    <span className="font-mono font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      {activeDocument.stats.readingTimeMinutes} min
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 pt-1 space-y-1">
                  <div>Created: {formatDate(activeDocument.createdAt)}</div>
                  <div>Updated: {formatDate(activeDocument.updatedAt)}</div>
                  <div>Version: {activeDocument.version}.0</div>
                </div>
              </div>
            ) : (
              <div className="text-stone-400 italic text-center py-6">
                No active document selected.
              </div>
            )}
          </div>
        )}

        {rightPanelTab === 'outline' && (
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Document Outline
            </h4>
            <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg text-stone-400 italic text-center py-6">
              Outline headings will appear here as you structure your manuscript with sections.
            </div>
          </div>
        )}

        {rightPanelTab === 'notes' && (
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm">
              Scratchpad & Research
            </h4>
            <textarea
              placeholder="Jot down quick thoughts, character reminders, or research links for this piece..."
              className="w-full h-48 p-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 outline-none text-xs resize-none"
            />
          </div>
        )}

        {rightPanelTab === 'ai' && (
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Quick AI Assistant</span>
            </h4>
            <p className="text-[11px] text-stone-500">
              Ask for immediate phrasing suggestions or synonym lookups without leaving the page.
            </p>
            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-stone-700 dark:text-stone-300 text-xs">
              "Select any text in your manuscript, and suggestions will appear in this sidebar."
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
