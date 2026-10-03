import Dexie, { type Table } from 'dexie';
import type {
  Document,
  Book,
  Chapter,
  Folder,
  Tag,
  Character,
  Location,
  TimelineEvent,
  Scene,
  Version,
  TrashItem,
  Activity,
  SyncQueueItem,
  Settings,
} from '../types';

export class LiteriaDatabase extends Dexie {
  documents!: Table<Document, string>;
  books!: Table<Book, string>;
  chapters!: Table<Chapter, string>;
  folders!: Table<Folder, string>;
  tags!: Table<Tag, string>;
  characters!: Table<Character, string>;
  locations!: Table<Location, string>;
  timelineEvents!: Table<TimelineEvent, string>;
  scenes!: Table<Scene, string>;
  versions!: Table<Version, string>;
  trash!: Table<TrashItem, string>;
  activities!: Table<Activity, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('LiteriaDatabase');

    this.version(1).stores({
      documents: 'id, type, folderId, bookId, isFavorite, isArchived, isDraft, isDeleted, updatedAt, createdAt',
      books: 'id, status, updatedAt, createdAt',
      chapters: 'id, bookId, order, updatedAt',
      folders: 'id, parentId, updatedAt',
      tags: 'id, name',
      characters: 'id, bookId, role, updatedAt',
      locations: 'id, bookId, updatedAt',
      timelineEvents: 'id, bookId, order, updatedAt',
      scenes: 'id, bookId, chapterId, order, status',
      versions: 'id, documentId, versionNumber, createdAt',
      trash: 'id, originalId, itemType, deletedAt',
      activities: 'id, action, targetId, timestamp',
      syncQueue: 'id, entityType, entityId, timestamp',
      settings: 'id',
    });
  }
}

export const db = new LiteriaDatabase();
