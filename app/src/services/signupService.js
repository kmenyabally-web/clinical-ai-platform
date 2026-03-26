import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebase";
import { createOrganisation } from "./organisation";
import { createSubscription, PLANS, BILLING_CYCLES } from "./billingService";
import { normalizePlanKey } from "../utils/featureAccess";
import { createService } from "./servicesService";

/**
 * Onboarding: create organisation, first service, admin user, and subscription.
 * New organisation signup creates all four so the org is ready to use.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} organisationName
 * @param {{ firstServiceName?: string, planKey?: string }} [options] planKey: BASIC | PRO | ENTERPRISE (default BASIC)
 * @returns {Promise<{ uid: string, organisationId: string, serviceId: string }>}
 */
export async function registerWithOrganisation(email, password, organisationName, options = {}) {
  if (!email?.trim() || !password?.trim()) throw new Error("Email and password required");
  if (!organisationName?.trim()) throw new Error("Organisation name required");

  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = userCredential.user.uid;

  const organisationId = doc(collection(db, "organisations")).id;
  const name = organisationName.trim();
  const planKey = normalizePlanKey(options.planKey ?? PLANS.BASIC);
  const organisationType = options.organisationType ?? options.type ?? "MENTAL_HEALTH";

  await createOrganisation(organisationId, { name, status: "active", plan: planKey, type: organisationType });

  await setDoc(doc(db, "users", uid), {
    orgId: organisationId,
    organisationId,
    email: email.trim(),
    role: "Admin",
    mdtRole: "Clinical Lead",
    hospitalId: null,
    wardId: null,
    status: "active",
    createdAt: new Date().toISOString(),
  });

  const auditContext = { organisationId, userId: uid, userRole: "Admin" };
  await createSubscription(
    organisationId,
    planKey,
    BILLING_CYCLES.MONTHLY,
    auditContext
  );

  const firstServiceName = options.firstServiceName ?? `${name} - Main`;
  const { id: serviceId } = await createService(
    organisationId,
    { serviceName: firstServiceName, serviceType: "Head Office", location: "" },
    auditContext
  );

  return { uid, organisationId, serviceId };
}
