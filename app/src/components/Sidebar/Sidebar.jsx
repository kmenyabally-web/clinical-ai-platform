import { useState, useMemo } from "react";
import { useOrganisation } from "../../context/OrganisationContext";
import { useRole } from "../../context/RoleContext";
import { NAV_ITEMS } from "../../config/routes";
import {
  NHS_BLUE,
  NHS_BLUE_HOVER,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
  FOCUS_OUTLINE,
  FOCUS_OUTLINE_OFFSET,
} from "./constants";
import SidebarNavItem from "./SidebarNavItem";

export default function Sidebar() {
  const { organisation, organisationId, isPlatformAdmin } = useOrganisation();
  const { isAllowed } = useRole();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) =>
        item.platformAdminOnly
          ? isPlatformAdmin
          : organisationId && isAllowed(item.allowedRoles)
      ),
    [isAllowed, isPlatformAdmin, organisationId]
  );

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
          background-color: #f0f4f8;
          color: #21303a;
        }
        .sidebar-toggle {
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .sidebar-toggle:hover {
          background-color: #f0f4f8;
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
          <div style={brand(collapsed)}>
            {collapsed ? "CQC" : (organisation?.name?.trim() || (isPlatformAdmin ? "Platform Admin" : "CQC Platform"))}
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
        </nav>
      </aside>
    </>
  );
}

const sidebarRoot = {
  backgroundColor: "#ffffff",
  borderRight: "1px solid #e8edf2",
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
  borderBottom: "1px solid #e8edf2",
  minHeight: "56px",
};

const brand = (collapsed) => ({
  color: NHS_BLUE,
  fontWeight: 600,
  fontSize: collapsed ? "12px" : "16px",
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
  border: "1px solid #d8dde5",
  borderRadius: "4px",
  backgroundColor: "#fff",
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
