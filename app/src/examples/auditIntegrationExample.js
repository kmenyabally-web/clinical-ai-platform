/**
 * Example: integrating audit logging with Firestore writes.
 * Use useOrganisation, useAuth, useRole to build auditContext and pass it into
 * compliance service write functions. Audit runs after the write; failures do not break the operation.
 *
 * This file is for reference only; do not import in production bundles.
 */

import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { useAuditLogger } from "../hooks/useAuditLogger";
import { createComplianceAction, updateComplianceAction, completeComplianceAction, updateComplianceDomainScore } from "../services/complianceService";

// Example: in a React component
export function ExampleComplianceForm() {
  const { user } = useAuth();
  const { organisationId } = useOrganisation();
  const { role } = useRole();

  const auditContext =
    organisationId && user?.uid
      ? { organisationId, userId: user.uid, userRole: role ?? "" }
      : undefined;

  async function handleCreateAction(payload) {
    const { id } = await createComplianceAction(organisationId, payload, auditContext);
    // action_created is logged automatically; no need to call useAuditLogger here
    return id;
  }

  async function handleUpdateStatus(actionId, newStatus) {
    await updateComplianceAction(organisationId, actionId, { status: newStatus }, auditContext);
    // action_updated and status_changed (if status changed) are logged automatically
  }

  async function handleComplete(actionId) {
    await completeComplianceAction(organisationId, actionId, auditContext);
    // status_changed (open → completed) is logged automatically
  }

  async function handleDomainScoreChange(domainId, newScore, previousScore) {
    await updateComplianceDomainScore(
      organisationId,
      domainId,
      { compliancePercent: newScore },
      auditContext
    );
    // score_updated is logged automatically when compliancePercent changes
  }

  return null;
}

// Example: when you need to log from UI without a service write (e.g. role change in another service)
export function ExampleRoleChangeLogger() {
  const { logRoleChanged } = useAuditLogger();
  // After your code updates a user's role in Firestore:
  // logRoleChanged(userId, userEmail, previousRole, newRole);
  return null;
}
