# Backup strategy (production)

## Firestore

- **Scheduled exports:** Use [Firestore managed exports](https://firebase.google.com/docs/firestore/manage-data/export-import) to a Cloud Storage bucket (e.g. daily at low-traffic time). Same project or separate backup project.
- **Retention:** Keep daily backups for 30 days; weekly for 12 months (adjust per compliance requirements).
- **Restore:** Use `gcloud firestore import` from the export path. Test restore periodically.
- **Critical collections:** All root collections (users, organisations, subscriptions, services, compliance_*, audit_logs, notifications, inspection_*, policies, evidence_documents, document_stats, platform_admins) are included in a full database export.

## Firebase Storage

- **Bucket versioning:** Enable [object versioning](https://cloud.google.com/storage/docs/object-versioning) on the Storage bucket so overwrites and deletes retain previous versions.
- **Scheduled backup:** Use a Cloud Function or Cloud Scheduler job to copy objects to a separate backup bucket or to Cloud Storage in another region/project (e.g. daily).
- **Path:** `organisations/{organisationId}/documents/**` — ensure the backup job includes all prefixes.
- **Retention:** Align with Firestore (e.g. 30 days daily, 12 months weekly).

## Operational notes

- Document backup and restore runbooks and assign owners.
- Encrypt backups at rest (default in GCS); restrict IAM so only ops can restore.
- For healthcare/compliance, align retention and encryption with your regulatory requirements.
