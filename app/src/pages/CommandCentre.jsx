import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getDocs, limit, query, where } from "firebase/firestore";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { useService } from "../context/ServiceContext";
import ProtectedPage from "../components/ProtectedPage";
import DomainScoreCards from "../components/DomainScoreCards";
import InspectionTrendChart from "../components/InspectionTrendChart";
import InspectionPredictionCard from "../components/InspectionPredictionCard";
import { db } from "../firebase";
import { orgPatientsCollection } from "../utils/tenantCollections";
import { getUserContext } from "../services/authService";
import { getGroupOrganisations } from "../services/groupService";
import { fetchClinicalNotesForOrganisation } from "../services/noteService";
import { listPolicies } from "../services/policyService";
import { listStaffTraining } from "../services/staffTrainingService";
import { fetchIncidents } from "../services/incidentService";
import { listInspectionScores } from "../services/inspectionScoreService";
import {
  calculateDomainScores,
  calculateOverallScore,
  getInspectionInsights,
} from "../engine/inspectionInsights";
import { explainPrediction, predictInspectionRisk } from "../engine/inspectionPredictor";
import { getTrend } from "../utils/inspectionTrend";
import { getStompAlerts } from "../utils/stompAlerts";

function wardLabel(p) {
  const w = (p?.wardName ?? "").toString().trim();
  if (w) return w;
  const id = (p?.wardId ?? "").toString().trim();
  return id || "Unassigned";
}

function patientDisplayName(p) {
  const n = `${p?.firstName ?? ""} ${p?.lastName ?? ""}`.trim();
  return n || p?.name || p?.id || "Patient";
}

/**
 * Loads patients for current org + hospital with STOMP fields for risk scoring.
 * Optional `organisationId` + `skipHospitalFilter` for GROUP_ADMIN / SUPER_ADMIN viewing a sibling org.
 */
async function loadPatientsWithStomp(filters = {}) {
  const ctx = await getUserContext();
  const orgId = filters.organisationId?.trim() || ctx.organisationId?.trim();
  if (!orgId) return [];
  const skipHospital = filters.skipHospitalFilter === true;
  if (!skipHospital && !ctx.hospitalId?.toString().trim()) return [];
  const hospitalId =
    filters.hospitalId != null ? String(filters.hospitalId).trim() : String(ctx.hospitalId ?? "").trim();
  const serviceId = filters.serviceId != null ? String(filters.serviceId).trim() : "";

  const col = orgPatientsCollection(db, orgId);
  const constraints = [];
  if (!skipHospital) {
    constraints.push(where("hospitalId", "==", hospitalId));
  }
  constraints.push(limit(500));
  const snap = await getDocs(query(col, ...constraints));
  let rows = (snap?.docs ?? []).map((d) => {
    const data = d.data() ?? {};
    return {
      id: d.id,
      firstName: typeof data.firstName === "string" ? data.firstName : "",
      lastName: typeof data.lastName === "string" ? data.lastName : "",
      name: typeof data.name === "string" ? data.name : "",
      wardId: typeof data.wardId === "string" ? data.wardId : "",
      wardName: typeof data.wardName === "string" ? data.wardName : "",
      serviceId: typeof data.serviceId === "string" ? data.serviceId : null,
      stompMonitoring: data.stompMonitoring === true,
      medications: Array.isArray(data.medications) ? data.medications : [],
      medicationReviewDate: data.medicationReviewDate ?? null,
    };
  });
  if (serviceId) {
    rows = rows.filter((p) => !p.serviceId || p.serviceId === serviceId);
  }
  return rows;
}

function aggregateDomainHeat(orgInsights, patients, incidentsByPatientId) {
  const domains = {
    SAFE: { high: 0, medium: 0 },
    EFFECTIVE: { high: 0, medium: 0 },
    CARING: { high: 0, medium: 0 },
    RESPONSIVE: { high: 0, medium: 0 },
    WELL_LED: { high: 0, medium: 0 },
  };

  (orgInsights ?? []).forEach((i) => {
    const d = String(i?.domain ?? "").replace("-", "_").toUpperCase();
    if (!domains[d]) return;
    if (i.level === "high") domains[d].high += 1;
    if (i.level === "medium") domains[d].medium += 1;
  });

  (patients ?? []).forEach((p) => {
    getStompAlerts(p).forEach((a) => {
      if (a.severity === "high") domains.SAFE.high += 1;
      else domains.SAFE.medium += 1;
    });
    const ic = incidentsByPatientId.get(p.id)?.length ?? 0;
    if (ic >= 3) domains.SAFE.medium += 1;
  });

  return domains;
}

