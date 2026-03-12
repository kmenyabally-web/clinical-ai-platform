/**
 * CQC document categories aligned with inspection domains.
 * Used for document upload domainType and dashboard counts.
 */
export const CQC_DOCUMENT_DOMAINS = [
  { value: "governance", label: "Governance" },
  { value: "safeguarding", label: "Safeguarding" },
  { value: "mental-capacity", label: "Mental Capacity" },
  { value: "staffing", label: "Staffing & Training" },
  { value: "care-planning", label: "Care Planning" },
];

export const DOCUMENT_TYPES = [
  { value: "policy", label: "Policy" },
  { value: "evidence", label: "Evidence" },
];

/** Domain key to stats field name (document_stats). */
export const DOMAIN_TO_STATS_FIELD = {
  governance: "governance",
  safeguarding: "safeguarding",
  "mental-capacity": "mentalCapacity",
  staffing: "staffing",
  "care-planning": "carePlanning",
};
