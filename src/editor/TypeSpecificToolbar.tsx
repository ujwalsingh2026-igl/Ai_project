import React from 'react';
import type { Editor } from '@tiptap/react';
import type { Document, DocumentType, DocumentTypeMetadata } from '../types';
import {
  Film,
  Sparkles,
  BookMarked,
  CheckSquare,
  Smile,
  Calendar,
  Layers,
  Target,
} from 'lucide-react';

interface TypeSpecificToolbarProps {
  editor: Editor | null;
  document: Document;
  onUpdateMetadata: (metadata: DocumentTypeMetadata) => void;
}

export const TypeSpecificToolbar: React.FC<TypeSpecificToolbarProps> = ({
  editor,
  document: doc,
  onUpdateMetadata,
}) => {
  if (!editor) return null;

  const type: DocumentType = doc.type;
  const metadata = doc.metadata || {};

  // Script Actions
  const insertSceneHeading = (type: 'INT' | 'EXT') => {
    editor
      .chain()
      .focus()
      .insertContent(`<p><strong>${type}. LOCATION - DAY</strong></p>`)
      .run();
  };

  const insertCharacterCue = () => {
    editor
      .chain()
      .focus()
      .insertContent('<p style="text-align: center;"><strong>CHARACTER NAME</strong></p><p style="text-align: center;"><em>(beat)</em></p><p style="text-align: center;">Dialogue goes here...</p>')
      .run();
  };

  const insertTransition = (trans = 'CUT TO:') => {
    editor
      .chain()
      .focus()
      .insertContent(`<p style="text-align: right;"><strong>${trans}</strong></p>`)
      .run();
  };

  // Comic Actions
  const insertComicPanel = () => {
    editor
      .chain()
      .focus()
      .insertContent('<p><strong>PANEL (MEDIUM SHOT)</strong></p><p>Description of action in the panel...</p><p><strong>CAPTION:</strong> Narrator text...</p>')
      .run();
  };

  const insertComicSFX = () => {
    editor
      .chain()
      .focus()
      .insertContent('<p><strong>SFX:</strong> <em>*BOOM*</em></p>')
      .run();
  };

  // Poem Actions
  const insertStanzaBreak = () => {
    editor
      .chain()
      .focus()
      .insertContent('<p style="text-align: center;"><br/></p>')
      .run();
  };

  const centerVerse = () => {
    editor.chain().focus().setTextAlign('center').run();
  };

  // Journal Actions
  const insertTimestamp = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    editor
      .chain()
      .focus()
      .insertContent(`<p><strong>[${timeStr}]</strong> `)
      .run();
  };

  const handleMoodSelect = (mood: NonNullable<NonNullable<DocumentTypeMetadata['journal']>['mood']>) => {
    onUpdateMetadata({
      ...metadata,
      journal: {
        ...(metadata.journal || {}),
        mood,
      },
    });
  };

  // Novel Actions
  const insertSceneBreak = () => {
    editor
      .chain()
      .focus()
      .insertContent('<p style="text-align: center; margin: 1.5rem 0;">* * *</p>')
      .run();
  };

  const handleTargetWordCountChange = (goal: number) => {
    onUpdateMetadata({
      ...metadata,
      novel: {
        ...(metadata.novel || {}),
        targetWordCount: goal,
      },
    });
  };

  // Render per type
  switch (type) {
    case 'script':
      return (
        <div className="px-4 py-1.5 border-b border-stone-200/80 dark:border-stone-800 bg-amber-500/5 dark:bg-amber-500/10 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar select-none">
          <span className="font-mono font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1 shrink-0">
            <Film className="w-3.5 h-3.5" />
            Screenplay:
          </span>
          <button
            onClick={() => insertSceneHeading('INT')}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 font-mono text-[11px]"
          >
            + INT. Scene
          </button>
          <button
            onClick={() => insertSceneHeading('EXT')}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 font-mono text-[11px]"
          >
            + EXT. Scene
          </button>
          <button
            onClick={insertCharacterCue}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 font-mono text-[11px]"
          >
            + Character Cue
          </button>
          <button
            onClick={() => insertTransition('CUT TO:')}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 font-mono text-[11px]"
          >
            + CUT TO:
          </button>
          <button
            onClick={() => insertTransition('FADE OUT.')}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 font-mono text-[11px]"
          >
            + FADE OUT.
          </button>
        </div>
      );

    case 'comic':
      return (
        <div className="px-4 py-1.5 border-b border-stone-200/80 dark:border-stone-800 bg-sky-500/5 dark:bg-sky-500/10 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar select-none">
          <span className="font-mono font-semibold text-sky-800 dark:text-sky-400 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5" />
            Comic Studio:
          </span>
          <button
            onClick={insertComicPanel}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            + Panel Shot
          </button>
          <button
            onClick={insertComicSFX}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px] font-mono"
          >
            + SFX Burst
          </button>
          <button
            onClick={() => editor.chain().focus().insertContent('<h2>PAGE </h2>').run()}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            + New Page
          </button>
        </div>
      );

    case 'poem':
      return (
        <div className="px-4 py-1.5 border-b border-stone-200/80 dark:border-stone-800 bg-rose-500/5 dark:bg-rose-500/10 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar select-none">
          <span className="font-serif italic font-semibold text-rose-800 dark:text-rose-400 flex items-center gap-1 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            Poetry Verse:
          </span>
          <button
            onClick={insertStanzaBreak}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            + Stanza Break
          </button>
          <button
            onClick={centerVerse}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            Center Stanza
          </button>
          <span className="text-[11px] text-stone-500 ml-auto font-mono">
            {doc.stats.linesCount || 0} lines • {doc.stats.stanzasCount || 1} stanzas
          </span>
        </div>
      );

    case 'journal':
      return (
        <div className="px-4 py-1.5 border-b border-stone-200/80 dark:border-stone-800 bg-emerald-500/5 dark:bg-emerald-500/10 flex items-center gap-3 overflow-x-auto text-xs no-scrollbar select-none">
          <span className="font-medium text-emerald-800 dark:text-emerald-400 flex items-center gap-1 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            Journal:
          </span>
          <button
            onClick={insertTimestamp}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            + Timestamp
          </button>
          <div className="flex items-center gap-1">
            <Smile className="w-3.5 h-3.5 text-stone-400" />
            {(['serene', 'inspired', 'reflective', 'melancholy', 'energetic'] as const).map((mood) => (
              <button
                key={mood}
                onClick={() => handleMoodSelect(mood)}
                className={`px-2 py-0.5 rounded-full capitalize text-[10px] transition ${
                  metadata.journal?.mood === mood
                    ? 'bg-emerald-700 text-white font-medium'
                    : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>
      );

    case 'novel':
    case 'book':
    case 'story': {
      const targetWords = metadata.novel?.targetWordCount || metadata.story?.targetWordCount || 50000;
      const progress = Math.min(100, Math.round((doc.stats.words / targetWords) * 100));

      return (
        <div className="px-4 py-1.5 border-b border-stone-200/80 dark:border-stone-800 bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-between gap-3 overflow-x-auto text-xs no-scrollbar select-none">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-serif font-semibold text-amber-900 dark:text-amber-400 flex items-center gap-1">
              <BookMarked className="w-3.5 h-3.5" />
              Manuscript:
            </span>
            <button
              onClick={insertSceneBreak}
              className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 font-serif text-[11px]"
            >
              + Scene Break (* * *)
            </button>
          </div>

          {/* Word Count Goal Tracker */}
          <div className="flex items-center gap-2 shrink-0">
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] text-stone-600 dark:text-stone-400">
              Goal: {doc.stats.words.toLocaleString()} / {targetWords.toLocaleString()} words ({progress}%)
            </span>
            <div className="w-20 h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <select
              value={targetWords}
              onChange={(e) => handleTargetWordCountChange(Number(e.target.value))}
              aria-label="Target manuscript word count goal"
              className="text-[10px] bg-transparent border border-stone-200 dark:border-stone-700 rounded px-1 py-0.5 outline-none"
            >
              <option value="1000">1k (Flash)</option>
              <option value="5000">5k (Story)</option>
              <option value="20000">20k (Novella)</option>
              <option value="50000">50k (Novel)</option>
              <option value="80000">80k (Epic)</option>
            </select>
          </div>
        </div>
      );
    }

    case 'note':
      return (
        <div className="px-4 py-1.5 border-b border-stone-200/80 dark:border-stone-800 bg-stone-500/5 dark:bg-stone-500/10 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar select-none">
          <span className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1 shrink-0">
            <CheckSquare className="w-3.5 h-3.5" />
            Quick Note:
          </span>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            + Bullet Item
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className="px-2 py-0.5 rounded bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 text-[11px]"
          >
            Highlight Key Idea
          </button>
        </div>
      );

    default:
      return null;
  }
};
