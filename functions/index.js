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
 * their Firestore data (collection, premium, friends, requests) to their new prod ID.
 *
 * Handles Apple Sign-In users whose private relay email changes per app:
 * falls back to name-based matching against dev Clerk when external_id is absent.
 *
 * Idempotent — safe to call on every login:
 *   - Premium is always synced (one-way: dev premium → prod premium, never downgrades)
 *   - Collection + friends + requests are only copied once (guarded by collection existence)
 */
exports.migrateUserData = onRequest(
  { secrets: [clerkSecretKey, clerkSecretKeyDev], timeoutSeconds: 120 },
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

    const db = admin.firestore();

    // ── Helper: sync premium one-way (dev premium → prod premium, never downgrades) ──
    async function syncPremium(devId, prodId) {
      try {
        const devPremSnap = await db.doc(`users/${devId}/profile/premium`).get();
        if (!devPremSnap.exists) return;
        if (!devPremSnap.data().isPremium) return; // dev not premium → don't touch prod
        await db.doc(`users/${prodId}/profile/premium`)
          .set({ isPremium: true }, { merge: true });
        console.log(`[migrateUserData] ✅ premium synced ${devId} → ${prodId}`);
      } catch (err) {
        console.error("[migrateUserData] premium sync error:", err.message);
      }
    }

    // ── Helper: resolve a dev friend ID → prod ID via Clerk external_id lookup ──
    async function resolveProdId(devFriendId) {
      try {
        const r = await fetch(
          `https://api.clerk.com/v1/users?external_id=${encodeURIComponent(devFriendId)}&limit=1`,
          { headers: { Authorization: `Bearer ${clerkSecretKey.value()}` } }
        );
        if (!r.ok) return devFriendId;
        const users = await r.json();
        return Array.isArray(users) && users.length > 0 ? users[0].id : devFriendId;
      } catch {
        return devFriendId;
      }
    }

    // ── Helper: migrate requests — swap devId for prodId in fromUserId / toUserId ──
    async function migrateRequests(devId, prodId) {
      try {
        const [fromSnap, toSnap] = await Promise.all([
          db.collection("requests").where("fromUserId", "==", devId).get(),
          db.collection("requests").where("toUserId",   "==", devId).get(),
        ]);
        if (fromSnap.empty && toSnap.empty) return 0;
        const batch = db.batch();
        fromSnap.docs.forEach(doc => batch.update(doc.ref, { fromUserId: prodId }));
        toSnap.docs.forEach(doc =>   batch.update(doc.ref, { toUserId:   prodId }));
        await batch.commit();
        const count = fromSnap.size + toSnap.size;
        console.log(`[migrateUserData] requests patched: ${count}`);
        return count;
      } catch (err) {
        console.error("[migrateUserData] requests migration error:", err.message);
        return 0;
      }
    }

    // 2. Get dev user ID from Clerk prod API (external_id field)
    let devUserId;
    let prodUserName;
    try {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${prodUserId}`, {
        headers: { Authorization: `Bearer ${clerkSecretKey.value()}` },
      });
      if (!clerkRes.ok) throw new Error(`Clerk API ${clerkRes.status}`);
      const clerkUser = await clerkRes.json();
      devUserId = clerkUser.external_id || null;
      prodUserName = [clerkUser.first_name, clerkUser.last_name]
        .filter(Boolean).join(" ").trim();
    } catch (err) {
      console.error("[migrateUserData] Could not fetch Clerk user:", err.message);
      res.json({ migrated: false, reason: "clerk_api_error" });
      return;
    }

    // 2b. Apple Sign-In fallback: no external_id → match by full name in dev Clerk.
    //     Apple generates a different private relay email per app, so email-based
    //     linking is impossible. Name matching is the only viable heuristic.
    //     We only proceed if there is exactly ONE match (avoids false positives).
    if (!devUserId && prodUserName) {
      try {
        const devRes = await fetch(
          `https://api.clerk.com/v1/users?query=${encodeURIComponent(prodUserName)}&limit=10`,
          { headers: { Authorization: `Bearer ${clerkSecretKeyDev.value()}` } }
        );
        if (devRes.ok) {
          const devUsers = await devRes.json();
          if (Array.isArray(devUsers)) {
            const exactMatches = devUsers.filter(u => {
              const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
              return name.toLowerCase() === prodUserName.toLowerCase();
            });
            if (exactMatches.length === 1) {
              devUserId = exactMatches[0].id;
              console.log(
                `[migrateUserData] Apple fallback matched "${prodUserName}" → ${devUserId}`
              );
            } else if (exactMatches.length > 1) {
              console.warn(
                `[migrateUserData] Apple fallback: ambiguous name "${prodUserName}" ` +
                `(${exactMatches.length} matches) — skipping`
              );
            }
          }
        }
      } catch (err) {
        console.error("[migrateUserData] Apple fallback error:", err.message);
      }
    }

    if (!devUserId) {
      res.json({ migrated: false, reason: "no_dev_account" });
      return;
    }

    // 3. Always sync premium (one-way), even if already migrated.
    //    This covers: users who bought premium on dev after their first prod login.
    await syncPremium(devUserId, prodUserId);

    // 4. Check if collection already migrated
    const prodCollRef = db.doc(`users/${prodUserId}/collections/world-cup-2026`);
    const prodCollSnap = await prodCollRef.get();

    if (prodCollSnap.exists) {
      // Premium was already synced above — nothing else to do.
      res.json({ migrated: false, reason: "already_migrated" });
      return;
    }

    // 5. Read dev collection
    const devCollSnap = await db
      .doc(`users/${devUserId}/collections/world-cup-2026`).get();

    if (!devCollSnap.exists) {
      res.json({ migrated: false, reason: "no_dev_collection" });
      return;
    }

    // 6. Copy collection
    await prodCollRef.set(devCollSnap.data());

    // 7. Resolve and copy friends / pendingFrom (dev IDs → prod IDs).
    //    Also patches already-migrated friends' lists bidirectionally.
    const devUserSnap = await db.doc(`users/${devUserId}`).get();
    if (devUserSnap.exists) {
      const d = devUserSnap.data();
      const devFriends     = Array.isArray(d.friends)     ? d.friends     : [];
      const devPendingFrom = Array.isArray(d.pendingFrom) ? d.pendingFrom : [];

      const [resolvedFriends, resolvedPending] = await Promise.all([
        Promise.all(devFriends.map(resolveProdId)),
        Promise.all(devPendingFrom.map(resolveProdId)),
      ]);

      if (resolvedFriends.length || resolvedPending.length) {
        await db.doc(`users/${prodUserId}`).set(
          { friends: resolvedFriends, pendingFrom: resolvedPending },
          { merge: true }
        );
      }

      // Patch each already-migrated friend: replace devUserId with prodUserId
      const patchPromises = resolvedFriends
        .filter(friendId => friendId !== devUserId)
        .map(friendProdId => {
          const ref = db.doc(`users/${friendProdId}`);
          return ref.update({ friends: admin.firestore.FieldValue.arrayRemove(devUserId) })
            .then(() => ref.update({ friends: admin.firestore.FieldValue.arrayUnion(prodUserId) }))
            .catch(() => {});
        });
      await Promise.all(patchPromises);

      console.log(
        `[migrateUserData] friends resolved: ${devFriends.length} → ` +
        `${resolvedFriends.filter((id, i) => id !== devFriends[i]).length} updated`
      );
    }

    // 8. Migrate requests: swap devUserId for prodUserId in all related requests
    await migrateRequests(devUserId, prodUserId);

    console.log(`[migrateUserData] ✅ ${devUserId} → ${prodUserId}`);
    res.json({ migrated: true, devUserId, prodUserId });
  }
);

