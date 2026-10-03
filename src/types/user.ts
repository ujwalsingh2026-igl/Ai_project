export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
  preferences?: Record<string, unknown>;
}
