import { useService } from "../context/ServiceContext";
import { useOrganisation } from "../context/OrganisationContext";

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: "0.875rem",
    color: "#555",
    whiteSpace: "nowrap",
  },
  select: {
    padding: "6px 10px",
    fontSize: "0.875rem",
    minWidth: 180,
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
};

/**
 * Service switcher: dropdown to change currentServiceId. Admins can choose "All services" or a specific service.
 * Service managers see only their assigned service(s).
 */
export default function ServiceSwitcher() {
  const { organisationId } = useOrganisation();
  const { currentServiceId, setCurrentServiceId, services, loading, isAdmin } = useService();

  if (!organisationId || loading) return null;
  if (services.length === 0) return <span style={styles.label}>No services</span>;

  return (
    <div style={styles.wrapper}>
      <label htmlFor="service-switcher" style={styles.label}>
        Service:
      </label>
      <select
        id="service-switcher"
        value={currentServiceId ?? ""}
        onChange={(e) => setCurrentServiceId(e.target.value || null)}
        style={styles.select}
        aria-label="Select service"
      >
        {isAdmin && <option value="">All services</option>}
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.serviceName || s.id}
          </option>
        ))}
      </select>
    </div>
  );
}
