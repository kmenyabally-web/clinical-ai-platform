export default function MetricCard({ title, value, icon, color }) {
  const accentColor = color || "#1976d2";
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        padding: "0.9rem 1.1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "#475569",
          }}
        >
          {title}
        </div>
        {icon && (
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "999px",
              background: `${accentColor}1A`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
              fontSize: "0.9rem",
            }}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        {value}
      </div>
    </div>
  );
}

