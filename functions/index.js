const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { verifyToken } = require("@clerk/backend");

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

const clerkSecretKey = defineSecret("CLERK_SECRET_KEY");

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
