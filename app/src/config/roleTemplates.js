// Role-based UX templates (UI + action controls).
// This is NOT backend authorization; backend permission enforcement remains in services via RBAC.

export const ROLE_TEMPLATES = {
  Doctor: {
    canWriteNotes: true,
    canViewAllPatients: true,
    canAccessMDT: true,
    canGenerateReports: true,
    canManageUsers: false,
  },

  Nurse: {
    canWriteNotes: true,
    canViewAssignedPatients: true,
    canAccessMedication: true,
    canAccessMDT: true,
    canAccessBehaviour: true,
    canGenerateReports: true,
  },

  Psychologist: {
    canWriteNotes: true,
    canAccessBehaviour: true,
    canAccessMDT: true,
    canGenerateReports: true,
  },

  "Support Worker": {
    canWriteNotes: true,
    canViewAssignedPatients: true,
    canAccessBehaviour: true,
    canGenerateReports: true,
  },

  Manager: {
    canWriteNotes: false,
    canViewAllPatients: true,
    canGenerateReports: true,
    canManageUsers: true,
    canAccessMDT: true,
  },

  Carer: {
    canWriteNotes: true,
    canAccessCareLogs: true,
  },
};

