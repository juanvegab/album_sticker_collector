const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { verifyToken } = require("@clerk/backend");

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

const clerkSecretKey    = defineSecret("CLERK_SECRET_KEY");
const clerkSecretKeyDev = defineSecret("CLERK_SECRET_KEY_DEV");
const anthropicKey      = defineSecret("ANTHROPIC_API_KEY");

// ── Clerk token verification (prod + dev fallback) ───────────────────
/**
 * Verifies a Clerk session token against the production secret key.
 * Falls back to the dev secret key to support users still on old builds
 * during the transition period (Development → Production Clerk migration).
 */
async function verifyClerkToken(sessionToken) {
  try {
    return await verifyToken(sessionToken, { secretKey: clerkSecretKey.value() });
  } catch (prodErr) {
    try {
      return await verifyToken(sessionToken, { secretKey: clerkSecretKeyDev.value() });
    } catch {
      throw prodErr; // throw the original prod error for logging
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

/** Split an array into chunks of at most `size` items. */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Returns the admin userId list from Firestore (config/broadcast_admin).
 * Document shape: { adminUserIds: ["user_xxx", ...] }
 * Create this document manually in the Firebase console.
 */
async function getAdminUserIds() {
  try {
    const snap = await admin.firestore().doc("config/broadcast_admin").get();
    if (!snap.exists) return [];
    const data = snap.data();
    return Array.isArray(data.adminUserIds) ? data.adminUserIds : [];
  } catch {
    return [];
  }
}

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

Sticker lists are usually organized under section headers. Interpret headers semantically:

POSSESSION headers (user OWNS these stickers):
  Any word/phrase expressing ownership or availability for trade, in any language.
  Examples: "Tengo", "I have", "Tenho", "J'ai", "✅", "Disponibles", "Para intercambio", "Para cambio", "Ofrezco", "For trade", "For swap", "Swaps", "Available", "Doubles available", or any similar phrasing.

MISSING headers (user NEEDS these stickers):
  Any word/phrase expressing need, want, or absence, in any language.
  Examples: "Me faltan", "Necesito", "Busco", "Quiero", "Falta", "I need", "I want", "Looking for", "Missing", "Need", "Wanted", "❌", or any similar phrasing.

DUPLICATE headers (user has EXTRA copies, possibly to trade):
  Any word/phrase expressing extras or tradeable copies, in any language.
  Examples: "Repetidas", "Repet.", "Dobles", "Sobran", "Duplicados", "Extras", "Swaps", "For swap", "For trade", "🔁", or any similar phrasing.
  Note: "Swaps" and "For trade/swap" are DUPLICATE signals, NOT possession — they mean extra copies available to exchange.

DETECT which of two modes applies, then output accordingly:

MODE A — COMPLETE INVENTORY (Figuritas App "Me faltan / Repetidas" export):
  The list contains a MISSING section AND/OR a DUPLICATE section, but no POSSESSION section.
  Everything not listed under a missing header is considered owned.
  → output stickers under missing headers in "missing", under duplicate headers in "duplicates", leave "owned" as {}
  Example input:
    Me faltan
    MEX 🇲🇽: 4, 8, 12
    Repetidas
    FWC 🏆: 1, 2 / FWC 🌎: 7, 8
    ARG 🇦🇷: 3, 3, 5
  Example output: {"owned":{},"missing":{"MEX":[4,8,12]},"duplicates":{"FWC":[1,2,7,8],"ARG":[3,3,5]}}

MODE B — PARTIAL LIST (manual lists, WhatsApp, our app's ✅ TENGO format):
  The list contains a POSSESSION section. Only explicitly listed stickers are owned.
  Stickers under missing headers go into "missing", NOT "owned".
  → output stickers under possession headers in "owned", under duplicate headers in "duplicates", leave "missing" as {}
  If no section header is present at all, treat the entire list as owned (plain list).
  Example input:
    ✅ TENGO
    FWC1, AUT2
    🔁 REPETIDAS
    ARG3
  Example output: {"owned":{"FWC":[1],"AUT":[2]},"missing":{},"duplicates":{"ARG":[3]}}
  Example input (English):
    I have: AUT2, FWC1
    Swaps: ARG3
    I need: MEX4, NOR13
  Example output: {"owned":{"AUT":[2],"FWC":[1]},"missing":{"MEX":[4],"NOR":[13]},"duplicates":{"ARG":[3]}}

SECTION HEADER RECOGNITION — very important:
Sticker lists are often grouped under country/section labels. These labels may appear as:
  a) FIFA code (e.g. "MEX", "BRA", "FWC", "CC")
  b) FIFA code + emoji (e.g. "MEX 🇲🇽:", "BRA 🇧🇷:", "FWC 🏆:", "CC 🥤:")
  c) Country/section name in any language (e.g. "México:", "Brazil:", "Brasil:", "Especiales:", "Special stickers:", "Especiais:")
  d) Name + emoji (e.g. "México 🇲🇽:", "Brasil 🇧🇷:", "Especiales 🏆:")

