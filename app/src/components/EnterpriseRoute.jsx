import ProtectedPage from "./ProtectedPage";
import EnterpriseDashboard from "../pages/EnterpriseDashboard";

/** Enterprise multi-org dashboard — {@link ProtectedPage} `group:manage` (GROUP_ADMIN / SUPER_ADMIN). */
export default function EnterpriseRoute() {
  return (
    <ProtectedPage permission="group:manage">
      <EnterpriseDashboard />
    </ProtectedPage>
  );
}
