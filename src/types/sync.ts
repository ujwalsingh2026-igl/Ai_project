export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'synced';

export interface SyncMetadata {
  lastSyncedAt: number | null;
  pendingChangesCount: number;
  syncStatus: SyncStatus;
  deviceId: string;
  errorMessage?: string;
}

export interface SyncQueueItem {
  id: string;
  entityType: 'document' | 'book' | 'chapter' | 'folder' | 'settings';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  payload: Record<string, unknown>;
}
