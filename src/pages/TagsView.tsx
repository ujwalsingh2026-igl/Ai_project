import React from 'react';
import { Tag, Plus } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';

export const TagsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-stone-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
            Tags & Taxonomy
          </h1>
          <p className="text-xs text-stone-500">
            Categorize and cross-reference themes, characters, and motifs across works.
          </p>
        </div>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          <span>New Tag</span>
        </Button>
      </div>

      <EmptyState
        icon={<Tag className="w-6 h-6" />}
        title="No Tags Created"
        description="Tag passages or entire works with themes like #dialogue, #lore, or #first-draft."
        action={
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1.5" />
            Create First Tag
          </Button>
        }
      />
    </div>
  );
};
