import React, { useState } from 'react';
import type { TimelineEvent, Character, Location } from '../../types';
import { Button, Input, Modal } from '../ui';
import {
  Calendar,
  MapPin,
  Users,
  Trash2,
  Tag,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface TimelineEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: TimelineEvent | null;
  onSave: (data: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  characters: Character[];
  locations: Location[];
  bookId?: string | null;
}

export const TimelineEventModal: React.FC<TimelineEventModalProps> = ({
  isOpen,
  onClose,
  event,
  onSave,
  onDelete,
  characters,
  locations,
  bookId,
}) => {
  const [title, setTitle] = useState(event?.title || '');
  const [dateOrEra, setDateOrEra] = useState(event?.dateOrEra || '');
  const [description, setDescription] = useState(event?.description || '');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(event?.characterIds || []);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>(event?.locationIds || []);
  const [tags, setTags] = useState(event?.tags?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDateOrEra(event.dateOrEra);
      setDescription(event.description);
      setSelectedCharacterIds(event.characterIds || []);
      setSelectedLocationIds(event.locationIds || []);
      setTags(event.tags?.join(', ') || '');
    } else {
      setTitle('');
      setDateOrEra('');
      setDescription('');
      setSelectedCharacterIds([]);
      setSelectedLocationIds([]);
      setTags('');
    }
  }, [event, isOpen]);

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleLocation = (id: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        bookId: bookId || event?.bookId || null,
        title: title.trim(),
        dateOrEra: dateOrEra.trim() || 'Undated',
        order: event?.order ?? 0,
        description: description.trim(),
        characterIds: selectedCharacterIds,
        locationIds: selectedLocationIds,
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event ? `Edit Timeline Event` : 'Add Chronology Event'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Siege of Silverpeak, Eclipse of the Red Moon"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Date / Era</span>
            </label>
            <Input
              value={dateOrEra}
              onChange={(e) => setDateOrEra(e.target.value)}
              placeholder="e.g. 1422 AE, Day 14"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Event Description & Historical Impact
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What happened? What was set in motion as a consequence?"
            className="w-full h-24 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
            required
          />
        </div>

        {/* Participating Characters */}
        {characters.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              <span>Characters Present</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
              {characters.map((c) => {
                const isSelected = selectedCharacterIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCharacter(c.id)}
                    className={cn(
                      'px-2 py-1 rounded text-xs transition-colors flex items-center gap-1',
                      isSelected
                        ? 'bg-amber-500 text-white font-medium'
                        : 'bg-stone-200/60 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
                    )}
                  >
                    <span>{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Participating Locations */}
        {locations.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>Location(s)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
              {locations.map((loc) => {
                const isSelected = selectedLocationIds.includes(loc.id);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => toggleLocation(loc.id)}
                    className={cn(
                      'px-2 py-1 rounded text-xs transition-colors flex items-center gap-1',
                      isSelected
                        ? 'bg-sky-600 text-white font-medium'
                        : 'bg-stone-200/60 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
                    )}
                  >
                    <span>{loc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-stone-400" />
            <span>Tags (comma-separated)</span>
          </label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. Battle, Turning Point, Flashback"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
          <div>
            {event && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (window.confirm(`Delete event "${event.title}"?`)) {
                    await onDelete(event.id);
                    onClose();
                  }
                }}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Delete</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
