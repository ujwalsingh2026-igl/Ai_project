import React, { useState } from 'react';
import type { Scene, SceneStatus, Character, Location } from '../../types';
import { Button, Input, Modal } from '../ui';
import {
  Target,
  Swords,
  CheckCircle2,
  Trash2,
  User,
  MapPin,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene?: Scene | null;
  onSave: (data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  characters: Character[];
  locations: Location[];
  bookId?: string | null;
  chapterId?: string | null;
}

const STATUS_OPTIONS: { id: SceneStatus; label: string; color: string }[] = [
  { id: 'idea', label: 'Idea', color: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
  { id: 'outlined', label: 'Outlined', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  { id: 'drafted', label: 'Drafted', color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' },
  { id: 'completed', label: 'Completed', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
];

export const SceneModal: React.FC<SceneModalProps> = ({
  isOpen,
  onClose,
  scene,
  onSave,
  onDelete,
  characters,
  locations,
  bookId,
  chapterId,
}) => {
  const [title, setTitle] = useState(scene?.title || '');
  const [summary, setSummary] = useState(scene?.summary || '');
  const [status, setStatus] = useState<SceneStatus>(scene?.status || 'idea');
  const [povCharacterId, setPovCharacterId] = useState<string>(scene?.povCharacterId || '');
  const [locationId, setLocationId] = useState<string>(scene?.locationId || '');
  const [goal, setGoal] = useState(scene?.goal || '');
  const [conflict, setConflict] = useState(scene?.conflict || '');
  const [outcome, setOutcome] = useState(scene?.outcome || '');
  const [notes, setNotes] = useState(scene?.notes || '');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(scene?.characterIds || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (scene) {
      setTitle(scene.title);
      setSummary(scene.summary);
      setStatus(scene.status);
      setPovCharacterId(scene.povCharacterId || '');
      setLocationId(scene.locationId || '');
      setGoal(scene.goal || '');
      setConflict(scene.conflict || '');
      setOutcome(scene.outcome || '');
      setNotes(scene.notes || '');
      setSelectedCharacterIds(scene.characterIds || []);
    } else {
      setTitle('');
      setSummary('');
      setStatus('idea');
      setPovCharacterId('');
      setLocationId('');
      setGoal('');
      setConflict('');
      setOutcome('');
      setNotes('');
      setSelectedCharacterIds([]);
    }
  }, [scene, isOpen]);

  const toggleCharacter = (id: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        bookId: bookId || scene?.bookId || null,
        chapterId: chapterId || scene?.chapterId || null,
        title: title.trim(),
        summary: summary.trim(),
        status,
        order: scene?.order ?? 0,
        povCharacterId: povCharacterId || null,
        locationId: locationId || null,
        goal: goal.trim() || undefined,
        conflict: conflict.trim() || undefined,
        outcome: outcome.trim() || undefined,
        notes: notes.trim() || undefined,
        characterIds: selectedCharacterIds,
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
      title={scene ? `Edit Scene: ${scene.title}` : 'New Scene Card'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Scene Title <span className="text-rose-500">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confrontation in the Rain, Council at Dawn"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Scene Status
            </label>
            <div className="flex gap-1 pt-0.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id)}
                  className={cn(
                    'flex-1 py-1.5 rounded text-[11px] font-medium transition-all text-center',
                    status === opt.id
                      ? `${opt.color} ring-1 ring-stone-900/40 dark:ring-stone-100/40 font-bold`
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500 opacity-60 hover:opacity-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
            Scene Premise & Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="What happens in this dramatic unit? Key beats and emotional shifts..."
            className="w-full h-20 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
            required
          />
        </div>

        {/* Dramatic Structure: Goal -> Conflict -> Outcome */}
        <div className="p-3 rounded-lg bg-stone-50/80 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 space-y-2.5">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-stone-400">
            Dramatic Spine (Scene & Sequel Structure)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-300 flex items-center gap-1">
                <Target className="w-3 h-3 text-amber-500" />
                <span>Scene Goal</span>
              </label>
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What does the POV character want entering the scene?"
                className="w-full h-16 p-2 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-300 flex items-center gap-1">
                <Swords className="w-3 h-3 text-rose-500" />
                <span>Conflict / Obstacle</span>
              </label>
              <textarea
                value={conflict}
                onChange={(e) => setConflict(e.target.value)}
                placeholder="What unforeseen force or character pushes back?"
                className="w-full h-16 p-2 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-stone-600 dark:text-stone-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Disaster / Outcome</span>
              </label>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Yes, but... or No, and furthermore... (Scene twist)"
                className="w-full h-16 p-2 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[11px] outline-none"
              />
            </div>
          </div>
        </div>

        {/* POV Character & Location Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>Point of View (POV) Character</span>
            </label>
            <select
              value={povCharacterId}
              onChange={(e) => setPovCharacterId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
            >
              <option value="">No specific POV</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>Setting / Location</span>
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
            >
              <option value="">No location set</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cast Present in Scene */}
        {characters.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
              Other Characters Present
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800">
              {characters.map((c) => {
                const isSelected = selectedCharacterIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCharacter(c.id)}
                    className={cn(
                      'px-2 py-0.5 rounded text-xs transition-colors',
                      isSelected
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-medium'
                        : 'bg-stone-200/60 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600'
                    )}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
          <div>
            {scene && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (window.confirm(`Delete scene "${scene.title}"?`)) {
                    await onDelete(scene.id);
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
              {isSubmitting ? 'Saving...' : scene ? 'Save Changes' : 'Create Scene'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
