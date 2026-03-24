/**
 * Unified patient timeline shell — notes, incidents, and future risk alerts.
 * Safe when `structured` is absent (optional chaining throughout).
 */

import React from "react";
import type { ClinicalNote } from "../types/clinical";

export type TimelineIncident = {
  id: string;
  title?: string;
  location?: string;
  severity?: string;
  occurredAt?: unknown;
  createdAt?: unknown;
};

export type PatientTimelineVariant = "notes" | "incidents" | "merged";

type Props = {
  variant: PatientTimelineVariant;
  notes?: Array<ClinicalNote & { mood?: string | null }>;
  incidents?: TimelineIncident[];
  loadingNotes?: boolean;
  loadingIncidents?: boolean;
  formatWhen: (value: unknown) => string;
  emptyNotesMessage?: string;
  emptyIncidentsMessage?: string;
  /** Inspector / oversight: hide structured risk and narrative detail. */
  redactSensitive?: boolean;
};

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof (value as { toMillis: () => number }).toMillis === "function") {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  if (value instanceof Date) return value.getTime();
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

type MergedEntry =
  | { kind: "clinical_note"; id: string; sortKey: number; note: ClinicalNote & { mood?: string | null } }
  | { kind: "incident"; id: string; sortKey: number; incident: TimelineIncident };

function buildMerged(notes: Props["notes"], incidents: Props["incidents"]): MergedEntry[] {
  const out: MergedEntry[] = [];
  for (const n of notes ?? []) {
    out.push({
      kind: "clinical_note",
      id: n.id,
      sortKey: toMillis(n.createdAt),
      note: n,
    });
  }
  for (const inc of incidents ?? []) {
    const sortKey = toMillis(inc.occurredAt) || toMillis(inc.createdAt);
    out.push({ kind: "incident", id: inc.id, sortKey, incident: inc });
  }
  out.sort((a, b) => b.sortKey - a.sortKey);
  return out;
}

const riskTagStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 800,
  color: "#9a3412",
  backgroundColor: "#ffedd5",
  border: "1px solid #fdba74",
  padding: "2px 8px",
  borderRadius: 999,
  marginRight: 6,
  marginTop: 4,
};

const disciplineBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#1e3a5f",
  backgroundColor: "#e0f2fe",
  border: "1px solid #7dd3fc",
  padding: "2px 8px",
  borderRadius: 999,
};

