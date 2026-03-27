import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useOrganisation } from "../context/OrganisationContext";
import { completeTask, listTasksForOrganisation } from "../services/taskService";

export default function CarerTasks() {
  const { organisationId, hasFeature } = useOrganisation();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    if (!organisationId || !hasFeature("tasks")) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listTasksForOrganisation(organisationId, { limitCount: 80 });
      setTasks(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.message ?? "Could not load tasks.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [organisationId, hasFeature]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hasFeature("tasks")) {
    return (
      <div style={{ padding: 24 }}>
        <p>Tasks are not enabled for your organisation.</p>
        <Link to="/dashboard">Back</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>My tasks</h1>
        <Link to="/dashboard" style={{ fontSize: 14, fontWeight: 700, color: "#005eb8" }}>
          Home
        </Link>
      </div>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c", marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      {loading ? <p style={{ color: "#64748b" }}>Loading…</p> : null}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {tasks.map((t) => (
          <li
            key={t.id}
            style={{
              padding: "14px 0",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 17 }}>{t.title}</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              {t.shift} · {t.status}
              {t.patientId ? (
                <>
                  {" · "}
                  <Link to={`/patients/${t.patientId}`} style={{ color: "#005eb8", fontWeight: 700 }}>
                    Open patient
                  </Link>
                </>
              ) : null}
            </div>
            {t.status === "pending" ? (
              <button
                type="button"
                disabled={busyId === t.id || !user?.uid}
                onClick={async () => {
                  if (!user?.uid || !organisationId) return;
                  setBusyId(t.id);
                  try {
                    await completeTask(t.id, { uid: user.uid, organisationId });
                    await load();
                  } catch (e) {
                    setError(e?.message ?? "Could not complete task.");
                  } finally {
                    setBusyId("");
                  }
                }}
                style={{
                  minHeight: 52,
                  borderRadius: 12,
                  border: "none",
                  background: "#16a34a",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 17,
                  cursor: "pointer",
                }}
              >
                {busyId === t.id ? "…" : "Complete"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {!loading && tasks.length === 0 ? (
        <p style={{ color: "#64748b" }}>No tasks yet.</p>
      ) : null}
    </div>
  );
}
