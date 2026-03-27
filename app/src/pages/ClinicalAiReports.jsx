import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listPatients } from "../services/patientService";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { generateClinicalReportSection } from "../services/aiService";
import { useOrganisation } from "../context/OrganisationContext";
import ActionBar from "../components/ActionBar";
import { generateMDTReview } from "../services/mdtService";
import { generateManagementReport } from "../services/managementService";

function toIsoMillis(value) {
  if (!value) return "";
  const ms = value?.toMillis?.() ?? 0;
  if (!ms) return "";
  return new Date(ms).toISOString();
}

const REPORT_TYPES = [
  { value: "CPA", label: "CPA Report" },
  { value: "TRIBUNAL", label: "Tribunal Report" },
  { value: "MDT", label: "MDT Review" },
  { value: "MANAGEMENT", label: "Management Hearing Report" },
  { value: "MDT_WARD", label: "MDT Ward Round" },
];

export default function ClinicalAiReports() {
  const { organisationId, hasFeature } = useOrganisation();
  const immutableClinicalRecords = true;

  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState(null);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(null);

  const [reportType, setReportType] = useState("CPA");
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadPatients() {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const list = await listPatients();
        if (!mounted) return;
        setPatients(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;
        setPatientsError(e?.message ?? "Failed to load patients.");
        setPatients([]);
      } finally {
        if (!mounted) return;
        setPatientsLoading(false);
      }
    }
    loadPatients();
    return () => {
      mounted = false;
    };
  }, []);

  const patientOptions = useMemo(
    () =>
      (patients ?? []).map((p) => ({
        id: String(p?.id ?? ""),
        label: `${String(p?.firstName ?? "")} ${String(p?.lastName ?? "")}`.trim() || p?.id || "Patient",
      })),
    [patients]
  );

  useEffect(() => {
    if (!selectedPatientId && patientOptions.length) {
      setSelectedPatientId(patientOptions[0]?.id ?? "");
    }
  }, [patientOptions, selectedPatientId]);

  useEffect(() => {
    let mounted = true;
    async function loadNotes() {
      if (!selectedPatientId) return;
      setNotesLoading(true);
      setNotesError(null);
      try {
        const list = await fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 50 });
        if (!mounted) return;
        setNotes(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!mounted) return;
        setNotesError(e?.message ?? "Failed to load clinical notes.");
        setNotes([]);
      } finally {
        if (!mounted) return;
        setNotesLoading(false);
      }
    }
    loadNotes();
    return () => {
      mounted = false;
    };
  }, [selectedPatientId]);

  const latestNote = useMemo(() => {
    const rows = (notes ?? []).slice();
    rows.sort((a, b) => {
      const ta = a?.createdAt?.toMillis?.() ?? 0;
      const tb = b?.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
    return rows[0] ?? null;
  }, [notes]);

  function generateWeeklySummary() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { report: "weekly" });
    }
  }

  function generateMonthlySummary() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { report: "monthly" });
    }
  }

  function generateTribunal() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { report: "tribunal" });
    }
  }

  function generateCPA() {
    if (import.meta.env.DEV) {
      console.log("Debug:", { report: "cpa" });
    }
  }

  async function handleGenerate() {
    setReportError(null);
    setReport(null);
    setGenerating(true);
    setLastGenerated(null);
    try {
      if (!organisationId) throw new Error("Organisation context is missing.");
      if (!hasFeature("ai")) throw new Error("AI features are disabled on this plan.");

      if (!selectedPatientId) throw new Error("No patient selected.");

      const context = { organisationId };

      if (reportType === "MANAGEMENT") {
        const result = await generateManagementReport(selectedPatientId, context);
        setReport(result);
        setLastGenerated({ reportType, noteId: latestNote?.id ?? null, savedToNote: false });
        return;
      }

      if (reportType === "MDT_WARD") {
        const result = await generateMDTReview(selectedPatientId, context);
        setReport(result);
        setLastGenerated({ reportType, noteId: latestNote?.id ?? null, savedToNote: false });
        return;
      }

      // Clinical notes are immutable: generate preview output only.
      if (!latestNote?.id) throw new Error("No latest clinical note available for this patient.");

      const contextNotes = (notes ?? [])
        .slice()
        .sort(
          (a, b) =>
            (b?.createdAt?.toMillis?.() ?? 0) - (a?.createdAt?.toMillis?.() ?? 0)
        )
        .slice(0, 20)
        .map((n) => ({
          rawNote: String(n?.content ?? ""),
          correctedNote: n?.correctedNote ?? null,
          structuredSummary: n?.structured?.summary ?? null,
        }))
        .filter((x) => x.rawNote.trim());

      if (!contextNotes.length) throw new Error("No notes available to build the report context.");

      const discipline = String(latestNote?.discipline ?? "Clinical");

      const aiReportType =
        reportType === "CPA" ? "cpa" : reportType === "TRIBUNAL" ? "tribunal" : "mdtReview";
      const section = await generateClinicalReportSection({
        reportType: aiReportType,
        patientId: selectedPatientId,
        discipline,
        contextNotes,
      });

      if (reportType === "MDT") {
        // Persist the existing MDT Review core-flow, but render in MDT Ward Round-style grouping for consistency.
        const grouped = {};
        (notes ?? []).forEach((n) => {
          const role =
            typeof n?.mdtRole === "string" && n.mdtRole.trim() ? n.mdtRole.trim() : "General";
          if (!grouped[role]) grouped[role] = [];
          const text = n?.aiSummary || n?.correctedText || n?.content;
          if (typeof text === "string" && text.trim()) grouped[role].push(text.trim());
        });
        setReport(grouped);
      } else {
        setReport(section);
      }
      setLastGenerated({ reportType, noteId: latestNote.id, savedToNote: false });
    } catch (e) {
      setReportError(e?.message ?? "Clinical report generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ padding: "2rem", width: "100%", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>AI Reports</h1>
        <Link to="/patients" style={{ color: "#005eb8", fontWeight: 800, textDecoration: "none" }}>
          Patients
        </Link>
      </div>

      <ActionBar
        actions={[
          {
            label: "⚡ Weekly Summary",
            type: "generate",
            onClick: () => generateWeeklySummary(),
          },
          {
            label: "⚡ Monthly Summary",
            type: "generate",
            onClick: () => generateMonthlySummary(),
          },
          {
            label: "⚡ Tribunal Report",
            type: "generate",
            onClick: () => generateTribunal(),
          },
          {
            label: "⚡ CPA Report",
            type: "generate",
            onClick: () => generateCPA(),
          },
          {
            label: "⚡ MDT Ward Round",
            type: "set",
            onClick: () => setReportType("MDT_WARD"),
          },
          {
            label: "⚡ Management Hearing",
            type: "set",
            onClick: () => setReportType("MANAGEMENT"),
          },
        ]}
      />

      {!organisationId ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          Organisation context missing. Navigation is allowed but report generation may fail.
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 }}>
        <label style={{ fontWeight: 900 }}>
          Patient:
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            disabled={patientsLoading || patientOptions.length === 0}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {patientOptions.length ? (
              patientOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))
            ) : (
              <option value="">No patients</option>
            )}
          </select>
        </label>

        <label style={{ fontWeight: 900 }}>
          Report type:
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{ marginLeft: 10, padding: "6px 10px" }}
          >
            {REPORT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !selectedPatientId || notesLoading}
          style={{
            padding: "10px 16px",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: generating ? "not-allowed" : "pointer",
            fontWeight: 800,
          }}
        >
          {generating ? "Generating…" : "Generate report"}
        </button>
      </div>
      {immutableClinicalRecords ? (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 12, borderRadius: 10, color: "#92400e", marginTop: 14, fontWeight: 800 }}>
          This record cannot be edited. Add addendum instead.
        </div>
      ) : null}

      {patientsError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {patientsError}
        </div>
      ) : null}

      {notesError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {notesError}
        </div>
      ) : null}

      {lastGenerated ? (
        <div style={{ background: "#ecfdf5", border: "1px solid #bbf7d0", padding: 12, borderRadius: 10, color: "#166534", marginTop: 14 }}>
          Generated {lastGenerated.reportType} report
          {lastGenerated.savedToNote ? (
            <>
              . Saved to note: <code>{lastGenerated.noteId}</code>
            </>
          ) : (
            <> (not saved to note)</>
          )}
        </div>
      ) : null}

      {reportError ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 10, color: "#991b1b", marginTop: 14 }}>
          {reportError}
        </div>
      ) : null}

      {reportType === "MDT" || reportType === "MDT_WARD" ? (
        report ? (
          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 14, marginBottom: 10 }}>MDT Output</h2>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
              {Object.entries(report || {}).map(([role, notes]) => (
                <div key={role} style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: "0 0 6px 0", fontSize: 13 }}>{role}</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(notes ?? []).map((n, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>{String(n ?? "")}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null
      ) : (
        report ? (
          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 14, marginBottom: 10 }}>Report Output</h2>
            <pre
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: 14,
                margin: 0,
                fontSize: 12,
                whiteSpace: "pre-wrap",
                color: "#0f172a",
              }}
            >
              {JSON.stringify(report, null, 2)}
            </pre>
          </div>
        ) : null
      )}

      <div style={{ marginTop: 22 }}>
        <h2 style={{ fontSize: 14, marginBottom: 10 }}>Latest note context</h2>
        {latestNote ? (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 900 }}>{latestNote.discipline}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{toIsoMillis(latestNote.createdAt) || "—"}</div>
            </div>
            <div style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "#0f172a", fontSize: 13 }}>
              {(latestNote.correctedNote ?? latestNote.content ?? "").slice(0, 500)}
              {(latestNote.correctedNote ?? latestNote.content ?? "").length > 500 ? "…" : ""}
            </div>
          </div>
        ) : (
          <div style={{ color: "#64748b" }}>{notesLoading ? "Loading notes…" : "No clinical notes found for this patient."}</div>
        )}
      </div>
    </div>
  );
}

