/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * Root application routing for Stage 2.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Unauthorised from "./pages/Unauthorised";
import FirstSafeScreen from "./components/FirstSafeScreen.jsx";
import Layout from "./components/Layout";
import DashboardHome from "./components/DashboardHome";
import CarerTasks from "./pages/CarerTasks";
import PatientList from "./components/PatientList";
import PatientDetail from "./components/PatientDetail";
import IncidentReportPage from "./components/IncidentReportPage";
import IncidentFormPage from "./components/IncidentFormPage";
import AuditLog from "./pages/AuditLog";
import EvidencePack from "./pages/EvidencePack";
import ClinicalNotes from "./pages/ClinicalNotes";
import Documents from "./pages/Documents";
import CarePlans from "./pages/CarePlans";
import Incidents from "./pages/Incidents";
import ComplianceOverview from "./pages/ComplianceOverview";
import InspectionSimulator from "./pages/InspectionSimulator";
import StaffTraining from "./pages/StaffTraining";
import AdminPanel from "./pages/AdminPanel";
import OrganisationDashboard from "./pages/OrganisationDashboard";
import Reports from "./pages/Reports";
import BehaviourTracking from "./pages/BehaviourTracking";
import MdtReviews from "./pages/MdtReviews";
import PhysicalHealth from "./pages/PhysicalHealth";
import ClinicalAiReports from "./pages/ClinicalAiReports";
import Billing from "./pages/Billing";
import Organisations from "./pages/management/Organisations";
import Hospitals from "./pages/management/Hospitals";
import Wards from "./pages/management/Wards";
import Users from "./pages/management/Users";
import CreateOrganisation from "./pages/setup/CreateOrganisation";
import SystemOrganisations from "./pages/SystemOrganisations";
import { MANAGEMENT_ALLOWED_ROLES } from "./config/routes";
import LandingPage from "./pages/LandingPage";
import Pricing from "./pages/Pricing";
import FeatureGate from "./components/FeatureGate";
import FeatureSettings from "./pages/FeatureSettings";
import Policies from "./pages/Policies";
import CommandCentre from "./pages/CommandCentre";
import EnterpriseRoute from "./components/EnterpriseRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/unauthorised"
          element={
            <ProtectedRoute requireOrganisation={false}>
              <Unauthorised />
            </ProtectedRoute>
          }
        />

        <Route path="/setup/create-organisation" element={<CreateOrganisation />} />
        <Route path="/system-admin/create-organisation" element={<CreateOrganisation />} />
        <Route path="/create-organisation" element={<Navigate to="/setup/create-organisation" replace />} />

        <Route
          element={
            <ProtectedRoute allowMissingOrganisationForPlatformAdmin>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardHome />} />
          <Route path="/tasks" element={<CarerTasks />} />
          <Route path="/enterprise" element={<EnterpriseRoute />} />
          <Route
            path="/command-centre"
            element={
              <FeatureGate feature="inspection">
                <CommandCentre />
              </FeatureGate>
            }
          />
          <Route path="/organisation-dashboard" element={<OrganisationDashboard />} />
          <Route path="/reports" element={<ClinicalAiReports />} />
          <Route path="/cqc-readiness-reports" element={<Reports />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/patients/:id/report-incident" element={<IncidentReportPage />} />
          <Route path="/incidents/new/:patientId" element={<IncidentFormPage />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route
            path="/clinical-notes"
            element={
              <FeatureGate feature="clinicalNotes">
                <ClinicalNotes />
              </FeatureGate>
            }
          />
          <Route
            path="/behaviour"
            element={
              <FeatureGate feature="risk">
                <BehaviourTracking />
              </FeatureGate>
            }
          />
          <Route
            path="/mdt"
            element={
              <FeatureGate feature="mdt">
                <MdtReviews />
              </FeatureGate>
            }
          />
          <Route
            path="/physical-health"
            element={
              <FeatureGate feature="vitals">
                <PhysicalHealth />
              </FeatureGate>
            }
          />
          <Route path="/documents" element={<Documents />} />
          <Route
            path="/organisation/policies"
            element={
              <FeatureGate feature="policies">
                <Policies />
              </FeatureGate>
            }
          />
          <Route path="/staff-training" element={<StaffTraining />} />
          <Route
            path="/care-plans"
            element={
              <FeatureGate feature="medication">
                <CarePlans />
              </FeatureGate>
            }
          />
          <Route
            path="/compliance"
            element={
              <FeatureGate feature="risk">
                <ComplianceOverview />
              </FeatureGate>
            }
          />
          <Route
            path="/inspection-simulation"
            element={
              <FeatureGate feature="inspection">
                <InspectionSimulator />
              </FeatureGate>
            }
          />
          <Route
            path="/inspection-simulator"
            element={
              <FeatureGate feature="inspection">
                <InspectionSimulator />
              </FeatureGate>
            }
          />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route
            path="/evidence-pack"
            element={
              <FeatureGate feature="evidencePack">
                <EvidencePack />
              </FeatureGate>
            }
          />
          <Route
            path="/organisation/settings/features"
            element={<FeatureSettings />}
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute platformAdminOnly requireOrganisation={false}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/organisations"
            element={
              <ProtectedRoute allowedRoles={MANAGEMENT_ALLOWED_ROLES}>
                <Organisations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/hospitals"
            element={
              <ProtectedRoute allowedRoles={MANAGEMENT_ALLOWED_ROLES}>
                <Hospitals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/wards"
            element={
              <ProtectedRoute allowedRoles={MANAGEMENT_ALLOWED_ROLES}>
                <Wards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/users"
            element={
              <ProtectedRoute allowedRoles={MANAGEMENT_ALLOWED_ROLES}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route path="/system-admin/organisations" element={<SystemOrganisations />} />
          <Route path="/management/organisation" element={<Navigate to="/management/organisations" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
