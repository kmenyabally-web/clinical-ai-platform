/**
 * Clinical note approval hierarchy (MDT role of approver vs note discipline / status).
 * Notes must be status "final" before approval (except system-role override for governance).
 */

const ALLIED_SELF_APPROVE = [
  "Occupational Therapist",
  "Speech and Language Therapist",
  "Psychologist",
  "Psychiatrist",
] as const;

function norm(s: unknown): string {
  return String(s ?? "").trim();
}

/** Note discipline for governance — prefers `role`, then `discipline`. */
export function getNoteRole(note: Record<string, unknown> | null | undefined): string {
  if (!note || typeof note !== "object") return "";
  const r = norm(note.role);
  if (r) return r;
  return norm(note.discipline);
}

export function isSystemApproverRole(systemRole: unknown): boolean {
  const s = norm(systemRole).toUpperCase();
  return ["ADMIN", "MANAGER", "SUPER_ADMIN", "GLOBAL_ADMIN", "GROUP_ADMIN", "ORGANISATION ADMIN", "ORGANIZATION ADMIN"].includes(s);
}

/**
 * Single source of truth for governance status (must match {@link mapFirestoreClinicalNote} in noteService).
 * Missing/unknown `status` in Firestore → treated as `draft` (legacy notes).
 * If `status` is absent but approval fields exist → `approved`.
 */
export function getNormalizedNoteStatus(note: Record<string, unknown> | null | undefined): "draft" | "final" | "approved" {
  if (!note || typeof note !== "object") return "draft";
  let raw = "";
  if (typeof note.status === "string") raw = note.status.trim().toLowerCase();
  else if (note.status != null && note.status !== undefined) raw = String(note.status).trim().toLowerCase();

  if (raw === "approved") return "approved";
  if (raw === "final") return "final";
  if (raw === "draft") return "draft";
  if (note.approvedBy || note.approvedAt) return "approved";
  return "draft";
}

/**
 * Whether the current user may approve this note (status must be `final` unless legacy path disabled).
 */
export function canApproveNote(
  userMdtRole: string | null | undefined,
  note: Record<string, unknown> | null | undefined,
  currentUserUid: string | null | undefined,
  systemRole?: string | null | undefined
): boolean {
  if (!note || typeof note !== "object") return false;
  if (note.isDeleted === true) return false;

  const st = getNormalizedNoteStatus(note);
  if (st === "approved") return false;
  /** Only finalized notes enter the approval queue. */
  if (st !== "final") return false;

  if (isSystemApproverRole(systemRole)) {
    return true;
  }

  const noteRole = getNoteRole(note);
  if (!noteRole) return false;

  const ur = norm(userMdtRole);
  if (!ur) return false;

  /** Consultant — may approve any discipline at final stage. */
  if (ur === "Consultant") {
    return true;
  }

  /** Support Worker — cannot approve. */
  if (ur === "Support Worker") {
    return false;
  }

  /** Nurse — Support Worker notes only. */
  if (ur === "Nurse") {
    return noteRole === "Support Worker";
  }

  /** Senior Nurse — Nurse + Support Worker. */
  if (ur === "Senior Nurse") {
    return ["Nurse", "Support Worker"].includes(noteRole);
  }

  /** Head of Care — nurses and junior roles listed. */
  if (ur === "Head of Care") {
    return ["Nurse", "Support Worker", "Senior Nurse"].includes(noteRole);
  }

  /** Allied health — own discipline only. */
  if (ALLIED_SELF_APPROVE.some((x) => x === ur)) {
    return noteRole === ur;
  }

  return false;
}

export type CurrentUserLike = {
  uid?: string | null;
  mdtRole?: string | null;
  systemRole?: string | null;
};

/**
 * Convenience wrapper: `canApprove(note, currentUser)` with profile-shaped user.
 */
export function canApprove(
  note: Record<string, unknown> | null | undefined,
  currentUser: CurrentUserLike | null | undefined
): boolean {
  if (!currentUser) return false;
  return canApproveNote(
    currentUser.mdtRole ?? null,
    note,
    currentUser.uid ?? null,
    currentUser.systemRole ?? null
  );
}
