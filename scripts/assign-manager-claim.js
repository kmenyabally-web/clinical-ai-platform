/**
 * One-time Firebase Admin script: assign custom claim role = "manager"
 * to an existing Firebase Authentication user identified by email.
 *
 * For use with the digital CQC readiness system. Run once only.
 * No Firestore access. No application connection. No other claims modified.
 *
 * Usage:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to the path to your service account JSON.
 *   node scripts/assign-manager-claim.js <user-email>
 *
 * Example:
 *   set GOOGLE_APPLICATION_CREDENTIALS=path\to\serviceAccountKey.json
 *   node scripts/assign-manager-claim.js manager@example.org
 */

const admin = require('firebase-admin');

// ---------------------------------------------------------------------------
// 1. Validate input: email must be provided as the only required argument
// ---------------------------------------------------------------------------
const email = process.argv[2];
if (!email || process.argv.length > 3) {
  console.error('Usage: node assign-manager-claim.js <user-email>');
  console.error('Example: node assign-manager-claim.js manager@example.org');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Resolve service account credentials (required for secure authentication)
// ---------------------------------------------------------------------------
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set.');
  console.error('Set it to the full path of your Firebase service account JSON file.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Initialize Firebase Admin SDK with the service account
// ---------------------------------------------------------------------------
let app;
try {
  app = admin.initializeApp({
    credential: admin.credential.cert(credentialsPath),
  });
} catch (err) {
  console.error('Error initializing Firebase Admin:', err.message);
  process.exit(1);
}

const auth = admin.auth(app);

// ---------------------------------------------------------------------------
// 4. Look up the user by email (no data modified yet)
// ---------------------------------------------------------------------------
async function run() {
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    console.error('Error looking up user by email:', err.message);
    process.exit(1);
  }

  const uid = userRecord.uid;

  // -------------------------------------------------------------------------
  // 5. Set custom claim: role = "manager" only (no other claims added)
  //    Note: setCustomUserClaims replaces all custom claims for this user.
  //    Only the role claim is set here.
  // -------------------------------------------------------------------------
  try {
    await auth.setCustomUserClaims(uid, { role: 'manager' });
  } catch (err) {
    console.error('Error setting custom claims:', err.message);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 6. Log clear success and exit
  // -------------------------------------------------------------------------
  console.log('Success: custom claim assigned.');
  console.log('  User (email):', email);
  console.log('  User (uid):', uid);
  console.log('  Claim set: role = "manager"');
  console.log('  No other claims were added or changed.');
  process.exit(0);
}

run();
