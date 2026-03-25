import { useEffect, useState } from "react";
import { SYSTEM_ROLES, MDT_ROLES, createUser } from "../services/userManagementService";
import { listHospitals, listWards } from "../services/structureService";
import { managementStyles as s } from "../pages/management/managementStyles";

/**
 * Create a new Firebase Auth user + Firestore profile via `createOrganisationUser` callable.
 */
export default function AddUserModal({
  open,
  onClose,
  onCreated,
  defaultOrganisationId,
  organisations = [],
  isPlatformAdmin = false,
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState("Staff");
  const [mdtRole, setMdtRole] = useState(MDT_ROLES[0] ?? "Nurse");
  const [modalOrgId, setModalOrgId] = useState("");
  const [modalHospitalId, setModalHospitalId] = useState("");
  const [modalWardId, setModalWardId] = useState("");
  const [modalHospitals, setModalHospitals] = useState([]);
  const [modalWards, setModalWards] = useState([]);
  const [creating, setCreating] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setDisplayName("");
    setEmail("");
    setPassword("");
    setSystemRole("Staff");
    setMdtRole(MDT_ROLES[0] ?? "Nurse");
    setModalHospitalId("");
    setModalWardId("");
    setLocalError(null);
    setModalOrgId(defaultOrganisationId?.trim() ?? "");
  }, [open, defaultOrganisationId]);

  useEffect(() => {
    if (!open || !modalOrgId?.trim()) {
      setModalHospitals([]);
      setModalWards([]);
      return;
    }
    let cancelled = false;
    listHospitals(modalOrgId.trim())
      .then((h) => {
        if (!cancelled) setModalHospitals(Array.isArray(h) ? h : []);
      })
      .catch(() => {
        if (!cancelled) setModalHospitals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, modalOrgId]);

  useEffect(() => {
    if (!open || !modalOrgId?.trim() || !modalHospitalId?.trim()) {
      setModalWards([]);
      return;
    }
    let cancelled = false;
    listWards(modalOrgId.trim(), modalHospitalId.trim())
      .then((w) => {
        if (!cancelled) setModalWards(Array.isArray(w) ? w : []);
      })
      .catch(() => {
        if (!cancelled) setModalWards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, modalOrgId, modalHospitalId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const oid = modalOrgId.trim();
    if (!email.trim() || password.length < 6 || !oid) {
      setLocalError("Email, password (min 6 characters), and organisation are required.");
      return;
    }
    if (!systemRole?.trim() || !mdtRole?.trim()) {
      setLocalError("System role and MDT role are required.");
      return;
    }
    if (!modalHospitalId.trim()) {
      setLocalError("Hospital assignment is required.");
      return;
    }
    setCreating(true);
    setLocalError(null);
    try {
      await createUser({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
        name: displayName.trim(),
        role: systemRole.trim(),
        mdtRole: mdtRole.trim(),
        organisationId: oid,
        hospitalId: modalHospitalId.trim(),
        wardId: modalWardId.trim() || null,
      });
      if (typeof onCreated === "function") onCreated();
      onClose();
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
      const msg =
        err && typeof err === "object" && "message" in err ? String(err.message) : "Failed to create user.";
      setLocalError(code === "functions/already-exists" ? "That email is already registered." : msg);
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return (
    <div style={s.modalBackdrop} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.modalCard, maxWidth: 460 }} role="dialog" aria-modal="true" aria-labelledby="add-user-modal-title" onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 id="add-user-modal-title" style={{ margin: 0, fontSize: "1.1rem" }}>
            Add user
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {localError ? (
          <p role="alert" style={{ ...s.alert, marginTop: 0 }}>
            {localError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit}>
          {isPlatformAdmin ? (
            <label style={s.label}>
              Organisation
              <select
                required
                value={modalOrgId}
                onChange={(e) => {
                  setModalOrgId(e.target.value);
                  setModalHospitalId("");
                  setModalWardId("");
                }}
                style={s.select}
              >
                <option value="">Select</option>
                {organisations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label style={s.label}>
            Name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={s.input} />
          </label>
          <label style={s.label}>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={s.input}
            />
          </label>
          <label style={s.label}>
            Temporary password
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={s.input}
            />
          </label>
          <label style={s.label}>
            System role *
            <select required value={systemRole} onChange={(e) => setSystemRole(e.target.value)} style={s.select}>
              {SYSTEM_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label style={s.label}>
            MDT role *
            <select required value={mdtRole} onChange={(e) => setMdtRole(e.target.value)} style={s.select}>
              {MDT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label style={s.label}>
            Hospital *
            <select
              required
              value={modalHospitalId}
              onChange={(e) => {
                setModalHospitalId(e.target.value);
                setModalWardId("");
              }}
              style={s.select}
            >
              <option value="">Select hospital</option>
              {modalHospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label style={s.label}>
            Ward
            <select value={modalWardId} onChange={(e) => setModalWardId(e.target.value)} disabled={!modalHospitalId} style={s.select}>
              <option value="">Optional</option>
              {modalWards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <p style={{ ...s.muted, marginTop: -4 }}>
            The user signs in with the email and password above; they can change password per your policy.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={creating} style={s.btnPrimary}>
              {creating ? "Creating…" : "Create user"}
            </button>
            <button type="button" style={s.btnGhost} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
