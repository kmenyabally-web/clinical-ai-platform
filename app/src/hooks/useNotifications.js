import { useState, useEffect, useCallback } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { fetchNotifications } from "../services/notificationService";

/**
 * Unread notification count for the current organisation and service (when multi-service is used).
 */
export function useUnreadNotificationCount() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organisationId) {
      setCount(0);
      return;
    }
    setLoading(true);
    fetchNotifications(organisationId, { unreadOnly: true, limitCount: 99, serviceId: currentServiceId ?? undefined })
      .then((list) => setCount(list.length))
      .catch(() => setCount(0))
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId]);

  return { count, loading };
}

/**
 * Full notification list for Notifications page. Refetch via refresh().
 */
export function useNotifications(options = {}) {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { unreadOnly = false, limitCount = 50 } = options;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    if (!organisationId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchNotifications(organisationId, { unreadOnly, limitCount, serviceId: currentServiceId ?? undefined })
      .then(setList)
      .catch((e) => setError(e?.message ?? "Failed to load notifications"))
      .finally(() => setLoading(false));
  }, [organisationId, currentServiceId, unreadOnly, limitCount]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { notifications: list, loading, error, refresh };
}
