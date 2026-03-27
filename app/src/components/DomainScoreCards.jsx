export default function DomainScoreCards({ scores = {} }) {
  return (
    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: 12 }}>
      {Object.entries(scores).map(([domain, score]) => (
        <div key={domain} className="card" style={{ width: "160px" }}>
          <h4 style={{ marginTop: 0, marginBottom: 8 }}>{domain}</h4>
          <p
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: "bold",
              color: score < 50 ? "red" : score < 75 ? "orange" : "green",
            }}
          >
            {score}%
          </p>
        </div>
      ))}
    </div>
  );
}
