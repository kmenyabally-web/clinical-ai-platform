/**
 * Hospital hierarchy (Firestore: `hospitals/`, `wards/`).
 * Organisation record also lives in `organisations/` — see {@link ./organisation.ts} for plan typing.
 */
export type Organisation = {
  id: string;
  name: string;
  type: "hospital" | "care_home" | "nursing_home" | "supported_living";
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
  type: "acute" | "picu" | "rehab" | "low_secure" | "medium_secure";
};
