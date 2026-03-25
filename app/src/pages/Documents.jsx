/** [ENABLEMENT GATE: STAGE 12 - DOCUMENT MANAGEMENT SYSTEM] */

import { useMemo, useEffect, useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import {
  uploadDocument,
  fetchManagedDocuments,
  getSupportedAcceptString,
  isSupportedFileType,
} from "../services/documentService";
import { logAuditEventNonBlocking } from "../services/auditService";
import { formatUkDate } from "../utils/dateFormat";

const CATEGORY_TILES = ["Insurance", "Policies", "ID", "Training", "Other"];

function toMillis(value) {
  if (!value) return null;
  if (typeof value?.toMillis === "function") return value.toMillis();
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.getTime();
}

function formatWhen(value) {
  const ms = toMillis(value);
  if (!ms) return "—";
  return formatUkDate(ms, "—");
}

function expiryWarning(expiryDate) {
  const ms = toMillis(expiryDate);
  if (!ms) return null;
  const now = Date.now();
  const diffDays = Math.ceil((ms - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { tone: "expired", text: `Expired ${Math.abs(diffDays)} day(s) ago` };
  if (diffDays <= 30) return { tone: "soon", text: `Expiring in ${diffDays} day(s)` };
  return null;
}

function UploadManagedDocumentModal({ open, onClose, onSubmit, loading }) {
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("Other");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setCategory("Other");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    if (!isSupportedFileType(file)) {
      setError("File type not supported. Use the allowed formats in the file picker.");
      return;
    }
    onSubmit({ file, category });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-managed-document-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "1.5rem 2rem",
          maxWidth: 720,
          width: "100%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 id="upload-managed-document-title" style={{ margin: 0, fontSize: "1.1rem" }}>
            Upload Document
          </h2>
          <button type="button" onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.25rem" }}>
            ×
          </button>
        </div>

        {error && <p role="alert" style={{ margin: "0 0 1rem 0", color: "#b91c1c" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>File *</label>
            <input
              type="file"
              required
              accept={getSupportedAcceptString()}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 700 }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            >
              {CATEGORY_TILES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: "10px 14px", borderRadius: 8, border: "none", background: "#1976d2", color: "#fff", fontWeight: 800, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Documents() {
  const { organisationId } = useOrganisation();
  const { can } = useRole();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  const canUpload = can("audit:create");

  async function load({ mode = "initial" } = {}) {
    if (!organisationId) {
      setDocuments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const list = await fetchManagedDocuments(organisationId);
      setDocuments(Array.isArray(list) ? list : []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Documents fetch failed:", err);
      setError(err?.message ?? "Failed to load documents.");
      setDocuments([]);
    } finally {
      if (mode === "refresh") setRefreshing(false);
      else setLoading(false);
    }
  }

  useEffect(() => {
    load({ mode: "initial" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organisationId]);

  const searchLower = search.trim().toLowerCase();

  const docsBySearch = useMemo(() => {
    if (!searchLower) return documents;
    return documents.filter((d) => (d.fileName ?? "").toLowerCase().includes(searchLower));
  }, [documents, searchLower]);

  const countsByCategory = useMemo(() => {
    const counts = {};
    for (const c of CATEGORY_TILES) counts[c] = 0;
    for (const d of docsBySearch) {
      const cat = d.category && CATEGORY_TILES.includes(d.category) ? d.category : "Other";
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [docsBySearch]);

  const visibleDocs = useMemo(() => {
    const base = docsBySearch;
    if (selectedCategory === "All") return base;
    return base.filter((d) => (d.category ?? "Other") === selectedCategory);
  }, [docsBySearch, selectedCategory]);

  useEffect(() => {
    if (!documents || documents.length === 0) return;
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("Debug:", { docCategories: documents.length, visibleDocs: visibleDocs.length });
    }
  }, [documents, selectedCategory, visibleDocs.length]);

  async function handleUpload({ file, category }) {
    if (!organisationId) return;
    setUploadLoading(true);
    setError(null);
    try {
      await uploadDocument(file, { category, expiryDate: null });
      await logAuditEventNonBlocking({ action: "DOCUMENT_UPLOADED" });
      setUploadOpen(false);
      // Keep existing list visible while fetching the updated server state.
      await load({ mode: "refresh" });
    } catch (err) {
      setError(err?.message ?? "Failed to upload document.");
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <div>
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Documents</h1>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#555" }}>
            Organise and monitor documents by category.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 280 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name…"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
          {canUpload && (
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              style={{
                padding: "10px 14px",
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Upload Document
            </button>
          )}

          <button
            type="button"
            onClick={() => load({ mode: "refresh" })}
            disabled={!organisationId || refreshing}
            style={{
              padding: "10px 14px",
              background: "#fff",
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontWeight: 900,
              cursor: !organisationId || refreshing ? "default" : "pointer",
              opacity: !organisationId || refreshing ? 0.6 : 1,
            }}
          >
            Manual Sync
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p aria-busy="true">Loading documents…</p>
      ) : refreshing ? (
        <p aria-busy="true">Refreshing list…</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 14,
            }}
          >
            {["All", ...CATEGORY_TILES].map((cat) => {
              const count =
                cat === "All"
                  ? docsBySearch.length
                  : countsByCategory[cat] ?? 0;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    textAlign: "left",
                    padding: "14px 14px",
                    borderRadius: 12,
                    border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    background: isActive ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    minHeight: 64,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                    <strong style={{ fontSize: 14 }}>{cat === "All" ? "All categories" : cat}</strong>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#64748b" }}>{count}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {visibleDocs.length === 0 ? (
            <p style={{ color: "#64748b", padding: "1.25rem 1rem", background: "#f8fafc", borderRadius: 12 }}>
              {documents.length > 0
                ? `No documents match the current filters (Total documents in DB: ${documents.length}).`
                : "No documents match your filters."}
            </p>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {visibleDocs
                .slice()
                .sort((a, b) => (toMillis(b.uploadedAt) ?? 0) - (toMillis(a.uploadedAt) ?? 0))
                .map((doc) => {
                  const warn = expiryWarning(doc.expiryDate);
                  return (
                    <div
                      key={doc.id}
                      style={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: "14px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 900, color: "#2563eb", textDecoration: "none" }}>
                              {doc.fileName || "Untitled"}
                            </a>
                            <span style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "2px 8px", borderRadius: 999 }}>
                              {doc.category ?? "Other"}
                            </span>
                          </div>
                          <div style={{ marginTop: 6, color: "#64748b", fontSize: 12, fontWeight: 800 }}>
                            Uploaded: {formatWhen(doc.uploadedAt)}
                          </div>
                        </div>

                        <div>
                          {warn && (
                            <div
                              style={{
                                background: warn.tone === "expired" ? "rgba(185,28,28,0.10)" : "rgba(234,179,8,0.15)",
                                border: warn.tone === "expired" ? "1px solid rgba(185,28,28,0.35)" : "1px solid rgba(234,179,8,0.45)",
                                color: warn.tone === "expired" ? "#b91c1c" : "#b45309",
                                padding: "8px 10px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 900,
                                maxWidth: 260,
                              }}
                            >
                              {warn.text}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}

      <UploadManagedDocumentModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSubmit={handleUpload} loading={uploadLoading} />
    </div>
  );
}
