import { WORLD_CUP_2026, ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";
import { getSectionName } from "@/lib/data/sectionNames";

/**
 * Builds a shareable sticker list in the same format as the album export:
 *   México 🦅: MEX1, MEX5, MEX8
 *   Brasil 🇧🇷: BRA2, BRA7
 */
export function buildStickerShareText(stickerIds: string[], lang = "es", fromName?: string): string {
  const lines: string[] = [];

  for (const section of WORLD_CUP_2026.sections) {
    const ids = stickerIds
      .filter(id => ALL_STICKERS_MAP.get(id)?.sectionId === section.id)
      .sort((a, b) => {
        const na = ALL_STICKERS_MAP.get(a)?.number ?? 0;
        const nb = ALL_STICKERS_MAP.get(b)?.number ?? 0;
        return na - nb;
      });
    if (ids.length === 0) continue;
    const name = getSectionName(section.id, lang, section.name);
    lines.push(`${name} ${section.emoji}: ${ids.join(", ")}`);
  }

  const header = fromName
    ? `Postales que necesito de ${fromName} (${stickerIds.length}):`
    : `Postales que necesito recibir (${stickerIds.length}):`;

  return [
    header,
    "",
    ...lines,
    "",
    "🌐 elalbum2026.com",
  ].join("\n");
}
