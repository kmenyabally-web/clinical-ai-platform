import {
  Activity,
  AlertTriangle,
  BriefcaseMedical,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Files,
  Gauge,
  LayoutDashboard,
  Receipt,
  ShieldAlert,
  Siren,
  Stethoscope,
  Users,
} from "lucide-react";

/**
 * Route–role mapping. Single source of truth for ProtectedRoute and Sidebar.
 * Sidebar uses label, ariaLabel (optional), path, and allowedRoles.
 */

/** Roles that can access readiness sections (Governance, Safeguarding, etc.). Viewer sees Overview only. */
export const READINESS_SECTION_ROLES = ["Manager", "QualityLead"];

export const ORGANISATION_TYPES = ["CARE_HOME", "HOSPITAL", "CLINIC", "COMMUNITY", "SUPPORTED_LIVING"];

export const MODULE_GROUPS = [
  { id: "core-care", label: "Core Care", color: "#0f4c81" },
  { id: "mdt-reports", label: "MDT & Reports", color: "#5b21b6" },
  { id: "safety-compliance", label: "Safety & Compliance", color: "#b45309" },
  { id: "inspection-tools", label: "Inspection Tools", color: "#166534" },
  { id: "management", label: "Management", color: "#475569" },
];

/** @type {{ path: string, label: string, group: string, ariaLabel?: string, icon?: unknown, allowedRoles?: string[], platformAdminOnly?: boolean, visibleForOrgTypes?: string[] }[]} */
export const NAV_ITEMS = [
  { path: "/admin", label: "Admin", group: "management", icon: Building2, ariaLabel: "Platform admin control panel", platformAdminOnly: true },
  { path: "/dashboard", label: "Overview", group: "core-care", icon: LayoutDashboard, ariaLabel: "Dashboard overview", allowedRoles: undefined },
  { path: "/services", label: "Services", group: "core-care", icon: Stethoscope, ariaLabel: "Manage services", allowedRoles: undefined },
  { path: "/incidents", label: "Incidents & Safeguarding", group: "core-care", ariaLabel: "Incidents and safeguarding", icon: ShieldAlert, allowedRoles: undefined },
  { path: "/actions", label: "Actions", group: "mdt-reports", icon: ClipboardCheck, ariaLabel: "Compliance actions", allowedRoles: undefined },
  { path: "/reports", label: "Reports", group: "mdt-reports", icon: ClipboardList, ariaLabel: "SanctumCare Clinical Report", allowedRoles: undefined },
  { path: "/notifications", label: "Notifications", group: "mdt-reports", icon: Siren, ariaLabel: "Notifications and alerts", allowedRoles: undefined },
  { path: "/documents", label: "Documents", group: "safety-compliance", icon: Files, ariaLabel: "Evidence and policy documents", allowedRoles: undefined },
  { path: "/evidence", label: "Evidence", group: "safety-compliance", icon: FileCheck2, ariaLabel: "Evidence management", allowedRoles: undefined },
  { path: "/governance", label: "Governance", group: "safety-compliance", icon: Activity, ariaLabel: "Governance", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/safeguarding", label: "Safeguarding", group: "safety-compliance", icon: AlertTriangle, ariaLabel: "Safeguarding", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/mental-capacity", label: "Mental Capacity", group: "safety-compliance", icon: BriefcaseMedical, ariaLabel: "Mental capacity and consent", allowedRoles: READINESS_SECTION_ROLES, visibleForOrgTypes: ["CARE_HOME", "SUPPORTED_LIVING", "COMMUNITY"] },
  { path: "/staffing", label: "Staffing & Training", group: "safety-compliance", icon: Users, ariaLabel: "Staffing and training", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/care-planning", label: "Care Planning", group: "core-care", icon: ClipboardCheck, ariaLabel: "Care planning framework", allowedRoles: READINESS_SECTION_ROLES },
  { path: "/inspection-simulation", label: "Inspection simulation", group: "inspection-tools", icon: Gauge, ariaLabel: "CQC inspection simulation", allowedRoles: undefined },
  { path: "/evidence-pack", label: "Evidence Pack", group: "inspection-tools", icon: FileCheck2, ariaLabel: "CQC evidence pack generator", allowedRoles: undefined },
  { path: "/billing", label: "Billing", group: "management", icon: Receipt, ariaLabel: "Billing and subscription", allowedRoles: undefined },
];
