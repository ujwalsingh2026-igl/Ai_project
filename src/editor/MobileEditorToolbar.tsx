import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  List,
  Quote,
  Heading1,
  Heading2,
  SlidersHorizontal,
  Table,
  Link,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { BottomSheet } from '../components/ui';

interface MobileEditorToolbarProps {
  editor: Editor | null;
}

export const MobileEditorToolbar: React.FC<MobileEditorToolbarProps> = ({ editor }) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!editor) return null;

  return (
    <>
      <div className="md:hidden flex items-center justify-between gap-1 px-2 py-1.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 z-20 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg ${editor.isActive('bold') ? 'bg-stone-200 dark:bg-stone-700' : ''}`}
            aria-label="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg ${editor.isActive('italic') ? 'bg-stone-200 dark:bg-stone-700' : ''}`}
            aria-label="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-lg ${editor.isActive('underline') ? 'bg-stone-200 dark:bg-stone-700' : ''}`}
            aria-label="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded-lg ${editor.isActive('heading', { level: 2 }) ? 'bg-stone-200 dark:bg-stone-700' : ''}`}
            aria-label="Heading"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg ${editor.isActive('bulletList') ? 'bg-stone-200 dark:bg-stone-700' : ''}`}
            aria-label="Bullet list"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-lg ${editor.isActive('blockquote') ? 'bg-stone-200 dark:bg-stone-700' : ''}`}
            aria-label="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 ml-1 shrink-0"
          aria-label="More formatting options"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Formatting Bottom Sheet */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Formatting & Inserts"
      >
        <div className="space-y-4 pb-6 text-xs">
          <div>
            <div className="font-semibold text-stone-400 uppercase text-[10px] mb-2">Headings</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  editor.chain().focus().setParagraph().run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-center"
              >
                Normal Text
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 1 }).run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-center flex items-center justify-center gap-1"
              >
                <Heading1 className="w-3.5 h-3.5" />
                <span>H1</span>
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level: 2 }).run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 text-center flex items-center justify-center gap-1"
              >
                <Heading2 className="w-3.5 h-3.5" />
                <span>H2</span>
              </button>
            </div>
          </div>

          <div>
            <div className="font-semibold text-stone-400 uppercase text-[10px] mb-2">Alignment</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('left').run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-1.5"
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>Left</span>
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('center').run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-1.5"
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Center</span>
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().setTextAlign('right').run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-1.5"
              >
                <AlignRight className="w-3.5 h-3.5" />
                <span>Right</span>
              </button>
            </div>
          </div>

          <div>
            <div className="font-semibold text-stone-400 uppercase text-[10px] mb-2">Insert Elements</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const url = window.prompt('Enter link URL:');
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-1.5"
              >
                <Link className="w-3.5 h-3.5" />
                <span>Link</span>
              </button>
              <button
                onClick={() => {
                  const url = window.prompt('Enter image URL:');
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-1.5"
              >
                <Image className="w-3.5 h-3.5" />
                <span>Image</span>
              </button>
              <button
                onClick={() => {
                  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                  setSheetOpen(false);
                }}
                className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center gap-1.5"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};
