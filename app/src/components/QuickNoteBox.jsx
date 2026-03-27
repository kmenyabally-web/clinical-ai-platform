import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { addClinicalNote } from "../services/noteService";
import { MDT_ROLES } from "../constants/mdtRoles";

function pickDiscipline(mdtRole) {
  const r = String(mdtRole ?? "").trim();
  if (r && MDT_ROLES.includes(r)) return r;
  return "Support Worker";
}

/**
 * Single-field quick note — uses clinical notes pipeline with minimal inputs.
 */
export default function QuickNoteBox({ patients = [], patientsLoading = false }) {
  const { user } = useAuth();
  const { userProfile } = useOrganisation();
  const [patientId, setPatientId] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const pid = String(patientId ?? "").trim();
    const body = String(text ?? "").trim();
    if (!pid || !body) {
      setMsg("Choose a patient and enter a note.");
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const discipline = pickDiscipline(userProfile?.mdtRole);
      await addClinicalNote(pid, {
        content: body,
        category: "Routine",
        discipline,
        authorEmail: user?.email ?? "",
      });
      setText("");
      setMsg("Saved.");
    } catch (err) {
      setMsg(err?.message ?? "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <h2 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 900 }}>Quick note</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
          Patient
        </label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          disabled={patientsLoading}
          style={{
            width: "100%",
            minHeight: 44,
            marginBottom: 10,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 16,
          }}
        >
          <option value="">{patientsLoading ? "Loading patients…" : "Select patient"}</option>
          {(patients ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {[p.firstName, p.lastName].filter(Boolean).join(" ") || p.id}
            </option>
          ))}
        </select>
        <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 6, color: "#334155" }}>
          Note
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Type a short update…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            minHeight: 88,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 16,
            marginBottom: 10,
          }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            minHeight: 48,
            borderRadius: 12,
            border: "none",
            background: "#005eb8",
            color: "#fff",
            fontWeight: 900,
            fontSize: 16,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Add note"}
        </button>
      </form>
      {msg ? (
        <p style={{ margin: "10px 0 0 0", fontSize: 13, color: msg.startsWith("Saved") ? "#15803d" : "#b91c1c" }}>{msg}</p>
      ) : null}
    </div>
  );
}
