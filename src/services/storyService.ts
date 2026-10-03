import { db } from '../storage/db';
import type {
  Character,
  Location,
  TimelineEvent,
  Scene,
} from '../types/story';

export class StoryService {
  // ==========================================
  // CHARACTERS
  // ==========================================

  async getAllCharacters(bookId?: string | null): Promise<Character[]> {
    if (bookId) {
      return db.characters.where('bookId').equals(bookId).reverse().sortBy('updatedAt');
    }
    return db.characters.toArray();
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    return db.characters.get(id);
  }

  async createCharacter(data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Promise<Character> {
    const now = Date.now();
    const character: Character = {
      ...data,
      id: crypto.randomUUID(),
      aliases: data.aliases || [],
      tags: data.tags || [],
      relationships: data.relationships || [],
      avatarColor: data.avatarColor || this.getRandomColor(),
      createdAt: now,
      updatedAt: now,
    };

    await db.characters.put(character);
    return character;
  }

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character> {
    const existing = await db.characters.get(id);
    if (!existing) {
      throw new Error(`Character with ID "${id}" not found.`);
    }

    const updated: Character = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.characters.put(updated);
    return updated;
  }

  async deleteCharacter(id: string): Promise<void> {
    await db.characters.delete(id);
  }

  // ==========================================
  // LOCATIONS
  // ==========================================

  async getAllLocations(bookId?: string | null): Promise<Location[]> {
    if (bookId) {
      return db.locations.where('bookId').equals(bookId).reverse().sortBy('updatedAt');
    }
    return db.locations.toArray();
  }

  async getLocation(id: string): Promise<Location | undefined> {
    return db.locations.get(id);
  }

  async createLocation(data: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location> {
    const now = Date.now();
    const location: Location = {
      ...data,
      id: crypto.randomUUID(),
      tags: data.tags || [],
      connectedLocationIds: data.connectedLocationIds || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.locations.put(location);
    return location;
  }

  async updateLocation(id: string, updates: Partial<Location>): Promise<Location> {
    const existing = await db.locations.get(id);
    if (!existing) {
      throw new Error(`Location with ID "${id}" not found.`);
    }

    const updated: Location = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.locations.put(updated);
    return updated;
  }

  async deleteLocation(id: string): Promise<void> {
    await db.locations.delete(id);
  }

  // ==========================================
  // TIMELINE EVENTS
  // ==========================================

  async getAllTimelineEvents(bookId?: string | null): Promise<TimelineEvent[]> {
    if (bookId) {
      const events = await db.timelineEvents.where('bookId').equals(bookId).sortBy('order');
      return events;
    }
    const events = await db.timelineEvents.toArray();
    return events.sort((a, b) => a.order - b.order);
  }

  async getTimelineEvent(id: string): Promise<TimelineEvent | undefined> {
    return db.timelineEvents.get(id);
  }

  async createTimelineEvent(data: Omit<TimelineEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<TimelineEvent> {
    const now = Date.now();
    let order = data.order;
    if (order === undefined) {
      const existing = await this.getAllTimelineEvents(data.bookId);
      order = existing.length > 0 ? Math.max(...existing.map((e) => e.order)) + 1 : 0;
    }

    const event: TimelineEvent = {
      ...data,
      id: crypto.randomUUID(),
      order,
      characterIds: data.characterIds || [],
      locationIds: data.locationIds || [],
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await db.timelineEvents.put(event);
    return event;
  }

  async updateTimelineEvent(id: string, updates: Partial<TimelineEvent>): Promise<TimelineEvent> {
    const existing = await db.timelineEvents.get(id);
    if (!existing) {
      throw new Error(`Timeline event with ID "${id}" not found.`);
    }

    const updated: TimelineEvent = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.timelineEvents.put(updated);
    return updated;
  }

  async reorderTimelineEvents(eventIdsInOrder: string[]): Promise<void> {
    await db.transaction('rw', db.timelineEvents, async () => {
      for (let i = 0; i < eventIdsInOrder.length; i++) {
        await db.timelineEvents.update(eventIdsInOrder[i], { order: i, updatedAt: Date.now() });
      }
    });
  }

  async deleteTimelineEvent(id: string): Promise<void> {
    await db.timelineEvents.delete(id);
  }

  // ==========================================
  // SCENES
  // ==========================================

  async getAllScenes(bookId?: string | null, chapterId?: string | null): Promise<Scene[]> {
    if (chapterId) {
      const scenes = await db.scenes.where('chapterId').equals(chapterId).sortBy('order');
      return scenes;
    }
    if (bookId) {
      const scenes = await db.scenes.where('bookId').equals(bookId).sortBy('order');
      return scenes;
    }
    const scenes = await db.scenes.toArray();
    return scenes.sort((a, b) => a.order - b.order);
  }

  async getScene(id: string): Promise<Scene | undefined> {
    return db.scenes.get(id);
  }

  async createScene(data: Omit<Scene, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scene> {
    const now = Date.now();
    let order = data.order;
    if (order === undefined) {
      const existing = await this.getAllScenes(data.bookId, data.chapterId);
      order = existing.length > 0 ? Math.max(...existing.map((s) => s.order)) + 1 : 0;
    }

    const scene: Scene = {
      ...data,
      id: crypto.randomUUID(),
      order,
      characterIds: data.characterIds || [],
      status: data.status || 'idea',
      createdAt: now,
      updatedAt: now,
    };

    await db.scenes.put(scene);
    return scene;
  }

  async updateScene(id: string, updates: Partial<Scene>): Promise<Scene> {
    const existing = await db.scenes.get(id);
    if (!existing) {
      throw new Error(`Scene with ID "${id}" not found.`);
    }

    const updated: Scene = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.scenes.put(updated);
    return updated;
  }

  async reorderScenes(sceneIdsInOrder: string[]): Promise<void> {
    await db.transaction('rw', db.scenes, async () => {
      for (let i = 0; i < sceneIdsInOrder.length; i++) {
        await db.scenes.update(sceneIdsInOrder[i], { order: i, updatedAt: Date.now() });
      }
    });
  }

  async deleteScene(id: string): Promise<void> {
    await db.scenes.delete(id);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  private getRandomColor(): string {
    const colors = [
      '#f59e0b', // amber
      '#ef4444', // red
      '#3b82f6', // blue
      '#10b981', // emerald
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316', // orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const storyService = new StoryService();
