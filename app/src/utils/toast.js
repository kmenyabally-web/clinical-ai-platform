/**
 * Lightweight global toast for async error/success feedback (no extra dependencies).
 */

let toastId = 0;

export function showToast(message, variant = "error") {
  const text = typeof message === "string" && message.trim() ? message.trim() : "Something went wrong";
  if (typeof document === "undefined") {
    console.error(text);
    return;
  }
  const id = ++toastId;
  const el = document.createElement("div");
  el.setAttribute("role", "status");
  el.dataset.toastId = String(id);
  const bg =
    variant === "success"
      ? "#ecfdf5"
      : variant === "info"
        ? "#eff6ff"
        : "#fef2f2";
  const border =
    variant === "success"
      ? "#86efac"
      : variant === "info"
        ? "#93c5fd"
        : "#fecaca";
  const color =
    variant === "success"
      ? "#166534"
      : variant === "info"
        ? "#1e40af"
        : "#991b1b";
  Object.assign(el.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    maxWidth: "min(420px, calc(100vw - 32px))",
    padding: "12px 16px",
    borderRadius: "10px",
    border: `1px solid ${border}`,
    background: bg,
    color,
    fontSize: "14px",
    fontWeight: 600,
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.12)",
    zIndex: "99999",
    boxSizing: "border-box",
  });
  el.textContent = text;
  document.body.appendChild(el);
  const t = window.setTimeout(() => {
    try {
      el.remove();
    } catch {
      /* ignore */
    }
  }, 4500);
  el.addEventListener("click", () => {
    window.clearTimeout(t);
    try {
      el.remove();
    } catch {
      /* ignore */
    }
  });
}
