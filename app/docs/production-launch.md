# Production launch

Deployment checklist, environment configuration, hosting setup, custom domain, and production readiness.

---

## 1. Environment configuration plan

### Variables (sensitive in env only)

All sensitive values must come from environment variables; never commit secrets.

| Variable | Purpose | Where to set |
|----------|---------|--------------|
| `VITE_APP_ENV` | `development` \| `staging` \| `production` | CI / .env per mode |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | Firebase Console → Project settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `*.firebaseapp.com` or custom |
| `VITE_FIREBASE_PROJECT_ID` | Firestore/Storage project | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | `*.appspot.com` or custom |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | FCM (optional) | Project settings |
| `VITE_FIREBASE_APP_ID` | Firebase Web app ID | Project settings |
| `VITE_SENTRY_DSN` | Sentry (optional) | Sentry project → Client keys |

### Per environment

- **Development:** Copy `.env.development.example` to `.env.development` (or use `.env`). Use a dev Firebase project. Do not commit `.env.development`.
- **Staging:** In CI, set env from secrets and run `npm run build:staging`. Use a staging Firebase project.
- **Production:** In CI, set env from a vault/secrets manager and run `npm run build:production`. Use production Firebase project. Fail the build if required vars are missing (app already throws in `firebase.js` when `VITE_APP_ENV=production` and config is empty).

---

## 2. Hosting setup (Firebase Hosting)

### Prerequisites

- Node.js and npm in CI/local.
- Firebase CLI: `npm i -g firebase-tools` and `firebase login`.

### Build and deploy

1. **From repo root** (where `firebase.json` lives):

   ```bash
   cd app
   npm ci
   npm run build:production
   cd ..
   firebase deploy --only hosting
   ```

2. **Deploy rules and indexes as well:**

   ```bash
   firebase deploy --only firestore
   firebase deploy --only storage
   ```

### What the config does

- **firebase.json** (project root):
  - `hosting.public`: `app/dist` (Vite output).
  - **Headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`; long cache for `*.js` and `*.css`.
  - **HTTPS:** Enforced by Firebase Hosting by default; no extra config.
  - **Optimized build:** Vite build uses minification and code-splitting (e.g. Firebase chunk).

---

## 3. Custom domain (e.g. app.yourplatform.com)

1. In [Firebase Console](https://console.firebase.google.com) → **Hosting** → **Add custom domain**.
2. Enter `app.yourplatform.com` (or your subdomain). Follow the wizard.
3. Add the TXT record (and A/AAAA if required) at your DNS provider. Verify in Console.
4. Firebase provisions SSL for the custom domain. Wait for cert propagation.
5. Point your app and Auth (e.g. authorised domains) to `app.yourplatform.com`. In **Authentication → Settings → Authorised domains**, add `app.yourplatform.com`.

---

## 4. Database preparation (Firestore indexes)

Indexes used by the app are in **firestore.indexes.json** (project root). Deploy with:

```bash
firebase deploy --only firestore:indexes
```

Indexes cover:

- **compliance_actions:** organisationId + status; + serviceId; + priority (urgent actions).
- **inspection_sessions:** organisationId + startedAt desc; + serviceId.
- **inspection_responses:** sessionId.
- **notifications:** organisationId + createdAt desc; + read; + serviceId; + type.
- **audit_logs:** organisationId + timestamp desc.
- **services:** organisationId + serviceName; + managerId + serviceName.
- **subscriptions:** organisationId + status.
- **policies / evidence_documents:** organisationId + createdAt desc; + serviceId.
- **organisations / services:** createdAt desc (admin metrics).

If a query fails with “index required”, the error message links to the Firebase Console to create the index; add that index to `firestore.indexes.json` for future deploys.

---

## 5. Onboarding flow

New organisation signup (see **signupService.registerWithOrganisation**):

1. Create **organisation** document.
2. Create **admin user** profile (`users/{uid}` with orgId, role Admin, status active).
3. Create **subscription** (Starter, monthly).
4. Create **first service** (e.g. “{OrgName} - Main”, type “Head Office”).

Optional: pass `firstServiceName` in options to customise the first service name.

---

## 6. Production logging

Structured logging is in **app/src/lib/productionLogger.js**:

- **Auth:** sign_in_success, sign_in_failure, sign_out, sign_up_success.
- **Audit:** audit_log_created (can be wired from auditService if needed).
- **Subscription:** subscription_created, plan_changed, subscription_cancelled.

Logs go to `console.info` with a JSON-like shape. For production, pipe stdout to Cloud Logging or a log aggregator, or extend the logger to send to your backend.

---

## 7. Backup strategy

See **app/docs/backup-strategy.md** for:

- Firestore: scheduled exports to Cloud Storage; retention and restore.
- Storage: bucket versioning and scheduled copy to a backup bucket.

---

## 8. Error monitoring

- **ErrorBoundary** in **app/src/components/ErrorBoundary.jsx** catches React errors and reports via **app/src/lib/errorMonitoring.js**.
- Set **VITE_SENTRY_DSN** to enable Sentry. To fully integrate:
  1. `npm i @sentry/react`
  2. In `errorMonitoring.js`, init Sentry with `dsn` and `environment: import.meta.env.VITE_APP_ENV`, and set `captureExceptionImpl` to `Sentry.captureException`.

Alternatively use **Firebase Crashlytics** (e.g. via a small wrapper that reports to a Cloud Function or Crashlytics JS if available).

---

## 9. Deployment checklist

Before production:

- [ ] Separate Firebase project for production (or at least separate from dev/staging).
- [ ] Env vars for production set in CI/vault; no hardcoded secrets.
- [ ] `npm run build:production` succeeds and uses production env.
- [ ] Firestore and Storage rules deployed; indexes deployed.
- [ ] Custom domain added and verified; Auth authorised domains updated.
- [ ] Backup: Firestore exports and Storage versioning/backup configured and tested.
- [ ] Error monitoring (Sentry or Crashlytics) configured and tested.
- [ ] Security: platform_admins use document ID = userId; custom claims for Storage if used.
- [ ] Onboarding tested: signup creates org, user, subscription, first service.

Deploy:

- [ ] `cd app && npm run build:production && cd .. && firebase deploy`
- [ ] Smoke test: login, signup, create action, upload document, open Billing and Admin (if applicable).

---

## 10. Production readiness validation

Run through:

1. **Auth:** Sign up new org → sign out → sign in. Confirm first service exists and dashboard loads.
2. **Tenant isolation:** With two orgs, confirm user A cannot see org B’s data (actions, documents, services).
3. **Billing:** Create subscription, change plan, cancel (test org). Confirm audit events and logs.
4. **Admin panel:** As platform_admin, open Admin; confirm stats, org list, suspend/reactivate (test org only).
5. **Storage:** Upload a document; confirm path `organisations/{orgId}/documents/...` and access only for that org.
6. **Errors:** Trigger a client error (e.g. throw in a button handler); confirm it is reported in Sentry/Crashlytics and that ErrorBoundary shows the fallback UI.

Use the same checklist for staging with the staging Firebase project before cutting over to production.
