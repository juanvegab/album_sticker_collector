export interface UserProfile {
  userId: string;
  name: string;
  avatarUrl?: string;
  friends: string[];
  pendingFrom: string[];
  expoPushToken?: string;
  createdAt: number;
}
