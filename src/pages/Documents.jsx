import { useState, useEffect, useCallback } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  fetchDocuments,
  uploadDocument,
  updateDocumentMetadata,
  isSupportedFileType,
} from "../services/documentService";
import DocumentTable from "../components/DocumentTable";
import UploadDocumentModal from "../components/UploadDocumentModal";
import EditDocumentModal from "../components/EditDocumentModal";

/**
 * Documents page. All documents for the current organisation (policies + evidence_documents).
 * RBAC: Auditor view only; Staff upload; Manager upload + edit metadata; Admin full.
 */
export default function Documents() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();
  const { role, can } = useRole();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const auditContext =
    organisationId && user?.uid
      ? { userId: user.uid, userRole: role ?? "" }
      : undefined;

  const canUpload = can("audit:create");
  const canEditMetadata = can("audit:update");

  const load = useCallback(() => {
    if (!organisationId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchDocuments(organisationId, { limitCount: 100, serviceId: currentServiceId })
      .then(({ documents: list }) => setDocuments(list))
      .catch((err) => {
        setError(err?.message ?? "Failed to load documents.");
        setDocuments([]);
      })
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    load();
  }, [load]);

  function handleUpload(payload) {
    if (!organisationId || !auditContext) return;
    if (!isSupportedFileType(payload.file)) {
      setError("File type not supported. Use: pdf, docx, xlsx, jpg, png.");
      return;
    }
    setUploadLoading(true);
    setError(null);
    uploadDocument(organisationId, payload, auditContext, currentServiceId)
      .then(() => {
        setModalOpen(false);
        load();
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to upload document.");
      })
      .finally(() => setUploadLoading(false));
  }

  function handleEditClick(doc) {
    setEditingDoc(doc);
    setEditModalOpen(true);
  }

  function handleEditSubmit(updates) {
    if (!organisationId || !auditContext || !editingDoc) return;
    setEditLoading(true);
    setError(null);
    updateDocumentMetadata(
      organisationId,
      editingDoc.collection,
      editingDoc.id,
      updates,
      auditContext
    )
      .then(() => {
        setEditModalOpen(false);
        setEditingDoc(null);
        load();
      })
      .catch((err) => {
        setError(err?.message ?? "Failed to update document.");
      })
      .finally(() => setEditLoading(false));
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Documents</h1>
        {canUpload && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            style={{
              padding: "8px 16px",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Upload document
          </button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {loading ? (
        <p aria-busy="true">Loading documents…</p>
      ) : (
        <DocumentTable
          documents={documents}
          canEditMetadata={canEditMetadata}
          onEdit={handleEditClick}
        />
      )}

      <UploadDocumentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleUpload}
        loading={uploadLoading}
      />

      <EditDocumentModal
        open={editModalOpen}
        document={editingDoc}
        onClose={() => {
          setEditModalOpen(false);
          setEditingDoc(null);
        }}
        onSubmit={handleEditSubmit}
        loading={editLoading}
      />
    </div>
  );
}
