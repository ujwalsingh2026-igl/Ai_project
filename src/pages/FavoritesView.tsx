import React, { useEffect, useState } from 'react';
import { useApp } from '../state';
import { documentService } from '../services/documentService';
import type { Document } from '../types';
import { Card, EmptyState } from '../components/ui';
import { Star, FileText } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const FavoritesView: React.FC = () => {
  const { openDocument } = useApp();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await documentService.getAll();
        setDocs(all.filter((d) => d.isFavorite));
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
          Favorites
        </h1>
        <p className="text-xs text-stone-500">
          Starred works, key reference notes, and cherished drafts.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-stone-400">Loading favorites...</div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={<Star className="w-6 h-6 text-amber-500" />}
          title="No Favorite Documents"
          description="Star manuscripts to keep them readily accessible here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <Card
              key={doc.id}
              interactive
              onClick={() => openDocument(doc.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-stone-500" />
                  <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-base">
                    {doc.title || 'Untitled'}
                  </h4>
                </div>
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
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
