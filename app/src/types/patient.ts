/**
 * Patient record shape (Firestore `patients/{id}`) — clinical metadata only at read boundary.
 */
export type PatientRecord = {
  id: string;
  organisationId: string;
  hospitalId: string;
  wardId: string;
  /** Optional legacy / secondary scope */
  serviceId?: string | null;
  /** Learning disability pathway — drives PBS / communication framing in AI context. */
  hasLD: boolean;
  /** Mental health pathway — drives diagnosis / MSE / medication framing in AI context. */
  hasMentalHealth: boolean;
};