function aggregateWardHeat(patients, incidentsByPatientId) {
  const map = new Map();
  (patients ?? []).forEach((p) => {
    const w = wardLabel(p);
    if (!map.has(w)) {
      map.set(w, {
        SAFE: { high: 0, medium: 0 },
        EFFECTIVE: { high: 0, medium: 0 },
        CARING: { high: 0, medium: 0 },
        RESPONSIVE: { high: 0, medium: 0 },
        WELL_LED: { high: 0, medium: 0 },
      });
    }
    const bucket = map.get(w);
    getStompAlerts(p).forEach((a) => {
      if (a.severity === "high") bucket.SAFE.high += 1;
      else bucket.SAFE.medium += 1;
    });
    const ic = incidentsByPatientId.get(p.id)?.length ?? 0;
    if (ic >= 3) bucket.SAFE.medium += 1;
  });
  return map;
}

function riskLevelLabel(prediction) {
  if (prediction === "CRITICAL" || prediction === "HIGH") return prediction;
  if (prediction === "MODERATE") return "MODERATE";
  return "LOW";
}

function scorePatientRisk(p, incidentCount) {
  const alerts = getStompAlerts(p);
  let score = 0;
  alerts.forEach((a) => {
    score += a.severity === "high" ? 8 : 4;
  });
  if (incidentCount >= 3) score += 10;
  else if (incidentCount >= 2) score += 5;
  if (incidentCount >= 1) score += 2;
  return score;
}

function issueSummary(p, incidentCount) {
  const parts = [];
  const alerts = getStompAlerts(p);
  if (alerts.length) parts.push(`${alerts.length} STOMP alert(s)`);
  if (incidentCount >= 3) parts.push("Repeated incidents");
  else if (incidentCount >= 1) parts.push(`${incidentCount} incident(s)`);
  if (!parts.length) parts.push("Monitoring");
  return parts.join("; ");
}

