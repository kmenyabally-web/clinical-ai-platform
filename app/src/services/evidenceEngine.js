import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function generateEvidencePack(patientId, context) {
  const notesSnap = await getDocs(
    query(
      collection(db, "notes"),
      where("patientId", "==", patientId),
      where("organisationId", "==", context.organisationId)
    )
  );

  const notes = [];
  notesSnap.forEach((docSnap) => notes.push(docSnap.data()));

  return {
    totalNotes: notes.length,
    summaries: notes.map((n) => n.aiSummary || n.correctedText),
  };
}
