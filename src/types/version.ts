export interface Version {
  id: string;
  documentId: string;
  versionNumber: number;
  name?: string;
  content: string;
  plainTextPreview?: string;
  wordCount: number;
  deviceId?: string;
  authorName?: string;
  createdAt: number;
}
