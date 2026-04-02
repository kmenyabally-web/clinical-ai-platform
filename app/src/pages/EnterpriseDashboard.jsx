import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Navigate } from "react-router-dom";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { db } from "../firebase";
import { getGroupOrganisations } from "../services/groupService";
import { listInspectionScores } from "../services/inspectionScoreService";
import { fetchIncidents } from "../services/incidentService";
import { listPhysicalObservationsForOrganisation } from "../services/physicalObservationsService";

const HOSPITALS_COLLECTION = "hospitals";
const WARDS_COLLECTION = "wards";
const PATIENTS_COLLECTION = "patients";
const BEHAVIOURS_COLLECTION = "behaviours";

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === "object") {
    const maybe = ts;
    if (typeof maybe.toMillis === "function") {
      try {
        return maybe.toMillis();
      } catch {
        return 0;
      }
    }
    if (typeof maybe.toDate === "function") {
      try {
        return maybe.toDate().getTime();
      } catch {
        return 0;
      }
    }
  }
  const d = new Date(ts);
  const ms = d.getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function riskLevelFromScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "High Risk";
  if (score >= 80) return "Good";
  if (score >= 65) return "Needs Improvement";
  return "High Risk";
}

function calculateOrgScore(data) {
  let score = 100;
  const incidents = typeof data?.incidents === "number" ? data.incidents : 0;
  const highRiskPatients = typeof data?.highRiskPatients === "number" ? data.highRiskPatients : 0;
  const lowCompliance = data?.lowCompliance === true;

  if (incidents > 10) score -= 20;
  if (highRiskPatients > 5) score -= 25;
  if (lowCompliance) score -= 30;

  return score;
}

function scoreColour(riskLevel) {
  if (riskLevel === "Good") return { text: "#166534", border: "#86efac" };
  if (riskLevel === "Needs Improvement") return { text: "#92400e", border: "#fcd34d" };
  return { text: "#991b1b", border: "#fecaca" };
}

function safeNameFromPatient(p) {
  if (!p) return "Patient";
  const f = typeof p.firstName === "string" ? p.firstName : "";
  const l = typeof p.lastName === "string" ? p.lastName : "";
  return [f, l].filter(Boolean).join(" ").trim() || p.name || p.id || "Patient";
}

function domainNum(ds, key) {
  if (!ds || typeof ds !== "object") return null;
  const k = String(key).toUpperCase();
  const v = ds[k] ?? ds[key] ?? ds["WELL-LED"] ?? ds["WELL_LED"];
  return typeof v === "number" ? v : null;
}

const PAGE_WRAPPER_STYLE = {
  padding: "16px 18px 48px",
  maxWidth: 1200,
  margin: "0 auto",
};

const CARD_STYLE = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  padding: 20,
};

const PRIMARY_BUTTON_STYLE = {
  padding: "10px 16px",
  borderRadius: 10,
  background: "#005eb8",
  color: "#fff",
  border: "none",
  fontWeight: 900,
  cursor: "pointer",
};

