import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorised() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 480 }}>
      <h1>Access denied</h1>
      <p>You don&apos;t have permission to view this page.</p>
      <p>
        <Link to="/dashboard">Go to dashboard</Link>
        {" · "}
        <button type="button" onClick={handleLogout}>
          Sign out
        </button>
      </p>
    </div>
  );
}
