import { ALL_STICKERS_MAP } from "@/lib/data/world-cup-2026";

// ── Section name aliases ────────────────────────────────────────────────
// Some lists write the full name instead of the section code.
const SECTION_ALIASES: Record<string, string> = {
  "COCA COLA": "CC",
  "COCA-COLA": "CC",
  "COCACOLA": "CC",
};

function normalizeSectionName(line: string): string {
  const upper = line.toUpperCase();
  for (const [alias, code] of Object.entries(SECTION_ALIASES)) {
    if (upper.startsWith(alias)) {
      return code + line.slice(alias.length);
    }
  }
  return line;
}

// ── Lines to skip ───────────────────────────────────────────────────────
const SKIP_SUBSTRINGS = ["FIGURITAS APP", "DOWNLOAD", "HTTP", "USA MEX CAN"];
const SKIP_EXACT = new Set([
  "SWAPS", "REPETIDAS", "INTERCAMBIOS", "MISSING", "NEEDED", "ME FALTAN",
]);

/**
 * Parses a WhatsApp-style sticker list and returns valid sticker IDs found.
 *
 * Supported formats:
 *   Figuritas App — "FWC 📜: 9, 10, 13"   (comma-separated, emoji before colon)
 *   Manual/dash   — "RSA 🇿🇦: 2-3-4-5"    (dash-separated)
 *   No-colon      — "CIV 18" / "JOR 18"    (single or multiple numbers, no colon)
 *   Coca-Cola     — "Coca Cola: 4, 10"     (alias → CC)
 *
 * All results are validated against ALL_STICKERS_MAP so invalid codes are silently dropped.
 */
export function parseExternalList(rawText: string): string[] {
  const VALID_SECTIONS = new Set(
    [...ALL_STICKERS_MAP.keys()].map(id => id.replace(/\d+$/, ""))
  );
  const found = new Set<string>();

  for (const rawLine of rawText.split("\n")) {
    const line = normalizeSectionName(rawLine.trim());
    if (!line) continue;
    const upper = line.toUpperCase();

    // Skip header / metadata lines
    if (SKIP_SUBSTRINGS.some(p => upper.includes(p))) continue;
    if (SKIP_EXACT.has(upper.trim())) continue;

    // Format with colon: "SECTION [emoji]: 9, 10" or "SECTION [emoji]: 2-3-4"
    // [^:]* skips optional emoji / spaces between code and colon
    // [\d,\s\-]+ handles commas, dashes, spaces as separators
    const colonMatch = line.match(/^([A-Z]{2,4})\b[^:]*:\s*([\d,\s\-]+)/);
    if (colonMatch && VALID_SECTIONS.has(colonMatch[1])) {
      colonMatch[2].match(/\d+/g)?.forEach(n => {
        const id = `${colonMatch[1]}${parseInt(n, 10)}`;
        if (ALL_STICKERS_MAP.has(id)) found.add(id);
      });
      continue;
    }

    // Format without colon: "CIV 18", "JOR 18 20", "COL 20"
    const inlineMatch = line.match(/^([A-Z]{2,4})\s+([\d\s,\-]+)\s*$/);
    if (inlineMatch && VALID_SECTIONS.has(inlineMatch[1])) {
      inlineMatch[2].match(/\d+/g)?.forEach(n => {
        const id = `${inlineMatch[1]}${parseInt(n, 10)}`;
        if (ALL_STICKERS_MAP.has(id)) found.add(id);
      });
    }
  }

  return [...found];
}
