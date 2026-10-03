import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getEditorExtensions } from './extensions';
import { EditorToolbar } from './EditorToolbar';
import { MobileEditorToolbar } from './MobileEditorToolbar';
import { EditorStatusBar } from './EditorStatusBar';
import { FindAndReplace } from './FindAndReplace';
import { useApp } from '../state';
import { documentService } from '../services/documentService';
import { calculateDocumentStats } from '../utils/formatters';
import type { Document, DocumentStats } from '../types';
import './editor.css';

export const LiteriaEditor: React.FC = () => {
  const { activeDocument, setActiveDocument, distractionFree, settings } = useApp();
  const [doc, setDoc] = useState<Document | null>(activeDocument);
  const [title, setTitle] = useState<string>(activeDocument?.title || 'Untitled');
  const [stats, setStats] = useState<DocumentStats>(
    activeDocument?.stats || calculateDocumentStats('')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);

  const saveTimeoutRef = useRef<number | null>(null);
  const currentDocIdRef = useRef<string | null>(activeDocument?.id || null);

  // Sync when activeDocument changes from outside
  useEffect(() => {
    if (activeDocument) {
      setDoc(activeDocument);
      setTitle(activeDocument.title);
      setStats(activeDocument.stats || calculateDocumentStats(activeDocument.content || ''));
      currentDocIdRef.current = activeDocument.id;
    } else {
      // Auto-load latest document or create initial one if none active
      (async () => {
        const latest = await documentService.getLatest();
        if (latest) {
          setActiveDocument(latest);
        } else {
          const fresh = await documentService.create('Welcome to LITERIA', 'blank', '<p>Welcome to <strong>LITERIA</strong> — <em>Where every story finds its form.</em></p><p>Start writing your thoughts, notes, novel, or journal freely.</p>');
          setActiveDocument(fresh);
        }
      })();
    }
  }, [activeDocument, setActiveDocument]);

  // Setup TipTap Editor
  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: doc?.content || '',
    editorProps: {
      attributes: {
        class:
          'focus:outline-none min-h-[500px] prose prose-stone dark:prose-invert max-w-none font-serif text-stone-800 dark:text-stone-200 text-lg leading-relaxed selection:bg-amber-100 dark:selection:bg-amber-900/40',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setHasUnsaved(true);
      const text = currentEditor.getText();
      const html = currentEditor.getHTML();
      const newStats = calculateDocumentStats(text);
      setStats(newStats);

      // Emergency snapshot in localStorage (crash-proofing)
      if (currentDocIdRef.current) {
        try {
          localStorage.setItem(`literia_snapshot_${currentDocIdRef.current}`, html);
        } catch {
          // ignore quota exceeded
        }
      }

      // Debounced save to IndexedDB
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        if (!currentDocIdRef.current) return;
        setIsSaving(true);
        try {
          await documentService.update(currentDocIdRef.current, {
            content: html,
            plainTextPreview: text.slice(0, 160),
          });
          setHasUnsaved(false);
        } catch (err) {
          console.error('Failed to save document:', err);
        } finally {
          setIsSaving(false);
        }
      }, 1200);
    },
  });

  // Update editor content when active document ID changes
  useEffect(() => {
    if (editor && doc && doc.id !== currentDocIdRef.current) {
      currentDocIdRef.current = doc.id;
      // Check emergency snapshot
      const snapshot = localStorage.getItem(`literia_snapshot_${doc.id}`);
      const contentToLoad = snapshot || doc.content || '';
      editor.commands.setContent(contentToLoad);
    }
  }, [doc, editor]);

  // Handle immediate manual save (Ctrl+S)
  const handleImmediateSave = useCallback(async () => {
    if (!currentDocIdRef.current || !editor) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    setIsSaving(true);
    const html = editor.getHTML();
    const text = editor.getText();
    try {
      await documentService.update(currentDocIdRef.current, {
        title,
        content: html,
        plainTextPreview: text.slice(0, 160),
      });
      setHasUnsaved(false);
    } finally {
      setIsSaving(false);
    }
  }, [editor, title]);

  // Title change handler
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setHasUnsaved(true);
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      if (!currentDocIdRef.current) return;
      setIsSaving(true);
      try {
        await documentService.rename(currentDocIdRef.current, newTitle);
        setHasUnsaved(false);
      } finally {
        setIsSaving(false);
      }
    }, 800);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleImmediateSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindReplaceOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleImmediateSave]);

  const widthClassMap: Record<string, string> = {
    narrow: 'max-w-xl',
    medium: 'max-w-3xl',
    wide: 'max-w-5xl',
    full: 'max-w-none px-4',
  };

  const fontClassMap: Record<string, string> = {
    serif: 'font-serif-literary',
    sans: 'font-sans-literary',
    mono: 'font-mono-literary',
    classic: 'font-classic-literary',
    modern: 'font-sans-literary',
    handwriting: 'font-handwriting-literary',
  };

  const currentFontClass = fontClassMap[settings.appearance.fontFamily] || 'font-serif-literary';
  const currentWidthClass = widthClassMap[settings.appearance.writingWidth] || 'max-w-3xl';

  return (
    <div
      className={`flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-text-primary)] relative overflow-hidden transition-colors duration-200 ${currentFontClass}`}
    >
      {/* Desktop Toolbar (Hidden in Distraction-Free mode) */}
      {!distractionFree && (
        <EditorToolbar
          editor={editor}
          onToggleFindReplace={() => setFindReplaceOpen((prev) => !prev)}
        />
      )}

      {/* Floating Find & Replace */}
      <FindAndReplace
        editor={editor}
        isOpen={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
      />

      {/* Writing Canvas */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-8 flex justify-center custom-scrollbar">
        <main
          className={`w-full ${currentWidthClass} flex flex-col min-h-[calc(100vh-16rem)] writing-sheet transition-all duration-200`}
          style={{
            fontSize: `${settings.appearance.largerText ? settings.appearance.fontSize + 2 : settings.appearance.fontSize}px`,
            lineHeight: settings.appearance.increasedLineHeight ? settings.appearance.lineHeight + 0.2 : settings.appearance.lineHeight,
            letterSpacing: `${settings.appearance.letterSpacing}px`,
          }}
        >
          {/* Document Title Input */}
          <div className="mb-6">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Untitled Document"
              className="w-full text-3xl sm:text-4xl font-serif font-bold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] bg-transparent border-none outline-none focus:ring-0 tracking-tight transition-colors"
            />
            <div className="h-0.5 w-16 bg-[var(--color-accent)]/40 mt-3 rounded-full" />
          </div>

          {/* TipTap Rich Text Area */}
          <div className="flex-1 cursor-text pb-28">
            <EditorContent editor={editor} />
          </div>
        </main>
      </div>

      {/* Mobile Toolbar (Visible on touch/small viewports) */}
      <MobileEditorToolbar editor={editor} />

      {/* Status Bar */}
      <EditorStatusBar
        stats={stats}
        isSaving={isSaving}
        hasUnsaved={hasUnsaved}
      />
    </div>
  );
};
