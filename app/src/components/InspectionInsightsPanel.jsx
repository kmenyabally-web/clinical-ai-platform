import React from "react";

export default function InspectionInsightsPanel({ insights = [] }) {
  if (!insights.length) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Inspection Insights</h3>
        <p style={{ color: "green", marginBottom: 0 }}>No risks detected</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Inspection Insights</h3>
      {insights.map((item, i) => (
        <div
          key={`${item.domain}-${item.level}-${i}`}
          style={{
            padding: "10px",
            marginBottom: "10px",
            borderLeft: "4px solid",
            borderColor: item.level === "high" ? "red" : item.level === "medium" ? "orange" : "green",
            background: "#f8fafc",
            borderRadius: 6,
          }}
        >
          <strong>{item.domain}</strong> - {item.message}
          <div style={{ fontSize: "12px", marginTop: "4px" }}>{"\uD83D\uDC49"} {item.action}</div>
        </div>
      ))}
    </div>
  );
}
