import { useState } from "react";
import { CQC_DOCUMENT_DOMAINS, DOCUMENT_TYPES } from "../config/documentDomains";
import { getSupportedAcceptString, isSupportedFileType } from "../services/documentService";

/**
 * Modal to upload a document: title, documentType, domainType, description, fileUpload.
 * Supported types: pdf, docx, xlsx, jpg, png. Stored in Firebase Storage; metadata in Firestore (policies or evidence_documents).
 */
export default function UploadDocumentModal({ open, onClose, onSubmit, loading }) {
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("evidence");
  const [domainType, setDomainType] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);

  function reset() {
    setTitle("");
    setDocumentType("evidence");
    setDomainType("");
    setDescription("");
    setFile(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    if (!isSupportedFileType(file)) {
      return; // UI can show error; parent may also validate
    }
    onSubmit({
      title: title.trim(),
      documentType,
      domainType: domainType || null,
      description: description.trim(),
      file,
    });
    reset();
    onClose();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-document-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "1.5rem 2rem",
          minWidth: 420,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="upload-document-title" style={{ marginTop: 0, marginBottom: "1rem" }}>
          Upload document
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="doc-title" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Title *
            </label>
            <input
              id="doc-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              placeholder="e.g. Safeguarding Policy"
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="doc-type" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Document type *
            </label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={inputStyle}
            >
              {DOCUMENT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="doc-domain" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Domain (CQC) *
            </label>
            <select
              id="doc-domain"
              value={domainType}
              onChange={(e) => setDomainType(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">— Select domain —</option>
              {CQC_DOCUMENT_DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="doc-description" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Description
            </label>
            <textarea
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Optional description"
            />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="doc-file" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              File * (pdf, docx, xlsx, jpg, png)
            </label>
            <input
              id="doc-file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={inputStyle}
              accept={getSupportedAcceptString()}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={handleClose} style={buttonSecondary}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !domainType || !file}
              style={buttonPrimary}
            >
              {loading ? "Uploading…" : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #ccc",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

const buttonPrimary = {
  padding: "8px 16px",
  background: "#1976d2",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
};

const buttonSecondary = {
  padding: "8px 16px",
  background: "#f5f5f5",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: 6,
  cursor: "pointer",
};
