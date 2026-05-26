
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

function getFullImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `http://localhost:8000${url}`;
}

export function Navbar() {
  const { user } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-content">
        <h1 className="navbar-title">LITS Portal</h1>

        <div className="navbar-user">
          <div className="navbar-avatar">
            {user?.profile_picture_url ? (
              <img
                src={getFullImageUrl(user.profile_picture_url)}
                alt={user?.email}
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                onError={e => { e.target.onerror = null; e.target.src = '/default-avatar.png'; }}
              />
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
