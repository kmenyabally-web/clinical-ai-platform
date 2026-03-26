import { useMemo } from "react";
import { ROLE_TEMPLATES } from "../config/roleTemplates";
import { useRole } from "../context/RoleContext";

function normalizeMdtRole(mdtRole) {
  if (!mdtRole) return "";
  return String(mdtRole).trim();
}

function mapUxRoleKey({ systemRole, mdtRole }) {
  const s = String(systemRole ?? "").trim().toUpperCase();
  const m = normalizeMdtRole(mdtRole);

  // Clinical identity (mdtRole) mapping.
  if (m) {
    if (m === "Nurse" || m.includes("Nurse")) return "Nurse";
    if (m.includes("Psychologist")) return "Psychologist";
    if (m.includes("Support Worker")) return "Support Worker";
    if (m.toLowerCase().includes("doctor") || m.includes("Specialty Doctor")) return "Doctor";
    if (m.includes("Clinical Lead")) return "Nurse";
    if (m.includes("Care Assistant") || m.includes("Head of Care") || m.includes("Care")) return "Carer";
    if (m.includes("Ward Manager")) return "Manager";
    if (m.includes("Manager")) return "Manager";
    return null;
  }

  // System-level fallback mapping.
  if (["SUPER_ADMIN", "GLOBAL_ADMIN", "ADMIN"].includes(s)) return "Doctor";
  if (s === "MANAGER") return "Manager";
  if (s === "STAFF") return "Nurse";

  // Safe fallback: restricted access (empty permissions).
  return null;
}

export const usePermissions = () => {
  const { role, mdtRole } = useRole();

  return useMemo(() => {
    const uxKey = mapUxRoleKey({ systemRole: role, mdtRole });
    return (uxKey && ROLE_TEMPLATES[uxKey]) || {};
  }, [role, mdtRole]);
};

