import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { logAuditEventNonBlocking } from "../services/auditService";

/**
 * Audit logger with organisationId, userId, userRole from context.
 * All helpers are non-blocking; logging failures do not break the main operation.
 */
export function useAuditLogger() {
  const { user } = useAuth();
  const { organisationId } = useOrganisation();
  const { role } = useRole();

  const base = useCallback(
    (action, entityType, entityId, entityName, previousValue, newValue) => {
      if (!organisationId || !user?.uid) return;
      logAuditEventNonBlocking({
        organisationId,
        userId: user.uid,
        userRole: role ?? "",
        action,
        entityType,
        entityId: entityId ?? "",
        entityName: entityName ?? "",
        previousValue,
        newValue,
      });
    },
    [organisationId, user?.uid, role]
  );

  const logActionCreated = useCallback(
    (entityId, entityName, newValue) => {
      base("action_created", "compliance_action", entityId, entityName, undefined, newValue);
    },
    [base]
  );

  const logActionUpdated = useCallback(
    (entityId, entityName, previousValue, newValue) => {
      base("action_updated", "compliance_action", entityId, entityName, previousValue, newValue);
    },
    [base]
  );

  const logStatusChanged = useCallback(
    (entityId, entityName, previousStatus, newStatus) => {
      base("status_changed", "compliance_action", entityId, entityName, previousStatus, newStatus);
    },
    [base]
  );

  const logScoreUpdated = useCallback(
    (entityId, entityName, previousScore, newScore) => {
      base("score_updated", "compliance_domain", entityId, entityName, previousScore, newScore);
    },
    [base]
  );

  const logRoleChanged = useCallback(
    (entityId, entityName, previousRole, newRole) => {
      base("role_changed", "user", entityId, entityName, previousRole, newRole);
    },
    [base]
  );

  return {
    logActionCreated,
    logActionUpdated,
    logStatusChanged,
    logScoreUpdated,
    logRoleChanged,
    logAuditEvent: (action, entityType, entityId, entityName, previousValue, newValue) =>
      base(action, entityType, entityId, entityName, previousValue, newValue),
  };
}
