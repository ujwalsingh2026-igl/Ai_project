export type CharacterRole = 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'other';

export interface Character {
  id: string;
  bookId?: string | null;
  name: string;
  aliases: string[];
  role: CharacterRole;
  archetype?: string;
  avatarColor?: string;
  description: string;
  background?: string;
  personality?: string;
  goals?: string;
  motivation?: string;
  conflict?: string;
  strengths?: string;
  weaknesses?: string;
  relationships?: CharacterRelationship[];
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

export type LocationType = 'kingdom' | 'city' | 'interior' | 'region' | 'planet' | 'landmark' | 'other';

export interface Location {
  id: string;
  bookId?: string | null;
  name: string;
  type: string;
  description: string;
  environment?: string;
  sensorySight?: string;
  sensorySound?: string;
  sensorySmell?: string;
  significance?: string;
  connectedLocationIds?: string[];
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

export type SceneStatus = 'idea' | 'outlined' | 'drafted' | 'completed';

export interface Scene {
  id: string;
  bookId?: string | null;
  chapterId?: string | null;
  title: string;
  summary: string;
  locationId?: string | null;
  characterIds: string[];
  povCharacterId?: string | null;
  goal?: string;
  purpose?: string;
  conflict?: string;
  outcome?: string;
  status: SceneStatus;
  notes?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

