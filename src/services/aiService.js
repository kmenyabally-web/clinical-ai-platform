import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Force the SDK to use the stable v1 endpoint
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateCarePlanDraft = async (patientName, observations) => {
  if (!API_KEY) throw new Error("API Key missing from .env");

  try {
    // We use the model name exactly as required by the stable V1 API
    const model = genAI.getGenerativeModel({
      model:
        (import.meta.env.VITE_GEMINI_MODEL && String(import.meta.env.VITE_GEMINI_MODEL).trim()) ||
        "gemini-1.5-flash",
    });

    const prompt = `Draft a CQC Regulation 9 compliant care plan for ${patientName}. Risks: ${observations}`;

    // The SDK version 0.11.0+ uses v1 by default. 
    // If you are still seeing v1beta in the network tab after 'npm install', 
    // it means a restart is required.
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Clinical AI Error:", error);
    throw new Error("Could not connect to Clinical Intelligence: " + error.message);
  }
};

/**
 * Duty of Candour letter (draft) for families — Regulation 20.
 */
export const generateCandourLetter = async (incidentData, patientData) => {
  if (!API_KEY) throw new Error("API Key missing from .env");

  const inc = incidentData && typeof incidentData === "object" ? incidentData : {};
  const pat = patientData && typeof patientData === "object" ? patientData : {};
  const patientName =
    [pat.firstName, pat.lastName].filter(Boolean).join(" ").trim() ||
    pat.fullName ||
    pat.id ||
    "the person we support";

  const prompt = `
You are an experienced Care Manager writing a formal letter to the family or representative of a person using the service.

Legal tone: Align with the Duty of Candour under Regulation 20 of the Health and Social Care Act 2008 (Regulated Activities) Regulations 2014:
- Sincere apology and regret where appropriate.
- Clear facts known at the time (no speculation).
- Immediate actions taken for safety and support.
- Commitment to follow up with more information when the investigation is closed, and how to raise questions.
- Respectful, professional, compassionate language; avoid blame and legal admissions beyond factual transparency.

Structure: salutation; apology; facts; immediate actions; next steps and follow-up after investigation; closing.

Patient: ${patientName}${pat.id ? ` (ID: ${pat.id})` : ""}

Incident:
- Type: ${inc.type ?? inc.incidentType ?? "N/A"}
- Severity: ${inc.severity ?? "N/A"}
- Status: ${inc.status ?? "N/A"}
- Description: ${inc.description ?? "N/A"}
- Immediate actions: ${inc.immediateActions ?? inc.actionsTaken ?? "N/A"}
- CQC notified: ${inc.cqcNotified ? "Yes" : "No"}

Write the full letter in plain text.
`.trim();

  try {
    const model = genAI.getGenerativeModel({
      model:
        (import.meta.env.VITE_GEMINI_MODEL && String(import.meta.env.VITE_GEMINI_MODEL).trim()) ||
        "gemini-1.5-flash",
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    if (!text?.trim()) throw new Error("Empty response");
    return text.trim();
  } catch (error) {
    console.error("Duty of Candour letter error:", error);
    throw new Error("Could not generate Duty of Candour letter: " + error.message);
  }
};

export const generateIncidentLessons = async (incident) => {
  if (!API_KEY) throw new Error("API Key missing from .env");

  try {
    const model = genAI.getGenerativeModel({
      model:
        (import.meta.env.VITE_GEMINI_MODEL && String(import.meta.env.VITE_GEMINI_MODEL).trim()) ||
        "gemini-1.5-flash",
    });

    const prompt = `
You are a CQC compliance assistant.
Review this incident and provide concise "Lessons Learned" and prevention actions aligned to Regulation 17 (Good governance).

Incident details:
- Type: ${incident?.type ?? "N/A"}
- Description: ${incident?.description ?? "N/A"}
- Witnesses: ${incident?.witnesses ?? "N/A"}
- Immediate actions: ${incident?.immediateActions ?? "N/A"}
- Location: ${incident?.whereOccurred ?? "N/A"}
- Time: ${incident?.whenOccurred ?? "N/A"}
- CQC notified: ${incident?.cqcNotified ? "Yes" : "No"}

Return:
1) Short root-cause hypothesis
2) 4-6 lessons learned
3) 4-6 prevention actions
4) A 30-day governance follow-up checklist
`.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Incident AI Review Error:", error);
    throw new Error("Could not generate incident review: " + error.message);
  }
};