import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function toLabel(value) {
  if (!value) return "";
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate().toLocaleDateString("en-GB");
    } catch {
      return "";
    }
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB");
}

export default function InspectionTrendChart({ scores = [] }) {
  const data = useMemo(
    () =>
      [...scores]
        .reverse()
        .map((row) => ({
          date: toLabel(row?.createdAt),
          overallScore: Number(row?.overallScore ?? 0),
        })),
    [scores]
  );

  if (!data.length) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Inspection Trend</h3>
        <p style={{ marginBottom: 0, color: "#64748b" }}>No trend data yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Inspection Trend</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="overallScore" stroke="#005eb8" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
