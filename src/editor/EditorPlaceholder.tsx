import React, { useState, useEffect } from 'react';
import { useApp } from '../state';
import { documentService } from '../services/documentService';
import { FileText, Save, CheckCircle } from 'lucide-react';

export const EditorPlaceholder: React.FC = () => {
  const { activeDocument, setActiveDocument } = useApp();
  const [title, setTitle] = useState(activeDocument?.title || 'Untitled Manuscript');
  const [content, setContent] = useState(activeDocument?.content || '');
  const [savedStatus, setSavedStatus] = useState<boolean>(true);

  useEffect(() => {
    if (activeDocument) {
      setTitle(activeDocument.title);
      setContent(activeDocument.content);
    }
  }, [activeDocument]);

  const handleSave = async () => {
    if (activeDocument) {
      await documentService.update(activeDocument.id, { title, content });
      setSavedStatus(true);
      setActiveDocument({
        ...activeDocument,
        title,
        content,
      });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setSavedStatus(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSavedStatus(false);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
      {/* Editor top status bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200/60 bg-stone-50/50">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <FileText className="w-4 h-4 text-stone-400" />
          <span>Manuscript Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            {savedStatus ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-stone-600" />
                <span>Saved locally</span>
              </>
            ) : (
              <span className="text-stone-400 italic">Unsaved changes</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={savedStatus}
            className="flex items-center gap-1.5 px-3 py-1 bg-stone-900 text-white rounded text-xs font-medium hover:bg-stone-800 disabled:opacity-40 transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Writing Canvas */}
      <div className="flex-1 flex flex-col max-w-3xl w-full mx-auto p-6 sm:p-10">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Title of your piece..."
          className="w-full text-2xl sm:text-3xl font-serif font-semibold text-stone-900 placeholder:text-stone-300 border-none outline-none focus:ring-0 mb-6 bg-transparent"
        />
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="Start writing your thoughts, poetry, chapter, or story here. Everything is stored locally on your device..."
          className="flex-1 w-full font-serif text-lg leading-relaxed text-stone-800 placeholder:text-stone-300 resize-none border-none outline-none focus:ring-0 bg-transparent"
        />
      </div>
    </div>
  );
};
