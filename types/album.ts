export type StickerType = "special" | "stadium" | "badge" | "player";

export interface AlbumSticker {
  id: string;
  globalNumber: number;
  sectionId: string;
  number: number;
  name: string;
  type: StickerType;
  teamCode?: string;
  imageUrl?: string;
}

export interface AlbumSection {
  id: string;
  name: string;
  emoji: string;
  stickers: AlbumSticker[];
}

export interface Album {
  id: string;
  name: string;
  year: number;
  totalStickers: number;
  sections: AlbumSection[];
}
