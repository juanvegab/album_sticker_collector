/**
 * Feature flags — toggle experimental features without a new release.
 * Set to `true` to enable, `false` to hide from all users.
 */
export const FEATURES = {
  /** OCR sticker scanning via camera. Still in testing — keep false until stable. */
  SCAN_ENABLED: true,
} as const;
