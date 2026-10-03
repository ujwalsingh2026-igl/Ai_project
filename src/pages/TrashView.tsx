import React, { useEffect, useState } from 'react';
import { db } from '../storage/db';
import type { Document } from '../types';
import { Card, Button, EmptyState } from '../components/ui';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export const TrashView: React.FC = () => {
  const [deletedDocs, setDeletedDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeleted = async () => {
    try {
      const all = await db.documents.toArray();
      setDeletedDocs(all.filter((d) => d.isDeleted));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeleted();
  }, []);

  const handleRestore = async (id: string) => {
    await db.documents.update(id, { isDeleted: false, updatedAt: Date.now() });
    await loadDeleted();
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm('Permanently delete this manuscript? This action cannot be undone.')) {
      await db.documents.delete(id);
      await loadDeleted();
    }
  };

  const handleEmptyTrash = async () => {
    if (window.confirm('Empty the entire Recycle Bin? All deleted manuscripts will be permanently erased.')) {
      for (const doc of deletedDocs) {
        await db.documents.delete(doc.id);
      }
      await loadDeleted();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Recycle Bin
          </h1>
          <p className="text-xs text-stone-500">
            Deleted manuscripts remain here until permanently removed.
          </p>
        </div>
        {deletedDocs.length > 0 && (
          <Button onClick={handleEmptyTrash} variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-1.5" />
            <span>Empty Recycle Bin</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-xs text-stone-400">Loading deleted items...</div>
      ) : deletedDocs.length === 0 ? (
        <EmptyState
          icon={<Trash2 className="w-6 h-6" />}
          title="Recycle Bin is Empty"
          description="Deleted manuscripts and chapters will appear here and can be restored at any time."
        />
      ) : (
        <div className="space-y-3">
          {deletedDocs.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <h4 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-sm truncate">
                  {doc.title || 'Untitled'}
                </h4>
                <p className="text-xs text-stone-400">
                  Deleted on {formatDate(doc.updatedAt)} · {doc.stats.words} words
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(doc.id)}
                  className="gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handlePermanentDelete(doc.id)}
                  className="gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
