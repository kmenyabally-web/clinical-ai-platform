import { useState, useEffect } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { subscribeEvidence, uploadEvidence, isSupportedFileType } from "../services/evidenceService";
import { EVIDENCE_DOMAINS } from "../config/evidenceDomains";
import { formatUkDate } from "../utils/dateFormat";

function formatUploadDate(uploadedAt) {
  return formatUkDate(uploadedAt, "—");
}

const sectionStyle = {
  marginBottom: "1.5rem",
  padding: "1.25rem",
  background: "#ffffff",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const itemStyle = {
  padding: "0.75rem 0",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "0.5rem",
};

const emptyStateStyle = {
  color: "#64748b",
  fontSize: "14px",
  marginTop: "0.5rem",
  fontStyle: "italic",
};

const buttonPrimary = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#1976d2",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const buttonSecondary = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  fontSize: "14px",
  cursor: "pointer",
};

export default function Evidence() {
  const { organisationId } = useOrganisation();
  const { currentServiceId, setCurrentServiceId, services = [], loading: serviceLoading } = useService();
  const { user } = useAuth();
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalDomain, setUploadModalDomain] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    if (!organisationId) {
      setEvidence([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeEvidence(
      organisationId,
      currentServiceId ?? null,
      (list) => {
        setEvidence(Array.isArray(list) ? list : []);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [organisationId, currentServiceId]);

  const evidenceByDomain = EVIDENCE_DOMAINS.reduce((acc, { value }) => {
    acc[value] = evidence.filter((e) => (e.domain || "").toLowerCase() === value);
    return acc;
  }, {});

  function openUploadModal(domainValue) {
    setUploadModalDomain(domainValue);
    setUploadTitle("");
    setUploadFile(null);
    setUploadError(null);
  }

  function closeUploadModal() {
    setUploadModalDomain(null);
    setUploadTitle("");
    setUploadFile(null);
    setUploadError(null);
  }

  function handleUploadSubmit(e) {
    e.preventDefault();
    if (!organisationId || !uploadModalDomain || !uploadTitle.trim() || !uploadFile) {
      setUploadError("Please enter a title and select a file.");
      return;
    }
    if (!isSupportedFileType(uploadFile)) {
      setUploadError("File type not supported. Use: pdf, docx, xlsx, jpg, png.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    uploadEvidence(
      organisationId,
      currentServiceId ?? null,
      uploadModalDomain,
      uploadTitle.trim(),
      uploadFile,
      user?.uid ?? ""
    )
      .then(() => {
        closeUploadModal();
      })
      .catch((err) => {
        setUploadError(err?.message ?? "Upload failed.");
      })
      .finally(() => setUploading(false));
  }

  const safeServices = Array.isArray(services) ? services : [];
  const hasService = safeServices.length > 0;

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginTop: 0, marginBottom: "1rem", fontSize: "1.75rem", color: "#1e293b" }}>
        Evidence Management
      </h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="evidence-service-select" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#334155" }}>
          Select Service
        </label>
        <select
          id="evidence-service-select"
          value={currentServiceId ?? ""}
          onChange={(e) => setCurrentServiceId(e.target.value || null)}
          disabled={serviceLoading || !hasService}
          style={{
            minWidth: 280,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            fontSize: "14px",
            background: "#fff",
          }}
        >
          <option value="">{hasService ? "— Select a service —" : "No services available"}</option>
          {safeServices.map((s) => (
            <option key={s.id} value={s.id}>
              {s.serviceName || s.id}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
          Loading evidence…
        </div>
      ) : (
        EVIDENCE_DOMAINS.map(({ value, label }) => (
          <section key={value} style={sectionStyle} aria-labelledby={`domain-${value}`}>
            <h2 id={`domain-${value}`} style={{ margin: "0 0 0.75rem", fontSize: "1.125rem", color: "#1e293b" }}>
              {label}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => openUploadModal(value)}
                style={buttonPrimary}
                disabled={!currentServiceId && hasService}
              >
                Upload Evidence
              </button>
            </div>
            {evidenceByDomain[value]?.length > 0 ? (
              <div style={{ marginTop: "0.5rem" }}>
                {evidenceByDomain[value].map((item) => (
                  <div key={item.id} style={itemStyle}>
                    <span style={{ fontWeight: 500, color: "#1e293b" }}>{item.title || "Untitled"}</span>
                    <span style={{ fontSize: "0.875rem", color: "#64748b" }}>
                      Uploaded: {formatUploadDate(item.uploadedAt)}
                    </span>
                    {item.fileUrl ? (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.875rem", color: "#1976d2", fontWeight: 600 }}
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p style={emptyStateStyle}>No evidence uploaded for this domain yet.</p>
            )}
          </section>
        ))
      )}

      {uploadModalDomain != null && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-modal-title"
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: "1.5rem",
              minWidth: 360,
              maxWidth: "90vw",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h2 id="upload-modal-title" style={{ margin: "0 0 1rem", fontSize: "1.25rem" }}>
              Upload Evidence — {EVIDENCE_DOMAINS.find((d) => d.value === uploadModalDomain)?.label ?? uploadModalDomain}
            </h2>
            <form onSubmit={handleUploadSubmit}>
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="evidence-title" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>
                  Title
                </label>
                <input
                  id="evidence-title"
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Safeguarding Policy"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                  }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label htmlFor="evidence-file" style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600 }}>
                  File
                </label>
                <input
                  id="evidence-file"
                  type="file"
                  accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  style={{ fontSize: "14px" }}
                />
              </div>
              {uploadError && (
                <p style={{ color: "#c62828", fontSize: "14px", marginBottom: "0.75rem" }}>{uploadError}</p>
              )}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={closeUploadModal} style={buttonSecondary} disabled={uploading}>
                  Cancel
                </button>
                <button type="submit" style={buttonPrimary} disabled={uploading}>
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
