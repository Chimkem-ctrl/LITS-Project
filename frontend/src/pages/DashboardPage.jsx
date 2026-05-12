import { useAuth } from "../context/AuthContext";
import "../styles/dashboard.css";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>LITS Dashboard</h1>
          <p>Authenticated view powered by Django REST + JWT.</p>
        </div>
        <button onClick={logout} className="logout-btn">
          Logout
        </button>
      </header>

      <section className="dashboard-card">
        <h2>Profile</h2>
        <div className="profile-grid">
          <div>
            <span className="label">Email</span>
            <p>{user?.email || "-"}</p>
          </div>
          <div>
            <span className="label">First Name</span>
            <p>{user?.first_name || "-"}</p>
          </div>
          <div>
            <span className="label">Last Name</span>
            <p>{user?.last_name || "-"}</p>
          </div>
          <div>
            <span className="label">Role</span>
            <p>{user?.role || "-"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
