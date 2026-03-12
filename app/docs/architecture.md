I have designed and implemented a professional multi-tenant architecture for a UK healthcare compliance SaaS, specifically tailored for CQC (Care Quality Commission) requirements.

1\. Firestore Architecture

The system uses a Root Collection Pattern with mandatory organisationId scoping. This approach balances strict data isolation with the flexibility required for future "Super Admin" cross-tenant reporting (via Collection Group queries).

Key Collections:

organisations/: Metadata, CQC Provider IDs, and subscription status.

users/: Profiles containing the primary organisationId and role-based access (RBAC).

compliance\_audits/: Scoped audit data with CQC Key Question tagging (Safe, Effective, etc.).

policies/: Document management scoped to the tenant.

2\. Multi-Tenant Data Flow

Authentication: On login, the AuthContext fetches the user's profile to identify their organisationId.

Query Scoping: All data fetching hooks (e.g., useComplianceAudits) automatically inject the organisationId into Firestore queries, preventing accidental data leakage.

Security Rules: I've provided a production-ready ruleset that validates every read/write against the user's organisationId stored in their JWT (Custom Claims).

3\. Implementation Details

Tech Stack: React 19, Firebase Auth/Firestore patterns, Lucide icons, and Motion for a premium editorial feel.

Future-Proofing: The AuthContext includes a switchOrganisation method, and the schema supports multiple organisation IDs per user for future agency/group management.

Production Thinking: The design emphasizes using Firebase Custom Claims for the organisationId to ensure zero-latency security checks without repeated database lookups.

You can explore the Architecture and Security Rules tabs in the live preview to see the full technical blueprint and schema definitions.

