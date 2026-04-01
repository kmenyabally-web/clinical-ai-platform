/** Care monitoring — fluid, food, stool, urine logs (`care_logs`). */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listCareLogsForPatient, submitCareLog } from "../services/careLogsService";
import { formatUkDateTime } from "../utils/dateFormat";

const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.25rem 1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  border: "1px solid #e2e8f0",
};

function toDatetimeLocalValue(d) {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function recordDate(row) {
  const t = row?.recordedAt;
  if (t && typeof t.toDate === "function") {
    try {
      return t.toDate();
    } catch {
      /* fall through */
    }
  }
  const c = row?.createdAt;
  if (c && typeof c.toDate === "function") {
    try {
      return c.toDate();
    } catch {
      /* fall through */
    }
  }
  return new Date(0);
}

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

function isTodayLocal(d) {
  return sameLocalDay(d, new Date());
}

function dayKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDayLabel(d) {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

const tabBtn = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  color: "#334155",
};
const tabBtnActive = {
  ...tabBtn,
  borderColor: "#0d9488",
  background: "#e0f2f1",
  color: "#0f766e",
};

const subTabs = [
  ["fluid", "Fluid"],
  ["food", "Food"],
  ["stool", "Stool"],
  ["urine", "Urine"],
];

/**
 * @param {{
 *   organisationId: string | null | undefined,
 *   selectedPatientId: string,
 *   selectedPatient: Record<string, unknown> | null,
 *   user: { email?: string | null, displayName?: string | null, uid?: string | null } | null,
 * }} props
 */
export default function CareMonitoringSection({ organisationId, selectedPatientId, selectedPatient, user }) {
  const [careSubTab, setCareSubTab] = useState("fluid");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const [fluidMl, setFluidMl] = useState("");
  const [fluidType, setFluidType] = useState("water");
  const [fluidTime, setFluidTime] = useState(() => toDatetimeLocalValue(new Date()));

  const [mealType, setMealType] = useState("breakfast");
  const [percentEaten, setPercentEaten] = useState("");
  const [foodNotes, setFoodNotes] = useState("");
  const [foodTime, setFoodTime] = useState(() => toDatetimeLocalValue(new Date()));

  const [bristol, setBristol] = useState("4");
  const [stoolTime, setStoolTime] = useState(() => toDatetimeLocalValue(new Date()));

  const [urineAmount, setUrineAmount] = useState("medium");
  const [urineColour, setUrineColour] = useState("light");
  const [urineTime, setUrineTime] = useState(() => toDatetimeLocalValue(new Date()));

  const recordedBy =
    (user?.email && String(user.email)) ||
    (user?.displayName && String(user.displayName)) ||
    (user?.uid && String(user.uid)) ||
    "unknown";

  const loadLogs = useCallback(async () => {
    if (!organisationId || !selectedPatientId) {
      setLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listCareLogsForPatient(organisationId, selectedPatientId, { limitCount: 250 });
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.message ?? "Failed to load care logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [organisationId, selectedPatientId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const todayLogs = useMemo(() => {
    const out = [];
    for (const row of logs) {
      if (isTodayLocal(recordDate(row))) out.push(row);
    }
    out.sort((a, b) => recordDate(a).getTime() - recordDate(b).getTime());
    return out;
  }, [logs]);

  const todayTotals = useMemo(() => {
    let fluidMlSum = 0;
    let foodCount = 0;
    let stoolCount = 0;
    let urineCount = 0;
    const fluidTypes = [];
    for (const row of todayLogs) {
      const c = row.category;
      if (c === "fluid") {
        fluidMlSum += typeof row.amountMl === "number" && Number.isFinite(row.amountMl) ? row.amountMl : 0;
        if (row.fluidType) fluidTypes.push(String(row.fluidType));
      } else if (c === "food") foodCount += 1;
      else if (c === "stool") stoolCount += 1;
      else if (c === "urine") urineCount += 1;
    }
    return { fluidMlSum, foodCount, stoolCount, urineCount, fluidTypes };
  }, [todayLogs]);

  const dailyRollups = useMemo(() => {
    const map = new Map();
    for (const row of logs) {
      const d = recordDate(row);
      const key = dayKey(d);
      if (!map.has(key)) {
        map.set(key, {
          key,
          date: d,
          fluidMl: 0,
          food: 0,
          stool: 0,
          urine: 0,
        });
      }
      const agg = map.get(key);
      const c = row.category;
      if (c === "fluid") {
        agg.fluidMl += typeof row.amountMl === "number" && Number.isFinite(row.amountMl) ? row.amountMl : 0;
      } else if (c === "food") agg.food += 1;
      else if (c === "stool") agg.stool += 1;
      else if (c === "urine") agg.urine += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [logs]);

  function parseLocalDateTime(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  async function handleFluidSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    if (!organisationId || !selectedPatientId) return;
    const ml = Number(fluidMl);
    if (!Number.isFinite(ml) || ml <= 0) {
      setSaveError("Enter a valid amount in ml.");
      return;
    }
    setSaving(true);
    try {
      await submitCareLog({
        patientId: selectedPatientId,
        organisationId,
        hospitalId: selectedPatient?.hospitalId ?? "",
        wardId: selectedPatient?.wardId ?? "",
        category: "fluid",
        recordedBy,
        recordedAt: parseLocalDateTime(fluidTime),
        amountMl: ml,
        fluidType,
      });
      setFluidMl("");
      setFluidTime(toDatetimeLocalValue(new Date()));
      setSaveOk(true);
      await loadLogs();
    } catch (err) {
      setSaveError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFoodSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    if (!organisationId || !selectedPatientId) return;
    const pe = percentEaten === "" ? null : Number(percentEaten);
    if (pe === null || !Number.isFinite(pe) || pe < 0 || pe > 100) {
      setSaveError("Enter % eaten between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      await submitCareLog({
        patientId: selectedPatientId,
        organisationId,
        hospitalId: selectedPatient?.hospitalId ?? "",
        wardId: selectedPatient?.wardId ?? "",
        category: "food",
        recordedBy,
        recordedAt: parseLocalDateTime(foodTime),
        mealType,
        percentEaten: pe,
        foodNotes,
      });
      setPercentEaten("");
      setFoodNotes("");
      setFoodTime(toDatetimeLocalValue(new Date()));
      setSaveOk(true);
      await loadLogs();
    } catch (err) {
      setSaveError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStoolSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    if (!organisationId || !selectedPatientId) return;
    const b = Number(bristol);
    if (!Number.isFinite(b) || b < 1 || b > 7) {
      setSaveError("Select Bristol 1–7.");
      return;
    }
    setSaving(true);
    try {
      await submitCareLog({
        patientId: selectedPatientId,
        organisationId,
        hospitalId: selectedPatient?.hospitalId ?? "",
        wardId: selectedPatient?.wardId ?? "",
        category: "stool",
        recordedBy,
        recordedAt: parseLocalDateTime(stoolTime),
        bristolScale: b,
      });
      setSaveOk(true);
      await loadLogs();
    } catch (err) {
      setSaveError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUrineSubmit(e) {
    e.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    if (!organisationId || !selectedPatientId) return;
    setSaving(true);
    try {
      await submitCareLog({
        patientId: selectedPatientId,
        organisationId,
        hospitalId: selectedPatient?.hospitalId ?? "",
        wardId: selectedPatient?.wardId ?? "",
        category: "urine",
        recordedBy,
        recordedAt: parseLocalDateTime(urineTime),
        urineAmount,
        urineColour,
      });
      setSaveOk(true);
      await loadLogs();
    } catch (err) {
      setSaveError(err?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    maxWidth: 280,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    fontSize: 14,
  };
  const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#334155" };

  if (!selectedPatientId) {
    return (
      <div role="status" style={{ ...card, background: "#f8fafc", color: "#64748b" }}>
        Select a patient above to record fluid, food, stool, and urine care monitoring.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }} role="tablist" aria-label="Care monitoring categories">
        {subTabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={careSubTab === key}
            onClick={() => {
              setCareSubTab(key);
              setSaveError(null);
              setSaveOk(false);
            }}
            style={careSubTab === key ? tabBtnActive : tabBtn}
          >
            {label}
          </button>
        ))}
      </div>

      {saveError ? (
        <div role="alert" style={{ ...card, background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>
          {saveError}
        </div>
      ) : null}
      {saveOk ? (
        <div role="status" style={{ ...card, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
          Log saved.
        </div>
      ) : null}

      {careSubTab === "fluid" && (
        <form onSubmit={handleFluidSubmit} style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Fluid intake</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Amount (ml)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={fluidMl}
                onChange={(e) => setFluidMl(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={fluidType} onChange={(e) => setFluidType(e.target.value)} style={inputStyle}>
                <option value="water">Water</option>
                <option value="juice">Juice</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input
                type="datetime-local"
                value={fluidTime}
                onChange={(e) => setFluidTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !organisationId}
            style={{
              marginTop: 14,
              padding: "10px 20px",
              background: saving ? "#94a3b8" : "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save fluid log"}
          </button>
        </form>
      )}

      {careSubTab === "food" && (
        <form onSubmit={handleFoodSubmit} style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Food intake</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Meal type</label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value)} style={inputStyle}>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>% eaten</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={percentEaten}
                onChange={(e) => setPercentEaten(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input
                type="datetime-local"
                value={foodTime}
                onChange={(e) => setFoodTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={foodNotes}
              onChange={(e) => setFoodNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, maxWidth: "100%" }}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !organisationId}
            style={{
              marginTop: 14,
              padding: "10px 20px",
              background: saving ? "#94a3b8" : "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save food log"}
          </button>
        </form>
      )}

      {careSubTab === "stool" && (
        <form onSubmit={handleStoolSubmit} style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Stool (Bristol scale)</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Bristol type (1–7)</label>
              <select value={bristol} onChange={(e) => setBristol(e.target.value)} style={inputStyle}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input
                type="datetime-local"
                value={stoolTime}
                onChange={(e) => setStoolTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !organisationId}
            style={{
              marginTop: 14,
              padding: "10px 20px",
              background: saving ? "#94a3b8" : "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save stool log"}
          </button>
        </form>
      )}

      {careSubTab === "urine" && (
        <form onSubmit={handleUrineSubmit} style={card}>
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Urine</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Amount</label>
              <select value={urineAmount} onChange={(e) => setUrineAmount(e.target.value)} style={inputStyle}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Colour</label>
              <select value={urineColour} onChange={(e) => setUrineColour(e.target.value)} style={inputStyle}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input
                type="datetime-local"
                value={urineTime}
                onChange={(e) => setUrineTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !organisationId}
            style={{
              marginTop: 14,
              padding: "10px 20px",
              background: saving ? "#94a3b8" : "#0f766e",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save urine log"}
          </button>
        </form>
      )}

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Today&apos;s totals</h2>
        {loading ? <p aria-live="polite">Loading…</p> : null}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Fluid</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{todayTotals.fluidMlSum} ml</div>
          </div>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Food logs</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{todayTotals.foodCount}</div>
          </div>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Stool</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{todayTotals.stoolCount}</div>
          </div>
          <div style={{ padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Urine</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a" }}>{todayTotals.urineCount}</div>
          </div>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Today&apos;s log entries</h2>
        {!todayLogs.length ? (
          <p style={{ color: "#64748b" }}>No care logs recorded for today yet.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 14, lineHeight: 1.45 }}>
            {todayLogs.map((row) => (
              <li key={row.id} style={{ marginBottom: 6 }}>
                <strong>{formatUkDateTime(row.recordedAt ?? row.createdAt, "—")}</strong> — {describeLogLine(row)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Daily totals (by day)</h2>
        {!dailyRollups.length ? (
          <p style={{ color: "#64748b" }}>No history yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 6px" }}>Day</th>
                  <th style={{ padding: "8px 6px" }}>Fluid (ml)</th>
                  <th style={{ padding: "8px 6px" }}>Food</th>
                  <th style={{ padding: "8px 6px" }}>Stool</th>
                  <th style={{ padding: "8px 6px" }}>Urine</th>
                </tr>
              </thead>
              <tbody>
                {dailyRollups.map((row) => (
                  <tr key={row.key} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 6px" }}>{formatDayLabel(row.date)}</td>
                    <td style={{ padding: "8px 6px" }}>{row.fluidMl}</td>
                    <td style={{ padding: "8px 6px" }}>{row.food}</td>
                    <td style={{ padding: "8px 6px" }}>{row.stool}</td>
                    <td style={{ padding: "8px 6px" }}>{row.urine}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={card}>
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Recent history</h2>
        {!logs.length ? (
          <p style={{ color: "#64748b" }}>No care logs yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "8px 6px" }}>Recorded</th>
                  <th style={{ padding: "8px 6px" }}>Type</th>
                  <th style={{ padding: "8px 6px" }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 6px" }}>{formatUkDateTime(row.recordedAt ?? row.createdAt, "—")}</td>
                    <td style={{ padding: "8px 6px" }}>{row.category ?? "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{describeLogLine(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function describeLogLine(row) {
  const c = row.category;
  if (c === "fluid") {
    const ml = row.amountMl != null ? `${row.amountMl} ml` : "—";
    const t = row.fluidType ? String(row.fluidType) : "—";
    return `${ml} · ${t}`;
  }
  if (c === "food") {
    const m = row.mealType ?? "—";
    const p = row.percentEaten != null ? `${row.percentEaten}%` : "—";
    const n = row.foodNotes ? ` · ${row.foodNotes}` : "";
    return `${m} · ${p}${n}`;
  }
  if (c === "stool") {
    return row.bristolScale != null ? `Bristol ${row.bristolScale}` : "—";
  }
  if (c === "urine") {
    const a = row.urineAmount ?? "—";
    const col = row.urineColour ?? "—";
    return `${a} · ${col}`;
  }
  return "—";
}
