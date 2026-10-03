export interface Character {
  id: string;
  bookId?: string | null;
  name: string;
  aliases: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'other';
  description: string;
  background?: string;
  personality?: string;
  goals?: string;
  motivation?: string;
  conflict?: string;
  strengths?: string;
  weaknesses?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterRelationship {
  id: string;
  characterIdA: string;
  characterIdB: string;
  relationshipType: string;
  description: string;
}

export interface Location {
  id: string;
  bookId?: string | null;
  name: string;
  type: string;
  description: string;
  environment?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TimelineEvent {
  id: string;
  bookId?: string | null;
  title: string;
  dateOrEra: string;
  order: number;
  description: string;
  characterIds: string[];
  locationIds: string[];
  chapterId?: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Scene {
  id: string;
  bookId?: string | null;
  chapterId?: string | null;
  title: string;
  summary: string;
  locationId?: string | null;
  characterIds: string[];
  purpose?: string;
  conflict?: string;
  outcome?: string;
  status: 'idea' | 'outlined' | 'drafted' | 'completed';
  notes?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}