// ── Recovery Report ───────────────────────────────────────────────────
// Reporte HTML de recuperación de usuarios bloqueados durante la migración.
// Solo accesible con ?key=... para evitar exposición pública.
const REPORT_KEY = defineSecret("REPORT_ACCESS_KEY");

const AFFECTED_EMAILS = [
  "mathimora2606@gmail.com",
  "susuhais33@gmail.com",
  "francougarte123@gmail.com",
  "oscarglb07@gmail.com",
  "dereck-31@hotmail.com",
  "kenethj2303@gmail.com",
  "keivinmoralesr28@gmail.com",
  "keivinmorales22@gmail.com",
  "joseandres9788@hotmail.com",
  "saullaguna83@gmail.com",
  "andrext100@gmail.com",
  "imendietag@hotmail.com",
  "isaacbreness2017@gmail.com",
  "jason240693@gmail.com",
  "myt79404@gmail.com",
  "saspaae130@gmail.com",
  "darencarmonabarquero@gmail.com",
  "tosu2kcontacto@gmail.com",
  "sebastiancarazo23@gmail.com",
  "i.brenes.1@estudiantec.cr",
  "kramirezarmijos@outlook.com",
  "karolramirezlp@gmail.com",
  "ibrenes119240115@gmail.com",
];

const APPLE_NAME_MAP = {
  "daren carmona barquero": "darencarmonabarquero@gmail.com",
};

