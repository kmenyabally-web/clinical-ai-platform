export const REPORT_TYPES = [
  "CPA",
  "Tribunal",
  "Management_Hearing",
  "MDT",
  "Summary",
] as const;

export type ReportTypeKey = (typeof REPORT_TYPES)[number];

export const ORGANISATION_TYPES = ["hospital", "care_home", "supported_living"] as const;

export type OrganisationType = (typeof ORGANISATION_TYPES)[number];
