/**
 * One-time migration: backfill tenant fields (organisationId, hospitalId, wardId)
 * from `patients/{patientId}` into existing `notes/{noteId}` documents.
 *
 * Usage:
 *   1) Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path
 *   2) (Optional) DRY_RUN=true node scripts/backfillNotes.js
 *
 * Notes:
 * - This script only backfills the `notes` collection by default.
 * - It updates only when source patient fields are present and differ.
 */

const admin = require("firebase-admin");

const NOTES_COLLECTION = process.env.NOTES_COLLECTION || "notes";
const PATIENTS_COLLECTION = process.env.PATIENTS_COLLECTION || "patients";
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";
const PAGE_SIZE = Number(process.env.PAGE_SIZE || 250); // keep small to reduce memory/reads

async function initAdmin() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not set. Point it to your service account JSON."
    );
  }
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function main() {
  await initAdmin();
  const db = admin.firestore();

  const notesCol = db.collection(NOTES_COLLECTION);
  const patientsCol = db.collection(PATIENTS_COLLECTION);

  const patientCache = new Map(); // patientId -> {organisationId, hospitalId, wardId}

  let lastDoc = null;
  let page = 0;
  let processed = 0;
  let updated = 0;
  let wouldUpdate = 0;
  let skipped = 0;

  while (true) {
    page += 1;
    let q = notesCol.limit(PAGE_SIZE);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchOps = 0;
    const commitBatch = async () => {
      if (batchOps === 0) return;
      if (DRY_RUN) {
        batchOps = 0;
        return;
      }
      await batch.commit();
      batchOps = 0;
    };

    for (const noteDoc of snap.docs) {
      processed += 1;
      const note = noteDoc.data() || {};
      const patientId = (note.patientId ?? "").toString().trim();
      if (!patientId) {
        skipped += 1;
        continue;
      }

      let patient = patientCache.get(patientId);
      if (!patient) {
        const pSnap = await patientsCol.doc(patientId).get();
        if (!pSnap.exists) {
          skipped += 1;
          continue;
        }
        const p = pSnap.data() || {};
        patient = {
          organisationId: p.organisationId ?? p.organisationID ?? null,
          hospitalId: p.hospitalId ?? null,
          wardId: p.wardId ?? null,
        };
        patientCache.set(patientId, patient);
      }

      const update = {};
      const nextOrganisationId =
        patient.organisationId != null ? String(patient.organisationId) : null;
      const nextHospitalId =
        patient.hospitalId != null ? String(patient.hospitalId) : null;
      const nextWardId = patient.wardId != null ? String(patient.wardId) : null;

      // Copy required fields into note (as requested).
      // Only schedule an update when we actually need it.
      if (note.organisationId !== nextOrganisationId) update.organisationId = nextOrganisationId;
      if (note.hospitalId !== nextHospitalId) update.hospitalId = nextHospitalId;
      if (note.wardId !== nextWardId) update.wardId = nextWardId;

      if (Object.keys(update).length === 0) {
        skipped += 1;
        continue;
      }

      // Avoid writing obviously incomplete tenant data.
      if (!nextHospitalId || !nextOrganisationId) {
        skipped += 1;
        continue;
      }

      if (!DRY_RUN) {
        batch.set(noteDoc.ref, update, { merge: true });
        batchOps += 1;
        if (batchOps >= 450) {
          await commitBatch();
        }
      }

      if (DRY_RUN) wouldUpdate += 1;
      else updated += 1;
    }

    if (!DRY_RUN) {
      await commitBatch();
    }

    lastDoc = snap.docs[snap.docs.length - 1];

    console.log(
      `[page ${page}] processed=${processed} updated=${updated} wouldUpdate=${wouldUpdate} skipped=${skipped}`
    );
  }

  console.log(
    `Done. NOTES_COLLECTION=${NOTES_COLLECTION} DRY_RUN=${DRY_RUN} processed=${processed} updated=${updated} wouldUpdate=${wouldUpdate} skipped=${skipped}`
  );
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});

