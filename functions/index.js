const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Callable (2nd gen): create Firebase Auth user + Firestore profile + custom claims.
 * v2 onCall ensures `request.auth` is populated when the client sends an ID token
 * (v1 onCall + Gen2 deploys can omit context.auth → 401 / unauthenticated).
 */
exports.createOrganisationUser = onCall(
  { region: "us-central1", invoker: "public" },
  async (request) => {
    try {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }

      const { name, displayName, email, password, role, organisationId, hospitalId, wardId, mdtRole } =
        request.data ?? {};

      if (!email || !password) {
        throw new HttpsError("invalid-argument", "Missing email or password");
      }
      if (!organisationId) {
        throw new HttpsError("invalid-argument", "organisationId is required");
      }

      const resolvedHospitalId = hospitalId != null ? String(hospitalId).trim() : "";
      if (!resolvedHospitalId) {
        throw new HttpsError("invalid-argument", "Hospital assignment is required");
      }

      const resolvedDisplayName =
        typeof displayName === "string" && displayName.trim()
          ? displayName.trim()
          : typeof name === "string" && name.trim()
            ? name.trim()
            : "";

      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: resolvedDisplayName,
      });

      const uid = userRecord.uid;

      await admin.auth().setCustomUserClaims(uid, {
        organisationId: String(organisationId),
        hospitalId: resolvedHospitalId,
        wardId: wardId != null ? String(wardId) : null,
        role: role != null ? String(role) : null,
        mdtRole: mdtRole != null ? String(mdtRole) : null,
      });

      await admin.firestore().collection("users").doc(uid).set({
        uid,
        name: resolvedDisplayName,
        displayName: resolvedDisplayName,
        email,
        role: role != null ? String(role) : "Staff",
        orgId: String(organisationId),
        organisationId: String(organisationId),
        hospitalId: resolvedHospitalId,
        wardId: wardId != null ? String(wardId) : null,
        mdtRole: mdtRole != null ? String(mdtRole) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        uid,
      };
    } catch (error) {
      console.error("❌ createOrganisationUser error:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      const code = error?.code;
      if (code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "That email is already registered.");
      }
      if (code === "auth/invalid-email") {
        throw new HttpsError("invalid-argument", "Invalid email address.");
      }
      if (code === "auth/weak-password") {
        throw new HttpsError("invalid-argument", "Password is too weak.");
      }

      throw new HttpsError("internal", error?.message ?? "Failed to create user");
    }
  }
);
