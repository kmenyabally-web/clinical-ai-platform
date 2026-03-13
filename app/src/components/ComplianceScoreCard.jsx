import React from "react";
import { getScoreBand } from "../services/complianceEngine";

const BAND_COLORS = {
  green: { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  amber: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  red: { bg: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
};

/**
 * Single CQC domain score card. Shows label, score 0–100, and colour (90+ green, 70–89 amber, &lt;70 red).
 */
export default function ComplianceScoreCard({ label, score }) {
  const num = typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const band = getScoreBand(num);
  const colors = BAND_COLORS[band] ?? BAND_COLORS.red;

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        borderRadius: 12,
        border: `2px solid ${colors.border}`,
        background: colors.bg,
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: colors.text, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: colors.text }}>
        {num}%
      </div>
    </div>
  );
}
