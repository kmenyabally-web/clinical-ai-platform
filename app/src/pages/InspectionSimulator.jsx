import { useState } from "react";
import { generateAIContent, stripJsonFence } from "../services/geminiAiService";

const FALLBACK_QUESTIONS = [
  { question: "Why is there an open safeguarding incident?" },
  { question: "How do you manage medication refusal?" },
  { question: "What is your escalation process?" },
  { question: "How do you ensure staff training compliance?" },
  { question: "How do you monitor patient risk?" },
];

export default function InspectionSimulator() {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [answerDraft, setAnswerDraft] = useState("");
  const [result, setResult] = useState(null);

  const startInspection = async () => {
    setStarted(true);
    setResult(null);
    setResponses([]);
    setCurrentIndex(0);
    setAnswerDraft("");
    setLoading(true);

    const prompt = `
You are a strict CQC inspector.

Generate 5 realistic inspection questions based on:
- safeguarding
- incidents
- care plans
- behaviour logs

Return JSON:
[
 { "question": "..." }
]
`;

    const ai = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    console.log("AI RESPONSE:", ai);

    let parsed;
    try {
      const cleaned = stripJsonFence(ai || "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("AI ERROR:", e);
      parsed = FALLBACK_QUESTIONS;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      parsed = FALLBACK_QUESTIONS;
    }

    const normalised = parsed.map((q) => {
      if (q && typeof q === "object" && typeof q.question === "string") {
        return { question: q.question.trim() };
      }
      return { question: String(q ?? "").trim() || "Please describe your governance response." };
    });

    setQuestions(normalised.length ? normalised : FALLBACK_QUESTIONS);
    setLoading(false);
  };

  const finishInspection = (finalResponses) => {
    let score = 100;

    finalResponses.forEach((r) => {
      if (!r || r.length < 20) score -= 15;
    });

    const rating =
      score >= 80 ? "GOOD" : score >= 65 ? "REQUIRES IMPROVEMENT" : "INADEQUATE";

    setResult({ score, rating });
  };

  const submitResponse = () => {
    const answer = answerDraft.trim();
    const updated = [...responses, answer];
    setResponses(updated);
    setAnswerDraft("");

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishInspection(updated);
    }
  };

  const currentQuestion = questions[currentIndex]?.question ?? "";

  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      <h1 style={{ marginTop: 0, marginBottom: "0.25rem" }}>Mock Inspection</h1>
      <p style={{ marginTop: 0, color: "#64748b", marginBottom: "1rem" }}>
        Five CQC-style questions. Short answers reduce your score. If the AI is unavailable, default questions are used.
      </p>

      {!started && (
        <button
          type="button"
          onClick={startInspection}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#005eb8",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Starting…" : "Start Mock Inspection"}
        </button>
      )}

      {started && loading && (
        <p role="status" style={{ color: "#334155" }}>
          Generating inspection questions…
        </p>
      )}

      {started && !loading && questions.length > 0 && !result && (
        <section
          aria-label="Inspection question"
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1rem",
            marginTop: 12,
          }}
        >
          <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>
            Question {currentIndex + 1} of {questions.length}
          </h2>
          <p style={{ margin: "0 0 1rem", color: "#0f172a", whiteSpace: "pre-wrap" }}>{currentQuestion}</p>
          <textarea
            value={answerDraft}
            onChange={(e) => setAnswerDraft(e.target.value)}
            rows={5}
            placeholder="Your response (aim for at least 20 characters for full credit)…"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              resize: "vertical",
              marginBottom: 10,
            }}
          />
          <button
            type="button"
            onClick={submitResponse}
            disabled={!answerDraft.trim()}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 700,
              cursor: answerDraft.trim() ? "pointer" : "default",
              opacity: answerDraft.trim() ? 1 : 0.6,
            }}
          >
            Submit answer
          </button>
        </section>
      )}

      {result && (
        <section
          aria-label="Inspection result"
          style={{
            marginTop: 16,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderLeft: "6px solid #005eb8",
            borderRadius: 12,
            padding: "1rem",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Mock inspection outcome</h2>
          <p style={{ margin: "4px 0" }}>
            Score: <strong>{result.score}</strong>
          </p>
          <p style={{ margin: "4px 0" }}>
            Rating: <strong>{result.rating}</strong>
          </p>
          <p style={{ margin: "12px 0 0", color: "#475569", fontSize: "0.92rem" }}>
            This is a training simulation. Use full governance detail in real inspections.
          </p>
        </section>
      )}
    </div>
  );
}
