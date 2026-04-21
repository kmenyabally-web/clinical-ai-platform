import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

const STORAGE_KEY = "cqc.demoGuide.stepIndex.v1";
const COMPLETED_KEY = "cqc.demoGuide.completed.v1";

function safeParseInt(v) {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function findBySelector(selector) {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function findButtonByTextIncludes(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  const buttons = Array.from(document.querySelectorAll("button"));
  return buttons.find((b) => String(b.textContent ?? "").includes(t)) ?? null;
}

export default function DemoGuide() {
  const { demoMode, setDemoMode } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();

  const steps = useMemo(
    () => [
      {
        key: "ward-overview",
        text: "Welcome — this is your live ward overview",
        ensurePath: "/dashboard",
        done: (loc) => loc.pathname.startsWith("/dashboard"),
        highlightSelector: '[data-demo-guide="dashboard-overview"]',
      },
      {
        key: "patient-detail",
        text: "Click Daniel K to view patient details",
        ensurePath: "/dashboard",
        done: (loc) => loc.pathname === "/patients/patient001",
        highlightSelector: '[data-demo-guide="dashboard-daniel-k-link"]',
        autoClick: { selector: '[data-demo-guide="dashboard-daniel-k-link"]' },
      },
      {
        key: "behaviour",
        text: "View behaviour tracking to understand risks",
        ensurePath: "/behaviour",
        done: (loc) => loc.pathname.startsWith("/behaviour"),
        highlightSelector: '[data-demo-guide="behaviour-risk-context"]',
      },
      {
        key: "mdt",
        text: "Open MDT review — all disciplines contribute",
        ensurePath: "/mdt",
        done: (loc) => loc.pathname.startsWith("/mdt"),
        highlightSelector: '[data-demo-guide="mdt-structured-summary"]',
      },
      {
        key: "cpa",
        text: "Generate a CPA report instantly",
        ensurePath: "/reports",
        done: () => Boolean(findBySelector('[data-demo-guide="generated-cpa-report"]')),
        highlightSelector: '[data-demo-guide="generate-cpa-report"]',
        autoClick: { selector: '[data-demo-guide="generate-cpa-report"]' },
      },
      {
        key: "evidence",
        text: "View Evidence Pack — inspection-ready",
        ensurePath: "/evidence-pack",
        done: () => Boolean(document.querySelector("#cqc-evidence-pack-v1")),
        highlightSelector: '[data-demo-guide="evidence-pack-run-engine"]',
        autoClick: { selector: '[data-demo-guide="evidence-pack-run-engine"]' },
      },
    ],
    []
  );

  const [completed, setCompleted] = useState(() => {
    try {
      return window.localStorage.getItem(COMPLETED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [stepIndex, setStepIndex] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = safeParseInt(raw);
      if (parsed == null) return 0;
      return Math.max(0, Math.min(steps.length - 1, parsed));
    } catch {
      return 0;
    }
  });

  const step = steps[stepIndex] ?? steps[0];

  const [autoTimeoutExceeded, setAutoTimeoutExceeded] = useState(false);
  const didAutoClickRef = useRef(new Set());

  const prevHighlightRef = useRef({
    el: null,
    prev: null,
  });

  const done = step ? Boolean(step.done(location)) : false;

  const doneRef = useRef(done);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  // Auto-generation steps depend on DOM changes; re-render periodically while they run.
  const [, setRenderTick] = useState(0);
  useEffect(() => {
    if (!demoMode || completed) return;
    if (!step?.autoClick) return;
    const id = window.setInterval(() => setRenderTick((x) => x + 1), 500);
    return () => window.clearInterval(id);
  }, [demoMode, completed, step?.key]);

  // Reset per-step timeout allowance.
  useEffect(() => {
    setAutoTimeoutExceeded(false);
    // Also allow the highlight effects to re-run; auto-click is still protected by didAutoClickRef.
  }, [stepIndex, step?.key]);

  // Persist step
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(stepIndex));
    } catch {
      // ignore
    }
  }, [stepIndex]);

  // Ensure route for the current step.
  useEffect(() => {
    if (!demoMode || !step) return;
    if (!step.ensurePath) return;

    if (!location.pathname.startsWith(step.ensurePath)) {
      navigate(step.ensurePath, { replace: true });
    }
  }, [demoMode, step, location.pathname, navigate]);

  // Highlight current step target.
  useEffect(() => {
    if (!demoMode || !step) return;

    let cancelled = false;

    // Restore previous highlight.
    const { el, prev } = prevHighlightRef.current;
    if (el && prev) {
      if (typeof prev.boxShadow === "string") el.style.boxShadow = prev.boxShadow;
      if (typeof prev.outline === "string") el.style.outline = prev.outline;
      if (typeof prev.outlineOffset === "string") el.style.outlineOffset = prev.outlineOffset;
    }
    prevHighlightRef.current = { el: null, prev: null };

    const highlightOnce = () => {
      if (cancelled) return;
      const target = findBySelector(step.highlightSelector);
      if (!target) return false;

      const prev = {
        boxShadow: target.style.boxShadow,
        outline: target.style.outline,
        outlineOffset: target.style.outlineOffset,
      };

      target.style.boxShadow = "0 0 0 4px rgba(124,58,237,0.25), 0 0 0 8px rgba(124,58,237,0.15)";
      target.style.outline = "3px solid rgba(124,58,237,0.65)";
      target.style.outlineOffset = "2px";
      target.style.borderRadius = "12px";
      target.style.transition = "box-shadow 160ms ease, outline 160ms ease";

      try {
        target.scrollIntoView({ block: "center", behavior: "smooth" });
      } catch {
        // ignore
      }

      prevHighlightRef.current = { el: target, prev };
      return true;
    };

    const maxAttempts = 30; // ~7.5s at 250ms
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      const ok = highlightOnce();
      if (ok) return;
      attempts += 1;
      if (attempts >= maxAttempts) return;
      window.setTimeout(tick, 250);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [demoMode, stepIndex, location.pathname, step]);

  // Auto-click for generation steps.
  useEffect(() => {
    if (!demoMode || !step) return;
    if (!step.autoClick) return;

    const autoId = `${step.key}:autoClick`;
    if (didAutoClickRef.current.has(autoId)) return;
    if (done) return;

    didAutoClickRef.current.add(autoId);

    let cancelled = false;
    const maxAttempts = 30; // ~12s
    let attempts = 0;

    const tick = () => {
      if (cancelled) return;
      if (doneRef.current) return;

      const target = findBySelector(step.autoClick.selector);
      if (target) {
        try {
          target.click();
        } catch {
          // ignore
        }
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) return;
      window.setTimeout(tick, 400);
    };

    // Small delay so the page finishes first paint.
    const t = window.setTimeout(() => tick(), 450);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [demoMode, step, done, location.pathname]);

  // Time-out fallback for steps that auto-generate.
  useEffect(() => {
    if (!demoMode || !step) return;
    if (!step.autoClick) return;
    if (done) return;

    const t = window.setTimeout(() => {
      // Let user proceed even if generation is slow or fails.
      setAutoTimeoutExceeded(true);
    }, 25_000);

    return () => window.clearTimeout(t);
  }, [demoMode, step, done]);

  if (!demoMode || completed) return null;
  if (!step) return null;

  const total = steps.length;
  const highlightExists =
    typeof window !== "undefined" && step.highlightSelector ? Boolean(findBySelector(step.highlightSelector)) : true;
  const canGoNext =
    stepIndex === total - 1 ? true : step.autoClick ? done || autoTimeoutExceeded : done && highlightExists; // last step always allows "Finish"
  const nextLabel = stepIndex === total - 1 ? "Finish" : "Next";

  return (
    <div
      style={{
        position: "fixed",
        right: 22,
        bottom: 22,
        zIndex: 10,
        pointerEvents: "none",
        maxWidth: 420,
      }}
    >
      <div
        style={{
          zIndex: 20,
          pointerEvents: "auto",
          background: "rgba(15, 23, 42, 0.92)",
          color: "white",
          border: "1px solid rgba(167, 139, 250, 0.35)",
          borderRadius: 14,
          padding: "14px 16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        }}
        role="dialog"
        aria-label="Demo walkthrough"
      >
        <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(226, 232, 240, 0.9)", marginBottom: 6 }}>
          Demo walkthrough · Step {stepIndex + 1} / {total}
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>{step.text}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setStepIndex((i) => Math.max(0, i - 1));
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "transparent",
              color: "rgba(226, 232, 240, 0.95)",
              fontWeight: 800,
              cursor: stepIndex === 0 ? "not-allowed" : "pointer",
              opacity: stepIndex === 0 ? 0.6 : 1,
            }}
            disabled={stepIndex === 0}
          >
            Back
          </button>

          <button
            type="button"
            onClick={() => {
              if (stepIndex === total - 1) {
                setCompleted(true);
                try {
                  window.localStorage.setItem(COMPLETED_KEY, "1");
                } catch {
                  // ignore
                }
                return;
              }
              setStepIndex((i) => Math.min(total - 1, i + 1));
            }}
            disabled={!canGoNext}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: canGoNext ? "rgba(124,58,237,1)" : "rgba(148, 163, 184, 0.45)",
              color: "white",
              fontWeight: 900,
              cursor: canGoNext ? "pointer" : "not-allowed",
            }}
          >
            {nextLabel}
          </button>
          <button
            type="button"
            onClick={() => setDemoMode(false)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(248, 113, 113, 0.7)",
              background: "rgba(127, 29, 29, 0.55)",
              color: "#fecaca",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Exit Demo Mode
          </button>
        </div>
      </div>
    </div>
  );
}

