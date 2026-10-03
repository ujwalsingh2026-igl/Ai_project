import { db } from '../storage/db';
import type { Tag } from '../types';
import { generateSafeId } from '../utils/security';

export const tagService = {
  async getAll(): Promise<Tag[]> {
    return await db.tags.toArray();
  },

  async create(name: string, color?: string): Promise<Tag> {
    const existing = await db.tags.where('name').equalsIgnoreCase(name).first();
    if (existing) return existing;

    const tag: Tag = {
      id: generateSafeId(),
      name: name.toLowerCase().trim(),
      color,
      createdAt: Date.now(),
    };
    await db.tags.add(tag);
    return tag;
  },

  async delete(id: string): Promise<void> {
    await db.tags.delete(id);
  },
};
