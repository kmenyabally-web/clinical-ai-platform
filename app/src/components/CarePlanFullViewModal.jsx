import React, { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useReactToPrint } from "react-to-print";

const CLINICAL_DISCLAIMER =
  "AI-generated draft. This document must be reviewed, amended as clinically appropriate, and signed off by a qualified clinician before use in care delivery. It must not be used as the sole basis for clinical decisions.";

const mdComponents = {
  h1: (props) => (
    <h1
      style={{
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        fontSize: "1.35rem",
        marginTop: "1.25rem",
        marginBottom: "0.5rem",
        color: "#0f172a",
        fontWeight: 800,
        lineHeight: 1.3,
      }}
      {...props}
    />
  ),
  h2: (props) => (
    <h2
      style={{
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        fontSize: "1.15rem",
        marginTop: "1rem",
        marginBottom: "0.45rem",
        color: "#1e293b",
        fontWeight: 800,
        lineHeight: 1.35,
      }}
      {...props}
    />
  ),
  h3: (props) => (
    <h3
      style={{
        fontFamily: "system-ui, 'Segoe UI', sans-serif",
        fontSize: "1.05rem",
        marginTop: "0.85rem",
        marginBottom: "0.35rem",
        color: "#334155",
        fontWeight: 800,
        lineHeight: 1.3,
      }}
      {...props}
    />
  ),
  p: (props) => <p style={{ margin: "0.5rem 0", lineHeight: 1.6, color: "#334155" }} {...props} />,
  ul: (props) => (
    <ul style={{ margin: "0.5rem 0", paddingLeft: "1.35rem", listStyleType: "disc" }} {...props} />
  ),
  ol: (props) => (
    <ol style={{ margin: "0.5rem 0", paddingLeft: "1.35rem", listStyleType: "decimal" }} {...props} />
  ),
  li: (props) => (
    <li style={{ margin: "0.3rem 0", lineHeight: 1.55, color: "#334155", display: "list-item" }} {...props} />
  ),
  strong: (props) => <strong style={{ fontWeight: 700, color: "#0f172a" }} {...props} />,
  hr: () => <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "1rem 0" }} />,
  blockquote: (props) => (
    <blockquote
      style={{
        margin: "0.75rem 0",
        paddingLeft: "1rem",
        borderLeft: "4px solid #cbd5e1",
        color: "#475569",
        fontStyle: "italic",
      }}
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      style={{
        margin: "0.75rem 0",
        padding: "0.75rem 1rem",
        background: "#f1f5f9",
        borderRadius: 8,
        fontSize: 12,
        overflowX: "auto",
        lineHeight: 1.45,
      }}
      {...props}
    />
  ),
  code: (props) => {
    const { className, children, ...rest } = props;
    const isBlock = Boolean(className?.includes("language-"));
    if (isBlock) {
      return (
        <code className={className} style={{ fontFamily: "ui-monospace, monospace" }} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          fontSize: "0.9em",
          background: "#f1f5f9",
          padding: "0.1em 0.35em",
          borderRadius: 4,
        }}
        {...rest}
      >
        {children}
      </code>
    );
  },
  table: (props) => (
    <div style={{ overflowX: "auto", margin: "1rem 0" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          border: "1px solid #e2e8f0",
          borderRadius: 8,
        }}
        {...props}
      />
    </div>
  ),
  thead: (props) => <thead style={{ background: "#f8fafc" }} {...props} />,
  th: (props) => (
    <th
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderBottom: "1px solid #e2e8f0",
        fontWeight: 800,
        color: "#0f172a",
      }}
      {...props}
    />
  ),
  td: (props) => (
    <td
      style={{
        padding: "8px 12px",
        borderBottom: "1px solid #f1f5f9",
        color: "#334155",
        verticalAlign: "top",
      }}
      {...props}
    />
  ),
  tr: (props) => <tr {...props} />,
  tbody: (props) => <tbody {...props} />,
};

const btnBase = {
  padding: "10px 16px",
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  border: "none",
};

export function CarePlanFullViewModal({ open, onClose, patientName, generatedAtLabel, planContent }) {
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Care Plan — ${patientName || "Patient"}`,
    pageStyle: `@page { margin: 14mm; size: A4; }`,
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cqc-care-plan-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          border: "none",
          cursor: "pointer",
        }}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 720,
          maxHeight: "min(92vh, 900px)",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            flexShrink: 0,
          }}
        >
          <h2 id="cqc-care-plan-modal-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>
            Care plan — full view
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnBase,
              background: "#e2e8f0",
              color: "#334155",
            }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "0 18px 18px",
          }}
        >
          <div ref={printRef} className="cqc-care-plan-printable">
            <header style={{ marginBottom: "1.25rem", paddingTop: "1rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "1rem" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#64748b", textTransform: "uppercase" }}>
                Patient
              </p>
              <h1 style={{ margin: "0.35rem 0 0 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.25 }}>
                {patientName || "Patient"}
              </h1>
              <p style={{ margin: "0.65rem 0 0 0", fontSize: 14, color: "#475569", fontWeight: 600 }}>
                <span style={{ color: "#64748b", fontWeight: 700 }}>Date generated:</span> {generatedAtLabel || "—"}
              </p>
            </header>

            <div
              className="cqc-care-plan-markdown"
              style={{
                fontSize: 14,
                fontFamily: "Georgia, 'Times New Roman', serif",
                color: "#1e293b",
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {planContent || ""}
              </ReactMarkdown>
            </div>

            <footer
              style={{
                marginTop: "1.75rem",
                paddingTop: "1rem",
                borderTop: "2px solid #fde68a",
                background: "#fffbeb",
                borderRadius: 10,
                padding: "0.9rem 1rem",
                marginBottom: "0.5rem",
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: "#92400e", letterSpacing: "0.02em" }}>
                Clinical disclaimer (AI-generated draft)
              </p>
              <p style={{ margin: "0.45rem 0 0 0", fontSize: 13, lineHeight: 1.5, color: "#78350f" }}>{CLINICAL_DISCLAIMER}</p>
            </footer>
          </div>
        </div>

        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            flexWrap: "wrap",
            padding: "12px 18px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handlePrint}
            style={{
              ...btnBase,
              background: "#0f172a",
              color: "#fff",
            }}
          >
            Print Plan
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnBase,
              background: "#e2e8f0",
              color: "#334155",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
