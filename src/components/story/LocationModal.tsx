import React, { useState } from 'react';
import type { Location } from '../../types';
import { Button, Input, Modal } from '../ui';
import {
  Eye,
  Volume2,
  Wind,
  Trash2,
  Tag,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: Location | null;
  onSave: (data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  bookId?: string | null;
}

const LOCATION_TYPES = [
  'Kingdom / Empire',
  'City / Settlement',
  'Castle / Palace',
  'Interior / Room',
  'Wilderness / Forest',
  'Mountain / Cave',
  'Sea / Island',
  'Planet / Realm',
  'Other',
];

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  location,
  onSave,
  onDelete,
  bookId,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'sensory' | 'notes'>('details');
  const [name, setName] = useState(location?.name || '');
  const [type, setType] = useState(location?.type || LOCATION_TYPES[1]);
  const [description, setDescription] = useState(location?.description || '');
  const [environment, setEnvironment] = useState(location?.environment || '');
  const [sensorySight, setSensorySight] = useState(location?.sensorySight || '');
  const [sensorySound, setSensorySound] = useState(location?.sensorySound || '');
  const [sensorySmell, setSensorySmell] = useState(location?.sensorySmell || '');
  const [significance, setSignificance] = useState(location?.significance || '');
  const [notes, setNotes] = useState(location?.notes || '');
  const [tags, setTags] = useState(location?.tags?.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (location) {
      setName(location.name);
      setType(location.type);
      setDescription(location.description);
      setEnvironment(location.environment || '');
      setSensorySight(location.sensorySight || '');
      setSensorySound(location.sensorySound || '');
      setSensorySmell(location.sensorySmell || '');
      setSignificance(location.significance || '');
      setNotes(location.notes || '');
      setTags(location.tags?.join(', ') || '');
    } else {
      setName('');
      setType(LOCATION_TYPES[1]);
      setDescription('');
      setEnvironment('');
      setSensorySight('');
      setSensorySound('');
      setSensorySmell('');
      setSignificance('');
      setNotes('');
      setTags('');
    }
  }, [location, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await onSave({
        bookId: bookId || location?.bookId || null,
        name: name.trim(),
        type: type.trim(),
        description: description.trim(),
        environment: environment.trim() || undefined,
        sensorySight: sensorySight.trim() || undefined,
        sensorySound: sensorySound.trim() || undefined,
        sensorySmell: sensorySmell.trim() || undefined,
        significance: significance.trim() || undefined,
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
      title={location ? `Edit ${location.name}` : 'New Location Profile'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Navigation tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-800 -mx-6 px-6 gap-2">
          {[
            { id: 'details', label: 'Overview & Geography' },
            { id: 'sensory', label: 'Sensory Immersion (Sight, Sound, Smell)' },
            { id: 'notes', label: 'Significance & Notes' },
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

        {/* Tab 1: Overview */}
        {activeTab === 'details' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Location Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. The Spire of Lysandra, Oakhaven"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Location Category
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Visual Description & Architecture
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scale, architectural style, lighting, climate, distinct landmarks..."
                className="w-full h-24 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Climate & Ecology
              </label>
              <Input
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="e.g. Sub-arctic tundra, coastal humid, perpetual autumn"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Sensory */}
        {activeTab === 'sensory' && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span>What does it LOOK like? (Colors, light, shadows, textures)</span>
              </label>
              <textarea
                value={sensorySight}
                onChange={(e) => setSensorySight(e.target.value)}
                placeholder="Cobblestones glinting under lantern light, faded cobalt banners..."
                className="w-full h-18 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-sky-500" />
                <span>What does it SOUND like? (Ambient noise, reverberations, silence)</span>
              </label>
              <textarea
                value={sensorySound}
                onChange={(e) => setSensorySound(e.target.value)}
                placeholder="Hollow winds whistling through iron grates, distant chapel chimes..."
                className="w-full h-18 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-emerald-500" />
                <span>What does it SMELL or TASTE like? (Atmosphere, scent memories)</span>
              </label>
              <textarea
                value={sensorySmell}
                onChange={(e) => setSensorySmell(e.target.value)}
                placeholder="Damp pine needles, burning cedarwood, salty sea mist..."
                className="w-full h-18 p-2 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 3: Notes & Significance */}
        {activeTab === 'notes' && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Narrative Significance (Why does this place matter?)
              </label>
              <textarea
                value={significance}
                onChange={(e) => setSignificance(e.target.value)}
                placeholder="Where the treaty was broken; the protagonist's ancestral sanctuary..."
                className="w-full h-20 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <span>Tags (comma-separated)</span>
              </label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Northern Realm, Safehouse, Climax"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                Secret Lore & Author Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hidden passages, local superstitions, rules of magic here..."
                className="w-full h-24 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-900 dark:text-stone-100 outline-none"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
          <div>
            {location && onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (window.confirm(`Delete location "${location.name}"?`)) {
                    await onDelete(location.id);
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
              {isSubmitting ? 'Saving...' : location ? 'Save Changes' : 'Create Location'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
