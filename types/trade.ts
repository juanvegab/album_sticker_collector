export type TradeStatus = "open" | "pending" | "accepted" | "rejected" | "completed";

export interface Trade {
  id: string;
  albumId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId?: string;
  offering: string[];
  requesting: string[];
  status: TradeStatus;
  createdAt: number;
  updatedAt: number;
}
