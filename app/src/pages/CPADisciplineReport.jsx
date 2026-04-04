/** Discipline-specific CPA report: per-section AI, MDT summaries, PDF by discipline; hidden in care settings. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePatients } from "../hooks/usePatients";
import { isCareSetting } from "../utils/orgHelpers";
import {
  CPA_DISCIPLINE_OPTIONS,
  getCpaTemplateForDiscipline,
  mapCanonicalDisciplineToCpaKey,
  cpaDisciplineDisplayName,
} from "../templates/cpa/index";
import {
  isPrivilegedReportRole,
  normalizeUserDiscipline,
} from "../utils/reportDiscipline";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { listPhysicalObservationsForPatient } from "../services/physicalObservationsService";
import { listCarePlansForPatient } from "../services/carePlanManagementService";
import { buildMdtSummaryForCpa } from "../services/mdtSummaryEngine";
import { generateCPASection } from "../services/ai/cpaSectionGenerator";
import {
  createCpaDisciplineReport,
  getCpaDisciplineReportById,
  listCpaDisciplineReportsForPatient,
  updateCpaDisciplineReport,
} from "../services/cpaDisciplineReportService";
import { exportCpaDisciplinePdf } from "../utils/cpaDisciplinePdf";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function emptySectionsForTemplate(template) {
  const o = {};
  template.forEach((row) => {
    o[String(row.id)] = { text: "", dataUsed: null, generatedAt: null, limitedData: false };
  });
  return o;
}

function mergeSections(raw, template) {
  const base = emptySectionsForTemplate(template);
  if (!raw || typeof raw !== "object") return base;
  Object.keys(base).forEach((k) => {
    if (raw[k] != null && typeof raw[k] === "object") {
      const r = raw[k];
      base[k] = {
        ...base[k],
        ...r,
        text: r.text != null ? String(r.text) : base[k].text,
        dataUsed: r.dataUsed !== undefined ? r.dataUsed : base[k].dataUsed,
        generatedAt: r.generatedAt !== undefined ? r.generatedAt : base[k].generatedAt,
        limitedData: Boolean(r.limitedData),
      };
    }
  });
  return base;
}

function stringifyDataUsedForView(obj) {
  try {
    return JSON.stringify(
      obj,
      (_key, value) => {
        if (value != null && typeof value === "object" && typeof value.toDate === "function") {
          try {
            return value.toDate().toISOString();
          } catch {
            return String(value);
          }
        }
        return value;
      },
      2
    );
  } catch {
    return String(obj);
  }
}

function hasViewableDataUsed(section) {
  const d = section?.dataUsed;
  if (d == null || typeof d !== "object") return false;
  return Object.keys(d).length > 0;
}

function safeName(patient) {
  if (!patient) return "Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || patient.name || patient.id || "Patient";
}

export default function CPADisciplineReport() {
  const { organisationId, organisation, organisationName, userProfile, isPlatformAdmin } = useOrganisation();
  const { user } = useAuth();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();
  const [searchParams, setSearchParams] = useSearchParams();

  const careSetting = isCareSetting(organisation?.type);

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

  const userCanonical = useMemo(
    () => normalizeUserDiscipline(userProfile?.mdtRole, userProfile?.role),
    [userProfile?.mdtRole, userProfile?.role]
  );
  const autoDisciplineKey = useMemo(() => mapCanonicalDisciplineToCpaKey(userCanonical), [userCanonical]);

  const showDisciplineSelect =
    isPrivilegedReportRole(userProfile?.role) ||
    isPrivilegedReportRole(userProfile?.systemRole) ||
    Boolean(isPlatformAdmin);

  const [selectedDisciplineKey, setSelectedDisciplineKey] = useState(autoDisciplineKey);

  useEffect(() => {
    if (!showDisciplineSelect) setSelectedDisciplineKey(autoDisciplineKey);
  }, [autoDisciplineKey, showDisciplineSelect]);

  const effectiveDisciplineKey = showDisciplineSelect ? selectedDisciplineKey : autoDisciplineKey;
  const template = useMemo(() => getCpaTemplateForDiscipline(effectiveDisciplineKey), [effectiveDisciplineKey]);

  const [sections, setSections] = useState(() => emptySectionsForTemplate(template));
  const [status, setStatus] = useState("draft");
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => {
    const k = String(id);
    setExpanded((e) => ({ ...e, [k]: !e[k] }));
  };

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) ?? null,
    [patients, selectedPatientId]
  );

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
  const [viewDataSectionKey, setViewDataSectionKey] = useState(null);

  const mdtSummaryText = useMemo(() => buildMdtSummaryForCpa(notes), [notes]);

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
        fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 50 }),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 35 }).catch(() => []),
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 35 }).catch(() => []),
        listPhysicalObservationsForPatient(organisationId, selectedPatientId, { limitCount: 25 }).catch(() => []),
        listCarePlansForPatient(organisationId, selectedPatientId, { limitCount: 20 }).catch(() => []),
      ]);
      setNotes(Array.isArray(n) ? n : []);
      setIncidents(Array.isArray(inc) ? inc : []);
      setBehaviourLogs(Array.isArray(beh) ? beh : []);
      setPhysicalHealth(Array.isArray(phys) ? phys : []);
      setCarePlans(Array.isArray(cp) ? cp : []);
    } catch (e) {
      setLoadError(e?.message ?? "Failed to load data");
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
      const rows = await listCpaDisciplineReportsForPatient(organisationId, selectedPatientId, { limitCount: 25 });
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
      const row = await getCpaDisciplineReportById(id);
      if (!row?.data) return;
      const docPatient = (row.data.patientId ?? "").toString().trim();
      if (selectedPatientId && docPatient && docPatient !== selectedPatientId) {
        setLoadError("This report is for a different patient.");
        return;
      }
      setLoadError(null);
      const dkRaw = row.data.disciplineKey;
      const validKey = CPA_DISCIPLINE_OPTIONS.some((o) => o.value === dkRaw) ? dkRaw : autoDisciplineKey;
      if (showDisciplineSelect && validKey) setSelectedDisciplineKey(validKey);
      const tpl = getCpaTemplateForDiscipline(validKey);
      setSections(mergeSections(row.data.sections, tpl));
      setStatus(typeof row.data.status === "string" ? row.data.status : "draft");
    },
    [selectedPatientId, showDisciplineSelect, autoDisciplineKey]
  );

  useEffect(() => {
    if (currentReportId) return;
    setSections(emptySectionsForTemplate(getCpaTemplateForDiscipline(effectiveDisciplineKey)));
    setStatus("draft");
  }, [currentReportId, effectiveDisciplineKey]);

  useEffect(() => {
    if (!currentReportId) return;
    void loadReportDoc(currentReportId);
  }, [currentReportId, loadReportDoc]);

  const updateText = (id, text) => {
    setSections((prev) => ({
      ...prev,
      [String(id)]: { ...prev[String(id)], text },
    }));
  };

  const handleGenerateSection = async (row) => {
    const key = String(row.id);
    if (!organisationId || !selectedPatientId) return;
    setAiLoading((m) => ({ ...m, [key]: true }));
    try {
      const out = await generateCPASection({
        discipline: effectiveDisciplineKey,
        sectionName: row.title,
        patientId: selectedPatientId,
        organisationId,
      });
      const key = String(row.id);
      setSections((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          text: out.content,
          dataUsed: out.dataUsed ?? null,
          generatedAt: out.generatedAt ?? null,
          limitedData: Boolean(out.limitedData),
        },
      }));
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
        await updateCpaDisciplineReport(currentReportId, {
          sections,
          status,
          disciplineKey: effectiveDisciplineKey,
          updatedBy: uid,
        });
      } else {
        const id = await createCpaDisciplineReport({
          organisationId,
          patientId: selectedPatientId,
          disciplineKey: effectiveDisciplineKey,
          sections,
          status,
          createdBy: uid,
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
    setSections(emptySectionsForTemplate(template));
    setStatus("draft");
    setSearchParams(selectedPatientId ? { patient: selectedPatientId } : {});
  };

  if (!organisationId) {
    return (
      <div style={{ padding: 24 }}>
        <p>Select an organisation.</p>
      </div>
    );
  }

  if (careSetting) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <h1 style={{ marginTop: 0 }}>Discipline CPA reports</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          Discipline-specific CPA reports are not used in care-home style organisations. Use the{" "}
          <strong>Management Hearing</strong> report and other care-appropriate tools in AI Reports.
        </p>
        <Link to="/reports" style={{ color: "#2563eb", fontWeight: 800 }}>
          Open AI Reports →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 0", maxWidth: 920 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>CPA report (discipline-specific)</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", maxWidth: 760, lineHeight: 1.55 }}>
          Each discipline has its own CPA section template. AI generates <strong>one section at a time</strong> from
          clinical notes, incidents, behaviour logs, care monitoring logs, physical health observations, medications,
          MDT review extracts, and aggregated MDT summaries derived from notes.
        </p>
        <p style={{ color: "#92400e", margin: "10px 0 0", fontSize: 14 }}>
          Supports decision-making only. Verify all content against the clinical record.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Discipline &amp; patient</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          {showDisciplineSelect ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Discipline template</span>
              <select
                value={selectedDisciplineKey}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedDisciplineKey(v);
                  setCurrentReportId("");
                  setSections(emptySectionsForTemplate(getCpaTemplateForDiscipline(v)));
                }}
                style={{ minWidth: 240, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                {CPA_DISCIPLINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={{ fontSize: 14 }}>
              <strong>Your discipline:</strong> {cpaDisciplineDisplayName(autoDisciplineKey)} (template locked to your MDT
              role)
            </div>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedPatientId(v);
                setCurrentReportId("");
                setSections(emptySectionsForTemplate(template));
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
              style={{ minWidth: 220, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              <option value="">New report</option>
              {savedList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)}… · {r.data?.disciplineKey ?? ""} · {r.data?.status ?? ""}
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
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>MDT summary (auto, from notes)</h2>
        <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 13 }}>
          Nursing / psychiatry / psychology / OT / SALT / support buckets — fed into each section AI call with other
          data.
        </p>
        <pre
          style={{
            margin: 0,
            maxHeight: 180,
            overflow: "auto",
            fontSize: 11,
            lineHeight: 1.45,
            background: "#f8fafc",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            whiteSpace: "pre-wrap",
          }}
        >
          {mdtSummaryText || "—"}
        </pre>
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
        <p style={{ color: "#64748b" }}>Select a patient to edit sections.</p>
      ) : (
        template.map((row) => {
          const key = String(row.id);
          const isOpen = expanded[key] !== false;
          return (
            <div key={row.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => toggle(row.id)}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    disabled={!!aiLoading[key]}
                    onClick={() => void handleGenerateSection(row)}
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
                    {aiLoading[key]
                      ? "Generating…"
                      : (sections[key]?.text ?? "").toString().trim()
                        ? "Regenerate with AI"
                        : "Generate with AI"}
                  </button>
                  {hasViewableDataUsed(sections[key]) ? (
                    <button
                      type="button"
                      onClick={() => setViewDataSectionKey(key)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #cbd5e1",
                        background: "#f8fafc",
                        color: "#334155",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      View data used
                    </button>
                  ) : null}
                </div>
              </div>
              {sections[key]?.limitedData ? (
                <p
                  style={{
                    margin: "10px 0 0",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "#fffbeb",
                    border: "1px solid #fcd34d",
                    color: "#92400e",
                    fontSize: 13,
                    lineHeight: 1.45,
                  }}
                >
                  ⚠️ Limited data available for this section
                </p>
              ) : null}
              {isOpen ? (
                <textarea
                  value={sections[key]?.text ?? ""}
                  onChange={(e) => updateText(row.id, e.target.value)}
                  rows={7}
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
                  {(sections[key]?.text ?? "").toString().trim().slice(0, 100)}…
                </p>
              )}
            </div>
          );
        })
      )}

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
          onClick={() =>
            exportCpaDisciplinePdf(effectiveDisciplineKey, template, sections, {
              patientLabel: safeName(selectedPatient),
              organisationName: organisationName ?? "",
              authorLabel: user?.displayName || user?.email || "—",
            })
          }
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

        <Link to="/reports" style={{ alignSelf: "center", color: "#64748b", fontWeight: 700 }}>
          AI Reports (other types) →
        </Link>
        {selectedPatientId ? (
          <Link to={`/patients/${selectedPatientId}`} style={{ alignSelf: "center", color: "#2563eb", fontWeight: 700 }}>
            Patient profile →
          </Link>
        ) : null}
      </div>

      {viewDataSectionKey && sections[viewDataSectionKey]?.dataUsed ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Source data used for section"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setViewDataSectionKey(null)}
          onKeyDown={(e) => e.key === "Escape" && setViewDataSectionKey(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              maxWidth: 720,
              width: "100%",
              maxHeight: "85vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>Data used for this section</h2>
              <button
                type="button"
                onClick={() => setViewDataSectionKey(null)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <div style={{ padding: 12, overflow: "auto", flex: 1 }}>
              {sections[viewDataSectionKey]?.generatedAt ? (
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
                  Generated at: {String(sections[viewDataSectionKey].generatedAt)}
                </p>
              ) : null}
              <pre
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  background: "#f8fafc",
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                }}
              >
                {stringifyDataUsedForView(sections[viewDataSectionKey].dataUsed)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
