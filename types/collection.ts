export interface UserCollection {
  albumId: string;
  owned: string[];
  duplicates: Record<string, number>;
  updatedAt: number;
}
