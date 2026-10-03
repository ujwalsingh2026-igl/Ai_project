export type SharePermission = 'view' | 'comment' | 'edit';

export interface Share {
  id: string;
  documentId?: string;
  bookId?: string;
  shareCode: string;
  permission: SharePermission;
  isPasswordProtected: boolean;
  expiresAt?: number | null;
  createdAt: number;
}
