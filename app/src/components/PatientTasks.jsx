import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { useRole } from "../context/RoleContext";
import { useUIMode } from "../hooks/useUIMode";
import {
  completeTask,
  createTask,
  getCurrentShift,
  TASK_SHIFTS,
} from "../services/taskService";

const SHIFT_TABS = [
  { id: "all", label: "All" },
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "night", label: "Night" },
];

/**
 * Shift-based care tasks for a patient (feature: organisation.features.tasks or plan `tasks`).
 */
export default function PatientTasks({ patientId, organisationId, tasks, onTasksUpdated }) {
  const { user } = useAuth();
  const { hasFeature } = useOrganisation();
  const { isInspectorRole } = useRole();
  const uiMode = useUIMode();
  const carerSimple = uiMode === "CARER";
  const [shiftFilter, setShiftFilter] = useState(() => getCurrentShift());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [addShift, setAddShift] = useState(() => getCurrentShift());
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState("");
  const [error, setError] = useState(null);

  const tasksEnabled = hasFeature("tasks");
  const readOnly = isInspectorRole();

  const refresh = useCallback(async () => {
    if (typeof onTasksUpdated === "function") await onTasksUpdated();
  }, [onTasksUpdated]);

  const visibleTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    if (carerSimple) return list;
    if (shiftFilter === "all") return list;
    return list.filter((t) => String(t?.shift ?? "").toLowerCase() === shiftFilter);
  }, [tasks, shiftFilter, carerSimple]);

  if (!tasksEnabled) return null;
  if (!patientId || !organisationId) return null;

  return (
    <div className="card patient-tasks-card">
      <h3 style={{ margin: "0 0 6px 0", fontSize: carerSimple ? 18 : 16, fontWeight: 900, color: "#0f172a" }}>
        Care tasks
      </h3>
      {!carerSimple ? (
      <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
        Shift tasks for daily workflow. Completed work feeds inspection intelligence.
      </p>
      ) : null}

      {!carerSimple ? (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 14,
        }}
        role="tablist"
        aria-label="Filter by shift"
      >
        {SHIFT_TABS.map((tab) => {
          const active = shiftFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setShiftFilter(tab.id)}
              style={{
                minHeight: 44,
                padding: "8px 14px",
                borderRadius: 8,
                border: active ? "2px solid #005eb8" : "1px solid #cbd5e1",
                background: active ? "#eff6ff" : "#fff",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                color: "#0f172a",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            borderRadius: 8,
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {!readOnly && carerSimple ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="What needs doing?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: 52,
              padding: "14px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              fontSize: 18,
            }}
          />
          <button
            type="button"
            disabled={saving || !title.trim() || !user?.uid}
            onClick={async () => {
              if (!user?.uid) return;
              setSaving(true);
              setError(null);
              try {
                await createTask(
                  {
                    organisationId,
                    patientId,
                    title: title.trim(),
                    description: "",
                    shift: getCurrentShift(),
                    assignedTo: user.uid,
                  },
                  { uid: user.uid, organisationId }
                );
                setTitle("");
                await refresh();
              } catch (e) {
                setError(e?.message ?? "Failed to create task.");
              } finally {
                setSaving(false);
              }
            }}
            style={{
              minHeight: 52,
              padding: "0 18px",
              borderRadius: 12,
              border: "none",
              background: "#005eb8",
              color: "#fff",
              fontWeight: 900,
              fontSize: 17,
              cursor: saving || !title.trim() ? "not-allowed" : "pointer",
              opacity: saving || !title.trim() ? 0.6 : 1,
            }}
          >
            {saving ? "Adding…" : "Add task"}
          </button>
        </div>
      ) : null}

      {!readOnly && !carerSimple ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: 44,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 16,
            }}
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              minHeight: 44,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: 16,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Shift</label>
            <select
              value={addShift}
              onChange={(e) => setAddShift(e.target.value)}
              style={{
                minHeight: 44,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                fontSize: 16,
                background: "#fff",
              }}
            >
              {TASK_SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={saving || !title.trim() || !user?.uid}
              onClick={async () => {
                if (!user?.uid) return;
                setSaving(true);
                setError(null);
                try {
                  await createTask(
                    {
                      organisationId,
                      patientId,
                      title: title.trim(),
                      description: description.trim(),
                      shift: addShift,
                      assignedTo: user.uid,
                    },
                    { uid: user.uid, organisationId }
                  );
                  setTitle("");
                  setDescription("");
                  await refresh();
                } catch (e) {
                  setError(e?.message ?? "Failed to create task.");
                } finally {
                  setSaving(false);
                }
              }}
              style={{
                minHeight: 44,
                padding: "0 16px",
                borderRadius: 8,
                border: "none",
                background: "#005eb8",
                color: "#fff",
                fontWeight: 800,
                fontSize: 15,
                cursor: saving || !title.trim() ? "not-allowed" : "pointer",
                opacity: saving || !title.trim() ? 0.6 : 1,
              }}
            >
              {saving ? "Adding…" : "Add task"}
            </button>
          </div>
        </div>
      ) : null}

      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {visibleTasks.map((t) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              flexDirection: carerSimple ? "column" : "row",
              alignItems: carerSimple ? "stretch" : "flex-start",
              justifyContent: "space-between",
              gap: carerSimple ? 12 : 12,
              padding: "12px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: "#0f172a", fontSize: carerSimple ? 18 : 15 }}>{t.title}</div>
              {!carerSimple && t.description ? (
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{t.description}</div>
              ) : null}
              {!carerSimple ? (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {t.shift} · {t.status === "completed" ? "Completed" : "Pending"}
                </div>
              ) : t.status === "completed" ? (
                <div style={{ fontSize: 13, color: "#15803d", marginTop: 4, fontWeight: 700 }}>Done</div>
              ) : null}
            </div>
            {t.status === "pending" && !readOnly ? (
              <button
                type="button"
                disabled={completingId === t.id || !user?.uid}
                onClick={async () => {
                  if (!user?.uid) return;
                  setCompletingId(t.id);
                  setError(null);
                  try {
                    await completeTask(t.id, { uid: user.uid, organisationId });
                    await refresh();
                  } catch (e) {
                    setError(e?.message ?? "Failed to complete task.");
                  } finally {
                    setCompletingId("");
                  }
                }}
                style={{
                  flexShrink: 0,
                  minHeight: carerSimple ? 56 : 44,
                  width: carerSimple ? "100%" : "auto",
                  minWidth: carerSimple ? "100%" : 120,
                  padding: carerSimple ? "14px 16px" : "8px 12px",
                  borderRadius: carerSimple ? 14 : 8,
                  border: carerSimple ? "none" : "1px solid #cbd5e1",
                  background: carerSimple ? "#16a34a" : "#f8fafc",
                  color: carerSimple ? "#fff" : "#0f172a",
                  fontWeight: 900,
                  fontSize: carerSimple ? 18 : 14,
                  cursor: "pointer",
                }}
              >
                {completingId === t.id ? "…" : carerSimple ? "Complete" : "Mark complete"}
              </button>
            ) : null}
          </li>
        ))}
        {visibleTasks.length === 0 ? (
          <li style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>No tasks in this view.</li>
        ) : null}
      </ul>
    </div>
  );
}
