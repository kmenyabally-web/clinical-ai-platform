import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { EVIDENCE_DOMAINS } from "../config/evidenceDomains";

const ACCEPT = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"];

function isSupportedFile(file) {
  if (!file?.name) return false;
  const lower = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const styles = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  label: {
    fontWeight: 600,
    fontSize: "14px",
    color: "#334155",
  },
  input: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    fontSize: "14px",
  },
  select: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#fff",
    minWidth: 200,
  },
  actions: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  buttonPrimary: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#1976d2",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonSecondary: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: "14px",
    cursor: "pointer",
  },
  progressWrap: {
    marginTop: "0.5rem",
    height: 8,
    background: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "#1976d2",
    borderRadius: 4,
    transition: "width 0.2s ease",
  },
  message: {
    fontSize: "14px",
    padding: "0.5rem 0",
  },
  success: { color: "#15803d" },
  error: { color: "#c62828" },
};

/**
 * Reusable evidence upload: file picker, title, domain selector.
 * Uploads to Storage at evidence/{organisationId}/{serviceId}/{fileName}, then creates a Firestore evidence doc.
 * @param {string} organisationId - Required
 * @param {string} [serviceId] - Optional; used in Storage path (uses "none" when missing)
 * @param {string} [uploadedBy] - User ID for uploadedBy field
 * @param {() => void} [onSuccess] - Called after successful upload
 * @param {() => void} [onCancel] - Called when user cancels (if applicable)
 */
export default function EvidenceUpload({
  organisationId,
  serviceId = null,
  uploadedBy = "",
  onSuccess,
  onCancel,
}) {
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState(EVIDENCE_DOMAINS[0]?.value ?? "safe");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit =
    organisationId &&
    title.trim() &&
    domain &&
    file &&
    isSupportedFile(file) &&
    !uploading;

  function handleFileChange(e) {
    const chosen = e.target.files?.[0] ?? null;
    setFile(chosen);
    setError(null);
    setSuccess(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    const pathServiceId = serviceId && serviceId.trim() !== "" ? serviceId : "none";
    const fileName = file.name || "document";
    const storagePath = `evidence/${organisationId}/${pathServiceId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const pct = snapshot.totalBytes > 0
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        setProgress(pct);
      },
      (err) => {
        setUploading(false);
        setProgress(0);
        setError(err?.message ?? "Upload failed.");
      },
      async () => {
        try {
          const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);

          const col = collection(db, "evidence");
          await addDoc(col, {
            organisationId,
            serviceId: serviceId ?? null,
            domain: domain.trim().toLowerCase(),
            title: title.trim(),
            fileUrl,
            uploadedBy: uploadedBy ?? "",
            uploadedAt: serverTimestamp(),
            status: "active",
          });

          setSuccess(true);
          setTitle("");
          setDomain(EVIDENCE_DOMAINS[0]?.value ?? "safe");
          setFile(null);
          if (typeof onSuccess === "function") onSuccess();
        } catch (err) {
          setError(err?.message ?? "Failed to save evidence record.");
        } finally {
          setUploading(false);
          setProgress(0);
        }
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form} aria-label="Upload evidence">
      <div style={styles.field}>
        <label htmlFor="evidence-upload-title" style={styles.label}>
          Title
        </label>
        <input
          id="evidence-upload-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Safeguarding Policy"
          style={styles.input}
          disabled={uploading}
          aria-required="true"
        />
      </div>

      <div style={styles.field}>
        <label htmlFor="evidence-upload-domain" style={styles.label}>
          Domain
        </label>
        <select
          id="evidence-upload-domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          style={styles.select}
          disabled={uploading}
          aria-required="true"
        >
          {EVIDENCE_DOMAINS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.field}>
        <label htmlFor="evidence-upload-file" style={styles.label}>
          File
        </label>
        <input
          id="evidence-upload-file"
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          style={{ fontSize: "14px" }}
          disabled={uploading}
          aria-required="true"
        />
        {file && !isSupportedFile(file) && (
          <span style={{ ...styles.message, ...styles.error }}>
            Supported: pdf, docx, xlsx, jpg, png.
          </span>
        )}
      </div>

      {uploading && (
        <div style={styles.progressWrap} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
      )}

      {success && (
        <p style={{ ...styles.message, ...styles.success }} role="status">
          Evidence uploaded successfully.
        </p>
      )}

      {error && (
        <p style={{ ...styles.message, ...styles.error }} role="alert">
          {error}
        </p>
      )}

      <div style={styles.actions}>
        <button type="submit" style={styles.buttonPrimary} disabled={!canSubmit}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {typeof onCancel === "function" && (
          <button type="button" onClick={onCancel} style={styles.buttonSecondary} disabled={uploading}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
