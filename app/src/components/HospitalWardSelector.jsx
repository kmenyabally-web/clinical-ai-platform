import { useMemo } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useStructure } from "../context/StructureContext";

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: "0.8rem",
    color: "#555",
    whiteSpace: "nowrap",
    fontWeight: 700,
  },
  select: {
    padding: "6px 10px",
    fontSize: "0.85rem",
    minWidth: 170,
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
  },
  placeholder: {
    fontSize: "0.8rem",
    color: "#64748b",
    fontWeight: 600,
  },
};

export default function HospitalWardSelector({ locked = false } = {}) {
  const { organisationId } = useOrganisation();
  const {
    hospitals,
    wards,
    currentHospitalId,
    currentWardId,
    setCurrentHospitalId,
    setCurrentWardId,
    loading,
  } = useStructure();

  const wardOptions = useMemo(() => {
    if (!Array.isArray(wards)) return [];
    if (!currentHospitalId) return wards;
    return wards.filter((w) => w?.hospitalId === currentHospitalId);
  }, [wards, currentHospitalId]);

  if (!organisationId || loading) return null;
  if (!Array.isArray(hospitals) || hospitals.length === 0) {
    return <span style={styles.placeholder}>No hospitals configured</span>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.group}>
        <label htmlFor="global-hospital-selector" style={styles.label}>
          Hospital:
        </label>
        <select
          id="global-hospital-selector"
          value={currentHospitalId ?? ""}
          onChange={(e) => setCurrentHospitalId(e.target.value || null)}
          style={styles.select}
          aria-label="Select hospital"
          disabled={locked}
        >
          <option value="">Select hospital</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name || h.id}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.group}>
        <label htmlFor="global-ward-selector" style={styles.label}>
          Ward:
        </label>
        <select
          id="global-ward-selector"
          value={currentWardId ?? ""}
          onChange={(e) => setCurrentWardId(e.target.value || null)}
          style={styles.select}
          aria-label="Select ward"
          disabled={locked || !currentHospitalId}
        >
          <option value="">{currentHospitalId ? "Select ward" : "Select hospital first"}</option>
          {wardOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name || w.id}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
