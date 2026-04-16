export default function ActionBar({ actions = [] }) {
  if (!actions.length) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}
    >
      {actions.map((action, i) => (
        <button
          key={`${action.label ?? "action"}-${i}`}
          type="button"
          onClick={action.onClick}
          data-demo-guide={action.demoGuideId ?? undefined}
          style={{
            padding: "10px 14px",
            borderRadius: "6px",
            border: action.type === "secondary" ? "1px solid var(--border)" : "none",
            background:
              action.type === "generate"
                ? "var(--primary)"
                : action.type === "secondary"
                  ? "var(--surface)"
                  : "var(--primary)",
            color: action.type === "secondary" ? "var(--text-primary)" : "#fff",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
