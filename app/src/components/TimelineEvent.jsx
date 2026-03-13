import React from "react";

/** Event type to icon mapping (spec). */
const EVENT_ICONS = {
  clinical_note: "📝",
  incident: "⚠",
  safeguarding: "🚨",
  care_plan: "📋",
  document: "📄",
  medication: "💊",
  assessment: "📊",
};

function resolveCreatedAt(createdAt) {
  if (!createdAt) return null;
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt?.toDate === "function") {
    try {
      return createdAt.toDate();
    } catch {
      return null;
    }
  }
  const date = new Date(createdAt);
  // eslint-disable-next-line no-restricted-globals
  if (isNaN(date.getTime())) return null;
  return date;
}

function getIcon(eventType) {
  return EVENT_ICONS[eventType] ?? "•";
}

function getBadgeStyle(eventType) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.15rem 0.6rem",
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const styles = {
    clinical_note: { ...base, background: "#e3f2fd", color: "#0d47a1" },
    incident: { ...base, background: "#ffebee", color: "#b71c1c" },
    safeguarding: { ...base, background: "#fff3e0", color: "#e65100" },
    care_plan: { ...base, background: "#e8f5e9", color: "#1b5e20" },
    document: { ...base, background: "#f3e8ff", color: "#6a1b9a" },
    medication: { ...base, background: "#e0f7fa", color: "#006064" },
    assessment: { ...base, background: "#fce4ec", color: "#880e4f" },
  };
  return styles[eventType] ?? { ...base, background: "#f5f5f5", color: "#424242" };
}

function getTypeLabel(eventType) {
  if (!eventType) return "Event";
  return eventType.replace(/_/g, " ");
}

/**
 * Renders a single timeline event card. Supports both:
 * - New schema: eventType, eventTitle, eventDescription, metadata (e.g. severity, location)
 * - Legacy: type, description
 */
export default function TimelineEvent({ event }) {
  const e = event || {};
  const eventType = e.eventType ?? e.type ?? "clinical_note";
  const title = e.eventTitle ?? e.title ?? getTypeLabel(eventType);
  const description = e.eventDescription ?? e.description ?? "";
  const createdBy = e.createdBy ?? "Unknown user";
  const createdAtDate = resolveCreatedAt(e.createdAt);
  const createdAtLabel = createdAtDate
    ? createdAtDate.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown time";
  const metadata = e.metadata ?? {};
  const severity = metadata.severity ?? e.severity;
  const location = metadata.location ?? e.location;

  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        marginBottom: "0.75rem",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
          {getIcon(eventType)}
        </span>
        <span style={getBadgeStyle(eventType)}>{getTypeLabel(eventType)}</span>
        <span
          style={{
            fontSize: "0.8rem",
            color: "#64748b",
            marginLeft: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {createdAtLabel}
        </span>
      </header>

      <h3 style={{ margin: "0 0 0.35rem 0", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
        {title}
      </h3>

      {(severity || location) && (
        <p style={{ margin: "0 0 0.35rem 0", fontSize: "0.85rem", color: "#475569" }}>
          {severity && (
            <span>
              Severity: <strong style={{ textTransform: "capitalize" }}>{severity}</strong>
            </span>
          )}
          {severity && location && " · "}
          {location && <span>Location: {location}</span>}
        </p>
      )}

      {description && (
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", lineHeight: 1.45 }}>
          {description}
        </p>
      )}

      <footer
        style={{
          marginTop: "0.5rem",
          fontSize: "0.8rem",
          color: "#64748b",
        }}
      >
        {createdBy && (
          <span>
            Reported by: <strong>{createdBy}</strong>
          </span>
        )}
      </footer>
    </article>
  );
}
