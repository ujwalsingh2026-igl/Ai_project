import React from 'react';
import { EditorPlaceholder } from '../editor';

export const EditorView: React.FC = () => {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <EditorPlaceholder />
    </div>
  );
};
