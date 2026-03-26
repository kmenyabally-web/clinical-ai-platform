import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const MOCK_PLANS = {
  FREE: { evidencePack: false },
  PRO: { evidencePack: false },
  ENTERPRISE: { evidencePack: true },
};

export const getSubscription = async (organisationId) => {
  const id = (organisationId ?? "").toString().trim();
  if (!id) return null;

  const ref = doc(db, "subscriptions", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() ?? {};
  const plan = (data.plan ?? "FREE").toString().trim().toUpperCase();
  const fromPlan = MOCK_PLANS[plan] ?? MOCK_PLANS.FREE;
  const features = {
    ...fromPlan,
    ...(typeof data.features === "object" && data.features !== null ? data.features : {}),
  };

  return {
    id: snap.id,
    ...data,
    plan,
    features,
  };
};
