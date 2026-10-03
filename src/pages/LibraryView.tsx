import React, { useEffect, useState } from 'react';
import { useApp } from '../state';
import { documentService } from '../services/documentService';
import type { Document } from '../types';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { BookOpen, Plus, FileText, Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const LibraryView: React.FC = () => {
  const { openDocument, createDocumentAndOpen } = useApp();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function load() {
      try {
        const allDocs = await documentService.getAll();
        setDocs(allDocs);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900">Your Library</h1>
          <p className="text-xs text-stone-500">
            Browse all your saved manuscripts, notes, books, and story outlines.
          </p>
        </div>
        <Button
          onClick={() => createDocumentAndOpen('New Document')}
          size="sm"
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Document</span>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-stone-400">Loading library...</div>
      ) : docs.length === 0 ? (
        /* Empty Library Placeholder Required in Phase 0 */
        <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-stone-300">
          <div className="w-12 h-12 rounded-full bg-stone-100 mx-auto flex items-center justify-center text-stone-400 mb-3">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-serif font-semibold text-stone-800 mb-1">
            Your Library is Empty
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mb-5 leading-relaxed">
            Begin your literary journey today. Create your first document, chapter, or poetry collection.
          </p>
          <Button onClick={() => createDocumentAndOpen('First Manuscript')} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Manuscript
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <Card
              key={doc.id}
              onClick={() => openDocument(doc.id)}
              className="cursor-pointer hover:border-stone-300 hover:shadow-xs transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-stone-500" />
                  <h4 className="font-serif font-semibold text-stone-900 text-base">
                    {doc.title || 'Untitled'}
                  </h4>
                </div>
              </div>
              <p className="text-xs text-stone-500 line-clamp-2 mb-4 font-serif">
                {doc.plainTextPreview || 'No content yet...'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 pt-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(doc.updatedAt)}
                </span>
                <span>{doc.stats.words} words</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
