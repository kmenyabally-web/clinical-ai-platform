/**
 * Default Gemini model id (REST v1beta generateContent).
 * Override in `.env`: VITE_GEMINI_MODEL=gemini-1.5-flash
 */
export const DEFAULT_GEMINI_MODEL_ID =
  (import.meta.env.VITE_GEMINI_MODEL && String(import.meta.env.VITE_GEMINI_MODEL).trim()) ||
  "gemini-1.5-flash";