export default function CommandCentre() {
  const { organisationId, organisation, userProfile } = useOrganisation();
  const { currentServiceId } = useService();
  const [searchParams] = useSearchParams();
  const viewOrgParam = searchParams.get("organisationId")?.trim() || "";
  const { isSuperAdmin, isGroupAdmin } = useRole();
  const [resolvedViewOrgId, setResolvedViewOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [notes, setNotes] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [training, setTraining] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function resolveViewOrg() {
      if (!viewOrgParam || viewOrgParam === organisationId) {
        setResolvedViewOrgId(null);
        return;
      }
      if (isSuperAdmin) {
        setResolvedViewOrgId(viewOrgParam);
        return;
      }
      if (isGroupAdmin && userProfile?.groupId) {
        try {
          const orgs = await getGroupOrganisations(userProfile.groupId);
          if (cancelled) return;
          const ok = (orgs ?? []).some((o) => o.id === viewOrgParam);
          setResolvedViewOrgId(ok ? viewOrgParam : null);
        } catch {
          if (!cancelled) setResolvedViewOrgId(null);
        }
        return;
      }
      setResolvedViewOrgId(null);
    }
    void resolveViewOrg();
    return () => {
      cancelled = true;
    };
  }, [viewOrgParam, organisationId, isSuperAdmin, isGroupAdmin, userProfile?.groupId]);

  const effectiveOrgId = resolvedViewOrgId || organisationId;
  const viewingSibling = Boolean(resolvedViewOrgId && resolvedViewOrgId !== organisationId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!organisationId || !effectiveOrgId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const notePromise =
          !viewingSibling
            ? fetchClinicalNotesForOrganisation({ patientId: null, limitCount: 500 })
            : Promise.resolve([]);
        const [pts, nts, pol, trn, inc, hist] = await Promise.all([
          loadPatientsWithStomp({
            serviceId: currentServiceId ?? undefined,
            organisationId: effectiveOrgId,
            skipHospitalFilter: viewingSibling,
          }),
          notePromise,
          listPolicies(effectiveOrgId),
          listStaffTraining(effectiveOrgId, currentServiceId ?? null),
          fetchIncidents(effectiveOrgId, {}),
          listInspectionScores(effectiveOrgId, 50),
        ]);
        if (cancelled) return;
        setPatients(Array.isArray(pts) ? pts : []);
        setNotes(Array.isArray(nts) ? nts : []);
        setPolicies(Array.isArray(pol) ? pol : []);
        setTraining(Array.isArray(trn) ? trn : []);
        setIncidents(Array.isArray(inc) ? inc : []);
        setScoreHistory(Array.isArray(hist) ? hist : []);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load command centre data.");
          setPatients([]);
          setNotes([]);
          setPolicies([]);
          setTraining([]);
          setIncidents([]);
          setScoreHistory([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [organisationId, effectiveOrgId, viewingSibling, currentServiceId]);

  const incidentsByPatientId = useMemo(() => {
    const m = new Map();
    (incidents ?? []).forEach((i) => {
      const pid = (i?.patientId ?? "").toString().trim();
      if (!pid) return;
      if (!m.has(pid)) m.set(pid, []);
      m.get(pid).push(i);
    });
    return m;
  }, [incidents]);

  const focusPatient = useMemo(() => {
    const list = patients ?? [];
    return list.find((p) => p?.stompMonitoring === true) ?? list[0] ?? null;
  }, [patients]);

  const insights = useMemo(
    () =>
      getInspectionInsights({
        patient: focusPatient,
        notes,
        policies,
        training,
        incidents,
      }),
    [focusPatient, notes, policies, training, incidents]
  );

  const domainScores = useMemo(() => calculateDomainScores(insights), [insights]);
  const overallScore = useMemo(() => calculateOverallScore(domainScores), [domainScores]);
  const trend = useMemo(() => getTrend(scoreHistory), [scoreHistory]);
  const prediction = useMemo(
    () =>
      predictInspectionRisk({
        domainScores,
        insights,
        trend,
      }),
    [domainScores, insights, trend]
  );
  const predictionReasons = useMemo(() => explainPrediction({ insights }), [insights]);

  const domainHeat = useMemo(
    () => aggregateDomainHeat(insights, patients, incidentsByPatientId),
    [insights, patients, incidentsByPatientId]
  );

  const wardHeat = useMemo(
    () => aggregateWardHeat(patients, incidentsByPatientId),
    [patients, incidentsByPatientId]
  );

  const topPatients = useMemo(() => {
    const rows = (patients ?? []).map((p) => {
      const ic = incidentsByPatientId.get(p.id)?.length ?? 0;
      const score = scorePatientRisk(p, ic);
      let level = "LOW";
      if (score >= 18) level = "HIGH";
      else if (score >= 8) level = "MEDIUM";
      return {
        id: p.id,
        name: patientDisplayName(p),
        riskLevel: level,
        issue: issueSummary(p, ic),
        score,
      };
    });
    return rows.sort((a, b) => b.score - a.score).slice(0, 10);
  }, [patients, incidentsByPatientId]);

  const immediateActions = useMemo(() => {
    const actions = [];
    const medReviewPatients = (patients ?? []).filter((p) => getStompAlerts(p).some((a) => String(a.text).toLowerCase().includes("review"))).length;
    if (medReviewPatients > 0) {
      actions.push(`⚠️ Add medication review (${medReviewPatients} patient${medReviewPatients === 1 ? "" : "s"})`);
    }
    if (!policies?.length) {
      actions.push("⚠️ Create missing policies");
    }
    if (!training?.length) {
      actions.push("⚠️ Staff training incomplete");
    }
    if (!incidents?.length) {
      actions.push("⚠️ Ensure incident logging is active");
    }
    return actions;
  }, [patients, policies, training, incidents]);

  return (
    <ProtectedPage permission="organisation:manage">
      <div style={pageStyle}>
        <header style={headerStyle}>
          <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 900, color: "#0f172a" }}>
            🧭 Inspection Command Centre
          </h1>
          <p style={{ margin: "6px 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
            {organisation?.name ? `${organisation.name} · leadership view` : "Organisation-wide inspection readiness"}
          </p>
        </header>

        {viewingSibling ? (
          <div
            role="status"
            style={{
              marginBottom: 14,
              padding: "12px 14px",
              borderRadius: 10,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e3a8a",
              fontSize: 14,
            }}
          >
            Enterprise view: data for organisation <strong>{effectiveOrgId}</strong>. Notes are not loaded cross-org;
            patients may include all sites in this organisation.
          </div>
        ) : null}

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading live data…</p>
        ) : null}
        {error ? (
          <div role="alert" style={errorBanner}>
            {error}
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            {prediction === "CRITICAL" ? (
              <div role="alert" style={criticalBanner}>
                🚨 High likelihood of inspection failure
              </div>
            ) : null}

            <section className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "baseline" }}>
                <div>
                  <div style={labelMuted}>Overall score</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#005eb8" }}>{overallScore}%</div>
                </div>
                <div>
                  <div style={labelMuted}>Risk level</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: riskColor(prediction) }}>{riskLevelLabel(prediction)}</div>
                </div>
                <div>
                  <div style={labelMuted}>Trend</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{trend}</div>
                </div>
              </div>
            </section>

            <InspectionPredictionCard risk={prediction} reasons={predictionReasons} />

            <section style={{ marginBottom: 16 }}>
              <h2 style={sectionTitle}>Domain overview</h2>
              <DomainScoreCards scores={domainScores} />
            </section>

            <section className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ ...sectionTitle, marginTop: 0 }}>Risk heatmap (by domain)</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(domainHeat).map(([domain, counts]) => (
                  <div key={domain} style={heatmapRow}>
                    <strong style={{ minWidth: 100 }}>{domain}</strong>
                    <span style={{ color: "#b91c1c", fontWeight: 800 }}>
                      {counts.high > 0 ? `🔴 ${counts.high} high` : ""}
                    </span>
                    <span style={{ color: "#c2410c", fontWeight: 800 }}>
                      {counts.medium > 0 ? `🟡 ${counts.medium} medium` : ""}
                    </span>
                    {counts.high === 0 && counts.medium === 0 ? <span style={{ color: "#166534" }}>no flagged signals</span> : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ ...sectionTitle, marginTop: 0 }}>Risk by ward</h2>
              {wardHeat.size === 0 ? (
                <p style={{ color: "#64748b", margin: 0 }}>No ward-attributed patient data.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[...wardHeat.entries()].map(([ward, counts]) => (
                    <div key={ward}>
                      <div style={{ fontWeight: 800, marginBottom: 4, color: "#0f172a" }}>{ward}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 13 }}>
                        {Object.entries(counts).map(([d, c]) => (
                          <span key={`${ward}-${d}`} style={{ color: "#475569" }}>
                            {d}: high {c.high}, medium {c.medium}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card" style={{ marginBottom: 16 }}>
              <h2 style={{ ...sectionTitle, marginTop: 0 }}>Top 10 patient risk</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Patient</th>
                      <th style={thStyle}>Risk</th>
                      <th style={thStyle}>Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPatients.map((row) => (
                      <tr key={row.id}>
                        <td style={tdStyle}>
                          <Link to={`/patients/${row.id}`} style={{ color: "#005eb8", fontWeight: 700 }}>
                            {row.name}
                          </Link>
                        </td>
                        <td style={tdStyle}>{row.riskLevel}</td>
                        <td style={tdStyle}>{row.issue}</td>
                      </tr>
                    ))}
                    {topPatients.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={tdStyle}>
                          No patients in scope.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card" style={{ marginBottom: 16, borderLeft: "4px solid #f59e0b" }}>
              <h2 style={{ ...sectionTitle, marginTop: 0 }}>Immediate actions required</h2>
              {immediateActions.length === 0 ? (
                <p style={{ margin: 0, color: "#166534", fontWeight: 700 }}>No critical actions queued from current signals.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 20, color: "#9a3412", fontWeight: 700 }}>
                  {immediateActions.map((a) => (
                    <li key={a} style={{ marginBottom: 6 }}>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section style={{ marginBottom: 16 }}>
              <InspectionTrendChart scores={scoreHistory} />
            </section>
          </>
        ) : null}
      </div>
    </ProtectedPage>
  );
}

function riskColor(prediction) {
  if (prediction === "CRITICAL") return "#b91c1c";
  if (prediction === "HIGH") return "#ea580c";
  if (prediction === "MODERATE") return "#c2410c";
  return "#166534";
}

const pageStyle = {
  width: "100%",
  padding: "24px 28px",
  maxWidth: 1200,
};

const headerStyle = { marginBottom: 20 };

const sectionTitle = {
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 12,
};

const labelMuted = { fontSize: 12, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" };

const errorBanner = {
  padding: "12px 14px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 10,
  color: "#991b1b",
  marginBottom: 16,
};

const criticalBanner = {
  padding: "12px 14px",
  background: "#fef2f2",
  border: "1px solid #dc2626",
  borderRadius: 10,
  color: "#991b1b",
  fontWeight: 900,
  marginBottom: 16,
};

const heatmapRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid #f1f5f9",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "2px solid #e2e8f0",
  color: "#0f172a",
  background: "#f8fafc",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
};