When a section header is followed by numbers (without a code prefix), those numbers belong to that section:
  "México 🇲🇽: 1, 4, 9"  → MEX1, MEX4, MEX9
  "Brasil: 1, 2, 5, 8"    → BRA1, BRA2, BRA5, BRA8
  "CC 🥤: 1, 3, 7"        → CC1, CC3, CC7
  "Especiales: 3, 7, 12"  → FWC3, FWC7, FWC12

When sticker IDs already include the code prefix, use them directly:
  "México 🇲🇽: MEX1, MEX4" → MEX1, MEX4

Country name → FIFA code mapping (common names, any language):
  Argentina/Argentina → ARG
  Algeria/Argelia/Algérie → ALG
  Australia/Australia → AUS
  Austria/Austria → AUT
  Belgium/Bélgica/Belgique → BEL
  Bosnia/Bosnia-Herzegovina → BIH
  Brazil/Brasil/Brésil → BRA
  Canada/Canadá → CAN
  Ivory Coast/Costa de Marfil/Côte d'Ivoire → CIV
  Congo RD/Congo DR/RD Congo → COD
  Colombia/Colombia → COL
  Cape Verde/Cabo Verde → CPV
  Croatia/Croacia/Croatie → CRO
  Curaçao/Curazao → CUW
  Czech Republic/República Checa/Czechia → CZE
  Ecuador/Ecuador → ECU
  Egypt/Egipto/Égypte → EGY
  England/Inglaterra → ENG
  Spain/España/Espagne → ESP
  France/Francia → FRA
  Germany/Alemania/Deutschland → GER
  Ghana/Ghana → GHA
  Haiti/Haití → HAI
  Iran/Irán → IRN
  Iraq/Irak/Irak → IRQ
  Jordan/Jordania → JOR
  Japan/Japón/Japon → JPN
  South Korea/Corea del Sur/Corée du Sud → KOR
  Saudi Arabia/Arabia Saudita → KSA
  Morocco/Marruecos/Maroc → MAR
  Mexico/México/Mexique → MEX
  Netherlands/Países Bajos/Holland/Holanda → NED
  Norway/Noruega/Norvège → NOR
  New Zealand/Nueva Zelanda → NZL
  Panama/Panamá → PAN
  Paraguay/Paraguay → PAR
  Portugal/Portugal → POR
  Qatar/Catar/Katar → QAT
  South Africa/Sudáfrica/Afrique du Sud → RSA
  Scotland/Escocia/Écosse → SCO
  Senegal/Senegal → SEN
  Switzerland/Suiza/Suisse → SUI
  Sweden/Suecia/Suède → SWE
  Tunisia/Túnez/Tunisie → TUN
  Turkey/Turquía/Türkiye → TUR
  Uruguay/Uruguay → URU
  USA/United States/Estados Unidos → USA
  Uzbekistan/Uzbekistán → UZB
  Special/Specials/Especiales/Especiais/FWC/World Cup → FWC
  CC/Coca-Cola/Coca/CocaCola/Sponsors/Patrocinadores → CC

