import { db } from '../storage/db';
import type { Document, DocumentType } from '../types';
import { generateSafeId } from '../utils/security';
import { activityService } from './activityService';
import {
  getDocumentTypeTemplate,
  getDefaultMetadataForType,
  calculateEnhancedStats,
} from '../editor/documentTemplates';

export const documentService = {
  async getAll(): Promise<Document[]> {
    const docs = await db.documents.toArray();
    return docs.filter((d) => !d.isDeleted);
  },

  async getById(id: string): Promise<Document | undefined> {
    const doc = await db.documents.get(id);
    if (doc && !doc.isDeleted) {
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
    const finalContent = content || getDocumentTypeTemplate(type, title);
    const plainText = finalContent.replace(/<[^>]+>/g, ' ');
    const stats = calculateEnhancedStats(type, plainText, finalContent);
    const metadata = getDefaultMetadataForType(type);

    const newDoc: Document = {
      id: generateSafeId(),
      title,
      type,
      content: finalContent,
      plainTextPreview: plainText.slice(0, 160),
      tags: [],
      isFavorite: false,
      isArchived: false,
      isDraft: true,
      isDeleted: false,
      version: 1,
      stats,
      metadata,
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
    const plainText = content.replace(/<[^>]+>/g, ' ');
    const docType = updates.type || existing.type;
    const stats = updates.content !== undefined ? calculateEnhancedStats(docType, plainText, content) : existing.stats;
    const metadata = updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata;

    await db.documents.update(id, {
      ...updates,
      stats,
      metadata,
      updatedAt: Date.now(),
    });

    if (updates.title && updates.title !== existing.title) {
      await activityService.log('renamed', id, updates.title, 'document');
    } else if (updates.content !== undefined) {
      await activityService.log('edited', id, existing.title, 'document');
    }
  },

  async rename(id: string, newTitle: string): Promise<void> {
    await this.update(id, { title: newTitle.trim() || 'Untitled' });
  },

  async duplicate(id: string): Promise<Document | null> {
    const existing = await db.documents.get(id);
    if (!existing) return null;

    const now = Date.now();
    const copy: Document = {
      ...existing,
      id: generateSafeId(),
      title: `${existing.title} (Copy)`,
      version: 1,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };

    await db.documents.add(copy);
    await activityService.log('created', copy.id, copy.title, 'document', { duplicateOf: id });
    return copy;
  },

  async moveToFolder(id: string, folderId: string | null): Promise<void> {
    const existing = await db.documents.get(id);
    if (!existing) return;
    await db.documents.update(id, { folderId, updatedAt: Date.now() });
    await activityService.log('moved', id, existing.title, 'document', { folderId });
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const existing = await db.documents.get(id);
    if (!existing) return false;
    const nextFav = !existing.isFavorite;
    await db.documents.update(id, { isFavorite: nextFav, updatedAt: Date.now() });
    return nextFav;
  },

  async toggleArchive(id: string): Promise<boolean> {
    const existing = await db.documents.get(id);
    if (!existing) return false;
    const nextArchived = !existing.isArchived;
    await db.documents.update(id, { isArchived: nextArchived, updatedAt: Date.now() });
    return nextArchived;
  },

  async addTag(id: string, tag: string): Promise<void> {
    const existing = await db.documents.get(id);
    if (!existing) return;
    const normalized = tag.toLowerCase().trim();
    if (!existing.tags.includes(normalized)) {
      const nextTags = [...existing.tags, normalized];
      await db.documents.update(id, { tags: nextTags, updatedAt: Date.now() });
    }
  },

  async removeTag(id: string, tag: string): Promise<void> {
    const existing = await db.documents.get(id);
    if (!existing) return;
    const nextTags = existing.tags.filter((t) => t !== tag);
    await db.documents.update(id, { tags: nextTags, updatedAt: Date.now() });
  },

  async softDelete(id: string): Promise<void> {
    const existing = await db.documents.get(id);
    if (!existing) return;
    await db.documents.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
    });
    await activityService.log('deleted', id, existing.title, 'document');
  },

  /* Bulk operations */
  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.softDelete(id);
    }
  },

  async bulkMove(ids: string[], folderId: string | null): Promise<void> {
    for (const id of ids) {
      await this.moveToFolder(id, folderId);
    }
  },

  async bulkArchive(ids: string[], isArchived: boolean): Promise<void> {
    for (const id of ids) {
      await db.documents.update(id, { isArchived, updatedAt: Date.now() });
    }
  },

  async bulkFavorite(ids: string[], isFavorite: boolean): Promise<void> {
    for (const id of ids) {
      await db.documents.update(id, { isFavorite, updatedAt: Date.now() });
    }
  },
};
