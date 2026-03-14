// scripts/seedOrg.js
/**
 * Dev-only script to ensure a placeholder organisation document exists.
 *
 * It creates/overwrites organisations/dev-org-001 with a simple name
 * and displaySettings if it does not already exist.
 *
 * Usage:
 *   1. Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON.
 *   2. Run:
 *        node scripts/seedOrg.js
 */

const admin = require("firebase-admin");

async function main() {
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

  const db = admin.firestore();
  const orgRef = db.collection("organisations").doc("dev-org-001");

  try {
    const snap = await orgRef.get();
    if (snap.exists) {
      console.log("Organisation dev-org-001 already exists.");
    } else {
      await orgRef.set({
        organisationId: "dev-org-001",
        name: "Dev Organisation",
        displaySettings: {
          theme: "default",
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("Seeded organisation dev-org-001.");
    }
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed organisation:", err.message || err);
    process.exit(1);
  }
}

main();

