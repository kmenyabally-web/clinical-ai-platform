import { useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";

export default function SystemStatus({ context: contextProp, role: roleProp }) {
  const org = useOrganisation();
  const { role: roleFromHook } = useRole();
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  const context = contextProp ?? {
    organisationId: org.organisationId,
    hospitalId: org.hospitalId,
    wardId: org.wardId,
  };
  const role = roleProp ?? roleFromHook;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          background: "var(--surface)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          padding: "6px 10px",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        🧠 System
      </button>

      {open ? (
        <div
          style={{
            background: "var(--surface)",
            color: "var(--text-primary)",
            padding: "10px",
            fontSize: "12px",
            marginTop: "5px",
            borderRadius: "6px",
            maxWidth: "220px",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <strong>Role:</strong> {role ?? "—"}
          </div>
          <div>
            <strong>Org:</strong> {context?.organisationId || "—"}
          </div>
          <div>
            <strong>Hospital:</strong> {context?.hospitalId || "—"}
          </div>
          <div>
            <strong>Ward:</strong> {context?.wardId || "—"}
          </div>
          <div>
            <strong>Mode:</strong> {String(import.meta.env.VITE_SAFE_MODE ?? "")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
