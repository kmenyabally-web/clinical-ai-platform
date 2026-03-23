import { ShieldAlert } from "lucide-react";

/**
 * Route–role mapping. Single source of truth for ProtectedRoute and Sidebar.
 * Sidebar uses label, ariaLabel (optional), path, and allowedRoles.
 */

/** Roles that can access readiness sections (Governance, Safeguarding, etc.). Viewer sees Overview only. */
export const READINESS_SECTION_ROLES = ["Manager", "QualityLead"];

/** @type {{ path: string, label: string, ariaLabel?: string, icon?: unknown, allowedRoles?: string[], platformAdminOnly?: boolean }[]} */
export const NAV_ITEMS = [
  { path: "/admin", label: "Admin", ariaLabel: "Platform admin control panel", platformAdminOnly: true },
  { path: "/dashboard", label: "Overview", ariaLabel: "Dashboard overview", allowedRoles: undefined },
  { path: "/actions", label: "Actions", ariaLabel: "Compliance actions", allowedRoles: undefined },
  { path: "/documents", label: "Documents", ariaLabel: "Evidence and policy documents", allowedRoles: undefined },
  { path: "/evidence", label: "Evidence", ariaLabel: "Evidence management", allowedRoles: undefined },
  { path: "/incidents", label: "Incidents & Safeguarding", ariaLabel: "Incidents and safeguarding", icon: ShieldAlert, allowedRoles: undefined },
  { path: "/evidence-pack", label: "Evidence Pack", ariaLabel: "CQC evidence pack generator", allowedRoles: undefined },
  { path: "/inspection-simulation", label: "Inspection simulation", ariaLabel: "CQC inspection simulation", allowedRoles: undefined },
  { path: "/reports", label: "Reports", ariaLabel: "CQC Readiness Report", allowedRoles: undefined },
  { path: "/notifications", label: "Notifications", ariaLabel: "Notifications and alerts", allowedRoles: undefined },
  { path: "/services", label: "Services", ariaLabel: "Manage services", allowedRoles: undefined },
  { path: "/billing", label: "Billing", ariaLabel: "Billing and subscription", allowedRoles: undefined },
  { path: "/governance", label: "Governance", ariaLabel: "Governance", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/safeguarding", label: "Safeguarding", ariaLabel: "Safeguarding", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/mental-capacity", label: "Mental Capacity", ariaLabel: "Mental capacity and consent", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/staffing", label: "Staffing & Training", ariaLabel: "Staffing and training", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/care-planning", label: "Care Planning", ariaLabel: "Care planning framework", allowedRoles: READINESS_SECTION_ROLES },
];
