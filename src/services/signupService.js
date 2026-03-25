import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebase";
import { createOrganisation } from "./organisation";
import { createSubscription, PLANS, BILLING_CYCLES } from "./billingService";
import { createService } from "./servicesService";

/**
 * Onboarding: create organisation, first service, admin user, and subscription.
 * New organisation signup creates all four so the org is ready to use.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} organisationName
 * @param {{ firstServiceName?: string }} [options]
 * @returns {Promise<{ uid: string, organisationId: string, serviceId: string }>}
 */
export async function registerWithOrganisation(email, password, organisationName, options = {}) {
  if (!email?.trim() || !password?.trim()) throw new Error("Email and password required");
  if (!organisationName?.trim()) throw new Error("Organisation name required");

  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = userCredential.user.uid;

  const organisationId = doc(collection(db, "organisations")).id;
  const name = organisationName.trim();

  await createOrganisation(organisationId, { name, status: "active" });

  await setDoc(doc(db, "users", uid), {
    orgId: organisationId,
    role: "Admin",
    organisationId,
    hospitalId: null,
    wardId: null,
    status: "active",
    createdAt: new Date().toISOString(),
  });

  const auditContext = { organisationId, userId: uid, userRole: "Admin" };
  await createSubscription(
    organisationId,
    PLANS.STARTER,
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
