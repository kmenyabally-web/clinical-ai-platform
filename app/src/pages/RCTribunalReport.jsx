/** Responsible Clinician tribunal report — RC / Consultant Psychiatrist only; per-section AI; rc_reports save + PDF. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePatients } from "../hooks/usePatients";
import { getCurrentUserProfile } from "../services/organisation";
import { rcTemplate } from "../templates/rcTribunalTemplate";
import { canAccessRCTribunalReport } from "../utils/rcTribunalAccess";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { listPhysicalObservationsForPatient } from "../services/physicalObservationsService";
import { listCarePlansForPatient } from "../services/carePlanManagementService";
import { getPatientById } from "../services/patientService";
import { buildRcTribunalEvidenceContext } from "../services/rcReportEvidence";
import { generateRcTribunalSectionAI } from "../services/rcTribunalAi";
import {
  createRcReport,
  getRcReportById,
  listRcReportsForPatient,
  updateRcReport,
} from "../services/rcReportService";
import { exportRcTribunalReportPdf } from "../utils/rcTribunalPdf";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function headerDefaults() {
  return {
    patientName: "",
    dateOfBirth: "",
    nhsNumber: "",
    wardLocation: "",
    mhaSection: "",
    dateOfAdmission: "",
    hospitalName: "",
    reportDate: "",
  };
}

function buildInitialSections() {
  const o = {
    header: { structured: headerDefaults() },
  };
  rcTemplate.forEach((row) => {
    if (row.id === "header") return;
    o[String(row.id)] = { text: "" };
  });
  return o;
}

function mergeSectionsFromFirestore(raw) {
  const base = buildInitialSections();
  if (!raw || typeof raw !== "object") return base;
  Object.keys(base).forEach((k) => {
    if (raw[k] != null && typeof raw[k] === "object") {
      base[k] = { ...base[k], ...raw[k] };
      if (k === "header" && raw[k].structured && typeof raw[k].structured === "object") {
        base[k].structured = { ...headerDefaults(), ...raw[k].structured };
      }
    }
  });
  return base;
}

function safeName(patient) {
  if (!patient) return "Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || patient.name || patient.id || "Patient";
}

function formatDobValue(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.slice(0, 10);
  if (typeof v.toDate === "function") {
    try {
      return v.toDate().toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function RCTribunalReport() {
  const { organisationId, organisation } = useOrganisation();
  const { user } = useAuth();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();
  const [searchParams, setSearchParams] = useSearchParams();

  const [userProfile, setUserProfile] = useState(null);
  useEffect(() => {
    if (!user?.uid) {
      setUserProfile(null);
      return;
    }
    void getCurrentUserProfile(user.uid).then(setUserProfile);
  }, [user?.uid]);

  const allowed = useMemo(() => canAccessRCTribunalReport(userProfile?.mdtRole), [userProfile?.mdtRole]);

  const patientFromQuery = (searchParams.get("patient") ?? "").trim();
  const reportFromQuery = (searchParams.get("report") ?? "").trim();
  const [selectedPatientId, setSelectedPatientId] = useState(patientFromQuery);
  const [currentReportId, setCurrentReportId] = useState(reportFromQuery);

  useEffect(() => {
    if (patientFromQuery) setSelectedPatientId(patientFromQuery);
  }, [patientFromQuery]);

  useEffect(() => {
    if (reportFromQuery) setCurrentReportId(reportFromQuery);
  }, [reportFromQuery]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

  const [sections, setSections] = useState(buildInitialSections);
  const [status, setStatus] = useState("draft");
  const [signature, setSignature] = useState({
    rcName: "",
    designation: "",
    signedDate: "",
    typedSignature: "",
  });

  const [expanded, setExpanded] = useState(() => {
    const e = { header: true };
    rcTemplate.forEach((row) => {
      if (row.id !== "header") e[String(row.id)] = false;
    });
    return e;
  });

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [notes, setNotes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [behaviourLogs, setBehaviourLogs] = useState([]);
  const [physicalHealth, setPhysicalHealth] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [aiLoading, setAiLoading] = useState({});

  const evidenceText = useMemo(
    () =>
      buildRcTribunalEvidenceContext({
        notes,
        incidents,
        behaviourLogs,
        physicalHealth,
        carePlans,
      }),
    [notes, incidents, behaviourLogs, physicalHealth, carePlans]
  );

  const loadEvidence = useCallback(async () => {
    if (!organisationId || !selectedPatientId) {
      setNotes([]);
      setIncidents([]);
      setBehaviourLogs([]);
      setPhysicalHealth([]);
      setCarePlans([]);
      return;
    }
    setEvidenceLoading(true);
    setLoadError(null);
    try {
      const [n, inc, beh, phys, cp] = await Promise.all([
        fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 45 }),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 40 }).catch(() => []),
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 40 }).catch(() => []),
        listPhysicalObservationsForPatient(organisationId, selectedPatientId, { limitCount: 30 }).catch(() => []),
        listCarePlansForPatient(organisationId, selectedPatientId, { limitCount: 25 }).catch(() => []),
      ]);
      setNotes(Array.isArray(n) ? n : []);
      setIncidents(Array.isArray(inc) ? inc : []);
      setBehaviourLogs(Array.isArray(beh) ? beh : []);
      setPhysicalHealth(Array.isArray(phys) ? phys : []);
      setCarePlans(Array.isArray(cp) ? cp : []);
    } catch (e) {
      setLoadError(e?.message ?? "Failed to load evidence");
    } finally {
      setEvidenceLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const loadSavedList = useCallback(async () => {
    if (!organisationId || !selectedPatientId) {
      setSavedList([]);
      return;
    }
    setListLoading(true);
    try {
      const rows = await listRcReportsForPatient(organisationId, selectedPatientId, { limitCount: 25 });
      setSavedList(rows);
    } catch {
      setSavedList([]);
    } finally {
      setListLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void loadSavedList();
  }, [loadSavedList]);

  const loadReportDoc = useCallback(
    async (id) => {
      if (!id) return;
      const row = await getRcReportById(id);
      if (!row?.data) return;
      const docPatient = (row.data.patientId ?? "").toString().trim();
      if (selectedPatientId && docPatient && docPatient !== selectedPatientId) {
        setLoadError("This report belongs to a different patient. Select the correct patient first.");
        return;
      }
      setLoadError(null);
      setSections(mergeSectionsFromFirestore(row.data.sections));
      setStatus(typeof row.data.status === "string" ? row.data.status : "draft");
      const sig = row.data.signature && typeof row.data.signature === "object" ? row.data.signature : {};
      setSignature({
        rcName: sig.rcName != null ? String(sig.rcName) : "",
        designation: sig.designation != null ? String(sig.designation) : "",
        signedDate: sig.signedDate != null ? String(sig.signedDate) : "",
        typedSignature: sig.typedSignature != null ? String(sig.typedSignature) : "",
      });
    },
    [selectedPatientId]
  );

  useEffect(() => {
    if (!currentReportId) {
      setSections(buildInitialSections());
      setStatus("draft");
      setSignature({ rcName: "", designation: "", signedDate: "", typedSignature: "" });
      return;
    }
    void loadReportDoc(currentReportId);
  }, [currentReportId, loadReportDoc]);

  useEffect(() => {
    if (!selectedPatientId || currentReportId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPatientById(selectedPatientId);
        if (cancelled || !p) return;
        const orgName = organisation?.name ? String(organisation.name) : "";
        setSections((prev) => ({
          ...prev,
          header: {
            structured: {
              ...prev.header.structured,
              patientName: safeName(p),
              dateOfBirth: formatDobValue(p.dob ?? p.dateOfBirth),
              nhsNumber: (p.nhsNumber ?? "").toString(),
              wardLocation: (p.wardId ?? p.wardName ?? "").toString(),
              hospitalName: orgName || prev.header.structured.hospitalName,
              reportDate: todayIsoDate(),
            },
          },
        }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPatientId, currentReportId, organisation?.name]);

  useEffect(() => {
    if (!userProfile?.displayName && !userProfile?.mdtRole) return;
    setSignature((s) => ({
      ...s,
      rcName: s.rcName || userProfile?.displayName || "",
      designation: s.designation || userProfile?.mdtRole || "",
    }));
  }, [userProfile?.displayName, userProfile?.mdtRole]);

  const updateHeaderField = (field, value) => {
    setSections((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        structured: { ...prev.header.structured, [field]: value },
      },
    }));
  };

  const updateTextSection = (id, text) => {
    setSections((prev) => ({
      ...prev,
      [String(id)]: { ...prev[String(id)], text },
    }));
  };

  const handleGenerateAI = async (row) => {
    if (row.id === "header") return;
    const key = String(row.id);
    setAiLoading((m) => ({ ...m, [key]: true }));
    try {
      const text = await generateRcTribunalSectionAI({
        sectionTitle: row.title,
        sectionNumber: row.id,
        evidenceText,
      });
      if (text) updateTextSection(row.id, text.trim());
    } finally {
      setAiLoading((m) => ({ ...m, [key]: false }));
    }
  };

  const handleSave = async () => {
    if (!organisationId || !selectedPatientId) return;
    setSaveBusy(true);
    try {
      const uid = user?.uid ?? null;
      if (currentReportId) {
        await updateRcReport(currentReportId, {
          sections,
          status,
          signature,
          updatedBy: uid,
        });
      } else {
        const id = await createRcReport({
          organisationId,
          patientId: selectedPatientId,
          sections,
          status,
          signature,
          createdBy: uid,
          authorRole: "RC",
        });
        setCurrentReportId(id);
        setSearchParams({ patient: selectedPatientId, report: id });
      }
      await loadSavedList();
    } catch (e) {
      setLoadError(e?.message ?? "Save failed");
    } finally {
      setSaveBusy(false);
    }
  };

  const handleNewReport = () => {
    setCurrentReportId("");
    setSections(buildInitialSections());
    setStatus("draft");
    setSignature({ rcName: userProfile?.displayName || "", designation: userProfile?.mdtRole || "", signedDate: "", typedSignature: "" });
    setSearchParams(selectedPatientId ? { patient: selectedPatientId } : {});
  };

  if (!organisationId) {
    return (
      <div style={{ padding: 24 }}>
        <p>Select an organisation.</p>
      </div>
    );
  }

  if (user?.uid && userProfile === null) {
    return (
      <div style={{ padding: 24 }}>
        <p>Loading profile…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <h1 style={{ marginTop: 0 }}>Responsible Clinician tribunal report</h1>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            lineHeight: 1.6,
          }}
        >
          <strong>Access restricted.</strong> This report is only available to users whose clinical discipline (MDT role)
          is <strong>Responsible Clinician</strong> or <strong>Consultant Psychiatrist</strong> (including &quot;Psychiatrist
          (Consultant)&quot;). Your current MDT role:{" "}
          <strong>{userProfile?.mdtRole || "—"}</strong>.
        </div>
        <p style={{ marginTop: 16 }}>
          <Link to="/dashboard" style={{ color: "#2563eb", fontWeight: 700 }}>
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 0", maxWidth: 920 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>Responsible Clinician — tribunal report</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", maxWidth: 760, lineHeight: 1.55 }}>
          Section-by-section editor with separate AI generation per section (no full-report auto-generation). Header can be
          completed from patient and organisation data; verify all legal identifiers before finalising.
        </p>
        <p style={{ color: "#92400e", margin: "10px 0 0", fontSize: 14 }}>
          Tribunal-ready clinical narrative only — verify against the record. Supports decision-making; not legal advice.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Patient &amp; saved reports</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedPatientId(v);
                setCurrentReportId("");
                setSections(buildInitialSections());
                setSearchParams(v ? { patient: v } : {});
              }}
              style={{ minWidth: 220, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {safeName(p)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Saved report</span>
            <select
              value={currentReportId}
              onChange={(e) => {
                const v = e.target.value;
                setCurrentReportId(v);
                setSearchParams(
                  selectedPatientId ? { patient: selectedPatientId, ...(v ? { report: v } : {}) } : {}
                );
              }}
              disabled={!selectedPatientId || listLoading}
              style={{ minWidth: 240, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              <option value="">New report</option>
              {savedList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)}… · {r.data?.status ?? "draft"}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleNewReport}
            disabled={!selectedPatientId}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontWeight: 700,
              cursor: selectedPatientId ? "pointer" : "not-allowed",
            }}
          >
            New report
          </button>
        </div>
        {patientsLoading ? <p style={{ color: "#64748b", marginTop: 10 }}>Loading patients…</p> : null}
        {patientsError ? <p style={{ color: "#b91c1c", marginTop: 10 }}>{patientsError}</p> : null}
        {loadError ? <p style={{ color: "#b91c1c", marginTop: 10 }}>{loadError}</p> : null}
        {evidenceLoading ? <p style={{ color: "#64748b", marginTop: 10 }}>Loading clinical sources…</p> : null}
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Status</h2>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
          <option value="signed">Signed</option>
        </select>
      </div>

      {!selectedPatientId ? (
        <p style={{ color: "#64748b" }}>Select a patient to begin.</p>
      ) : (
        rcTemplate.map((row) => {
          const key = row.id === "header" ? "header" : String(row.id);
          const isOpen = expanded[key];

          if (row.id === "header") {
            const st = sections.header?.structured ?? headerDefaults();
            return (
              <div key="header" style={card}>
                <button
                  type="button"
                  onClick={() => toggleExpanded("header")}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Patient &amp; MHA identifiers</h2>
                  <span style={{ fontSize: 18 }}>{isOpen ? "▼" : "▶"}</span>
                </button>
                {isOpen ? (
                  <div style={{ display: "grid", gap: 10, marginTop: 14, maxWidth: 560 }}>
                    {[
                      ["patientName", "Patient name"],
                      ["dateOfBirth", "Date of birth"],
                      ["nhsNumber", "NHS number"],
                      ["wardLocation", "Ward / unit"],
                      ["mhaSection", "Mental Health Act section (as recorded)"],
                      ["dateOfAdmission", "Date of admission (as recorded)"],
                      ["hospitalName", "Hospital / provider"],
                      ["reportDate", "Report date"],
                    ].map(([field, label]) => (
                      <label key={field} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        <span style={{ fontWeight: 700 }}>{label}</span>
                        <input
                          value={st[field] ?? ""}
                          onChange={(e) => updateHeaderField(field, e.target.value)}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          const sec = sections[String(row.id)] ?? { text: "" };
          return (
            <div key={row.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => toggleExpanded(key)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{isOpen ? "▼" : "▶"}</span>
                  <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>
                    {row.id}. {row.title}
                  </h3>
                </button>
                <button
                  type="button"
                  disabled={!!aiLoading[key] || evidenceLoading}
                  onClick={() => handleGenerateAI(row)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #2563eb",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: aiLoading[key] ? "wait" : "pointer",
                  }}
                >
                  {aiLoading[key] ? "Generating…" : "Generate with AI"}
                </button>
              </div>
              {isOpen ? (
                <textarea
                  value={sec.text ?? ""}
                  onChange={(e) => updateTextSection(row.id, e.target.value)}
                  rows={8}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                />
              ) : (
                <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: 13 }}>
                  {(sec.text ?? "").toString().trim().slice(0, 120)}
                  {(sec.text ?? "").toString().trim().length > 120 ? "…" : ""}
                </p>
              )}
            </div>
          );
        })
      )}

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Signature</h2>
        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>RC name</span>
            <input
              value={signature.rcName}
              onChange={(e) => setSignature((s) => ({ ...s, rcName: e.target.value }))}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Designation</span>
            <input
              value={signature.designation}
              onChange={(e) => setSignature((s) => ({ ...s, designation: e.target.value }))}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Date</span>
            <input
              type="date"
              value={signature.signedDate}
              onChange={(e) => setSignature((s) => ({ ...s, signedDate: e.target.value }))}
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Typed signature</span>
            <input
              value={signature.typedSignature}
              onChange={(e) => setSignature((s) => ({ ...s, typedSignature: e.target.value }))}
              placeholder="Type full name as signature"
              style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <button
          type="button"
          disabled={saveBusy || !selectedPatientId}
          onClick={() => void handleSave()}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 800,
            cursor: saveBusy || !selectedPatientId ? "not-allowed" : "pointer",
          }}
        >
          {saveBusy ? "Saving…" : "Save report"}
        </button>
        <button
          type="button"
          disabled={!selectedPatientId}
          onClick={() => exportRcTribunalReportPdf({ sections, signature })}
          style={{
            padding: "12px 20px",
            borderRadius: 10,
            border: "1px solid #0f766e",
            background: "#ecfdf5",
            color: "#0f766e",
            fontWeight: 800,
            cursor: selectedPatientId ? "pointer" : "not-allowed",
          }}
        >
          Export PDF
        </button>
        {selectedPatientId ? (
          <Link to={`/patients/${selectedPatientId}`} style={{ alignSelf: "center", color: "#2563eb", fontWeight: 700 }}>
            Patient profile →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
