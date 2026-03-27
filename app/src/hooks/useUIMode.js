import { useOrganisation } from "../context/OrganisationContext";

/** @returns {"CLINICAL" | "CARER" | "HYBRID"} */
export function useUIMode() {
  const { organisation } = useOrganisation();
  const mode = organisation?.uiMode;
  if (mode === "CARER" || mode === "HYBRID" || mode === "CLINICAL") return mode;
  return "CLINICAL";
}