export default function PatientTimeline({
  variant,
  notes = [],
  incidents = [],
  loadingNotes = false,
  loadingIncidents = false,
  formatWhen,
  emptyNotesMessage = "No clinical notes recorded for this patient.",
  emptyIncidentsMessage = "No incidents recorded for this patient.",
  redactSensitive = false,
}: Props) {
  if (variant === "merged") {
    if (loadingNotes || loadingIncidents) {
      return <div style={metaStyle}>Loading timeline…</div>;
    }
    const merged = buildMerged(notes, incidents);
    if (merged.length === 0) {
      return <div style={emptyStyle}>No timeline events yet.</div>;
    }
    return (
      <ul style={listStyle}>
        {merged.map((entry) =>
          entry.kind === "clinical_note" ? (
            <li key={`n-${entry.id}`} style={itemStyle}>
              <NoteBody note={entry.note} formatWhen={formatWhen} showKindLabel redactSensitive={redactSensitive} />
            </li>
          ) : (
            <li key={`i-${entry.id}`} style={itemStyle}>
              <IncidentBody incident={entry.incident} formatWhen={formatWhen} showKindLabel />
            </li>
          )
        )}
      </ul>
    );
  }

  if (variant === "notes") {
    if (loadingNotes) {
      return <div style={metaStyle}>Loading…</div>;
    }
    if (!notes.length) {
      return <div style={emptyStyle}>{emptyNotesMessage}</div>;
    }
    return (
      <ul style={listStyle}>
        {notes.map((n) => (
            <li key={n.id} style={itemStyle}>
            <NoteBody note={n} formatWhen={formatWhen} redactSensitive={redactSensitive} />
          </li>
        ))}
      </ul>
    );
  }

  if (variant === "incidents") {
    if (loadingIncidents) {
      return <div style={metaStyle}>Loading…</div>;
    }
    if (!incidents.length) {
      return <div style={emptyStyle}>{emptyIncidentsMessage}</div>;
    }
    return (
      <ul style={listStyle}>
        {incidents.map((x) => (
          <li key={x.id} style={itemStyle}>
            <IncidentBody incident={x} formatWhen={formatWhen} />
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

function NoteBody({
  note,
  formatWhen,
  showKindLabel,
  redactSensitive = false,
}: {
  note: ClinicalNote & { mood?: string | null };
  formatWhen: (value: unknown) => string;
  showKindLabel?: boolean;
  redactSensitive?: boolean;
}) {
  const mood = note.structured?.mood ?? note.mood ?? "";
  const behaviour = redactSensitive ? "" : (note.structured?.behaviour ?? "");
  const engagement = redactSensitive ? "" : (note.structured?.engagement ?? "");
  const physicalHealth = redactSensitive ? "" : (note.structured?.physicalHealth ?? "");
  const medicationIssues = redactSensitive ? "" : (note.structured?.medicationIssues ?? "");
  const summary = redactSensitive ? "" : (note.structured?.summary ?? "");
  const risks = redactSensitive ? [] : (note.structured?.riskIndicators ?? []);

  return (
    <>
      <div style={topRowStyle}>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {showKindLabel ? (
            <span style={kindPillStyle}>Note</span>
          ) : null}
          <span style={disciplineBadgeStyle} title="MDT role">
            [{note.discipline || "—"}]
          </span>
          {note.category ? (
            <span style={categoryBadgeStyle}>{note.category}</span>
          ) : null}
        </span>
        {mood ? <span style={moodStyle}>{mood}</span> : null}
      </div>
      {behaviour ? (
        <div style={behaviourStyle}>
          <span style={subLabelStyle}>Behaviour: </span>
          {behaviour}
        </div>
      ) : null}
      {engagement ? (
        <div style={behaviourStyle}>
          <span style={subLabelStyle}>Engagement: </span>
          {engagement}
        </div>
      ) : null}
      {physicalHealth ? (
        <div style={behaviourStyle}>
          <span style={subLabelStyle}>Physical health: </span>
          {physicalHealth}
        </div>
      ) : null}
      {medicationIssues ? (
        <div style={behaviourStyle}>
          <span style={subLabelStyle}>Medication: </span>
          {medicationIssues}
        </div>
      ) : null}
      {summary ? (
        <div style={summaryStyle}>
          <span style={subLabelStyle}>AI summary: </span>
          {summary}
        </div>
      ) : null}
      {risks.length > 0 ? (
        <div style={riskRowStyle}>
          {risks.map((r) => (
            <span key={r} style={riskTagStyle}>
              {r}
            </span>
          ))}
        </div>
      ) : null}
      <div style={subStyle}>
        <span>{formatWhen(note.createdAt) || "—"}</span>
        <span> · </span>
        <span>{note.authorEmail || "—"}</span>
      </div>
      {redactSensitive ? (
        <div style={restrictedBannerStyle}>Structured risk and clinical detail are restricted for this role.</div>
      ) : null}
      {note.content ? <div style={contentStyle}>{note.content}</div> : null}
    </>
  );
}

const restrictedBannerStyle: React.CSSProperties = {
  marginTop: 8,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 700,
  color: "#92400e",
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: 8,
};

function IncidentBody({
  incident,
  formatWhen,
  showKindLabel,
}: {
  incident: TimelineIncident;
  formatWhen: (value: unknown) => string;
  showKindLabel?: boolean;
}) {
  return (
    <>
      <div style={incidentTopStyle}>
        <span style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {showKindLabel ? <span style={kindPillIncidentStyle}>Incident</span> : null}
          <span style={incidentTitleStyle}>{incident.title || "Incident"}</span>
        </span>
        <span style={severityStyle}>{(incident.severity || "").toUpperCase()}</span>
      </div>
      <div style={subStyle}>
        <span>{formatWhen(incident.occurredAt || incident.createdAt) || "—"}</span>
        <span> · </span>
        <span>{incident.location || "—"}</span>
      </div>
    </>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

const itemStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderBottom: "1px solid #f1f5f9",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const categoryBadgeStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#0f172a",
  backgroundColor: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "2px 8px",
  borderRadius: 999,
};

const moodStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1,
};

const behaviourStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#334155",
  lineHeight: 1.4,
};

const summaryStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#1e3a5f",
  lineHeight: 1.45,
  fontStyle: "italic",
};

const subLabelStyle: React.CSSProperties = {
  fontWeight: 800,
  color: "#475569",
};

const riskRowStyle: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 4,
};

const subStyle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  color: "#475569",
};

const contentStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#334155",
  whiteSpace: "pre-wrap",
  lineHeight: 1.4,
};

const emptyStyle: React.CSSProperties = {
  padding: "12px 14px",
  color: "#334155",
  fontSize: 13,
};

const metaStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
};

const incidentTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "baseline",
};

const incidentTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 13,
};

const severityStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#0f172a",
  backgroundColor: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "2px 8px",
  borderRadius: 999,
};

const kindPillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#0369a1",
  backgroundColor: "#e0f2fe",
  padding: "2px 8px",
  borderRadius: 999,
};

const kindPillIncidentStyle: React.CSSProperties = {
  ...kindPillStyle,
  color: "#9a3412",
  backgroundColor: "#ffedd5",
};
