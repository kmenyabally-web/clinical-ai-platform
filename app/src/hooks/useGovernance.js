// src/hooks/useGovernance.js

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * React hook that provides a safe, non-clinical governance context
 * for the UI. It exposes:
 * - isLoading
 * - isAuthenticated
 * - userRole
 * - orgName
 *
 * This hook is intended to be the single source of truth for the
 * "First Safe Screen". It must NOT read or expose any people,
 * careFolder, clinical, or incident data.
 */

import { useEffect, useState } from "react";
import { getUserContext } from "../services/authService";
import { getOrgDisplayName } from "../services/organisationService";

/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * useGovernance()
 *
 * Returns:
 * {
 *   isLoading: boolean,
 *   isAuthenticated: boolean,
 *   userRole: string | null,
 *   orgName: string | null,
 *   error: Error | null,
 * }
 *
 * Behaviour:
 * - When no user is signed in, returns isAuthenticated = false and orgName = null.
 * - When a user is signed in but governance context is missing (no organisationId),
 *   surfaces an error and prevents any data read.
 * - On success, provides a non-clinical view of identity (role) and organisation
 *   (display name) only.
 */
export function useGovernance() {
  const [state, setState] = useState({
    isLoading: true,
    isAuthenticated: false,
    userRole: null,
    orgName: null,
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        let userContext;
        try {
          userContext = await getUserContext();
        } catch (err) {
          // If getUserContext throws "Governance Context Missing",
          // treat as authenticated but mis-scoped, and block reads.
          if (!isCancelled) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              userRole: null,
              orgName: null,
              error:
                err instanceof Error ? err : new Error("Unknown governance error"),
            });
          }
          return;
        }

        // Debug logging to inspect claims arriving from Firebase
        // eslint-disable-next-line no-console
        console.log("DEBUG [Claims Check]:", userContext);

        const { role, organisationId } = userContext;

        if (!organisationId) {
          // Should not occur because getUserContext already throws,
          // but we guard again to maintain a safe posture.
          if (!isCancelled) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              userRole: role || null,
              orgName: null,
              error: new Error(
                "Organisation context missing for authenticated user."
              ),
            });
          }
          return;
        }

        const orgName = await getOrgDisplayName(organisationId);

        if (!isCancelled) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            userRole: role || null,
            orgName: orgName || null,
            error: null,
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setState({
            isLoading: false,
            isAuthenticated: false,
            userRole: null,
            orgName: null,
            error:
              err instanceof Error
                ? err
                : new Error("Unknown error in useGovernance"),
          });
        }
      }
    }

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  return state;
}

