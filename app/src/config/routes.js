/**
 * Route–role mapping. Single source of truth for ProtectedRoute and Sidebar.
 * Sidebar uses label, ariaLabel (optional), path, and allowedRoles.
 */

/** Roles that can access readiness sections (Governance, Safeguarding, etc.). Viewer sees Overview only. */
export const READINESS_SECTION_ROLES = ["Manager", "QualityLead"];

/** @type {{ path: string, label: string, ariaLabel?: string, allowedRoles?: string[], platformAdminOnly?: boolean }[]} */
export const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", ariaLabel: "Dashboard overview", allowedRoles: undefined },
  { path: "/patients", label: "Patients", ariaLabel: "Patient list", allowedRoles: undefined },
  { path: "/clinical-notes", label: "Clinical Notes", ariaLabel: "Clinical notes by service", allowedRoles: undefined },
  { path: "/incidents", label: "Incidents & Safeguarding", ariaLabel: "Incidents and safeguarding", allowedRoles: undefined },
  { path: "/documents", label: "Documents", ariaLabel: "Evidence and policy documents", allowedRoles: undefined },
  { path: "/care-plans", label: "Care Plans", ariaLabel: "Patient care plans", allowedRoles: undefined },
  { path: "/compliance", label: "Compliance", ariaLabel: "CQC compliance scores and risk", allowedRoles: undefined },
  { path: "/evidence-pack", label: "Evidence Pack", ariaLabel: "Inspection evidence pack", allowedRoles: undefined },
  { path: "/inspection-simulation", label: "Inspection Simulator", ariaLabel: "CQC inspection simulation", allowedRoles: undefined },
  { path: "/admin", label: "Admin", ariaLabel: "Platform admin control panel", platformAdminOnly: true },
];
