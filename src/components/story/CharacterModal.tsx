import React, { useState } from 'react';
import type { Character, CharacterRole } from '../../types';
import { Button, Input, Modal } from '../ui';
import {
  User,
  Sparkles,
  Heart,
  Shield,
  Swords,
  Trash2,
  Tag,
  Palette,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  character?: Character | null;
  onSave: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  bookId?: string | null;
}

const ROLE_OPTIONS: { id: CharacterRole; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'protagonist', label: 'Protagonist', icon: <Sparkles className="w-3.5 h-3.5" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { id: 'antagonist', label: 'Antagonist', icon: <Swords className="w-3.5 h-3.5" />, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { id: 'supporting', label: 'Supporting', icon: <Shield className="w-3.5 h-3.5" />, color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { id: 'minor', label: 'Minor', icon: <User className="w-3.5 h-3.5" />, color: 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/30' },
  { id: 'other', label: 'Other', icon: <Heart className="w-3.5 h-3.5" />, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
];

const AVATAR_PALETTE = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  character,
  onSave,
  onDelete,
  bookId,
}) => {
  const [activeTab, setActiveTab] = useState<'core' | 'psychology' | 'background' | 'notes'>('core');
  const [name, setName] = useState(character?.name || '');
  const [aliases, setAliases] = useState(character?.aliases?.join(', ') || '');
  const [role, setRole] = useState<CharacterRole>(character?.role || 'protagonist');
  const [archetype, setArchetype] = useState(character?.archetype || '');
  const [avatarColor, setAvatarColor] = useState(character?.avatarColor || AVATAR_PALETTE[0]);
  const [description, setDescription] = useState(character?.description || '');
  const [personality, setPersonality] = useState(character?.personality || '');
  const [goals, setGoals] = useState(character?.goals || '');
  const [motivation, setMotivation] = useState(character?.motivation || '');
  const [conflict, setConflict] = useState(character?.conflict || '');
  const [strengths, setStrengths] = useState(character?.strengths || '');
  const [weaknesses, setWeaknesses] = useState(character?.weaknesses || '');
  const [background, setBackground] = useState(character?.background || '');
  const [notes, setNotes] = useState(character?.notes || '');
  const [tags, setTags] = useState(character?.tags?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if character changes
  React.useEffect(() => {
    if (character) {
      setName(character.name);
      setAliases(character.aliases?.join(', ') || '');
      setRole(character.role);
      setArchetype(character.archetype || '');
      setAvatarColor(character.avatarColor || AVATAR_PALETTE[0]);
      setDescription(character.description || '');
      setPersonality(character.personality || '');
      setGoals(character.goals || '');
      setMotivation(character.motivation || '');
      setConflict(character.conflict || '');
      setStrengths(character.strengths || '');
      setWeaknesses(character.weaknesses || '');
      setBackground(character.background || '');
      setNotes(character.notes || '');
      setTags(character.tags?.join(', ') || '');
    } else {
      setName('');
      setAliases('');
      setRole('protagonist');
      setArchetype('');
      setAvatarColor(AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)]);
      setDescription('');
      setPersonality('');
      setGoals('');
      setMotivation('');
      setConflict('');
      setStrengths('');
      setWeaknesses('');
      setBackground('');
      setNotes('');
      setTags('');
    }
  }, [character, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        bookId: bookId || character?.bookId || null,
        name: name.trim(),
        aliases: aliases.split(',').map((s) => s.trim()).filter(Boolean),
        role,
        archetype: archetype.trim() || undefined,
        avatarColor,
        description: description.trim(),
        personality: personality.trim() || undefined,
        goals: goals.trim() || undefined,
        motivation: motivation.trim() || undefined,
        conflict: conflict.trim() || undefined,
        strengths: strengths.trim() || undefined,
        weaknesses: weaknesses.trim() || undefined,
        background: background.trim() || undefined,
        notes: notes.trim() || undefined,
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
      title={character ? `Edit ${character.name}` : 'New Character Profile'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Navigation tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 -mx-6 px-6 gap-2">
          {[
            { id: 'core', label: 'Identity & Core' },
            { id: 'psychology', label: 'Drives & Flaws' },
            { id: 'background', label: 'History & Lore' },
            { id: 'notes', label: 'Notes & Tags' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'py-2 px-3 text-xs font-medium border-b-2 transition-colors -mb-px',
                activeTab === tab.id
                  ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Core */}
        {activeTab === 'core' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Character Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Evelyn Vance"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Archetype
                </label>
                <Input
                  value={archetype}
                  onChange={(e) => setArchetype(e.target.value)}
                  placeholder="e.g. The Reluctant Hero"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Aliases & Titles
                </label>
                <Input
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="e.g. The Night Raven, Lyn"
                />
              </div>

              {/* Avatar Color Picker */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-stone-400" />
                  <span>Avatar Accent Color</span>
                </label>
                <div className="flex items-center gap-1.5 pt-1">
                  {AVATAR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAvatarColor(c)}
                      className={cn(
                        'w-6 h-6 rounded-full transition-transform',
                        avatarColor === c ? 'scale-125 ring-2 ring-offset-2 ring-stone-900 dark:ring-stone-100' : 'opacity-80 hover:opacity-100'
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Story Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all',
                      role === opt.id
                        ? `${opt.color} ring-1 ring-current font-bold`
                        : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    )}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Physical Description & Presence
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Distinctive appearance, mannerisms, clothing, voice, carriage..."
                className="w-full h-24 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Psychology */}
        {activeTab === 'psychology' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Core Goal (What do they want?)
                </label>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Primary objective in the narrative arc..."
                  className="w-full h-18 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Motivation (Why do they want it?)
                </label>
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Deep psychological or emotional driver..."
                  className="w-full h-18 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Inner & Outer Conflict
              </label>
              <textarea
                value={conflict}
                onChange={(e) => setConflict(e.target.value)}
                placeholder="What obstacle stands in their path? What internal lie or struggle holds them back?"
                className="w-full h-18 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Strengths & Virtues
                </label>
                <Input
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="e.g. Tenacious, perceptive, charismatic"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Flaws & Vulnerabilities
                </label>
                <Input
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="e.g. Distrustful, reckless, arrogant"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Personality & Temperament
              </label>
              <Input
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="e.g. Quietly observant, witty under pressure, stoic"
              />
            </div>
          </div>
        )}

        {/* Tab 3: History & Lore */}
        {activeTab === 'background' && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Origin & Backstory
              </label>
              <textarea
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="Childhood, pivotal life events, trauma, formative training..."
                className="w-full h-44 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Notes & Tags */}
        {activeTab === 'notes' && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <span>Tags (comma-separated)</span>
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Mage, Royal Guard, Act II, Pov"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Author Notes & Reminders
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dialogue voice idiosyncrasies, planned plot twists, foreshadowing hints..."
                className="w-full h-36 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
          <div>
            {character && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (window.confirm(`Delete character "${character.name}"?`)) {
                    await onDelete(character.id);
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
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? 'Saving...' : character ? 'Save Changes' : 'Create Character'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
