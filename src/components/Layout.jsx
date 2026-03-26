import Sidebar from "./Sidebar";
import Header from "./Header";
import { useRole } from "../context/RoleContext";
import { useLocation } from "react-router-dom";

export default function Layout({ children }) {
  const { role } = useRole();
  const location = useLocation();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isSystemAdminRoute = location.pathname.includes("/system-admin");

  return (
    <div style={styles.app}>
      <Sidebar isSuperAdmin={isSuperAdmin} showManagementMenu={!isSystemAdminRoute} />
      <div style={styles.main}>
        <Header />
        <div style={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    backgroundColor: "#f5f7fa",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  content: {
    padding: "32px",
    overflowY: "auto",
  },
};