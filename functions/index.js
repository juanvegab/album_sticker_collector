const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { verifyToken } = require("@clerk/backend");

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

const clerkSecretKey = defineSecret("CLERK_SECRET_KEY");
const anthropicKey   = defineSecret("ANTHROPIC_API_KEY");

// ── Valid sticker IDs (mirrored from world-cup-2026.ts) ───────────────
// Team sections: 20 stickers each (1–20, badge at 1, team photo at 13)
const TEAM_SECTION_IDS = [
  "ALG","ARG","AUS","AUT","BEL","BIH","BRA","CAN","CIV","COD",
  "COL","CPV","CRO","CUW","CZE","ECU","EGY","ENG","ESP","FRA",
  "GER","GHA","HAI","IRN","IRQ","JOR","JPN","KOR","KSA","MAR",
  "MEX","NED","NOR","NZL","PAN","PAR","POR","QAT","RSA","SCO",
  "SEN","SUI","SWE","TUN","TUR","URU","USA","UZB",
];

const VALID_STICKER_IDS = new Set();
// FWC stickers: 0–19
for (let i = 0; i <= 19; i++) VALID_STICKER_IDS.add(`FWC${i}`);
// Team stickers: 1–20 (no 0)
for (const sec of TEAM_SECTION_IDS) {
  for (let i = 1; i <= 20; i++) VALID_STICKER_IDS.add(`${sec}${i}`);
}
// CC stickers: 1–14
for (let i = 1; i <= 14; i++) VALID_STICKER_IDS.add(`CC${i}`);

const VALID_SECTION_IDS = new Set(["FWC", ...TEAM_SECTION_IDS, "CC"]);

// ── Build the Haiku prompt ────────────────────────────────────────────
function buildImportPrompt(text) {
  return `You are parsing a sticker collection list for the 2026 World Cup Panini album.

Valid section codes: FWC (stickers 0-19), CC (stickers 1-14), and these team codes (stickers 1-20 each):
ALG,ARG,AUS,AUT,BEL,BIH,BRA,CAN,CIV,COD,COL,CPV,CRO,CUW,CZE,ECU,EGY,ENG,ESP,FRA,GER,GHA,HAI,IRN,IRQ,JOR,JPN,KOR,KSA,MAR,MEX,NED,NOR,NZL,PAN,PAR,POR,QAT,RSA,SCO,SEN,SUI,SWE,TUN,TUR,URU,USA,UZB

DETECT which of two modes applies, then output accordingly:

MODE A — COMPLETE INVENTORY (Figuritas App "Me faltan / Repetidas" export):
  The list shows what is MISSING and what is DUPLICATED. Everything not missing is owned.
  Signals: headers like "Me faltan", "Faltan", "❌", "Missing" AND/OR "Repetidas", "🔁"
  BUT no "Tengo"/"✅"/"Have" header is present.
  → output MISSING stickers in "missing", duplicates in "duplicates", leave "owned" as {}
  Example input:
    Me faltan
    MEX 🇲🇽: 4, 8, 12
    Repetidas
    FWC 🏆: 1, 2 / FWC 🌎: 7, 8
    ARG 🇦🇷: 3, 3, 5
  Example output: {"owned":{},"missing":{"MEX":[4,8,12]},"duplicates":{"FWC":[1,2,7,8],"ARG":[3,3,5]}}

MODE B — PARTIAL LIST (manual lists, WhatsApp, our app's ✅ TENGO format):
  The list shows only what the user OWNS. Missing stickers are not mentioned.
  Signals: "Tengo", "✅", "Have" header present; OR plain sticker lists with no missing section.
  → output owned stickers in "owned", duplicates in "duplicates", leave "missing" as {}
  "Faltan/❌/Missing" items must be EXCLUDED from owned — do not put them anywhere.
  Example input:
    ✅ TENGO
    FWC1, AUT2
    🔁 REPETIDAS
    ARG3
  Example output: {"owned":{"FWC":[1],"AUT":[2]},"missing":{},"duplicates":{"ARG":[3]}}

Additional rules:
- FWC 🏆, FWC 🌎, FWC 📜, FWC ⭐, etc. → ALL map to section "FWC"
- Numbers may be 0-padded: "00" → 0, "04" → 4
- For duplicates: list each NUMBER once per EXTRA copy (ARG3 appears twice as extra → [3,3])
- Album/edition titles like "Usa Méx Can 26", "Figuritas App - Lista" → ignore

Pasted text:
---
${text}
---

Respond with ONLY raw JSON: {"owned":{...},"missing":{...},"duplicates":{...}}
No markdown, no explanation.`;
}