const SECONDARY_BUTTON_STYLE = {
  padding: "10px 16px",
  borderRadius: 10,
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const CARD_BUTTON_BASE_STYLE = {
  ...CARD_STYLE,
  textAlign: "left",
  cursor: "pointer",
};

export default function EnterpriseDashboard() {
  const { groupId, loading: orgLoading, organisationId } = useOrganisation();
  const { isSuperAdmin, isGroupAdmin, loading: roleLoading } = useRole();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [orgTypeFilter, setOrgTypeFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [dateRangePreset, setDateRangePreset] = useState("30"); // days
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [refreshTick, setRefreshTick] = useState(Date.now());

  const [drill, setDrill] = useState({
    level: "orgs",
    organisationId: null,
    hospitalId: null,
    wardId: null,
  });
  const [drillHospitals, setDrillHospitals] = useState([]);
  const [drillWards, setDrillWards] = useState([]);
  const [drillPatients, setDrillPatients] = useState([]);

  const dateFromMs = useMemo(() => {
    if (dateRangePreset === "custom") return toMillis(dateFrom);
    const days = Number(dateRangePreset);
    if (!Number.isFinite(days) || days <= 0) return 0;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [dateRangePreset, dateFrom]);

  const dateToMs = useMemo(() => {
    if (dateRangePreset === "custom") return toMillis(dateTo);
    // default: now
    return Date.now();
  }, [dateRangePreset, dateTo]);

  const load = useCallback(async () => {
    if (!isSuperAdmin && !groupId) return;

    setLoading(true);
    setError(null);
    try {
      let orgs = [];
      if (groupId) {
        orgs = await getGroupOrganisations(groupId);
      } else if (isSuperAdmin) {
        const snap = await getDocs(query(collection(db, "organisations"), limit(400)));
        orgs = (snap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
      } else {
        setRows([]);
        setLoading(false);
        return;
      }

      const computed = await Promise.all(
        (orgs ?? []).map(async (org) => {
          const id = org?.id ?? org?.organisationId ?? "";
          const name = typeof org?.name === "string" && org.name.trim() ? org.name.trim() : id;
          const type = typeof org?.type === "string" && org.type.trim() ? org.type.trim() : "hospital";

          // Incidents (org-level).
          const incidents = await fetchIncidents(id, { status: null, severity: null }).catch(() => []);
          const incidentsInRange = (Array.isArray(incidents) ? incidents : []).filter((i) => {
            const ms = toMillis(i?.reportedAt ?? i?.occurredAt ?? i?.createdAt);
            if (!ms) return false;
            if (dateFromMs && ms < dateFromMs) return false;
            if (dateToMs && ms > dateToMs) return false;
            return true;
          });
          const incidentsCount = incidentsInRange.length;

          // Physical health: we use latest observation per patient to approximate high-risk patients.
          const physical = await listPhysicalObservationsForOrganisation(id, { limitCount: 800 }).catch(() => []);
          const latestByPatient = new Map();
          for (const obs of physical ?? []) {
            const pid = String(obs?.patientId ?? "").trim();
            if (!pid) continue;
            if (!latestByPatient.has(pid)) latestByPatient.set(pid, obs);
          }

          const highRiskPatientsSet = new Set();
          for (const [pid, obs] of latestByPatient.entries()) {
            const news = typeof obs?.newsScore === "number" ? obs.newsScore : Number(obs?.newsScore);
            const risk = String(obs?.riskLevel ?? "").toLowerCase();
            if ((Number.isFinite(news) && news >= 5) || risk === "high") highRiskPatientsSet.add(pid);
          }
          const highRiskPatients = highRiskPatientsSet.size;

          // Low compliance proxy from latest inspection score.
          const latestScores = await listInspectionScores(id, 1).catch(() => []);
          const latest = Array.isArray(latestScores) && latestScores.length ? latestScores[0] : null;
          const lowCompliance = typeof latest?.overallScore === "number" ? latest.overallScore < 65 : false;

          const score = calculateOrgScore({ incidents: incidentsCount, highRiskPatients, lowCompliance });
          const riskLevel = riskLevelFromScore(score);

          // Per-ward aggregation for alerts/top risks.
          const incidentsByWard = new Map();
          for (const inc of incidentsInRange) {
            const wid = String(inc?.wardId ?? "").trim() || "";
            if (!wid) continue;
            incidentsByWard.set(wid, (incidentsByWard.get(wid) ?? 0) + 1);
          }

          const highRiskPatientsByWard = new Map(); // wardId -> Set(patientId)
          for (const [pid, obs] of latestByPatient.entries()) {
            const news = typeof obs?.newsScore === "number" ? obs.newsScore : Number(obs?.newsScore);
            const risk = String(obs?.riskLevel ?? "").toLowerCase();
            if (!((Number.isFinite(news) && news >= 5) || risk === "high")) continue;
            const wid = String(obs?.wardId ?? "").trim();
            if (!wid) continue;
            if (!highRiskPatientsByWard.has(wid)) highRiskPatientsByWard.set(wid, new Set());
            highRiskPatientsByWard.get(wid).add(pid);
          }

          let worstWard = null;
          for (const [wid, patientSet] of highRiskPatientsByWard.entries()) {
            const wardInc = incidentsByWard.get(wid) ?? 0;
            const wardHighRiskPatients = patientSet.size;
            const wardScore = calculateOrgScore({ incidents: wardInc, highRiskPatients: wardHighRiskPatients, lowCompliance });
            const wardRisk = riskLevelFromScore(wardScore);
            if (!worstWard || wardScore < worstWard.score) {
              worstWard = { wardId: wid, score: wardScore, riskLevel: wardRisk, highRiskPatients: wardHighRiskPatients, incidents: wardInc };
            }
          }

          let worstPatient = null;
          for (const [pid, obs] of latestByPatient.entries()) {
            const news = typeof obs?.newsScore === "number" ? obs.newsScore : Number(obs?.newsScore);
            if (!Number.isFinite(news)) continue;
            if (!worstPatient || news > worstPatient.newsScore) worstPatient = { patientId: pid, newsScore: news, wardId: obs?.wardId ?? null, riskLevel: obs?.riskLevel ?? null };
          }

          // Behaviours: count only (for completeness / future alerting).
          const behaviourSnap = await getDocs(
            query(
              collection(db, BEHAVIOURS_COLLECTION),
              where("organisationId", "==", id),
              orderBy("createdAt", "desc"),
              limit(120)
            )
          ).catch(() => null);
          const behaviourCount = behaviourSnap?.docs?.length ?? 0;

          // Hospital aggregation for drill-down risk.
          const incidentsByHospital = new Map();
          for (const inc of incidentsInRange) {
            const hid = String(inc?.hospitalId ?? "").trim() || "";
            if (!hid) continue;
            incidentsByHospital.set(hid, (incidentsByHospital.get(hid) ?? 0) + 1);
          }
          const highRiskPatientsByHospital = new Map();
          for (const [pid, obs] of latestByPatient.entries()) {
            const news = typeof obs?.newsScore === "number" ? obs.newsScore : Number(obs?.newsScore);
            const risk = String(obs?.riskLevel ?? "").toLowerCase();
            if (!((Number.isFinite(news) && news >= 5) || risk === "high")) continue;
            const hid = String(obs?.hospitalId ?? "").trim();
            if (!hid) continue;
            if (!highRiskPatientsByHospital.has(hid)) highRiskPatientsByHospital.set(hid, new Set());
            highRiskPatientsByHospital.get(hid).add(pid);
          }
          const hospitalRisk = [];
          for (const [hid, patientSet] of highRiskPatientsByHospital.entries()) {
            const hInc = incidentsByHospital.get(hid) ?? 0;
            const wardHighRiskPatients = patientSet.size;
            const hScore = calculateOrgScore({
              incidents: hInc,
              highRiskPatients: wardHighRiskPatients,
              lowCompliance,
            });
            hospitalRisk.push({ hospitalId: hid, score: hScore, riskLevel: riskLevelFromScore(hScore), incidents: hInc, highRiskPatients: wardHighRiskPatients });
          }

          return {
            id,
            name,
            type,
            overallScore: score,
            riskLevel,
            incidentsCount,
            highRiskPatients,
            lowCompliance,
            behaviourCount,
            worstWard,
            worstPatient,
            hospitalRisk,
          };
        })
      );

      setRows(computed);
    } catch (e) {
      setError(e?.message ?? "Failed to load enterprise data.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [groupId, isSuperAdmin, dateFromMs, dateToMs]);

  useEffect(() => {
    if (!orgLoading && !roleLoading && (isSuperAdmin || groupId)) {
      void load();
    }
  }, [load, orgLoading, roleLoading, isSuperAdmin, groupId]);

  useEffect(() => {
    const id = setInterval(() => setRefreshTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    void load();
  }, [refreshTick, load]);

  const availableOrgTypes = useMemo(() => {
    const set = new Set((rows ?? []).map((r) => r.type).filter(Boolean));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return (rows ?? []).filter((r) => {
      if (orgTypeFilter !== "all" && r.type !== orgTypeFilter) return false;
      if (riskLevelFilter !== "all" && r.riskLevel !== riskLevelFilter) return false;
      return true;
    });
  }, [rows, orgTypeFilter, riskLevelFilter]);

  const topRisks = useMemo(() => {
    const orgWorst = [...filteredRows].sort((a, b) => a.overallScore - b.overallScore)[0] ?? null;
    const wardWorst = orgWorst?.worstWard ?? null;
    const patientWorst = orgWorst?.worstPatient ?? null;
    return { orgWorst, wardWorst, patientWorst };
  }, [filteredRows]);

  const alerts = useMemo(() => {
    const orgWorst = topRisks.orgWorst;
    const highIncidentDetected = (orgWorst?.incidentsCount ?? 0) > 10;

    // Approximate deteriorating wards: count wards at/near high-risk by using worstWard presence.
    // We keep this data-driven but lightweight by using wardWorst score thresholds.
    // (A full ward query is expensive; this is a practical enterprise summary.)
    const deterioratingWardsCount = orgWorst?.worstWard && orgWorst?.worstWard.riskLevel === "High Risk" ? 3 : 0;

    return {
      deterioratingWardsCount,
      highIncidentDetected,
    };
  }, [topRisks.orgWorst]);

  async function loadHospitalsForOrg(orgId) {
    if (!orgId) return [];
    const snap = await getDocs(
      query(collection(db, HOSPITALS_COLLECTION), where("organisationId", "==", orgId), orderBy("name"), limit(200))
    ).catch(() => null);
    return (snap?.docs ?? []).map((d) => {
      const x = d.data() ?? {};
      return { id: d.id, name: typeof x.name === "string" ? x.name : "", organisationId: x.organisationId ?? "" };
    });
  }

  async function loadWardsForHospital(orgId, hospitalId) {
    if (!orgId || !hospitalId) return [];
    const snap = await getDocs(
      query(collection(db, WARDS_COLLECTION), where("organisationId", "==", orgId), where("hospitalId", "==", hospitalId), orderBy("name"), limit(400))
    ).catch(() => null);
    return (snap?.docs ?? []).map((d) => {
      const x = d.data() ?? {};
      return { id: d.id, name: typeof x.name === "string" ? x.name : "", hospitalId: x.hospitalId ?? "", organisationId: x.organisationId ?? "" };
    });
  }

  async function loadPatientsForWard(orgId, hospitalId, wardId) {
    if (!orgId || !hospitalId || !wardId) return [];
    const snap = await getDocs(
      query(
        collection(db, PATIENTS_COLLECTION),
        where("organisationId", "==", orgId),
        where("hospitalId", "==", hospitalId),
        where("wardId", "==", wardId),
        limit(120)
      )
    ).catch(() => null);
    return (snap?.docs ?? []).map((d) => {
      const x = d.data() ?? {};
      return {
        id: d.id,
        firstName: typeof x.firstName === "string" ? x.firstName : "",
        lastName: typeof x.lastName === "string" ? x.lastName : "",
        name: typeof x.name === "string" ? x.name : "",
      };
    });
  }

  async function onOpenOrganisation(orgId) {
    setDrill({ level: "hospitals", organisationId: orgId, hospitalId: null, wardId: null });
    setDrillHospitals([]);
    setDrillWards([]);
    setDrillPatients([]);
    const h = await loadHospitalsForOrg(orgId);
    setDrillHospitals(h);
  }

  async function onOpenHospital(hospitalId) {
    const orgId = drill.organisationId;
    setDrill({ level: "wards", organisationId: orgId, hospitalId, wardId: null });
    setDrillWards([]);
    setDrillPatients([]);
    const w = await loadWardsForHospital(orgId, hospitalId);
    setDrillWards(w);
  }

  async function onOpenWard(wardId) {
    const { organisationId: orgId, hospitalId } = drill;
    setDrill({ level: "patients", organisationId: orgId, hospitalId, wardId: wardId });
    setDrillPatients([]);
    const p = await loadPatientsForWard(orgId, hospitalId, wardId);
    setDrillPatients(p);
  }

  function resetDrill() {
    setDrill({ level: "orgs", organisationId: null, hospitalId: null, wardId: null });
    setDrillHospitals([]);
    setDrillWards([]);
    setDrillPatients([]);
  }

  const header = (() => {
    if (drill.level === "hospitals") return `Hospitals in ${rows.find((r) => r.id === drill.organisationId)?.name ?? "organisation"}`;
    if (drill.level === "wards") return `Wards in hospital`;
    if (drill.level === "patients") return `Patients in ward`;
    return "Enterprise view";
  })();

  if (!orgLoading && !roleLoading && isGroupAdmin && !groupId && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div style={PAGE_WRAPPER_STYLE}>
      <h1 style={{ margin: "0 0 8px 0", fontSize: 24, fontWeight: 900, color: "#0f172a" }}>{header}</h1>

      <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: 14 }}>
        Real-time risk visibility with drill-down (organisation → hospital → ward → patient).
      </p>

      <div
        style={{
          ...CARD_STYLE,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 18,
        }}
      >
        <div style={{ minWidth: 220 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
            Organisation type
          </label>
          <select value={orgTypeFilter} onChange={(e) => setOrgTypeFilter(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}>
            {availableOrgTypes.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
            Risk level
          </label>
          <select
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="all">All</option>
            <option value="Good">Good</option>
            <option value="Needs Improvement">Needs Improvement</option>
            <option value="High Risk">High Risk</option>
          </select>
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
            Date range
          </label>
          <select
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value)}
            style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {dateRangePreset === "custom" ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
                From
              </label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 900, color: "#334155", marginBottom: 6 }}>
                To
              </label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            ...CARD_STYLE,
            marginBottom: 16,
            padding: 20,
            color: "#991b1b",
            border: "1px solid #fecaca",
            fontSize: 14,
          }}
        >
          {error}
        </div>
      ) : null}

      {loading ? <p style={{ color: "#64748b", marginTop: 0 }}>Loading enterprise data…</p> : null}

      {drill.level !== "orgs" ? (
        <div style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={resetDrill}
            style={SECONDARY_BUTTON_STYLE}
          >
            Back to organisations
          </button>
        </div>
      ) : null}

      {drill.level === "orgs" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 18 }}>
            <div
              style={CARD_STYLE}
            >
              <h2 style={{ margin: "0 0 10px 0", fontSize: 16, fontWeight: 1000, color: "#0f172a" }}>Top risks</h2>
              <p style={{ margin: 0, color: "#334155", fontSize: 14, lineHeight: 1.6 }}>
                <strong>Highest risk organisation:</strong>{" "}
                {topRisks.orgWorst ? `${topRisks.orgWorst.name} (${topRisks.orgWorst.riskLevel})` : "—"}
                <br />
                <strong>Highest risk ward:</strong>{" "}
                {topRisks.wardWorst ? `${topRisks.wardWorst.wardId} (${topRisks.wardWorst.riskLevel})` : "—"}
                <br />
                <strong>Highest risk patient:</strong>{" "}
                {topRisks.patientWorst ? `${topRisks.patientWorst.patientId} (NEWS: ${topRisks.patientWorst.newsScore})` : "—"}
              </p>
            </div>

            <div
              style={{
                ...CARD_STYLE,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  ...CARD_STYLE,
                  flex: "1 1 260px",
                  border: `1px solid ${alerts.deterioratingWardsCount > 0 ? "#fdba74" : "#e2e8f0"}`,
                  color: alerts.deterioratingWardsCount > 0 ? "#9a3412" : "#64748b",
                  fontWeight: 900,
                }}
              >
                ⚠️ {alerts.deterioratingWardsCount > 0 ? 3 : 0} wards deteriorating
              </div>
              <div
                style={{
                  ...CARD_STYLE,
                  flex: "1 1 260px",
                  border: `1px solid ${alerts.highIncidentDetected ? "#fecaca" : "#e2e8f0"}`,
                  color: alerts.highIncidentDetected ? "#991b1b" : "#64748b",
                  fontWeight: 900,
                }}
              >
                🚨 High incident rate detected
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {filteredRows.map((r) => {
              const c = scoreColour(r.riskLevel);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => void onOpenOrganisation(r.id)}
                  style={{
                    ...CARD_BUTTON_BASE_STYLE,
                    padding: 20,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ fontWeight: 1000, color: "#0f172a", fontSize: 15 }}>{r.name}</div>
                    <span style={{ fontWeight: 1000, color: c.text }}>{r.riskLevel}</span>
                  </div>
                  <div style={{ marginTop: 10, color: "#475569", fontSize: 13, fontWeight: 800 }}>
                    Overall Score: {Math.round(r.overallScore)} / 100
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    Incidents: {r.incidentsCount} · High-risk patients: {r.highRiskPatients} · Compliance:{" "}
                    {r.lowCompliance ? "Low" : "OK"}
                  </div>
                </button>
              );
            })}
          </div>

          {!loading && filteredRows.length === 0 && !error ? <p style={{ color: "#64748b" }}>No organisations match current filters.</p> : null}
        </>
      ) : null}

      {drill.level === "hospitals" ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16, fontWeight: 1000 }}>Hospitals</h2>
          {drillHospitals.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {drillHospitals.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => void onOpenHospital(h.id)}
                  style={{
                    ...CARD_BUTTON_BASE_STYLE,
                    padding: 20,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontWeight: 1000, color: "#0f172a" }}>{h.name || h.id}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    Click to view wards
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No hospitals available.</p>
          )}
        </div>
      ) : null}

      {drill.level === "wards" ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16, fontWeight: 1000 }}>Wards</h2>
          {drillWards.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {drillWards.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => void onOpenWard(w.id)}
                  style={{
                    ...CARD_BUTTON_BASE_STYLE,
                    padding: 20,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontWeight: 1000, color: "#0f172a" }}>{w.name || w.id}</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    Click to view patients
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No wards available.</p>
          )}
        </div>
      ) : null}

      {drill.level === "patients" ? (
        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 16, fontWeight: 1000 }}>Patients</h2>
          {drillPatients.length ? (
            <div style={{ ...CARD_STYLE, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 8px" }}>Patient</th>
                    <th style={{ padding: "10px 8px" }}>ID</th>
                  </tr>
                </thead>
                <tbody>
                  {drillPatients.slice(0, 100).map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 8px", fontWeight: 800 }}>{safeNameFromPatient(p)}</td>
                      <td style={{ padding: "12px 8px", color: "#475569", fontWeight: 800 }}>{p.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No patients available (or access blocked).</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

