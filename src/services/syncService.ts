import type { SyncMetadata } from '../types';

export const syncService = {
  getMetadata(): SyncMetadata {
    return {
      lastSyncedAt: null,
      pendingChangesCount: 0,
      syncStatus: 'offline',
      deviceId: 'local-device',
    };
  },
};
