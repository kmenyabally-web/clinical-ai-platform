import { useState, useEffect } from "react";
import { CQC_DOCUMENT_DOMAINS } from "../config/documentDomains";

/**
 * Modal to edit document metadata: title, domainType, description.
 * Manager/Admin only (RBAC enforced by parent).
 */
export default function EditDocumentModal({ open, document: doc, onClose, onSubmit, loading }) {
  const [title, setTitle] = useState("");
  const [domainType, setDomainType] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (doc) {
      setTitle(doc.title ?? "");
      setDomainType(doc.domainType ?? "");
      setDescription(doc.description ?? "");
    }
  }, [doc]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      domainType: domainType || null,
      description: description.trim(),
    });
    onClose();
  }

  if (!open || !doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-document-title"
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
          minWidth: 420,
          maxWidth: "90vw",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-document-title" style={{ marginTop: 0, marginBottom: "1rem" }}>
          Edit document
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="edit-title" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Title *
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="edit-domain" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Domain *
            </label>
            <select
              id="edit-domain"
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
          <div style={{ marginBottom: "1.25rem" }}>
            <label htmlFor="edit-description" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
              Description
            </label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={buttonSecondary}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={buttonPrimary}>
              {loading ? "Saving…" : "Save"}
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
