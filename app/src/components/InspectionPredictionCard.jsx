export default function InspectionPredictionCard({ risk, reasons = [] }) {
  const colors = {
    LOW: "green",
    MODERATE: "orange",
    HIGH: "orangered",
    CRITICAL: "red",
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Inspection Risk Prediction</h3>
      <p
        style={{
          fontSize: "22px",
          fontWeight: "bold",
          color: colors[risk] || "black",
          marginBottom: 8,
        }}
      >
        {risk}
      </p>
      <p style={{ fontSize: "13px", color: "#666", marginTop: 0 }}>
        Based on current compliance signals and trends
      </p>
      {reasons.length > 0 ? (
        <div>
          <strong style={{ fontSize: 13 }}>Key risks:</strong>
          <ul style={{ margin: "6px 0 0 18px", color: "#475569", fontSize: 13 }}>
            {reasons.map((r, idx) => (
              <li key={`reason-${idx}`}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
