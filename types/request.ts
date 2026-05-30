export type RequestStatus = "pending" | "accepted" | "received" | "rejected" | "cancelled";

export interface StickerRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  stickers: string[];
  givenStickers?: string[];  // subset toUser confirmed to give
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  isExternal?: boolean;  // request created from an external (non-app) friend's list
}
