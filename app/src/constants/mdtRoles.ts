/**
 * Standardised MDT / clinical role list for notes and reporting.
 * Free-text discipline is not allowed except via "Other" + custom entry.
 */

export const MDT_OTHER = "Other";

export const MDT_ROLES = [
  "Support Worker",
  "Healthcare Assistant",
  "Nurse",
  "Senior Nurse",
  "Psychologist",
  "Assistant Psychologist",
  "Occupational Therapist",
  "Occupational Therapy Assistant",
  "Psychiatrist (Consultant)",
  "Specialty Doctor",
  "Speech and Language Therapist",
  "Speech and Language Therapy Assistant",
  "Activity Coordinator",
  "Clinical Lead",
  "Responsible Clinician",
  "Head of Care",
  "Ward Manager",
  "Deputy Ward Manager",
  "Hospital Manager",
  "Physiotherapist",
  "Dietitian",
  "Social Worker",
  MDT_OTHER,
] as const;

export type MdtRole = (typeof MDT_ROLES)[number];
