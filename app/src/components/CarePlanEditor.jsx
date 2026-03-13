import { useState, useEffect } from "react";

const inputStyle = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  fontSize: "14px",
};

/**
 * CarePlanEditor – create or edit a care plan.
 *
 * Props:
 * - carePlan: existing plan (or null) with fields { title, goals, interventions, reviewDate }
 * - onSave(payload): called with { title, goals, interventions, reviewDate }
 * - loading: boolean
 */
export default function CarePlanEditor({ carePlan, onSave, loading }) {
  const [title, setTitle] = useState("");
  const [goals, setGoals] = useState("");
  const [interventions, setInterventions] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  useEffect(() => {
    if (!carePlan) {
      setTitle("");
      setGoals("");
      setInterventions("");
      setReviewDate("");
      return;
    }
    setTitle(carePlan.title ?? "");
    setGoals(carePlan.goals ?? "");
    setInterventions(carePlan.interventions ?? "");
    if (carePlan.reviewDate?.toDate) {
      try {
        const d = carePlan.reviewDate.toDate();
        setReviewDate(d.toISOString().slice(0, 10));
      } catch {
        setReviewDate("");
      }
    } else if (carePlan.reviewDate instanceof Date) {
      setReviewDate(carePlan.reviewDate.toISOString().slice(0, 10));
    } else if (typeof carePlan.reviewDate === "string") {
      setReviewDate(carePlan.reviewDate.slice(0, 10));
    } else {
      setReviewDate("");
    }
  }, [carePlan]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const review = reviewDate ? new Date(reviewDate) : null;
    onSave({
      title: title.trim(),
      goals: goals.trim(),
      interventions: interventions.trim(),
      reviewDate: review,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="careplan-title" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Plan title *
        </label>
        <input
          id="careplan-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
          placeholder="e.g. Falls risk management plan"
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="careplan-goals" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Care goals
        </label>
        <textarea
          id="careplan-goals"
          rows={3}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Goals, outcomes, what success looks like"
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="careplan-interventions" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Interventions
        </label>
        <textarea
          id="careplan-interventions"
          rows={3}
          value={interventions}
          onChange={(e) => setInterventions(e.target.value)}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="Specific interventions, monitoring, who will do what"
        />
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="careplan-review" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
          Review date
        </label>
        <input
          id="careplan-review"
          type="date"
          value={reviewDate}
          onChange={(e) => setReviewDate(e.target.value)}
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          background: "#1976d2",
          color: "#fff",
          fontSize: "14px",
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
        }}
      >
        {loading ? "Saving…" : "Save care plan"}
      </button>
    </form>
  );
}

