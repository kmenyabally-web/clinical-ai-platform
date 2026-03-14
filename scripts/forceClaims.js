// scripts/forceClaims.js
/**
 * Dev-only script to force-set custom claims on a Firebase user.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
 *      (NEVER commit this file to git).
 *
 *   2. Edit the UID below or pass it via env/CLI if you prefer.
 *
 *   3. Run:
 *        node scripts/forceClaims.js
 *
 * This is intentionally simple so you can verify claims independently
 * of the UI.
 */

const admin = require("firebase-admin");

async function main() {
  const uid = process.env.FIREBASE_TARGET_UID || "<REPLACE_WITH_UID>";

  if (!uid || uid === "<REPLACE_WITH_UID>") {
    console.error("Set FIREBASE_TARGET_UID or replace <REPLACE_WITH_UID> in forceClaims.js");
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error(
      "Error: GOOGLE_APPLICATION_CREDENTIALS is not set. Point it to your service account JSON."
    );
    process.exit(1);
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (err) {
    console.error("Failed to initialize Firebase Admin SDK:", err.message);
    process.exit(1);
  }

  const auth = admin.auth();
  const claims = {
    role: "manager",
    organisationId: "dev-org-001",
    serviceIds: ["service-001"],
  };

  try {
    await auth.setCustomUserClaims(uid, claims);
    console.log("✅ Claims assigned. Sign out and back in to see the change.");
    console.log("UID:", uid);
    console.log("Claims:", claims);
    process.exit(0);
  } catch (err) {
    console.error("Failed to assign custom claims:", err.message || err);
    process.exit(1);
  }
}

main();

