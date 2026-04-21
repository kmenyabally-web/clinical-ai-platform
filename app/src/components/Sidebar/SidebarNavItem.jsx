import { NavLink } from "react-router-dom";

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
  padding: "10px 12px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 600,
  transition: "background-color 0.15s ease, color 0.15s ease",
  outline: "none",
};
const linkDefault = {
  color: "var(--text-muted)",
  backgroundColor: "transparent",
};
const linkActive = {
  color: "var(--surface)",
  backgroundColor: "var(--primary)",
};

const charOnly = {
  display: "inline-block",
  textAlign: "center",
  width: "100%",
};

// Focus visible styles applied via global or wrapper; NavLink doesn't accept :focus-visible in inline style.
// We inject a small style block in Sidebar for .sidebar-nav-link:focus-visible.
