import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import TimelineEvent from "../components/TimelineEvent";
import EmptyState from "../components/EmptyState";
import {
  subscribePatientTimeline,
  TIMELINE_EVENT_TYPES,
  seedTimelineTestData,
} from "../services/patientTimelineService";
import { getPatientSummary } from "../services/patientService";

const inputStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: "0.875rem",
};

export default function PatientTimeline() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const { organisationId, organisation } = useOrganisation();
  const { currentServiceId, services } = useService();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patient, setPatient] = useState(null);
  const [filterEventType, setFilterEventType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterServiceId, setFilterServiceId] = useState("");
  const [seeding, setSeeding] = useState(false);

  const effectiveServiceId = filterServiceId || currentServiceId || null;
  const currentServiceName = useMemo(() => {
    if (!Array.isArray(services) || services.length === 0) return "No service selected";
    const match = services.find((s) => s?.id === (effectiveServiceId || currentServiceId)) ?? services[0];
    return match?.name ?? match?.serviceName ?? match?.displayName ?? "Service";
  }, [services, effectiveServiceId, currentServiceId]);

  // Patient summary for header
  useEffect(() => {
    if (!organisationId || !patientId) return;
    getPatientSummary(organisationId, patientId)
      .then(setPatient)
      .catch(() => setPatient(null));
  }, [organisationId, patientId]);

  // Realtime timeline subscription
  useEffect(() => {
    if (!organisationId || !patientId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribePatientTimeline(
      organisationId,
      patientId,
      effectiveServiceId || null,
      (list) => {
        setEvents(Array.isArray(list) ? list : []);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [organisationId, patientId, effectiveServiceId]);

  // Apply client-side filters (event type, date range) to subscribed data
  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (filterEventType) {
      list = list.filter((e) => e.eventType === filterEventType);
    }
    if (filterDateFrom) {
      const t = new Date(filterDateFrom).getTime();
      list = list.filter((e) => {
        const created = e.createdAt;
        const ms = created?.toMillis?.() ?? (created ? new Date(created).getTime() : 0);
        return ms >= t;
      });
    }
    if (filterDateTo) {
      const t = new Date(filterDateTo).getTime();
      list = list.filter((e) => {
        const created = e.createdAt;
        const ms = created?.toMillis?.() ?? (created ? new Date(created).getTime() : 0);
        return ms <= t;
      });
    }
    return list;
  }, [events, filterEventType, filterDateFrom, filterDateTo]);

  const keyAlerts = useMemo(() => {
    return events.filter(
      (e) =>
        e.eventType === "safeguarding" ||
        (e.eventType === "incident" && e.metadata?.severity === "high") ||
        (e.eventType === "incident" && e.metadata?.severity === "critical")
    );
  }, [events]);

  async function handleSeedTestData() {
    if (!organisationId || !patientId || !user?.email) return;
    setSeeding(true);
    try {
      await seedTimelineTestData(
        organisationId,
        patientId,
        effectiveServiceId || null,
        user.email,
        5
      );
    } catch (err) {
      console.error("Seed failed:", err);
    } finally {
      setSeeding(false);
    }
  }

  const hasEvents = filteredEvents.length > 0;

  return (
    <div style={{ padding: "2rem" }}>
      {/* Patient header */}
      <header
        style={{
          marginBottom: "1.5rem",
          padding: "1.25rem 1.5rem",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h1 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.35rem" }}>
          {patient?.name?.trim() || "Patient"} {patient?.name?.trim() && `(${patientId})`}
        </h1>
        {!patient?.name?.trim() && (
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
            Patient ID: <code>{patientId ?? "—"}</code>
          </p>
        )}
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
          Service: {currentServiceName}
        </p>
        {patient?.dateOfBirth && (
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#64748b" }}>
            DOB: {patient.dateOfBirth instanceof Date ? patient.dateOfBirth.toLocaleDateString() : String(patient.dateOfBirth)}
          </p>
        )}
        {organisation && (
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
            Organisation: {organisation.name ?? organisation.id ?? "—"}
          </p>
        )}
        {keyAlerts.length > 0 && (
          <div style={{ marginTop: "0.75rem" }}>
            <strong style={{ fontSize: "0.85rem", color: "#b91c1c" }}>Key alerts:</strong>
            <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0, fontSize: "0.85rem", color: "#64748b" }}>
              {keyAlerts.slice(0, 5).map((e) => (
                <li key={e.id}>
                  {e.eventType === "safeguarding" ? "Safeguarding" : "High/critical incident"} — {e.eventTitle}
                </li>
              ))}
            </ul>
          </div>
        )}
        {user?.email && (
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
            Viewing as {user.email}
          </p>
        )}
      </header>

      {/* Filters */}
      <section
        aria-label="Filters"
        style={{
          marginBottom: "1rem",
          padding: "1rem 1.25rem",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem 0" }}>Filters</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.8rem" }}>Event type</label>
            <select
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              style={inputStyle}
            >
              <option value="">All</option>
              {TIMELINE_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.8rem" }}>Date from</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.8rem" }}>Date to</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: "0.8rem" }}>Service</label>
            <select
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Current</option>
              {(Array.isArray(services) ? services : []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serviceName ?? s.name ?? s.id}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleSeedTestData}
            disabled={seeding || !organisationId || !patientId}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              background: "#f8fafc",
              fontSize: "0.85rem",
              cursor: seeding ? "default" : "pointer",
            }}
          >
            {seeding ? "Seeding…" : "Generate test data"}
          </button>
        </div>
      </section>

      {loading && (
        <section aria-busy="true" aria-label="Loading patient timeline">
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              color: "#64748b",
            }}
          >
            Loading patient timeline…
          </div>
        </section>
      )}

      {!loading && error && (
        <section aria-label="Timeline error" style={{ marginTop: "0.75rem" }}>
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "0.75rem 1rem",
              color: "#b91c1c",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        </section>
      )}

      {!loading && !error && !hasEvents && (
        <section style={{ marginTop: "1rem" }}>
          <EmptyState
            title="No timeline activity yet"
            description="When clinical notes, incidents, safeguarding, care plans or documents are recorded for this patient, they will appear here in chronological order."
          />
        </section>
      )}

      {!loading && !error && hasEvents && (
        <section aria-label="Patient timeline" style={{ marginTop: "0.5rem" }}>
          {filteredEvents.map((event) => (
            <TimelineEvent key={event.id ?? `${event.eventType}-${event.createdAt}`} event={event} />
          ))}
        </section>
      )}
    </div>
  );
}