Additional rules:
- FWC 🏆, FWC 🌎, FWC 📜, FWC ⭐, etc. → ALL map to section "FWC"
- CC 🥤, CC ☕, "Coca Cola", "Coca", "CocaCola", etc. → ALL map to section "CC"
- Numbers may be 0-padded: "00" → 0, "04" → 4
- For duplicates: list each NUMBER once per EXTRA copy (ARG3 appears twice as extra → [3,3])
- Album/edition titles like "Usa Méx Can 26", "Figuritas App - Lista" → ignore
- Sticker IDs that include section prefix AND the section is already known → use the number only (e.g. under "MEX" section, "MEX3" → 3)

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
  { secrets: [clerkSecretKey, clerkSecretKeyDev, anthropicKey], timeoutSeconds: 60 },
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
      const payload = await verifyClerkToken(sessionToken);
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
  { secrets: [clerkSecretKey, clerkSecretKeyDev] },
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
      const payload = await verifyClerkToken(sessionToken);
      const clerkUserId = payload.sub;
      const firebaseToken = await admin.auth().createCustomToken(clerkUserId);
      res.json({ token: firebaseToken });
    } catch (error) {
      console.error("Token exchange error:", error.message);
      res.status(401).json({ error: "Invalid or expired token" });
    }
  }
);

/**
 * broadcastNotification
 *
 * Sends a push notification to all (or selected) users.
 * Only callers whose Clerk userId appears in Firestore's
 * `config/broadcast_admin → adminUserIds` array are allowed.
 *
 * Request body:
 *   {
 *     title:    string           (required)
 *     body:     string           (required)
 *     url?:     string           (optional — opens in browser on tap)
 *     userIds?: string[]         (optional — target specific users; omit for all)
 *   }
 *
 * Example curl:
 *   curl -X POST \
 *     -H "Authorization: Bearer <clerk_session_token>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"title":"Nueva versión","body":"Android ya disponible!","url":"https://elalbum2026.com"}' \
 *     https://us-central1-control-de-postales.cloudfunctions.net/broadcastNotification
 */
exports.broadcastNotification = onRequest(
  { secrets: [clerkSecretKey, clerkSecretKeyDev], timeoutSeconds: 120 },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // 1. Verify Clerk token
    const authHeader = req.headers.authorization || "";
    const sessionToken = authHeader.replace("Bearer ", "").trim();
    if (!sessionToken) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    let callerUserId;
    try {
      const payload = await verifyClerkToken(sessionToken);
      callerUserId = payload.sub;
    } catch (err) {
      console.error("Token verification failed:", err.message);
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // 2. Check admin permission
    const adminIds = await getAdminUserIds();
    if (!adminIds.includes(callerUserId)) {
      console.warn(`[broadcastNotification] Unauthorized attempt by ${callerUserId}`);
      res.status(403).json({ error: "Forbidden — not an admin" });
      return;
    }

    // 3. Parse and validate body
    const { title, body, url, userIds } = req.body || {};
    if (!title || !body || typeof title !== "string" || typeof body !== "string") {
      res.status(400).json({ error: "title and body are required strings" });
      return;
    }

    // 4. Collect push tokens
    let tokens = [];
    if (Array.isArray(userIds) && userIds.length > 0) {
      // Targeted broadcast — only specific users
      const profiles = await Promise.all(
        userIds.map((uid) =>
          admin.firestore().collection("users").doc(uid).get()
        )
      );
      tokens = profiles
        .filter((s) => s.exists)
        .map((s) => s.data().expoPushToken)
        .filter(Boolean);
    } else {
      // Full broadcast — all users with a push token
      const snap = await admin.firestore().collection("users").get();
      tokens = snap.docs
        .map((d) => d.data().expoPushToken)
        .filter(Boolean);
    }

    if (tokens.length === 0) {
      res.json({ sent: 0, message: "No push tokens found" });
      return;
    }

    // 5. Send in batches of 100 (Expo Push API limit)
    const notifData = { type: "broadcast", ...(url ? { url } : {}) };
    const batches = chunk(tokens, 100);
    let sent = 0;

    for (const batch of batches) {
      try {
        const messages = batch.map((token) => ({
          to: token,
          title,
          body,
          sound: "default",
          data: notifData,
        }));

        const expRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messages),
        });

        if (expRes.ok) {
          sent += batch.length;
        } else {
          console.error("[broadcastNotification] Expo error:", await expRes.text());
        }
      } catch (err) {
        console.error("[broadcastNotification] Batch error:", err.message);
      }
    }

    console.log(`[broadcastNotification] Sent to ${sent}/${tokens.length} tokens by ${callerUserId}`);
    res.json({ sent, total: tokens.length });
  }
);