// ── Expand compact format → full sticker IDs ─────────────────────────
// Handles two modes:
//   MODE A: parsed.missing is non-empty → owned = ALL valid IDs minus missing
//   MODE B: parsed.owned is non-empty   → owned = only listed IDs
function expandCompact(parsed) {
  const ownedSet = new Set();
  const duplicates = {};

  // Build missing set first (used by both modes)
  const missingSet = new Set();
  const missingMap = parsed.missing || {};
  for (const [sec, nums] of Object.entries(missingMap)) {
    if (!Array.isArray(nums)) continue;
    for (const n of nums) {
      const id = `${sec}${n}`;
      if (VALID_STICKER_IDS.has(id)) missingSet.add(id);
    }
  }

  if (missingSet.size > 0) {
    // MODE A: owned = ALL valid stickers MINUS missing
    // CC stickers are excluded from auto-expansion — they must be explicitly listed
    for (const id of VALID_STICKER_IDS) {
      if (!missingSet.has(id) && !id.startsWith("CC")) ownedSet.add(id);
    }
  } else {
    // MODE B: owned = only those explicitly listed
    const ownedMap = parsed.owned || {};
    for (const [sec, nums] of Object.entries(ownedMap)) {
      if (!Array.isArray(nums)) continue;
      for (const n of nums) {
        const id = `${sec}${n}`;
        if (VALID_STICKER_IDS.has(id)) ownedSet.add(id);
      }
    }
  }

  // Process duplicates: count extra copies, always add to owned
  const dupMap = parsed.duplicates || {};
  for (const [sec, nums] of Object.entries(dupMap)) {
    if (!Array.isArray(nums)) continue;
    const counts = {};
    for (const n of nums) {
      counts[n] = (counts[n] || 0) + 1;
    }
    for (const [n, count] of Object.entries(counts)) {
      const id = `${sec}${n}`;
      if (VALID_STICKER_IDS.has(id)) {
        duplicates[id] = count;
        ownedSet.add(id);
      }
    }
  }

  return { owned: [...ownedSet], duplicates };
}

// ── Extract JSON from Claude response ────────────────────────────────
function extractJSON(text) {
  // Strip markdown code fences if present
  const stripped = text.replace(/```(?:json)?\s*/g, "").trim();
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  return match[0];
}

/**
 * Parses a free-form sticker list using Claude Haiku and returns
 * { owned: string[], duplicates: Record<string, number> } with validated IDs.
 */
exports.importCollection = onRequest(
  { secrets: [clerkSecretKey, anthropicKey], timeoutSeconds: 60 },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // 1. Verify Clerk token
    const authHeader = req.headers.authorization || "";
    const sessionToken = authHeader.replace("Bearer ", "").trim();

    if (!sessionToken) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    let clerkUserId;
    try {
      const payload = await verifyToken(sessionToken, {
        secretKey: clerkSecretKey.value(),
      });
      clerkUserId = payload.sub;
    } catch (err) {
      console.error("Token verification failed:", err.message);
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // 2. Parse request body
    const { text } = req.body || {};
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      res.status(400).json({ error: "Missing or empty text" });
      return;
    }

    if (text.length > 50000) {
      res.status(400).json({ error: "Text too long (max 50000 chars)" });
      return;
    }

    // 3. Call Claude Haiku
    let rawResponse;
    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: anthropicKey.value() });
      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: buildImportPrompt(text) }],
      });
      rawResponse = message.content[0].text;
    } catch (err) {
      console.error("Anthropic API error:", err.message);
      res.status(500).json({ error: "AI parsing failed" });
      return;
    }

    // 4. Parse and validate the JSON response
    let parsed;
    try {
      const jsonStr = extractJSON(rawResponse);
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error("JSON parse error:", err.message, "Raw:", rawResponse);
      res.status(500).json({ error: "Could not parse AI response" });
      return;
    }

    // Expand compact {"MEX":[1,3]} → ["MEX1","MEX3"] and validate
    const { owned: validOwned, duplicates: validDuplicates } = expandCompact(parsed);

    console.log(`[importCollection] user=${clerkUserId} found=${validOwned.length} owned, ${Object.keys(validDuplicates).length} dupes`);
    res.json({ owned: validOwned, duplicates: validDuplicates });
  }
);

/**
 * Exchanges a Clerk session token for a Firebase custom token.
 */
exports.createFirebaseToken = onRequest(
  { secrets: [clerkSecretKey] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    const authHeader = req.headers.authorization || "";
    const sessionToken = authHeader.replace("Bearer ", "").trim();

    if (!sessionToken) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    try {
      const secretKey = clerkSecretKey.value();
      // Derive the Clerk instance URL from the secret key
      // sk_test_Xxx → https://boss-eel-60.clerk.accounts.dev
      // sk_live_Xxx → production URL
      const payload = await verifyToken(sessionToken, {
        secretKey,
      });

      const clerkUserId = payload.sub;
      const firebaseToken = await admin.auth().createCustomToken(clerkUserId);
      res.json({ token: firebaseToken });
    } catch (error) {
      console.error("Token exchange error:", error.message);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  }
);
