const admin = require("firebase-admin");

// 1. Path to your service account key file
// Download this from Firebase Console > Project Settings > Service Accounts
const serviceAccount = require("./path/to/your/service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 2. Replace with your actual UID (found in Firebase Auth console)
const uid = "REPLACE_WITH_YOUR_USER_UID"; 

const claims = {
  role: "manager",
  organisationId: "dev-org-001", // This must match an ID in your organisations collection
  serviceIds: ["service-001"]
};

async function setClaims() {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`Success: Governance claims assigned to user ${uid}`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting claims:", error);
    process.exit(1);
  }
}

setClaims();