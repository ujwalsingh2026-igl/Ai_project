export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  userId?: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}
