/**
 * Canonical tenant-scoped Firestore paths: organisations/{organisationId}/{collection}.
 * Reads merge nested + root collections where legacy data still lives at top level.
 */

import { collection, doc } from "firebase/firestore";

const ORGS = "organisations";

/**
 * @param {unknown} orgId
 * @returns {string}
 */
export function requireOrganisationId(orgId) {
  const o = orgId != null ? String(orgId).trim() : "";
  if (!o) throw new Error("organisationId required");
  return o;
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} organisationId
 */
export function orgPatientsCollection(db, organisationId) {
  return collection(db, ORGS, requireOrganisationId(organisationId), "patients");
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} organisationId
 */
export function orgNotesCollection(db, organisationId) {
  return collection(db, ORGS, requireOrganisationId(organisationId), "notes");
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} organisationId
 */
export function orgIncidentsCollection(db, organisationId) {
  return collection(db, ORGS, requireOrganisationId(organisationId), "incidents");
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} organisationId
 * @param {string} patientId
 */
export function orgPatientDocumentRef(db, organisationId, patientId) {
  return doc(db, ORGS, requireOrganisationId(organisationId), "patients", String(patientId).trim());
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} organisationId
 * @param {string} noteId
 */
export function orgNoteDocumentRef(db, organisationId, noteId) {
  return doc(db, ORGS, requireOrganisationId(organisationId), "notes", String(noteId).trim());
}

/**
 * @param {import("firebase/firestore").Firestore} db
 * @param {string} organisationId
 * @param {string} incidentId
 */
export function orgIncidentDocumentRef(db, organisationId, incidentId) {
  return doc(db, ORGS, requireOrganisationId(organisationId), "incidents", String(incidentId).trim());
}
