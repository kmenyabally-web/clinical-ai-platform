/** [ENABLEMENT GATE: STAGE 11 - CLINICAL NOTES SYSTEM] */

import React, { useEffect, useRef, useState } from "react";

const MOODS = [
  { value: "😊", label: "Good" },
  { value: "😐", label: "Stable" },
  { value: "😟", label: "Unwell" },
];

export default function ClinicalNoteForm({ onSubmit, loading = false }) {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("😐");
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    onSubmit({ content: content.trim(), mood });
    setContent("");
    setMood("😐");
    textareaRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: "0.85rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 4 }}>
          Quick update *
        </label>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              if (!loading && content.trim()) {
                handleSubmit(e);
              }
            }
          }}
          rows={8}
          required
          placeholder="Type a brief clinical note update…"
          style={styles.textarea}
        />
      </div>

      <div style={{ marginBottom: "1.15rem" }}>
        <label style={{ display: "block", fontSize: "0.85rem", marginBottom: 6 }}>
          Mood/Status
        </label>
        <div style={styles.moodRow}>
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMood(m.value)}
              style={{
                ...styles.moodBtn,
                ...(mood === m.value ? styles.moodBtnActive : null),
              }}
              aria-pressed={mood === m.value}
            >
              <span style={{ fontSize: 18 }} aria-hidden="true">
                {m.value}
              </span>
              <span style={styles.moodLabel}>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.submitBtn,
          ...(loading ? { cursor: "default", opacity: 0.7 } : null),
        }}
      >
        {loading ? "Saving…" : "Add Note"}
      </button>
    </form>
  );
}

const styles = {
  textarea: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    resize: "vertical",
    fontSize: 13,
    lineHeight: 1.4,
  },
  moodRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  moodBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 1px 0 rgba(15,23,42,0.04)",
    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
  },
  moodBtnActive: {
    borderColor: "#2563eb",
    boxShadow: "0 0 0 3px rgba(37,99,235,0.18), 0 6px 18px rgba(37,99,235,0.12)",
    background: "#eff6ff",
    transform: "scale(1.02)",
  },
  moodLabel: {
    fontSize: 12,
    color: "#0f172a",
  },
  submitBtn: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 8,
    border: "none",
    background: "#005eb8",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
};

