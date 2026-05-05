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

export interface TradeResponse {
  id: string;
  responderId?: string;
  responderName: string;
  wantsToReceive: string[]; // subset of trade.offering (what respondent wants)
  canGive: string[];         // subset of trade.requesting (what respondent can provide)
  createdAt: number;
}