async function fetchAllClerkUsers(secretKey) {
  const users = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `https://api.clerk.com/v1/users?limit=100&offset=${offset}&order_by=-created_at`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    );
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    users.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }
  return users;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString("es-CR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

exports.recoveryReport = onRequest(
  { secrets: [clerkSecretKey, REPORT_KEY] },
  async (req, res) => {
    // Simple access key check
    const key = req.query.key ?? "";
    if (!key || key !== REPORT_KEY.value()) {
      res.status(401).send("Unauthorized");
      return;
    }

    const prodUsers = await fetchAllClerkUsers(clerkSecretKey.value());
    const newUsers = prodUsers.filter((u) => !u.external_id);
    const migratedUsers = prodUsers.filter((u) => !!u.external_id);

    const prodByEmail = {};
    const prodByName = {};
    for (const u of prodUsers) {
      const email = u.email_addresses?.[0]?.email_address ?? "";
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ").toLowerCase();
      prodByEmail[email.toLowerCase()] = u;
      if (name) prodByName[name] = u;
    }

    const affectedStatus = AFFECTED_EMAILS.map((email) => {
      let user = prodByEmail[email.toLowerCase()];
      let method = null;
      if (user) {
        method = user.external_identifications?.length ? "OAuth" : "Email";
      } else {
        const nameKey = Object.keys(APPLE_NAME_MAP).find(
          (n) => APPLE_NAME_MAP[n] === email
        );
        if (nameKey && prodByName[nameKey]) {
          user = prodByName[nameKey];
          method = "Apple";
        }
      }
      return {
        email,
        recovered: !!user,
        method,
        name: user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : null,
        registeredAt: user ? fmtDate(user.created_at) : null,
      };
    });

    const recovered = affectedStatus.filter((u) => u.recovered).length;
    const pending = affectedStatus.length - recovered;

    const affectedRows = affectedStatus.map((u) => `
      <tr class="${u.recovered ? "ok" : "pend"}">
        <td>${u.email}</td>
        <td>${u.name ?? "—"}</td>
        <td>${u.recovered ? "✅ Recuperado" : "⏳ Pendiente"}</td>
        <td>${u.method ?? "—"}</td>
        <td>${u.registeredAt ?? "—"}</td>
      </tr>`).join("");

    const newUserRows = newUsers.map((u) => {
      const email = u.email_addresses?.[0]?.email_address ?? "—";
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
      return `<tr><td>${email}</td><td>${name}</td><td>${fmtDate(u.created_at)}</td></tr>`;
    }).join("");

    // ── Migración Dev → Prod: verificar colecciones ───────────────────
    const db = admin.firestore();
    const migrationStatus = await Promise.all(
      migratedUsers.map(async (u) => {
        const devId = u.external_id;
        const prodId = u.id;
        const email = u.email_addresses?.[0]?.email_address ?? "—";
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";

        const [devSnap, prodSnap] = await Promise.all([
          db.doc(`users/${devId}/collections/world-cup-2026`).get(),
          db.doc(`users/${prodId}/collections/world-cup-2026`).get(),
        ]);

        const devOwned = devSnap.exists ? (devSnap.data().owned?.length ?? 0) : null;
        const prodOwned = prodSnap.exists ? (prodSnap.data().owned?.length ?? 0) : null;

        let status;
        if (!devSnap.exists && !prodSnap.exists) status = "empty"; // usuario sin datos en ningún lado
        else if (!prodSnap.exists) status = "pending";             // no ha hecho login con nuevo build
        else if (devOwned !== null && prodOwned >= devOwned) status = "ok"; // colección transferida
        else status = "partial";                                    // transferida pero con menos postales

        return { email, name, devId, prodId, devOwned, prodOwned, status };
      })
    );

    const migOk = migrationStatus.filter((u) => u.status === "ok").length;
    const migPending = migrationStatus.filter((u) => u.status === "pending").length;
    const migPartial = migrationStatus.filter((u) => u.status === "partial").length;
    const migEmpty = migrationStatus.filter((u) => u.status === "empty").length;

    const migrationRows = migrationStatus
      .sort((a, b) => {
        const order = { partial: 0, pending: 1, ok: 2, empty: 3 };
        return order[a.status] - order[b.status];
      })
      .map((u) => {
        const statusLabel = {
          ok: "✅ Transferida",
          pending: "⏳ Sin login",
          partial: "⚠️ Incompleta",
          empty: "📭 Sin datos",
        }[u.status];
        const cls = u.status === "ok" ? "ok" : u.status === "empty" ? "pend" : "";
        const devCount = u.devOwned !== null ? u.devOwned : "—";
        const prodCount = u.prodOwned !== null ? u.prodOwned : "—";
        return `<tr class="${cls}">
          <td>${u.email}</td>
          <td>${u.name}</td>
          <td>${statusLabel}</td>
          <td style="text-align:center">${devCount}</td>
          <td style="text-align:center">${prodCount}</td>
        </tr>`;
      }).join("");

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>El Álbum 2026 — Reporte</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0B0B0E;color:#F5F4EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 24px}
    h1{font-size:24px;margin-bottom:4px}
    .sub{color:rgba(245,244,238,.5);font-size:14px;margin-bottom:32px}
    .cards{display:flex;gap:16px;margin-bottom:40px;flex-wrap:wrap}
    .card{background:#15161B;border-radius:14px;padding:20px 24px;min-width:140px}
    .card .n{font-size:36px;font-weight:800}
    .card .l{color:rgba(245,244,238,.5);font-size:13px;margin-top:4px}
    .yellow .n{color:#F4C430}.green .n{color:#4CAF50}.red .n{color:#FF5252}
    h2{font-size:18px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;background:#15161B;border-radius:14px;overflow:hidden;margin-bottom:40px}
    th{background:#1C1D24;padding:12px 16px;text-align:left;font-size:12px;color:rgba(245,244,238,.5);font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    td{padding:12px 16px;font-size:14px;border-top:1px solid rgba(245,244,238,.06)}
    tr.pend td{color:rgba(245,244,238,.4)}
    a.refresh{display:inline-block;margin-bottom:32px;background:#F4C430;color:#0B0B0E;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px}
  </style>
</head>
<body>
  <h1>🎴 El Álbum 2026 — Reporte de recuperación</h1>
  <p class="sub">Generado el ${new Date().toLocaleString("es-CR")}</p>
  <a class="refresh" href="?key=${req.query.key}">🔄 Actualizar</a>
  <div class="cards">
    <div class="card yellow"><div class="n">${prodUsers.length}</div><div class="l">Total en Producción</div></div>
    <div class="card"><div class="n">${migratedUsers.length}</div><div class="l">Migrados de Dev</div></div>
    <div class="card"><div class="n">${newUsers.length}</div><div class="l">Usuarios nuevos</div></div>
    <div class="card green"><div class="n">${recovered}</div><div class="l">Afectados recuperados</div></div>
    <div class="card red"><div class="n">${pending}</div><div class="l">Afectados pendientes</div></div>
    <div class="card green"><div class="n">${migOk}</div><div class="l">Colecciones migradas</div></div>
    <div class="card red"><div class="n">${migPending}</div><div class="l">Sin login nuevo build</div></div>
    ${migPartial > 0 ? `<div class="card red"><div class="n">${migPartial}</div><div class="l">Migración incompleta</div></div>` : ""}
  </div>
  <h2>Estado de usuarios afectados (${recovered}/${AFFECTED_EMAILS.length})</h2>
  <table>
    <thead><tr><th>Email</th><th>Nombre</th><th>Estado</th><th>Método</th><th>Registrado</th></tr></thead>
    <tbody>${affectedRows}</tbody>
  </table>
  <h2>Usuarios nuevos reales (${newUsers.length})</h2>
  <table>
    <thead><tr><th>Email</th><th>Nombre</th><th>Registrado</th></tr></thead>
    <tbody>${newUserRows}</tbody>
  </table>
  <h2>Migración Dev → Prod: colecciones (${migOk}/${migratedUsers.length} transferidas)</h2>
  <table>
    <thead><tr><th>Email</th><th>Nombre</th><th>Estado</th><th style="text-align:center">Dev 🃏</th><th style="text-align:center">Prod 🃏</th></tr></thead>
    <tbody>${migrationRows}</tbody>
  </table>
</body>
</html>`;

    res.set("Content-Type", "text/html");
    res.send(html);
  }
);
