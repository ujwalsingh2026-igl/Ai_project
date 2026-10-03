import React, { useState } from 'react';
import { Modal, Button, Input, Textarea } from '../ui';
import type { BookCoverStyle } from '../../types';
import { BookCover } from './BookCover';

interface BookCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    title: string;
    subtitle?: string;
    author: string;
    genre: string;
    targetWordCount: number;
    description?: string;
    coverStyle: BookCoverStyle;
  }) => Promise<void>;
}

const COVER_COLOR_PRESETS: { name: string; bg: string; text: string; accent: string }[] = [
  { name: 'Obsidian Noir', bg: '#1c1917', text: '#fafaf9', accent: '#d97706' },
  { name: 'Midnight Navy', bg: '#0f172a', text: '#f8fafc', accent: '#38bdf8' },
  { name: 'Forest Emerald', bg: '#064e3b', text: '#ecfdf5', accent: '#34d399' },
  { name: 'Royal Burgundy', bg: '#4c0519', text: '#fff1f2', accent: '#fb7185' },
  { name: 'Antique Parchment', bg: '#fbf0d9', text: '#451a03', accent: '#b45309' },
  { name: 'Imperial Violet', bg: '#2e1065', text: '#faf5ff', accent: '#c084fc' },
];

export const BookCreateModal: React.FC<BookCreateModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('Local Writer');
  const [genre, setGenre] = useState('Literary Fiction');
  const [targetWordCount, setTargetWordCount] = useState(50000);
  const [description, setDescription] = useState('');
  const [pattern, setPattern] = useState<BookCoverStyle['pattern']>('classic');
  const [selectedColor, setSelectedColor] = useState(COVER_COLOR_PRESETS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        subtitle: subtitle.trim(),
        author: author.trim() || 'Author',
        genre: genre.trim() || 'Fiction',
        targetWordCount,
        description: description.trim(),
        coverStyle: {
          bgColor: selectedColor.bg,
          textColor: selectedColor.text,
          accentColor: selectedColor.accent,
          pattern,
        },
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Book Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Live Cover Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
            <span className="text-[11px] font-mono text-stone-400 mb-3 uppercase tracking-wider">
              Cover Preview
            </span>
            <BookCover
              title={title || 'Untitled Manuscript'}
              subtitle={subtitle}
              author={author || 'Author'}
              coverStyle={{
                bgColor: selectedColor.bg,
                textColor: selectedColor.text,
                accentColor: selectedColor.accent,
                pattern,
              }}
              size="md"
            />
          </div>

          {/* Form Fields */}
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Book Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Cartographer's Echo"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Subtitle (Optional)
              </label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. A Novel of Lost Lands"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Author Name
                </label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Genre
                </label>
                <Input
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Historical Fiction"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Target Word Count
                </label>
                <select
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 outline-none"
                >
                  <option value="20000">20,000 words (Novella)</option>
                  <option value="50000">50,000 words (Standard Novel)</option>
                  <option value="80000">80,000 words (Full-length)</option>
                  <option value="120000">120,000 words (Epic Volume)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Cover Ornament Style
                </label>
                <select
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value as BookCoverStyle['pattern'])}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 outline-none"
                >
                  <option value="classic">Classic Fine Press</option>
                  <option value="minimal">Minimal Modern</option>
                  <option value="vintage">Antiquarian Vintage</option>
                  <option value="botanical">Botanical Laurel</option>
                  <option value="modern">Geometric Modern</option>
                </select>
              </div>
            </div>

            {/* Cover Color Palette Preset */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Cover Palette
              </label>
              <div className="flex flex-wrap gap-2">
                {COVER_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setSelectedColor(preset)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition ${
                      selectedColor.name === preset.name
                        ? 'border-amber-600 ring-2 ring-amber-500/30'
                        : 'border-stone-200 dark:border-stone-800'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: preset.bg }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Summary / Blurb
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief synopsis, logline, or jacket blurb..."
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-stone-200 dark:border-stone-800">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Creating Book...' : 'Create Book Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
