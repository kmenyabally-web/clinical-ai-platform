import { collection, type Firestore } from "firebase/firestore";

import { db } from "../firebase";

/**
 * Canonical tenant-scoped collection helper.
 *
 * Usage:
 *   scopedCollection(organisationId, ["patients"])
 *   scopedCollection(organisationId, ["notes"])
 */
export const scopedCollection = (organisationId: string, path: string[]) => {
  return collection(db, "organisations", organisationId, ...path);
};

/**
 * Ergonomic overload for callsites that already have a tuple.
 */
export const scopedCollectionAt = (organisationId: string) => (path: string[]) => {
  return scopedCollection(organisationId, path);
};

