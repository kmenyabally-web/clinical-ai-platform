import { useState, useMemo } from "react";
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

export default function Sidebar() {
  const { organisation, organisationId, isPlatformAdmin } = useOrganisation();
  const { isAllowed, isGlobalAdmin, isSuperAdmin } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  const features = organisation?.features ?? null;
  /** Match {@link FeatureGate}: module visibility is driven by org features, not duplicate UX-permission checks. */
  const isFeatureEnabled = (slug) => {
    if (!slug) return true;
    return features?.[slug] === true;
  };

  const navFeatureRequirements = {
    "/clinical-notes": "clinicalNotes",
    "/care-plans": "medication",
    "/mdt": "mdt",
    "/behaviour": "risk",
    "/compliance": "risk",
    "/evidence-pack": "evidencePack",
    "/inspection-simulator": "inspection",
  };

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) =>
        item.platformAdminOnly
          ? isPlatformAdmin
          : item.allowedRoles == null
            ? isFeatureEnabled(navFeatureRequirements[item.path])
            : (organisationId || isPlatformAdmin) && isAllowed(item.allowedRoles)
      ),
    [isAllowed, isPlatformAdmin, organisationId, features]
  );

  // DEBUG: force management nav (Users, etc.) — set back to role-based check after auth/RBAC verified.
  const showManagementSection = true;

  const managementItems = useMemo(() => {
    if (!showManagementSection) return [];
    return MANAGEMENT_NAV_ITEMS.filter((item) =>
      item.platformAdminOnly
        ? isPlatformAdmin || isGlobalAdmin
        : item.allowedRoles == null
          ? true
          : (
              (organisationId || isPlatformAdmin) &&
              (isAllowed(item.allowedRoles) || (isGlobalAdmin && !!organisationId))
            )
    );
  }, [isAllowed, isPlatformAdmin, isGlobalAdmin, organisationId, showManagementSection]);

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
