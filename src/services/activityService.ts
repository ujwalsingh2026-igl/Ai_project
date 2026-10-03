import { db } from '../storage/db';
import type { Activity, ActivityAction } from '../types';
import { generateSafeId } from '../utils/security';

export const activityService = {
  async log(
    action: ActivityAction,
    targetId: string,
    targetTitle: string,
    targetType: 'document' | 'book' | 'chapter' | 'folder' | 'system' = 'document',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const activity: Activity = {
        id: generateSafeId(),
        action,
        targetId,
        targetTitle,
        targetType,
        timestamp: Date.now(),
        metadata,
      };
      await db.activities.add(activity);
    } catch (e) {
      console.warn('Failed to record activity log:', e);
    }
  },

  async getRecent(limit = 10): Promise<Activity[]> {
    return await db.activities.orderBy('timestamp').reverse().limit(limit).toArray();
  },
};
