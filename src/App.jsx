import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { READINESS_SECTION_ROLES } from "./config/routes";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Actions from "./pages/Actions";
import Documents from "./pages/Documents";
import Evidence from "./pages/Evidence";
import EvidencePack from "./pages/EvidencePack";
import InspectionSimulation from "./pages/InspectionSimulation";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Services from "./pages/Services";
import Billing from "./pages/Billing";
import AdminPanel from "./pages/AdminPanel";
import Unauthorised from "./pages/Unauthorised";
import IncidentFormPage from "./components/IncidentFormPage";

const Governance = () => <h1>Governance</h1>;
const Safeguarding = () => <h1>Safeguarding</h1>;
const MentalCapacity = () => <h1>Mental Capacity</h1>;
const Staffing = () => <h1>Staffing & Training</h1>;
const CarePlanning = () => <h1>Care Planning</h1>;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/unauthorised"
          element={
            <ProtectedRoute>
              <Unauthorised />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/actions"
          element={
            <ProtectedRoute>
              <Layout>
                <Actions />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <Layout>
                <Documents />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/evidence"
          element={
            <ProtectedRoute>
              <Layout>
                <Evidence />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/incidents" element={<IncidentFormPage />} />

        <Route
          path="/evidence-pack"
          element={
            <ProtectedRoute>
              <Layout>
                <EvidencePack />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inspection-simulation"
          element={
            <ProtectedRoute>
              <Layout>
                <InspectionSimulation />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Layout>
                <Notifications />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Layout>
                <Services />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <Layout>
                <Billing />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowPlatformAdmin>
              <Layout>
                <AdminPanel />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/governance"
          element={
            <ProtectedRoute allowedRoles={READINESS_SECTION_ROLES}>
              <Layout>
                <Governance />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/safeguarding"
          element={
            <ProtectedRoute allowedRoles={READINESS_SECTION_ROLES}>
              <Layout>
                <Safeguarding />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/mental-capacity"
          element={
            <ProtectedRoute allowedRoles={READINESS_SECTION_ROLES}>
              <Layout>
                <MentalCapacity />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/staffing"
          element={
            <ProtectedRoute allowedRoles={READINESS_SECTION_ROLES}>
              <Layout>
                <Staffing />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/care-planning"
          element={
            <ProtectedRoute allowedRoles={READINESS_SECTION_ROLES}>
              <Layout>
                <CarePlanning />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}