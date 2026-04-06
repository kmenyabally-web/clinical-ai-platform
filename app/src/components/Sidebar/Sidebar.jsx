import { useState, useMemo, useEffect } from "react";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import { NAV_ITEMS, MANAGEMENT_NAV_ITEMS } from "../../config/routes";
import {
  NHS_BLUE,
  NHS_BLUE_HOVER,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
  FOCUS_OUTLINE,
  FOCUS_OUTLINE_OFFSET,
} from "./constants";
import SidebarNavItem from "./SidebarNavItem";
import { APP_CONFIG } from "../../config/appConfig";
import { isModulePathAllowedForOrganisation } from "../../config/documentRegistry";
import { isOrganisationAdminRole } from "../../utils/organisationAdmin";

/** Never hide these paths due to missing org type, empty features, or feature flags. */
const CORE_NAV_PATHS = new Set(["/dashboard", "/patients", "/clinical-notes", "/audit-log"]);

export default function Sidebar() {
  const { organisation, organisationId, isPlatformAdmin, organisationType: contextOrgType } = useOrganisation();
  const { isAllowed, isGlobalAdmin, isSuperAdmin, role } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  const features = organisation?.features ?? null;
  /** Match {@link FeatureGate}: module visibility is driven by org features, not duplicate UX-permission checks. */
  const isFeatureEnabled = (slug) => {
    if (!slug) return true;
    return features?.[slug] === true;
  };

  const navFeatureRequirements = {
    "/clinical-notes": "clinicalNotes",
    "/organisation/policies": "policies",
    "/care-plans": "medication",
    "/care-plan": "medication",
    "/mdt": "mdt",
    "/physical-health": "vitals",
    "/behaviour": "risk",
    "/nursing-observations": "risk",
    "/ward-dashboard": "risk",
    "/executive-dashboard": "risk",
    "/psychology-formulation": "mdt",
    "/mdt-structured-clinical": "mdt",
    "/compliance": "risk",
    "/evidence-pack": "evidencePack",
    "/inspection-simulator": "inspection",
    "/command-centre": "inspection",
    "/inspection-defence": "inspection",
  };

  const rawOrgType = organisation?.type ?? organisation?.organisationType;
  const organisationType = rawOrgType != null && String(rawOrgType).trim() !== "" ? String(rawOrgType).trim() : null;
  const featureFlags = organisation?.features;

  const hasUsableFeatureFlags =
    featureFlags != null &&
    typeof featureFlags === "object" &&
    Object.keys(featureFlags).length > 0;

  /** Missing org, type, or usable features → do not filter by registry or feature flags (never yield an empty nav). */
  const failsafeFullMenu =
    organisation == null || organisationType == null || !hasUsableFeatureFlags;

  useEffect(() => {
    console.log("SIDEBAR DEBUG", {
      organisationType: organisationType ?? contextOrgType,
      featureFlags,
      role,
    });
  }, [organisationType, contextOrgType, featureFlags, role]);

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      const isCore = CORE_NAV_PATHS.has(item.path);
      if (item.enabled === false && !isCore) return false;

      if (item.platformAdminOnly) return isPlatformAdmin;

      if (item.allowedRoles != null) {
        return (organisationId || isPlatformAdmin) && isAllowed(item.allowedRoles);
      }

      const relaxRegistryAndFeatures = failsafeFullMenu || isCore;
      if (!relaxRegistryAndFeatures) {
        if (!isModulePathAllowedForOrganisation(item.path, organisationType)) return false;
        if (!isFeatureEnabled(navFeatureRequirements[item.path])) return false;
      }
      return true;
    });
  }, [isAllowed, isPlatformAdmin, organisationId, features, organisationType, failsafeFullMenu]);

  const roleUpper = role != null ? String(role).toUpperCase() : "";
  /** Stable visibility: do not depend on flickering RBAC; fail-open when role not yet resolved. */
  const showManagementSection =
    role == null ||
    roleUpper === "" ||
    roleUpper === "SUPER_ADMIN" ||
    roleUpper === "ADMIN" ||
    isOrganisationAdminRole(role) ||
    isGlobalAdmin ||
    isPlatformAdmin;

  const managementItems = useMemo(() => {
    if (!showManagementSection) return [];
    return MANAGEMENT_NAV_ITEMS.filter((item) =>
      item.platformAdminOnly ? isPlatformAdmin || isGlobalAdmin : true
    );
  }, [showManagementSection, isPlatformAdmin, isGlobalAdmin]);

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const toggleAriaLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <>
      <style>{`
        .sidebar-nav-link:focus-visible {
          outline: ${FOCUS_OUTLINE};
          outline-offset: ${FOCUS_OUTLINE_OFFSET}px;
        }
        .sidebar-nav-link:not([aria-current]):hover {
          background-color: var(--surface-muted);
          color: var(--text-primary);
        }
        .sidebar-toggle {
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .sidebar-toggle:hover {
          background-color: var(--surface-muted);
          border-color: ${NHS_BLUE};
        }
        .sidebar-toggle:focus-visible {
          outline: ${FOCUS_OUTLINE};
          outline-offset: ${FOCUS_OUTLINE_OFFSET}px;
        }
      `}</style>
      <aside
        role="complementary"
        aria-label="Primary navigation"
        style={{
          ...sidebarRoot,
          width: width,
          minWidth: width,
        }}
      >
        <div style={header}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div style={brand(collapsed)}>
              {collapsed
                ? APP_CONFIG.name
                : organisation?.name?.trim() || (isPlatformAdmin ? "Platform Admin" : APP_CONFIG.name)}
            </div>
            {!collapsed && !organisation?.name?.trim() && !isPlatformAdmin ? (
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {APP_CONFIG.tagline}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            aria-expanded={!collapsed}
            aria-label={toggleAriaLabel}
            onClick={() => setCollapsed((c) => !c)}
            style={toggleButton}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
        <nav aria-label="Main navigation" style={nav}>
          {(visibleItems ?? []).map((item, idx) => (
            item ? <SidebarNavItem key={item.path ?? idx} item={item} collapsed={collapsed} /> : null
          ))}
          {managementItems.length > 0 ? (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              {!collapsed ? (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    padding: "4px 8px 8px",
                  }}
                >
                  Management
                </div>
              ) : (
                <div style={{ height: 8 }} aria-hidden />
              )}
              {managementItems.map((item, idx) => (
                <SidebarNavItem key={`mgmt-${item.path ?? idx}`} item={item} collapsed={collapsed} />
              ))}
            </div>
          ) : null}
          {isSuperAdmin ? (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--border)",
              }}
            >
              {!collapsed ? (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    padding: "4px 8px 8px",
                  }}
                >
                  SYSTEM
                </div>
              ) : (
                <div style={{ height: 8 }} aria-hidden />
              )}
              <SidebarNavItem
                item={{
                  path: "/system-admin/organisations",
                  label: "🌍 Manage Organisations",
                  ariaLabel: "Manage Organisations",
                }}
                collapsed={collapsed}
              />
            </div>
          ) : null}
        </nav>
      </aside>
    </>
  );
}

const sidebarRoot = {
  backgroundColor: "var(--surface)",
  borderRight: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  transition: "width 0.2s ease, min-width 0.2s ease",
  overflow: "hidden",
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  padding: "16px 12px",
  borderBottom: "1px solid var(--border)",
  minHeight: "56px",
};

const brand = (collapsed) => ({
  color: NHS_BLUE,
  fontWeight: 700,
  fontSize: collapsed ? "12px" : "15px",
  lineHeight: 1.3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const toggleButton = {
  flexShrink: 0,
  width: "36px",
  height: "36px",
  padding: 0,
  border: "1px solid var(--border)",
  borderRadius: "6px",
  backgroundColor: "var(--surface)",
  color: NHS_BLUE,
  fontSize: "16px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s ease, border-color 0.15s ease",
};

const nav = {
  flex: 1,
  padding: "12px 8px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  overflowY: "auto",
};
