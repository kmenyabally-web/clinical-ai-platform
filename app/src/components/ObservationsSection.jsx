/** NEWS / vitals observations — used inside Physical Health page. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import HealthTrendChart from "./HealthTrendChart";
import {
  listPhysicalObservationsForPatient,
  submitPhysicalObservation,
} from "../services/physicalObservationsService";
import { calculateNEWS2, getRiskLevel } from "../utils/news2Calculator";
import { buildTrendData, sortObservationsByCreatedAtDesc } from "../utils/healthTrends";
import { detectDeterioration } from "../utils/deterioration";
import { formatUkDateTime } from "../utils/dateFormat";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function parseOptionalNumber(raw) {
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function riskStyle(level) {
  const l = String(level ?? "").toLowerCase();
  if (l === "high") return { color: "#b91c1c", fontWeight: 800, background: "#fef2f2" };
  if (l === "medium") return { color: "#c2410c", fontWeight: 700, background: "#fff7ed" };
  return { color: "#166534", fontWeight: 600, background: "#f0fdf4" };
}

/**
 * @param {{
 *   organisationId: string | null | undefined,
 *   selectedPatientId: string,
 *   selectedPatient: Record<string, unknown> | null,
 *   user: { email?: string | null, displayName?: string | null, uid?: string | null } | null,
 * }} props
 */
