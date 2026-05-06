export type RequestStatus = "pending" | "accepted" | "rejected";

export interface StickerRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  stickers: string[];
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
}
