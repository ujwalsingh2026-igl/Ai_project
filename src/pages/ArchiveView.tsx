import React, { useEffect, useState } from 'react';
import { documentService } from '../services/documentService';
import type { Document } from '../types';
import { Card, EmptyState } from '../components/ui';
import { Archive, FileText } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const ArchiveView: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await documentService.getAll();
        setDocs(all.filter((d) => d.isArchived));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Archive
        </h1>
        <p className="text-xs text-stone-500">
          Completed manuscripts and preserved versions kept out of active library clutter.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-stone-400">Loading archive...</div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<Archive className="w-6 h-6" />}
          title="Archive is Empty"
          description="Archiving preserves your writing safely without displaying it in your daily workspace."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <Card key={doc.id}>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-stone-500" />
                <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base">
                  {doc.title || 'Untitled'}
                </h4>
              </div>
              <p className="text-xs text-stone-500 line-clamp-2 mb-4 font-serif">
                {doc.plainTextPreview || 'Empty manuscript...'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-100 dark:border-stone-800 pt-3">
                <span>{formatDate(doc.updatedAt)}</span>
                <span>{doc.stats.words} words</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
