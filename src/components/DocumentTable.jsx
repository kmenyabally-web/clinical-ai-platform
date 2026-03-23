import { CQC_DOCUMENT_DOMAINS, DOCUMENT_TYPES } from "../config/documentDomains";
import { formatUkDate } from "../utils/dateFormat";

function formatDate(value) {
  return formatUkDate(value, "—");
}

const domainLabel = (value) => CQC_DOCUMENT_DOMAINS.find((d) => d.value === value)?.label ?? value ?? "—";
const typeLabel = (value) => DOCUMENT_TYPES.find((d) => d.value === value)?.label ?? value ?? "—";

/**
 * Table: Document Name, Domain, Type, Uploaded By, Upload Date, Actions.
 * Actions: View/Download link; Edit metadata (when canEditMetadata).
 */
export default function DocumentTable({
  documents = [],
  canEditMetadata = false,
  onEdit,
}) {
  if (documents.length === 0) {
    return (
      <p style={{ color: "#666", padding: "1rem 0" }}>No documents yet. Upload one to get started.</p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle} aria-label="Documents">
        <thead>
          <tr>
            <th style={thStyle}>Document name</th>
            <th style={thStyle}>Domain</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Uploaded by</th>
            <th style={thStyle}>Upload date</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={`${doc.collection}-${doc.id}`}>
              <td style={tdStyle}>
                {doc.fileUrl ? (
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                    {doc.title || doc.fileName || "—"}
                  </a>
                ) : (
                  <strong>{doc.title || doc.fileName || "—"}</strong>
                )}
              </td>
              <td style={tdStyle}>{domainLabel(doc.domainType)}</td>
              <td style={tdStyle}>{typeLabel(doc.documentType)}</td>
              <td style={tdStyle}>{doc.uploadedBy || "—"}</td>
              <td style={tdStyle}>{formatDate(doc.createdAt)}</td>
              <td style={tdStyle}>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.875rem" }}
                    >
                      View / Download
                    </a>
                  )}
                  {canEditMetadata && (
                    <button
                      type="button"
                      onClick={() => onEdit?.(doc)}
                      style={btnEdit}
                    >
                      Edit
                    </button>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: 8,
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const thStyle = {
  textAlign: "left",
  padding: "12px 16px",
  background: "#f5f5f5",
  fontWeight: 600,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};

const tdStyle = {
  padding: "12px 16px",
  borderTop: "1px solid #eee",
  fontSize: 14,
};

const btnEdit = {
  padding: "4px 10px",
  fontSize: "0.875rem",
  background: "#f5f5f5",
  border: "1px solid #ccc",
  borderRadius: 6,
  cursor: "pointer",
};
