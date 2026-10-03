import { db } from '../storage/db';
import type { Document, DocumentType } from '../types';
import { generateSafeId } from '../utils/security';
import { calculateDocumentStats } from '../utils/formatters';
import { activityService } from './activityService';

export const documentService = {
  async getAll(): Promise<Document[]> {
    const docs = await db.documents.toArray();
    return docs.filter((d) => !d.isDeleted);
  },

  async getById(id: string): Promise<Document | undefined> {
    const doc = await db.documents.get(id);
    if (doc && !doc.isDeleted) {
      // update last opened
      await db.documents.update(id, { lastOpenedAt: Date.now() });
      return { ...doc, lastOpenedAt: Date.now() };
    }
    return undefined;
  },

  async getLatest(): Promise<Document | null> {
    const docs = await this.getAll();
    if (docs.length === 0) return null;
    return docs.sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt))[0];
  },

  async create(title = 'Untitled', type: DocumentType = 'blank', content = ''): Promise<Document> {
    const now = Date.now();
    const stats = calculateDocumentStats(content);
    const newDoc: Document = {
      id: generateSafeId(),
      title,
      type,
      content,
      plainTextPreview: content.slice(0, 160),
      tags: [],
      isFavorite: false,
      isArchived: false,
      isDraft: true,
      isDeleted: false,
      version: 1,
      stats,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };

    await db.documents.add(newDoc);
    await activityService.log('created', newDoc.id, newDoc.title, 'document');
    return newDoc;
  },

  async update(id: string, updates: Partial<Document>): Promise<void> {
    const existing = await db.documents.get(id);
    if (!existing) return;

    const content = updates.content !== undefined ? updates.content : existing.content;
    const stats = updates.content !== undefined ? calculateDocumentStats(content) : existing.stats;

    await db.documents.update(id, {
      ...updates,
      stats,
      updatedAt: Date.now(),
    });

    if (updates.title && updates.title !== existing.title) {
      await activityService.log('renamed', id, updates.title, 'document');
    } else if (updates.content !== undefined) {
      await activityService.log('edited', id, existing.title, 'document');
    }
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const existing = await db.documents.get(id);
    if (!existing) return false;
    const nextFav = !existing.isFavorite;
    await db.documents.update(id, { isFavorite: nextFav, updatedAt: Date.now() });
    return nextFav;
  },

  async softDelete(id: string): Promise<void> {
    const existing = await db.documents.get(id);
    await db.documents.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
    if (existing) {
      await activityService.log('deleted', id, existing.title, 'document');
    }
  },
};
