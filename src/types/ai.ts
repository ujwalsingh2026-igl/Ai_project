export type AIActionType =
  | 'grammar'
  | 'rewrite'
  | 'expand'
  | 'summarize'
  | 'tone'
  | 'character'
  | 'plot'
  | 'dialogue'
  | 'brainstorm';

export interface AIHistoryItem {
  id: string;
  documentId?: string;
  action: AIActionType;
  prompt: string;
  inputContent: string;
  suggestedContent: string;
  accepted: boolean;
  timestamp: number;
}
