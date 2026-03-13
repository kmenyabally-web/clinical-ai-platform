import { Link } from "react-router-dom";
import { useUnreadNotificationCount } from "../hooks/useNotifications";

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    position: "relative",
    textDecoration: "none",
    color: "inherit",
    padding: "8px 12px",
    borderRadius: 8,
  },
  icon: {
    fontSize: "1.25rem",
    lineHeight: 1,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#fff",
    background: "#c62828",
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

/**
 * Notification bell for the header. Shows unread count and links to /notifications.
 */
export default function NotificationBell() {
  const { count, loading } = useUnreadNotificationCount();

  return (
    <Link to="/notifications" style={styles.wrapper} aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}>
      <span style={styles.icon} role="img" aria-hidden="true">
        🔔
      </span>
      {!loading && count > 0 && (
        <span style={styles.badge}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
