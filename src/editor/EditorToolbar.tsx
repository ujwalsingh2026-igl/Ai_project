import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Undo2,
  Redo2,
  Search,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';

interface EditorToolbarProps {
  editor: Editor | null;
  onToggleFindReplace: () => void;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onToggleFindReplace,
  className = '',
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Enter Image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const colors = ['#1c1917', '#78716c', '#b45309', '#15803d', '#0369a1', '#b91c1c', '#7c3aed'];

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 flex-wrap select-none text-stone-700 dark:text-stone-300',
        className
      )}
    >
      {/* History Group */}
      <div className="flex items-center gap-0.5 pr-1.5 border-r border-stone-200 dark:border-stone-800">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 transition"
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Style selector */}
      <select
        value={
          editor.isActive('heading', { level: 1 })
            ? 'h1'
            : editor.isActive('heading', { level: 2 })
            ? 'h2'
            : editor.isActive('heading', { level: 3 })
            ? 'h3'
            : editor.isActive('blockquote')
            ? 'quote'
            : 'paragraph'
        }
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'paragraph') editor.chain().focus().setParagraph().run();
          else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
          else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
          else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
          else if (val === 'quote') editor.chain().focus().toggleBlockquote().run();
        }}
        className="px-2 py-1 text-xs bg-stone-100 dark:bg-stone-800 border-none rounded-md outline-none cursor-pointer font-medium mx-1"
      >
        <option value="paragraph">Paragraph</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
        <option value="quote">Blockquote</option>
      </select>

      {/* Basic Marks */}
      <div className="flex items-center gap-0.5 px-1 border-r border-stone-200 dark:border-stone-800">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('bold')
              ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100 font-bold'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('italic')
              ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('underline')
              ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('strike')
              ? 'bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('highlight')
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        {/* Color Picker trigger */}
        <div className="relative inline-block">
          <button
            onClick={() => setShowColorPicker((prev) => !prev)}
            className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center gap-1"
            title="Text Color"
          >
            <span className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 bg-stone-800 dark:bg-stone-200" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full mt-1.5 left-0 p-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-soft flex gap-1.5 z-dropdown">
              {colors.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    editor.chain().focus().setColor(c).run();
                    setShowColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-stone-200 dark:border-stone-700 hover:scale-110 transition"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alignment Group */}
      <div className="flex items-center gap-0.5 px-1 border-r border-stone-200 dark:border-stone-800">
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive({ textAlign: 'left' })
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive({ textAlign: 'center' })
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive({ textAlign: 'right' })
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive({ textAlign: 'justify' })
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Justify"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      {/* Lists & Quotes */}
      <div className="flex items-center gap-0.5 px-1 border-r border-stone-200 dark:border-stone-800">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('bulletList')
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('orderedList')
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('blockquote')
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title="Horizontal Rule Separator"
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>

      {/* Sub/Superscript */}
      <div className="flex items-center gap-0.5 px-1 border-r border-stone-200 dark:border-stone-800">
        <button
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('subscript')
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Subscript"
        >
          <SubscriptIcon className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('superscript')
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Superscript"
        >
          <SuperscriptIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Inserts: Link, Image, Table */}
      <div className="flex items-center gap-0.5 px-1 border-r border-stone-200 dark:border-stone-800">
        <button
          onClick={setLink}
          className={cn(
            'p-1.5 rounded-md transition',
            editor.isActive('link')
              ? 'bg-stone-200 dark:bg-stone-700'
              : 'hover:bg-stone-100 dark:hover:bg-stone-800'
          )}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          onClick={addImage}
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <button
          onClick={insertTable}
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          title="Insert Table"
        >
          <TableIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Find & Replace Action */}
      <div className="flex items-center pl-1">
        <button
          onClick={onToggleFindReplace}
          className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition flex items-center gap-1 text-xs"
          title="Find and Replace (Ctrl+F)"
        >
          <Search className="w-4 h-4" />
          <span className="hidden xl:inline">Find</span>
        </button>
      </div>
    </div>
  );
};
