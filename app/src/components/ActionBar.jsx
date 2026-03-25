export default function ActionBar({ actions = [] }) {
  if (!actions.length) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginBottom: "20px",
        flexWrap: "wrap",
      }}
    >
      {actions.map((action, i) => (
        <button
          key={`${action.label ?? "action"}-${i}`}
          type="button"
          onClick={action.onClick}
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            border: "none",
            background: action.type === "generate" ? "#7c3aed" : "#2563eb",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
