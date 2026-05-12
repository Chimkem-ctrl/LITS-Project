import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const SIDEBAR_LINKS = [
  { label: "Dashboard", path: "/dashboard", icon: "📊" },
  { label: "Profile", path: "/profile", icon: "👤" },
  { label: "Admin Panel", path: "/admin", icon: "⚙️" },
  { label: "Settings", path: "/settings", icon: "🔧" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      <div className="sidebar-header">
        <Link to="/dashboard" className="sidebar-logo">
          {!collapsed && <span>LITS</span>}
        </Link>
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {SIDEBAR_LINKS.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${
              location.pathname.startsWith(link.path.split("/")[1])
                ? "sidebar-link-active"
                : ""
            }`}
            title={collapsed ? link.label : ""}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            {!collapsed && <span>{link.label}</span>}
          </Link>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={handleLogout}>
        <span className="sidebar-link-icon">🚪</span>
        {!collapsed && <span>Logout</span>}
      </button>
    </aside>
  );
}