/**
 * migrateUserData
 *
 * Called on first login with the Production build.
 * Looks up the user's external_id (= their old Clerk Dev ID) and copies
 * their Firestore data (collection, premium, friends) to their new prod ID.
 * Idempotent — safe to call on every login, returns early if already migrated.
 */
exports.migrateUserData = onRequest(
  { secrets: [clerkSecretKey, clerkSecretKeyDev] },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    // 1. Verify Clerk token → get prod user ID
    const authHeader = req.headers.authorization || "";
    const sessionToken = authHeader.replace("Bearer ", "").trim();
    if (!sessionToken) {
      res.status(401).json({ error: "Missing authorization header" });
      return;
    }

    let prodUserId;
    try {
      const payload = await verifyClerkToken(sessionToken);
      prodUserId = payload.sub;
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // 2. Get external_id (= dev Clerk user ID) from Clerk API
    let devUserId;
    try {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${prodUserId}`, {
        headers: { Authorization: `Bearer ${clerkSecretKey.value()}` },
      });
      if (!clerkRes.ok) throw new Error(`Clerk API ${clerkRes.status}`);
      const clerkUser = await clerkRes.json();
      devUserId = clerkUser.external_id;
    } catch (err) {
      console.error("[migrateUserData] Could not fetch Clerk user:", err.message);
      res.json({ migrated: false, reason: "clerk_api_error" });
      return;
    }

    if (!devUserId) {
      // New user with no dev account — nothing to migrate
      res.json({ migrated: false, reason: "no_external_id" });
      return;
    }

    // 3. Check if already migrated (prod collection already exists)
    const prodCollRef = admin.firestore()
      .doc(`users/${prodUserId}/collections/world-cup-2026`);
    const prodCollSnap = await prodCollRef.get();

    if (prodCollSnap.exists) {
      res.json({ migrated: false, reason: "already_migrated" });
      return;
    }

    // 4. Read dev collection data
    const devCollRef = admin.firestore()
      .doc(`users/${devUserId}/collections/world-cup-2026`);
    const devCollSnap = await devCollRef.get();

    if (!devCollSnap.exists) {
      res.json({ migrated: false, reason: "no_dev_collection" });
      return;
    }

    // 5. Copy collection
    await prodCollRef.set(devCollSnap.data());

    // 6. Copy premium profile
    const devPremRef = admin.firestore().doc(`users/${devUserId}/profile/premium`);
    const devPremSnap = await devPremRef.get();
    if (devPremSnap.exists) {
      await admin.firestore()
        .doc(`users/${prodUserId}/profile/premium`)
        .set(devPremSnap.data());
    }

    // 7. Copy social data (friends, pendingFrom) — IDs may be dev IDs but
    //    they still work while dual-key is active; will be cleaned up later
    const devUserSnap = await admin.firestore().doc(`users/${devUserId}`).get();
    if (devUserSnap.exists) {
      const d = devUserSnap.data();
      if (d.friends?.length || d.pendingFrom?.length) {
        await admin.firestore().doc(`users/${prodUserId}`).set(
          { friends: d.friends ?? [], pendingFrom: d.pendingFrom ?? [] },
          { merge: true }
        );
      }
    }

    console.log(`[migrateUserData] ✅ ${devUserId} → ${prodUserId}`);
    res.json({ migrated: true, devUserId, prodUserId });
  }
);
