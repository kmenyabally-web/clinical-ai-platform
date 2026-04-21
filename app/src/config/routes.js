/**
 * Route–role mapping. Single source of truth for ProtectedRoute and Sidebar.
 * Sidebar uses label, ariaLabel (optional), path, and allowedRoles.
 */

/** Roles that can access readiness sections (Governance, Safeguarding, etc.). Viewer sees Overview only. */
export const READINESS_SECTION_ROLES = ["Manager", "QualityLead"];

/** Organisation Admin (and legacy Admin) — tenant management; Managers use operational tools elsewhere. */
export const MANAGEMENT_ALLOWED_ROLES = ["Admin", "Organisation Admin"];

/** @type {{ path: string, label: string, ariaLabel?: string, allowedRoles?: string[], platformAdminOnly?: boolean }[]} */
export const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", ariaLabel: "Dashboard overview", allowedRoles: undefined },
  { path: "/command-centre", label: "🧭 Command Centre", ariaLabel: "Inspection command centre", allowedRoles: undefined },
  { path: "/billing", label: "Billing", ariaLabel: "Subscription and billing", allowedRoles: undefined },
  { path: "/organisation-dashboard", label: "Organisation", ariaLabel: "Organisation operational dashboard", allowedRoles: undefined },
  { path: "/patients", label: "Patients", ariaLabel: "Patient list", allowedRoles: undefined },
  { path: "/clinical-notes", label: "Clinical Notes", ariaLabel: "Clinical notes by service", allowedRoles: undefined },
  { path: "/behaviour", label: "Behaviour Tracking", ariaLabel: "Behaviour tracking from clinical notes", allowedRoles: undefined },
  {
    path: "/nursing-observations",
    label: "Nursing Observations",
    ariaLabel: "Structured nursing observations for CPA",
    allowedRoles: undefined,
  },
  {
    path: "/ward-dashboard",
    label: "Ward dashboard",
    ariaLabel: "Ward-level risk, alerts, and trends",
    allowedRoles: undefined,
  },
  {
    path: "/executive-dashboard",
    label: "Executive dashboard",
    ariaLabel: "Organisation-wide risk, wards, and alerts",
    allowedRoles: undefined,
  },
  {
    path: "/psychology-formulation",
    label: "Psychology Formulation",
    ariaLabel: "Structured psychology formulation for CPA",
    allowedRoles: undefined,
  },
  {
    path: "/mdt-structured-clinical",
    label: "MDT structured (V2)",
    ariaLabel: "Structured psychiatry OT SALT and psychology tracking for CPA",
    allowedRoles: undefined,
  },
  { path: "/mdt", label: "MDT Reviews", ariaLabel: "MDT review information", allowedRoles: undefined },
  { path: "/physical-health", label: "Physical Health", ariaLabel: "Physical health and vital signs", allowedRoles: undefined },
  { path: "/incidents", label: "Incidents & Safeguarding", ariaLabel: "Incidents and safeguarding", allowedRoles: undefined },
  { path: "/documents", label: "Documents", ariaLabel: "Evidence and policy documents", allowedRoles: undefined },
  { path: "/organisation/policies", label: "Policies", ariaLabel: "Organisation policy library", allowedRoles: undefined },
  { path: "/care-plans", label: "Care Plans", ariaLabel: "Patient care plans", allowedRoles: undefined },
  { path: "/care-plan", label: "Care Plan", ariaLabel: "Care plan risk engine", allowedRoles: undefined },
  { path: "/capacity", label: "Capacity & Consent", ariaLabel: "Mental Capacity Act assessments", allowedRoles: undefined },
  { path: "/staff-training", label: "Staff Training", ariaLabel: "Staff competency and training records", allowedRoles: undefined },
  { path: "/compliance", label: "Compliance", ariaLabel: "CQC compliance scores and risk", allowedRoles: undefined },
  { path: "/reports", label: "AI Reports", ariaLabel: "AI-generated reports", allowedRoles: undefined },
  { path: "/evidence-pack", label: "Evidence Pack", ariaLabel: "Inspection evidence pack", allowedRoles: undefined },
  { path: "/inspection-simulator", label: "Inspection Simulator", ariaLabel: "CQC inspection simulation", allowedRoles: undefined },
  { path: "/inspection-defence", label: "Inspection Defence", ariaLabel: "CQC inspection defence pack", allowedRoles: undefined },
  { path: "/audit-log", label: "Audit Log", ariaLabel: "Compliance audit log", allowedRoles: undefined },
  { path: "/admin", label: "Admin", ariaLabel: "Platform admin control panel", platformAdminOnly: true },
];

/** Sidebar subsection: Management (Admin / Manager + platform admin). Organisations list is platform admins only; other items are tenant Admin/Manager. */
export const MANAGEMENT_NAV_ITEMS = [
  {
    path: "/management/organisations",
    label: "Organisations",
    ariaLabel: "Organisations",
    platformAdminOnly: true,
  },
  { path: "/management/hospitals", label: "Hospitals", ariaLabel: "Hospitals", allowedRoles: MANAGEMENT_ALLOWED_ROLES },
  { path: "/management/wards", label: "Wards", ariaLabel: "Wards", allowedRoles: MANAGEMENT_ALLOWED_ROLES },
  { path: "/management/users", label: "Users", ariaLabel: "Users", allowedRoles: MANAGEMENT_ALLOWED_ROLES },
  { path: "/patients", label: "Patients", ariaLabel: "Patient list", allowedRoles: MANAGEMENT_ALLOWED_ROLES },
];
