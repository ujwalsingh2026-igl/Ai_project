import React, { useState } from 'react';
import { Modal } from '../ui';
import type { Chapter, BookRollupStats } from '../../types';
import { Printer, Copy, Download, Check } from 'lucide-react';

interface ManuscriptCompileModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookSubtitle?: string;
  author: string;
  genre?: string;
  chapters: Chapter[];
  stats: BookRollupStats;
}

export const ManuscriptCompileModal: React.FC<ManuscriptCompileModalProps> = ({
  isOpen,
  onClose,
  bookTitle,
  bookSubtitle,
  author,
  genre,
  chapters,
  stats,
}) => {
  const [copied, setCopied] = useState(false);

  const getPlainText = () => {
    let output = `${bookTitle.toUpperCase()}\n`;
    if (bookSubtitle) output += `${bookSubtitle}\n`;
    output += `By ${author}\n`;
    if (genre) output += `Genre: ${genre}\n`;
    output += `Total Words: ${stats.totalWords.toLocaleString()}\n\n`;
    output += `========================================\n\n`;

    chapters.forEach((c) => {
      output += `${c.title.toUpperCase()}\n\n`;
      const plain = c.content.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
      output += `${plain}\n\n`;
      output += `* * *\n\n`;
    });

    return output;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getPlainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'md') => {
    const text = getPlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bookTitle.replace(/\s+/g, '_')}_Manuscript.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compiled Manuscript Preview" size="xl">
      <div className="space-y-6">
        {/* Actions ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800 text-xs">
          <div className="flex items-center gap-3 text-stone-500 font-mono">
            <span>{stats.chaptersCount} chapters</span>
            <span>•</span>
            <span>{stats.totalWords.toLocaleString()} words</span>
            <span>•</span>
            <span>~{stats.estimatedPages} pages</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              onClick={() => handleDownload('md')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 transition font-medium"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Manuscript Reader Sheet */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-8 bg-[#faf8f5] dark:bg-[#151312] border border-stone-200 dark:border-stone-800 rounded-xl custom-scrollbar font-serif">
          {/* Title Page */}
          <div className="text-center py-16 border-b border-stone-300 dark:border-stone-700 mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-2 text-stone-900 dark:text-stone-100">
              {bookTitle}
            </h1>
            {bookSubtitle && (
              <p className="text-xl italic text-stone-600 dark:text-stone-400 mb-6 font-serif">
                {bookSubtitle}
              </p>
            )}
            <p className="text-sm uppercase tracking-widest text-stone-500 font-sans">
              By {author}
            </p>
          </div>

          {/* Sequential Chapters */}
          <div className="space-y-16">
            {chapters.map((chapter) => (
              <article key={chapter.id} className="prose prose-stone dark:prose-invert max-w-none">
                <h2 className="text-2xl font-bold text-center font-serif mb-8 text-stone-900 dark:text-stone-100">
                  {chapter.title}
                </h2>
                <div
                  className="leading-relaxed text-base text-stone-800 dark:text-stone-200"
                  dangerouslySetInnerHTML={{ __html: chapter.content }}
                />
                <div className="text-center my-10 text-stone-400 select-none">* * *</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};
