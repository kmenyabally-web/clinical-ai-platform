/** [ENABLEMENT GATE: STAGE 2 - NON-CLINICAL]
 *
 * Root application routing for Stage 2.
 *
 * At this gate, the only post-authenticated experience must be the
 * FirstSafeScreen, which verifies identity and organisational scope
 * without exposing any clinical, person-level, or incident data.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<FirstSafeScreen />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
          <Route path="/admin" element={<AdminPanel />} />
        </Route>

        {/* For any other path, redirect to the Stage 2 safe screen. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
