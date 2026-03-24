/**
 * Organisation-scoped operational snapshot (patients, risk, incidents, notes activity).
 * All reads use existing services — Firestore queries are organisation-scoped via getUserContext.
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { listPatients } from "../services/patientService";
import { fetchClinicalNotesForOrganisation } from "../services/noteService";
import { fetchIncidents } from "../services/incidentService";
import { listHospitals, listWards } from "../services/structureService";
import { calculateRisk } from "../utils/riskEngine";
import { formatUkDateTime } from "../utils/dateFormat";

export default function OrganisationDashboard() {
  const { organisationId, organisation, hasFeature } = useOrganisation();
  const { canViewReports, loading: roleLoading, role } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPatients, setTotalPatients] = useState(0);
  const [highRiskPatients, setHighRiskPatients] = useState(0);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [recentNotes, setRecentNotes] = useState([]);
  const [hospitalCount, setHospitalCount] = useState(0);
  const [wardCount, setWardCount] = useState(0);
  const [wardPatientRows, setWardPatientRows] = useState([]);
  const [wardRiskRows, setWardRiskRows] = useState([]);

  const load = useCallback(async () => {
    if (!organisationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [patients, notes, incidents] = await Promise.all([
        listPatients(),
        fetchClinicalNotesForOrganisation({ patientId: null, limitCount: 400 }),
        fetchIncidents(organisationId, {}),
      ]);

      const pList = Array.isArray(patients) ? patients : [];
      setTotalPatients(pList.length);

      const byPatient = new Map();
      for (const n of notes) {
        const pid = n.patientId;
        if (!pid) continue;
        if (!byPatient.has(pid)) byPatient.set(pid, []);
        byPatient.get(pid).push(n);
      }
      let high = 0;
      if (hasFeature("risk")) {
        for (const [, list] of byPatient) {
          const { level } = calculateRisk(list);
          if (level === "high") high += 1;
        }
      }
      setHighRiskPatients(high);

      const hospitals = await listHospitals(organisationId);
      const hList = Array.isArray(hospitals) ? hospitals : [];
      setHospitalCount(hList.length);
      let wTotal = 0;
      const wardLabels = new Map();
      for (const h of hList) {
        const ws = await listWards(organisationId, h.id);
        const wArr = Array.isArray(ws) ? ws : [];
        wTotal += wArr.length;
        for (const w of wArr) {
          wardLabels.set(w.id, `${h.name ?? h.id} · ${w.name ?? w.id}`);
        }
      }
      setWardCount(wTotal);

      const byWard = new Map();
      for (const p of pList) {
        const wid = p.wardId || "_unassigned";
        byWard.set(wid, (byWard.get(wid) || 0) + 1);
      }
      setWardPatientRows(
        [...byWard.entries()].map(([wid, count]) => ({
          wardId: wid,
          label: wid === "_unassigned" ? "Unassigned / legacy" : wardLabels.get(wid) || wid,
          count,
        }))
      );

      const patientToWard = new Map(pList.map((p) => [p.id, p.wardId || "_unassigned"]));
      const notesByWard = new Map();
      for (const n of notes) {
        const pid = n.patientId;
        if (!pid) continue;
        const wid = patientToWard.get(pid) || "_unassigned";
        if (!notesByWard.has(wid)) notesByWard.set(wid, []);
        notesByWard.get(wid).push(n);
      }
      const riskRows = [];
      for (const [wid, list] of notesByWard) {
        if (!hasFeature("risk")) {
          riskRows.push({ wardId: wid, label: wid === "_unassigned" ? "Unassigned / legacy" : wardLabels.get(wid) || wid, level: "—" });
        } else {
          const { level } = calculateRisk(list);
          riskRows.push({
            wardId: wid,
            label: wid === "_unassigned" ? "Unassigned / legacy" : wardLabels.get(wid) || wid,
            level: level.toUpperCase(),
          });
        }
      }
      riskRows.sort((a, b) => a.label.localeCompare(b.label));
      setWardRiskRows(riskRows);

      const incList = Array.isArray(incidents) ? incidents : [];
      setTotalIncidents(incList.length);
      const incSorted = incList
        .slice()
        .sort((a, b) => {
          const ta =
            a.reportedAt?.toMillis?.() ??
            a.createdAt?.toMillis?.() ??
            0;
          const tb =
            b.reportedAt?.toMillis?.() ??
            b.createdAt?.toMillis?.() ??
            0;
          return tb - ta;
        });
      setRecentIncidents(incSorted.slice(0, 5));

      const noteSorted = [...notes].sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setRecentNotes(noteSorted.slice(0, 8));
    } catch (e) {
      setError(e?.message ?? "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [organisationId, hasFeature]);

  useEffect(() => {
    if (!roleLoading && canViewReports()) {
      load();
    } else if (!roleLoading && !canViewReports()) {
      setLoading(false);
    }
  }, [roleLoading, role, load]);

  if (roleLoading) {
    return <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>Loading…</div>;
  }

  if (!canViewReports()) {
    return (
      <div style={{ padding: "2rem", maxWidth: 560, margin: "0 auto", fontFamily: "sans-serif" }}>
        <h1 style={{ marginTop: 0 }}>Organisation dashboard</h1>
        <p style={{ color: "#64748b" }}>Your role does not have access to organisation reports.</p>
        <Link to="/dashboard" style={{ color: "#005eb8", fontWeight: 800 }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!organisationId) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
        <p>No organisation context.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ marginTop: 0 }}>Organisation dashboard</h1>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
        {organisation?.name ?? "Organisation"} · tenant <code>{organisationId}</code>
      </p>

      {error && (
        <div role="alert" style={{ padding: "1rem", background: "#fef2f2", borderRadius: 10, color: "#991b1b", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading metrics…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <MetricCard label="Hospitals" value={hospitalCount} />
            <MetricCard label="Wards" value={wardCount} />
            <MetricCard label="Total patients" value={totalPatients} />
            <MetricCard
              label="High-risk patients (notes)"
              value={hasFeature("risk") ? highRiskPatients : "—"}
              hint={hasFeature("risk") ? "Behaviour risk model" : "Upgrade to Pro for risk analytics"}
            />
            <MetricCard label="Incidents on file" value={totalIncidents} />
          </div>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Patients per ward</h2>
            {wardPatientRows.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No ward breakdown yet.</p>
            ) : (
              <table style={{ width: "100%", maxWidth: 560, borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e8f0" }}>Ward</th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #e2e8f0" }}>Patients</th>
                  </tr>
                </thead>
                <tbody>
                  {wardPatientRows.map((r) => (
                    <tr key={r.wardId}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.label}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Behaviour risk by ward (notes)</h2>
            {wardRiskRows.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No notes to aggregate.</p>
            ) : (
              <table style={{ width: "100%", maxWidth: 560, borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #e2e8f0" }}>Ward</th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #e2e8f0" }}>Risk level</th>
                  </tr>
                </thead>
                <tbody>
                  {wardRiskRows.map((r) => (
                    <tr key={r.wardId}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>{r.label}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{r.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Recent incidents</h2>
            {recentIncidents.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No incidents.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentIncidents.map((i) => (
                  <li
                    key={i.id}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 14,
                    }}
                  >
                    <strong>{i.type || i.title || "Incident"}</strong>{" "}
                    <span style={{ color: "#64748b" }}>· {(i.severity ?? "").toString()}</span>
                    {i.patientId ? (
                      <div style={{ marginTop: 4 }}>
                        <Link to={`/patients/${i.patientId}`} style={{ color: "#005eb8" }}>
                          Patient record
                        </Link>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: "1rem", marginBottom: 8 }}>Notes activity</h2>
            {recentNotes.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 14 }}>No notes yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {recentNotes.map((n) => (
                  <li
                    key={n.id}
                    style={{
                      padding: "10px 12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      marginBottom: 8,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>[{n.discipline || "—"}]</span>{" "}
                    {formatUkDateTime(n.createdAt, "—")} · {n.authorEmail || "—"}
                    {n.patientId ? (
                      <Link to={`/patients/${n.patientId}`} style={{ marginLeft: 8, color: "#005eb8" }}>
                        Open patient
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div style={{ padding: "1rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: "#0f172a", marginTop: 4 }}>{value}</div>
      {hint ? <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}
