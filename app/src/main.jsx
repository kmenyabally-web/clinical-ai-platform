import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { OrganisationProvider } from "./context/OrganisationContext";
import { StructureProvider } from "./context/StructureContext";
import { RoleProvider } from "./context/RoleContext";
import { AppProvider } from "./context/AppContext";
import { ServiceProvider } from "./context/ServiceContext";
import { initErrorMonitoring } from "./lib/errorMonitoring";
import { runFirestoreTestWriteOnce } from "./services/firestoreTestWrite";
import { seedSanctumCareDemoData } from "./services/seedSanctumCareDemo";

initErrorMonitoring();
if (import.meta.env.DEV) {
  runFirestoreTestWriteOnce();
  void seedSanctumCareDemoData();
}

// Provider order: Auth → Organisation → Role → Service (needs org + user) → App.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
    <AuthProvider>
      <OrganisationProvider>
        <StructureProvider>
          <RoleProvider>
            <AppProvider>
              <ServiceProvider>
                <App />
              </ServiceProvider>
            </AppProvider>
          </RoleProvider>
        </StructureProvider>
      </OrganisationProvider>
    </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);