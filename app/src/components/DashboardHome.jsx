import Dashboard from "../pages/Dashboard";
import CarerDashboard from "../pages/CarerDashboard";
import { useUIMode } from "../hooks/useUIMode";

/**
 * Routes home after login: full clinical dashboard vs carer-first shell.
 */
export default function DashboardHome() {
  const uiMode = useUIMode();
  if (uiMode === "CARER") return <CarerDashboard />;
  return <Dashboard />;
}
