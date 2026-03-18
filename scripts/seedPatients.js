// scripts/seedPatients.js
/**
 * Dev-only script to seed 3 test patients for Stage 3.
 *
 * Creates 3 documents in collection: patients
 * All are scoped to organisationId: "dev-org-001"
 *
 * Fields:
 * - firstName
 * - lastName
 * - dob
 * - organisationId
 *
 * Trap field:
 * - secretNotes (one patient only): "This should not be visible in Stage 3"
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
  const patients = [
    {
      firstName: "Amina",
      lastName: "Diallo",
      dob: "1991-04-12",
      organisationId: "dev-org-001",
    },
    {
      firstName: "James",
      lastName: "Harris",
      dob: "1984-11-03",
      organisationId: "dev-org-001",
      secretNotes: "This should not be visible in Stage 3",
    },
    {
      firstName: "Sophie",
      lastName: "Patel",
      dob: "2000-08-27",
      organisationId: "dev-org-001",
    },
  ];

  try {
    const batch = db.batch();
    patients.forEach((p) => {
      const ref = db.collection("patients").doc();
      batch.set(ref, p, { merge: false });
    });
    await batch.commit();
    console.log("✅ 3 Patients seeded for dev-org-001");
    process.exit(0);
  } catch (err) {
    console.error("Failed to seed patients:", err.message || err);
    process.exit(1);
  }
}

main();

