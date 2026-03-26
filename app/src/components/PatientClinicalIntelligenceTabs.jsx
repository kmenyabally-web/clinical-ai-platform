import React, { useMemo, useState } from "react";
import PatientTimeline from "./PatientTimeline";
import { generateClinicalReportSection } from "../services/aiService";

function toMillis(value) {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
    try {
      return value.toMillis();
    } catch {
      return 0;
    }
  }
  if (value instanceof Date) return value.getTime();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function uniq(arr) {
  return Array.from(new Set((arr ?? []).filter(Boolean)));
}

export default function PatientClinicalIntelligenceTabs({
  patientId,
  notes,
  incidents,
  notesLoading,
  incidentsLoading,
  redactSensitive,
  formatWhen,
  refreshNotes,
}) {
  const immutableClinicalRecords = true;
  const [activeTab, setActiveTab] = useState("notes"); // notes | timeline | summaries | mdt | reports | care

  // MDT filtering (discipline + date range) applies to Summaries/MDT/Reports/Care Folder tabs.
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const disciplineOptions = useMemo(() => {
    const fromNotes = uniq((notes ?? []).map((n) => n?.discipline).filter(Boolean));
    fromNotes.sort((a, b) => String(a).localeCompare(String(b)));
    return fromNotes;
  }, [notes]);

  const filteredAiNotes = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() : null;

    return (notes ?? []).filter((n) => {
      if (!n) return false;
      if (disciplineFilter !== "all" && String(n.discipline ?? "") !== String(disciplineFilter)) return false;

      const ms = toMillis(n.createdAt);
      if (from != null && ms < from) return false;
      if (to != null && ms > to) return false;
      return true;
    });
  }, [notes, disciplineFilter, dateFrom, dateTo]);

  async function handleGenerateReport(reportType) {
    setReportError(null);
    setReportLoading(true);
    try {
      const contextNotes = filteredAiNotes
        .slice()
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .slice(0, 20)
        .map((n) => ({
          rawNote: String(n?.content ?? ""),
          correctedNote: n?.correctedNote ?? null,
          structuredSummary: n?.structured?.summary ?? null,
        }))
        .filter((x) => x.rawNote.trim());

      if (!contextNotes.length) {
        throw new Error("No notes available for the selected filters.");
      }

      const latestNote = filteredAiNotes.slice().sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))[0];
      if (!latestNote?.id) throw new Error("Could not find a target note to store the generated report.");

      const discipline = disciplineFilter !== "all" ? disciplineFilter : String(latestNote?.discipline ?? "Clinical");

      const section = await generateClinicalReportSection({
        reportType,
        patientId,
        discipline,
        contextNotes,
      });

      // Clinical notes are immutable. Report output is preview-only unless saved as a new clinical addendum/note.
      void section;
      throw new Error("This record cannot be edited. Add addendum instead.");
    } catch (e) {
      setReportError(e?.message ?? "Report generation failed.");
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.tabBar} role="tablist" aria-label="Patient clinical intelligence tabs">
        {[
          ["notes", "Notes (corrected)"],
          ["timeline", "Timeline"],
          ["summaries", "Summaries"],
          ["mdt", "MDT Reviews"],
          ["reports", "Reports"],
          ["care", "Care Folder"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            style={{
              ...styles.tabBtn,
              ...(activeTab === key ? styles.tabBtnActive : null),
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={styles.panel}>
        {activeTab === "notes" && (
          <PatientTimeline
            variant="notes"
            notes={notes ?? []}
            loadingNotes={notesLoading}
            formatWhen={formatWhen}
            emptyNotesMessage="No clinical notes recorded for this patient."
            redactSensitive={redactSensitive}
            noteTextMode="corrected"
          />
        )}

        {activeTab === "timeline" && (
          <PatientTimeline
            variant="merged"
            notes={notes ?? []}
            incidents={incidents ?? []}
            loadingNotes={notesLoading}
            loadingIncidents={incidentsLoading}
            formatWhen={formatWhen}
            redactSensitive={redactSensitive}
            noteTextMode="corrected"
          />
        )}

        {activeTab === "summaries" && (
          <SummariesPanel notes={filteredAiNotes} redactSensitive={redactSensitive} formatWhen={formatWhen} />
        )}

        {activeTab === "mdt" && (
          <div>
            <div style={styles.filterBox}>
              <div style={styles.filterTitleRow}>
                <h2 style={styles.filterTitle}>MDT filtering</h2>
                <span style={styles.filterHelp}>Applies to Summaries, MDT Reviews, Reports and Care Folder.</span>
              </div>

              <div style={styles.filterGrid}>
                <div>
                  <label style={styles.filterLabel}>Discipline</label>
                  <select style={styles.filterInput} value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value)}>
                    <option value="all">All</option>
                    {disciplineOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={styles.filterLabel}>Date from</label>
                  <input type="date" style={styles.filterInput} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>

                <div>
                  <label style={styles.filterLabel}>Date to</label>
                  <input type="date" style={styles.filterInput} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>

                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    type="button"
                    style={styles.clearBtn}
                    onClick={() => {
                      setDisciplineFilter("all");
                      setDateFrom("");
                      setDateTo("");
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <MdtReviewsPanel notes={filteredAiNotes} redactSensitive={redactSensitive} formatWhen={formatWhen} />
          </div>
        )}

        {activeTab === "reports" && (
          <ReportsPanel
            patientId={patientId}
            notes={filteredAiNotes}
            discipline={disciplineFilter}
            loading={reportLoading}
            error={reportError}
            onGenerateCPA={() => handleGenerateReport("cpa")}
            onGenerateTribunal={() => handleGenerateReport("tribunal")}
            onGenerateMdtReview={() => handleGenerateReport("mdtReview")}
            immutableClinicalRecords={immutableClinicalRecords}
          />
        )}

        {activeTab === "care" && <CareFolderPanel notes={filteredAiNotes} redactSensitive={redactSensitive} />}
      </div>
    </div>
  );
}

function SummariesPanel({ notes, redactSensitive, formatWhen }) {
  if (!notes?.length) {
    return <div style={styles.empty}>No summaries available for the selected filters.</div>;
  }

  return (
    <div style={styles.sectionList}>
      {notes
        .slice()
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .map((n) => (
          <div key={n.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>Summary</span>
              <span style={styles.cardMeta}>
                {formatWhen(n.createdAt) || "—"} · {n.authorEmail || "—"}
              </span>
            </div>
            <div style={styles.cardBody}>
              {n.summaries?.length ? (
                n.summaries.map((s, idx) => (
                  <div key={`${n.id}-s-${idx}`} style={styles.summaryItem}>
                    <div style={styles.summaryTitle}>{s.title}</div>
                    <div style={styles.summaryText}>{redactSensitive ? "" : s.text}</div>
                  </div>
                ))
              ) : (
                <div style={styles.summaryText}>{redactSensitive ? "" : n.structured?.summary || "Not documented"}</div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

function MdtReviewsPanel({ notes, redactSensitive, formatWhen }) {
  if (!notes?.length) {
    return <div style={styles.empty}>No MDT reviews available for the selected filters.</div>;
  }

  return (
    <div style={styles.sectionList}>
      {notes
        .slice()
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))
        .map((n) => (
          <div key={n.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>MDT Review</span>
              <span style={styles.cardMeta}>
                {formatWhen(n.createdAt) || "—"} · {n.discipline || "—"}
              </span>
            </div>
            <div style={styles.cardBody}>
              {n.mdtReview ? (
                <>
                  <div style={styles.summaryText}>{redactSensitive ? "" : n.mdtReview.summary || "Not documented"}</div>
                  {n.mdtReview.recommendations?.length ? (
                    <div style={styles.listBlock}>
                      <div style={styles.subTitle}>Recommendations</div>
                      <ul style={styles.ul}>
                        {n.mdtReview.recommendations.map((x, idx) => (
                          <li key={idx}>{redactSensitive ? "" : x}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={styles.summaryText}>{redactSensitive ? "" : "Not documented"}</div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

function ReportsPanel({ patientId, notes, discipline, loading, error, onGenerateCPA, onGenerateTribunal, onGenerateMdtReview, immutableClinicalRecords }) {
  const latest = notes?.slice().sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))[0];

  const cpa = latest?.reports?.cpa;
  const tribunal = latest?.reports?.tribunal;
  const mdtReview = latest?.reports?.mdtReview;

  return (
    <div>
      <div style={styles.reportActions}>
        <button type="button" style={styles.reportBtn} onClick={onGenerateCPA} disabled={loading || immutableClinicalRecords}>
          {loading ? "Generating…" : "Generate CPA report"}
        </button>
        <button type="button" style={styles.reportBtn} onClick={onGenerateTribunal} disabled={loading || immutableClinicalRecords}>
          {loading ? "Generating…" : "Generate Tribunal report"}
        </button>
        <button type="button" style={styles.reportBtn} onClick={onGenerateMdtReview} disabled={loading || immutableClinicalRecords}>
          {loading ? "Generating…" : "Generate MDT review"}
        </button>
      </div>
      {immutableClinicalRecords ? (
        <div role="status" style={styles.warningBox}>
          This record cannot be edited. Add addendum instead.
        </div>
      ) : null}

      {error ? <div role="alert" style={styles.errorBox}>{error}</div> : null}

      {!latest ? (
        <div style={styles.empty}>No reports available yet. Add a clinical note first.</div>
      ) : (
        <div style={styles.sectionList}>
          {cpa ? (
            <ReportCard title="CPA report" section={cpa} />
          ) : (
            <div style={styles.empty}>CPA report not generated for the selected set.</div>
          )}
          {tribunal ? (
            <ReportCard title="Tribunal report" section={tribunal} />
          ) : (
            <div style={styles.empty}>Tribunal report not generated for the selected set.</div>
          )}
          {mdtReview ? (
            <ReportCard title="MDT review report" section={mdtReview} />
          ) : (
            <div style={styles.empty}>MDT review report not generated for the selected set.</div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ title, section }) {
  return (
    <div style={styles.card} aria-label={title}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>{title}</span>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.summaryTitle}>{section?.title || title}</div>
        <div style={styles.reportContent}>{section?.content || "Not documented"}</div>
      </div>
    </div>
  );
}

function CareFolderPanel({ notes, redactSensitive }) {
  const placements = useMemo(() => {
    const out = [];
    for (const n of notes ?? []) {
      const p = n?.careFolder?.suggestedPlacements ?? [];
      for (const item of p) out.push({ ...item, sourceNoteId: n?.id });
    }
    return out;
  }, [notes]);

  if (!placements.length) return <div style={styles.empty}>No care-folder suggestions available.</div>;

  return (
    <div style={styles.sectionList}>
      {placements.map((p, idx) => (
        <div key={`${p.sourceNoteId ?? "n"}-${idx}`} style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>{p.title || "Care folder suggestion"}</span>
            <span style={styles.cardMeta}>{p.section} · {p.documentType}</span>
          </div>
          <div style={styles.cardBody}>
            <div style={styles.summaryText}>{redactSensitive ? "" : p.content || "Not documented"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrap: {},
  tabBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    color: "#334155",
  },
  tabBtnActive: {
    borderColor: "#7dd3fc",
    background: "#e0f2fe",
    color: "#0d47a1",
  },
  panel: {},
  filterBox: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "1rem 1.25rem",
    marginBottom: 12,
  },
  filterTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "baseline",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  filterTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
  },
  filterHelp: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748b",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr) 120px",
    gap: 12,
    alignItems: "end",
  },
  filterLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 900,
    color: "#475569",
    marginBottom: 6,
  },
  filterInput: {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    fontSize: 13,
    background: "#fff",
  },
  clearBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    cursor: "pointer",
    fontWeight: 900,
    color: "#0f172a",
  },
  sectionList: {},
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "baseline",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  cardTitle: {
    fontWeight: 900,
    color: "#0f172a",
    fontSize: 13,
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 800,
  },
  cardBody: {},
  empty: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontWeight: 800,
    fontSize: 13,
    marginBottom: 12,
  },
  summaryItem: {
    marginBottom: 10,
  },
  summaryTitle: {
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 4,
    fontSize: 13,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 1.45,
    color: "#334155",
    whiteSpace: "pre-wrap",
  },
  listBlock: {
    marginTop: 10,
  },
  subTitle: {
    fontWeight: 900,
    color: "#0f172a",
    fontSize: 12,
    marginBottom: 6,
  },
  ul: {
    margin: 0,
    paddingLeft: 18,
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.45,
  },
  reportActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  reportBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    background: "#005eb8",
    color: "white",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  },
  errorBox: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    fontWeight: 900,
    fontSize: 13,
    marginBottom: 12,
  },
  warningBox: {
    padding: "12px 14px",
    borderRadius: 12,
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    fontWeight: 900,
    fontSize: 13,
    marginBottom: 12,
  },
  reportContent: {
    whiteSpace: "pre-wrap",
    fontSize: 13,
    lineHeight: 1.45,
    color: "#334155",
  },
};

