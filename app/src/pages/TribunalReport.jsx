/** Tribunal nursing report: structured sections, per-section AI, Firestore save, PDF export. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useAuth } from "../context/AuthContext";
import { usePatients } from "../hooks/usePatients";
import { tribunalTemplate } from "../templates/tribunalNursingReport";
import { fetchClinicalNotesForPatient } from "../services/noteService";
import { fetchIncidentsForPatient } from "../services/incidentService";
import { fetchStructuredBehaviourLogsForPatient } from "../services/behaviourService";
import { listPhysicalObservationsForPatient } from "../services/physicalObservationsService";
import {
  buildTribunalEvidenceContext,
  generateTribunalSectionAI,
  parseYesNoPrefix,
} from "../services/tribunalReportAi";
import {
  createTribunalReport,
  getTribunalReportById,
  listTribunalReportsForPatient,
  updateTribunalReport,
} from "../services/tribunalReportService";
import { exportTribunalNursingReportPdf } from "../utils/tribunalReportPdf";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function buildInitialSections() {
  const o = {};
  tribunalTemplate.forEach((row) => {
    const k = String(row.id);
    if (row.type === "structured") {
      o[k] = {
        structured: {
          fullName: "",
          dateOfBirth: "",
          nhsNumber: "",
          wardLocation: "",
          responsibleClinician: "",
          legalStatus: "",
        },
      };
    } else if (row.type === "yesno") {
      o[k] = { yesNo: "" };
    } else if (row.type === "yesno_text") {
      o[k] = { yesNo: "", text: "" };
    } else {
      o[k] = { text: "" };
    }
  });
  return o;
}

function mergeSectionsFromFirestore(raw) {
  const base = buildInitialSections();
  if (!raw || typeof raw !== "object") return base;
  Object.keys(base).forEach((k) => {
    if (raw[k] != null && typeof raw[k] === "object") {
      base[k] = { ...base[k], ...raw[k] };
      if (base[k].structured && raw[k].structured && typeof raw[k].structured === "object") {
        base[k].structured = { ...buildInitialSections()[k].structured, ...raw[k].structured };
      }
    }
  });
  return base;
}

function safeName(patient) {
  if (!patient) return "Patient";
  return [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || patient.name || patient.id || "Patient";
}

export default function TribunalReport() {
  const { organisationId } = useOrganisation();
  const { user } = useAuth();
  const { data: patients = [], loading: patientsLoading, error: patientsError } = usePatients();
  const [searchParams, setSearchParams] = useSearchParams();

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
    typedName: "",
    signedDate: "",
    signatureDataUrl: null,
  });

  const [notes, setNotes] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [behaviourLogs, setBehaviourLogs] = useState([]);
  const [physicalHealth, setPhysicalHealth] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveBusy, setSaveBusy] = useState(false);
  const [aiLoading, setAiLoading] = useState({});

  const evidenceText = useMemo(
    () => buildTribunalEvidenceContext({ notes, incidents, behaviourLogs, physicalHealth }),
    [notes, incidents, behaviourLogs, physicalHealth]
  );

  const loadEvidence = useCallback(async () => {
    if (!organisationId || !selectedPatientId) {
      setNotes([]);
      setIncidents([]);
      setBehaviourLogs([]);
      setPhysicalHealth([]);
      return;
    }
    setEvidenceLoading(true);
    setLoadError(null);
    try {
      const [n, inc, beh, phys] = await Promise.all([
        fetchClinicalNotesForPatient(selectedPatientId, { limitCount: 40 }),
        fetchIncidentsForPatient(selectedPatientId, { limitCount: 40 }).catch(() => []),
        fetchStructuredBehaviourLogsForPatient(selectedPatientId, { limitCount: 40 }).catch(() => []),
        listPhysicalObservationsForPatient(organisationId, selectedPatientId, { limitCount: 30 }).catch(() => []),
      ]);
      setNotes(Array.isArray(n) ? n : []);
      setIncidents(Array.isArray(inc) ? inc : []);
      setBehaviourLogs(Array.isArray(beh) ? beh : []);
      setPhysicalHealth(Array.isArray(phys) ? phys : []);
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
      const rows = await listTribunalReportsForPatient(organisationId, selectedPatientId, { limitCount: 25 });
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

  const loadReportDoc = useCallback(async (id) => {
    if (!id) return;
    const row = await getTribunalReportById(id);
    if (!row?.data) return;
    const docPatient = (row.data.patientId ?? "").toString().trim();
    if (selectedPatientId && docPatient && docPatient !== selectedPatientId) {
      setLoadError("This saved report belongs to a different patient. Pick it from the list after selecting the correct patient.");
      return;
    }
    setLoadError(null);
    setSections(mergeSectionsFromFirestore(row.data.sections));
    setStatus(typeof row.data.status === "string" ? row.data.status : "draft");
    const sig = row.data.signature && typeof row.data.signature === "object" ? row.data.signature : {};
    setSignature({
      typedName: sig.typedName != null ? String(sig.typedName) : "",
      signedDate: sig.signedDate != null ? String(sig.signedDate) : "",
      signatureDataUrl: sig.signatureDataUrl != null ? String(sig.signatureDataUrl) : null,
    });
  }, [selectedPatientId]);

  useEffect(() => {
    if (!currentReportId) {
      setSections(buildInitialSections());
      setStatus("draft");
      setSignature({ typedName: "", signedDate: "", signatureDataUrl: null });
      return;
    }
    void loadReportDoc(currentReportId);
  }, [currentReportId, loadReportDoc]);

  useEffect(() => {
    if (!selectedPatientId || currentReportId) return;
    const p = patients.find((x) => x.id === selectedPatientId);
    if (!p) return;
    setSections((prev) => {
      const existing = (prev["1"]?.structured?.fullName ?? "").toString().trim();
      if (existing) return prev;
      return {
        ...prev,
        "1": {
          ...prev["1"],
          structured: { ...prev["1"].structured, fullName: safeName(p) },
        },
      };
    });
  }, [selectedPatientId, currentReportId, patients]);

  const updateSection = (id, patch) => {
    const key = String(id);
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  };

  const updateStructured = (field, value) => {
    setSections((prev) => ({
      ...prev,
      "1": {
        ...prev["1"],
        structured: { ...prev["1"].structured, [field]: value },
      },
    }));
  };

  const handleGenerateAI = async (row) => {
    setAiLoading((m) => ({ ...m, [row.id]: true }));
    try {
      const text = await generateTribunalSectionAI({
        sectionTitle: row.title,
        sectionType: row.type,
        evidenceText,
      });
      if (!text) return;
      const key = String(row.id);
      if (row.type === "yesno" || row.type === "yesno_text") {
        const { yesNo, rest } = parseYesNoPrefix(text);
        setSections((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            ...(yesNo ? { yesNo } : {}),
            ...(row.type === "yesno_text" ? { text: rest || prev[key].text } : {}),
          },
        }));
      } else if (row.type === "text") {
        updateSection(row.id, { text });
      } else if (row.type === "structured") {
        setSections((prev) => ({
          ...prev,
          [key]: { ...prev[key], aiDraft: text },
        }));
      }
    } finally {
      setAiLoading((m) => ({ ...m, [row.id]: false }));
    }
  };

  const handleSave = async () => {
    if (!organisationId || !selectedPatientId) return;
    setSaveBusy(true);
    try {
      const uid = user?.uid ?? null;
      if (currentReportId) {
        await updateTribunalReport(currentReportId, {
          sections,
          status,
          signature,
          updatedBy: uid,
        });
      } else {
        const id = await createTribunalReport({
          organisationId,
          patientId: selectedPatientId,
          sections,
          status,
          signature,
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
    const next = buildInitialSections();
    if (selectedPatientId) {
      const p = patients.find((x) => x.id === selectedPatientId);
      if (p) next["1"].structured.fullName = safeName(p);
    }
    setSections(next);
    setSearchParams(selectedPatientId ? { patient: selectedPatientId } : {});
    setStatus("draft");
    setSignature({ typedName: "", signedDate: "", signatureDataUrl: null });
  };

  const handleSignatureFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 900000) {
      setLoadError("Signature image too large (max ~900KB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result ?? "");
      if (r.length > 500000) {
        setLoadError("Signature image data too large for storage.");
        return;
      }
      setSignature((s) => ({ ...s, signatureDataUrl: r }));
      setLoadError(null);
    };
    reader.readAsDataURL(file);
  };

  const patientSummary = selectedPatient
    ? `Patient: ${safeName(selectedPatient)}${selectedPatient.id ? ` (ID: ${selectedPatient.id})` : ""}`
    : "";

  const renderField = (row) => {
    const key = String(row.id);
    const sec = sections[key] ?? {};

    const aiBtn = (
      <button
        type="button"
        disabled={!!aiLoading[row.id] || !selectedPatientId || evidenceLoading}
        onClick={() => handleGenerateAI(row)}
        style={{
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #2563eb",
          background: "#eff6ff",
          color: "#1d4ed8",
          fontWeight: 700,
          fontSize: 13,
          cursor: aiLoading[row.id] ? "wait" : "pointer",
        }}
      >
        {aiLoading[row.id] ? "Generating…" : "Generate with AI"}
      </button>
    );

    if (row.type === "structured") {
      const st = sec.structured ?? {};
      return (
        <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
          {[
            ["fullName", "Legal name"],
            ["dateOfBirth", "Date of birth"],
            ["nhsNumber", "NHS number"],
            ["wardLocation", "Ward / location"],
            ["responsibleClinician", "Responsible clinician"],
            ["legalStatus", "Legal status (e.g. MHA section)"],
          ].map(([field, label]) => (
            <label key={field} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 700 }}>{label}</span>
              <input
                value={st[field] ?? ""}
                onChange={(e) => updateStructured(field, e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            {aiBtn}
            <span style={{ color: "#64748b", fontSize: 12 }}>AI may suggest a draft below — copy into fields as needed.</span>
          </div>
          {sec.aiDraft ? (
            <textarea
              readOnly
              value={String(sec.aiDraft)}
              rows={4}
              style={{ width: "100%", fontSize: 13, borderRadius: 8, border: "1px solid #e2e8f0", padding: 8 }}
            />
          ) : null}
        </div>
      );
    }

    if (row.type === "yesno") {
      return (
        <div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="radio"
                name={`yn-${key}`}
                checked={sec.yesNo === "yes"}
                onChange={() => updateSection(row.id, { yesNo: "yes" })}
              />
              Yes
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="radio"
                name={`yn-${key}`}
                checked={sec.yesNo === "no"}
                onChange={() => updateSection(row.id, { yesNo: "no" })}
              />
              No
            </label>
          </div>
          {aiBtn}
        </div>
      );
    }

    if (row.type === "yesno_text") {
      return (
        <div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="radio"
                name={`ynt-${key}`}
                checked={sec.yesNo === "yes"}
                onChange={() => updateSection(row.id, { yesNo: "yes" })}
              />
              Yes
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="radio"
                name={`ynt-${key}`}
                checked={sec.yesNo === "no"}
                onChange={() => updateSection(row.id, { yesNo: "no" })}
              />
              No
            </label>
          </div>
          <textarea
            value={sec.text ?? ""}
            onChange={(e) => updateSection(row.id, { text: e.target.value })}
            rows={5}
            placeholder="Supporting detail (editable)"
            style={{ width: "100%", maxWidth: 640, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 8 }}
          />
          {aiBtn}
        </div>
      );
    }

    return (
      <div>
        <textarea
          value={sec.text ?? ""}
          onChange={(e) => updateSection(row.id, { text: e.target.value })}
          rows={5}
          style={{ width: "100%", maxWidth: 640, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 8 }}
        />
        {aiBtn}
      </div>
    );
  };

  if (!organisationId) {
    return (
      <div style={{ padding: 24 }}>
        <p>Select an organisation to use tribunal reports.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem 0", maxWidth: 920 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>Tribunal nursing report</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", maxWidth: 720, lineHeight: 1.55 }}>
          Structured tribunal-ready nursing report. Edit all sections before finalising. AI uses only notes, incidents,
          behaviour logs, and physical health observations for this patient — verify every line for accuracy.
        </p>
        <p style={{ color: "#92400e", margin: "10px 0 0", fontSize: 14 }}>
          Supports decision-making only. Not a substitute for professional legal or clinical judgment.
        </p>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Patient &amp; report</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Patient</span>
            <select
              value={selectedPatientId}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedPatientId(v);
                setCurrentReportId("");
                const next = buildInitialSections();
                if (v) {
                  const p = patients.find((x) => x.id === v);
                  if (p) next["1"].structured.fullName = safeName(p);
                }
                setSections(next);
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
        {evidenceLoading ? <p style={{ color: "#64748b", marginTop: 10 }}>Loading evidence for AI…</p> : null}
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
        tribunalTemplate.map((row) => (
          <div key={row.id} style={card}>
            <h3 style={{ marginTop: 0, fontSize: "1rem", color: "#0f172a" }}>
              {row.id}. {row.title}
            </h3>
            {renderField(row)}
          </div>
        ))
      )}

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Signature</h2>
        <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Typed name</span>
            <input
              value={signature.typedName}
              onChange={(e) => setSignature((s) => ({ ...s, typedName: e.target.value }))}
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
            <span style={{ fontWeight: 700, fontSize: 13 }}>Signature image (optional)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleSignatureFile} />
          </label>
          {signature.signatureDataUrl ? (
            <img src={signature.signatureDataUrl} alt="Signature preview" style={{ maxWidth: 220, border: "1px solid #e2e8f0" }} />
          ) : null}
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
          onClick={() =>
            exportTribunalNursingReportPdf({
              sections,
              signature,
              patientSummary,
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
          Export tribunal PDF
        </button>
        {selectedPatientId ? (
          <Link
            to={`/patients/${selectedPatientId}`}
            style={{ alignSelf: "center", color: "#2563eb", fontWeight: 700 }}
          >
            Patient profile →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
