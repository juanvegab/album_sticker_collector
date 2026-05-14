const IMPORT_URL =
  "https://us-central1-control-de-postales.cloudfunctions.net/importCollection";

export interface ImportResult {
  owned: string[];
  duplicates: Record<string, number>;
}

/**
 * Sends a free-form sticker list to the Firebase Function, which uses
 * Claude Haiku to parse it and return validated sticker IDs.
 */
export async function parseCollectionWithAI(
  text: string,
  clerkToken: string
): Promise<ImportResult> {
  const res = await fetch(IMPORT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clerkToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  return res.json() as Promise<ImportResult>;
}
