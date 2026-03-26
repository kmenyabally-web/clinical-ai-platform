/** Staff competency tracker — staff_training collection (traffic-light status). */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import {
  listStaffTraining,
  createStaffTrainingRecord,
  attachCertificateFile,
  computeTrainingStatus,
} from "../services/staffTrainingService";
import { formatUkDate, formatToUKDate, parseUkDateString } from "../utils/dateFormat";

const TRAINING_OPTIONS = [
  "Insulin Support",
  "Manual Handling",
  "PEG Feeding",
  "Catheter Care",
  "Tracheostomy Care",
  "Safeguarding Adults",
  "Medication Administration",
  "Other",
];

/** Must match strict UK calendar string before Firestore write */
const UK_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Always show expiry as DD/MM/YYYY in the dashboard table. */
function formatExpiryDisplay(expiryDate) {
  if (typeof expiryDate === "string") {
    const t = expiryDate.trim();
    if (UK_DATE_REGEX.test(t) && parseUkDateString(t)) return t;
  }
  return formatUkDate(expiryDate, "—");
}

/** Forces DD/MM/YYYY shape as user types (digits + auto-slashes). */
function maskUkExpiryInput(raw) {
  const digits = String(raw).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Paste or HTML date picker (YYYY-MM-DD) → DD/MM/YYYY before save.
 * Manual typing uses the digit mask.
 */
function normaliseExpiryInput(value) {
  const t = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const uk = formatToUKDate(t);
    return uk || maskUkExpiryInput(t);
  }
  return maskUkExpiryInput(t);
}

function TrafficDot({ status }) {
  const isValid = status === "Valid";
  return (
    <span
      title={status === "Valid" ? "Valid" : "Expired"}
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: isValid ? "#16a34a" : "#dc2626",
        boxShadow: isValid ? "0 0 0 2px rgba(22,163,74,0.25)" : "0 0 0 2px rgba(220,38,38,0.25)",
        flexShrink: 0,
      }}
    />
  );
}