export default function ObservationsSection({ organisationId, selectedPatientId, selectedPatient, user }) {
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitBanner, setSubmitBanner] = useState(null);

  const vitalsForPreview = useMemo(
    () => ({
      respiratoryRate: parseOptionalNumber(respiratoryRate),
      oxygenSaturation: parseOptionalNumber(oxygenSaturation),
      temperature: parseOptionalNumber(temperature),
      pulse: parseOptionalNumber(pulse),
    }),
    [respiratoryRate, oxygenSaturation, temperature, pulse]
  );

  const previewNews = useMemo(() => calculateNEWS2(vitalsForPreview), [vitalsForPreview]);
  const previewRisk = useMemo(() => getRiskLevel(previewNews), [previewNews]);

  const loadHistory = useCallback(async () => {
    if (!organisationId || !selectedPatientId) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await listPhysicalObservationsForPatient(organisationId, selectedPatientId, {
        limitCount: 120,
      });
      setHistory(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setHistoryError(e?.message ?? "Failed to load observations.");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const historySortedDesc = useMemo(() => sortObservationsByCreatedAtDesc(history), [history]);

  const trendChartData = useMemo(() => buildTrendData(historySortedDesc), [historySortedDesc]);

  const deteriorationStatus = useMemo(
    () => detectDeterioration(historySortedDesc),
    [historySortedDesc]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitBanner(null);
    if (!organisationId) {
      setSubmitError("Organisation context is missing.");
      return;
    }
    if (!selectedPatientId) {
      setSubmitError("Select a patient.");
      return;
    }
    const recordedBy =
      (user?.email && String(user.email)) ||
      (user?.displayName && String(user.displayName)) ||
      (user?.uid && String(user.uid)) ||
      "unknown";

    setSubmitting(true);
    try {
      const result = await submitPhysicalObservation({
        patientId: selectedPatientId,
        organisationId,
        hospitalId: selectedPatient?.hospitalId ?? "",
        wardId: selectedPatient?.wardId ?? "",
        temperature: parseOptionalNumber(temperature),
        pulse: parseOptionalNumber(pulse),
        systolicBP: parseOptionalNumber(systolicBP),
        diastolicBP: parseOptionalNumber(diastolicBP),
        respiratoryRate: parseOptionalNumber(respiratoryRate),
        oxygenSaturation: parseOptionalNumber(oxygenSaturation),
        bloodGlucose: parseOptionalNumber(bloodGlucose),
        weight: parseOptionalNumber(weight),
        notes,
        recordedBy,
      });

      if (result?.riskLevel === "high") {
        setSubmitBanner({
          type: "high",
          text: "⚠️ High NEWS score — immediate clinical review required",
        });
      } else {
        setSubmitBanner({ type: "ok", text: "Observation saved." });
      }

      setTemperature("");
      setPulse("");
      setSystolicBP("");
      setDiastolicBP("");
      setRespiratoryRate("");
      setOxygenSaturation("");
      setBloodGlucose("");
      setWeight("");
      setNotes("");
      await loadHistory();
    } catch (err) {
      setSubmitError(err?.message ?? "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    maxWidth: 220,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  };

  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" };

  if (!selectedPatientId) {
    return (
      <div role="status" style={{ ...card, background: "#f8fafc", color: "#64748b" }}>
        Select a patient above to record and view NEWS observations.
      </div>
    );
  }

  return (
    <div>
      {previewRisk === "high" ? (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          ⚠️ High NEWS score — immediate clinical review required
        </div>
      ) : null}

      {submitBanner?.type === "high" ? (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontWeight: 700,
            marginBottom: "1rem",
          }}
        >
          {submitBanner.text}
        </div>
      ) : submitBanner?.type === "ok" ? (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            marginBottom: "1rem",
          }}
        >
          {submitBanner.text}
        </div>
      ) : null}

      {submitError ? (
        <div role="alert" style={{ ...card, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
          {submitError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>New observation</h2>
        <p style={{ marginTop: 0, color: "#64748b", fontSize: 14 }}>
          Calculated NEWS (preview): <strong>{previewNews}</strong> · Risk:{" "}
          <span style={riskStyle(previewRisk)}>{previewRisk}</span>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label style={labelStyle}>Temperature (°C)</label>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Pulse (bpm)</label>
            <input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Systolic BP</label>
            <input
              type="number"
              value={systolicBP}
              onChange={(e) => setSystolicBP(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Diastolic BP</label>
            <input
              type="number"
              value={diastolicBP}
              onChange={(e) => setDiastolicBP(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Respiratory rate</label>
            <input
              type="number"
              value={respiratoryRate}
              onChange={(e) => setRespiratoryRate(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Oxygen saturation (%)</label>
            <input
              type="number"
              value={oxygenSaturation}
              onChange={(e) => setOxygenSaturation(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Blood glucose</label>
            <input
              type="number"
              step="0.1"
              value={bloodGlucose}
              onChange={(e) => setBloodGlucose(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Weight (kg)</label>
            <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, maxWidth: "100%" }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !organisationId}
          style={{
            padding: "10px 20px",
            background: submitting ? "#94a3b8" : "#0f766e",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Saving…" : "Submit observation"}
        </button>
      </form>

      {trendChartData.length > 0 ? (
        <div style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>NEWS &amp; pulse trend</h2>
          <HealthTrendChart data={trendChartData} status={deteriorationStatus} showPulse />
        </div>
      ) : null}

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>History</h2>
        {historyLoading ? <p aria-live="polite">Loading…</p> : null}
        {historyError ? <p style={{ color: "#b91c1c" }}>{historyError}</p> : null}
        {!historyLoading && !history.length ? (
          <p style={{ color: "#64748b" }}>No observations yet for this patient.</p>
        ) : null}

        {historySortedDesc.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 6px" }}>Date</th>
                  <th style={{ padding: "8px 6px" }}>Temp</th>
                  <th style={{ padding: "8px 6px" }}>Pulse</th>
                  <th style={{ padding: "8px 6px" }}>BP</th>
                  <th style={{ padding: "8px 6px" }}>NEWS</th>
                  <th style={{ padding: "8px 6px" }}>Risk</th>
                </tr>
              </thead>
              <tbody>
                {historySortedDesc.map((row) => {
                  const rl = String(row.riskLevel ?? "").toLowerCase();
                  const rs = riskStyle(rl);
                  const bp =
                    row.systolicBP != null || row.diastolicBP != null
                      ? `${row.systolicBP ?? "—"} / ${row.diastolicBP ?? "—"}`
                      : "—";
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 6px" }}>{formatUkDateTime(row.createdAt, "—")}</td>
                      <td style={{ padding: "8px 6px" }}>{row.temperature ?? "—"}</td>
                      <td style={{ padding: "8px 6px" }}>{row.pulse ?? "—"}</td>
                      <td style={{ padding: "8px 6px" }}>{bp}</td>
                      <td style={{ padding: "8px 6px" }}>{row.newsScore ?? "—"}</td>
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{ ...rs, padding: "4px 10px", borderRadius: 999 }}>{row.riskLevel ?? "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
