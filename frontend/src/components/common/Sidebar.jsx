import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

const SIDEBAR_LINKS = [
  { label: "Dashboard", path: "/dashboard", icon: "📊", roles: ["admin", "officer", "borrower"] },
  { label: "Admin Overview", path: "/admin", icon: "🧭", roles: ["admin", "officer"] },
  { label: "Borrowers", path: "/admin/borrowers", icon: "👥", roles: ["admin", "officer"] },
  { label: "Loans", path: "/admin/loans", icon: "💼", roles: ["admin", "officer"] },
  { label: "Payments", path: "/admin/payments", icon: "💳", roles: ["admin", "officer"] },
  { label: "Reports", path: "/admin/reports", icon: "📈", roles: ["admin", "officer"] },
  { label: "My Loans", path: "/borrower/loans", icon: "📄", roles: ["borrower"] },
  { label: "Profile", path: "/profile", icon: "👤", roles: ["admin", "officer", "borrower"] },
  { label: "Settings", path: "/settings", icon: "🔧", roles: ["admin", "officer", "borrower"] },
  { label: "AI Chat", path: "/chat", icon: "🤖", roles: ["admin", "officer", "borrower"] },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const visibleLinks = SIDEBAR_LINKS.filter((link) => link.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActiveLink = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    // Special handling for borrower loan details
    if (path === "/borrower/loans") {
      return location.pathname === path || location.pathname.startsWith(`/borrower/loan/`);
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
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
        {visibleLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${isActiveLink(link.path) ? "sidebar-link-active" : ""}`}
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
