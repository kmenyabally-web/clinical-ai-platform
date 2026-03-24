import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { OrganisationProvider } from "./context/OrganisationContext";
import { StructureProvider } from "./context/StructureContext";
import { RoleProvider } from "./context/RoleContext";
import { ServiceProvider } from "./context/ServiceContext";
import { initErrorMonitoring } from "./lib/errorMonitoring";
import { runFirestoreTestWriteOnce } from "./services/firestoreTestWrite";

initErrorMonitoring();
runFirestoreTestWriteOnce();

// Provider order: Auth → Organisation → Role → Service (needs org + user) → App.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
    <AuthProvider>
      <OrganisationProvider>
        <StructureProvider>
          <RoleProvider>
            <ServiceProvider>
              <App />
            </ServiceProvider>
          </RoleProvider>
        </StructureProvider>
      </OrganisationProvider>
    </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);