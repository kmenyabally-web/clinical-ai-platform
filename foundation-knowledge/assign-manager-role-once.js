/**
 * One-time Firebase Admin script:
 * Assign custom claim { role: "manager" } to an existing user.
 *
 * Target user email: kmenyabally@gmail.com
 *
 * Requirements:
 * - GOOGLE_APPLICATION_CREDENTIALS must point to a valid service account JSON.
 * - Firebase project already exists and matches the service account.
 *
 * Run once only.
 */

const admin = require('firebase-admin');

// 1. Ensure service account credentials are available via environment variable
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error('Error: GOOGLE_APPLICATION_CREDENTIALS is not set.');
  console.error('Set it to the full path of your Firebase service account JSON file.');
  process.exit(1);
}

// 2. Initialise Firebase Admin SDK safely using the service account
try {
  admin.initializeApp({
    credential: admin.credential.cert(credentialsPath),
  });
} catch (err) {
  console.error('Error initialising Firebase Admin SDK:', err.message);
  process.exit(1);
}

// 3. Define the target user email and the custom claim to assign
const targetEmail = 'kmenyabally@gmail.com';
const customClaims = { role: 'manager' }; // Only this claim will be set

// 4. Look up the user by email, set the custom claim, and exit
(async () => {
  try {
    // Find the existing Firebase Authentication user by email
    const userRecord = await admin.auth().getUserByEmail(targetEmail);

    // Set the custom claims for this user (replaces any existing custom claims)
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);

    // Log clear success information
    console.log('Success: custom claim assigned.');
    console.log('  User email:', targetEmail);
    console.log('  User UID  :', userRecord.uid);
    console.log('  Claims set:', customClaims);

    // Exit immediately after successful completion
    process.exit(0);
  } catch (err) {
    console.error('Error assigning custom claim:', err.message);
    process.exit(1);
  }
})();