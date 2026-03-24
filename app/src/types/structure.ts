/**
 * Hospital hierarchy (Firestore: `hospitals/`, `wards/`).
 * Organisation record also lives in `organisations/` — see {@link ./organisation.ts} for plan typing.
 */
export type Organisation = {
  id: string;
  name: string;
  plan: string;
};

export type Hospital = {
  id: string;
  name: string;
  organisationId: string;
};

export type Ward = {
  id: string;
  name: string;
  hospitalId: string;
  organisationId: string;
};
