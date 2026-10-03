import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { X, Replace, ReplaceAll } from 'lucide-react';

interface FindAndReplaceProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FindAndReplace: React.FC<FindAndReplaceProps> = ({
  editor,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [matchCase, setMatchCase] = useState(false);

  if (!isOpen || !editor) return null;

  const handleReplace = () => {
    if (!searchTerm.trim()) return;
    const content = editor.getHTML();
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchTerm, flags);
    const updated = content.replace(regex, replaceTerm);
    editor.commands.setContent(updated);
  };

  const handleReplaceAll = () => {
    if (!searchTerm.trim()) return;
    const content = editor.getHTML();
    const flags = matchCase ? 'g' : 'gi';
    const regex = new RegExp(searchTerm, flags);
    const updated = content.replaceAll(regex, replaceTerm);
    editor.commands.setContent(updated);
  };

  return (
    <div className="absolute top-2 right-4 z-popover p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-soft flex flex-col gap-2 max-w-sm w-full animate-in slide-in-from-top-2 duration-150 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-stone-800 dark:text-stone-200 font-serif">
          Find & Replace
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find in manuscript..."
          className="flex-1 px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-amber-500"
          autoFocus
        />
        <label className="flex items-center gap-1 text-[11px] text-stone-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={matchCase}
            onChange={(e) => setMatchCase(e.target.checked)}
            className="rounded text-amber-600"
          />
          <span>Aa</span>
        </label>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={replaceTerm}
          onChange={(e) => setReplaceTerm(e.target.value)}
          placeholder="Replace with..."
          className="flex-1 px-2.5 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg outline-none focus:border-amber-500"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={handleReplace}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Replace Next"
          >
            <Replace className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReplaceAll}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            title="Replace All"
          >
            <ReplaceAll className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
