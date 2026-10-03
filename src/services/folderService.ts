import { db } from '../storage/db';
import type { Folder } from '../types';
import { generateSafeId } from '../utils/security';
import { activityService } from './activityService';

export const folderService = {
  async getAll(): Promise<Folder[]> {
    return await db.folders.toArray();
  },

  async getById(id: string): Promise<Folder | undefined> {
    return await db.folders.get(id);
  },

  async getSubfolders(parentId: string | null = null): Promise<Folder[]> {
    const all = await this.getAll();
    return all.filter((f) => (parentId === null ? !f.parentId : f.parentId === parentId));
  },

  async create(name: string, parentId?: string | null, color?: string, icon?: string): Promise<Folder> {
    const now = Date.now();
    const folder: Folder = {
      id: generateSafeId(),
      name,
      parentId: parentId || null,
      color,
      icon,
      createdAt: now,
      updatedAt: now,
    };
    await db.folders.add(folder);
    await activityService.log('created', folder.id, folder.name, 'folder');
    return folder;
  },

  async rename(id: string, newName: string): Promise<void> {
    const existing = await db.folders.get(id);
    if (!existing) return;
    await db.folders.update(id, { name: newName, updatedAt: Date.now() });
    await activityService.log('renamed', id, newName, 'folder');
  },

  async delete(id: string): Promise<void> {
    const existing = await db.folders.get(id);
    if (!existing) return;

    // Reset folderId on all documents inside this folder
    const docs = await db.documents.where('folderId').equals(id).toArray();
    for (const doc of docs) {
      await db.documents.update(doc.id, { folderId: null });
    }

    // Delete folder
    await db.folders.delete(id);
    await activityService.log('deleted', id, existing.name, 'folder');
  },
};
