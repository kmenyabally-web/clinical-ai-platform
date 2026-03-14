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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <FirstSafeScreen />
            </ProtectedRoute>
          }
        />

        {/* For any other path, redirect to the Stage 2 safe screen. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
