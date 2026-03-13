import { NavLink } from "react-router-dom";
import { NHS_BLUE, FOCUS_OUTLINE, FOCUS_OUTLINE_OFFSET } from "./constants";

/**
 * Single nav link with active state and accessible labelling.
 * Collapsed: shows first character + title tooltip; expanded: full label.
 */
export default function SidebarNavItem({ item, collapsed }) {
  if (!item) return null;
  const path = item.path ?? "/dashboard";
  const ariaLabel = item.ariaLabel ?? item.label ?? "";
  const displayText = collapsed ? (item.label ?? "").charAt(0) : (item.label ?? "");
  const exactMatch = path === "/dashboard" || path === "/patients";

  return (
    <NavLink
      to={path}
      end={exactMatch}
      aria-label={ariaLabel}
      title={collapsed ? item.label : undefined}
      style={({ isActive }) => ({
        ...linkBase,
        ...(isActive ? linkActive : linkDefault),
      })}
      className="sidebar-nav-link"
    >
      <span style={collapsed ? charOnly : undefined}>{displayText}</span>
    </NavLink>
  );
}

const linkBase = {
  display: "block",
  padding: "12px 16px",
  borderRadius: "4px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  transition: "background-color 0.15s ease, color 0.15s ease",
  outline: "none",
};
const linkDefault = {
  color: "#21303a",
  backgroundColor: "transparent",
};
const linkActive = {
  color: "#ffffff",
  backgroundColor: NHS_BLUE,
};

const charOnly = {
  display: "inline-block",
  textAlign: "center",
  width: "100%",
};

// Focus visible styles applied via global or wrapper; NavLink doesn't accept :focus-visible in inline style.
// We inject a small style block in Sidebar for .sidebar-nav-link:focus-visible.