export default function StaffTraining() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [trainingName, setTrainingName] = useState("Manual Handling");
  const [trainingOther, setTrainingOther] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const load = useCallback(async () => {
    if (!organisationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listStaffTraining(organisationId, currentServiceId ?? null);
      setRows(data);
    } catch (e) {
      setError(e?.message ?? "Failed to load training records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    load();
  }, [load]);

  const staffGroups = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const sid = (r.staffId || "").trim() || "unknown";
      if (!map.has(sid)) {
        map.set(sid, {
          staffId: sid,
          displayName: (r.staffName || "").trim() || sid,
          records: [],
        });
      }
      const g = map.get(sid);
      if ((r.staffName || "").trim()) g.displayName = r.staffName.trim();
      g.records.push(r);
    }
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [rows]);

  async function handleSave(e) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!organisationId) {
      setFormError("No organisation selected.");
      return;
    }
    const resolvedTraining =
      trainingName === "Other" ? (trainingOther || "").trim() : trainingName.trim();
    if (!resolvedTraining) {
      setFormError("Enter a training name.");
      return;
    }
    if (!staffId.trim()) {
      setFormError("Staff ID is required (e.g. payroll or system user id).");
      return;
    }
    if (!expiryDate) {
      setFormError("Expiry date is required.");
      return;
    }
    const expiryDateUk = normaliseExpiryInput(expiryDate).trim();
    if (!UK_DATE_REGEX.test(expiryDateUk) || !parseUkDateString(expiryDateUk)) {
      setFormError("Please use the UK date format: DD/MM/YYYY.");
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createStaffTrainingRecord({
        organisationId,
        serviceId: currentServiceId ?? null,
        staffId: staffId.trim(),
        staffName: staffName.trim(),
        trainingName: resolvedTraining,
        expiryDate: expiryDateUk,
        evidenceUrl: evidenceUrl.trim(),
      });

      const optimisticRecord = {
        id,
        organisationId,
        serviceId: currentServiceId ?? null,
        staffId: staffId.trim(),
        staffName: staffName.trim(),
        trainingName: resolvedTraining,
        expiryDate: expiryDateUk,
        status: computeTrainingStatus(expiryDateUk),
        evidenceUrl: evidenceUrl.trim(),
        createdAt: new Date(),
      };
      setRows((prev) => [optimisticRecord, ...(Array.isArray(prev) ? prev : [])]);

      if (certificateFile) {
        const uploadedUrl = await attachCertificateFile(organisationId, id, certificateFile);
        setRows((prev) =>
          (Array.isArray(prev) ? prev : []).map((r) => (r.id === id ? { ...r, evidenceUrl: uploadedUrl } : r))
        );
      }

      setFormSuccess("Training record saved.");
      setEvidenceUrl("");
      setCertificateFile(null);
      setExpiryDate("");
      setStaffId("");
      setStaffName("");
      setTrainingOther("");
      await load();
    } catch (err) {
      setFormError(err?.message ?? "Could not save training record.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!organisationId) {
    return (
      <div style={{ padding: "24px", maxWidth: 1120, margin: "0 auto" }}>
        <p style={{ color: "#64748b" }}>Select an organisation to view staff training.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1120, margin: "0 auto" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, marginBottom: 6 }}>Staff competency tracker</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Traffic light: <TrafficDot status="Valid" /> Valid · <TrafficDot status="Expired" /> Expired · Service filter:{" "}
          <strong>{currentServiceId ?? "All services in org"}</strong>
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "0.75rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 12,
            color: "#b91c1c",
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Upload certificate</h2>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.88rem" }}>
          Creates a <code style={{ fontSize: 12 }}>staff_training</code> row: staff id, training name, expiry, optional link or file
          to Storage.
        </p>

        <form onSubmit={handleSave} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Staff ID *</label>
              <input
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. EMP-1024"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Staff name</label>
              <input
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Display name"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Training *</label>
              <select
                value={trainingName}
                onChange={(e) => setTrainingName(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                {TRAINING_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Expiry date *</label>
              <input
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(normaliseExpiryInput(e.target.value))}
                placeholder="DD/MM/YYYY"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={10}
                pattern="^\\d{2}/\\d{2}/\\d{4}$"
                title="DD/MM/YYYY"
                aria-describedby="staff-training-expiry-hint"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
              <p id="staff-training-expiry-hint" style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b" }}>
                Type in UK format <strong>DD/MM/YYYY</strong> (slashes added automatically). Invalid dates are rejected on save.
              </p>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569" }} htmlFor="staff-training-expiry-picker">
                  Or pick (calendar)
                </label>
                <input
                  id="staff-training-expiry-picker"
                  type="date"
                  onChange={(e) => {
                    const uk = formatToUKDate(e.target.value);
                    if (uk) setExpiryDate(uk);
                  }}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                />
              </div>
            </div>
          </div>

          {trainingName === "Other" && (
            <div>
              <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Training name *</label>
              <input
                value={trainingOther}
                onChange={(e) => setTrainingOther(e.target.value)}
                placeholder="e.g. Epilepsy awareness"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Evidence URL (optional)</label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://…"
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Certificate file (optional)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {formError && (
            <div role="alert" style={{ color: "#b91c1c", fontSize: 13, fontWeight: 700 }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div role="status" style={{ color: "#15803d", fontSize: 13, fontWeight: 700 }}>
              {formSuccess}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#005eb8",
                color: "#fff",
                fontWeight: 800,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.8 : 1,
              }}
            >
              {submitting ? "Saving…" : "Save training record"}
            </button>
          </div>
        </form>
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", marginTop: 0 }}>Dashboard</h2>
        {loading && <p style={{ color: "#64748b" }}>Loading…</p>}
        {!loading && rows.length === 0 && (
          <p style={{ color: "#64748b" }}>No training records yet. Add a certificate above.</p>
        )}

        {!loading &&
          staffGroups.map((group) => (
            <div
              key={group.staffId}
              style={{
                marginBottom: 16,
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "10px 14px", background: "#f8fafc", fontWeight: 800, fontSize: 14 }}>
                {group.displayName}{" "}
                <span style={{ color: "#64748b", fontWeight: 600, fontSize: 12 }}>({group.staffId})</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fff", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Training</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Expires</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Status</th>
                    <th style={{ textAlign: "left", padding: "8px 12px" }}>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {group.records.map((r) => {
                    const live = computeTrainingStatus(r.expiryDate);
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>{r.trainingName}</td>
                        <td style={{ padding: "8px 12px" }}>{formatExpiryDisplay(r.expiryDate)}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <TrafficDot status={live} />
                            <span style={{ fontWeight: 700, color: live === "Valid" ? "#15803d" : "#b91c1c" }}>{live}</span>
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          {r.evidenceUrl ? (
                            <a href={r.evidenceUrl} target="_blank" rel="noreferrer" style={{ color: "#005eb8", fontWeight: 700 }}>
                              Open
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    </div>
  );
}
