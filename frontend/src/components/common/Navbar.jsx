import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-title">LITS Portal</h1>

        <div className="navbar-user">
          <div className="navbar-avatar">
            {user?.profile_picture_url ? (
              <img src={user.profile_picture_url} alt={user?.email} />
            ) : (
              <span>{user?.email?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="navbar-user-info">
            <p className="navbar-user-name">{user?.first_name} {user?.last_name}</p>
            <p className="navbar-user-role">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
