/** Shared group color palette — matches design tokens and tailwind.config.js */
export const GROUP_COLORS: Record<string, string> = {
  FWC: "#F4C430",
  A: "#1FA7A0", B: "#E2453C", C: "#7FB832", D: "#2B6FE3",
  E: "#5847C4", F: "#10B981", G: "#D9457A", H: "#5BB3D6",
  I: "#3B8C5B", J: "#E55D4C", K: "#9333EA", L: "#0EA5E9",
  CC: "#DC2626",
};

/** Returns true if the color is bright enough to need dark (black) text */
export function needsDarkText(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  // WCAG relative luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
}

/** Returns the color for a given section (FWC or team sectionId via TEAM_GROUP) */
export function colorForSection(
  sectionId: string,
  teamGroup: Record<string, string>
): string {
  if (GROUP_COLORS[sectionId]) return GROUP_COLORS[sectionId];
  const g = teamGroup[sectionId];
  return g ? (GROUP_COLORS[g] ?? "#9CA3AF") : "#9CA3AF";
}
