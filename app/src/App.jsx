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
import Dashboard from "./pages/Dashboard";
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
import Billing from "./pages/Billing";
import Organisations from "./pages/management/Organisations";
import Hospitals from "./pages/management/Hospitals";
import Wards from "./pages/management/Wards";
import Users from "./pages/management/Users";
import { MANAGEMENT_ALLOWED_ROLES } from "./config/routes";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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

        <Route
          element={
            <ProtectedRoute allowMissingOrganisationForPlatformAdmin>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<FirstSafeScreen />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/organisation-dashboard" element={<OrganisationDashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/patients/:id/report-incident" element={<IncidentReportPage />} />
          <Route path="/incidents/new/:patientId" element={<IncidentFormPage />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/clinical-notes" element={<ClinicalNotes />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/care-plans" element={<CarePlans />} />
          <Route path="/staff-training" element={<StaffTraining />} />
          <Route path="/compliance" element={<ComplianceOverview />} />
          <Route path="/inspection-simulation" element={<InspectionSimulator />} />
          <Route path="/inspection-simulator" element={<InspectionSimulator />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/evidence-pack" element={<EvidencePack />} />
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
          <Route path="/management/organisation" element={<Navigate to="/management/organisations" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
