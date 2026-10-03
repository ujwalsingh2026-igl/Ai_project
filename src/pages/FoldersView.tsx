import React from 'react';
import { Folder, Plus } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';

export const FoldersView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Folders & Structure
          </h1>
          <p className="text-xs text-stone-500">
            Organize documents into hierarchical literary categories and projects.
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Folder</span>
        </Button>
      </div>

      <EmptyState
        icon={<Folder className="w-6 h-6" />}
        title="No Folders Created"
        description="Folders help classify your stories, collections, poems, and reference documents."
        action={
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Folder
          </Button>
        }
      />
    </div>
  );
};
