import { useState } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { fetchIncidents } from "../services/incidentService";
import { listCarePlans } from "../services/carePlanManagementService";
import {
  generateInspectorChallenge,
  generateInspectorAuditFeedback,
} from "../services/aiService";

export default function InspectionSimulator() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const [inspectionData, setInspectionData] = useState({ incidents: [], carePlans: [] });
  const [managerResponse, setManagerResponse] = useState("");
  const [auditFeedback, setAuditFeedback] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      text: "Mock Inspection assistant ready. Click 'Start Mock Inspection' to generate the first inspector challenge.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchInspectionContext() {
    const [incidents, carePlans] = await Promise.all([
      fetchIncidents(organisationId, { serviceId: currentServiceId ?? undefined }),
      listCarePlans(organisationId, { serviceId: currentServiceId ?? undefined, limitCount: 3 }),
    ]);
    const recentIncidents = (Array.isArray(incidents) ? incidents : []).slice(0, 5);
    const recentCarePlans = (Array.isArray(carePlans) ? carePlans : []).slice(0, 3);
    return { incidents: recentIncidents, carePlans: recentCarePlans };
  }

  async function handleStart() {
    if (!organisationId) {
      setError("Organisation context missing.");
      return;
    }

    setError("");
    setLoading(true);
    setAuditFeedback("");
    setMessages((prev) => [
      ...prev,
      { role: "user", text: "Start Mock Inspection" },
      { role: "system", text: "Reviewing recent incidents and care plans..." },
    ]);

    try {
      const context = await fetchInspectionContext();
      setInspectionData(context);

      const challenge = await generateInspectorChallenge({
        incidents: context.incidents,
        carePlans: context.carePlans,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.text !== "Reviewing recent incidents and care plans..."),
        { role: "inspector", text: challenge },
      ]);
    } catch (e) {
      setError(e?.message ?? "Mock inspection failed.");
      setMessages((prev) => prev.filter((m) => m.text !== "Reviewing recent incidents and care plans..."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitManagerResponse() {
    if (!managerResponse.trim()) {
      setError("Please enter your response to the inspector.");
      return;
    }
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: managerResponse.trim() }]);
    try {
      const feedback = await generateInspectorAuditFeedback(inspectionData, managerResponse);
      setAuditFeedback(feedback);
      setMessages((prev) => [...prev, { role: "inspector", text: feedback }]);
      setManagerResponse("");
    } catch (e) {
      setError(e?.message ?? "Could not generate clinical audit feedback.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 960 }}>
      <h1 style={{ marginTop: 0, marginBottom: "0.25rem" }}>AI Inspection Simulator</h1>
      <p style={{ marginTop: 0, color: "#64748b", marginBottom: "1rem" }}>
        Run a mock CQC challenge based on recent incidents and care plans.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: "#005eb8",
          color: "#fff",
          fontWeight: 700,
          cursor: loading ? "default" : "pointer",
          marginBottom: 12,
        }}
      >
        {loading ? "Generating challenge..." : "Start Mock Inspection"}
      </button>

      {error ? (
        <div role="alert" style={{ marginBottom: 12, color: "#b91c1c" }}>
          {error}
        </div>
      ) : null}

      <section
        aria-label="Inspection question"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem" }}>Question 1 of 5</h2>
        <p style={{ margin: 0, color: "#334155" }}>
          I've reviewed your Safeguarding logs. You said 'Yes' to protecting people, but I see an open incident for Amina Diallo from yesterday. Why hasn't this been closed yet?
        </p>
      </section>

      <section
        aria-label="Inspection conversation"
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1rem",
          display: "grid",
          gap: 10,
        }}
      >
        {messages.map((m, idx) => {
          const isInspector = m.role === "inspector";
          const isUser = m.role === "user";
          return (
            <div
              key={`${m.role}-${idx}`}
              style={{
                justifySelf: isUser ? "end" : "start",
                maxWidth: "90%",
                whiteSpace: "pre-wrap",
                background: isInspector ? "#eff6ff" : isUser ? "#005eb8" : "#f8fafc",
                color: isUser ? "#fff" : "#0f172a",
                border: `1px solid ${isInspector ? "#bfdbfe" : isUser ? "#005eb8" : "#e2e8f0"}`,
                borderRadius: 10,
                padding: "0.75rem 0.9rem",
                fontSize: "0.92rem",
                lineHeight: 1.5,
              }}
            >
              {m.text}
            </div>
          );
        })}
      </section>

      <section
        aria-label="Manager response"
        style={{
          marginTop: 12,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1rem",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Chat Interface</h2>
        <textarea
          value={managerResponse}
          onChange={(e) => setManagerResponse(e.target.value)}
          rows={6}
          placeholder="Type your response to the inspector..."
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
          onClick={handleSubmitManagerResponse}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            background: "#0f172a",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "default" : "pointer",
          }}
        >
          Submit Response to AI Inspector
        </button>
      </section>

      {auditFeedback ? (
        <section
          aria-label="Clinical audit feedback"
          style={{
            marginTop: 12,
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderLeft: "6px solid #005eb8",
            borderRadius: 12,
            padding: "1rem",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Clinical Audit</h2>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#0f172a", fontFamily: "inherit" }}>
            {auditFeedback}
          </pre>
        </section>
      ) : null}
    </div>
  );
}
