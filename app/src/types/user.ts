/**
 * User directory model (Firestore `users/{uid}`).
 * `role` = system / SaaS RBAC only. `mdtRole` = clinical MDT identity (Nurse, Psychologist, …).
 */

import type { SystemRole } from "../constants/systemRoles";

export type User = {
  id: string;
  name: string;
  email: string;
  /** Tenant permissions (Admin, Manager, Staff, Inspector). */
  role: SystemRole;
  /** Clinical / MDT role label (e.g. Nurse, Psychologist). */
  mdtRole: string;
  organisationId: string;
  hospitalId: string;
  wardId?: string;
};
