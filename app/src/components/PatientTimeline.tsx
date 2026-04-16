/**
 * Unified patient timeline shell — notes, incidents, and future risk alerts.
 * Safe when `structured` is absent (optional chaining throughout).
 */

import React from "react";
import { CLINICAL_EMPTY_PATIENT } from "../constants/clinicalCopy";
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
  /** Which narrative text to display for clinical notes. */
  noteTextMode?: "raw" | "corrected";
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

type GroupLabel = "TODAY" | "YESTERDAY" | "OLDER";
type CompactItem = {
  id: string;
  group: GroupLabel;
  sortKey: number;
  time: string;
  role: string;
  summary: string;
};

function toGroupLabel(sortKey: number): GroupLabel {
  if (!sortKey) return "OLDER";
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  if (sortKey >= todayStart) return "TODAY";
  if (sortKey >= yesterdayStart) return "YESTERDAY";
  return "OLDER";
}

function formatTimeOnly(sortKey: number): string {
  if (!sortKey) return "—";
  return new Date(sortKey).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateSummary(text: string, max = 140): string {
  const value = (text ?? "").trim();
  if (!value) return "No summary available.";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildCompactItems({
  variant,
  notes,
  incidents,
  noteTextMode,
  redactSensitive,
}: {
  variant: PatientTimelineVariant;
  notes: Array<ClinicalNote & { mood?: string | null }>;
  incidents: TimelineIncident[];
  noteTextMode: "raw" | "corrected";
  redactSensitive: boolean;
}): CompactItem[] {
  if (variant === "notes") {
    return notes
      .map((note) => {
        const sortKey = toMillis(note.createdAt);
        const narrative = noteTextMode === "corrected" ? note.correctedNote ?? note.content : note.content;
        const structuredSummary = note.structured?.summary ?? note.aiSummary ?? "";
        const summary = redactSensitive ? "Clinical detail restricted for this role." : (structuredSummary || narrative || "");
        return {
          id: `n-${note.id}`,
          group: toGroupLabel(sortKey),
          sortKey,
          time: formatTimeOnly(sortKey),
          role: note.discipline || "Clinical",
          summary: truncateSummary(summary),
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }

  if (variant === "incidents") {
    return incidents
      .map((incident) => {
        const sortKey = toMillis(incident.occurredAt) || toMillis(incident.createdAt);
        const severity = (incident.severity || "").toString().trim();
        const summary = `${incident.title || "Incident"}${severity ? ` (${severity})` : ""}`;
        return {
          id: `i-${incident.id}`,
          group: toGroupLabel(sortKey),
          sortKey,
          time: formatTimeOnly(sortKey),
          role: "Incident",
          summary: truncateSummary(summary),
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);
  }

  return buildMerged(notes, incidents).map((entry) => {
    if (entry.kind === "clinical_note") {
      const note = entry.note;
      const narrative = noteTextMode === "corrected" ? note.correctedNote ?? note.content : note.content;
      const structuredSummary = note.structured?.summary ?? note.aiSummary ?? "";
      const summary = redactSensitive ? "Clinical detail restricted for this role." : (structuredSummary || narrative || "");
      return {
        id: `n-${entry.id}`,
        group: toGroupLabel(entry.sortKey),
        sortKey: entry.sortKey,
        time: formatTimeOnly(entry.sortKey),
        role: note.discipline || "Clinical",
        summary: truncateSummary(summary),
      };
    }

    const severity = (entry.incident.severity || "").toString().trim();
    const summary = `${entry.incident.title || "Incident"}${severity ? ` (${severity})` : ""}`;
    return {
      id: `i-${entry.id}`,
      group: toGroupLabel(entry.sortKey),
      sortKey: entry.sortKey,
      time: formatTimeOnly(entry.sortKey),
      role: "Incident",
      summary: truncateSummary(summary),
    };
  });
}

function groupItems(items: CompactItem[]): Record<GroupLabel, CompactItem[]> {
  return {
    TODAY: items.filter((item) => item.group === "TODAY"),
    YESTERDAY: items.filter((item) => item.group === "YESTERDAY"),
    OLDER: items.filter((item) => item.group === "OLDER"),
  };
}

export default function PatientTimeline({
  variant,
  notes = [],
  incidents = [],
  loadingNotes = false,
  loadingIncidents = false,
  formatWhen,
  emptyNotesMessage = CLINICAL_EMPTY_PATIENT,
  emptyIncidentsMessage = "⚠️ No incident data available for this patient yet.",
  redactSensitive = false,
  noteTextMode = "raw",
}: Props) {
  if (variant === "merged" && (loadingNotes || loadingIncidents)) {
    return <div style={metaStyle}>Loading timeline…</div>;
  }
  if (variant === "notes" && loadingNotes) {
    return <div style={metaStyle}>Loading…</div>;
  }
  if (variant === "incidents" && loadingIncidents) {
    return <div style={metaStyle}>Loading…</div>;
  }

  const items = buildCompactItems({
    variant,
    notes,
    incidents,
    noteTextMode,
    redactSensitive,
  });
  if (!items.length) {
    if (variant === "notes") {
      return (
        <div className="clinical-empty" style={{ marginTop: 4 }}>
          {emptyNotesMessage}
        </div>
      );
    }
    if (variant === "incidents") {
      return (
        <div className="clinical-empty" style={{ marginTop: 4 }}>
          {emptyIncidentsMessage}
        </div>
      );
    }
    return (
      <div className="clinical-empty" style={{ marginTop: 4 }}>
        ⚠️ No timeline data available for this patient yet.
      </div>
    );
  }

  const grouped = groupItems(items);
  const sectionOrder: GroupLabel[] = ["TODAY", "YESTERDAY", "OLDER"];

  return (
    <div>
      {sectionOrder.map((section) =>
        grouped[section].length > 0 ? (
          <section key={section} style={sectionStyle}>
            <h4 style={sectionHeadingStyle}>{section}</h4>
            <ul style={listStyle}>
              {grouped[section].map((item) => (
                <li key={item.id} style={itemStyle}>
                  <div style={compactRowStyle}>
                    <span style={timeStyle}>{item.time}</span>
                    <span style={roleStyle}>{item.role}</span>
                  </div>
                  <p style={summaryStyle}>{item.summary}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </div>
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

const compactRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const summaryStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 12,
  color: "#334155",
  lineHeight: 1.4,
};

const timeStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#475569",
  fontWeight: 800,
};

const roleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#0f172a",
  backgroundColor: "#f1f5f9",
  border: "1px solid #e2e8f0",
  padding: "2px 8px",
  borderRadius: 999,
  fontWeight: 800,
};

const metaStyle: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 12,
};

const sectionHeadingStyle: React.CSSProperties = {
  margin: "0 0 6px 0",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};
