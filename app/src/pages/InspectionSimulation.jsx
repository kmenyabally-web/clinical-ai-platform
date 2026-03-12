import { useState, useEffect, useCallback } from "react";
import { useOrganisation } from "../context/OrganisationContext";
import { useService } from "../context/ServiceContext";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import {
  fetchInspectionQuestions,
  createSession,
  getSession,
  saveResponse,
  getResponsesForSession,
  completeSession,
  getSessionsForOrganisation,
  getGapAnalysis,
} from "../services/inspectionService";
import { CQC_KEY_QUESTIONS } from "../config/inspectionDomains";
import { RESPONSE_VALUES } from "../config/inspectionDomains";

const cardStyle = {
  background: "#fff",
  borderRadius: 12,
  padding: "1.5rem",
  marginBottom: "1rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

/**
 * CQC Inspection Simulation. Managers/Admins run; Staff/Auditors view results.
 */
export default function InspectionSimulation() {
  const { organisationId } = useOrganisation();
  const { currentServiceId } = useService();
  const { user } = useAuth();
  const { can, role } = useRole();
  const canRunInspection = can("audit:update");

  const [questions, setQuestions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [responses, setResponses] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("list"); // list | active | results
  const [result, setResult] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(null);

  const auditContext =
    organisationId && user?.uid
      ? { organisationId, userId: user.uid, userRole: role ?? "" }
      : undefined;

  const loadQuestions = useCallback(async () => {
    try {
      const list = await fetchInspectionQuestions();
      setQuestions(list);
    } catch (e) {
      setError(e?.message ?? "Failed to load questions.");
    }
  }, []);

  const loadSessions = useCallback(async () => {
    if (!organisationId) return;
    try {
      const list = await getSessionsForOrganisation(organisationId, { serviceId: currentServiceId });
      setSessions(list);
    } catch (e) {
      setError(e?.message ?? "Failed to load sessions.");
    }
  }, [organisationId, currentServiceId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    setLoading(false);
  }, [questions, sessions]);

  useEffect(() => {
    if (!currentSessionId) return;
    getSession(currentSessionId).then(setSession);
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) return;
    getResponsesForSession(currentSessionId).then((list) => {
      const map = {};
      list.forEach((r) => {
        map[r.questionId] = r.response;
      });
      setResponses(map);
    });
  }, [currentSessionId]);

  async function handleStart() {
    if (!organisationId || !user?.uid || !auditContext) return;
    setError(null);
    try {
      const { sessionId } = await createSession(organisationId, user.uid, auditContext, currentServiceId);
      setCurrentSessionId(sessionId);
      setCurrentIndex(0);
      setResponses({});
      setPhase("active");
      setResult(null);
      setGapAnalysis(null);
      loadSessions();
    } catch (e) {
      setError(e?.message ?? "Failed to start simulation.");
    }
  }

  async function handleAnswer(value) {
    if (!currentSessionId || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    setResponses((prev) => ({ ...prev, [q.id]: value }));
    await saveResponse(currentSessionId, q.id, value, user?.uid);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase("review");
    }
  }

  async function handleComplete() {
    if (!currentSessionId || !organisationId || !auditContext) return;
    setError(null);
    const responseList = questions.map((q) => ({
      questionId: q.id,
      response: responses[q.id] ?? "No",
    }));
    try {
      const res = await completeSession(
        currentSessionId,
        organisationId,
        questions,
        responseList,
        auditContext
      );
      setResult(res);
      const gap = await getGapAnalysis(organisationId, questions, responseList, currentServiceId);
      setGapAnalysis(gap);
      setPhase("results");
      setSession((s) => (s ? { ...s, completedAt: new Date(), overallScore: res.overallScore, riskLevel: res.riskLevel } : null));
      loadSessions();
    } catch (e) {
      setError(e?.message ?? "Failed to complete simulation.");
    }
  }

  function handleBackToList() {
    setCurrentSessionId(null);
    setSession(null);
    setResponses({});
    setCurrentIndex(0);
    setPhase("list");
    setResult(null);
    setGapAnalysis(null);
    loadSessions();
  }

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  return (
    <div style={{ padding: "1rem 0" }}>
      <h1 style={{ marginTop: 0 }}>CQC Inspection Simulation</h1>

      {error && (
        <p role="alert" style={{ color: "#c62828", marginBottom: "1rem" }}>
          {error}
        </p>
      )}

      {phase === "list" && (
        <>
          {!canRunInspection && (
            <p style={{ color: "#666" }}>
              You can view past simulation results below. Only Managers and Admins can run new inspections.
            </p>
          )}
          {canRunInspection && (
            <div style={cardStyle}>
              <p style={{ marginTop: 0 }}>Simulate a CQC inspection by answering questions aligned with CQC Key Questions.</p>
              <button
                type="button"
                onClick={handleStart}
                style={{
                  padding: "10px 20px",
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Start simulation
              </button>
            </div>
          )}
          <section aria-label="Past sessions">
            <h2 style={{ fontSize: "1.1rem" }}>Past sessions</h2>
            {sessions.length === 0 ? (
              <p style={{ color: "#666" }}>No sessions yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {sessions.map((s) => (
                  <li
                    key={s.id}
                    style={{
                      padding: "0.75rem",
                      background: "#f5f5f5",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    {s.completedAt != null ? (
                      <>
                        <strong>Score: {s.overallScore ?? "—"}%</strong> — {s.riskLevel ?? ""}
                        <button
                          type="button"
                          onClick={async () => {
                            setCurrentSessionId(s.id);
                            setPhase("results");
                            setResult({ overallScore: s.overallScore, riskLevel: s.riskLevel });
                            const qs = questions.length ? questions : await fetchInspectionQuestions();
                            if (qs.length) setQuestions(qs);
                            const resList = await getResponsesForSession(s.id);
                            const gap = await getGapAnalysis(organisationId, qs, resList, currentServiceId);
                            setGapAnalysis(gap);
                          }}
                          style={{ marginLeft: 12, fontSize: "0.875rem" }}
                        >
                          View details
                        </button>
                      </>
                    ) : (
                      "In progress"
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {phase === "active" && currentQuestion && (
        <div style={cardStyle}>
          <div style={{ marginBottom: "1rem" }} aria-label={`Question ${currentIndex + 1} of ${questions.length}`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "#666", marginBottom: 4 }}>
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{CQC_KEY_QUESTIONS.find((d) => d.value === currentQuestion.domainType)?.label ?? currentQuestion.domainType}</span>
            </div>
            <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  background: "#1976d2",
                  borderRadius: 3,
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.75rem" }}>{currentQuestion.questionText}</h2>
          {currentQuestion.guidanceText && (
            <p style={{ color: "#555", marginBottom: "0.5rem" }}><strong>Guidance:</strong> {currentQuestion.guidanceText}</p>
          )}
          {currentQuestion.evidenceHint && (
            <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1rem" }}>
              <strong>Recommended evidence:</strong> {currentQuestion.evidenceHint}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RESPONSE_VALUES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleAnswer(r.value)}
                style={{
                  padding: "10px 20px",
                  background: responses[currentQuestion.id] === r.value ? "#1976d2" : "#f5f5f5",
                  color: responses[currentQuestion.id] === r.value ? "#fff" : "#333",
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button type="button" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} style={{ marginRight: 8 }}>
              Previous
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={handleComplete}
                style={{
                  padding: "8px 16px",
                  background: "#2e7d32",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Complete inspection
              </button>
            ) : (
              <button type="button" onClick={() => setCurrentIndex((i) => i + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "review" && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Review and complete</h2>
          <p>You have answered all questions. Complete the inspection to see your score and gap analysis.</p>
          <button
            type="button"
            onClick={handleComplete}
            style={{
              padding: "10px 20px",
              background: "#2e7d32",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Complete inspection
          </button>
        </div>
      )}

      {phase === "results" && result && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Inspection results</h2>
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>Inspection readiness score: {result.overallScore}%</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: 4 }}>Risk level: {result.riskLevel}</div>
          </div>
          {result.createdActionIds?.length > 0 && (
            <p style={{ color: "#666" }}>
              {result.createdActionIds.length} compliance action(s) were created for "No" responses. Find them in Actions.
            </p>
          )}
          {gapAnalysis && (
            <>
              <h3 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Gap analysis</h3>
              {gapAnalysis.missingEvidence?.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Missing evidence indicators</strong>
                  <ul style={{ margin: "0.25rem 0 0 1.25rem" }}>
                    {gapAnalysis.missingEvidence.map((m) => (
                      <li key={m.domainKey}>{m.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {gapAnalysis.highRiskDomains?.length > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <strong>Domain-level risk</strong>
                  <ul style={{ margin: "0.25rem 0 0 1.25rem" }}>
                    {gapAnalysis.highRiskDomains.map((d) => (
                      <li key={d.domainType}>{d.label}: {d.score.toFixed(0)}%</li>
                    ))}
                  </ul>
                </div>
              )}
              {gapAnalysis.recommendedActions?.length > 0 && (
                <div>
                  <strong>Suggested compliance actions</strong> (from "No" responses)
                  <ul style={{ margin: "0.25rem 0 0 1.25rem" }}>
                    {gapAnalysis.recommendedActions.map((a) => (
                      <li key={a.questionId}>{a.questionText}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={handleBackToList}
            style={{ marginTop: "1.5rem" }}
          >
            Back to list
          </button>
        </div>
      )}
    </div>
  );
}
