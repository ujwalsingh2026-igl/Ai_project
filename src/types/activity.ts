export type ActivityAction =
  | 'created'
  | 'edited'
  | 'renamed'
  | 'moved'
  | 'restored'
  | 'deleted'
  | 'exported'
  | 'synced';

export interface Activity {
  id: string;
  action: ActivityAction;
  targetId: string;
  targetTitle: string;
  targetType: 'document' | 'book' | 'chapter' | 'folder' | 'system';
  timestamp: number;
  metadata?: Record<string, unknown>;
}
