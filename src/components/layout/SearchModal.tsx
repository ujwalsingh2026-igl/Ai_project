import React, { useState, useEffect } from 'react';
import { useApp } from '../../state';
import { documentService } from '../../services/documentService';
import type { Document } from '../../types';
import { Search, FileText, ArrowRight, X } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export const SearchModal: React.FC = () => {
  const { searchModalOpen, setSearchModalOpen, openDocument } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  // Global keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(true);
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen, setSearchModalOpen]);

  useEffect(() => {
    if (!searchModalOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    async function doSearch() {
      if (!query.trim()) {
        const all = await documentService.getAll();
        setResults(all.slice(0, 6));
        return;
      }
      setLoading(true);
      try {
        const all = await documentService.getAll();
        const filtered = all.filter(
          (d) =>
            d.title.toLowerCase().includes(query.toLowerCase()) ||
            d.content.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [query, searchModalOpen]);

  if (!searchModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-modal flex items-start justify-center pt-20 p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSearchModalOpen(false);
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-modal overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-100 dark:border-stone-800">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search manuscripts, stories, notes, tags..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 outline-none"
          />
          <button
            onClick={() => setSearchModalOpen(false)}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Stream */}
        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          {loading ? (
            <div className="text-center py-6 text-xs text-stone-400">Searching manuscripts...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-400">
              {query ? `No manuscripts match "${query}"` : 'Type to search manuscripts.'}
            </div>
          ) : (
            results.map((doc) => (
              <div
                key={doc.id}
                onClick={() => {
                  openDocument(doc.id);
                  setSearchModalOpen(false);
                }}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800/80 cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100 shrink-0" />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-stone-800 dark:text-stone-200 truncate">
                      {doc.title || 'Untitled'}
                    </div>
                    <div className="text-[11px] text-stone-400 truncate font-serif">
                      {doc.plainTextPreview || 'Empty manuscript'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px] text-stone-400">
                  <span>{formatDate(doc.updatedAt)}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-[11px] text-stone-400 select-none">
          <span>Navigate with mouse or tap</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
